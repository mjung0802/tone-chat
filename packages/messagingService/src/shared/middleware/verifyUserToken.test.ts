import type { Request, Response, NextFunction } from 'express';
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-secret';

mock.module('../../config/index.js', {
  namedExports: { config: { jwtSecret: TEST_SECRET } },
});

const { verifyUserToken } = await import('./verifyUserToken.js');

type TestReq = Partial<Request> & { userId?: string };
type TestRes = Response & { statusCode: number; _json: unknown };

function makeReq(headers: Record<string, string> = {}): TestReq {
  return { headers } as TestReq;
}

function makeRes(): TestRes {
  const res = { statusCode: 200, _json: undefined } as TestRes;
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  return res;
}

describe('verifyUserToken', () => {
  it('returns 401 MISSING_USER_TOKEN when X-User-Token header is absent', () => {
    const res = makeRes();
    const next = mock.fn<NextFunction>();
    verifyUserToken(makeReq() as Request, res, next);
    assert.equal(res.statusCode, 401);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MISSING_USER_TOKEN');
    assert.equal(next.mock.callCount(), 0);
  });

  it('returns 401 INVALID_USER_TOKEN when token is signed with wrong secret', () => {
    const token = jwt.sign({ sub: 'u1' }, 'wrong-secret');
    const res = makeRes();
    const next = mock.fn<NextFunction>();
    verifyUserToken(makeReq({ 'x-user-token': token }) as Request, res, next);
    assert.equal(res.statusCode, 401);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_USER_TOKEN');
    assert.equal(next.mock.callCount(), 0);
  });

  it('returns 401 INVALID_USER_TOKEN when token is expired', () => {
    const token = jwt.sign({ sub: 'u1' }, TEST_SECRET, { expiresIn: -1 });
    const res = makeRes();
    const next = mock.fn<NextFunction>();
    verifyUserToken(makeReq({ 'x-user-token': token }) as Request, res, next);
    assert.equal(res.statusCode, 401);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_USER_TOKEN');
    assert.equal(next.mock.callCount(), 0);
  });

  it('sets req.userId and calls next for a valid token', () => {
    const token = jwt.sign({ sub: 'user-123' }, TEST_SECRET);
    const req = makeReq({ 'x-user-token': token });
    const res = makeRes();
    const next = mock.fn<NextFunction>();
    verifyUserToken(req as Request, res, next);
    assert.equal(next.mock.callCount(), 1);
    assert.equal(req.userId, 'user-123');
    assert.equal(res.statusCode, 200);
  });
});
