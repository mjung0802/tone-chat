import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockVerify = mock.fn();
await mock.module('jsonwebtoken', {
  defaultExport: { verify: mockVerify },
  namedExports: { verify: mockVerify },
});

await mock.module('../../config/index.js', {
  namedExports: { config: { jwtSecret: 'test-secret' } },
});

const { requireAuth } = await import('./auth.js');

function makeReq(overrides: Partial<{ headers: Record<string, string> }> = {}) {
  return { headers: {}, ...overrides } as any;
}
function makeRes() {
  const res: any = { statusCode: 200, _json: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  return res;
}

describe('requireAuth', () => {
  beforeEach(() => {
    mockVerify.mock.resetCalls();
  });

  it('returns 401 MISSING_TOKEN when no Authorization header', () => {
    const req = makeReq();
    const res = makeRes();
    requireAuth(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res._json.error.code, 'MISSING_TOKEN');
  });

  it('returns 401 MISSING_TOKEN when header does not start with Bearer', () => {
    const req = makeReq({ headers: { authorization: 'Basic abc123' } });
    const res = makeRes();
    requireAuth(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res._json.error.code, 'MISSING_TOKEN');
  });

  it('returns 401 INVALID_TOKEN when jwt.verify throws', () => {
    mockVerify.mock.mockImplementation(() => { throw new Error('bad token'); });
    const req = makeReq({ headers: { authorization: 'Bearer bad-token' } });
    const res = makeRes();
    requireAuth(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res._json.error.code, 'INVALID_TOKEN');
  });

  it('sets req.userId and calls next() on valid token', () => {
    mockVerify.mock.mockImplementation(() => ({ sub: 'user-123' }));
    const req = makeReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = makeRes();
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert.equal(req.userId, 'user-123');
    assert.equal(nextCalled, true);
  });
});
