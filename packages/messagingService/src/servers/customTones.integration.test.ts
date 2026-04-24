import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { connectDatabase } from '../config/database.js';
import { Server } from './server.model.js';
import { Channel } from '../channels/channel.model.js';
import { ServerMember } from '../members/serverMember.model.js';

let httpServer: HttpServer;
let baseUrl: string;
const HEADERS = { 'content-type': 'application/json', 'x-internal-key': 'dev-internal-key' };

function tokenFor(userId: string): string {
  return jwt.sign({ sub: userId }, process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production');
}

function headersFor(userId: string) {
  return { ...HEADERS, 'x-user-token': tokenFor(userId) };
}

async function createTestServer(userId: string, name = 'Tone Test Server'): Promise<string> {
  const res = await fetch(`${baseUrl}/servers`, {
    method: 'POST',
    headers: headersFor(userId),
    body: JSON.stringify({ name }),
  });
  const body = await res.json() as { server: { _id: string } };
  return body.server._id;
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
    ServerMember.deleteMany({}),
  ]);
});

describe('POST /servers/:serverId/tones — animation fields', () => {
  it('persists animation fields and returns them via GET', async () => {
    const serverId = await createTestServer('admin-1');

    const postRes = await fetch(`${baseUrl}/servers/${serverId}/tones`, {
      method: 'POST',
      headers: headersFor('admin-1'),
      body: JSON.stringify({
        key: 'vibe',
        label: 'Vibing',
        emoji: '✌️',
        colorLight: '#111111',
        colorDark: '#eeeeee',
        char: 'bounce',
        emojiSet: ['✌️', '🌟'],
        matchEmojis: ['✌️', '🎉'],
      }),
    });

    assert.equal(postRes.status, 201);

    const getRes = await fetch(`${baseUrl}/servers/${serverId}/tones`, {
      headers: headersFor('admin-1'),
    });

    assert.equal(getRes.status, 200);
    const getBody = await getRes.json() as { customTones: Array<{
      key: string;
      char?: string;
      emojiSet?: string[];
      matchEmojis?: string[];
    }> };
    assert.equal(getBody.customTones.length, 1);
    const tone = getBody.customTones[0]!;
    assert.equal(tone.char, 'bounce');
    assert.deepEqual(tone.emojiSet, ['✌️', '🌟']);
    assert.deepEqual(tone.matchEmojis, ['✌️', '🎉']);
  });

  it('POST with only original 6 fields still works (backward compat)', async () => {
    const serverId = await createTestServer('admin-2');

    const postRes = await fetch(`${baseUrl}/servers/${serverId}/tones`, {
      method: 'POST',
      headers: headersFor('admin-2'),
      body: JSON.stringify({
        key: 'calm',
        label: 'Calm',
        emoji: '😌',
        colorLight: '#aaaaaa',
        colorDark: '#333333',
      }),
    });

    assert.equal(postRes.status, 201);

    const getRes = await fetch(`${baseUrl}/servers/${serverId}/tones`, {
      headers: headersFor('admin-2'),
    });

    assert.equal(getRes.status, 200);
    const getBody = await getRes.json() as { customTones: Array<Record<string, unknown>> };
    assert.equal(getBody.customTones.length, 1);
    const tone = getBody.customTones[0]!;
    assert.equal('char' in tone ? tone['char'] : undefined, undefined);
    assert.equal('emojiSet' in tone ? tone['emojiSet'] : undefined, undefined);
    assert.equal('matchEmojis' in tone ? tone['matchEmojis'] : undefined, undefined);
  });

  it('POST with invalid char enum returns 400 INVALID_TONE', async () => {
    const serverId = await createTestServer('admin-3');

    const postRes = await fetch(`${baseUrl}/servers/${serverId}/tones`, {
      method: 'POST',
      headers: headersFor('admin-3'),
      body: JSON.stringify({
        key: 'bad',
        label: 'Bad',
        emoji: '💥',
        colorLight: '#ffffff',
        colorDark: '#000000',
        char: 'spin',
      }),
    });

    assert.equal(postRes.status, 400);
    const body = await postRes.json() as { error: { code: string } };
    assert.equal(body.error.code, 'INVALID_TONE');
  });

  it('Mongoose does not persist unknown fields like foo: bar', async () => {
    const serverId = await createTestServer('admin-4');

    const postRes = await fetch(`${baseUrl}/servers/${serverId}/tones`, {
      method: 'POST',
      headers: headersFor('admin-4'),
      body: JSON.stringify({
        key: 'extra',
        label: 'Extra',
        emoji: '🧪',
        colorLight: '#cccccc',
        colorDark: '#444444',
        foo: 'bar',
      }),
    });

    assert.equal(postRes.status, 201);

    const getRes = await fetch(`${baseUrl}/servers/${serverId}/tones`, {
      headers: headersFor('admin-4'),
    });

    assert.equal(getRes.status, 200);
    const getBody = await getRes.json() as { customTones: Array<Record<string, unknown>> };
    assert.equal(getBody.customTones.length, 1);
    const tone = getBody.customTones[0]!;
    assert.equal('foo' in tone ? tone['foo'] : undefined, undefined);
  });
});
