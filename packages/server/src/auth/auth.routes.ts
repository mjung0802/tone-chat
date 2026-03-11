import { Router } from 'express';
import { registerUser, loginUser, refreshToken, verifyEmail, resendVerification } from './auth.client.js';
import { authRateLimiters } from './auth.rateLimit.js';
import { requireAuth } from '../shared/middleware/auth.js';
import type { AuthRequest } from '../shared/middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiters.register, async (req, res) => {
  const result = await registerUser(req.body as { username: string; email: string; password: string });
  res.status(result.status).json(result.data);
});

authRouter.post('/login', authRateLimiters.login, async (req, res) => {
  const result = await loginUser(req.body as { email: string; password: string });
  res.status(result.status).json(result.data);
});

authRouter.post('/refresh', authRateLimiters.refresh, async (req, res) => {
  const result = await refreshToken(req.body as { refreshToken: string });
  res.status(result.status).json(result.data);
});

authRouter.post('/verify-email', authRateLimiters.verifyEmail, requireAuth, async (req: AuthRequest, res) => {
  const result = await verifyEmail(req.body as { code: string }, req.userId as string);
  res.status(result.status).json(result.data);
});

authRouter.post('/resend-verification', authRateLimiters.resendVerification, requireAuth, async (req: AuthRequest, res) => {
  const result = await resendVerification(req.userId as string);
  res.status(result.status).json(result.data);
});
