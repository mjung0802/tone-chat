import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

type RequestOverrides = Partial<Pick<Request, 'body' | 'params' | 'headers' | 'query'>> & { member?: unknown; server?: unknown };
type TestResponse = Response & { statusCode: number; _json: unknown };

function assertErrorCode(error: unknown, code: string): true {
  assert.equal(typeof error, 'object');
  assert.notEqual(error, null);
  assert.equal((error as { code?: unknown }).code, code);
  return true;
}

const mockMemberCreate = mock.fn<AnyFn>();
const mockMemberFind = mock.fn<AnyFn>();
const mockMemberFindOne = mock.fn<AnyFn>();
const mockMemberFindOneAndDelete = mock.fn<AnyFn>();

mock.module('./serverMember.model.js', {
  namedExports: {
    ServerMember: {
      create: mockMemberCreate,
      find: mockMemberFind,
      findOne: mockMemberFindOne,
      findOneAndDelete: mockMemberFindOneAndDelete,
    },
  },
});

const mockServerFindById = mock.fn<AnyFn>();
mock.module('../servers/server.model.js', {
  namedExports: { Server: { findById: mockServerFindById } },
});

const mockBanFindOne = mock.fn<AnyFn>();
mock.module('../bans/serverBan.model.js', {
  namedExports: { ServerBan: { findOne: mockBanFindOne } },
});

const mockLogAuditEvent = mock.fn<AnyFn>(async () => ({}));
mock.module('../auditLog/auditLog.model.js', {
  namedExports: { logAuditEvent: mockLogAuditEvent },
});

const { joinServer, listMembers, getMember, updateMember, removeMember, muteMember, unmuteMember, promoteMember, demoteMember } = await import('./members.controller.js');

function makeReq(overrides: RequestOverrides = {}): Request {
  return { body: {}, params: {}, headers: {}, query: {}, ...overrides } as unknown as Request;
}
function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  res.end = () => res;
  return res;
}

describe('joinServer', () => {
  beforeEach(() => {
    mockServerFindById.mock.resetCalls();
    mockMemberFindOne.mock.resetCalls();
    mockMemberCreate.mock.resetCalls();
    mockBanFindOne.mock.resetCalls();
  });

  it('throws SERVER_NOT_FOUND when server is null', async () => {
    mockServerFindById.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => joinServer(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } }), makeRes()),
      (error) => assertErrorCode(error, 'SERVER_NOT_FOUND'),
    );
  });

  it('rejects private servers', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ visibility: 'private' }));
    await assert.rejects(
      () => joinServer(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } }), makeRes()),
      (error) => assertErrorCode(error, 'SERVER_PRIVATE'),
    );
  });

  it('rejects banned users', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ visibility: 'public' }));
    mockBanFindOne.mock.mockImplementation(async () => ({ userId: 'u1' }));
    await assert.rejects(
      () => joinServer(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } }), makeRes()),
      (error) => assertErrorCode(error, 'BANNED'),
    );
  });

  it('throws ALREADY_MEMBER when existing', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ visibility: 'public' }));
    mockBanFindOne.mock.mockImplementation(async () => null);
    mockMemberFindOne.mock.mockImplementation(async () => ({ userId: 'u1' }));
    await assert.rejects(
      () => joinServer(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } }), makeRes()),
      (error) => assertErrorCode(error, 'ALREADY_MEMBER'),
    );
  });

  it('creates member and returns 201', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ visibility: 'public' }));
    mockBanFindOne.mock.mockImplementation(async () => null);
    mockMemberFindOne.mock.mockImplementation(async () => null);
    const member = { serverId: 's1', userId: 'u1' };
    mockMemberCreate.mock.mockImplementation(async () => member);

    const res = makeRes();
    await joinServer(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } }), res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual((res._json as { member: unknown }).member, member);
  });
});

describe('listMembers', () => {
  it('returns 200 with members', async () => {
    const members = [{ userId: 'u1' }, { userId: 'u2' }];
    mockMemberFind.mock.mockImplementation(async () => members);

    const res = makeRes();
    await listMembers(makeReq({ params: { serverId: 's1' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { members: unknown[] }).members, members);
  });
});

describe('getMember', () => {
  beforeEach(() => mockMemberFindOne.mock.resetCalls());

  it('throws MEMBER_NOT_FOUND when null', async () => {
    mockMemberFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => getMember(makeReq({ params: { serverId: 's1', userId: 'u1' } }), makeRes()),
      (error) => assertErrorCode(error, 'MEMBER_NOT_FOUND'),
    );
  });

  it('returns 200 with member', async () => {
    const member = { serverId: 's1', userId: 'u1' };
    mockMemberFindOne.mock.mockImplementation(async () => member);
    const res = makeRes();
    await getMember(makeReq({ params: { serverId: 's1', userId: 'u1' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { member: unknown }).member, member);
  });
});

describe('updateMember', () => {
  beforeEach(() => mockMemberFindOne.mock.resetCalls());

  it('throws MEMBER_NOT_FOUND when target not found', async () => {
    mockMemberFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => updateMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u2' },
        body: { nickname: 'nick' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'MEMBER_NOT_FOUND'),
    );
  });

  it('updates nickname and returns 200', async () => {
    const target = { nickname: '', role: 'member', save: mock.fn(async () => {}) };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    const res = makeRes();
    await updateMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u2' },
      body: { nickname: 'nick' },
    }), res);

    assert.equal(target.nickname, 'nick');
    assert.equal(target.save.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
  });
});

describe('removeMember', () => {
  beforeEach(() => {
    mockServerFindById.mock.resetCalls();
    mockMemberFindOne.mock.resetCalls();
    mockMemberFindOneAndDelete.mock.resetCalls();
    mockLogAuditEvent.mock.resetCalls();
  });

  it('allows self-leave (non-owner)', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'other-user' }));
    mockMemberFindOneAndDelete.mock.mockImplementation(async () => ({ userId: 'u1' }));
    const res = makeRes();
    await removeMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u1' },
    }), res);
    assert.equal(res.statusCode, 204);
  });

  it('prevents owner from self-leaving', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'u1' }));
    await assert.rejects(
      () => removeMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u1' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'OWNER_CANNOT_LEAVE'),
    );
  });

  it('mod can kick a member', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'owner' }));
    let findOneCount = 0;
    mockMemberFindOne.mock.mockImplementation(async () => {
      findOneCount++;
      if (findOneCount === 1) return { role: 'mod', userId: 'u1' }; // requester
      return { role: 'member', userId: 'u2', deleteOne: mock.fn(async () => {}) }; // target
    });

    const res = makeRes();
    await removeMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u2' },
    }), res);
    assert.equal(res.statusCode, 204);
    assert.equal(mockLogAuditEvent.mock.callCount(), 1);
    assert.deepEqual(mockLogAuditEvent.mock.calls[0]!.arguments.slice(0, 4), ['s1', 'kick', 'u1', 'u2']);
  });

  it('self-leave does not log audit event', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'other-user' }));
    mockMemberFindOneAndDelete.mock.mockImplementation(async () => ({ userId: 'u1' }));
    const res = makeRes();
    await removeMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u1' },
    }), res);
    assert.equal(res.statusCode, 204);
    assert.equal(mockLogAuditEvent.mock.callCount(), 0);
  });

  it('mod cannot kick admin', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'owner' }));
    let findOneCount = 0;
    mockMemberFindOne.mock.mockImplementation(async () => {
      findOneCount++;
      if (findOneCount === 1) return { role: 'mod', userId: 'u1' }; // requester
      return { role: 'admin', userId: 'u2' }; // target
    });

    await assert.rejects(
      () => removeMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u2' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'FORBIDDEN'),
    );
  });

  it('regular member cannot kick', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'owner' }));
    mockMemberFindOne.mock.mockImplementation(async () => ({ role: 'member', userId: 'u1' }));

    await assert.rejects(
      () => removeMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u2' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'FORBIDDEN'),
    );
  });
});

describe('muteMember', () => {
  beforeEach(() => { mockMemberFindOne.mock.resetCalls(); mockLogAuditEvent.mock.resetCalls(); });

  it('rejects invalid duration', async () => {
    await assert.rejects(
      () => muteMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u2' },
        body: { duration: 999 },
        member: { role: 'mod', userId: 'u1' },
        server: { ownerId: 'owner' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'INVALID_DURATION'),
    );
  });

  it('mutes target with valid duration', async () => {
    const target = { role: 'member', userId: 'u2', mutedUntil: null, save: mock.fn(async () => {}) };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    const res = makeRes();
    await muteMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u2' },
      body: { duration: 60 },
      member: { role: 'mod', userId: 'u1' },
      server: { ownerId: 'owner' },
    }), res);

    assert.equal(res.statusCode, 200);
    assert.ok(target.mutedUntil);
    assert.equal(target.save.mock.callCount(), 1);
    assert.equal(mockLogAuditEvent.mock.callCount(), 1);
    assert.deepEqual(mockLogAuditEvent.mock.calls[0]!.arguments.slice(0, 4), ['s1', 'mute', 'u1', 'u2']);
    assert.deepEqual(mockLogAuditEvent.mock.calls[0]!.arguments[4], { duration: 60 });
  });

  it('rejects muting a higher-role member', async () => {
    const target = { role: 'admin', userId: 'u2' };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    await assert.rejects(
      () => muteMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u2' },
        body: { duration: 60 },
        member: { role: 'mod', userId: 'u1' },
        server: { ownerId: 'owner' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'FORBIDDEN'),
    );
  });
});

describe('unmuteMember', () => {
  beforeEach(() => { mockMemberFindOne.mock.resetCalls(); mockLogAuditEvent.mock.resetCalls(); });

  it('unmutes target', async () => {
    const target = { role: 'member', userId: 'u2', mutedUntil: new Date(), save: mock.fn(async () => {}) };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    const res = makeRes();
    await unmuteMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u2' },
      member: { role: 'mod', userId: 'u1' },
      server: { ownerId: 'owner' },
    }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(target.mutedUntil, null);
    assert.equal(mockLogAuditEvent.mock.callCount(), 1);
    assert.deepEqual(mockLogAuditEvent.mock.calls[0]!.arguments.slice(0, 4), ['s1', 'unmute', 'u1', 'u2']);
  });
});

describe('promoteMember', () => {
  beforeEach(() => { mockMemberFindOne.mock.resetCalls(); mockLogAuditEvent.mock.resetCalls(); });

  it('admin promotes member to mod', async () => {
    const target = { role: 'member', userId: 'u2', save: mock.fn(async () => {}) };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    const res = makeRes();
    await promoteMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u2' },
      member: { role: 'admin', userId: 'u1' },
      server: { ownerId: 'owner' },
    }), res);

    assert.equal(target.role, 'mod');
    assert.equal(res.statusCode, 200);
    assert.equal(mockLogAuditEvent.mock.callCount(), 1);
    assert.deepEqual(mockLogAuditEvent.mock.calls[0]!.arguments.slice(0, 4), ['s1', 'promote', 'u1', 'u2']);
    assert.deepEqual(mockLogAuditEvent.mock.calls[0]!.arguments[4], { fromRole: 'member', toRole: 'mod' });
  });

  it('owner promotes mod to admin', async () => {
    const target = { role: 'mod', userId: 'u2', save: mock.fn(async () => {}) };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    const res = makeRes();
    await promoteMember(makeReq({
      headers: { 'x-user-id': 'owner' },
      params: { serverId: 's1', userId: 'u2' },
      member: { role: 'admin', userId: 'owner' },
      server: { ownerId: 'owner' },
    }), res);

    assert.equal(target.role, 'admin');
    assert.equal(res.statusCode, 200);
    assert.equal(mockLogAuditEvent.mock.callCount(), 1);
    assert.deepEqual(mockLogAuditEvent.mock.calls[0]!.arguments[4], { fromRole: 'mod', toRole: 'admin' });
  });

  it('non-owner admin cannot promote mod to admin', async () => {
    const target = { role: 'mod', userId: 'u2' };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    await assert.rejects(
      () => promoteMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u2' },
        member: { role: 'admin', userId: 'u1' },
        server: { ownerId: 'owner' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'FORBIDDEN'),
    );
  });

  it('cannot promote beyond admin', async () => {
    const target = { role: 'admin', userId: 'u2' };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    await assert.rejects(
      () => promoteMember(makeReq({
        headers: { 'x-user-id': 'owner' },
        params: { serverId: 's1', userId: 'u2' },
        member: { role: 'admin', userId: 'owner' },
        server: { ownerId: 'owner' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'CANNOT_PROMOTE'),
    );
  });
});

describe('demoteMember', () => {
  beforeEach(() => { mockMemberFindOne.mock.resetCalls(); mockLogAuditEvent.mock.resetCalls(); });

  it('owner demotes admin to mod', async () => {
    const target = { role: 'admin', userId: 'u2', save: mock.fn(async () => {}) };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    const res = makeRes();
    await demoteMember(makeReq({
      headers: { 'x-user-id': 'owner' },
      params: { serverId: 's1', userId: 'u2' },
      member: { role: 'admin', userId: 'owner' },
      server: { ownerId: 'owner' },
    }), res);

    assert.equal(target.role, 'mod');
    assert.equal(res.statusCode, 200);
    assert.equal(mockLogAuditEvent.mock.callCount(), 1);
    assert.deepEqual(mockLogAuditEvent.mock.calls[0]!.arguments.slice(0, 4), ['s1', 'demote', 'owner', 'u2']);
    assert.deepEqual(mockLogAuditEvent.mock.calls[0]!.arguments[4], { fromRole: 'admin', toRole: 'mod' });
  });

  it('admin demotes mod to member', async () => {
    const target = { role: 'mod', userId: 'u2', save: mock.fn(async () => {}) };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    const res = makeRes();
    await demoteMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u2' },
      member: { role: 'admin', userId: 'u1' },
      server: { ownerId: 'owner' },
    }), res);

    assert.equal(target.role, 'member');
    assert.equal(res.statusCode, 200);
    assert.equal(mockLogAuditEvent.mock.callCount(), 1);
    assert.deepEqual(mockLogAuditEvent.mock.calls[0]!.arguments[4], { fromRole: 'mod', toRole: 'member' });
  });

  it('cannot demote owner', async () => {
    const target = { role: 'admin', userId: 'owner' };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    await assert.rejects(
      () => demoteMember(makeReq({
        headers: { 'x-user-id': 'owner' },
        params: { serverId: 's1', userId: 'owner' },
        member: { role: 'admin', userId: 'owner' },
        server: { ownerId: 'owner' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'CANNOT_DEMOTE'),
    );
  });

  it('cannot demote below member', async () => {
    const target = { role: 'member', userId: 'u2' };
    mockMemberFindOne.mock.mockImplementation(async () => target);

    await assert.rejects(
      () => demoteMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u2' },
        member: { role: 'admin', userId: 'u1' },
        server: { ownerId: 'owner' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'CANNOT_DEMOTE'),
    );
  });
});
