import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { app } from '../app.js';
import { sql } from '../config/database.js';

let server: Server;
let baseUrl: string;
const HEADERS = { 'content-type': 'application/json', 'x-internal-key': 'dev-internal-key' };

before(async () => {
  server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});

after(async () => {
  server.close();
  await sql.end();
});

beforeEach(async () => {
  await sql`TRUNCATE users, credentials, refresh_tokens, email_verification_tokens, user_blocks, friendships CASCADE`;
});

describe('POST /auth/register', () => {
  it('creates a user and returns tokens', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'alice', email: 'alice@test.com', password: 'password123' }),
    });

    assert.equal(res.status, 201);
    const body = await res.json() as { user: { id: string; username: string; email: string; email_verified: boolean }; accessToken: string; refreshToken: string };
    assert.equal(body.user.username, 'alice');
    assert.equal(body.user.email, 'alice@test.com');
    assert.equal(body.user.email_verified, false);
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
  });

  it('stores password as hash, not plaintext', async () => {
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'alice', email: 'alice@test.com', password: 'password123' }),
    });

    const [cred] = await sql<{ password_hash: string }[]>`
      SELECT password_hash FROM credentials LIMIT 1
    `;
    assert.ok(cred);
    assert.notEqual(cred.password_hash, 'password123');
    assert.ok(cred.password_hash.startsWith('$2'));
  });

  it('returns 409 on duplicate username', async () => {
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'alice', email: 'alice@test.com', password: 'password123' }),
    });

    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'alice', email: 'alice2@test.com', password: 'password123' }),
    });

    assert.equal(res.status, 409);
  });

  it('returns 409 on duplicate email', async () => {
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'alice', email: 'alice@test.com', password: 'password123' }),
    });

    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'bob', email: 'alice@test.com', password: 'password123' }),
    });

    assert.equal(res.status, 409);
  });

  it('returns 400 for weak password', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'alice', email: 'alice@test.com', password: 'short' }),
    });

    assert.equal(res.status, 400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    const { userId, code } = await registerAndCaptureOtp(baseUrl, 'alice', 'alice@test.com');
    await fetch(`${baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': userId },
      body: JSON.stringify({ code }),
    });
  });

  it('returns tokens for valid credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ email: 'alice@test.com', password: 'password123' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { user: { username: string }; accessToken: string; refreshToken: string };
    assert.equal(body.user.username, 'alice');
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
  });

  it('returns 401 for wrong password', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ email: 'alice@test.com', password: 'wrongpassword' }),
    });

    assert.equal(res.status, 401);
  });

  it('returns 403 for unverified email', async () => {
    // Register without verifying
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'unverified', email: 'unverified@test.com', password: 'password123' }),
    });

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ email: 'unverified@test.com', password: 'password123' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'EMAIL_NOT_VERIFIED');
  });

  it('returns 401 for non-existent email', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ email: 'nobody@test.com', password: 'password123' }),
    });

    assert.equal(res.status, 401);
  });
});

describe('internalAuth middleware', () => {
  it('returns 401 for wrong x-internal-key', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': 'wrong-key' },
      body: JSON.stringify({ email: 'alice@test.com', password: 'password123' }),
    });
    assert.equal(res.status, 401);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });
});

describe('POST /auth/refresh', () => {
  it('returns new tokens and invalidates the old refresh token', async () => {
    const registerRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'alice', email: 'alice@test.com', password: 'password123' }),
    });
    const { refreshToken } = await registerRes.json() as { refreshToken: string };

    // Use the refresh token
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ refreshToken }),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { accessToken: string; refreshToken: string };
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
    assert.notEqual(body.refreshToken, refreshToken);

    // Old token should now be invalid (rotation)
    const reuse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ refreshToken }),
    });

    assert.equal(reuse.status, 401);
  });
});

// Helper: register a user and capture the OTP from dev console.log
async function registerAndCaptureOtp(
  baseUrl: string,
  username: string,
  email: string,
): Promise<{ userId: string; code: string }> {
  let capturedCode: string | null = null;
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0] === '[EMAIL DEV] code:') {
      capturedCode = String(args[1]);
    }
    originalLog.apply(console, args as Parameters<typeof console.log>);
  };

  let userId: string;
  try {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username, email, password: 'password123' }),
    });
    const body = await res.json() as { user: { id: string } };
    userId = body.user.id;

    // Wait for fire-and-forget sendVerificationOtp to complete and log the OTP
    await new Promise((resolve) => setTimeout(resolve, 500));
  } finally {
    console.log = originalLog;
  }

  assert.ok(capturedCode, 'Expected OTP to be logged via [EMAIL DEV]');
  return { userId, code: capturedCode! };
}

describe('POST /auth/verify-email', () => {
  it('returns 400 MISSING_FIELDS when code is absent', async () => {
    const { userId } = await registerAndCaptureOtp(baseUrl, 'alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': userId },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'MISSING_FIELDS');
  });

  it('returns 400 INVALID_CODE for wrong code', async () => {
    const { userId } = await registerAndCaptureOtp(baseUrl, 'alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': userId },
      body: JSON.stringify({ code: '000000' }),
    });

    assert.equal(res.status, 400);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'INVALID_CODE');
  });

  it('returns 400 CODE_EXPIRED for an expired token', async () => {
    const { userId } = await registerAndCaptureOtp(baseUrl, 'alice', 'alice@test.com');

    // Replace the token with an expired one using a known code
    const knownCode = '999999';
    const codeHash = crypto.createHash('sha256').update(knownCode).digest('hex');
    await sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`;
    await sql`
      INSERT INTO email_verification_tokens (user_id, code_hash, expires_at)
      VALUES (${userId}, ${codeHash}, NOW() - INTERVAL '1 second')
    `;

    const res = await fetch(`${baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': userId },
      body: JSON.stringify({ code: knownCode }),
    });

    assert.equal(res.status, 400);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'CODE_EXPIRED');
  });

  it('returns 200 and marks user as verified on happy path', async () => {
    const { userId, code } = await registerAndCaptureOtp(baseUrl, 'alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': userId },
      body: JSON.stringify({ code }),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { message: string };
    assert.equal(body.message, 'Email verified');

    // DB: email_verified should be true
    const [user] = await sql<{ email_verified: boolean }[]>`
      SELECT email_verified FROM users WHERE id = ${userId}
    `;
    assert.equal(user!.email_verified, true);

    // DB: token should be deleted
    const tokens = await sql<{ id: string }[]>`
      SELECT id FROM email_verification_tokens WHERE user_id = ${userId}
    `;
    assert.equal(tokens.length, 0);
  });

  it('replay prevention: second call with same code returns 400 INVALID_CODE', async () => {
    const { userId, code } = await registerAndCaptureOtp(baseUrl, 'alice', 'alice@test.com');

    // First call succeeds
    await fetch(`${baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': userId },
      body: JSON.stringify({ code }),
    });

    // Second call with same code
    const res = await fetch(`${baseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': userId },
      body: JSON.stringify({ code }),
    });

    assert.equal(res.status, 400);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'INVALID_CODE');
  });
});

describe('POST /auth/resend-verification', () => {
  it('returns 200 and creates exactly one token for the user', async () => {
    const { userId } = await registerAndCaptureOtp(baseUrl, 'alice', 'alice@test.com');

    // Clear existing tokens to test clean resend
    await sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`;

    const res = await fetch(`${baseUrl}/auth/resend-verification`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': userId },
      body: null,
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { message: string };
    assert.equal(body.message, 'Verification email sent');

    const tokens = await sql<{ id: string }[]>`
      SELECT id FROM email_verification_tokens WHERE user_id = ${userId}
    `;
    assert.equal(tokens.length, 1);
  });

  it('replaces old token: still exactly 1 row after resend', async () => {
    const { userId } = await registerAndCaptureOtp(baseUrl, 'alice', 'alice@test.com');

    // At this point there should be 1 token from registration; resend replaces it
    await fetch(`${baseUrl}/auth/resend-verification`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': userId },
      body: null,
    });

    const tokens = await sql<{ id: string }[]>`
      SELECT id FROM email_verification_tokens WHERE user_id = ${userId}
    `;
    assert.equal(tokens.length, 1);
  });

  it('returns 404 USER_NOT_FOUND for a non-existent userId', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const res = await fetch(`${baseUrl}/auth/resend-verification`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': fakeId },
      body: null,
    });

    assert.equal(res.status, 404);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'USER_NOT_FOUND');
  });
});
