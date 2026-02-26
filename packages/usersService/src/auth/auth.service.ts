import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { sql } from '../config/database.js';
import { config } from '../config/index.js';
import { AppError } from '../shared/middleware/errorHandler.js';
import type { User } from '../shared/types.js';

const SALT_ROUNDS = 12;

export async function registerUser(username: string, email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  if (password.length < 8) {
    throw new AppError('WEAK_PASSWORD', 'Password must be at least 8 characters', 400);
  }

  const existing = await sql`
    SELECT id FROM users WHERE username = ${username} OR email = ${email} LIMIT 1
  `;
  if (existing.length > 0) {
    throw new AppError('USER_EXISTS', 'Username or email already taken', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [user] = await sql.begin(async (tx) => {
    const [newUser] = await (tx as any)`
      INSERT INTO users (username, email) VALUES (${username}, ${email}) RETURNING *
    ` as User[];
    await (tx as any)`
      INSERT INTO credentials (user_id, password_hash) VALUES (${newUser!.id}, ${passwordHash})
    `;
    return [newUser!];
  });

  const accessToken = generateAccessToken(user!.id);
  const refreshToken = await createRefreshToken(user!.id);

  return { user: user!, accessToken, refreshToken };
}

export async function loginUser(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const [user] = await sql<User[]>`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const [cred] = await sql<{ password_hash: string }[]>`
    SELECT password_hash FROM credentials WHERE user_id = ${user.id}
  `;
  if (!cred) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, cred.password_hash);
  if (!valid) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = await createRefreshToken(user.id);

  return { user, accessToken, refreshToken };
}

export async function refreshAccessToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenHash = hashToken(token);

  const [existing] = await sql<{ id: string; user_id: string; expires_at: Date }[]>`
    SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = ${tokenHash}
  `;

  if (!existing) {
    throw new AppError('INVALID_TOKEN', 'Invalid refresh token', 401);
  }

  if (new Date(existing.expires_at) < new Date()) {
    await sql`DELETE FROM refresh_tokens WHERE id = ${existing.id}`;
    throw new AppError('TOKEN_EXPIRED', 'Refresh token has expired', 401);
  }

  // Token rotation: delete old token, create new one
  await sql`DELETE FROM refresh_tokens WHERE id = ${existing.id}`;

  const accessToken = generateAccessToken(existing.user_id);
  const refreshToken = await createRefreshToken(existing.user_id);

  return { accessToken, refreshToken };
}

function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiresIn,
  } as jwt.SignOptions);
}

async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + config.jwtRefreshExpiresDays * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `;

  return token;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
