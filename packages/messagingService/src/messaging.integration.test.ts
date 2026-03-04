import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { Server } from './servers/server.model.js';
import { Channel } from './channels/channel.model.js';
import { Message } from './messages/message.model.js';
import { ServerMember } from './members/serverMember.model.js';
import { Invite } from './invites/invite.model.js';

let httpServer: HttpServer;
let baseUrl: string;
const HEADERS = { 'content-type': 'application/json', 'x-internal-key': 'dev-internal-key' };

function headersFor(userId: string) {
  return { ...HEADERS, 'x-user-id': userId };
}

// Helper: create a server and return its ID + auto-created general channel ID
async function createTestServer(userId: string, name = 'Test Server'): Promise<{ serverId: string; channelId: string }> {
  const res = await fetch(`${baseUrl}/servers`, {
    method: 'POST',
    headers: headersFor(userId),
    body: JSON.stringify({ name }),
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

// ─── Servers ────────────────────────────────────────────────

describe('Server lifecycle', () => {
  it('POST creates server with auto #general channel and admin member', async () => {
    const res = await fetch(`${baseUrl}/servers`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ name: 'My Server' }),
    });

    assert.equal(res.status, 201);
    const body = await res.json() as { server: { _id: string; name: string; ownerId: string } };
    assert.equal(body.server.name, 'My Server');
    assert.equal(body.server.ownerId, 'user-1');

    // Verify #general channel was auto-created
    const channels = await Channel.find({ serverId: body.server._id });
    assert.equal(channels.length, 1);
    assert.equal(channels[0]!.name, 'general');

    // Verify admin membership
    const member = await ServerMember.findOne({ serverId: body.server._id, userId: 'user-1' });
    assert.ok(member);
    assert.ok(member.roles.includes('admin'));
  });

  it('GET lists servers the user is a member of', async () => {
    await createTestServer('user-1', 'Server A');
    await createTestServer('user-1', 'Server B');
    await createTestServer('user-2', 'Server C');

    const res = await fetch(`${baseUrl}/servers`, {
      headers: headersFor('user-1'),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { servers: Array<{ name: string }> };
    assert.equal(body.servers.length, 2);
  });

  it('PATCH is owner-only', async () => {
    const { serverId } = await createTestServer('user-1');

    // Owner can update
    const res = await fetch(`${baseUrl}/servers/${serverId}`, {
      method: 'PATCH',
      headers: headersFor('user-1'),
      body: JSON.stringify({ name: 'Renamed' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { server: { name: string } };
    assert.equal(body.server.name, 'Renamed');

    // Non-owner cannot
    const res2 = await fetch(`${baseUrl}/servers/${serverId}`, {
      method: 'PATCH',
      headers: headersFor('user-2'),
      body: JSON.stringify({ name: 'Hacked' }),
    });
    assert.equal(res2.status, 403);
  });

  it('DELETE is owner-only', async () => {
    const { serverId } = await createTestServer('user-1');

    // Non-owner cannot delete
    const res = await fetch(`${baseUrl}/servers/${serverId}`, {
      method: 'DELETE',
      headers: headersFor('user-2'),
    });
    assert.equal(res.status, 403);

    // Owner can delete
    const res2 = await fetch(`${baseUrl}/servers/${serverId}`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });
    assert.equal(res2.status, 204);
  });
});

// ─── Channels ───────────────────────────────────────────────

describe('Channel lifecycle', () => {
  it('POST creates channel and GET lists sorted by position', async () => {
    const { serverId } = await createTestServer('user-1');

    // Create additional channel
    const res = await fetch(`${baseUrl}/servers/${serverId}/channels`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ name: 'dev-chat' }),
    });
    assert.equal(res.status, 201);

    // List channels
    const listRes = await fetch(`${baseUrl}/servers/${serverId}/channels`, {
      headers: headersFor('user-1'),
    });
    const body = await listRes.json() as { channels: Array<{ name: string; position: number }> };
    assert.equal(body.channels.length, 2);
    assert.equal(body.channels[0]!.name, 'general');
    assert.equal(body.channels[1]!.name, 'dev-chat');
    // Positions should be ordered
    assert.ok(body.channels[0]!.position < body.channels[1]!.position);
  });

  it('PATCH and DELETE are admin-only', async () => {
    const { serverId, channelId } = await createTestServer('user-1');

    // Add non-admin member
    await ServerMember.create({ serverId, userId: 'user-2' });

    // Non-admin cannot update
    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}`, {
      method: 'PATCH',
      headers: headersFor('user-2'),
      body: JSON.stringify({ topic: 'hacked' }),
    });
    assert.equal(res.status, 403);

    // Admin can update
    const res2 = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}`, {
      method: 'PATCH',
      headers: headersFor('user-1'),
      body: JSON.stringify({ topic: 'Welcome!' }),
    });
    assert.equal(res2.status, 200);
  });

  it('DELETE: admin can delete, non-admin cannot', async () => {
    const { serverId } = await createTestServer('user-1');

    // Create a second channel to delete (can't delete general)
    const createRes = await fetch(`${baseUrl}/servers/${serverId}/channels`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ name: 'to-delete' }),
    });
    const { channel } = await createRes.json() as { channel: { _id: string } };

    // Add non-admin member
    await ServerMember.create({ serverId, userId: 'user-2' });

    // Non-admin cannot delete
    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channel._id}`, {
      method: 'DELETE',
      headers: headersFor('user-2'),
    });
    assert.equal(res.status, 403);

    // Admin can delete
    const res2 = await fetch(`${baseUrl}/servers/${serverId}/channels/${channel._id}`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });
    assert.equal(res2.status, 204);
  });

  it('returns 403 for non-member', async () => {
    const { serverId } = await createTestServer('user-1');

    const res = await fetch(`${baseUrl}/servers/${serverId}/channels`, {
      headers: headersFor('non-member'),
    });
    assert.equal(res.status, 403);
  });
});

// ─── Messages ───────────────────────────────────────────────

describe('Message lifecycle', () => {
  it('POST creates message (member required)', async () => {
    const { serverId, channelId } = await createTestServer('user-1');

    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ content: 'Hello world' }),
    });

    assert.equal(res.status, 201);
    const body = await res.json() as { message: { content: string; authorId: string } };
    assert.equal(body.message.content, 'Hello world');
    assert.equal(body.message.authorId, 'user-1');
  });

  it('GET returns messages with cursor pagination', async () => {
    const { serverId, channelId } = await createTestServer('user-1');

    // Create multiple messages
    for (let i = 0; i < 5; i++) {
      await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: headersFor('user-1'),
        body: JSON.stringify({ content: `Message ${i}` }),
      });
    }

    // Fetch with limit
    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages?limit=3`, {
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { messages: Array<{ _id: string; content: string }> };
    assert.equal(body.messages.length, 3);

    // Cursor-based: fetch before the first message in the previous page
    const cursor = body.messages[0]!._id;
    const res2 = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages?limit=3&before=${cursor}`, {
      headers: headersFor('user-1'),
    });
    const body2 = await res2.json() as { messages: Array<{ content: string }> };
    assert.equal(body2.messages.length, 2);
  });

  it('PATCH is author-only', async () => {
    const { serverId, channelId } = await createTestServer('user-1');

    const createRes = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ content: 'Original' }),
    });
    const { message } = await createRes.json() as { message: { _id: string } };

    // Author can edit
    const res = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${message._id}`, {
      method: 'PATCH',
      headers: headersFor('user-1'),
      body: JSON.stringify({ content: 'Edited' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { message: { content: string; editedAt: string } };
    assert.equal(body.message.content, 'Edited');
    assert.ok(body.message.editedAt);

    // Add user-2 as member so they pass requireMember check
    await ServerMember.create({ serverId, userId: 'user-2' });

    // Non-author cannot edit
    const res2 = await fetch(`${baseUrl}/servers/${serverId}/channels/${channelId}/messages/${message._id}`, {
      method: 'PATCH',
      headers: headersFor('user-2'),
      body: JSON.stringify({ content: 'Hacked' }),
    });
    assert.equal(res2.status, 403);
  });
});

// ─── Members ────────────────────────────────────────────────

describe('Member lifecycle', () => {
  it('POST joins a public server; 409 on duplicate', async () => {
    // Create a public server
    const res = await fetch(`${baseUrl}/servers`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ name: 'Public Server', visibility: 'public' }),
    });
    const { server: srv } = await res.json() as { server: { _id: string } };

    // user-2 joins
    const joinRes = await fetch(`${baseUrl}/servers/${srv._id}/members`, {
      method: 'POST',
      headers: headersFor('user-2'),
    });
    assert.equal(joinRes.status, 201);

    // Duplicate join
    const dupRes = await fetch(`${baseUrl}/servers/${srv._id}/members`, {
      method: 'POST',
      headers: headersFor('user-2'),
    });
    assert.equal(dupRes.status, 409);
  });

  it('GET lists members', async () => {
    const { serverId } = await createTestServer('user-1');

    const res = await fetch(`${baseUrl}/servers/${serverId}/members`, {
      headers: headersFor('user-1'),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { members: Array<{ userId: string }> };
    assert.equal(body.members.length, 1);
    assert.equal(body.members[0]!.userId, 'user-1');
  });

  it('PATCH is admin-only', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2' });

    // Non-admin cannot update
    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2`, {
      method: 'PATCH',
      headers: headersFor('user-2'),
      body: JSON.stringify({ nickname: 'Bob' }),
    });
    assert.equal(res.status, 403);

    // Admin can update
    const res2 = await fetch(`${baseUrl}/servers/${serverId}/members/user-2`, {
      method: 'PATCH',
      headers: headersFor('user-1'),
      body: JSON.stringify({ nickname: 'Bobby' }),
    });
    assert.equal(res2.status, 200);
    const body = await res2.json() as { member: { nickname: string } };
    assert.equal(body.member.nickname, 'Bobby');
  });

  it('GET single member; non-member cannot fetch', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2' });

    // Member can fetch another member
    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2`, {
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { member: { userId: string } };
    assert.equal(body.member.userId, 'user-2');

    // Non-member cannot fetch
    const res2 = await fetch(`${baseUrl}/servers/${serverId}/members/user-1`, {
      headers: headersFor('non-member'),
    });
    assert.equal(res2.status, 403);
  });

  it('DELETE: self-leave and admin kick', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2' });
    await ServerMember.create({ serverId, userId: 'user-3' });

    // Self-leave
    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2`, {
      method: 'DELETE',
      headers: headersFor('user-2'),
    });
    assert.equal(res.status, 204);

    // Admin kick
    const res2 = await fetch(`${baseUrl}/servers/${serverId}/members/user-3`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });
    assert.equal(res2.status, 204);
  });
});

// ─── Invites ────────────────────────────────────────────────

describe('Invite lifecycle', () => {
  it('POST creates invite; join via code', async () => {
    const { serverId } = await createTestServer('user-1');

    // Create invite (admin)
    const res = await fetch(`${baseUrl}/servers/${serverId}/invites`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 201);
    const { invite } = await res.json() as { invite: { code: string } };
    assert.ok(invite.code);

    // user-2 joins via invite code
    const joinRes = await fetch(`${baseUrl}/invites/${invite.code}/join`, {
      method: 'POST',
      headers: headersFor('user-2'),
    });
    assert.equal(joinRes.status, 201);
    const joinBody = await joinRes.json() as { member: { userId: string }; server: { _id: string } };
    assert.equal(joinBody.member.userId, 'user-2');
    assert.equal(joinBody.server._id, serverId);
  });

  it('increments uses on join', async () => {
    const { serverId } = await createTestServer('user-1');

    const res = await fetch(`${baseUrl}/servers/${serverId}/invites`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({}),
    });
    const { invite } = await res.json() as { invite: { code: string } };

    await fetch(`${baseUrl}/invites/${invite.code}/join`, {
      method: 'POST',
      headers: headersFor('user-2'),
    });

    const updated = await Invite.findOne({ code: invite.code });
    assert.equal(updated!.uses, 1);
  });

  it('returns 410 for revoked invite', async () => {
    const { serverId } = await createTestServer('user-1');

    const res = await fetch(`${baseUrl}/servers/${serverId}/invites`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({}),
    });
    const { invite } = await res.json() as { invite: { code: string } };

    // Revoke
    await fetch(`${baseUrl}/servers/${serverId}/invites/${invite.code}`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });

    // Try to join
    const joinRes = await fetch(`${baseUrl}/invites/${invite.code}/join`, {
      method: 'POST',
      headers: headersFor('user-2'),
    });
    assert.equal(joinRes.status, 410);
  });

  it('returns 410 for exhausted invite', async () => {
    const { serverId } = await createTestServer('user-1');

    const res = await fetch(`${baseUrl}/servers/${serverId}/invites`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ maxUses: 1 }),
    });
    const { invite } = await res.json() as { invite: { code: string } };

    // First join succeeds
    await fetch(`${baseUrl}/invites/${invite.code}/join`, {
      method: 'POST',
      headers: headersFor('user-2'),
    });

    // Second join fails (exhausted)
    const joinRes = await fetch(`${baseUrl}/invites/${invite.code}/join`, {
      method: 'POST',
      headers: headersFor('user-3'),
    });
    assert.equal(joinRes.status, 410);
  });

  it('GET lists active invites; non-admin cannot list', async () => {
    const { serverId } = await createTestServer('user-1');

    // Create two invites
    const res1 = await fetch(`${baseUrl}/servers/${serverId}/invites`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({}),
    });
    const { invite: invite1 } = await res1.json() as { invite: { code: string } };

    const res2 = await fetch(`${baseUrl}/servers/${serverId}/invites`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({}),
    });
    const { invite: invite2 } = await res2.json() as { invite: { code: string } };

    // Revoke the second invite
    await fetch(`${baseUrl}/servers/${serverId}/invites/${invite2.code}`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });

    // Admin can list invites — only active ones
    const listRes = await fetch(`${baseUrl}/servers/${serverId}/invites`, {
      headers: headersFor('user-1'),
    });
    assert.equal(listRes.status, 200);
    const body = await listRes.json() as { invites: Array<{ code: string }> };
    assert.equal(body.invites.length, 1);
    assert.equal(body.invites[0]!.code, invite1.code);

    // Non-admin cannot list
    await ServerMember.create({ serverId, userId: 'user-2' });
    const forbiddenRes = await fetch(`${baseUrl}/servers/${serverId}/invites`, {
      headers: headersFor('user-2'),
    });
    assert.equal(forbiddenRes.status, 403);
  });

  it('returns 409 for already-member', async () => {
    const { serverId } = await createTestServer('user-1');

    const res = await fetch(`${baseUrl}/servers/${serverId}/invites`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({}),
    });
    const { invite } = await res.json() as { invite: { code: string } };

    // Owner (already a member) tries to join via invite
    const joinRes = await fetch(`${baseUrl}/invites/${invite.code}/join`, {
      method: 'POST',
      headers: headersFor('user-1'),
    });
    assert.equal(joinRes.status, 409);
  });
});

// ─── Internal Auth ─────────────────────────────────────────

describe('internalAuth middleware', () => {
  it('returns 401 for wrong x-internal-key', async () => {
    const res = await fetch(`${baseUrl}/servers`, {
      headers: { 'x-internal-key': 'wrong-key', 'x-user-id': 'user-1' },
    });
    assert.equal(res.status, 401);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });
});
