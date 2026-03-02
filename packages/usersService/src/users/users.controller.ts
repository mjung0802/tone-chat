import type { Request, Response } from 'express';
import { getUserById, updateUser } from './users.service.js';
import type { User } from '../shared/types.js';

function stripPrivateFields(user: User): Omit<User, 'email'> {
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

  const { display_name, pronouns, avatar_url, bio, status } = req.body as Record<string, string | undefined>;
  const user = await updateUser(userId, { display_name, pronouns, avatar_url, bio, status });
  res.json({ user });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await getUserById(req.params['id'] as string);
  res.json({ user: stripPrivateFields(user) });
}
