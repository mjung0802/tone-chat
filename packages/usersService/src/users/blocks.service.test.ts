import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

type SqlRow = Record<string, unknown>;
type SqlMockFn = (...args: unknown[]) => SqlRow[];

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
});

mock.module('../config/database.js', { namedExports: { sql: mockSql } });

const { blockUser, unblockUser, getBlockedIds, isBlockedBy } = await import('./blocks.service.js');

describe('blockUser', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockSql.mock.mockImplementation(() => []);
  });

  it('inserts a block row', async () => {
    await blockUser('u1', 'u2');
    assert.equal(mockSql.mock.callCount(), 1);
  });

  it('second call is idempotent (ON CONFLICT DO NOTHING)', async () => {
    await blockUser('u1', 'u2');
    await blockUser('u1', 'u2');
    assert.equal(mockSql.mock.callCount(), 2);
  });
});

describe('unblockUser', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
  });

  it('resolves when a row is deleted', async () => {
    mockSql.mock.mockImplementation(() => [{ blocker_id: 'u1' }]);
    await assert.doesNotReject(() => unblockUser('u1', 'u2'));
  });

  it('throws NOT_FOUND when no row was deleted', async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(
      () => unblockUser('u1', 'u2'),
      (error) => assertErrorCode(error, 'NOT_FOUND'),
    );
  });
});

describe('getBlockedIds', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
  });

  it('returns empty array when no blocks exist', async () => {
    mockSql.mock.mockImplementation(() => []);
    const result = await getBlockedIds('u1');
    assert.deepEqual(result, []);
  });

  it('returns correct blocked_id values', async () => {
    mockSql.mock.mockImplementation(() => [
      { blocked_id: 'u2' },
      { blocked_id: 'u3' },
    ]);
    const result = await getBlockedIds('u1');
    assert.deepEqual(result, ['u2', 'u3']);
  });
});

describe('isBlockedBy', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
  });

  it('returns true when target has blocked viewer', async () => {
    mockSql.mock.mockImplementation(() => [{ blocker_id: 'u2' }]);
    const result = await isBlockedBy('u1', 'u2');
    assert.equal(result, true);
  });

  it('returns false when no block exists', async () => {
    mockSql.mock.mockImplementation(() => []);
    const result = await isBlockedBy('u1', 'u2');
    assert.equal(result, false);
  });
});
