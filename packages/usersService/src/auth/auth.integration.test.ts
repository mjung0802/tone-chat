import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
  await sql`TRUNCATE users, credentials, refresh_tokens CASCADE`;
});

describe('POST /auth/register', () => {
  it('creates a user and returns tokens', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'alice', email: 'alice@test.com', password: 'password123' }),
    });

    assert.equal(res.status, 201);
    const body = await res.json() as { user: { id: string; username: string; email: string }; accessToken: string; refreshToken: string };
    assert.equal(body.user.username, 'alice');
    assert.equal(body.user.email, 'alice@test.com');
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
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username: 'alice', email: 'alice@test.com', password: 'password123' }),
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

  it('returns 401 for non-existent email', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ email: 'nobody@test.com', password: 'password123' }),
    });

    assert.equal(res.status, 401);
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
