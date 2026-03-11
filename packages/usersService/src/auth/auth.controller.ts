import type { Request, Response } from 'express';
import { registerUser, loginUser, refreshAccessToken } from './auth.service.js';
import { sendVerificationOtp, verifyOtp } from './verification.service.js';
import { getUserById } from '../users/users.service.js';

export async function register(req: Request, res: Response): Promise<void> {
  const { username, email, password } = req.body as { username: string; email: string; password: string };

  if (!username || !email || !password) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'username, email, and password are required', status: 400 } });
    return;
  }

  const result = await registerUser(username, email, password);
  res.status(201).json({
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'email and password are required', status: 400 } });
    return;
  }

  const result = await loginUser(email, password);
  res.json({
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };

  if (!refreshToken) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'refreshToken is required', status: 400 } });
    return;
  }

  const result = await refreshAccessToken(refreshToken);
  res.json({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { code } = req.body as { code: string };

  if (!code) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'code is required', status: 400 } });
    return;
  }

  await verifyOtp(userId, code);
  res.json({ message: 'Email verified' });
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;

  const user = await getUserById(userId);
  await sendVerificationOtp(userId, user.email);
  res.json({ message: 'Verification email sent' });
}
