import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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
  },
});

const { membersRouter } = await import('./members.routes.js');

// Extract the GET `/` handler from the router stack
const layer = membersRouter.stack
  .find((l: any) => l.route?.path === '/' && l.route.methods.get);
const getHandler = (layer as any).route.stack.find((s: any) => s.method === 'get').handle as (req: any, res: any) => Promise<void>;

function makeReq(overrides: Partial<{ userId: string; params: Record<string, string> }> = {}) {
  return { userId: 'user-1', params: { serverId: 'server-1' }, ...overrides } as any;
}

function makeRes() {
  const res: any = { statusCode: 200, _json: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  return res;
}

function makeMember(id: string) {
  return { userId: id, role: 'member' };
}

function makeUser(id: string) {
  return { id, username: `user_${id}`, display_name: `User ${id}` };
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
    assert.deepEqual(mockGetUsersBatch.mock.calls[0]!.arguments, ['user-1', ['a', 'b', 'c']]);

    const result = res._json.members as Array<Record<string, unknown>>;
    assert.equal(result.length, 3);
    for (const m of result) {
      assert.equal(m.username, `user_${m.userId}`);
      assert.equal(m.display_name, `User ${m.userId}`);
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
    assert.equal(mockGetUsersBatch.mock.calls[0]!.arguments[1].length, 100);
  });

  it('splits into two getUsersBatch calls for 150 members', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
    const members = ids.map(makeMember);
    mockListMembers.mock.mockImplementation(async () => ({
      status: 200,
      data: { members },
    }));
    mockGetUsersBatch.mock.mockImplementation(async (_userId: string, batch: string[]) => ({
      status: 200,
      data: { users: batch.map(makeUser) },
    }));

    const res = makeRes();
    await getHandler(makeReq(), res);

    assert.equal(mockGetUsersBatch.mock.callCount(), 2);
    assert.equal(mockGetUsersBatch.mock.calls[0]!.arguments[1].length, 100);
    assert.equal(mockGetUsersBatch.mock.calls[1]!.arguments[1].length, 50);

    const result = res._json.members as Array<Record<string, unknown>>;
    assert.equal(result.length, 150);
    for (const m of result) {
      assert.equal(m.username, `user_${m.userId}`);
      assert.equal(m.display_name, `User ${m.userId}`);
    }
  });

  it('enriches members from successful batches even when another batch fails', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
    const members = ids.map(makeMember);
    mockListMembers.mock.mockImplementation(async () => ({
      status: 200,
      data: { members },
    }));

    let callIndex = 0;
    mockGetUsersBatch.mock.mockImplementation(async (_userId: string, batch: string[]) => {
      callIndex++;
      if (callIndex === 1) {
        return { status: 200, data: { users: batch.map(makeUser) } };
      }
      return { status: 500, data: { error: 'Internal error' } };
    });

    const res = makeRes();
    await getHandler(makeReq(), res);

    assert.equal(mockGetUsersBatch.mock.callCount(), 2);

    const result = res._json.members as Array<Record<string, unknown>>;
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
