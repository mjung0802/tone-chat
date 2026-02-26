import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockRegisterUser = mock.fn<AnyFn>();
const mockLoginUser = mock.fn<AnyFn>();
const mockRefreshAccessToken = mock.fn<AnyFn>();

mock.module('./auth.service.js', {
  namedExports: {
    registerUser: mockRegisterUser,
    loginUser: mockLoginUser,
    refreshAccessToken: mockRefreshAccessToken,
  },
});

const { register, login, refresh } = await import('./auth.controller.js');

function makeReq(overrides: Partial<{ body: any; params: any; headers: any; query: any }> = {}) {
  return { body: {}, params: {}, headers: {}, query: {}, ...overrides } as any;
}
function makeRes() {
  const res: any = { statusCode: 200, _json: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  return res;
}

describe('register', () => {
  beforeEach(() => mockRegisterUser.mock.resetCalls());

  it('returns 400 when username missing', async () => {
    const res = makeRes();
    await register(makeReq({ body: { email: 'a@b.com', password: '12345678' } }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'MISSING_FIELDS');
  });

  it('returns 400 when email missing', async () => {
    const res = makeRes();
    await register(makeReq({ body: { username: 'alice', password: '12345678' } }), res);
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 when password missing', async () => {
    const res = makeRes();
    await register(makeReq({ body: { username: 'alice', email: 'a@b.com' } }), res);
    assert.equal(res.statusCode, 400);
  });

  it('returns 201 on success', async () => {
    const data = { user: { id: 'u1' }, accessToken: 'at', refreshToken: 'rt' };
    mockRegisterUser.mock.mockImplementation(async () => data);
    const res = makeRes();
    await register(makeReq({ body: { username: 'alice', email: 'a@b.com', password: '12345678' } }), res);
    assert.equal(res.statusCode, 201);
    assert.equal(res._json.user.id, 'u1');
  });
});

describe('login', () => {
  beforeEach(() => mockLoginUser.mock.resetCalls());

  it('returns 400 when email missing', async () => {
    const res = makeRes();
    await login(makeReq({ body: { password: '12345678' } }), res);
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 when password missing', async () => {
    const res = makeRes();
    await login(makeReq({ body: { email: 'a@b.com' } }), res);
    assert.equal(res.statusCode, 400);
  });

  it('returns 200 on success', async () => {
    const data = { user: { id: 'u1' }, accessToken: 'at', refreshToken: 'rt' };
    mockLoginUser.mock.mockImplementation(async () => data);
    const res = makeRes();
    await login(makeReq({ body: { email: 'a@b.com', password: '12345678' } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res._json.accessToken, 'at');
  });
});

describe('refresh', () => {
  beforeEach(() => mockRefreshAccessToken.mock.resetCalls());

  it('returns 400 when refreshToken missing', async () => {
    const res = makeRes();
    await refresh(makeReq({ body: {} }), res);
    assert.equal(res.statusCode, 400);
  });

  it('returns 200 on success', async () => {
    mockRefreshAccessToken.mock.mockImplementation(async () => ({ accessToken: 'new-at', refreshToken: 'new-rt' }));
    const res = makeRes();
    await refresh(makeReq({ body: { refreshToken: 'old-rt' } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res._json.accessToken, 'new-at');
  });
});
