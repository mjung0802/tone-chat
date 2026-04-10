import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './channels.client.js';
import { mutationLimiters } from '../shared/rateLimiters.js';

export const channelsRouter = Router({ mergeParams: true });

channelsRouter.post('/', mutationLimiters.serverWrite, async (req: AuthRequest, res) => {
  const result = await client.createChannel(req.token!, req.params['serverId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

channelsRouter.get('/', async (req: AuthRequest, res) => {
  const result = await client.listChannels(req.token!, req.params['serverId'] as string);
  res.status(result.status).json(result.data);
});

channelsRouter.get('/:channelId', async (req: AuthRequest, res) => {
  const result = await client.getChannel(req.token!, req.params['serverId'] as string, req.params['channelId'] as string);
  res.status(result.status).json(result.data);
});

channelsRouter.patch('/:channelId', mutationLimiters.serverWrite, async (req: AuthRequest, res) => {
  const result = await client.updateChannel(req.token!, req.params['serverId'] as string, req.params['channelId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

channelsRouter.delete('/:channelId', mutationLimiters.serverWrite, async (req: AuthRequest, res) => {
  const result = await client.deleteChannel(req.token!, req.params['serverId'] as string, req.params['channelId'] as string);
  res.status(result.status).end();
});
