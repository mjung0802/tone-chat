import type { Request, Response } from 'express';
import { Message } from './message.model.js';
import { AppError } from '../shared/middleware/errorHandler.js';

export async function createMessage(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { serverId, channelId } = req.params;
  const { content, attachmentIds } = req.body as { content: string; attachmentIds?: string[] };

  if (!content) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'content is required', status: 400 } });
    return;
  }

  const message = await Message.create({
    channelId,
    serverId,
    authorId: userId,
    content,
    attachmentIds: attachmentIds ?? [],
  });

  res.status(201).json({ message });
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  const { channelId } = req.params;
  const limit = Math.min(Number(req.query['limit'] ?? 50), 100);
  const before = req.query['before'] as string | undefined;

  const filter: Record<string, unknown> = { channelId };
  if (before && typeof before === 'string') {
    filter['_id'] = { $lt: before };
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json({ messages: messages.reverse() });
}

export async function updateMessage(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const message = await Message.findOne({ _id: req.params['messageId'], channelId: req.params['channelId'] });

  if (!message) {
    throw new AppError('MESSAGE_NOT_FOUND', 'Message not found', 404);
  }
  if (message.authorId !== userId) {
    throw new AppError('FORBIDDEN', 'You can only edit your own messages', 403);
  }

  const { content } = req.body as { content: string };
  message.content = content;
  message.editedAt = new Date();
  await message.save();

  res.json({ message });
}
