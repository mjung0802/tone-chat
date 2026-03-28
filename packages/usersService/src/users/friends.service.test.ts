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

let callIndex = 0;
const mockResponses: SqlRow[][] = [];

const mockSql = mock.fn<SqlMockFn>((..._args) => {
  void _args;
  const response = mockResponses[callIndex] ?? [];
  callIndex++;
  return response;
});

mock.module('../config/database.js', { namedExports: { sql: mockSql } });

const {
  sendFriendRequest,
  acceptFriendRequest,
  declineOrRemoveFriend,
  getFriends,
  getPendingRequests,
  getFriendshipStatus,
} = await import('./friends.service.js');

function resetMock(...responses: SqlRow[][]) {
  mockSql.mock.resetCalls();
  callIndex = 0;
  mockResponses.length = 0;
  mockResponses.push(...responses);
}

describe('sendFriendRequest', () => {
  beforeEach(() => {
    resetMock();
  });

  it('creates a pending request when no existing relationship', async () => {
    // blocks check -> no blocks, forward check -> no row, reverse check -> no row, insert
    resetMock([], [], [], []);
    const result = await sendFriendRequest('u1', 'u2');
    assert.equal(result.autoAccepted, false);
  });

  it('throws BLOCKED when a block exists', async () => {
    resetMock([{ '?column?': 1 }]);
    await assert.rejects(
      () => sendFriendRequest('u1', 'u2'),
      (error) => assertErrorCode(error, 'BLOCKED'),
    );
  });

  it('throws ALREADY_FRIENDS when already accepted', async () => {
    resetMock([], [{ status: 'accepted' }]);
    await assert.rejects(
      () => sendFriendRequest('u1', 'u2'),
      (error) => assertErrorCode(error, 'ALREADY_FRIENDS'),
    );
  });

  it('throws REQUEST_EXISTS when pending outgoing exists', async () => {
    resetMock([], [{ status: 'pending' }]);
    await assert.rejects(
      () => sendFriendRequest('u1', 'u2'),
      (error) => assertErrorCode(error, 'REQUEST_EXISTS'),
    );
  });

  it('auto-accepts when reverse pending exists', async () => {
    // blocks -> none, forward -> none, reverse -> pending, update, insert
    resetMock([], [], [{ status: 'pending' }], [], []);
    const result = await sendFriendRequest('u1', 'u2');
    assert.equal(result.autoAccepted, true);
  });

  it('throws ALREADY_FRIENDS when reverse accepted exists', async () => {
    resetMock([], [], [{ status: 'accepted' }]);
    await assert.rejects(
      () => sendFriendRequest('u1', 'u2'),
      (error) => assertErrorCode(error, 'ALREADY_FRIENDS'),
    );
  });
});

describe('acceptFriendRequest', () => {
  beforeEach(() => {
    resetMock();
  });

  it('accepts a pending request', async () => {
    resetMock([{ user_id: 'u2' }], []);
    await assert.doesNotReject(() => acceptFriendRequest('u1', 'u2'));
  });

  it('throws NOT_FOUND when no pending request exists', async () => {
    resetMock([]);
    await assert.rejects(
      () => acceptFriendRequest('u1', 'u2'),
      (error) => assertErrorCode(error, 'NOT_FOUND'),
    );
  });
});

describe('declineOrRemoveFriend', () => {
  beforeEach(() => {
    resetMock();
  });

  it('removes friendship rows', async () => {
    resetMock([{ user_id: 'u1' }]);
    await assert.doesNotReject(() => declineOrRemoveFriend('u1', 'u2'));
  });

  it('throws NOT_FOUND when no rows exist', async () => {
    resetMock([]);
    await assert.rejects(
      () => declineOrRemoveFriend('u1', 'u2'),
      (error) => assertErrorCode(error, 'NOT_FOUND'),
    );
  });
});

describe('getFriends', () => {
  beforeEach(() => {
    resetMock();
  });

  it('returns empty array when no friends', async () => {
    resetMock([]);
    const result = await getFriends('u1');
    assert.deepEqual(result, []);
  });

  it('returns friend entries with correct shape', async () => {
    resetMock([
      { id: 'u2', username: 'alice', display_name: 'Alice', avatar_url: null, created_at: new Date('2025-01-01') },
    ]);
    const result = await getFriends('u1');
    assert.equal(result.length, 1);
    assert.equal(result[0]?.userId, 'u2');
    assert.equal(result[0]?.username, 'alice');
    assert.equal(result[0]?.display_name, 'Alice');
  });
});

describe('getPendingRequests', () => {
  beforeEach(() => {
    resetMock();
  });

  it('returns both incoming and outgoing requests', async () => {
    // First query = outgoing (user_id = userId), second = incoming (friend_id = userId)
    resetMock(
      [{ id: 'u2', username: 'alice', display_name: null, avatar_url: null, created_at: new Date('2025-01-01') }],
      [{ id: 'u3', username: 'bob', display_name: null, avatar_url: null, created_at: new Date('2025-01-02') }],
    );
    const result = await getPendingRequests('u1');
    assert.equal(result.length, 2);
    // Service returns [...incoming, ...outgoing]
    assert.equal(result[0]?.direction, 'incoming');
    assert.equal(result[0]?.userId, 'u3');
    assert.equal(result[1]?.direction, 'outgoing');
    assert.equal(result[1]?.userId, 'u2');
  });
});

describe('getFriendshipStatus', () => {
  beforeEach(() => {
    resetMock();
  });

  it('returns none when no relationship', async () => {
    resetMock([], []);
    const result = await getFriendshipStatus('u1', 'u2');
    assert.equal(result, 'none');
  });

  it('returns friends when accepted', async () => {
    resetMock([{ status: 'accepted' }]);
    const result = await getFriendshipStatus('u1', 'u2');
    assert.equal(result, 'friends');
  });

  it('returns pending_outgoing when pending forward', async () => {
    resetMock([{ status: 'pending' }]);
    const result = await getFriendshipStatus('u1', 'u2');
    assert.equal(result, 'pending_outgoing');
  });

  it('returns pending_incoming when pending reverse', async () => {
    resetMock([], [{ status: 'pending' }]);
    const result = await getFriendshipStatus('u1', 'u2');
    assert.equal(result, 'pending_incoming');
  });
});
