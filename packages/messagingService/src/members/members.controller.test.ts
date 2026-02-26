import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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

const { joinServer, listMembers, getMember, updateMember, removeMember } = await import('./members.controller.js');

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

describe('joinServer', () => {
  beforeEach(() => {
    mockServerFindById.mock.resetCalls();
    mockMemberFindOne.mock.resetCalls();
    mockMemberCreate.mock.resetCalls();
  });

  it('throws SERVER_NOT_FOUND when server is null', async () => {
    mockServerFindById.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => joinServer(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } }), makeRes()),
      (err: any) => { assert.equal(err.code, 'SERVER_NOT_FOUND'); return true; },
    );
  });

  it('rejects private servers', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ visibility: 'private' }));
    await assert.rejects(
      () => joinServer(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } }), makeRes()),
      (err: any) => { assert.equal(err.code, 'SERVER_PRIVATE'); return true; },
    );
  });

  it('throws ALREADY_MEMBER when existing', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ visibility: 'public' }));
    mockMemberFindOne.mock.mockImplementation(async () => ({ userId: 'u1' }));
    await assert.rejects(
      () => joinServer(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } }), makeRes()),
      (err: any) => { assert.equal(err.code, 'ALREADY_MEMBER'); return true; },
    );
  });

  it('creates member and returns 201', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ visibility: 'public' }));
    mockMemberFindOne.mock.mockImplementation(async () => null);
    const member = { serverId: 's1', userId: 'u1' };
    mockMemberCreate.mock.mockImplementation(async () => member);

    const res = makeRes();
    await joinServer(makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } }), res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res._json.member, member);
  });
});

describe('listMembers', () => {
  it('returns 200 with members', async () => {
    const members = [{ userId: 'u1' }, { userId: 'u2' }];
    mockMemberFind.mock.mockImplementation(async () => members);

    const res = makeRes();
    await listMembers(makeReq({ params: { serverId: 's1' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res._json.members, members);
  });
});

describe('getMember', () => {
  beforeEach(() => mockMemberFindOne.mock.resetCalls());

  it('throws MEMBER_NOT_FOUND when null', async () => {
    mockMemberFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => getMember(makeReq({ params: { serverId: 's1', userId: 'u1' } }), makeRes()),
      (err: any) => { assert.equal(err.code, 'MEMBER_NOT_FOUND'); return true; },
    );
  });

  it('returns 200 with member', async () => {
    const member = { serverId: 's1', userId: 'u1' };
    mockMemberFindOne.mock.mockImplementation(async () => member);
    const res = makeRes();
    await getMember(makeReq({ params: { serverId: 's1', userId: 'u1' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res._json.member, member);
  });
});

describe('updateMember', () => {
  beforeEach(() => mockMemberFindOne.mock.resetCalls());

  it('throws FORBIDDEN when requester is not admin', async () => {
    mockMemberFindOne.mock.mockImplementation(async () => ({ roles: [] }));
    await assert.rejects(
      () => updateMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u2' },
        body: { nickname: 'nick' },
      }), makeRes()),
      (err: any) => { assert.equal(err.code, 'FORBIDDEN'); return true; },
    );
  });

  it('updates nickname and roles; returns 200', async () => {
    let callCount = 0;
    const target = { nickname: '', roles: [] as string[], save: mock.fn(async () => {}) };
    mockMemberFindOne.mock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { roles: ['admin'] }; // requester
      return target; // target member
    });

    const res = makeRes();
    await updateMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u2' },
      body: { nickname: 'nick', roles: ['mod'] },
    }), res);

    assert.equal(target.nickname, 'nick');
    assert.deepEqual(target.roles, ['mod']);
    assert.equal(target.save.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
  });
});

describe('removeMember', () => {
  beforeEach(() => {
    mockMemberFindOne.mock.resetCalls();
    mockMemberFindOneAndDelete.mock.resetCalls();
  });

  it('allows self-leave without admin check', async () => {
    mockMemberFindOneAndDelete.mock.mockImplementation(async () => ({ userId: 'u1' }));
    const res = makeRes();
    await removeMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u1' },
    }), res);
    assert.equal(res.statusCode, 204);
    // findOne should NOT have been called (self-leave path)
    assert.equal(mockMemberFindOne.mock.callCount(), 0);
  });

  it('admin can kick another member', async () => {
    mockMemberFindOne.mock.mockImplementation(async () => ({ roles: ['admin'] }));
    mockMemberFindOneAndDelete.mock.mockImplementation(async () => ({ userId: 'u2' }));

    const res = makeRes();
    await removeMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u2' },
    }), res);
    assert.equal(res.statusCode, 204);
  });

  it('throws FORBIDDEN when non-admin tries to kick', async () => {
    mockMemberFindOne.mock.mockImplementation(async () => ({ roles: [] }));
    await assert.rejects(
      () => removeMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u2' },
      }), makeRes()),
      (err: any) => { assert.equal(err.code, 'FORBIDDEN'); return true; },
    );
  });
});
