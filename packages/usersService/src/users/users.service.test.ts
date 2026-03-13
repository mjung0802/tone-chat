import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

type SqlMockFn = (...args: unknown[]) => unknown[];
type UnsafeMockFn = (...args: unknown[]) => unknown;

function assertErrorCode(error: unknown, code: string): true {
  assert.equal(typeof error, 'object');
  assert.notEqual(error, null);
  assert.ok('code' in (error as Record<string, unknown>));
  assert.equal((error as { code: string }).code, code);
  return true;
}

const mockSql = mock.fn<SqlMockFn>((..._args) => {
  void _args;
  return [];
}) as ReturnType<typeof mock.fn<SqlMockFn>> & {
  unsafe: ReturnType<typeof mock.fn<UnsafeMockFn>>;
};
mockSql.unsafe = mock.fn<UnsafeMockFn>((..._args) => {
  void _args;
  return undefined;
});

mock.module('../config/database.js', { namedExports: { sql: mockSql } });

const { getUserById, getUsersByIds, updateUser } = await import('./users.service.js');

describe('getUserById', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
  });

  it('throws USER_NOT_FOUND on empty result', async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(() => getUserById('u1'), (error) => assertErrorCode(error, 'USER_NOT_FOUND'));
  });

  it('returns user on success', async () => {
    const user = { id: 'u1', username: 'alice' };
    mockSql.mock.mockImplementation(() => [user]);
    const result = await getUserById('u1');
    assert.deepEqual(result, user);
  });
});

describe('getUsersByIds', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
  });

  it('returns empty array for empty input without hitting SQL', async () => {
    const result = await getUsersByIds([]);
    assert.deepEqual(result, []);
    assert.equal(mockSql.mock.callCount(), 0);
  });

  it('returns users for given ids', async () => {
    const users = [
      { id: 'u1', username: 'alice' },
      { id: 'u2', username: 'bob' },
    ];
    mockSql.mock.mockImplementation(() => users);
    const result = await getUsersByIds(['u1', 'u2']);
    assert.deepEqual(result, users);
    assert.equal(mockSql.mock.callCount(), 1);
  });
});

describe('updateUser', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
  });

  it('throws NO_UPDATES when all values are undefined', async () => {
    await assert.rejects(
      () => updateUser('u1', { display_name: undefined, pronouns: undefined, avatar_url: undefined, bio: undefined, status: undefined }),
      (error) => assertErrorCode(error, 'NO_UPDATES'),
    );
  });

  it('returns updated user via parameterized query', async () => {
    const updated = { id: 'u1', display_name: 'Alice', bio: 'Hi' };
    mockSql.mock.mockImplementation(() => [updated]);

    const result = await updateUser('u1', { display_name: 'Alice', bio: 'Hi' });
    assert.deepEqual(result, updated);
  });

  it('throws USER_NOT_FOUND when update returns empty', async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(() => updateUser('u1', { display_name: 'Alice' }), (error) => assertErrorCode(error, 'USER_NOT_FOUND'));
  });
});
