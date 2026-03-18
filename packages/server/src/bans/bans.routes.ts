import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './bans.client.js';

export const bansRouter = Router({ mergeParams: true });

bansRouter.get('/', async (req: AuthRequest, res) => {
  const result = await client.listBans(req.userId!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

bansRouter.delete('/:userId', async (req: AuthRequest, res) => {
  const result = await client.unbanUser(req.userId!, req.params['serverId'] as string, req.params['userId'] as string);
  res.status(result.status).end();
});
