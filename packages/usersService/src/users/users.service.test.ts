import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockSql: any = mock.fn((..._args: unknown[]) => []);
mockSql.unsafe = mock.fn();

await mock.module('../config/database.js', { namedExports: { sql: mockSql } });

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
    mockSql.unsafe.mock.resetCalls();
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

  it('builds dynamic SET clause and returns updated user', async () => {
    const updated = { id: 'u1', display_name: 'Alice', bio: 'Hi' };
    mockSql.unsafe.mock.mockImplementation(() => [updated]);

    const result = await updateUser('u1', { display_name: 'Alice', bio: 'Hi' });
    assert.deepEqual(result, updated);
    // Check the query includes both fields
    const query = mockSql.unsafe.mock.calls[0]!.arguments[0] as string;
    assert.ok(query.includes('display_name'));
    assert.ok(query.includes('bio'));
  });

  it('throws USER_NOT_FOUND when update returns empty', async () => {
    mockSql.unsafe.mock.mockImplementation(() => []);
    await assert.rejects(() => updateUser('u1', { display_name: 'Alice' }), (err: any) => {
      assert.equal(err.code, 'USER_NOT_FOUND');
      return true;
    });
  });
});
