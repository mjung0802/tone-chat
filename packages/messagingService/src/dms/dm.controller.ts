import type { Request, Response } from 'express';
import { DirectConversation } from './conversation.model.js';
import { DirectMessage } from './directMessage.model.js';
import { AppError } from '../shared/middleware/errorHandler.js';
import { config } from '../config/index.js';

export async function getOrCreateConversation(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const otherUserId = req.params['otherUserId'] as string;

  if (otherUserId === userId) {
    res.status(400).json({ error: { code: 'INVALID_USER_ID', message: 'Cannot start a conversation with yourself', status: 400 } });
    return;
  }

  // Sort alphabetically for consistent unique key
  const sorted = [userId, otherUserId].sort() as [string, string];

  const conversation = await DirectConversation.findOneAndUpdate(
    { participantIds: sorted },
    { $setOnInsert: { participantIds: sorted } },
    { upsert: true, new: true },
  );

  res.status(200).json({ conversation });
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  // requireConversationParticipant middleware sets req.conversation
  res.json({ conversation: req.conversation });
}

export async function listConversations(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;

  const conversations = await DirectConversation.find({ participantIds: userId }).sort({
    lastMessageAt: -1,
  });

  const conversationIds = conversations.filter((c) => c.lastMessageAt).map((c) => c._id);

  const lastMessages = conversationIds.length > 0
    ? await DirectMessage.aggregate<{ _id: string; lastMessage: Record<string, unknown> }>([
      { $match: { conversationId: { $in: conversationIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$conversationId', lastMessage: { $first: '$$ROOT' } } },
    ])
    : [];

  const lastMessageMap = new Map(lastMessages.map((doc) => [String(doc._id), doc.lastMessage]));

  const conversationsWithPreview = conversations.map((conv) => {
    const obj = conv.toObject();
    return { ...obj, lastMessage: lastMessageMap.get(String(conv._id)) ?? null };
  });

  res.json({ conversations: conversationsWithPreview });
}

export async function listDmMessages(req: Request, res: Response): Promise<void> {
  const { conversationId } = req.params;
  const limit = Math.min(Number(req.query['limit'] ?? 50), 100);
  const before = req.query['before'];

  // NoSQL injection guard on before
  if (before !== undefined && typeof before !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_CURSOR', message: 'before must be a string', status: 400 } });
    return;
  }

  const filter: Record<string, unknown> = { conversationId };
  if (before) {
    filter['_id'] = { $lt: before };
  }

  const messages = await DirectMessage.find(filter).sort({ createdAt: -1 }).limit(limit);

  res.json({ messages: messages.reverse() });
}

export async function sendDmMessage(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { conversationId } = req.params;
  const conversation = req.conversation!;

  const { content, attachmentIds, replyToId, mentions: rawMentions, tone: rawTone, serverInvite: rawServerInvite } = req.body as {
    content?: unknown;
    attachmentIds?: unknown;
    replyToId?: unknown;
    mentions?: unknown;
    tone?: unknown;
    serverInvite?: unknown;
  };

  // Validate content / attachments — one required
  const hasContent = typeof content === 'string' && content.length > 0;
  const hasAttachments = Array.isArray(attachmentIds) && attachmentIds.length > 0;

  // Validate serverInvite if provided
  let serverInvite: { code: string; serverId: string; serverName: string } | undefined;
  if (rawServerInvite !== undefined && rawServerInvite !== null) {
    if (
      typeof rawServerInvite !== 'object' ||
      typeof (rawServerInvite as Record<string, unknown>)['code'] !== 'string' ||
      ((rawServerInvite as Record<string, unknown>)['code'] as string).length === 0 ||
      typeof (rawServerInvite as Record<string, unknown>)['serverId'] !== 'string' ||
      ((rawServerInvite as Record<string, unknown>)['serverId'] as string).length === 0 ||
      typeof (rawServerInvite as Record<string, unknown>)['serverName'] !== 'string' ||
      ((rawServerInvite as Record<string, unknown>)['serverName'] as string).length === 0 ||
      ((rawServerInvite as Record<string, unknown>)['serverName'] as string).length > 100
    ) {
      res.status(400).json({ error: { code: 'INVALID_SERVER_INVITE', message: 'serverInvite must have string fields: code, serverId, serverName', status: 400 } });
      return;
    }
    serverInvite = rawServerInvite as { code: string; serverId: string; serverName: string };
  }

  const hasServerInvite = serverInvite !== undefined;
  if (!hasContent && !hasAttachments && !hasServerInvite) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'content, attachments, or serverInvite required', status: 400 } });
    return;
  }

  // NoSQL injection guard on replyToId
  if (replyToId !== undefined && typeof replyToId !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_REPLY_TO', message: 'replyToId must be a string', status: 400 } });
    return;
  }

  // Validate mentions (max 2 — only 2 participants in a 1:1 DM)
  let mentions: string[] = [];
  if (rawMentions !== undefined) {
    if (
      !Array.isArray(rawMentions) ||
      rawMentions.length > 2 ||
      !rawMentions.every((m: unknown) => typeof m === 'string' && m.length <= 36)
    ) {
      res.status(400).json({ error: { code: 'INVALID_MENTIONS', message: 'mentions must be an array of up to 2 strings (max 36 chars each)', status: 400 } });
      return;
    }

    // Validate each mention is a participant and not the sender
    for (const mention of rawMentions as string[]) {
      if (mention === userId) {
        res.status(400).json({ error: { code: 'INVALID_MENTIONS', message: 'Cannot mention yourself', status: 400 } });
        return;
      }
      if (!conversation.participantIds.includes(mention)) {
        res.status(400).json({ error: { code: 'INVALID_MENTIONS', message: 'Can only mention conversation participants', status: 400 } });
        return;
      }
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
  let replyTo:
    | { messageId: string; authorId: string; authorName: string; content: string }
    | undefined;

  if (replyToId) {
    const original = await DirectMessage.findOne({ _id: replyToId, conversationId });
    if (!original) {
      res.status(404).json({ error: { code: 'REPLY_TARGET_NOT_FOUND', message: 'Reply target message not found', status: 404 } });
      return;
    }

    // Resolve authorName via usersService, fall back to authorId on failure
    let authorName = original.authorId;
    try {
      const resp = await fetch(`${config.usersServiceUrl}/users/${original.authorId}`, {
        headers: { 'x-internal-key': config.internalApiKey },
      });
      if (resp.ok) {
        const data = (await resp.json()) as { user?: { display_name?: string | null; username?: string } };
        if (data.user?.display_name) {
          authorName = data.user.display_name;
        } else if (data.user?.username) {
          authorName = data.user.username;
        }
      }
    } catch {
      // Fall back to authorId as authorName
    }

    replyTo = {
      messageId: String(original._id),
      authorId: original.authorId,
      authorName,
      content: (original.content ?? '').slice(0, 100),
    };

    // Auto-add original author to mentions (dedup)
    if (!mentions.includes(original.authorId)) {
      mentions = [...mentions, original.authorId];
    }
  }

  const message = await DirectMessage.create({
    conversationId,
    authorId: userId,
    content: hasContent ? (content as string) : null,
    attachmentIds: Array.isArray(attachmentIds) ? attachmentIds : [],
    mentions,
    ...(replyTo ? { replyTo } : {}),
    ...(tone ? { tone } : {}),
    ...(serverInvite != null ? { serverInvite } : {}),
  });

  // Update lastMessageAt on conversation
  await DirectConversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() });

  res.status(201).json({ message });
}

export async function editDmMessage(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { conversationId, messageId } = req.params;

  const message = await DirectMessage.findOne({ _id: messageId, conversationId });
  if (!message) {
    throw new AppError('MESSAGE_NOT_FOUND', 'Message not found', 404);
  }
  if (message.authorId !== userId) {
    throw new AppError('FORBIDDEN', 'You can only edit your own messages', 403);
  }

  const { content } = req.body as { content?: unknown };
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'content is required', status: 400 } });
    return;
  }

  message.content = content;
  message.editedAt = new Date();
  await message.save();

  res.json({ message });
}

export async function toggleDmReaction(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { conversationId, messageId } = req.params;

  const { emoji } = req.body as { emoji?: unknown };

  if (!emoji || typeof emoji !== 'string' || emoji.trim().length === 0 || emoji.length > 10) {
    res.status(400).json({ error: { code: 'INVALID_EMOJI', message: 'emoji must be a non-empty string (max 10 chars)', status: 400 } });
    return;
  }

  const message = await DirectMessage.findOne({ _id: messageId, conversationId });
  if (!message) {
    throw new AppError('MESSAGE_NOT_FOUND', 'Message not found', 404);
  }

  const existingReaction = message.reactions.find((r) => r.emoji === emoji);

  if (existingReaction) {
    const userIndex = existingReaction.userIds.indexOf(userId);
    if (userIndex !== -1) {
      // User already reacted — toggle off
      existingReaction.userIds.splice(userIndex, 1);
      if (existingReaction.userIds.length === 0) {
        message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      // Add user to existing reaction
      existingReaction.userIds.push(userId);
    }
  } else {
    // New emoji reaction
    message.reactions.push({ emoji, userIds: [userId] });
  }

  await message.save();

  res.json({ message });
}
