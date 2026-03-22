import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type postgres from 'postgres';
import type mongoose from 'mongoose';
import type { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';

// ─── Service state ──────────────────────────────────────────
let httpServer: HttpServer;
let io: SocketIOServer;
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

// Track sockets for cleanup
const activeSockets: ClientSocket[] = [];

// ─── Helpers ────────────────────────────────────────────────

interface RegisterResult {
  user: { id: string; username: string; email: string };
  accessToken: string;
  refreshToken: string;
}

async function registerUser(username: string, email: string, password: string): Promise<RegisterResult> {
  const res = await fetch(`${bffUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  assert.equal(res.status, 201, `register failed: ${res.status}`);
  return await res.json() as RegisterResult;
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

function connectSocket(token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(bffUrl, {
      transports: ['websocket'],
      auth: token ? { token } : {},
      forceNew: true,
    });
    activeSockets.push(socket);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

function waitForEvent<T>(socket: ClientSocket, event: string, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);
    const handler = (data: T) => {
      clearTimeout(timer);
      resolve(data);
    };
    socket.once(event, handler);
  });
}

async function disconnectAll(...sockets: ClientSocket[]): Promise<void> {
  await Promise.all(
    sockets.map(s => {
      if (!s.connected) return Promise.resolve();
      return new Promise<void>(resolve => {
        s.once('disconnect', () => resolve());
        s.disconnect();
      });
    }),
  );
}

// ─── Setup: start all 4 services + Socket.IO ───────────────

before(async () => {
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

  // 1. Start usersService
  process.env['DATABASE_URL'] = 'postgres://tone:tone_dev@localhost:5442/tone_users_test';
  const usersDb = await import(usersDbPath);
  usersSql = usersDb.sql;
  const usersApp = await import(usersAppPath);
  const usersResult = listenOnEphemeral(usersApp.app);
  usersServer = usersResult.server;
  const usersUrl = usersResult.url;

  // 2. Start attachmentsService
  process.env['DATABASE_URL'] = 'postgres://tone:tone_dev@localhost:5443/tone_attachments_test';
  const attachDb = await import(attachDbPath);
  attachmentsSql = attachDb.sql;
  const attachStorage = await import(attachStoragePath);
  await attachStorage.ensureBucket();
  const attachApp = await import(attachAppPath);
  const attachResult = listenOnEphemeral(attachApp.app);
  attachmentsServer = attachResult.server;
  const attachmentsUrl = attachResult.url;

  // 3. Start messagingService
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

  // 6. Start BFF with Socket.IO attached to raw HTTP server
  const { app } = await import('./app.js');
  const { setupSocketIO } = await import('./socket/index.js');
  httpServer = createServer(app);
  io = setupSocketIO(httpServer);
  await new Promise<void>(r => httpServer.listen(0, r));
  const { port } = httpServer.address() as AddressInfo;
  bffUrl = `http://localhost:${port}`;
});

after(async () => {
  // Disconnect any lingering sockets
  for (const s of activeSockets) {
    if (s.connected) s.disconnect();
  }
  activeSockets.length = 0;

  io?.close();
  httpServer?.closeAllConnections();
  usersServer?.closeAllConnections();
  messagingServer?.closeAllConnections();
  attachmentsServer?.closeAllConnections();
  httpServer?.close();
  usersServer?.close();
  messagingServer?.close();
  attachmentsServer?.close();
  await Promise.allSettled([
    usersSql?.end({ timeout: 1 }),
    attachmentsSql?.end({ timeout: 1 }),
    mongooseConnection?.connection.close(),
  ]);
  setTimeout(() => process.exit(0), 500);
});

beforeEach(async () => {
  // Disconnect sockets from previous test
  for (const s of activeSockets) {
    if (s.connected) s.disconnect();
  }
  activeSockets.length = 0;

  await Promise.all([
    usersSql`TRUNCATE users, credentials, refresh_tokens, email_verification_tokens, user_blocks CASCADE`,
    attachmentsSql`TRUNCATE attachments CASCADE`,
    ServerModel.deleteMany({}),
    ChannelModel.deleteMany({}),
    MessageModel.deleteMany({}),
    ServerMemberModel.deleteMany({}),
    InviteModel.deleteMany({}),
  ]);
});

// ─── Socket.IO Auth ─────────────────────────────────────────

describe('Socket.IO Auth', () => {
  it('rejects connection without token', async () => {
    const socket = ioClient(bffUrl, {
      transports: ['websocket'],
      auth: {},
      forceNew: true,
    });
    activeSockets.push(socket);

    const err = await waitForEvent<Error>(socket, 'connect_error');
    assert.match(err.message, /Authentication required/);
  });

  it('rejects connection with invalid token', async () => {
    const socket = ioClient(bffUrl, {
      transports: ['websocket'],
      auth: { token: 'invalid.jwt.token' },
      forceNew: true,
    });
    activeSockets.push(socket);

    const err = await waitForEvent<Error>(socket, 'connect_error');
    assert.match(err.message, /Invalid token/);
  });

  it('accepts connection with valid JWT', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const socket = await connectSocket(accessToken);
    assert.ok(socket.connected);
    await disconnectAll(socket);
  });
});

// ─── Socket.IO join_channel ─────────────────────────────────

describe('Socket.IO join_channel', () => {
  it('member joins and receives new_message', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(accessToken);

    const socket = await connectSocket(accessToken);
    socket.emit('join_channel', { serverId, channelId });

    // Wait for join to settle (server makes async membership HTTP call)
    await new Promise(r => setTimeout(r, 100));

    const msgPromise = waitForEvent<{ message: { content: string } }>(socket, 'new_message');
    socket.emit('send_message', { serverId, channelId, content: 'Hello world' });

    const msg = await msgPromise;
    assert.equal(msg.message.content, 'Hello world');

    await disconnectAll(socket);
  });

  it('non-member gets error event', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(alice.accessToken);

    const bobSocket = await connectSocket(bob.accessToken);
    const errorPromise = waitForEvent<{ message: string }>(bobSocket, 'error');
    bobSocket.emit('join_channel', { serverId, channelId });

    const err = await errorPromise;
    assert.equal(err.message, 'Not a member of this server');

    await disconnectAll(bobSocket);
  });
});

// ─── Socket.IO leave_channel ────────────────────────────────

describe('Socket.IO leave_channel', () => {
  it('after leaving, no longer receives new_message', async () => {
    const { accessToken, user } = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(accessToken);

    const socket1 = await connectSocket(accessToken);
    const socket2 = await connectSocket(accessToken);

    socket1.emit('join_channel', { serverId, channelId });
    socket2.emit('join_channel', { serverId, channelId });
    await new Promise(r => setTimeout(r, 100));

    // socket1 leaves
    socket1.emit('leave_channel', { serverId, channelId });
    await new Promise(r => setTimeout(r, 50));

    // Collect any messages socket1 might receive
    const strayMessages: unknown[] = [];
    socket1.on('new_message', (data: unknown) => strayMessages.push(data));

    // socket2 sends a message
    const msgPromise = waitForEvent<{ message: { content: string; authorId: string } }>(socket2, 'new_message');
    socket2.emit('send_message', { serverId, channelId, content: 'After leave' });

    const msg = await msgPromise;
    assert.equal(msg.message.content, 'After leave');
    assert.equal(msg.message.authorId, user.id);

    // Wait to confirm socket1 got nothing
    await new Promise(r => setTimeout(r, 300));
    assert.equal(strayMessages.length, 0);

    await disconnectAll(socket1, socket2);
  });
});

// ─── Socket.IO send_message ─────────────────────────────────

describe('Socket.IO send_message', () => {
  it('broadcasts new_message to all room members including sender', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(alice.accessToken);

    // Bob joins the server via public join
    await fetch(`${bffUrl}/api/v1/servers/${serverId}`, {
      method: 'PATCH',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ visibility: 'public' }),
    });
    await fetch(`${bffUrl}/api/v1/servers/${serverId}/members`, {
      method: 'POST',
      headers: authHeaders(bob.accessToken),
    });

    const aliceSocket = await connectSocket(alice.accessToken);
    const bobSocket = await connectSocket(bob.accessToken);

    aliceSocket.emit('join_channel', { serverId, channelId });
    bobSocket.emit('join_channel', { serverId, channelId });
    await new Promise(r => setTimeout(r, 100));

    const aliceMsgPromise = waitForEvent<{ message: { content: string; authorId: string } }>(aliceSocket, 'new_message');
    const bobMsgPromise = waitForEvent<{ message: { content: string; authorId: string } }>(bobSocket, 'new_message');

    aliceSocket.emit('send_message', { serverId, channelId, content: 'Hi everyone' });

    const [aliceMsg, bobMsg] = await Promise.all([aliceMsgPromise, bobMsgPromise]);
    assert.equal(aliceMsg.message.content, 'Hi everyone');
    assert.equal(aliceMsg.message.authorId, alice.user.id);
    assert.equal(bobMsg.message.content, 'Hi everyone');
    assert.equal(bobMsg.message.authorId, alice.user.id);

    await disconnectAll(aliceSocket, bobSocket);
  });

  it('does not reach sockets outside the room', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(alice.accessToken);

    // Bob joins server but not the socket room
    await fetch(`${bffUrl}/api/v1/servers/${serverId}`, {
      method: 'PATCH',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ visibility: 'public' }),
    });
    await fetch(`${bffUrl}/api/v1/servers/${serverId}/members`, {
      method: 'POST',
      headers: authHeaders(bob.accessToken),
    });

    const aliceSocket = await connectSocket(alice.accessToken);
    const bobSocket = await connectSocket(bob.accessToken);

    aliceSocket.emit('join_channel', { serverId, channelId });
    // Bob does NOT join the channel room
    await new Promise(r => setTimeout(r, 100));

    const strayMessages: unknown[] = [];
    bobSocket.on('new_message', (data: unknown) => strayMessages.push(data));

    const msgPromise = waitForEvent<{ message: { content: string } }>(aliceSocket, 'new_message');
    aliceSocket.emit('send_message', { serverId, channelId, content: 'Room only' });

    await msgPromise;
    await new Promise(r => setTimeout(r, 300));
    assert.equal(strayMessages.length, 0);

    await disconnectAll(aliceSocket, bobSocket);
  });

  it('broadcasts message with attachmentIds', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(accessToken);

    const socket = await connectSocket(accessToken);
    socket.emit('join_channel', { serverId, channelId });
    await new Promise(r => setTimeout(r, 100));

    const msgPromise = waitForEvent<{ message: { content: string; attachmentIds: string[] } }>(socket, 'new_message');
    socket.emit('send_message', { serverId, channelId, content: 'Check this out', attachmentIds: ['att-1'] });

    const msg = await msgPromise;
    assert.equal(msg.message.content, 'Check this out');
    assert.deepEqual(msg.message.attachmentIds, ['att-1']);

    await disconnectAll(socket);
  });

  it('silently ignores empty content', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(accessToken);

    const socket = await connectSocket(accessToken);
    socket.emit('join_channel', { serverId, channelId });
    await new Promise(r => setTimeout(r, 100));

    const received: unknown[] = [];
    socket.on('new_message', (data: unknown) => received.push(data));
    socket.on('error', (data: unknown) => received.push(data));

    socket.emit('send_message', { serverId, channelId, content: '' });

    await new Promise(r => setTimeout(r, 300));
    assert.equal(received.length, 0);

    await disconnectAll(socket);
  });

  it('silently ignores content over 4000 chars', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(accessToken);

    const socket = await connectSocket(accessToken);
    socket.emit('join_channel', { serverId, channelId });
    await new Promise(r => setTimeout(r, 100));

    const received: unknown[] = [];
    socket.on('new_message', (data: unknown) => received.push(data));
    socket.on('error', (data: unknown) => received.push(data));

    socket.emit('send_message', { serverId, channelId, content: 'x'.repeat(4001) });

    await new Promise(r => setTimeout(r, 300));
    assert.equal(received.length, 0);

    await disconnectAll(socket);
  });
});

// ─── Socket.IO typing ───────────────────────────────────────

describe('Socket.IO typing', () => {
  it('broadcasts to room members excluding sender', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(alice.accessToken);

    // Bob joins server
    await fetch(`${bffUrl}/api/v1/servers/${serverId}`, {
      method: 'PATCH',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ visibility: 'public' }),
    });
    await fetch(`${bffUrl}/api/v1/servers/${serverId}/members`, {
      method: 'POST',
      headers: authHeaders(bob.accessToken),
    });

    const aliceSocket = await connectSocket(alice.accessToken);
    const bobSocket = await connectSocket(bob.accessToken);

    aliceSocket.emit('join_channel', { serverId, channelId });
    bobSocket.emit('join_channel', { serverId, channelId });
    await new Promise(r => setTimeout(r, 100));

    // Alice should NOT receive her own typing event
    const aliceTyping: unknown[] = [];
    aliceSocket.on('typing', (data: unknown) => aliceTyping.push(data));

    const bobTypingPromise = waitForEvent<{ userId: string; channelId: string }>(bobSocket, 'typing');
    aliceSocket.emit('typing', { serverId, channelId });

    const typingData = await bobTypingPromise;
    assert.equal(typingData.userId, alice.user.id);
    assert.equal(typingData.channelId, channelId);

    // Verify alice didn't receive it
    await new Promise(r => setTimeout(r, 300));
    assert.equal(aliceTyping.length, 0);

    await disconnectAll(aliceSocket, bobSocket);
  });

  it('silently ignores invalid payload', async () => {
    const { accessToken } = await registerUser('alice', 'alice@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(accessToken);

    const socket = await connectSocket(accessToken);
    socket.emit('join_channel', { serverId, channelId });
    await new Promise(r => setTimeout(r, 100));

    const received: unknown[] = [];
    socket.on('typing', (data: unknown) => received.push(data));
    socket.on('error', (data: unknown) => received.push(data));

    // Missing channelId
    socket.emit('typing', { serverId });

    await new Promise(r => setTimeout(r, 300));
    assert.equal(received.length, 0);

    await disconnectAll(socket);
  });

  it('does not reach sockets outside the room', async () => {
    const alice = await registerUser('alice', 'alice@test.com', 'password123');
    const bob = await registerUser('bob', 'bob@test.com', 'password123');
    const { serverId, channelId } = await createTestServer(alice.accessToken);

    // Bob joins server but not channel room
    await fetch(`${bffUrl}/api/v1/servers/${serverId}`, {
      method: 'PATCH',
      headers: authHeaders(alice.accessToken),
      body: JSON.stringify({ visibility: 'public' }),
    });
    await fetch(`${bffUrl}/api/v1/servers/${serverId}/members`, {
      method: 'POST',
      headers: authHeaders(bob.accessToken),
    });

    const aliceSocket = await connectSocket(alice.accessToken);
    const bobSocket = await connectSocket(bob.accessToken);

    aliceSocket.emit('join_channel', { serverId, channelId });
    // Bob does NOT join channel room
    await new Promise(r => setTimeout(r, 100));

    const strayTyping: unknown[] = [];
    bobSocket.on('typing', (data: unknown) => strayTyping.push(data));

    aliceSocket.emit('typing', { serverId, channelId });

    await new Promise(r => setTimeout(r, 300));
    assert.equal(strayTyping.length, 0);

    await disconnectAll(aliceSocket, bobSocket);
  });
});
