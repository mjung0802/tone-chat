import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockInviteCreate = mock.fn();
const mockInviteFind = mock.fn();
const mockInviteFindOne = mock.fn();
const mockInviteFindOneAndUpdate = mock.fn();

await mock.module('./invite.model.js', {
  namedExports: {
    Invite: {
      create: mockInviteCreate,
      find: mockInviteFind,
      findOne: mockInviteFindOne,
      findOneAndUpdate: mockInviteFindOneAndUpdate,
    },
  },
});

const mockServerFindById = mock.fn();
await mock.module('../servers/server.model.js', {
  namedExports: { Server: { findById: mockServerFindById } },
});

const mockMemberFindOne = mock.fn();
const mockMemberCreate = mock.fn();
await mock.module('../members/serverMember.model.js', {
  namedExports: {
    ServerMember: { findOne: mockMemberFindOne, create: mockMemberCreate },
  },
});

const { createInvite, listInvites, revokeInvite, joinViaInvite } = await import('./invites.controller.js');

function makeReq(overrides: Partial<{ body: any; params: any; headers: any; query: any }> = {}) {
  return { body: {}, params: {}, headers: {}, query: {}, ...overrides } as any;
}
function makeRes() {
  const res: any = { statusCode: 200, _json: undefined };
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
      (err: any) => { assert.equal(err.code, 'NOT_MEMBER'); return true; },
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
    const createArg = mockInviteCreate.mock.calls[0]!.arguments[0];
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
    assert.deepEqual(res._json.invites, invites);
    assert.equal(mockInviteFind.mock.calls[0]!.arguments[0].revoked, false);
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
      (err: any) => { assert.equal(err.code, 'SERVER_NOT_FOUND'); return true; },
    );
  });

  it('throws FORBIDDEN when non-admin non-owner', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'other' }));
    mockMemberFindOne.mock.mockImplementation(async () => ({ roles: [] }));
    await assert.rejects(
      () => revokeInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1', code: 'abc' } }), makeRes()),
      (err: any) => { assert.equal(err.code, 'FORBIDDEN'); return true; },
    );
  });

  it('owner can revoke; returns 200', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ ownerId: 'u1' }));
    mockMemberFindOne.mock.mockImplementation(async () => ({ roles: [] }));
    const invite = { code: 'abc', revoked: true };
    mockInviteFindOneAndUpdate.mock.mockImplementation(async () => invite);

    const res = makeRes();
    await revokeInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1', code: 'abc' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res._json.invite, invite);
  });
});

describe('joinViaInvite', () => {
  beforeEach(() => {
    mockInviteFindOne.mock.resetCalls();
    mockMemberFindOne.mock.resetCalls();
    mockMemberCreate.mock.resetCalls();
    mockServerFindById.mock.resetCalls();
  });

  it('throws INVITE_NOT_FOUND when invite is null', async () => {
    mockInviteFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => joinViaInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { code: 'bad' } }), makeRes()),
      (err: any) => { assert.equal(err.code, 'INVITE_NOT_FOUND'); return true; },
    );
  });

  it('throws INVITE_REVOKED when revoked', async () => {
    mockInviteFindOne.mock.mockImplementation(async () => ({ revoked: true }));
    await assert.rejects(
      () => joinViaInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { code: 'abc' } }), makeRes()),
      (err: any) => { assert.equal(err.code, 'INVITE_REVOKED'); return true; },
    );
  });

  it('throws INVITE_EXPIRED when expired', async () => {
    mockInviteFindOne.mock.mockImplementation(async () => ({
      revoked: false,
      expiresAt: new Date('2000-01-01'),
    }));
    await assert.rejects(
      () => joinViaInvite(makeReq({ headers: { 'x-user-id': 'u1' }, params: { code: 'abc' } }), makeRes()),
      (err: any) => { assert.equal(err.code, 'INVITE_EXPIRED'); return true; },
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
      (err: any) => { assert.equal(err.code, 'INVITE_EXHAUSTED'); return true; },
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
      (err: any) => { assert.equal(err.code, 'ALREADY_MEMBER'); return true; },
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
    assert.deepEqual(res._json.member, member);
  });
});
