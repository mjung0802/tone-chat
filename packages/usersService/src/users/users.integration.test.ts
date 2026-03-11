import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { app } from '../app.js';
import { sql } from '../config/database.js';

let server: Server;
let baseUrl: string;
const HEADERS = { 'content-type': 'application/json', 'x-internal-key': 'dev-internal-key' };

async function registerUser(username: string, email: string): Promise<{ id: string; accessToken: string; refreshToken: string }> {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ username, email, password: 'password123' }),
  });
  const body = await res.json() as { user: { id: string }; accessToken: string; refreshToken: string };
  return { id: body.user.id, accessToken: body.accessToken, refreshToken: body.refreshToken };
}

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
  await sql`TRUNCATE users, credentials, refresh_tokens, email_verification_tokens CASCADE`;
});

describe('GET /users/me', () => {
  it('returns the current user', async () => {
    const { id } = await registerUser('alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/users/me`, {
      headers: { ...HEADERS, 'x-user-id': id },
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { user: { id: string; username: string; email: string } };
    assert.equal(body.user.id, id);
    assert.equal(body.user.username, 'alice');
    // getMe returns user WITH email (it's "me")
    assert.equal(body.user.email, 'alice@test.com');
  });

  it('returns 400 without x-user-id', async () => {
    const res = await fetch(`${baseUrl}/users/me`, {
      headers: HEADERS,
    });

    assert.equal(res.status, 400);
  });
});

describe('PATCH /users/me', () => {
  it('updates display_name and bio', async () => {
    const { id } = await registerUser('alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/users/me`, {
      method: 'PATCH',
      headers: { ...HEADERS, 'x-user-id': id },
      body: JSON.stringify({ display_name: 'Alice W', bio: 'Hello world' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { user: { display_name: string; bio: string } };
    assert.equal(body.user.display_name, 'Alice W');
    assert.equal(body.user.bio, 'Hello world');

    // Verify persistence
    const [row] = await sql<{ display_name: string; bio: string }[]>`
      SELECT display_name, bio FROM users WHERE id = ${id}
    `;
    assert.equal(row!.display_name, 'Alice W');
    assert.equal(row!.bio, 'Hello world');
  });

  it('ignores non-allowlisted fields', async () => {
    const { id } = await registerUser('alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/users/me`, {
      method: 'PATCH',
      headers: { ...HEADERS, 'x-user-id': id },
      body: JSON.stringify({ email: 'hacked@test.com', display_name: 'Valid' }),
    });

    assert.equal(res.status, 200);
    // Email should remain unchanged
    const [row] = await sql<{ email: string }[]>`SELECT email FROM users WHERE id = ${id}`;
    assert.equal(row!.email, 'alice@test.com');
  });
});

describe('POST /users/batch', () => {
  it('returns multiple users with email stripped', async () => {
    const u1 = await registerUser('alice', 'alice@test.com');
    const u2 = await registerUser('bob', 'bob@test.com');

    const res = await fetch(`${baseUrl}/users/batch`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ ids: [u1.id, u2.id] }),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { users: Array<{ id: string; username: string; email?: string }> };
    assert.equal(body.users.length, 2);
    // Emails should be stripped in batch response
    for (const user of body.users) {
      assert.equal(user.email, undefined);
    }
  });

  it('returns 400 for empty ids', async () => {
    const res = await fetch(`${baseUrl}/users/batch`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ ids: [] }),
    });

    assert.equal(res.status, 400);
  });

  it('returns 400 for non-array ids', async () => {
    const res = await fetch(`${baseUrl}/users/batch`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ ids: 'not-an-array' }),
    });

    assert.equal(res.status, 400);
  });
});

describe('GET /users/:id', () => {
  it('returns user without email', async () => {
    const { id } = await registerUser('alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/users/${id}`, {
      headers: HEADERS,
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { user: { id: string; username: string; email?: string } };
    assert.equal(body.user.id, id);
    assert.equal(body.user.username, 'alice');
    assert.equal(body.user.email, undefined);
  });

  it('returns 404 for non-existent UUID', async () => {
    const res = await fetch(`${baseUrl}/users/00000000-0000-0000-0000-000000000000`, {
      headers: HEADERS,
    });

    assert.equal(res.status, 404);
  });
});
