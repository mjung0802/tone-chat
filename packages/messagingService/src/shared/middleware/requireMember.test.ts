import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

type MemberMiddlewareReq = Request & { member?: unknown };
type TestResponse = Response & { statusCode: number; _json: unknown };

const mockFindOne = mock.fn<AnyFn>();

mock.module('../../members/serverMember.model.js', {
  namedExports: {
    ServerMember: { findOne: mockFindOne },
  },
});

const { requireMember } = await import('./requireMember.js');

function makeReq(overrides: Partial<Pick<Request, 'params' | 'headers'>> = {}): MemberMiddlewareReq {
  return { params: {}, headers: {}, ...overrides } as MemberMiddlewareReq;
}

function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  return res;
}

describe('requireMember', () => {
  beforeEach(() => mockFindOne.mock.resetCalls());

  it('returns 401 when x-user-id header is missing', async () => {
    const res = makeRes();
    const next = mock.fn();
    await requireMember(makeReq({ params: { serverId: 's1' } }), res, next);
    assert.equal(res.statusCode, 401);
    assert.equal((res._json as { error: { code: string } }).error.code, 'UNAUTHORIZED');
    assert.equal(next.mock.callCount(), 0);
  });

  it('returns 403 when user is not a member', async () => {
    mockFindOne.mock.mockImplementation(async () => null);
    const res = makeRes();
    const next = mock.fn();
    await requireMember(
      makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } }),
      res,
      next,
    );
    assert.equal(res.statusCode, 403);
    assert.equal((res._json as { error: { code: string } }).error.code, 'NOT_A_MEMBER');
    assert.equal(next.mock.callCount(), 0);
  });

  it('calls next and attaches member when user is a member', async () => {
    const member = { serverId: 's1', userId: 'u1', roles: [] };
    mockFindOne.mock.mockImplementation(async () => member);
    const req = makeReq({ headers: { 'x-user-id': 'u1' }, params: { serverId: 's1' } });
    const res = makeRes();
    const next = mock.fn();
    await requireMember(req, res, next);
    assert.equal(next.mock.callCount(), 1);
    assert.equal(req.member, member);
  });
});
