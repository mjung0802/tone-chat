import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { app } from '../app.js';
import { sql } from '../config/database.js';

let server: Server;
let baseUrl: string;
const HEADERS = { 'content-type': 'application/json', 'x-internal-key': 'dev-internal-key' };

async function registerUser(username: string, email: string): Promise<{ id: string }> {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ username, email, password: 'password123' }),
  });
  const body = await res.json() as { user: { id: string }; accessToken: string };
  return { id: body.user.id };
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
  await sql`TRUNCATE users, credentials, refresh_tokens, email_verification_tokens, user_blocks, friendships CASCADE`;
});

describe('POST /users/me/blocks/:userId', () => {
  it('blocks another user (204)', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    const res = await fetch(`${baseUrl}/users/me/blocks/${bob.id}`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });

    assert.equal(res.status, 204);

    // Verify the block was stored
    const rows = await sql<{ blocked_id: string }[]>`
      SELECT blocked_id FROM user_blocks WHERE blocker_id = ${alice.id}
    `;
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.blocked_id, bob.id);
  });

  it('self-block returns 400', async () => {
    const alice = await registerUser('alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/users/me/blocks/${alice.id}`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });

    assert.equal(res.status, 400);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'INVALID_TARGET');
  });

  it('blocking nonexistent user returns 404', async () => {
    const alice = await registerUser('alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/users/me/blocks/00000000-0000-0000-0000-000000000000`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });

    assert.equal(res.status, 404);
  });

  it('blocking the same user twice is idempotent (no error)', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    // First block
    const res1 = await fetch(`${baseUrl}/users/me/blocks/${bob.id}`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });
    assert.equal(res1.status, 204);

    // Second block — should not error
    const res2 = await fetch(`${baseUrl}/users/me/blocks/${bob.id}`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });
    assert.equal(res2.status, 204);

    // Still only one row
    const rows = await sql<{ blocked_id: string }[]>`
      SELECT blocked_id FROM user_blocks WHERE blocker_id = ${alice.id}
    `;
    assert.equal(rows.length, 1);
  });
});

describe('DELETE /users/me/blocks/:userId', () => {
  it('unblocks a user (204)', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    // Block first
    await fetch(`${baseUrl}/users/me/blocks/${bob.id}`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });

    // Now unblock
    const res = await fetch(`${baseUrl}/users/me/blocks/${bob.id}`, {
      method: 'DELETE',
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });

    assert.equal(res.status, 204);

    const rows = await sql<{ blocked_id: string }[]>`
      SELECT blocked_id FROM user_blocks WHERE blocker_id = ${alice.id}
    `;
    assert.equal(rows.length, 0);
  });

  it('unblocking a non-existing block returns 404', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    const res = await fetch(`${baseUrl}/users/me/blocks/${bob.id}`, {
      method: 'DELETE',
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });

    assert.equal(res.status, 404);
  });
});

describe('GET /users/me/blocks', () => {
  it('returns list of blocked user IDs', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');
    const charlie = await registerUser('charlie', 'charlie@test.com');

    await fetch(`${baseUrl}/users/me/blocks/${bob.id}`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });
    await fetch(`${baseUrl}/users/me/blocks/${charlie.id}`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });

    const res = await fetch(`${baseUrl}/users/me/blocks`, {
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { blockedIds: string[] };
    assert.equal(body.blockedIds.length, 2);
    assert.ok(body.blockedIds.includes(bob.id));
    assert.ok(body.blockedIds.includes(charlie.id));
  });

  it('returns empty array when no blocks', async () => {
    const alice = await registerUser('alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/users/me/blocks`, {
      headers: { ...HEADERS, 'x-user-id': alice.id },
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { blockedIds: string[] };
    assert.deepEqual(body.blockedIds, []);
  });
});
