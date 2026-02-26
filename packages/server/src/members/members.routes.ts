import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './members.client.js';

export const membersRouter = Router({ mergeParams: true });

membersRouter.post('/', async (req: AuthRequest, res) => {
  const result = await client.joinServer(req.userId!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

membersRouter.get('/', async (req: AuthRequest, res) => {
  const result = await client.listMembers(req.userId!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

membersRouter.get('/:userId', async (req: AuthRequest, res) => {
  const result = await client.getMember(req.userId!, req.params['serverId'] as string, req.params['userId'] as string);
  res.status(result.status).json(result.data);
});

membersRouter.patch('/:userId', async (req: AuthRequest, res) => {
  const result = await client.updateMember(req.userId!, req.params['serverId'] as string, req.params['userId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

membersRouter.delete('/:userId', async (req: AuthRequest, res) => {
  const result = await client.removeMember(req.userId!, req.params['serverId'] as string, req.params['userId'] as string);
  res.status(result.status).end();
});
