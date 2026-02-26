import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './channels.client.js';

export const channelsRouter = Router({ mergeParams: true });

channelsRouter.post('/', async (req: AuthRequest, res) => {
  const result = await client.createChannel(req.userId!, req.params['serverId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

channelsRouter.get('/', async (req: AuthRequest, res) => {
  const result = await client.listChannels(req.userId!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

channelsRouter.get('/:channelId', async (req: AuthRequest, res) => {
  const result = await client.getChannel(req.userId!, req.params['serverId'] as string, req.params['channelId'] as string);
  res.status(result.status).json(result.data);
});

channelsRouter.patch('/:channelId', async (req: AuthRequest, res) => {
  const result = await client.updateChannel(req.userId!, req.params['serverId'] as string, req.params['channelId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

channelsRouter.delete('/:channelId', async (req: AuthRequest, res) => {
  const result = await client.deleteChannel(req.userId!, req.params['serverId'] as string, req.params['channelId'] as string);
  res.status(result.status).end();
});
