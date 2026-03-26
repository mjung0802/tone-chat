import type { Request, Response } from 'express';
import { blockUser, unblockUser, getBlockedIds } from './blocks.service.js';
import { getUserById } from './users.service.js';

export async function postBlock(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const targetId = req.params['userId'] as string;
  if (targetId === userId) {
    res.status(400).json({ error: { code: 'INVALID_TARGET', message: 'Cannot block yourself', status: 400 } });
    return;
  }

  await getUserById(targetId);
  await blockUser(userId, targetId);
  res.status(204).end();
}

export async function deleteBlock(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const targetId = req.params['userId'] as string;
  await unblockUser(userId, targetId);
  res.status(204).end();
}

export async function listBlocks(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const blockedIds = await getBlockedIds(userId);
  res.json({ blockedIds });
}
