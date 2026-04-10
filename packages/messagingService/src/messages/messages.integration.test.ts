import mongoose from 'mongoose';
import assert from 'node:assert/strict';
import type { Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { Channel } from '../channels/channel.model.js';
import { connectDatabase } from '../config/database.js';
import { Invite } from '../invites/invite.model.js';
import { ServerMember } from '../members/serverMember.model.js';
import { Server } from '../servers/server.model.js';
import { Message } from './message.model.js';

type MessageResponse = { message: { _id: string; content: string; editedAt?: string } };
type MessagesListResponse = { messages: Array<{ _id: string; content: string }> };
type ErrorResponse = { error: { code: string } };

let httpServer: HttpServer;
let baseUrl: string;
const HEADERS = { 'content-type': 'application/json', 'x-internal-key': 'dev-internal-key' };

function tokenFor(userId: string): string {
  return jwt.sign(
    { sub: userId },
    process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  );
}

function headersFor(userId: string) {
  return { ...HEADERS, 'x-user-token': tokenFor(userId) };
}

async function createTestServer(userId: string, visibility?: string): Promise<{ serverId: string; channelId: string }> {
  const res = await fetch(`${baseUrl}/servers`, {
    method: 'POST',
    headers: headersFor(userId),
    body: JSON.stringify({ name: 'Test Server', ...(visibility != null ? { visibility } : {}) }),
  });
  const body = await res.json() as { server: { _id: string } };
  const serverId = body.server._id;

  const chRes = await fetch(`${baseUrl}/servers/${serverId}/channels`, {
    headers: headersFor(userId),
  });
  const chBody = await chRes.json() as { channels: Array<{ _id: string; name: string }> };
  const general = chBody.channels.find((c) => c.name === 'general');
  return { serverId, channelId: general!._id };
}

async function createTestMessage(userId: string, serverId: string, channelId: string, content = 'Test message') {
  const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: headersFor(userId),
    body: JSON.stringify({ content }),
  });
  const body = await res.json() as MessageResponse;
  return body.message;
}

before(async () => {
  await connectDatabase();
  httpServer = app.listen(0);
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});

after(async () => {
  httpServer.close();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Promise.all([
    Server.deleteMany({}),
    Channel.deleteMany({}),
    Message.deleteMany({}),
    ServerMember.deleteMany({}),
    Invite.deleteMany({}),
  ]);
});

describe('DELETE /servers/:sid/channels/:cid/messages/:mid', () => {
  it('returns 204 when author deletes their own message', async () => {
    const { serverId, channelId } = await createTestServer('user-1');
    const msg = await createTestMessage('user-1', serverId, channelId, 'hello');

    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 204);
  });

  it('message no longer appears in GET after deletion', async () => {
    const { serverId, channelId } = await createTestServer('user-1');
    const msg = await createTestMessage('user-1', serverId, channelId, 'to be deleted');

    await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });

    const getRes = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages`, {
      headers: headersFor('user-1'),
    });
    const body = await getRes.json() as MessagesListResponse;
    assert.equal(body.messages.length, 0);
  });

  it('returns 403 when a different member tries to delete', async () => {
    const { serverId, channelId } = await createTestServer('user-1', 'public');
    const msg = await createTestMessage('user-1', serverId, channelId, 'secret');

    // Add user-2 as member via join
    await fetch(`${baseUrl}/servers/${serverId}/members`, {
      method: 'POST',
      headers: headersFor('user-2'),
    });

    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}`, {
      method: 'DELETE',
      headers: headersFor('user-2'),
    });
    assert.equal(res.status, 403);
    const body = await res.json() as ErrorResponse;
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  it('returns 404 for a non-existent message id', async () => {
    const { serverId, channelId } = await createTestServer('user-1');

    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/000000000000000000000000`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 404);
    const body = await res.json() as ErrorResponse;
    assert.equal(body.error.code, 'MESSAGE_NOT_FOUND');
  });

  it('non-member cannot delete', async () => {
    const { serverId, channelId } = await createTestServer('user-1');
    const msg = await createTestMessage('user-1', serverId, channelId);

    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}`, {
      method: 'DELETE',
      headers: headersFor('user-999'),
    });
    assert.equal(res.status, 403);
  });
});
