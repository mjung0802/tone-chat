import type { Request, Response } from 'express';
import { getUserById } from './users.service.js';
import {
  sendFriendRequest as sendRequest,
  acceptFriendRequest as acceptRequest,
  declineOrRemoveFriend,
  getFriends as getFriendsList,
  getPendingRequests as getPendingList,
  getFriendshipStatus as getStatus,
} from './friends.service.js';

export async function postFriendRequest(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const targetId = req.params['userId'] as string;
  if (targetId === userId) {
    res.status(400).json({ error: { code: 'INVALID_TARGET', message: 'Cannot send friend request to yourself', status: 400 } });
    return;
  }

  // Verify target user exists
  await getUserById(targetId);

  const result = await sendRequest(userId, targetId);
  if (result.autoAccepted) {
    res.status(200).json({ status: 'accepted' });
  } else {
    res.status(201).json({ status: 'pending' });
  }
}

export async function patchAcceptRequest(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const requesterId = req.params['userId'] as string;
  await acceptRequest(userId, requesterId);
  res.status(204).end();
}

export async function deleteFriend(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const targetId = req.params['userId'] as string;
  await declineOrRemoveFriend(userId, targetId);
  res.status(204).end();
}

export async function listFriends(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const friends = await getFriendsList(userId);
  res.json({ friends });
}

export async function listPendingRequests(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const requests = await getPendingList(userId);
  res.json({ requests });
}

export async function getFriendshipStatus(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const targetId = req.params['userId'] as string;
  const status = await getStatus(userId, targetId);
  res.json({ status });
}
