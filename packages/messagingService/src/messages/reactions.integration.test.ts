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

type ReactionResponse = { message: { reactions: unknown[] } };
type MessageListResponse = { messages: Array<{ reactions: unknown[] }> };
type MessageWithContentResponse = { messages: Array<{ content: string; reactions: unknown[] }> };
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

async function createTestServer(userId: string, name = 'Test Server', visibility?: string): Promise<{ serverId: string; channelId: string }> {
  const res = await fetch(`${baseUrl}/servers`, {
    method: 'POST',
    headers: headersFor(userId),
    body: JSON.stringify({ name, ...(visibility != null ? { visibility } : {}) }),
  });
  const body = await res.json() as { server: { _id: string } };
  const serverId = body.server._id;

  const chRes = await fetch(`${baseUrl}/servers/${serverId}/channels`, {
    headers: headersFor(userId),
  });
  const chBody = await chRes.json() as { channels: Array<{ _id: string; name: string }> };
  const general = chBody.channels.find(c => c.name === 'general');
  return { serverId, channelId: general!._id };
}

async function createTestMessage(userId: string, serverId: string, channelId: string, content = 'Test message') {
  const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: headersFor(userId),
    body: JSON.stringify({ content }),
  });
  const body = await res.json() as { message: { _id: string } };
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

describe('Reactions', () => {
  it('adds a reaction and returns it in GET', async () => {
    const { serverId, channelId } = await createTestServer('user-1');
    const msg = await createTestMessage('user-1', serverId, channelId);

    const putRes = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}/reactions`, {
      method: 'PUT',
      headers: headersFor('user-1'),
      body: JSON.stringify({ emoji: '\u{1F44D}' }),
    });
    assert.equal(putRes.status, 200);
    const putBody = await putRes.json() as ReactionResponse;
    assert.equal(putBody.message.reactions.length, 1);
    assert.equal((putBody.message.reactions[0] as Record<string, unknown>).emoji, '\u{1F44D}');
    assert.deepEqual((putBody.message.reactions[0] as Record<string, unknown>).userIds, ['user-1']);

    // Verify in GET
    const getRes = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages`, {
      headers: headersFor('user-1'),
    });
    const getBody = await getRes.json() as MessageListResponse;
    assert.equal(getBody.messages[0]!.reactions.length, 1);
  });

  it('toggles off a reaction', async () => {
    const { serverId, channelId } = await createTestServer('user-1');
    const msg = await createTestMessage('user-1', serverId, channelId);

    // Add
    await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}/reactions`, {
      method: 'PUT',
      headers: headersFor('user-1'),
      body: JSON.stringify({ emoji: '\u{1F44D}' }),
    });

    // Toggle off
    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}/reactions`, {
      method: 'PUT',
      headers: headersFor('user-1'),
      body: JSON.stringify({ emoji: '\u{1F44D}' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as ReactionResponse;
    assert.equal(body.message.reactions.length, 0);
  });

  it('multiple users react with same emoji', async () => {
    const { serverId, channelId } = await createTestServer('user-1', 'Test Server', 'public');
    // Add user-2 as member
    await fetch(`${baseUrl}/servers/${serverId}/members`, {
      method: 'POST',
      headers: headersFor('user-2'),
    });

    const msg = await createTestMessage('user-1', serverId, channelId);

    await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}/reactions`, {
      method: 'PUT',
      headers: headersFor('user-1'),
      body: JSON.stringify({ emoji: '\u{1F44D}' }),
    });
    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}/reactions`, {
      method: 'PUT',
      headers: headersFor('user-2'),
      body: JSON.stringify({ emoji: '\u{1F44D}' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as ReactionResponse;
    assert.equal(body.message.reactions.length, 1);
    assert.equal(((body.message.reactions[0] as Record<string, unknown>).userIds as unknown[]).length, 2);
  });

  it('multiple different emojis on one message', async () => {
    const { serverId, channelId } = await createTestServer('user-1');
    const msg = await createTestMessage('user-1', serverId, channelId);

    for (const emoji of ['\u{1F44D}', '\u{1F525}', '\u2764\uFE0F']) {
      await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}/reactions`, {
        method: 'PUT',
        headers: headersFor('user-1'),
        body: JSON.stringify({ emoji }),
      });
    }

    const getRes = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages`, {
      headers: headersFor('user-1'),
    });
    const body = await getRes.json() as MessageListResponse;
    assert.equal(body.messages[0]!.reactions.length, 3);
  });

  it('enforces 10 emoji limit', async () => {
    const { serverId, channelId } = await createTestServer('user-1');
    const msg = await createTestMessage('user-1', serverId, channelId);

    const emojis = ['\u{1F44D}', '\u{1F44E}', '\u{1F600}', '\u{1F602}', '\u2764\uFE0F', '\u{1F525}', '\u{1F389}', '\u{1F914}', '\u{1F440}', '\u{1F680}'];
    for (const emoji of emojis) {
      await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}/reactions`, {
        method: 'PUT',
        headers: headersFor('user-1'),
        body: JSON.stringify({ emoji }),
      });
    }

    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}/reactions`, {
      method: 'PUT',
      headers: headersFor('user-1'),
      body: JSON.stringify({ emoji: '\u{1F195}' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as ErrorResponse;
    assert.equal(body.error.code, 'MAX_REACTIONS');
  });

  it('non-member cannot react', async () => {
    const { serverId, channelId } = await createTestServer('user-1');
    const msg = await createTestMessage('user-1', serverId, channelId);

    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}/reactions`, {
      method: 'PUT',
      headers: headersFor('user-999'),
      body: JSON.stringify({ emoji: '\u{1F44D}' }),
    });
    assert.equal(res.status, 403);
  });

  it('react to nonexistent message returns 404', async () => {
    const { serverId, channelId } = await createTestServer('user-1');

    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/000000000000000000000000/reactions`, {
      method: 'PUT',
      headers: headersFor('user-1'),
      body: JSON.stringify({ emoji: '\u{1F44D}' }),
    });
    assert.equal(res.status, 404);
  });

  it('reactions persist across message edits', async () => {
    const { serverId, channelId } = await createTestServer('user-1');
    const msg = await createTestMessage('user-1', serverId, channelId, 'Original');

    await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}/reactions`, {
      method: 'PUT',
      headers: headersFor('user-1'),
      body: JSON.stringify({ emoji: '\u{1F44D}' }),
    });

    await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${msg._id}`, {
      method: 'PATCH',
      headers: headersFor('user-1'),
      body: JSON.stringify({ content: 'Edited' }),
    });

    const getRes = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages`, {
      headers: headersFor('user-1'),
    });
    const body = await getRes.json() as MessageWithContentResponse;
    assert.equal(body.messages[0]!.content, 'Edited');
    assert.equal(body.messages[0]!.reactions.length, 1);
    assert.equal((body.messages[0]!.reactions[0] as Record<string, unknown>).emoji, '\u{1F44D}');
  });
});
