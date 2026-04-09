import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import type postgres from 'postgres';
import type mongoose from 'mongoose';

// ─── Service state ──────────────────────────────────────────
let bffServer: HttpServer;
let usersServer: HttpServer;
let messagingServer: HttpServer;
let attachmentsServer: HttpServer;
let bffUrl: string;

let usersSql: postgres.Sql;
let attachmentsSql: postgres.Sql;
let mongooseConnection: typeof mongoose;

// Mongoose models for cleanup
let ServerModel: typeof mongoose.Model;
let ChannelModel: typeof mongoose.Model;
let MessageModel: typeof mongoose.Model;
let ServerMemberModel: typeof mongoose.Model;
let InviteModel: typeof mongoose.Model;

// ─── Helpers ────────────────────────────────────────────────

interface RegisterResult {
  user: { id: string; username: string; email: string };
  accessToken: string;
  refreshToken?: string;
  // refreshToken is set as an httpOnly cookie on web — extract via cookieHeader
  cookieHeader?: string;
}

async function registerUser(username: string, email: string, password: string): Promise<RegisterResult> {
  const res = await fetch(`${bffUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  assert.equal(res.status, 201, `register failed: ${res.status}`);
  const body = await res.json() as Omit<RegisterResult, 'cookieHeader'>;
  const cookieHeader = res.headers.get('set-cookie');
  return { ...body, ...(cookieHeader !== null ? { cookieHeader } : {}) };
}

function authHeaders(accessToken: string): Record<string, string> {
  return { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` };
}

async function createTestServer(accessToken: string, name = 'Test Server'): Promise<{ serverId: string; channelId: string }> {
  const res = await fetch(`${bffUrl}/api/v1/servers`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name }),
  });
  assert.equal(res.status, 201);
  const body = await res.json() as { server: { _id: string } };
  const serverId = body.server._id;

  const chRes = await fetch(`${bffUrl}/api/v1/servers/${serverId}/channels`, {
    headers: authHeaders(accessToken),
  });
  const chBody = await chRes.json() as { channels: Array<{ _id: string; name: string }> };
  const general = chBody.channels.find(c => c.name === 'general');
  return { serverId, channelId: general!._id };
}

function listenOnEphemeral(app: { listen: (port: number) => HttpServer }): { server: HttpServer; url: string } {
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://localhost:${port}` };
}

// ─── Setup: start all 4 services ────────────────────────────

before(async () => {
  // Cross-package import paths as variables to bypass rootDir enforcement.
  // TypeScript cannot statically resolve non-literal import specifiers,
  // so it types the result as Promise<any> and skips rootDir checks.
  const usersDbPath = '../../usersService/src/config/database.js';
  const usersAppPath = '../../usersService/src/app.js';
  const attachDbPath = '../../attachmentsService/src/config/database.js';
  const attachStoragePath = '../../attachmentsService/src/config/storage.js';
  const attachAppPath = '../../attachmentsService/src/app.js';
  const msgDbPath = '../../messagingService/src/config/database.js';
  const msgAppPath = '../../messagingService/src/app.js';
  const serverModelPath = '../../messagingService/src/servers/server.model.js';
  const channelModelPath = '../../messagingService/src/channels/channel.model.js';
  const messageModelPath = '../../messagingService/src/messages/message.model.js';
  const memberModelPath = '../../messagingService/src/members/serverMember.model.js';
  const inviteModelPath = '../../messagingService/src/invites/invite.model.js';

  // 1. Start usersService (needs DATABASE_URL for PG)
  process.env['DATABASE_URL'] = 'postgres://tone:tone_dev@localhost:5442/tone_users_test';
  const usersDb = await import(usersDbPath);
  usersSql = usersDb.sql;
  const usersApp = await import(usersAppPath);
  const usersResult = listenOnEphemeral(usersApp.app);
  usersServer = usersResult.server;
  const usersUrl = usersResult.url;

  // 2. Start attachmentsService (swap DATABASE_URL to attachments PG)
  process.env['DATABASE_URL'] = 'postgres://tone:tone_dev@localhost:5443/tone_attachments_test';
  const attachDb = await import(attachDbPath);
  attachmentsSql = attachDb.sql;
  const attachStorage = await import(attachStoragePath);
  await attachStorage.ensureBucket();
  const attachApp = await import(attachAppPath);
  const attachResult = listenOnEphemeral(attachApp.app);
  attachmentsServer = attachResult.server;
  const attachmentsUrl = attachResult.url;

  // 3. Start messagingService (MongoDB)
  const msgDb = await import(msgDbPath);
  await msgDb.connectDatabase();
  const msgApp = await import(msgAppPath);
  const msgResult = listenOnEphemeral(msgApp.app);
  messagingServer = msgResult.server;
  const messagingUrl = msgResult.url;

  // Import mongoose models for cleanup
  mongooseConnection = (await import('mongoose')).default;
  ServerModel = (await import(serverModelPath)).Server;
  ChannelModel = (await import(channelModelPath)).Channel;
  MessageModel = (await import(messageModelPath)).Message;
  ServerMemberModel = (await import(memberModelPath)).ServerMember;
  InviteModel = (await import(inviteModelPath)).Invite;

  // 4. Disable rate limiters before importing BFF app
  const { authRateLimiters } = await import('./auth/auth.rateLimit.js');
  const passthrough = (_req: unknown, _res: unknown, next: () => void) => { next(); };
  authRateLimiters.register = passthrough as typeof authRateLimiters.register;
  authRateLimiters.login = passthrough as typeof authRateLimiters.login;
  authRateLimiters.refresh = passthrough as typeof authRateLimiters.refresh;

  // 5. Point BFF config at ephemeral service URLs
  const { config } = await import('./config/index.js');
  (config as { usersServiceUrl: string }).usersServiceUrl = usersUrl;
  (config as { messagingServiceUrl: string }).messagingServiceUrl = messagingUrl;
  (config as { attachmentsServiceUrl: string }).attachmentsServiceUrl = attachmentsUrl;

  // 6. Start BFF
  const { app } = await import('./app.js');
  const bffResult = listenOnEphemeral(app);
  bffServer = bffResult.server;
  bffUrl = bffResult.url;
});

after(async () => {
  bffServer?.closeAllConnections();
  usersServer?.closeAllConnections();
  messagingServer?.closeAllConnections();
  attachmentsServer?.closeAllConnections();
  bffServer?.close();
  usersServer?.close();
  messagingServer?.close();
  attachmentsServer?.close();
  await Promise.allSettled([
    usersSql?.end({ timeout: 1 }),
    attachmentsSql?.end({ timeout: 1 }),
    mongooseConnection?.connection.close(),
  ]);
  // Force exit — multiple in-process services leave lingering handles
  setTimeout(() => process.exit(0), 500);
});

beforeEach(async () => {
  await Promise.all([
    usersSql`TRUNCATE users, credentials, refresh_tokens, email_verification_tokens, user_blocks, friendships CASCADE`,
    attachmentsSql`TRUNCATE attachments CASCADE`,
    ServerModel.deleteMany({}),
    ChannelModel.deleteMany({}),
    MessageModel.deleteMany({}),
    ServerMemberModel.deleteMany({}),
    InviteModel.deleteMany({}),
  ]);
});

// ─── Auth ───────────────────────────────────────────────────

describe('BFF Auth', () => {
  it('registers a user and returns tokens', async () => {
    const result = await registerUser('alice', 'alice@test.com', 'password123');
    assert.equal(result.user.username, 'alice');
    assert.ok(result.accessToken);
    // refreshToken is now set as httpOnly cookie, not in response body
    assert.equal(result.refreshToken, undefined);
    assert.ok(result.cookieHeader?.includes('refreshToken='));
  });

  it('logs in with credentials', async () => {
    const { user } = await registerUser('alice', 'alice@test.com', 'password123');
    await usersSql`UPDATE users SET email_verified = true WHERE id = ${user.id}`;

    const res = await fetch(`${bffUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'alice@test.com', password: 'password123' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { user: { username: string }; accessToken: string };
    assert.equal(body.user.username, 'alice');
    assert.ok(body.accessToken);
  });

  it('refreshes tokens with rotation', async () => {
    const { cookieHeader } = await registerUser('alice', 'alice@test.com', 'password123');
    // Extract refresh token value from cookie header for native-style body-based refresh
    const refreshToken = cookieHeader?.match(/refreshToken=([^;]+)/)?.[1];
    assert.ok(refreshToken, 'refreshToken cookie should be present after registration');

    const res = await fetch(`${bffUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { accessToken: string };
    assert.ok(body.accessToken);
    // New refresh token is set in cookie
    const newCookieHeader = res.headers.get('set-cookie');
    const newRefreshToken = newCookieHeader?.match(/refreshToken=([^;]+)/)?.[1];
    assert.ok(newRefreshToken);
    assert.notEqual(newRefreshToken, refreshToken);

    // Old token should be invalid
    const reuse = await fetch(`${bffUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    assert.equal(reuse.status, 401);
  });

  it('returns 409 on duplicate username', async () => {
    await registerUser('alice', 'alice@test.com', 'password123');

    const res = await fetch(`${bffUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'alice', email: 'alice2@test.com', password: 'password123' }),
    });
    assert.equal(res.status, 409);
  });

  it('returns 401 for wrong password', async () => {
    await registerUser('alice', 'alice@test.com', 'password123');

    const res = await fetch(`${bffUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'alice@test.com', password: 'wrongpassword' }),
    });
    assert.equal(res.status, 401);
  });
});

// ─── Users ──────────────────────────────────────────────────

describe('BFF Users', () => {
  it('GET /users/me returns profile', async () => {
    const { accessToken, user } = await registerUser('alice', 'alice@test.com', 'password123');

    const res = await fetch(`${bffUrl}/api/v1/users/me`, {
      headers: authHeaders(accessToken),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { user: { id: string; username: string } };
    assert.equal(body.user.id, user.id);
    assert.equal(body.user.username, 'alice');
  });

  it('PATCH /users/me updates display_name', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');

    const res = await fetch(`${bffUrl}/api/v1/users/me`, {
      method: 'PATCH',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ display_name: 'Alice W' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { user: { display_name: string } };
    assert.equal(body.user.display_name, 'Alice W');
  });

  it('GET /users/:id returns user without email', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');

    const res = await fetch(`${bffUrl}/api/v1/users/${bob.user.id}`, {
      headers: authHeaders(accessToken),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { user: { username: string; email?: string } };
    assert.equal(body.user.username, 'bob');
    assert.equal(body.user.email, undefined);
  });

  it('returns 401 without token', async () => {
    const res = await fetch(`${bffUrl}/api/v1/users/me`);
    assert.equal(res.status, 401);
  });
});

// ─── Servers ────────────────────────────────────────────────

describe('BFF Servers', () => {
  it('creates server with auto #general channel', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(accessToken, 'My Server');
    assert.ok(serverId);
    assert.ok(channelId);
  });

  it('lists servers the user is a member of', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    await createTestServer(accessToken, 'Server A');
    await createTestServer(accessToken, 'Server B');

    const res = await fetch(`${bffUrl}/api/v1/servers`, {
      headers: authHeaders(accessToken),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { servers: Array<{ name: string }> };
    assert.equal(body.servers.length, 2);
  });

  it('owner-only update and delete', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId } = await createTestServer(alice.accessToken);

    // Bob cannot update
    const res = await fetch(`${bffUrl}/api/v1/servers/${serverId}`, {
      method: 'PATCH',
      headers: authHeaders(bob.accessToken),
      body: JSON.stringify({ name: 'Hacked' }),
    });
    assert.equal(res.status, 403);

    // Alice can update
    const res2 = await fetch(`${bffUrl}/api/v1/servers/${serverId}`, {
      method: 'PATCH',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ name: 'Renamed' }),
    });
    assert.equal(res2.status, 200);

    // Alice can delete
    const res3 = await fetch(`${bffUrl}/api/v1/servers/${serverId}`, {
      method: 'DELETE',
      headers: authHeaders(alice.accessToken),
    });
    assert.equal(res3.status, 204);
  });

  it('PATCH updates server icon through BFF', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId } = await createTestServer(alice.accessToken);

    const res = await fetch(`${bffUrl}/api/v1/servers/${serverId}`, {
      method: 'PATCH',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ icon: 'att-icon-001' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { server: { icon: string } };
    assert.equal(body.server.icon, 'att-icon-001');

    // Verify via GET
    const getRes = await fetch(`${bffUrl}/api/v1/servers/${serverId}`, {
      headers: authHeaders(alice.accessToken),
    });
    const getBody = await getRes.json() as { server: { icon: string } };
    assert.equal(getBody.server.icon, 'att-icon-001');
  });
});

// ─── Channels ───────────────────────────────────────────────

describe('BFF Channels', () => {
  it('creates channel and lists sorted by position', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId } = await createTestServer(accessToken);

    const res = await fetch(`${bffUrl}/api/v1/servers/${serverId}/channels`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: 'dev-chat' }),
    });
    assert.equal(res.status, 201);

    const listRes = await fetch(`${bffUrl}/api/v1/servers/${serverId}/channels`, {
      headers: authHeaders(accessToken),
    });
    const body = await listRes.json() as { channels: Array<{ name: string; position: number }> };
    assert.equal(body.channels.length, 2);
    assert.equal(body.channels[0]!.name, 'general');
    assert.equal(body.channels[1]!.name, 'dev-chat');
    assert.ok(body.channels[0]!.position < body.channels[1]!.position);
  });

  it('returns 403 for non-member', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId } = await createTestServer(alice.accessToken);

    const res = await fetch(`${bffUrl}/api/v1/servers/${serverId}/channels`, {
      headers: authHeaders(bob.accessToken),
    });
    assert.equal(res.status, 403);
  });
});

// ─── Messages ───────────────────────────────────────────────

describe('BFF Messages', () => {
  it('creates message and lists with cursor pagination', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(accessToken);
    const msgBase = `${bffUrl}/api/v1/servers/${serverId}/channels/${channelId}/messages`;

    // Create messages
    for (let i = 0; i < 5; i++) {
      await fetch(msgBase, {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify({ content: `Message ${i}` }),
      });
    }

    // Fetch with limit
    const res = await fetch(`${msgBase}?limit=3`, {
      headers: authHeaders(accessToken),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { messages: Array<{ _id: string; content: string }> };
    assert.equal(body.messages.length, 3);

    // Cursor-based pagination
    const cursor = body.messages[0]!._id;
    const res2 = await fetch(`${msgBase}?limit=3&before=${cursor}`, {
      headers: authHeaders(accessToken),
    });
    const body2 = await res2.json() as { messages: Array<{ content: string }> };
    assert.equal(body2.messages.length, 2);
  });

  it('author-only edit', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(alice.accessToken);
    const msgBase = `${bffUrl}/api/v1/servers/${serverId}/channels/${channelId}/messages`;

    // Create message as alice
    const createRes = await fetch(msgBase, {
      method: 'POST',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ content: 'Original' }),
    });
    const { message } = await createRes.json() as { message: { _id: string } };

    // Alice can edit
    const res = await fetch(`${msgBase}/${message._id}`, {
      method: 'PATCH',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ content: 'Edited' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { message: { content: string; editedAt: string } };
    assert.equal(body.message.content, 'Edited');
    assert.ok(body.message.editedAt);

    // Bob is not a member so can't edit (403)
    const res2 = await fetch(`${msgBase}/${message._id}`, {
      method: 'PATCH',
      headers: authHeaders(bob.accessToken),
      body: JSON.stringify({ content: 'Hacked' }),
    });
    assert.equal(res2.status, 403);
  });
});

// ─── Members (cross-service enrichment) ─────────────────────

describe('BFF Members', () => {
  it('GET enriches members with usernames from usersService', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId } = await createTestServer(alice.accessToken);

    // Bob joins the server via public join
    // First make it public by having alice update it
    await fetch(`${bffUrl}/api/v1/servers/${serverId}`, {
      method: 'PATCH',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ visibility: 'public' }),
    });
    await fetch(`${bffUrl}/api/v1/servers/${serverId}/members`, {
      method: 'POST',
      headers: authHeaders(bob.accessToken),
    });

    // Get members - should include username enrichment
    const res = await fetch(`${bffUrl}/api/v1/servers/${serverId}/members`, {
      headers: authHeaders(alice.accessToken),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { members: Array<{ userId: string; username: string; display_name: string | null; avatar_url: string | null }> };
    assert.equal(body.members.length, 2);

    const aliceMember = body.members.find(m => m.userId === alice.user.id);
    const bobMember = body.members.find(m => m.userId === bob.user.id);
    assert.ok(aliceMember);
    assert.ok(bobMember);
    assert.equal(aliceMember.username, 'alice');
    assert.equal(bobMember.username, 'bob');
    // avatar_url should be included in enrichment (null for users without avatars)
    assert.equal(aliceMember.avatar_url, null);
    assert.equal(bobMember.avatar_url, null);
  });

  it('joins public server and returns 409 on duplicate', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');

    // Create public server
    const createRes = await fetch(`${bffUrl}/api/v1/servers`, {
      method: 'POST',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ name: 'Public Server', visibility: 'public' }),
    });
    const { server } = await createRes.json() as { server: { _id: string } };

    // Bob joins
    const joinRes = await fetch(`${bffUrl}/api/v1/servers/${server._id}/members`, {
      method: 'POST',
      headers: authHeaders(bob.accessToken),
    });
    assert.equal(joinRes.status, 201);

    // Duplicate join
    const dupRes = await fetch(`${bffUrl}/api/v1/servers/${server._id}/members`, {
      method: 'POST',
      headers: authHeaders(bob.accessToken),
    });
    assert.equal(dupRes.status, 409);
  });

  it('self-leave', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');

    const createRes = await fetch(`${bffUrl}/api/v1/servers`, {
      method: 'POST',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ name: 'Public Server', visibility: 'public' }),
    });
    const { server } = await createRes.json() as { server: { _id: string } };

    // Bob joins then leaves
    await fetch(`${bffUrl}/api/v1/servers/${server._id}/members`, {
      method: 'POST',
      headers: authHeaders(bob.accessToken),
    });
    const leaveRes = await fetch(`${bffUrl}/api/v1/servers/${server._id}/members/${bob.user.id}`, {
      method: 'DELETE',
      headers: authHeaders(bob.accessToken),
    });
    assert.equal(leaveRes.status, 204);
  });
});

// ─── Invites ────────────────────────────────────────────────

describe('BFF Invites', () => {
  it('creates invite and joins via code', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId } = await createTestServer(alice.accessToken);

    // Create invite
    const res = await fetch(`${bffUrl}/api/v1/servers/${serverId}/invites`, {
      method: 'POST',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 201);
    const { invite } = await res.json() as { invite: { code: string } };
    assert.ok(invite.code);

    // Bob joins via invite
    const joinRes = await fetch(`${bffUrl}/api/v1/invites/${invite.code}/join`, {
      method: 'POST',
      headers: authHeaders(bob.accessToken),
    });
    assert.equal(joinRes.status, 201);
    const joinBody = await joinRes.json() as { member: { userId: string }; server: { _id: string } };
    assert.equal(joinBody.member.userId, bob.user.id);
    assert.equal(joinBody.server._id, serverId);
  });

  it('returns 410 for revoked invite', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId } = await createTestServer(alice.accessToken);

    const res = await fetch(`${bffUrl}/api/v1/servers/${serverId}/invites`, {
      method: 'POST',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({}),
    });
    const { invite } = await res.json() as { invite: { code: string } };

    // Revoke
    await fetch(`${bffUrl}/api/v1/servers/${serverId}/invites/${invite.code}`, {
      method: 'DELETE',
      headers: authHeaders(alice.accessToken),
    });

    // Try to join
    const joinRes = await fetch(`${bffUrl}/api/v1/invites/${invite.code}/join`, {
      method: 'POST',
      headers: authHeaders(bob.accessToken),
    });
    assert.equal(joinRes.status, 410);
  });
});

// ─── Attachments ────────────────────────────────────────────

describe('BFF Attachments', () => {
  it('uploads file and retrieves metadata', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');

    const fileContent = Buffer.from('hello world');
    const res = await fetch(`${bffUrl}/api/v1/attachments/upload?filename=test.txt`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'text/plain',
      },
      body: fileContent,
    });
    assert.equal(res.status, 201);
    const body = await res.json() as { attachment: { id: string; filename: string; status: string } };
    assert.equal(body.attachment.filename, 'test.txt');
    assert.equal(body.attachment.status, 'ready');

    // Retrieve metadata
    const getRes = await fetch(`${bffUrl}/api/v1/attachments/${body.attachment.id}`, {
      headers: authHeaders(accessToken),
    });
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json() as { attachment: { id: string; filename: string; url: string } };
    assert.equal(getBody.attachment.id, body.attachment.id);
    assert.equal(getBody.attachment.filename, 'test.txt');
    assert.ok(getBody.attachment.url, 'presigned URL should be present on retrieval');
  });

  it('creates message with attachment IDs', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(accessToken);

    // Upload an attachment
    const uploadRes = await fetch(`${bffUrl}/api/v1/attachments/upload?filename=doc.txt`, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'text/plain' },
      body: Buffer.from('hello'),
    });
    assert.equal(uploadRes.status, 201);
    const { attachment } = await uploadRes.json() as { attachment: { id: string } };

    // Send message with only attachmentIds
    const msgBase = `${bffUrl}/api/v1/servers/${serverId}/channels/${channelId}/messages`;
    const msgRes = await fetch(msgBase, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ attachmentIds: [attachment.id] }),
    });
    assert.equal(msgRes.status, 201);
    const msgBody = await msgRes.json() as { message: { content: string; attachmentIds: string[] } };
    assert.deepEqual(msgBody.message.attachmentIds, [attachment.id]);

    // Verify message appears in list
    const listRes = await fetch(msgBase, { headers: authHeaders(accessToken) });
    const listBody = await listRes.json() as { messages: Array<{ attachmentIds: string[] }> };
    assert.ok(listBody.messages.some(m => m.attachmentIds.includes(attachment.id)));
  });
});

// ─── Blocks ─────────────────────────────────────────────────

describe('BFF Blocks', () => {
  it('returns empty blocked list initially', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const res = await fetch(`${bffUrl}/api/v1/users/me/blocks`, {
      headers: authHeaders(accessToken),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { blockedIds: string[] };
    assert.deepEqual(body.blockedIds, []);
  });

  it('blocks a user and GET reflects the change', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');

    const blockRes = await fetch(`${bffUrl}/api/v1/users/me/blocks/${bob.user.id}`, {
      method: 'POST',
      headers: authHeaders(alice.accessToken),
    });
    assert.equal(blockRes.status, 200);

    const listRes = await fetch(`${bffUrl}/api/v1/users/me/blocks`, {
      headers: authHeaders(alice.accessToken),
    });
    assert.equal(listRes.status, 200);
    const body = await listRes.json() as { blockedIds: string[] };
    assert.ok(body.blockedIds.includes(bob.user.id));
  });

  it('unblocks a user and GET shows empty list again', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');

    // Block first
    await fetch(`${bffUrl}/api/v1/users/me/blocks/${bob.user.id}`, {
      method: 'POST',
      headers: authHeaders(alice.accessToken),
    });

    // Unblock
    const unblockRes = await fetch(`${bffUrl}/api/v1/users/me/blocks/${bob.user.id}`, {
      method: 'DELETE',
      headers: authHeaders(alice.accessToken),
    });
    assert.equal(unblockRes.status, 204);

    // Verify list is empty again
    const listRes = await fetch(`${bffUrl}/api/v1/users/me/blocks`, {
      headers: authHeaders(alice.accessToken),
    });
    assert.equal(listRes.status, 200);
    const body = await listRes.json() as { blockedIds: string[] };
    assert.deepEqual(body.blockedIds, []);
  });

  it('returns 401 without auth token', async () => {
    const res = await fetch(`${bffUrl}/api/v1/users/me/blocks`);
    assert.equal(res.status, 401);
  });
});
