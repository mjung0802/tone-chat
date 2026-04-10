import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import rateLimit from 'express-rate-limit';
import * as dmsClient from './dms.client.js';
import { isBlockedBidirectional } from '../users/users.client.js';
import { broadcastDmAndNotify } from './dms.broadcast.js';

export const dmsRouter = Router();

// Store io reference for DM socket events (mirrors messages.routes.ts pattern)
let ioRef: import('socket.io').Server | null = null;
export function setDmIO(io: import('socket.io').Server | null): void {
  ioRef = io;
}

// Tightest rate limit on conversation creation (prevents flooding)
const createConversationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many conversation requests. Try again later.', status: 429 } },
});

// POST /dms/:otherUserId — get-or-create conversation
dmsRouter.post('/:otherUserId', createConversationLimiter, async (req: AuthRequest, res) => {
  const otherUserId = req.params['otherUserId'] as string;

  if (otherUserId === req.userId!) {
    res.status(400).json({ error: { code: 'CANNOT_DM_SELF', message: 'You cannot DM yourself', status: 400 } });
    return;
  }

  const blocked = await isBlockedBidirectional(req.token!, otherUserId, req.userId!);
  if (blocked) {
    res.status(403).json({ error: { code: 'BLOCKED', message: 'Cannot start conversation due to a block', status: 403 } });
    return;
  }

  const result = await dmsClient.getOrCreateConversation(req.token!, otherUserId);
  res.status(result.status).json(result.data);
});

// GET /dms — list user's conversations
dmsRouter.get('/', async (req: AuthRequest, res) => {
  const result = await dmsClient.listConversations(req.token!);
  res.status(result.status).json(result.data);
});

// GET /dms/:conversationId
dmsRouter.get('/:conversationId', async (req: AuthRequest, res) => {
  const result = await dmsClient.getConversation(req.token!, req.params['conversationId'] as string);
  res.status(result.status).json(result.data);
});

// GET /dms/:conversationId/messages
dmsRouter.get('/:conversationId/messages', async (req: AuthRequest, res) => {
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  const result = await dmsClient.listDmMessages(req.token!, req.params['conversationId'] as string, queryString);
  res.status(result.status).json(result.data);
});

// POST /dms/:conversationId/messages — with bidirectional block check
dmsRouter.post('/:conversationId/messages', async (req: AuthRequest, res) => {
  const conversationId = req.params['conversationId'] as string;

  const convResult = await dmsClient.getConversation(req.token!, conversationId);
  if (convResult.status !== 200) {
    res.status(convResult.status).json(convResult.data);
    return;
  }

  const conversation = (convResult.data as { conversation?: { participantIds?: string[] } }).conversation;
  const otherUserId = conversation?.participantIds?.find((id) => id !== req.userId!);
  if (otherUserId) {
    const blocked = await isBlockedBidirectional(req.token!, otherUserId, req.userId!);
    if (blocked) {
      res.status(403).json({ error: { code: 'BLOCKED', message: 'Cannot send message due to a block', status: 403 } });
      return;
    }
  }

  const result = await dmsClient.sendDmMessage(req.token!, conversationId, req.body as Record<string, unknown>);

  if (result.status === 201 && ioRef && otherUserId) {
    const body = req.body as { content?: string };
    void broadcastDmAndNotify(ioRef, conversationId, req.userId!, otherUserId, result.data, body.content);
  }

  res.status(result.status).json(result.data);
});

// PATCH /dms/:conversationId/messages/:messageId
dmsRouter.patch('/:conversationId/messages/:messageId', async (req: AuthRequest, res) => {
  const result = await dmsClient.editDmMessage(
    req.token!,
    req.params['conversationId'] as string,
    req.params['messageId'] as string,
    req.body as Record<string, unknown>,
  );
  res.status(result.status).json(result.data);
});

// PUT /dms/:conversationId/messages/:messageId/reactions
dmsRouter.put('/:conversationId/messages/:messageId/reactions', async (req: AuthRequest, res) => {
  const result = await dmsClient.reactToDmMessage(
    req.token!,
    req.params['conversationId'] as string,
    req.params['messageId'] as string,
    req.body as Record<string, unknown>,
  );
  res.status(result.status).json(result.data);
});
