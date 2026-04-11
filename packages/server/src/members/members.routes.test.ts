import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const mockListMembers = mock.fn<AnyFn>();
const mockGetUsersBatch = mock.fn<AnyFn>();

mock.module('./members.client.js', {
  namedExports: {
    listMembers: mockListMembers,
    joinServer: mock.fn(),
    getMember: mock.fn(),
    updateMember: mock.fn(),
    removeMember: mock.fn(),
  },
});

mock.module('../users/users.client.js', {
  namedExports: {
    getUsersBatch: mockGetUsersBatch,
    getMe: mock.fn(),
    patchMe: mock.fn(),
    getUser: mock.fn(),
    isBlockedBidirectional: mock.fn(),
  },
});

mock.module('../socket/index.js', {
  namedExports: {
    removeUserFromServerRooms: mock.fn(async () => {}),
  },
});

const { membersRouter } = await import('./members.routes.js');

type RouteStackEntry = { method?: string; handle?: (req: unknown, res: unknown) => Promise<void> };
type RouterLayer = { route?: { path?: string; methods?: Record<string, boolean>; stack?: RouteStackEntry[] } };
type MembersReq = { userId: string; token: string; params: { serverId: string } };
type MembersRes = {
  statusCode: number;
  _json: unknown;
  status: (code: number) => MembersRes;
  json: (data: unknown) => MembersRes;
};

// Extract the GET `/` handler from the router stack
// @ts-expect-error - Simplified RouterLayer type for testing
const layer = membersRouter.stack.find((l: RouterLayer) => l.route?.path === '/' && Boolean(l.route?.methods?.get));
// @ts-expect-error - Casting Express handler to simplified test types
const getHandler = (layer?.route?.stack?.find((s) => s.method === 'get')?.handle ?? (async () => {})) as (req: MembersReq, res: MembersRes) => Promise<void>;

function makeReq(overrides: Partial<MembersReq> = {}): MembersReq {
  return { userId: 'user-1', token: 'mock-token', params: { serverId: 'server-1' }, ...overrides };
}

function makeRes(): MembersRes {
  const res: MembersRes = {
    statusCode: 200,
    _json: undefined,
    status: (c: number) => {
      res.statusCode = c;
      return res;
    },
    json: (d: unknown) => {
      res._json = d;
      return res;
    },
  };
  return res;
}

function makeMember(id: string) {
  return { userId: id, role: 'member' };
}

function makeUser(id: string) {
  return { id, username: `user_${id}`, display_name: `User ${id}`, avatar_url: `att-avatar-${id}` };
}

describe('GET / (list members with user enrichment)', () => {
  beforeEach(() => {
    mockListMembers.mock.resetCalls();
    mockGetUsersBatch.mock.resetCalls();
  });

  it('forwards status and data when listMembers returns non-200', async () => {
    mockListMembers.mock.mockImplementation(async () => ({
      status: 403,
      data: { error: 'Forbidden' },
    }));

    const res = makeRes();
    await getHandler(makeReq(), res);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res._json, { error: 'Forbidden' });
    assert.equal(mockGetUsersBatch.mock.callCount(), 0);
  });

  it('returns empty array and skips getUsersBatch when 0 members', async () => {
    mockListMembers.mock.mockImplementation(async () => ({
      status: 200,
      data: { members: [] },
    }));

    const res = makeRes();
    await getHandler(makeReq(), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res._json, { members: [] });
    assert.equal(mockGetUsersBatch.mock.callCount(), 0);
  });

  it('makes a single getUsersBatch call for < 100 members', async () => {
    const members = [makeMember('a'), makeMember('b'), makeMember('c')];
    mockListMembers.mock.mockImplementation(async () => ({
      status: 200,
      data: { members },
    }));
    mockGetUsersBatch.mock.mockImplementation(async () => ({
      status: 200,
      data: { users: [makeUser('a'), makeUser('b'), makeUser('c')] },
    }));

    const res = makeRes();
    await getHandler(makeReq(), res);

    assert.equal(mockGetUsersBatch.mock.callCount(), 1);
    assert.deepEqual(mockGetUsersBatch.mock.calls[0]!.arguments, ['mock-token', ['a', 'b', 'c']]);

    const result = (res._json as { members: Array<Record<string, unknown>> }).members;
    assert.equal(result.length, 3);
    for (const m of result) {
      assert.equal(m.username, `user_${m.userId}`);
      assert.equal(m.display_name, `User ${m.userId}`);
      assert.equal(m.avatar_url, `att-avatar-${m.userId}`);
    }
  });

  it('makes a single getUsersBatch call for exactly 100 members', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `id-${i}`);
    const members = ids.map(makeMember);
    mockListMembers.mock.mockImplementation(async () => ({
      status: 200,
      data: { members },
    }));
    mockGetUsersBatch.mock.mockImplementation(async () => ({
      status: 200,
      data: { users: ids.map(makeUser) },
    }));

    const res = makeRes();
    await getHandler(makeReq(), res);

    assert.equal(mockGetUsersBatch.mock.callCount(), 1);
    assert.equal((mockGetUsersBatch.mock.calls[0]!.arguments[1] as string[]).length, 100);
  });

  it('splits into two getUsersBatch calls for 150 members', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
    const members = ids.map(makeMember);
    mockListMembers.mock.mockImplementation(async () => ({
      status: 200,
      data: { members },
    }));
    mockGetUsersBatch.mock.mockImplementation(async (_userId, batch: unknown) => ({
      status: 200,
      data: { users: (batch as string[]).map(makeUser) },
    }));

    const res = makeRes();
    await getHandler(makeReq(), res);

    assert.equal(mockGetUsersBatch.mock.callCount(), 2);
    assert.equal((mockGetUsersBatch.mock.calls[0]!.arguments[1] as string[]).length, 100);
    assert.equal((mockGetUsersBatch.mock.calls[1]!.arguments[1] as string[]).length, 50);

    const result = (res._json as { members: Array<Record<string, unknown>> }).members;
    assert.equal(result.length, 150);
    for (const m of result) {
      assert.equal(m.username, `user_${m.userId}`);
      assert.equal(m.display_name, `User ${m.userId}`);
      assert.equal(m.avatar_url, `att-avatar-${m.userId}`);
    }
  });

  it('fires both getUsersBatch calls in parallel for 150 members', async () => {
    const callOrder: Array<'start' | 'end'> = [];
    const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
    const members = ids.map(makeMember);

    mockListMembers.mock.mockImplementation(async () => ({
      status: 200,
      data: { members },
    }));
    mockGetUsersBatch.mock.mockImplementation(async (_token, batch: unknown) => {
      callOrder.push('start');
      await Promise.resolve(); // yield so concurrent calls can interleave
      callOrder.push('end');
      return { status: 200, data: { users: (batch as string[]).map(makeUser) } };
    });

    await getHandler(makeReq(), makeRes());

    // Sequential: ['start','end','start','end']
    // Parallel:   ['start','start','end','end'] (second start before first end)
    assert.equal(callOrder[0], 'start');
    assert.equal(callOrder[1], 'start');
    assert.equal(mockGetUsersBatch.mock.callCount(), 2);
  });

  it('enriches members from successful batches even when another batch fails', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
    const members = ids.map(makeMember);
    mockListMembers.mock.mockImplementation(async () => ({
      status: 200,
      data: { members },
    }));

    let callIndex = 0;
    mockGetUsersBatch.mock.mockImplementation(async (_userId, batch: unknown) => {
      callIndex++;
      if (callIndex === 1) {
        return { status: 200, data: { users: (batch as string[]).map(makeUser) } };
      }
      return { status: 500, data: { error: 'Internal error' } };
    });

    const res = makeRes();
    await getHandler(makeReq(), res);

    assert.equal(mockGetUsersBatch.mock.callCount(), 2);

    const result = (res._json as { members: Array<Record<string, unknown>> }).members;
    assert.equal(result.length, 150);

    // First 100 should be enriched
    for (let i = 0; i < 100; i++) {
      assert.equal(result[i]!.username, `user_id-${i}`);
      assert.equal(result[i]!.display_name, `User id-${i}`);
    }

    // Last 50 should NOT be enriched
    for (let i = 100; i < 150; i++) {
      assert.equal(result[i]!.username, undefined);
      assert.equal(result[i]!.display_name, undefined);
    }
  });
});
