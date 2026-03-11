import crypto from 'node:crypto';
import { sql } from '../config/database.js';
import { hashSha256 } from '../shared/crypto.js';
import { AppError } from '../shared/middleware/errorHandler.js';
import { sendVerificationEmail } from '../email/email.service.js';

const hashCode = hashSha256;

export async function sendVerificationOtp(userId: string, email: string): Promise<void> {
  // Delete any existing tokens for this user
  await sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`;

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await sql`
    INSERT INTO email_verification_tokens (user_id, code_hash, expires_at)
    VALUES (${userId}, ${codeHash}, ${expiresAt})
  `;

  await sendVerificationEmail(email, code);
}

export async function verifyOtp(userId: string, code: string): Promise<void> {
  const codeHash = hashCode(code);

  const [token] = await sql<{ expires_at: Date }[]>`
    DELETE FROM email_verification_tokens
    WHERE user_id = ${userId} AND code_hash = ${codeHash}
    RETURNING expires_at
  `;

  if (!token) {
    throw new AppError('INVALID_CODE', 'Invalid verification code', 400);
  }

  if (new Date(token.expires_at) < new Date()) {
    throw new AppError('CODE_EXPIRED', 'Verification code has expired', 400);
  }

  await sql`UPDATE users SET email_verified = TRUE WHERE id = ${userId}`;
}
