import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const mockGetUserById = mock.fn<AnyFn>();
const mockGetUsersByIds = mock.fn<AnyFn>();
const mockUpdateUser = mock.fn<AnyFn>();

mock.module('./users.service.js', {
  namedExports: { getUserById: mockGetUserById, getUsersByIds: mockGetUsersByIds, updateUser: mockUpdateUser },
});

const { getMe, patchMe, getUser, getUsersBatch } = await import('./users.controller.js');

type RequestOverrides = Partial<Pick<Request, 'body' | 'params' | 'headers' | 'query'>> & { userId?: string };
type TestResponse = Response & { statusCode: number; _json: unknown };

function makeReq(overrides: RequestOverrides = {}): Request {
  return { body: {}, params: {}, headers: {}, query: {}, userId: undefined, ...overrides } as Request;
}
function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
  res.status = (c: number) => {
    res.statusCode = c;
    return res;
  };
  res.json = (d: unknown) => {
    res._json = d;
    return res;
  };
  return res;
}

describe('getMe', () => {
  beforeEach(() => mockGetUserById.mock.resetCalls());

  it('returns 400 when userId missing', async () => {
    const res = makeRes();
    await getMe(makeReq(), res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MISSING_USER_ID');
  });

  it('returns 200 with user', async () => {
    const user = { id: 'u1', username: 'alice' };
    mockGetUserById.mock.mockImplementation(async () => user);
    const res = makeRes();
    await getMe(makeReq({ userId: 'u1' }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { user: unknown }).user, user);
  });
});

describe('patchMe', () => {
  beforeEach(() => mockUpdateUser.mock.resetCalls());

  it('returns 400 when userId missing', async () => {
    const res = makeRes();
    await patchMe(makeReq({ body: { display_name: 'Alice' } }), res);
    assert.equal(res.statusCode, 400);
  });

  it('returns 200 with updated user', async () => {
    const user = { id: 'u1', display_name: 'Alice' };
    mockUpdateUser.mock.mockImplementation(async () => user);
    const res = makeRes();
    await patchMe(makeReq({ userId: 'u1', body: { display_name: 'Alice' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { user: unknown }).user, user);
  });

  it('strips email from response', async () => {
    const user = { id: 'u1', display_name: 'Alice', email: 'alice@test.com' };
    mockUpdateUser.mock.mockImplementation(async () => user);
    const res = makeRes();
    await patchMe(makeReq({ userId: 'u1', body: { display_name: 'Alice' } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal((res._json as { user: { email?: unknown } }).user.email, undefined);
  });
});

describe('getUser', () => {
  beforeEach(() => mockGetUserById.mock.resetCalls());

  it('returns 200 with user by params id', async () => {
    const user = { id: 'u2', username: 'bob' };
    mockGetUserById.mock.mockImplementation(async () => user);
    const res = makeRes();
    await getUser(makeReq({ params: { id: 'u2' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { user: unknown }).user, user);
  });
});

describe('getUsersBatch', () => {
  beforeEach(() => mockGetUsersByIds.mock.resetCalls());

  it('returns 400 when ids is not an array', async () => {
    const res = makeRes();
    await getUsersBatch(makeReq({ body: { ids: 'not-array' } }), res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_IDS');
  });

  it('returns 400 when ids is empty', async () => {
    const res = makeRes();
    await getUsersBatch(makeReq({ body: { ids: [] } }), res);
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 when ids contains non-string elements', async () => {
    const res = makeRes();
    await getUsersBatch(makeReq({ body: { ids: [123, null] } }), res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_IDS');
  });

  it('returns 400 when batch size exceeds 100', async () => {
    const res = makeRes();
    const ids = Array.from({ length: 101 }, (_, i) => `u${i}`);
    await getUsersBatch(makeReq({ body: { ids } }), res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'BATCH_TOO_LARGE');
  });

  it('returns 200 with users (email stripped)', async () => {
    const users = [
      { id: 'u1', username: 'alice', email: 'alice@test.com' },
      { id: 'u2', username: 'bob', email: 'bob@test.com' },
    ];
    mockGetUsersByIds.mock.mockImplementation(async () => users);
    const res = makeRes();
    await getUsersBatch(makeReq({ body: { ids: ['u1', 'u2'] } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal((res._json as { users: unknown[] }).users.length, 2);
    assert.equal((res._json as { users: Array<{ email?: unknown }> }).users[0]?.email, undefined);
    assert.equal((res._json as { users: Array<{ email?: unknown }> }).users[1]?.email, undefined);
  });
});
