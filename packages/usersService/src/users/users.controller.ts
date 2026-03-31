import type { Request, Response } from 'express';
import type { User } from '../shared/types.js';
import { getUserById, getUsersByIds, updateUser } from './users.service.js';

function stripPrivateFields(user: User): Omit<User, 'email'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email: _email, ...publicUser } = user;
  return publicUser;
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const user = await getUserById(userId);
  res.json({ user });
}

export async function patchMe(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'X-User-Id header is required', status: 400 } });
    return;
  }

  const { display_name, pronouns, avatar_url, bio } = req.body as Record<string, string | undefined>;
  const user = await updateUser(userId, { display_name, pronouns, avatar_url, bio });
  res.json({ user: stripPrivateFields(user) });
}

export async function getUsersBatch(req: Request, res: Response): Promise<void> {
  const { ids } = req.body as { ids: unknown };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: { code: 'INVALID_IDS', message: 'ids must be a non-empty array', status: 400 } });
    return;
  }
  if (!ids.every((id: unknown) => typeof id === 'string')) {
    res.status(400).json({ error: { code: 'INVALID_IDS', message: 'All ids must be strings', status: 400 } });
    return;
  }
  if (ids.length > 100) {
    res.status(400).json({ error: { code: 'BATCH_TOO_LARGE', message: 'Maximum 100 ids per request', status: 400 } });
    return;
  }
  const users = await getUsersByIds(ids as string[]);
  res.json({ users: users.map(stripPrivateFields) });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await getUserById(req.params['id'] as string);
  res.json({ user: stripPrivateFields(user) });
}
