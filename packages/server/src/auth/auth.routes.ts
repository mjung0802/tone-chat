import { Router } from 'express';
import { registerUser, loginUser, refreshToken, logoutUser, verifyEmail, resendVerification } from './auth.client.js';
import { authRateLimiters } from './auth.rateLimit.js';
import { requireAuth } from '../shared/middleware/auth.js';
import type { AuthRequest } from '../shared/middleware/auth.js';

export const authRouter = Router();

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/v1/auth',
};

function setRefreshCookie(res: import('express').Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, COOKIE_OPTS);
}

function clearRefreshCookie(res: import('express').Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_OPTS.path });
}

authRouter.post('/register', authRateLimiters.register, async (req, res) => {
  const result = await registerUser(req.body as { username: string; email: string; password: string });
  if (result.status === 201 && result.data != null) {
    const data = result.data as Record<string, unknown>;
    if (typeof data['refreshToken'] === 'string') {
      setRefreshCookie(res, data['refreshToken']);
      const { refreshToken: _rt, ...safeData } = data;
      void _rt;
      return res.status(result.status).json(safeData);
    }
  }
  res.status(result.status).json(result.data);
});

authRouter.post('/login', authRateLimiters.login, async (req, res) => {
  const result = await loginUser(req.body as { email: string; password: string });
  if (result.status === 200 && result.data != null) {
    const data = result.data as Record<string, unknown>;
    if (typeof data['refreshToken'] === 'string') {
      setRefreshCookie(res, data['refreshToken']);
      const { refreshToken: _rt, ...safeData } = data;
      void _rt;
      return res.status(result.status).json(safeData);
    }
  }
  res.status(result.status).json(result.data);
});

authRouter.post('/refresh', authRateLimiters.refresh, async (req, res) => {
  // Cookie takes precedence over body (native clients still send body)
  const cookieToken = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  const bodyToken = (req.body as { refreshToken?: string }).refreshToken;
  const tokenToUse = cookieToken ?? bodyToken;
  if (!tokenToUse) {
    return res.status(401).json({ error: { code: 'MISSING_REFRESH_TOKEN', message: 'No refresh token provided', status: 401 } });
  }
  const result = await refreshToken({ refreshToken: tokenToUse });
  if (result.status === 200 && result.data != null) {
    const data = result.data as Record<string, unknown>;
    if (typeof data['refreshToken'] === 'string') {
      setRefreshCookie(res, data['refreshToken']);
      const { refreshToken: _rt, ...safeData } = data;
      void _rt;
      return res.status(result.status).json(safeData);
    }
  }
  if (result.status !== 200) {
    clearRefreshCookie(res);
  }
  res.status(result.status).json(result.data);
});

authRouter.post('/logout', async (req, res) => {
  const cookieToken = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  const bodyToken = (req.body as { refreshToken?: string }).refreshToken;
  const tokenToUse = cookieToken ?? bodyToken ?? '';
  clearRefreshCookie(res);
  const result = await logoutUser({ refreshToken: tokenToUse });
  res.status(result.status).json(result.data);
});

authRouter.post('/verify-email', authRateLimiters.verifyEmail, requireAuth, authRateLimiters.verifyEmailPerUser, async (req: AuthRequest, res) => {
  const result = await verifyEmail(req.body as { code: string }, req.token!);
  res.status(result.status).json(result.data);
});

authRouter.post('/resend-verification', authRateLimiters.resendVerification, requireAuth, async (req: AuthRequest, res) => {
  const result = await resendVerification(req.token!);
  res.status(result.status).json(result.data);
});
