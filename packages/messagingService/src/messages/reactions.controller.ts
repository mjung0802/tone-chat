import type { Request, Response } from 'express';
import { Message } from './message.model.js';
import { AppError } from '../shared/middleware/errorHandler.js';

export async function toggleReaction(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { channelId, messageId } = req.params;
  const { emoji } = req.body as { emoji?: string };

  if (!emoji || typeof emoji !== 'string') {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'emoji is required', status: 400 } });
    return;
  }

  if (emoji.trim().length === 0 || emoji.length > 32) {
    res.status(400).json({ error: { code: 'INVALID_EMOJI', message: 'Invalid emoji', status: 400 } });
    return;
  }

  const message = await Message.findOne({ _id: messageId, channelId });
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
    if (message.reactions.length >= 10) {
      res.status(400).json({ error: { code: 'MAX_REACTIONS', message: 'Maximum 10 unique reactions per message', status: 400 } });
      return;
    }
    message.reactions.push({ emoji, userIds: [userId] });
  }

  await message.save();

  res.json({ message });
}
