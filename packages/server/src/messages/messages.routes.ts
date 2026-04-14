import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './messages.client.js';
import { emitMentionsFromResult } from './mentions.helper.js';
import { mutationLimiters } from '../shared/rateLimiters.js';
import { validateBody, createMessageSchema, editMessageSchema, reactionSchema } from '../shared/validate.js';

export const messagesRouter = Router({ mergeParams: true });

// Store io reference for mention events
let ioRef: import('socket.io').Server | null = null;
export function setIO(io: import('socket.io').Server): void {
  ioRef = io;
}

messagesRouter.post('/', mutationLimiters.message, validateBody(createMessageSchema), async (req: AuthRequest, res) => {
  const result = await client.createMessage(req.token!, req.params['serverId'] as string, req.params['channelId'] as string, req.body as Record<string, unknown>);

  if (result.status === 201 && ioRef) {
    const room = `server:${req.params['serverId'] as string}:channel:${req.params['channelId'] as string}`;
    ioRef.to(room).emit('new_message', result.data);
    emitMentionsFromResult(ioRef, req.userId!, req.params['serverId'] as string, req.params['channelId'] as string, result.data);
  }

  res.status(result.status).json(result.data);
});

messagesRouter.get('/', async (req: AuthRequest, res) => {
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  const result = await client.listMessages(req.token!, req.params['serverId'] as string, req.params['channelId'] as string, queryString);
  res.status(result.status).json(result.data);
});

messagesRouter.patch('/:messageId', mutationLimiters.message, validateBody(editMessageSchema), async (req: AuthRequest, res) => {
  const result = await client.updateMessage(req.token!, req.params['serverId'] as string, req.params['channelId'] as string, req.params['messageId'] as string, req.body as Record<string, unknown>);

  if (result.status === 200 && ioRef) {
    const room = `server:${req.params['serverId'] as string}:channel:${req.params['channelId'] as string}`;
    ioRef.to(room).emit('message_edited', result.data);
  }

  res.status(result.status).json(result.data);
});

messagesRouter.delete('/:messageId', mutationLimiters.message, async (req: AuthRequest, res) => {
  const result = await client.deleteMessage(req.token!, req.params['serverId'] as string, req.params['channelId'] as string, req.params['messageId'] as string);

  if (result.status === 204 && ioRef) {
    const room = `server:${req.params['serverId'] as string}:channel:${req.params['channelId'] as string}`;
    ioRef.to(room).emit('message_deleted', {
      messageId: req.params['messageId'] as string,
      channelId: req.params['channelId'] as string,
      serverId: req.params['serverId'] as string,
    });
  }

  res.status(result.status).end();
});

messagesRouter.put('/:messageId/reactions', mutationLimiters.message, validateBody(reactionSchema), async (req: AuthRequest, res) => {
  const result = await client.toggleReaction(req.token!, req.params['serverId'] as string, req.params['channelId'] as string, req.params['messageId'] as string, req.body as Record<string, unknown>);
  res.status(result.status).json(result.data);
});
