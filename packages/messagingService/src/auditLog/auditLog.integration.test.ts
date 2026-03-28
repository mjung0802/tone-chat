import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import mongoose from 'mongoose';
import { app } from '../app.js';
import { connectDatabase } from '../config/database.js';
import { Server } from '../servers/server.model.js';
import { Channel } from '../channels/channel.model.js';
import { ServerMember } from '../members/serverMember.model.js';
import { AuditLog } from './auditLog.model.js';
import { ServerBan } from '../bans/serverBan.model.js';

let httpServer: HttpServer;
let baseUrl: string;
const HEADERS = { 'content-type': 'application/json', 'x-internal-key': 'dev-internal-key' };

function headersFor(userId: string) {
  return { ...HEADERS, 'x-user-id': userId };
}

async function createTestServer(userId: string): Promise<{ serverId: string; channelId: string }> {
  const res = await fetch(`${baseUrl}/servers`, {
    method: 'POST',
    headers: headersFor(userId),
    body: JSON.stringify({ name: 'Test Server' }),
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

type AuditEntry = {
  _id: string;
  serverId: string;
  action: string;
  actorId: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

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
    ServerMember.deleteMany({}),
    AuditLog.deleteMany({}),
    ServerBan.deleteMany({}),
  ]);
});

// ─── Audit Log Retrieval ───────────────────────────────────

describe('GET /servers/:serverId/audit-log', () => {
  it('returns entries for admin', async () => {
    const { serverId } = await createTestServer('user-1');

    await AuditLog.create([
      { serverId, action: 'kick', actorId: 'user-1', targetId: 'user-2' },
      { serverId, action: 'ban', actorId: 'user-1', targetId: 'user-3', metadata: { reason: 'spam' } },
      { serverId, action: 'mute', actorId: 'user-1', targetId: 'user-4', metadata: { duration: 60 } },
    ]);

    const res = await fetch(`${baseUrl}/servers/${serverId}/audit-log`, {
      headers: headersFor('user-1'),
    });

    assert.equal(res.status, 200);
    const { entries } = await res.json() as { entries: AuditEntry[] };
    assert.equal(entries.length, 3);
    for (const entry of entries) {
      assert.equal(entry.serverId, serverId);
      assert.ok(entry.action);
      assert.ok(entry.actorId);
      assert.ok(entry.targetId);
      assert.ok(entry.createdAt);
    }
  });

  it('returns 403 for regular member', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2' });

    const res = await fetch(`${baseUrl}/servers/${serverId}/audit-log`, {
      headers: headersFor('user-2'),
    });
    assert.equal(res.status, 403);
  });

  it('returns 403 for non-member', async () => {
    const { serverId } = await createTestServer('user-1');

    const res = await fetch(`${baseUrl}/servers/${serverId}/audit-log`, {
      headers: headersFor('non-member'),
    });
    assert.equal(res.status, 403);
  });

  it('returns entries sorted newest-first', async () => {
    const { serverId } = await createTestServer('user-1');

    const now = Date.now();
    await AuditLog.create([
      { serverId, action: 'kick', actorId: 'a', targetId: 'b', createdAt: new Date(now - 2000) },
      { serverId, action: 'ban', actorId: 'a', targetId: 'c', createdAt: new Date(now) },
      { serverId, action: 'mute', actorId: 'a', targetId: 'd', createdAt: new Date(now - 1000) },
    ]);

    const res = await fetch(`${baseUrl}/servers/${serverId}/audit-log`, {
      headers: headersFor('user-1'),
    });
    const { entries } = await res.json() as { entries: AuditEntry[] };

    assert.equal(entries[0]!.action, 'ban');
    assert.equal(entries[1]!.action, 'mute');
    assert.equal(entries[2]!.action, 'kick');
  });

  it('defaults limit to 50', async () => {
    const { serverId } = await createTestServer('user-1');

    const docs = Array.from({ length: 60 }, (_, i) => ({
      serverId,
      action: 'kick' as const,
      actorId: 'a',
      targetId: `t-${i}`,
    }));
    await AuditLog.create(docs);

    const res = await fetch(`${baseUrl}/servers/${serverId}/audit-log`, {
      headers: headersFor('user-1'),
    });
    const { entries } = await res.json() as { entries: AuditEntry[] };
    assert.equal(entries.length, 50);
  });

  it('respects custom limit', async () => {
    const { serverId } = await createTestServer('user-1');

    const docs = Array.from({ length: 10 }, (_, i) => ({
      serverId,
      action: 'kick' as const,
      actorId: 'a',
      targetId: `t-${i}`,
    }));
    await AuditLog.create(docs);

    const res = await fetch(`${baseUrl}/servers/${serverId}/audit-log?limit=3`, {
      headers: headersFor('user-1'),
    });
    const { entries } = await res.json() as { entries: AuditEntry[] };
    assert.equal(entries.length, 3);
  });

  it('caps limit at 100', async () => {
    const { serverId } = await createTestServer('user-1');

    const docs = Array.from({ length: 110 }, (_, i) => ({
      serverId,
      action: 'kick' as const,
      actorId: 'a',
      targetId: `t-${i}`,
    }));
    await AuditLog.create(docs);

    const res = await fetch(`${baseUrl}/servers/${serverId}/audit-log?limit=200`, {
      headers: headersFor('user-1'),
    });
    const { entries } = await res.json() as { entries: AuditEntry[] };
    assert.equal(entries.length, 100);
  });

  it('paginates with before cursor', async () => {
    const { serverId } = await createTestServer('user-1');

    // Insert one-by-one so _ids are monotonically increasing (matching createdAt sort)
    for (let i = 0; i < 5; i++) {
      await AuditLog.create({ serverId, action: 'kick', actorId: 'a', targetId: `t-${i}` });
    }

    // Page 1
    const res1 = await fetch(`${baseUrl}/servers/${serverId}/audit-log?limit=2`, {
      headers: headersFor('user-1'),
    });
    const page1 = await res1.json() as { entries: AuditEntry[] };
    assert.equal(page1.entries.length, 2);

    // Page 2 using last entry's _id as cursor
    const cursor = page1.entries[1]!._id;
    const res2 = await fetch(`${baseUrl}/servers/${serverId}/audit-log?limit=2&before=${cursor}`, {
      headers: headersFor('user-1'),
    });
    const page2 = await res2.json() as { entries: AuditEntry[] };
    assert.equal(page2.entries.length, 2);

    // No overlap
    const page1Ids = new Set(page1.entries.map(e => e._id));
    for (const entry of page2.entries) {
      assert.ok(!page1Ids.has(entry._id), 'Pages should not overlap');
    }
  });

  it('does not leak entries from another server', async () => {
    const { serverId: serverA } = await createTestServer('user-1');
    const { serverId: serverB } = await createTestServer('user-1');

    await AuditLog.create([
      { serverId: serverA, action: 'kick', actorId: 'a', targetId: 'b' },
      { serverId: serverA, action: 'ban', actorId: 'a', targetId: 'c' },
      { serverId: serverB, action: 'mute', actorId: 'a', targetId: 'd' },
    ]);

    const res = await fetch(`${baseUrl}/servers/${serverA}/audit-log`, {
      headers: headersFor('user-1'),
    });
    const { entries } = await res.json() as { entries: AuditEntry[] };
    assert.equal(entries.length, 2);
    for (const entry of entries) {
      assert.equal(entry.serverId, serverA);
    }
  });
});

// ─── Moderation Actions Create Audit Entries ───────────────

describe('Moderation actions create audit entries', () => {
  it('mute creates audit entry with duration', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2' });

    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2/mute`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ duration: 60 }),
    });
    assert.equal(res.status, 200);

    const entries = await AuditLog.find({ serverId });
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.action, 'mute');
    assert.equal(entries[0]!.actorId, 'user-1');
    assert.equal(entries[0]!.targetId, 'user-2');
    assert.equal(entries[0]!.metadata.duration, 60);
  });

  it('unmute creates audit entry', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2', mutedUntil: new Date(Date.now() + 60000) });

    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2/mute`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 200);

    const entries = await AuditLog.find({ serverId, action: 'unmute' });
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.actorId, 'user-1');
    assert.equal(entries[0]!.targetId, 'user-2');
  });

  it('kick creates audit entry', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2' });

    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 204);

    const entries = await AuditLog.find({ serverId, action: 'kick' });
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.actorId, 'user-1');
    assert.equal(entries[0]!.targetId, 'user-2');
  });

  it('self-leave does not create audit entry', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2' });

    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2`, {
      method: 'DELETE',
      headers: headersFor('user-2'),
    });
    assert.equal(res.status, 204);

    const entries = await AuditLog.find({ serverId });
    assert.equal(entries.length, 0);
  });

  it('ban creates audit entry with reason', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2' });

    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2/ban`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ reason: 'spam' }),
    });
    assert.equal(res.status, 201);

    const entries = await AuditLog.find({ serverId, action: 'ban' });
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.actorId, 'user-1');
    assert.equal(entries[0]!.targetId, 'user-2');
    assert.equal(entries[0]!.metadata.reason, 'spam');
  });

  it('unban creates audit entry', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2' });

    // Ban first
    await fetch(`${baseUrl}/servers/${serverId}/members/user-2/ban`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ reason: 'spam' }),
    });

    // Unban
    const res = await fetch(`${baseUrl}/servers/${serverId}/bans/user-2`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 204);

    const entries = await AuditLog.find({ serverId, action: 'unban' });
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.actorId, 'user-1');
    assert.equal(entries[0]!.targetId, 'user-2');
  });

  it('promote member to mod creates audit entry', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2', role: 'member' });

    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2/promote`, {
      method: 'POST',
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 200);

    const entries = await AuditLog.find({ serverId, action: 'promote' });
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.metadata.fromRole, 'member');
    assert.equal(entries[0]!.metadata.toRole, 'mod');
  });

  it('promote mod to admin creates audit entry', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2', role: 'mod' });

    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2/promote`, {
      method: 'POST',
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 200);

    const entries = await AuditLog.find({ serverId, action: 'promote' });
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.metadata.fromRole, 'mod');
    assert.equal(entries[0]!.metadata.toRole, 'admin');
  });

  it('demote admin to mod creates audit entry', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2', role: 'admin' });

    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2/demote`, {
      method: 'POST',
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 200);

    const entries = await AuditLog.find({ serverId, action: 'demote' });
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.metadata.fromRole, 'admin');
    assert.equal(entries[0]!.metadata.toRole, 'mod');
  });

  it('demote mod to member creates audit entry', async () => {
    const { serverId } = await createTestServer('user-1');
    await ServerMember.create({ serverId, userId: 'user-2', role: 'mod' });

    const res = await fetch(`${baseUrl}/servers/${serverId}/members/user-2/demote`, {
      method: 'POST',
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 200);

    const entries = await AuditLog.find({ serverId, action: 'demote' });
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.metadata.fromRole, 'mod');
    assert.equal(entries[0]!.metadata.toRole, 'member');
  });
});

// ─── End-to-End Retrieval ──────────────────────────────────

describe('End-to-end: actions then retrieval', () => {
  it('multiple moderation actions are retrievable via audit-log endpoint', async () => {
    const { serverId } = await createTestServer('user-1');

    // Mute
    await ServerMember.create({ serverId, userId: 'user-2' });
    await fetch(`${baseUrl}/servers/${serverId}/members/user-2/mute`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ duration: 60 }),
    });

    // Unmute
    await fetch(`${baseUrl}/servers/${serverId}/members/user-2/mute`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });

    // Kick
    await fetch(`${baseUrl}/servers/${serverId}/members/user-2`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });

    // Ban (re-add member first)
    await ServerMember.create({ serverId, userId: 'user-3' });
    await fetch(`${baseUrl}/servers/${serverId}/members/user-3/ban`, {
      method: 'POST',
      headers: headersFor('user-1'),
      body: JSON.stringify({ reason: 'trolling' }),
    });

    // Unban
    await fetch(`${baseUrl}/servers/${serverId}/bans/user-3`, {
      method: 'DELETE',
      headers: headersFor('user-1'),
    });

    // Retrieve via API
    const res = await fetch(`${baseUrl}/servers/${serverId}/audit-log`, {
      headers: headersFor('user-1'),
    });
    assert.equal(res.status, 200);

    const { entries } = await res.json() as { entries: AuditEntry[] };
    assert.equal(entries.length, 5);

    // Newest first
    const actions = entries.map(e => e.action);
    assert.deepEqual(actions, ['unban', 'ban', 'kick', 'unmute', 'mute']);
  });
});
