import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './servers.client.js';

export const serversRouter = Router();

serversRouter.post('/', async (req: AuthRequest, res) => {
  const result = await client.createServer(req.userId!, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

serversRouter.get('/', async (req: AuthRequest, res) => {
  const result = await client.listServers(req.userId!);
  res.status(result.status).json(result.data);
});

serversRouter.get('/:serverId', async (req: AuthRequest, res) => {
  const result = await client.getServer(req.userId!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

serversRouter.patch('/:serverId', async (req: AuthRequest, res) => {
  const result = await client.updateServer(req.userId!, req.params['serverId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

serversRouter.delete('/:serverId', async (req: AuthRequest, res) => {
  const result = await client.deleteServer(req.userId!, req.params['serverId'] as string);
  res.status(result.status).end();
});
