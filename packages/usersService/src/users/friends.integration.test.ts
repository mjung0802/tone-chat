import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { sql } from '../config/database.js';

let server: Server;
let baseUrl: string;
const HEADERS = { 'content-type': 'application/json', 'x-internal-key': 'dev-internal-key' };

function tokenFor(userId: string): string {
  return jwt.sign(
    { sub: userId },
    process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  );
}

async function registerUser(username: string, email: string): Promise<{ id: string }> {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ username, email, password: 'password123' }),
  });
  const body = await res.json() as { user: { id: string }; accessToken: string };
  return { id: body.user.id };
}

function userHeaders(userId: string) {
  return { ...HEADERS, 'x-user-token': tokenFor(userId) };
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

describe('POST /users/me/friends/:userId — send friend request', () => {
  it('creates a pending request (201)', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    const res = await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 201);
    const body = await res.json() as { status: string };
    assert.equal(body.status, 'pending');
  });

  it('self-request returns 400', async () => {
    const alice = await registerUser('alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/users/me/friends/${alice.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 400);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'INVALID_TARGET');
  });

  it('nonexistent user returns 404', async () => {
    const alice = await registerUser('alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/users/me/friends/00000000-0000-0000-0000-000000000000`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 404);
  });

  it('duplicate request returns 409', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    const res = await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 409);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'REQUEST_EXISTS');
  });

  it('auto-accepts when reverse pending exists (200)', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    // Bob sends request to Alice
    await fetch(`${baseUrl}/users/me/friends/${alice.id}`, {
      method: 'POST',
      headers: userHeaders(bob.id),
    });

    // Alice sends request to Bob — should auto-accept
    const res = await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { status: string };
    assert.equal(body.status, 'accepted');

    // Both should now see each other as friends
    const aliceFriends = await fetch(`${baseUrl}/users/me/friends`, {
      headers: userHeaders(alice.id),
    });
    const aliceBody = await aliceFriends.json() as { friends: { userId: string }[] };
    assert.equal(aliceBody.friends.length, 1);
    assert.equal(aliceBody.friends[0]?.userId, bob.id);
  });

  it('blocked user cannot send friend request (403)', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    // Alice blocks Bob
    await fetch(`${baseUrl}/users/me/blocks/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    // Bob tries to send friend request to Alice
    const res = await fetch(`${baseUrl}/users/me/friends/${alice.id}`, {
      method: 'POST',
      headers: userHeaders(bob.id),
    });

    assert.equal(res.status, 403);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'BLOCKED');
  });
});

describe('PATCH /users/me/friends/:userId/accept', () => {
  it('accepts a pending request (204)', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    // Alice sends request to Bob
    await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    // Bob accepts
    const res = await fetch(`${baseUrl}/users/me/friends/${alice.id}/accept`, {
      method: 'PATCH',
      headers: userHeaders(bob.id),
    });

    assert.equal(res.status, 204);

    // Verify both see each other as friends
    const bobFriends = await fetch(`${baseUrl}/users/me/friends`, {
      headers: userHeaders(bob.id),
    });
    const bobBody = await bobFriends.json() as { friends: { userId: string }[] };
    assert.equal(bobBody.friends.length, 1);
    assert.equal(bobBody.friends[0]?.userId, alice.id);
  });

  it('returns 404 when no pending request', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    const res = await fetch(`${baseUrl}/users/me/friends/${alice.id}/accept`, {
      method: 'PATCH',
      headers: userHeaders(bob.id),
    });

    assert.equal(res.status, 404);
  });
});

describe('DELETE /users/me/friends/:userId', () => {
  it('removes an accepted friendship (204)', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    // Become friends
    await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });
    await fetch(`${baseUrl}/users/me/friends/${alice.id}/accept`, {
      method: 'PATCH',
      headers: userHeaders(bob.id),
    });

    // Remove
    const res = await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'DELETE',
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 204);

    // Verify no friends
    const aliceFriends = await fetch(`${baseUrl}/users/me/friends`, {
      headers: userHeaders(alice.id),
    });
    const body = await aliceFriends.json() as { friends: unknown[] };
    assert.equal(body.friends.length, 0);
  });

  it('declines a pending request (204)', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    // Alice sends request
    await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    // Bob declines
    const res = await fetch(`${baseUrl}/users/me/friends/${alice.id}`, {
      method: 'DELETE',
      headers: userHeaders(bob.id),
    });

    assert.equal(res.status, 204);
  });

  it('returns 404 when no relationship exists', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    const res = await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'DELETE',
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 404);
  });
});

describe('GET /users/me/friends', () => {
  it('returns accepted friends', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });
    await fetch(`${baseUrl}/users/me/friends/${alice.id}/accept`, {
      method: 'PATCH',
      headers: userHeaders(bob.id),
    });

    const res = await fetch(`${baseUrl}/users/me/friends`, {
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { friends: { userId: string; username: string }[] };
    assert.equal(body.friends.length, 1);
    assert.equal(body.friends[0]?.username, 'bob');
  });

  it('returns empty when no friends', async () => {
    const alice = await registerUser('alice', 'alice@test.com');

    const res = await fetch(`${baseUrl}/users/me/friends`, {
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { friends: unknown[] };
    assert.deepEqual(body.friends, []);
  });
});

describe('GET /users/me/friends/pending', () => {
  it('returns incoming and outgoing requests', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');
    const charlie = await registerUser('charlie', 'charlie@test.com');

    // Alice sends to Bob (outgoing for alice)
    await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    // Charlie sends to Alice (incoming for alice)
    await fetch(`${baseUrl}/users/me/friends/${alice.id}`, {
      method: 'POST',
      headers: userHeaders(charlie.id),
    });

    const res = await fetch(`${baseUrl}/users/me/friends/pending`, {
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { requests: { userId: string; direction: string }[] };
    assert.equal(body.requests.length, 2);

    const incoming = body.requests.find((r) => r.direction === 'incoming');
    const outgoing = body.requests.find((r) => r.direction === 'outgoing');
    assert.ok(incoming);
    assert.ok(outgoing);
    assert.equal(incoming.userId, charlie.id);
    assert.equal(outgoing.userId, bob.id);
  });
});

describe('GET /users/me/friends/:userId/status', () => {
  it('returns none when no relationship', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    const res = await fetch(`${baseUrl}/users/me/friends/${bob.id}/status`, {
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { status: string };
    assert.equal(body.status, 'none');
  });

  it('returns pending_outgoing for sent request', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });

    const res = await fetch(`${baseUrl}/users/me/friends/${bob.id}/status`, {
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { status: string };
    assert.equal(body.status, 'pending_outgoing');
  });

  it('returns pending_incoming for received request', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    await fetch(`${baseUrl}/users/me/friends/${alice.id}`, {
      method: 'POST',
      headers: userHeaders(bob.id),
    });

    const res = await fetch(`${baseUrl}/users/me/friends/${bob.id}/status`, {
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { status: string };
    assert.equal(body.status, 'pending_incoming');
  });

  it('returns friends for accepted friendship', async () => {
    const alice = await registerUser('alice', 'alice@test.com');
    const bob = await registerUser('bob', 'bob@test.com');

    await fetch(`${baseUrl}/users/me/friends/${bob.id}`, {
      method: 'POST',
      headers: userHeaders(alice.id),
    });
    await fetch(`${baseUrl}/users/me/friends/${alice.id}/accept`, {
      method: 'PATCH',
      headers: userHeaders(bob.id),
    });

    const res = await fetch(`${baseUrl}/users/me/friends/${bob.id}/status`, {
      headers: userHeaders(alice.id),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { status: string };
    assert.equal(body.status, 'friends');
  });
});
