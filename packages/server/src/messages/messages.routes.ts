import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './messages.client.js';
import { emitMentionsFromResult } from './mentions.helper.js';

export const messagesRouter = Router({ mergeParams: true });

// Store io reference for mention events
let ioRef: import('socket.io').Server | null = null;
export function setIO(io: import('socket.io').Server): void {
  ioRef = io;
}

messagesRouter.post('/', async (req: AuthRequest, res) => {
  const result = await client.createMessage(req.userId!, req.params['serverId'] as string, req.params['channelId'] as string, req.body as Record<string, unknown>);

  if (result.status === 201 && ioRef) {
    const room = `server:${req.params['serverId'] as string}:channel:${req.params['channelId'] as string}`;
    ioRef.to(room).emit('new_message', result.data);

    await emitMentionsFromResult(ioRef, req.userId!, req.params['serverId'] as string, req.params['channelId'] as string, result.data);
  }

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

messagesRouter.put('/:messageId/reactions', async (req: AuthRequest, res) => {
  const result = await client.toggleReaction(req.userId!, req.params['serverId'] as string, req.params['channelId'] as string, req.params['messageId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});
