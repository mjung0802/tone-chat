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

export async function updateUser(
  id: string,
  updates: { [K in 'display_name' | 'pronouns' | 'avatar_url' | 'bio' | 'status']?: User[K] | undefined },
): Promise<User> {
  const fields: string[] = [];
  const values: (string | null)[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(key);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    throw new AppError('NO_UPDATES', 'No fields to update', 400);
  }

  // Build dynamic update — postgres.js handles parameterization
  const setClauses = fields.map((field, i) => `${field} = $${i + 2}`);
  const query = `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`;

  const result = await sql.unsafe(query, [id, ...values]) as User[];
  const user = result[0];
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User not found', 404);
  }
  return user;
}
