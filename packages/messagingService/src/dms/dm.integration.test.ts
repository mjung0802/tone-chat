import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { connectDatabase } from '../config/database.js';
import { DirectConversation } from './conversation.model.js';
import { DirectMessage } from './directMessage.model.js';

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

const USER_A = 'user-aaa-111';
const USER_B = 'user-bbb-222';
const USER_C = 'user-ccc-333';

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
    DirectConversation.deleteMany({}),
    DirectMessage.deleteMany({}),
  ]);
});

describe('POST /dms/:otherUserId', () => {
  it('creates a new conversation (200)', async () => {
    const res = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { conversation: { _id: string; participantIds: string[] } };
    assert.ok(body.conversation._id);
    assert.ok(body.conversation.participantIds.includes(USER_A));
    assert.ok(body.conversation.participantIds.includes(USER_B));
  });

  it('returns existing conversation on second call (idempotent, 200)', async () => {
    const res1 = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const body1 = await res1.json() as { conversation: { _id: string } };
    const firstId = body1.conversation._id;

    const res2 = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    assert.equal(res2.status, 200);
    const body2 = await res2.json() as { conversation: { _id: string } };
    assert.equal(body2.conversation._id, firstId);
  });

  it('returns 400 when trying to message yourself', async () => {
    const res = await fetch(`${baseUrl}/dms/${USER_A}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'INVALID_USER_ID');
  });
});

describe('GET /dms', () => {
  it('lists conversations for the user', async () => {
    // Create two conversations for USER_A
    await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    await fetch(`${baseUrl}/dms/${USER_C}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });

    const res = await fetch(`${baseUrl}/dms`, {
      headers: headersFor(USER_A),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { conversations: Array<{ _id: string }> };
    assert.equal(body.conversations.length, 2);
  });

  it('includes lastMessage preview when conversation has messages', async () => {
    // Create conversation
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    // Send a message
    await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({ content: 'hello from integration test' }),
    });

    // List conversations — lastMessage should be populated
    const res = await fetch(`${baseUrl}/dms`, {
      headers: headersFor(USER_A),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { conversations: Array<{ _id: string; lastMessage: { content: string } | null }> };
    assert.equal(body.conversations.length, 1);
    assert.ok(body.conversations[0]?.lastMessage, 'lastMessage should not be null');
    assert.equal(body.conversations[0]?.lastMessage?.content, 'hello from integration test');
  });

  it('returns empty list when user has no conversations', async () => {
    const res = await fetch(`${baseUrl}/dms`, {
      headers: headersFor(USER_A),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { conversations: Array<{ _id: string }> };
    assert.deepEqual(body.conversations, []);
  });
});

describe('GET /dms/:conversationId', () => {
  it('returns conversation for participant', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    const res = await fetch(`${baseUrl}/dms/${conversation._id}`, {
      headers: headersFor(USER_A),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { conversation: { _id: string } };
    assert.equal(body.conversation._id, conversation._id);
  });

  it('returns 403 for non-participant', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    const res = await fetch(`${baseUrl}/dms/${conversation._id}`, {
      headers: headersFor(USER_C),
    });

    assert.equal(res.status, 403);
  });
});

describe('POST /dms/:conversationId/messages', () => {
  it('sends a DM message (201)', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    const res = await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({ content: 'Hello there!' }),
    });

    assert.equal(res.status, 201);
    const body = await res.json() as { message: { _id: string; content: string; authorId: string } };
    assert.ok(body.message._id);
    assert.equal(body.message.content, 'Hello there!');
    assert.equal(body.message.authorId, USER_A);
  });

  it('returns 400 when content and attachments are both missing', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    const res = await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'MISSING_FIELDS');
  });

  it('returns 403 for non-participant trying to send', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    const res = await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      method: 'POST',
      headers: headersFor(USER_C),
      body: JSON.stringify({ content: 'Intruder message' }),
    });

    assert.equal(res.status, 403);
  });
});

describe('PATCH /dms/:conversationId/messages/:messageId', () => {
  it('edits a message (200)', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    const msgRes = await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({ content: 'Original content' }),
    });
    const { message } = await msgRes.json() as { message: { _id: string } };

    const editRes = await fetch(`${baseUrl}/dms/${conversation._id}/messages/${message._id}`, {
      method: 'PATCH',
      headers: headersFor(USER_A),
      body: JSON.stringify({ content: 'Edited content' }),
    });

    assert.equal(editRes.status, 200);
    const editBody = await editRes.json() as { message: { content: string; editedAt: string | null } };
    assert.equal(editBody.message.content, 'Edited content');
    assert.ok(editBody.message.editedAt !== null);
  });

  it('returns 403 when editing another user\'s message', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    const msgRes = await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({ content: 'Alice message' }),
    });
    const { message } = await msgRes.json() as { message: { _id: string } };

    const editRes = await fetch(`${baseUrl}/dms/${conversation._id}/messages/${message._id}`, {
      method: 'PATCH',
      headers: headersFor(USER_B),
      body: JSON.stringify({ content: 'Hijacked' }),
    });

    assert.equal(editRes.status, 403);
  });
});

describe('PUT /dms/:conversationId/messages/:messageId/reactions', () => {
  it('adds a reaction (200)', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    const msgRes = await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({ content: 'React to this' }),
    });
    const { message } = await msgRes.json() as { message: { _id: string } };

    const reactRes = await fetch(`${baseUrl}/dms/${conversation._id}/messages/${message._id}/reactions`, {
      method: 'PUT',
      headers: headersFor(USER_B),
      body: JSON.stringify({ emoji: '👍' }),
    });

    assert.equal(reactRes.status, 200);
    const reactBody = await reactRes.json() as { message: { reactions: Array<{ emoji: string; userIds: string[] }> } };
    assert.equal(reactBody.message.reactions.length, 1);
    assert.equal(reactBody.message.reactions[0]!.emoji, '👍');
    assert.ok(reactBody.message.reactions[0]!.userIds.includes(USER_B));
  });
});

describe('GET /dms/:conversationId/messages', () => {
  it('lists messages with cursor pagination', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    // Send 3 messages
    await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({ content: 'Message 1' }),
    });
    await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({ content: 'Message 2' }),
    });
    await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({ content: 'Message 3' }),
    });

    const res = await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      headers: headersFor(USER_A),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { messages: Array<{ content: string }> };
    assert.equal(body.messages.length, 3);
    // Messages returned in ascending order (oldest first)
    assert.equal(body.messages[0]!.content, 'Message 1');
    assert.equal(body.messages[2]!.content, 'Message 3');
  });

  it('respects limit query param', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    for (let i = 0; i < 5; i++) {
      await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
        method: 'POST',
        headers: headersFor(USER_A),
        body: JSON.stringify({ content: `Message ${i + 1}` }),
      });
    }

    const res = await fetch(`${baseUrl}/dms/${conversation._id}/messages?limit=3`, {
      headers: headersFor(USER_A),
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { messages: Array<{ content: string }> };
    assert.equal(body.messages.length, 3);
  });

  it('returns 403 for non-participant', async () => {
    const createRes = await fetch(`${baseUrl}/dms/${USER_B}`, {
      method: 'POST',
      headers: headersFor(USER_A),
      body: JSON.stringify({}),
    });
    const { conversation } = await createRes.json() as { conversation: { _id: string } };

    const res = await fetch(`${baseUrl}/dms/${conversation._id}/messages`, {
      headers: headersFor(USER_C),
    });

    assert.equal(res.status, 403);
  });
});
