import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const mockRegisterUser = mock.fn<AnyFn>();
const mockLoginUser = mock.fn<AnyFn>();
const mockRefreshAccessToken = mock.fn<AnyFn>();
const mockLogoutUser = mock.fn<AnyFn>();

mock.module('./auth.service.js', {
  namedExports: {
    registerUser: mockRegisterUser,
    loginUser: mockLoginUser,
    refreshAccessToken: mockRefreshAccessToken,
    logoutUser: mockLogoutUser,
  },
});

const mockVerifyOtp = mock.fn<AnyFn>();
const mockSendVerificationOtp = mock.fn<AnyFn>();

mock.module('./verification.service.js', {
  namedExports: {
    verifyOtp: mockVerifyOtp,
    sendVerificationOtp: mockSendVerificationOtp,
  },
});

const mockGetUserById = mock.fn<AnyFn>();

mock.module('../users/users.service.js', {
  namedExports: { getUserById: mockGetUserById },
});

const { register, login, refresh, logout, verifyEmail, resendVerification } = await import('./auth.controller.js');

type RequestOverrides = Partial<Pick<Request, 'body' | 'params' | 'headers' | 'query'>> & { userId?: string };
type TestResponse = Response & { statusCode: number; _json: unknown };

function assertErrorCode(error: unknown, code: string): true {
  assert.equal(typeof error, 'object');
  assert.notEqual(error, null);
  assert.equal((error as { code?: unknown }).code, code);
  return true;
}

function makeReq(overrides: RequestOverrides = {}): Request {
  return { body: {}, params: {}, headers: {}, query: {}, userId: undefined, ...overrides } as Request;
}
function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
  res.status = (c: number) => {
    res.statusCode = c;
    return res;
  };
  res.json = (d: unknown) => {
    res._json = d;
    return res;
  };
  return res;
}

describe('register', () => {
  beforeEach(() => mockRegisterUser.mock.resetCalls());

  it('returns 400 when username missing', async () => {
    const res = makeRes();
    await register(makeReq({ body: { email: 'a@b.com', password: '12345678' } }), res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MISSING_FIELDS');
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
    assert.equal((res._json as { user: { id: string } }).user.id, 'u1');
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
    assert.equal((res._json as { accessToken: string }).accessToken, 'at');
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
    assert.equal((res._json as { accessToken: string }).accessToken, 'new-at');
  });
});

describe('logout', () => {
  beforeEach(() => mockLogoutUser.mock.resetCalls());

  it('returns 400 when refreshToken missing', async () => {
    const res = makeRes();
    await logout(makeReq({ body: {} }), res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MISSING_FIELDS');
  });

  it('returns 200 on success', async () => {
    mockLogoutUser.mock.mockImplementation(async () => {});
    const res = makeRes();
    await logout(makeReq({ body: { refreshToken: 'some-token' } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal((res._json as { message: string }).message, 'Logged out');
    assert.equal(mockLogoutUser.mock.callCount(), 1);
  });
});

describe('verifyEmail', () => {
  beforeEach(() => {
    mockVerifyOtp.mock.resetCalls();
  });

  it('returns 400 MISSING_FIELDS when code is absent', async () => {
    const res = makeRes();
    await verifyEmail(makeReq({ userId: 'u1', body: {} }), res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MISSING_FIELDS');
  });

  it('calls verifyOtp with userId from x-user-id header and code from body', async () => {
    mockVerifyOtp.mock.mockImplementation(async () => {});
    const res = makeRes();
    await verifyEmail(makeReq({ userId: 'u1', body: { code: '123456' } }), res);
    assert.equal(mockVerifyOtp.mock.callCount(), 1);
    assert.equal(mockVerifyOtp.mock.calls[0]!.arguments[0], 'u1');
    assert.equal(mockVerifyOtp.mock.calls[0]!.arguments[1], '123456');
  });

  it('returns 200 { message: "Email verified" } on success', async () => {
    mockVerifyOtp.mock.mockImplementation(async () => {});
    const res = makeRes();
    await verifyEmail(makeReq({ userId: 'u1', body: { code: '123456' } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal((res._json as { message: string }).message, 'Email verified');
  });

  it('propagates AppError from verifyOtp', async () => {
    const { AppError } = await import('../shared/middleware/errorHandler.js');
    mockVerifyOtp.mock.mockImplementation(async () => {
      throw new AppError('INVALID_CODE', 'Invalid verification code', 400);
    });
    const res = makeRes();
    await assert.rejects(
      () => verifyEmail(makeReq({ userId: 'u1', body: { code: '000000' } }), res),
      (error) => assertErrorCode(error, 'INVALID_CODE'),
    );
  });
});

describe('resendVerification', () => {
  beforeEach(() => {
    mockGetUserById.mock.resetCalls();
    mockSendVerificationOtp.mock.resetCalls();
  });

  it('calls getUserById and sendVerificationOtp with userId from header', async () => {
    const user = { id: 'u1', email: 'user@test.com' };
    mockGetUserById.mock.mockImplementation(async () => user);
    mockSendVerificationOtp.mock.mockImplementation(async () => {});
    const res = makeRes();
    await resendVerification(makeReq({ userId: 'u1' }), res);
    assert.equal(mockGetUserById.mock.calls[0]!.arguments[0], 'u1');
    assert.equal(mockSendVerificationOtp.mock.calls[0]!.arguments[0], 'u1');
    assert.equal(mockSendVerificationOtp.mock.calls[0]!.arguments[1], 'user@test.com');
  });

  it('returns 200 { message: "Verification email sent" } on success', async () => {
    const user = { id: 'u1', email: 'user@test.com' };
    mockGetUserById.mock.mockImplementation(async () => user);
    mockSendVerificationOtp.mock.mockImplementation(async () => {});
    const res = makeRes();
    await resendVerification(makeReq({ userId: 'u1' }), res);
    assert.equal(res.statusCode, 200);
    assert.equal((res._json as { message: string }).message, 'Verification email sent');
  });

  it('propagates AppError from getUserById', async () => {
    const { AppError } = await import('../shared/middleware/errorHandler.js');
    mockGetUserById.mock.mockImplementation(async () => {
      throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    });
    const res = makeRes();
    await assert.rejects(
      () => resendVerification(makeReq({ headers: { 'x-user-id': 'nonexistent' } }), res),
      (error) => assertErrorCode(error, 'USER_NOT_FOUND'),
    );
  });
});
