import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import type { IServerMember } from '../members/serverMember.model.js';

const mockInviteCreate = mock.fn<AnyFn>();
const mockInviteFind = mock.fn<AnyFn>();
const mockInviteFindOne = mock.fn<AnyFn>();
const mockInviteFindOneAndUpdate = mock.fn<AnyFn>();

mock.module('./invite.model.js', {
  namedExports: {
    Invite: {
      create: mockInviteCreate,
      find: mockInviteFind,
      findOne: mockInviteFindOne,
      findOneAndUpdate: mockInviteFindOneAndUpdate,
    },
  },
});

const mockServerFindById = mock.fn<AnyFn>();
mock.module('../servers/server.model.js', {
  namedExports: { Server: { findById: mockServerFindById } },
});

const mockMemberFindOne = mock.fn<AnyFn>();
const mockMemberCreate = mock.fn<AnyFn>();
mock.module('../members/serverMember.model.js', {
  namedExports: {
    ServerMember: { findOne: mockMemberFindOne, create: mockMemberCreate },
  },
});

const mockBanFindOne = mock.fn<AnyFn>();
mock.module('../bans/serverBan.model.js', {
  namedExports: { ServerBan: { findOne: mockBanFindOne } },
});

const { createInvite, listInvites, revokeInvite, joinViaInvite, getDefaultInvite } = await import('./invites.controller.js');

type RequestOverrides = Partial<Pick<Request, 'body' | 'params' | 'headers' | 'query'>>;
type TestResponse = Response & { statusCode: number; _json: unknown; end: () => TestResponse };

function assertErrorCode(error: unknown, code: string): true {
  assert.equal(typeof error, 'object');
  assert.notEqual(error, null);
  assert.equal((error as { code?: unknown }).code, code);
  return true;
}

function makeReq(overrides: RequestOverrides = {}): Request {
  return { body: {}, params: {}, headers: {}, query: {}, ...overrides } as Request;
}

function makeReqWithMember(overrides: RequestOverrides & { memberRole?: 'admin' | 'mod' | 'member' } = {}): Request {
  const { memberRole, ...rest } = overrides;
  const req = makeReq(rest);
  req.member = { role: memberRole ?? 'member' } as IServerMember;
  return req;
}
function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  res.end = () => res;
  return res;
}

describe('createInvite', () => {
  beforeEach(() => {
    mockMemberFindOne.mock.resetCalls();
    mockInviteCreate.mock.resetCalls();
  });

  it('throws NOT_MEMBER when user is not a member', async () => {
    mockMemberFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => createInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' }, body: {} }), makeRes()),
      (error) => assertErrorCode(error, 'NOT_MEMBER'),
    );
  });

  it('sets expiresAt from expiresIn and returns 201', async () => {
    mockMemberFindOne.mock.mockImplementation(async () => ({ userId: 'u1' }));
    const invite = { code: 'abc123', serverId: 's1' };
    mockInviteCreate.mock.mockImplementation(async () => invite);

    const before = Date.now();
    const res = makeRes();
    await createInvite(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1' },
      body: { expiresIn: 3600 },
    }), res);

    assert.equal(res.statusCode, 201);
    const createArg = mockInviteCreate.mock.calls[0]!.arguments[0] as { expiresAt: Date };
    assert.ok(createArg.expiresAt instanceof Date);
    // expiresAt should be ~3600s from now
    const diff = createArg.expiresAt.getTime() - before;
    assert.ok(diff >= 3599000 && diff <= 3601000);
  });
});

describe('listInvites', () => {
  it('queries with revoked: false and returns 200', async () => {
    const invites = [{ code: 'a' }, { code: 'b' }];
    mockInviteFind.mock.mockImplementation(async () => invites);

    const res = makeRes();
    await listInvites(makeReq({ params: { serverId: 's1' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { invites: unknown[] }).invites, invites);
    assert.equal((mockInviteFind.mock.calls[0]!.arguments[0] as { revoked: boolean }).revoked, false);
  });
});

describe('revokeInvite', () => {
  beforeEach(() => {
    mockServerFindById.mock.resetCalls();
    mockMemberFindOne.mock.resetCalls();
    mockInviteFindOneAndUpdate.mock.resetCalls();
  });

  it('throws SERVER_NOT_FOUND when server is null', async () => {
    mockServerFindById.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => revokeInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1', code: 'abc' } }), makeRes()),
      (error) => assertErrorCode(error, 'SERVER_NOT_FOUND'),
    );
  });

  it('throws FORBIDDEN when non-admin non-owner', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'other' }));
    mockMemberFindOne.mock.mockImplementation(async () => ({ role: 'member' }));
    await assert.rejects(
      () => revokeInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1', code: 'abc' } }), makeRes()),
      (error) => assertErrorCode(error, 'FORBIDDEN'),
    );
  });

  it('owner can revoke; returns 200', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'u1' }));
    mockMemberFindOne.mock.mockImplementation(async () => ({ role: 'member' }));
    const invite = { code: 'abc', revoked: true };
    mockInviteFindOneAndUpdate.mock.mockImplementation(async () => invite);

    const res = makeRes();
    await revokeInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1', code: 'abc' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { invite: unknown }).invite, invite);
  });
});

describe('getDefaultInvite', () => {
  beforeEach(() => {
    mockServerFindById.mock.resetCalls();
    mockInviteFindOne.mock.resetCalls();
    mockInviteCreate.mock.resetCalls();
  });

  it('allowMemberInvites true + regular member → 200, returns invite', async () => {
    const existingInvite = { code: 'abc', serverId: 's1' };
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'owner', allowMemberInvites: true }));
    mockInviteFindOne.mock.mockImplementation(async () => existingInvite);

    const res = makeRes();
    await getDefaultInvite(makeReqWithMember({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1' },
      memberRole: 'member',
    }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { invite: unknown }).invite, existingInvite);
    assert.equal(mockInviteCreate.mock.callCount(), 0);
  });

  it('allowMemberInvites false + regular member → 403', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'owner', allowMemberInvites: false }));

    await assert.rejects(
      () => getDefaultInvite(makeReqWithMember({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1' },
        memberRole: 'member',
      }), makeRes()),
      (error) => assertErrorCode(error, 'FORBIDDEN'),
    );
  });

  it('allowMemberInvites false + admin → 200', async () => {
    const existingInvite = { code: 'abc', serverId: 's1' };
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'owner', allowMemberInvites: false }));
    mockInviteFindOne.mock.mockImplementation(async () => existingInvite);

    const res = makeRes();
    await getDefaultInvite(makeReqWithMember({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1' },
      memberRole: 'admin',
    }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { invite: unknown }).invite, existingInvite);
  });

  it('returns existing invite when one already exists (no duplicate creation)', async () => {
    const existingInvite = { code: 'existing', serverId: 's1' };
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'owner', allowMemberInvites: true }));
    mockInviteFindOne.mock.mockImplementation(async () => existingInvite);

    const res = makeRes();
    await getDefaultInvite(makeReqWithMember({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1' },
      memberRole: 'member',
    }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { invite: unknown }).invite, existingInvite);
    assert.equal(mockInviteCreate.mock.callCount(), 0);
  });

  it('creates new invite when none exist', async () => {
    const newInvite = { code: 'new123', serverId: 's1' };
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'owner', allowMemberInvites: true }));
    mockInviteFindOne.mock.mockImplementation(async () => null);
    mockInviteCreate.mock.mockImplementation(async () => newInvite);

    const res = makeRes();
    await getDefaultInvite(makeReqWithMember({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1' },
      memberRole: 'member',
    }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { invite: unknown }).invite, newInvite);
    assert.equal(mockInviteCreate.mock.callCount(), 1);
  });
});

describe('joinViaInvite', () => {
  beforeEach(() => {
    mockInviteFindOne.mock.resetCalls();
    mockMemberFindOne.mock.resetCalls();
    mockMemberCreate.mock.resetCalls();
    mockServerFindById.mock.resetCalls();
    mockBanFindOne.mock.resetCalls();
    mockBanFindOne.mock.mockImplementation(async () => null);
  });

  it('throws INVITE_NOT_FOUND when invite is null', async () => {
    mockInviteFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => joinViaInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { code: 'bad' } }), makeRes()),
      (error) => assertErrorCode(error, 'INVITE_NOT_FOUND'),
    );
  });

  it('throws INVITE_REVOKED when revoked', async () => {
    mockInviteFindOne.mock.mockImplementation(async () => ({ revoked: true }));
    await assert.rejects(
      () => joinViaInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { code: 'abc' } }), makeRes()),
      (error) => assertErrorCode(error, 'INVITE_REVOKED'),
    );
  });

  it('throws INVITE_EXPIRED when expired', async () => {
    mockInviteFindOne.mock.mockImplementation(async () => ({
      revoked: false,
      expiresAt: new Date('2000-01-01'),
    }));
    await assert.rejects(
      () => joinViaInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { code: 'abc' } }), makeRes()),
      (error) => assertErrorCode(error, 'INVITE_EXPIRED'),
    );
  });

  it('throws INVITE_EXHAUSTED when maxUses reached', async () => {
    mockInviteFindOne.mock.mockImplementation(async () => ({
      revoked: false,
      expiresAt: null,
      maxUses: 5,
      uses: 5,
    }));
    await assert.rejects(
      () => joinViaInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { code: 'abc' } }), makeRes()),
      (error) => assertErrorCode(error, 'INVITE_EXHAUSTED'),
    );
  });

  it('throws ALREADY_MEMBER when already joined', async () => {
    mockInviteFindOne.mock.mockImplementation(async () => ({
      revoked: false,
      expiresAt: null,
      maxUses: 0,
      uses: 0,
      serverId: 's1',
    }));
    mockMemberFindOne.mock.mockImplementation(async () => ({ userId: 'u1' }));
    await assert.rejects(
      () => joinViaInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { code: 'abc' } }), makeRes()),
      (error) => assertErrorCode(error, 'ALREADY_MEMBER'),
    );
  });

  it('increments uses and returns 201', async () => {
    const invite = {
      revoked: false,
      expiresAt: null,
      maxUses: 10,
      uses: 2,
      serverId: 's1',
      save: mock.fn(async () => {}),
    };
    mockInviteFindOne.mock.mockImplementation(async () => invite);
    mockMemberFindOne.mock.mockImplementation(async () => null);
    const member = { serverId: 's1', userId: 'u1' };
    mockMemberCreate.mock.mockImplementation(async () => member);
    mockServerFindById.mock.mockImplementation(async () => ({ _id: 's1', name: 'Test' }));

    const res = makeRes();
    await joinViaInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { code: 'abc' } }), res);
    assert.equal(res.statusCode, 201);
    assert.equal(invite.uses, 3);
    assert.equal(invite.save.mock.callCount(), 1);
    assert.deepEqual((res._json as { member: unknown }).member, member);
  });
});
