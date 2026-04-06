import { Router } from 'express';
import type { Request, Response } from 'express';
import { isBlockedBy } from './blocks.service.js';

export const internalRouter = Router();

/**
 * Check if either of two users has blocked the other.
 * Internal-only endpoint — requires internalAuth only (no user token).
 */
internalRouter.post('/blocks/bidirectional-check', async (req: Request, res: Response) => {
  const { userId, otherUserId } = req.body as { userId?: string; otherUserId?: string };
  if (typeof userId !== 'string' || typeof otherUserId !== 'string') {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'userId and otherUserId are required', status: 400 } });
    return;
  }

  const [aBlockedB, bBlockedA] = await Promise.all([
    isBlockedBy(otherUserId, userId),
    isBlockedBy(userId, otherUserId),
  ]);

  res.json({ blocked: aBlockedB || bBlockedA });
});
