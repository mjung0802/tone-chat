import { createAuthForUser } from '@/auth/queries/createAuthForUser.ts';
import type { User } from '@/shared/types.ts';
import { createUserInDb } from '@/users/queries/createNewUser.ts';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';

// users
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

// single user
type CreateUserRequest = {
  username: string;
  email: string;
  password: string;
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await getUserById(req.params['id'] as string);
  res.json({ user: stripPrivateFields(user) });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const { username, email, password } = req.body as CreateUserRequest;
  if (!username || !email || !password) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'username, email, and password are required', status: 400 } });
    return;
  }

  const hashedPassword = hashPassword(username, password);

  const newUser: Omit<User, 'id'> = {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    email_verified: false,
    status: 'offline',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const createdUser = await createUserInDb(newUser);
  await createAuthForUser(createdUser.id, hashedPassword);
  res.status(201).json({ user: stripPrivateFields(createdUser) });
};

// me
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

// other
function stripPrivateFields(user: User): Omit<User, 'email'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email: _email, ...publicUser } = user;
  return publicUser;
}

function hashPassword(userName: string, password: string): string {
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error('Error hashing password for user', userName, err);
      throw new Error('Failed to hash password');
    }
    return hash;
  });
  return password;
}
