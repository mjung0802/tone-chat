import type { Request, Response, NextFunction } from 'express';
import { DirectConversation } from './conversation.model.js';

export async function requireConversationParticipant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing user identity', status: 401 } });
    return;
  }

  const conversationId = req.params['conversationId'] as string;
  if (!conversationId) {
    res.status(400).json({ error: { code: 'MISSING_CONVERSATION_ID', message: 'conversationId is required', status: 400 } });
    return;
  }

  const conversation = await DirectConversation.findById(conversationId);
  if (!conversation) {
    res.status(404).json({ error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found', status: 404 } });
    return;
  }

  if (!conversation.participantIds.includes(userId)) {
    res.status(403).json({ error: { code: 'NOT_A_PARTICIPANT', message: 'You are not a participant in this conversation', status: 403 } });
    return;
  }

  req.conversation = conversation;
  next();
}
