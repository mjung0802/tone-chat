import { Router } from 'express';
import { registerUser, loginUser, refreshToken } from './auth.client.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const result = await registerUser(req.body as { username: string; email: string; password: string });
  res.status(result.status).json(result.data);
});

authRouter.post('/login', async (req, res) => {
  const result = await loginUser(req.body as { email: string; password: string });
  res.status(result.status).json(result.data);
});

authRouter.post('/refresh', async (req, res) => {
  const result = await refreshToken(req.body as { refreshToken: string });
  res.status(result.status).json(result.data);
});
