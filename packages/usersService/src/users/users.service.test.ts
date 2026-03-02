import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockSql: any = mock.fn<AnyFn>((..._args: unknown[]) => []);
mockSql.unsafe = mock.fn<AnyFn>();

mock.module('../config/database.js', { namedExports: { sql: mockSql } });

const { getUserById, updateUser } = await import('./users.service.js');

describe('getUserById', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
  });

  it('throws USER_NOT_FOUND on empty result', async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(() => getUserById('u1'), (err: any) => {
      assert.equal(err.code, 'USER_NOT_FOUND');
      return true;
    });
  });

  it('returns user on success', async () => {
    const user = { id: 'u1', username: 'alice' };
    mockSql.mock.mockImplementation(() => [user]);
    const result = await getUserById('u1');
    assert.deepEqual(result, user);
  });
});

describe('updateUser', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
  });

  it('throws NO_UPDATES when all values are undefined', async () => {
    await assert.rejects(
      () => updateUser('u1', { display_name: undefined, pronouns: undefined, avatar_url: undefined, bio: undefined, status: undefined }),
      (err: any) => {
        assert.equal(err.code, 'NO_UPDATES');
        return true;
      },
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
    await assert.rejects(() => updateUser('u1', { display_name: 'Alice' }), (err: any) => {
      assert.equal(err.code, 'USER_NOT_FOUND');
      return true;
    });
  });
});
