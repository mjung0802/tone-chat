import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './messages.client.js';

export const messagesRouter = Router({ mergeParams: true });

messagesRouter.post('/', async (req: AuthRequest, res) => {
  const result = await client.createMessage(req.userId!, req.params['serverId'] as string, req.params['channelId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});

messagesRouter.get('/', async (req: AuthRequest, res) => {
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  const result = await client.listMessages(req.userId!, req.params['serverId'] as string, req.params['channelId'] as string, queryString);
  res.status(result.status).json(result.data);
});

messagesRouter.patch('/:messageId', async (req: AuthRequest, res) => {
  const result = await client.updateMessage(req.userId!, req.params['serverId'] as string, req.params['channelId'] as string, req.params['messageId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});
