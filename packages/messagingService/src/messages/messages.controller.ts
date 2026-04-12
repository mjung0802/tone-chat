import type { Request, Response } from 'express';
import { Message } from './message.model.js';
import { ServerMember } from '../members/serverMember.model.js';
import { AppError } from '../shared/middleware/errorHandler.js';
import { parseQueryLimit } from '../shared/parseQueryLimit.js';

export async function createMessage(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { serverId, channelId } = req.params;

  if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Request body must be a JSON object', status: 400 } });
    return;
  }

  const { content, attachmentIds, replyToId, mentions: rawMentions, tone: rawTone } = req.body as {
    content: string;
    attachmentIds?: string[];
    replyToId?: unknown;
    mentions?: unknown;
    tone?: unknown;
  };

  // Check if user is muted
  const senderMember = await ServerMember.findOne({ serverId, userId });
  if (senderMember?.mutedUntil && senderMember.mutedUntil > new Date()) {
    res.status(403).json({ error: { code: 'MUTED', message: 'You are muted in this server', status: 403, mutedUntil: senderMember.mutedUntil.toISOString() } });
    return;
  }

  if (!content && (!attachmentIds || attachmentIds.length === 0)) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'content or attachments required', status: 400 } });
    return;
  }

  // Validate replyToId type (NoSQL injection guard)
  if (replyToId !== undefined && typeof replyToId !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_REPLY_TO', message: 'replyToId must be a string', status: 400 } });
    return;
  }

  // Validate mentions
  let mentions: string[] = [];
  if (rawMentions !== undefined) {
    if (
      !Array.isArray(rawMentions) ||
      rawMentions.length > 20 ||
      !rawMentions.every((m: unknown) => typeof m === 'string' && m.length <= 36)
    ) {
      res.status(400).json({ error: { code: 'INVALID_MENTIONS', message: 'mentions must be an array of up to 20 strings (max 36 chars each)', status: 400 } });
      return;
    }
    mentions = rawMentions as string[];
  }

  // Validate tone
  let tone: string | undefined;
  if (rawTone !== undefined) {
    if (typeof rawTone !== 'string' || rawTone.length === 0 || rawTone.length > 50) {
      res.status(400).json({ error: { code: 'INVALID_TONE', message: 'tone must be a string (1-50 chars)', status: 400 } });
      return;
    }
    tone = rawTone;
  }

  // Process replyTo
  let replyTo: { messageId: string; authorId: string; authorName: string; content: string } | undefined;
  if (replyToId && typeof replyToId === 'string') {
    const original = await Message.findOne({ _id: replyToId, channelId, serverId });
    if (!original) {
      res.status(404).json({ error: { code: 'REPLY_TARGET_NOT_FOUND', message: 'Reply target message not found', status: 404 } });
      return;
    }

    // Resolve author name: nickname > userId fallback
    let authorName = original.authorId;
    const member = await ServerMember.findOne({ serverId, userId: original.authorId });
    if (member) {
      authorName = member.nickname ?? original.authorId;
    }

    replyTo = {
      messageId: String(original._id),
      authorId: original.authorId,
      authorName,
      content: original.content.slice(0, 100),
    };

    // Auto-add original author to mentions (dedup)
    if (!mentions.includes(original.authorId)) {
      mentions = [...mentions, original.authorId];
    }
  }

  const message = await Message.create({
    channelId,
    serverId,
    authorId: userId,
    content,
    attachmentIds: attachmentIds ?? [],
    mentions,
    ...(replyTo ? { replyTo } : {}),
    ...(tone ? { tone } : {}),
  });

  res.status(201).json({ message });
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  const { channelId } = req.params;
  const limit = parseQueryLimit(req.query['limit']);
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
  const userId = req.userId!;
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

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const message = await Message.findOne({ _id: req.params['messageId'], channelId: req.params['channelId'] });

  if (!message) {
    throw new AppError('MESSAGE_NOT_FOUND', 'Message not found', 404);
  }
  if (message.authorId !== userId) {
    throw new AppError('FORBIDDEN', 'You can only delete your own messages', 403);
  }

  await message.deleteOne();

  res.status(204).end();
}
