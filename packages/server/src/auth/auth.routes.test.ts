import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach } from 'node:test';

const mockLoginUser = mock.fn<AnyFn>();
const mockRegisterUser = mock.fn<AnyFn>();
const mockRefreshToken = mock.fn<AnyFn>();
const mockLogoutUser = mock.fn<AnyFn>();
const mockVerifyEmail = mock.fn<AnyFn>();
const mockResendVerification = mock.fn<AnyFn>();

mock.module('./auth.client.js', {
  namedExports: {
    loginUser: mockLoginUser,
    registerUser: mockRegisterUser,
    refreshToken: mockRefreshToken,
    logoutUser: mockLogoutUser,
    verifyEmail: mockVerifyEmail,
    resendVerification: mockResendVerification,
  },
});

mock.module('./auth.rateLimit.js', {
  namedExports: {
    authRateLimiters: {
      register: (_req: unknown, _res: unknown, next: () => void) => next(),
      login: (_req: unknown, _res: unknown, next: () => void) => next(),
      refresh: (_req: unknown, _res: unknown, next: () => void) => next(),
      verifyEmail: (_req: unknown, _res: unknown, next: () => void) => next(),
      verifyEmailPerUser: (_req: unknown, _res: unknown, next: () => void) => next(),
      resendVerification: (_req: unknown, _res: unknown, next: () => void) => next(),
    },
  },
});

mock.module('../shared/middleware/auth.js', {
  namedExports: {
    requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  },
});

const { authRouter } = await import('./auth.routes.js');

type RouteStackEntry = { method?: string; handle?: (req: unknown, res: unknown) => Promise<void> };
type RouterLayer = { route?: { path?: string; methods?: Record<string, boolean>; stack?: RouteStackEntry[] } };

function findHandler(path: string, method: string) {
  // @ts-expect-error - simplified RouterLayer type for testing
  const layer = (authRouter.stack as RouterLayer[]).find(
    (l) => l.route?.path === path && Boolean(l.route?.methods?.[method]),
  );
  const stack = (layer?.route?.stack ?? []) as RouteStackEntry[];
  const methodHandlers = stack.filter((s) => s.method === method);
  const handle = methodHandlers[methodHandlers.length - 1]?.handle ?? (async () => {});
  return handle as (req: unknown, res: unknown) => Promise<void>;
}

type TestCookie = { value: string; options: Record<string, unknown> };
type TestRes = {
  statusCode: number;
  _json: unknown;
  _cookies: Record<string, TestCookie>;
  _clearedCookies: string[];
  status: (c: number) => TestRes;
  json: (d: unknown) => TestRes;
  cookie: (name: string, value: string, options?: Record<string, unknown>) => TestRes;
  clearCookie: (name: string, options?: Record<string, unknown>) => TestRes;
};

function makeRes(): TestRes {
  const res: TestRes = {
    statusCode: 200,
    _json: undefined,
    _cookies: {},
    _clearedCookies: [],
    status(c) { res.statusCode = c; return res; },
    json(d) { res._json = d; return res; },
    cookie(name, value, options) { res._cookies[name] = { value, options: options ?? {} }; return res; },
    clearCookie(name) { res._clearedCookies.push(name); return res; },
  };
  return res;
}

describe('POST /login cookie behaviour', () => {
  const loginHandler = findHandler('/login', 'post');

  beforeEach(() => mockLoginUser.mock.resetCalls());

  it('sets httpOnly refreshToken cookie and strips it from response body on success', async () => {
    mockLoginUser.mock.mockImplementation(async () => ({
      status: 200,
      data: { accessToken: 'at1', refreshToken: 'rt1', userId: 'u1' },
    }));

    const req = { body: { email: 'a@b.com', password: 'secret' }, cookies: {} };
    const res = makeRes();
    await loginHandler(req, res);

    assert.equal(res.statusCode, 200);
    // refreshToken cookie set
    assert.ok('refreshToken' in res._cookies, 'refreshToken cookie should be set');
    assert.equal(res._cookies['refreshToken']!.value, 'rt1');
    assert.equal(res._cookies['refreshToken']!.options['httpOnly'], true);
    // refreshToken stripped from body
    const body = res._json as Record<string, unknown>;
    assert.equal(body['refreshToken'], undefined, 'refreshToken should not be in response body');
    assert.equal(body['accessToken'], 'at1');
  });

  it('does not set cookie when login fails', async () => {
    mockLoginUser.mock.mockImplementation(async () => ({
      status: 401,
      data: { error: { code: 'INVALID_CREDENTIALS', message: 'Bad creds', status: 401 } },
    }));

    const req = { body: { email: 'a@b.com', password: 'bad' }, cookies: {} };
    const res = makeRes();
    await loginHandler(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(Object.keys(res._cookies).length, 0, 'no cookie should be set on failure');
  });
});

describe('POST /refresh cookie behaviour', () => {
  const refreshHandler = findHandler('/refresh', 'post');

  beforeEach(() => mockRefreshToken.mock.resetCalls());

  it('reads refreshToken from cookie (takes precedence over body)', async () => {
    mockRefreshToken.mock.mockImplementation(async () => ({
      status: 200,
      data: { accessToken: 'at2', refreshToken: 'rt2' },
    }));

    const req = { body: { refreshToken: 'body-rt' }, cookies: { refreshToken: 'cookie-rt' } };
    const res = makeRes();
    await refreshHandler(req, res);

    assert.equal(mockRefreshToken.mock.callCount(), 1);
    const callArgs = mockRefreshToken.mock.calls[0]!.arguments[0] as { refreshToken: string };
    assert.equal(callArgs.refreshToken, 'cookie-rt', 'should use cookie token, not body token');
  });

  it('falls back to body refreshToken when no cookie', async () => {
    mockRefreshToken.mock.mockImplementation(async () => ({
      status: 200,
      data: { accessToken: 'at3', refreshToken: 'rt3' },
    }));

    const req = { body: { refreshToken: 'body-rt' }, cookies: {} };
    const res = makeRes();
    await refreshHandler(req, res);

    const callArgs = mockRefreshToken.mock.calls[0]!.arguments[0] as { refreshToken: string };
    assert.equal(callArgs.refreshToken, 'body-rt');
  });

  it('returns 401 when neither cookie nor body refreshToken present', async () => {
    const req = { body: {}, cookies: {} };
    const res = makeRes();
    await refreshHandler(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(mockRefreshToken.mock.callCount(), 0);
  });

  it('rotates cookie and strips refreshToken from body on success', async () => {
    mockRefreshToken.mock.mockImplementation(async () => ({
      status: 200,
      data: { accessToken: 'at4', refreshToken: 'new-rt' },
    }));

    const req = { body: {}, cookies: { refreshToken: 'old-rt' } };
    const res = makeRes();
    await refreshHandler(req, res);

    assert.equal(res._cookies['refreshToken']!.value, 'new-rt');
    const body = res._json as Record<string, unknown>;
    assert.equal(body['refreshToken'], undefined);
    assert.equal(body['accessToken'], 'at4');
  });
});

describe('POST /logout cookie behaviour', () => {
  const logoutHandler = findHandler('/logout', 'post');

  beforeEach(() => mockLogoutUser.mock.resetCalls());

  it('clears the refreshToken cookie on logout', async () => {
    mockLogoutUser.mock.mockImplementation(async () => ({ status: 200, data: {} }));

    const req = { body: {}, cookies: { refreshToken: 'rt1' } };
    const res = makeRes();
    await logoutHandler(req, res);

    assert.ok(res._clearedCookies.includes('refreshToken'), 'refreshToken cookie should be cleared');
  });
});
