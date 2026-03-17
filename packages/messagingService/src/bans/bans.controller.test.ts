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

const mockBanCreate = mock.fn<AnyFn>();
const mockBanFind = mock.fn<AnyFn>();
const mockBanFindOne = mock.fn<AnyFn>();
const mockBanFindOneAndDelete = mock.fn<AnyFn>();

mock.module('./serverBan.model.js', {
  namedExports: {
    ServerBan: {
      create: mockBanCreate,
      find: mockBanFind,
      findOne: mockBanFindOne,
      findOneAndDelete: mockBanFindOneAndDelete,
    },
  },
});

const mockMemberFindOne = mock.fn<AnyFn>();
mock.module('../members/serverMember.model.js', {
  namedExports: { ServerMember: { findOne: mockMemberFindOne } },
});

const { banMember, unbanUser, listBans } = await import('./bans.controller.js');

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

describe('banMember', () => {
  beforeEach(() => {
    mockMemberFindOne.mock.resetCalls();
    mockBanCreate.mock.resetCalls();
  });

  it('bans a lower-role member', async () => {
    const target = { role: 'member', userId: 'u2', deleteOne: mock.fn(async () => {}) };
    mockMemberFindOne.mock.mockImplementation(async () => target);
    mockBanCreate.mock.mockImplementation(async () => ({}));

    const res = makeRes();
    await banMember(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', userId: 'u2' },
      body: { reason: 'spam' },
      member: { role: 'mod', userId: 'u1' },
      server: { ownerId: 'owner' },
    }), res);

    assert.equal(res.statusCode, 201);
    assert.equal(mockBanCreate.mock.callCount(), 1);
    assert.equal(target.deleteOne.mock.callCount(), 1);
  });

  it('rejects banning equal-role member', async () => {
    mockMemberFindOne.mock.mockImplementation(async () => ({ role: 'mod', userId: 'u2' }));

    await assert.rejects(
      () => banMember(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { serverId: 's1', userId: 'u2' },
        body: {},
        member: { role: 'mod', userId: 'u1' },
        server: { ownerId: 'owner' },
      }), makeRes()),
      (error) => assertErrorCode(error, 'FORBIDDEN'),
    );
  });
});

describe('unbanUser', () => {
  beforeEach(() => mockBanFindOneAndDelete.mock.resetCalls());

  it('deletes ban and returns 204', async () => {
    mockBanFindOneAndDelete.mock.mockImplementation(async () => ({ userId: 'u2' }));
    const res = makeRes();
    await unbanUser(makeReq({ params: { serverId: 's1', userId: 'u2' } }), res);
    assert.equal(res.statusCode, 204);
  });

  it('throws BAN_NOT_FOUND when no ban exists', async () => {
    mockBanFindOneAndDelete.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => unbanUser(makeReq({ params: { serverId: 's1', userId: 'u2' } }), makeRes()),
      (error) => assertErrorCode(error, 'BAN_NOT_FOUND'),
    );
  });
});

describe('listBans', () => {
  it('returns bans', async () => {
    const bans = [{ userId: 'u2' }];
    mockBanFind.mock.mockImplementation(async () => bans);
    const res = makeRes();
    await listBans(makeReq({ params: { serverId: 's1' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { bans: unknown[] }).bans, bans);
  });
});
