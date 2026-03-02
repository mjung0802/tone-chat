import { sql } from '../config/database.js';
import { AppError } from '../shared/middleware/errorHandler.js';
import type { User } from '../shared/types.js';

export async function getUserById(id: string): Promise<User> {
  const [user] = await sql<User[]>`SELECT * FROM users WHERE id = ${id}`;
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }
  return user;
}

const ALLOWED_UPDATE_FIELDS = new Set(['display_name', 'pronouns', 'avatar_url', 'bio', 'status'] as const);

export async function updateUser(
  id: string,
  updates: { [K in 'display_name' | 'pronouns' | 'avatar_url' | 'bio' | 'status']?: User[K] | undefined },
): Promise<User> {
  const safeUpdates: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && ALLOWED_UPDATE_FIELDS.has(key as any)) {
      safeUpdates[key] = value;
    }
  }

  const columns = Object.keys(safeUpdates);
  if (columns.length === 0) {
    throw new AppError('NO_UPDATES', 'No fields to update', 400);
  }

  const [user] = await sql<User[]>`
    UPDATE users SET ${sql(safeUpdates, ...columns)}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }
  return user;
}
