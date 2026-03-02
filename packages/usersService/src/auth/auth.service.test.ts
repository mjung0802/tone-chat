import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock sql as a callable tagged-template + .begin()
const mockSql: any = mock.fn<AnyFn>((..._args: unknown[]) => []);
mockSql.begin = mock.fn<AnyFn>();

mock.module('../config/database.js', { namedExports: { sql: mockSql } });

const mockHash = mock.fn<AnyFn>();
const mockCompare = mock.fn<AnyFn>();
mock.module('bcrypt', {
  defaultExport: { hash: mockHash, compare: mockCompare },
  namedExports: { hash: mockHash, compare: mockCompare },
});

const mockSign = mock.fn<AnyFn>();
mock.module('jsonwebtoken', {
  defaultExport: { sign: mockSign },
  namedExports: { sign: mockSign },
});

mock.module('../config/index.js', {
  namedExports: { config: { jwtSecret: 'secret', jwtAccessExpiresIn: '15m', jwtRefreshExpiresDays: 7 } },
});

const { registerUser, loginUser, refreshAccessToken } = await import('./auth.service.js');

function makeUser(overrides: Record<string, unknown> = {}) {
  return { id: 'u1', username: 'alice', email: 'alice@test.com', ...overrides };
}

describe('registerUser', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockSql.begin.mock.resetCalls();
    mockHash.mock.resetCalls();
    mockSign.mock.resetCalls();
  });

  it('throws WEAK_PASSWORD when password < 8 chars', async () => {
    await assert.rejects(() => registerUser('alice', 'a@test.com', 'short'), (err: any) => {
      assert.equal(err.code, 'WEAK_PASSWORD');
      return true;
    });
  });

  it('throws USER_EXISTS when duplicate found', async () => {
    mockSql.mock.mockImplementation(() => [{ id: 'existing' }]);
    await assert.rejects(() => registerUser('alice', 'a@test.com', 'password123'), (err: any) => {
      assert.equal(err.code, 'USER_EXISTS');
      return true;
    });
  });

  it('calls bcrypt.hash with salt rounds 12', async () => {
    mockSql.mock.mockImplementation(() => []);
    mockHash.mock.mockImplementation(async () => 'hashed');
    mockSign.mock.mockImplementation(() => 'access-token');
    // sql.begin returns the transaction result
    const user = makeUser();
    mockSql.begin.mock.mockImplementation(async (fn: Function) => {
      const tx = mock.fn(() => [user]);
      return fn(tx);
    });

    await registerUser('alice', 'a@test.com', 'password123');
    assert.equal(mockHash.mock.calls[0]!.arguments[1], 12);
  });

  it('uses sql.begin() for atomic insert', async () => {
    mockSql.mock.mockImplementation(() => []);
    mockHash.mock.mockImplementation(async () => 'hashed');
    mockSign.mock.mockImplementation(() => 'token');
    const user = makeUser();
    mockSql.begin.mock.mockImplementation(async (fn: Function) => {
      const tx = mock.fn(() => [user]);
      return fn(tx);
    });

    await registerUser('alice', 'a@test.com', 'password123');
    assert.equal(mockSql.begin.mock.callCount(), 1);
  });

  it('returns { user, accessToken, refreshToken }', async () => {
    mockSql.mock.mockImplementationOnce(() => []); // existing check
    mockHash.mock.mockImplementation(async () => 'hashed');
    mockSign.mock.mockImplementation(() => 'access-tok');
    const user = makeUser();
    mockSql.begin.mock.mockImplementation(async (fn: Function) => {
      const tx = mock.fn(() => [user]);
      return fn(tx);
    });
    // createRefreshToken sql insert
    mockSql.mock.mockImplementation(() => []);

    const result = await registerUser('alice', 'a@test.com', 'password123');
    assert.equal(result.user.id, 'u1');
    assert.equal(result.accessToken, 'access-tok');
    assert.equal(typeof result.refreshToken, 'string');
  });
});

describe('loginUser', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockCompare.mock.resetCalls();
    mockSign.mock.resetCalls();
  });

  it('throws INVALID_CREDENTIALS when user not found', async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(() => loginUser('a@test.com', 'password123'), (err: any) => {
      assert.equal(err.code, 'INVALID_CREDENTIALS');
      return true;
    });
  });

  it('throws INVALID_CREDENTIALS when wrong password', async () => {
    const user = makeUser();
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [user];
      return [{ password_hash: 'hashed' }];
    });
    mockCompare.mock.mockImplementation(async () => false);

    await assert.rejects(() => loginUser('a@test.com', 'wrong'), (err: any) => {
      assert.equal(err.code, 'INVALID_CREDENTIALS');
      return true;
    });
  });

  it('returns tokens on success', async () => {
    const user = makeUser();
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [user];
      if (callCount === 2) return [{ password_hash: 'hashed' }];
      return [];
    });
    mockCompare.mock.mockImplementation(async () => true);
    mockSign.mock.mockImplementation(() => 'access-tok');

    const result = await loginUser('a@test.com', 'password123');
    assert.equal(result.user.id, 'u1');
    assert.equal(result.accessToken, 'access-tok');
    assert.equal(typeof result.refreshToken, 'string');
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockSign.mock.resetCalls();
  });

  it('throws INVALID_TOKEN when token hash not found', async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(() => refreshAccessToken('bad-token'), (err: any) => {
      assert.equal(err.code, 'INVALID_TOKEN');
      return true;
    });
  });

  it('throws TOKEN_EXPIRED when expired (atomic DELETE RETURNING)', async () => {
    // Atomic: DELETE ... RETURNING returns the expired row in a single query
    mockSql.mock.mockImplementation(() => {
      return [{ id: 'rt1', user_id: 'u1', expires_at: new Date('2000-01-01') }];
    });

    await assert.rejects(() => refreshAccessToken('expired-token'), (err: any) => {
      assert.equal(err.code, 'TOKEN_EXPIRED');
      return true;
    });
  });

  it('rotates: atomic delete + returns new tokens', async () => {
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      // Call 1: DELETE ... RETURNING (returns existing valid token)
      if (callCount === 1) return [{ id: 'rt1', user_id: 'u1', expires_at: new Date(Date.now() + 86400000) }];
      // Call 2: INSERT new refresh token
      return [];
    });
    mockSign.mock.mockImplementation(() => 'new-access');

    const result = await refreshAccessToken('valid-refresh');
    assert.equal(result.accessToken, 'new-access');
    assert.equal(typeof result.refreshToken, 'string');
    assert.equal(callCount, 2); // DELETE RETURNING + INSERT (no separate SELECT)
  });
});
