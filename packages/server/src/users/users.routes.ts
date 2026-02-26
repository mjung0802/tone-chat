import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import { getMe, patchMe, getUser } from './users.client.js';

export const usersRouter = Router();

usersRouter.get('/me', async (req: AuthRequest, res) => {
  const result = await getMe(req.userId!);
  res.status(result.status).json(result.data);
});

usersRouter.patch('/me', async (req: AuthRequest, res) => {
  const result = await patchMe(req.userId!, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

usersRouter.get('/:id', async (req: AuthRequest, res) => {
  const result = await getUser(req.userId!, req.params['id'] as string);
  res.status(result.status).json(result.data);
});
