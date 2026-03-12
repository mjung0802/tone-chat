# Mentions and Replies Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add @mention ping notifications and message reply functionality to tone-chat.

**Architecture:** Extend the Message model with `replyTo` (snapshot subdocument) and `mentions` (userId array). Use user-level Socket.IO rooms (`user:<userId>`) for cross-channel mention notifications. Client adds autocomplete dropdown for @mentions, reply preview bar in MessageInput, and reply indicator on sent messages.

**Tech Stack:** MongoDB/Mongoose, Express 5, Socket.IO 4, React Native (Expo 55), React Native Paper v5, TanStack Query v5, Zustand v5

**Spec:** `docs/superpowers/specs/2026-03-12-mentions-and-replies-design.md`

---

## Chunk 1: Backend — Data Model + Reply/Mentions on Create

### Task 1: Extend Message Model with replyTo and mentions

**Files:**
- Modify: `packages/messagingService/src/messages/message.model.ts`

- [ ] **Step 1: Add replyTo and mentions to IMessage interface**

In `packages/messagingService/src/messages/message.model.ts`, add to the `IMessage` interface after `reactions`:

```typescript
replyTo?: {
  messageId: string;
  authorId: string;
  authorName: string;
  content: string;
};
mentions: string[];
```

- [ ] **Step 2: Add replyTo and mentions to the Mongoose schema**

In the `messageSchema` definition, add after the `reactions` field:

```typescript
replyTo: {
  type: {
    messageId: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    content: { type: String, required: true },
  },
  _id: false,
},
mentions: { type: [String], default: [] },
```

- [ ] **Step 3: Add index on mentions**

After the existing `messageSchema.index({ channelId: 1, createdAt: -1 })` line, add:

```typescript
messageSchema.index({ mentions: 1 });
```

- [ ] **Step 4: Run unit tests to verify no regressions**

Run: `pnpm --filter messagingservice test`
Expected: All existing tests pass (new fields are optional/defaulted)

- [ ] **Step 5: Commit**

```bash
git add packages/messagingService/src/messages/message.model.ts
git commit -m "feat(messagingService): add replyTo and mentions fields to message model"
```

---

### Task 2: Add reply/mentions processing to createMessage controller

**Files:**
- Modify: `packages/messagingService/src/messages/messages.controller.ts`
- Test: `packages/messagingService/src/messages/messages.controller.test.ts`

- [ ] **Step 1: Write failing tests for mentions validation**

Add to `packages/messagingService/src/messages/messages.controller.test.ts`, inside a new `describe('createMessage — mentions')` block after the existing `createMessage` describe:

```typescript
describe('createMessage — mentions', () => {
  beforeEach(() => mockMessageCreate.mock.resetCalls());

  it('stores mentions array when provided', async () => {
    const message = { _id: 'm1', content: 'hey @user', mentions: ['u2', 'u3'] };
    mockMessageCreate.mock.mockImplementation(async () => message);

    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'hey @user', mentions: ['u2', 'u3'] },
    }), res);
    assert.equal(res.statusCode, 201);
    const createArg = mockMessageCreate.mock.calls[0]!.arguments[0] as Record<string, unknown>;
    assert.deepEqual(createArg.mentions, ['u2', 'u3']);
  });

  it('returns 400 for invalid mentions (non-array)', async () => {
    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'hello', mentions: 'not-an-array' },
    }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'INVALID_MENTIONS');
  });

  it('returns 400 for too many mentions (>20)', async () => {
    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'hello', mentions: Array.from({ length: 21 }, (_, i) => `u${i}`) },
    }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'INVALID_MENTIONS');
  });

  it('returns 400 for mention with string >36 chars', async () => {
    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'hello', mentions: ['a'.repeat(37)] },
    }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'INVALID_MENTIONS');
  });

  it('returns 400 for non-string replyToId (NoSQL injection guard)', async () => {
    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'hello', replyToId: { $gt: '' } },
    }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'INVALID_REPLY_TO');
  });

  it('defaults mentions to empty array when not provided', async () => {
    const message = { _id: 'm1', content: 'hello', mentions: [] };
    mockMessageCreate.mock.mockImplementation(async () => message);

    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'hello' },
    }), res);
    assert.equal(res.statusCode, 201);
    const createArg = mockMessageCreate.mock.calls[0]!.arguments[0] as Record<string, unknown>;
    assert.deepEqual(createArg.mentions, []);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter messagingservice test`
Expected: New tests fail (mentions not yet handled in controller)

- [ ] **Step 3: Write failing tests for replyTo processing**

Add a mock for `Message.findOne` (already exists as `mockMessageFindOne`) and `ServerMember.findOne`. At the top of the test file, add a mock for ServerMember:

```typescript
const mockServerMemberFindOne = mock.fn<AnyFn>();

mock.module('../members/serverMember.model.js', {
  namedExports: {
    ServerMember: {
      findOne: mockServerMemberFindOne,
    },
  },
});
```

Then add a new describe block:

```typescript
describe('createMessage — replyTo', () => {
  beforeEach(() => {
    mockMessageCreate.mock.resetCalls();
    mockMessageFindOne.mock.resetCalls();
    mockServerMemberFindOne.mock.resetCalls();
  });

  it('stores replyTo snapshot when replyToId is valid', async () => {
    const original = { _id: 'orig1', authorId: 'u-author', content: 'original message' };
    mockMessageFindOne.mock.mockImplementation(async () => original);
    mockServerMemberFindOne.mock.mockImplementation(async () => ({ nickname: null, userId: 'u-author' }));

    const created = { _id: 'm1', content: 'reply', replyTo: { messageId: 'orig1', authorId: 'u-author', authorName: 'u-author', content: 'original message' }, mentions: ['u-author'] };
    mockMessageCreate.mock.mockImplementation(async () => created);

    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'reply', replyToId: 'orig1' },
    }), res);
    assert.equal(res.statusCode, 201);
    const createArg = mockMessageCreate.mock.calls[0]!.arguments[0] as Record<string, unknown>;
    assert.ok(createArg.replyTo);
    const replyTo = createArg.replyTo as { messageId: string; authorId: string };
    assert.equal(replyTo.messageId, 'orig1');
    assert.equal(replyTo.authorId, 'u-author');
  });

  it('returns 404 when replyToId message not found', async () => {
    mockMessageFindOne.mock.mockImplementation(async () => null);

    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'reply', replyToId: 'nonexistent' },
    }), res);
    assert.equal(res.statusCode, 404);
    assert.equal(res._json.error.code, 'REPLY_TARGET_NOT_FOUND');
  });

  it('auto-adds original author to mentions and deduplicates', async () => {
    const original = { _id: 'orig1', authorId: 'u-author', content: 'original' };
    mockMessageFindOne.mock.mockImplementation(async () => original);
    mockServerMemberFindOne.mock.mockImplementation(async () => ({ nickname: null, userId: 'u-author' }));

    const created = { _id: 'm1', content: 'reply', replyTo: {}, mentions: ['u-author'] };
    mockMessageCreate.mock.mockImplementation(async () => created);

    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'reply', replyToId: 'orig1', mentions: ['u-author', 'u2'] },
    }), res);
    assert.equal(res.statusCode, 201);
    const createArg = mockMessageCreate.mock.calls[0]!.arguments[0] as Record<string, unknown>;
    const mentions = createArg.mentions as string[];
    // u-author should appear only once despite being in both replyTo and explicit mentions
    assert.equal(mentions.filter((m) => m === 'u-author').length, 1);
    assert.ok(mentions.includes('u2'));
  });

  it('uses nickname > display_name > username for authorName', async () => {
    const original = { _id: 'orig1', authorId: 'u-author', content: 'original' };
    mockMessageFindOne.mock.mockImplementation(async () => original);
    mockServerMemberFindOne.mock.mockImplementation(async () => ({
      nickname: 'Cool Nick',
      userId: 'u-author',
    }));

    const created = { _id: 'm1', content: 'reply', replyTo: { authorName: 'Cool Nick' }, mentions: ['u-author'] };
    mockMessageCreate.mock.mockImplementation(async () => created);

    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'reply', replyToId: 'orig1' },
    }), res);
    assert.equal(res.statusCode, 201);
    const createArg = mockMessageCreate.mock.calls[0]!.arguments[0] as Record<string, unknown>;
    const replyTo = createArg.replyTo as { authorName: string };
    assert.equal(replyTo.authorName, 'Cool Nick');
  });

  it('truncates replyTo content to 100 chars', async () => {
    const longContent = 'a'.repeat(200);
    const original = { _id: 'orig1', authorId: 'u-author', content: longContent };
    mockMessageFindOne.mock.mockImplementation(async () => original);
    mockServerMemberFindOne.mock.mockImplementation(async () => ({ nickname: null, userId: 'u-author' }));

    const created = { _id: 'm1', content: 'reply', replyTo: {}, mentions: ['u-author'] };
    mockMessageCreate.mock.mockImplementation(async () => created);

    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'reply', replyToId: 'orig1' },
    }), res);
    const createArg = mockMessageCreate.mock.calls[0]!.arguments[0] as Record<string, unknown>;
    const replyTo = createArg.replyTo as { content: string };
    assert.equal(replyTo.content.length, 100);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm --filter messagingservice test`
Expected: New replyTo tests fail

- [ ] **Step 5: Implement mentions validation and replyTo processing in createMessage**

Edit `packages/messagingService/src/messages/messages.controller.ts`. Add import for ServerMember at the top:

```typescript
import { ServerMember } from '../members/serverMember.model.js';
```

Replace the `createMessage` function body with:

```typescript
export async function createMessage(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const { serverId, channelId } = req.params;
  const { content, attachmentIds, replyToId, mentions: rawMentions } = req.body as {
    content: string;
    attachmentIds?: string[];
    replyToId?: string;
    mentions?: unknown;
  };

  if (!content && (!attachmentIds || attachmentIds.length === 0)) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'content or attachments required', status: 400 } });
    return;
  }

  // Validate mentions
  let mentions: string[] = [];
  if (rawMentions !== undefined) {
    if (
      !Array.isArray(rawMentions) ||
      rawMentions.length > 20 ||
      !rawMentions.every((m: unknown) => typeof m === 'string' && m.length <= 36)
    ) {
      res.status(400).json({ error: { code: 'INVALID_MENTIONS', message: 'mentions must be an array of up to 20 strings (max 36 chars each)', status: 400 } });
      return;
    }
    mentions = rawMentions as string[];
  }

  // Validate replyToId type (NoSQL injection guard)
  if (replyToId !== undefined && typeof replyToId !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_REPLY_TO', message: 'replyToId must be a string', status: 400 } });
    return;
  }

  // Process replyTo
  let replyTo: { messageId: string; authorId: string; authorName: string; content: string } | undefined;
  if (replyToId && typeof replyToId === 'string') {
    const original = await Message.findOne({ _id: replyToId, channelId, serverId });
    if (!original) {
      res.status(404).json({ error: { code: 'REPLY_TARGET_NOT_FOUND', message: 'Reply target message not found', status: 404 } });
      return;
    }

    // Resolve author name: nickname > userId fallback
    // Note: display_name and username come from usersService (not available in messagingService).
    // The BFF enriches member data with username/display_name for client reads, but messagingService
    // only has ServerMember.nickname. Follow-up: enrich reply snapshots with display_name via BFF.
    let authorName = original.authorId;
    const member = await ServerMember.findOne({ serverId, userId: original.authorId });
    if (member) {
      authorName = member.nickname ?? original.authorId;
    }

    replyTo = {
      messageId: String(original._id),
      authorId: original.authorId,
      authorName,
      content: original.content.slice(0, 100),
    };

    // Auto-add original author to mentions (dedup)
    if (!mentions.includes(original.authorId)) {
      mentions = [...mentions, original.authorId];
    }
  }

  const message = await Message.create({
    channelId,
    serverId,
    authorId: userId,
    content,
    attachmentIds: attachmentIds ?? [],
    mentions,
    ...(replyTo ? { replyTo } : {}),
  });

  res.status(201).json({ message });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter messagingservice test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/messagingService/src/messages/messages.controller.ts packages/messagingService/src/messages/messages.controller.test.ts
git commit -m "feat(messagingService): add reply and mentions support to createMessage"
```

---

## Chunk 2: BFF — User Rooms + Mention Events + Socket Validation

### Task 3: Join user rooms on socket connection

**Files:**
- Modify: `packages/server/src/socket/index.ts`

- [ ] **Step 1: Add user room join on connection**

In `packages/server/src/socket/index.ts`, inside the `io.on('connection', ...)` callback, after the `console.log` line (line 36), add:

```typescript
// Join user-level room for targeted events (mentions)
void socket.join(`user:${userId}`);
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/socket/index.ts
git commit -m "feat(server): join user-level socket room on connection for mention notifications"
```

---

### Task 4: Create shared mention event emitter

**Files:**
- Create: `packages/server/src/messages/mentions.helper.ts`
- Test: `packages/server/src/messages/mentions.helper.test.ts`

- [ ] **Step 1: Write failing tests for emitMentionEvents**

Create `packages/server/src/messages/mentions.helper.test.ts`:

```typescript
import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockGetMember = mock.fn<AnyFn>();
mock.module('../members/members.client.js', {
  namedExports: { getMember: mockGetMember },
});

const { emitMentionEvents } = await import('./mentions.helper.js');

describe('emitMentionEvents', () => {
  let io: any;
  let emittedEvents: Array<{ room: string; event: string; data: unknown }>;

  beforeEach(() => {
    mockGetMember.mock.resetCalls();
    emittedEvents = [];
    io = {
      to: mock.fn((room: string) => ({
        emit: mock.fn((event: string, data: unknown) => {
          emittedEvents.push({ room, event, data });
        }),
      })),
    };
  });

  it('emits mention event to each mentioned user room', async () => {
    mockGetMember.mock.mockImplementation(async () => ({ status: 200 }));

    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', ['user2', 'user3']);

    assert.equal(emittedEvents.length, 2);
    assert.equal(emittedEvents[0]!.room, 'user:user2');
    assert.equal(emittedEvents[0]!.event, 'mention');
    assert.deepEqual(emittedEvents[0]!.data, { messageId: 'msg1', channelId: 'ch1', serverId: 'srv1', authorId: 'sender1' });
    assert.equal(emittedEvents[1]!.room, 'user:user3');
  });

  it('excludes sender from mention events', async () => {
    mockGetMember.mock.mockImplementation(async () => ({ status: 200 }));

    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', ['sender1', 'user2']);

    assert.equal(emittedEvents.length, 1);
    assert.equal(emittedEvents[0]!.room, 'user:user2');
  });

  it('skips non-members silently', async () => {
    mockGetMember.mock.mockImplementation(async (_uid: string, _sid: string, targetId: string) => {
      if (targetId === 'user2') return { status: 200 };
      return { status: 404 };
    });

    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', ['user2', 'nonmember']);

    assert.equal(emittedEvents.length, 1);
    assert.equal(emittedEvents[0]!.room, 'user:user2');
  });

  it('does nothing for empty mentions', async () => {
    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', []);

    assert.equal(emittedEvents.length, 0);
    assert.equal(mockGetMember.mock.callCount(), 0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tone-chat-server test`
Expected: FAIL — module not found

- [ ] **Step 3: Implement emitMentionEvents**

Create `packages/server/src/messages/mentions.helper.ts`:

```typescript
import type { Server } from 'socket.io';
import { getMember } from '../members/members.client.js';

export async function emitMentionEvents(
  io: Server,
  senderId: string,
  serverId: string,
  channelId: string,
  messageId: string,
  mentions: string[],
): Promise<void> {
  const uniqueMentions = [...new Set(mentions)].filter((uid) => uid !== senderId);
  if (uniqueMentions.length === 0) return;

  await Promise.all(
    uniqueMentions.map(async (userId) => {
      const result = await getMember(senderId, serverId, userId);
      if (result.status !== 200) return;

      io.to(`user:${userId}`).emit('mention', {
        messageId,
        channelId,
        serverId,
        authorId: senderId,
      });
    }),
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter tone-chat-server test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/messages/mentions.helper.ts packages/server/src/messages/mentions.helper.test.ts
git commit -m "feat(server): add shared emitMentionEvents helper"
```

---

### Task 5: Update socket send_message handler

**Files:**
- Modify: `packages/server/src/messages/messages.socket.ts`
- Modify: `packages/server/src/messages/messages.socket.test.ts`

- [ ] **Step 1: Write failing tests for replyToId and mentions in send_message**

Add to `packages/server/src/messages/messages.socket.test.ts`. First, add a mock for the mentions helper at the top alongside existing mocks:

```typescript
const mockEmitMentionEvents = mock.fn<AnyFn>();
mock.module('./mentions.helper.js', {
  namedExports: { emitMentionEvents: mockEmitMentionEvents },
});
```

Reset it in the `beforeEach`:

```typescript
mockEmitMentionEvents.mock.resetCalls();
```

Then add these tests inside the `send_message` describe:

```typescript
it('passes replyToId and mentions to createMessage', async () => {
  const msgData = { serverId: 's1', channelId: 'c1', content: 'hello', replyToId: 'orig1', mentions: ['u2'] };
  const responseData = { message: { _id: 'm1', content: 'hello', mentions: ['u2'] } };
  mockCreateMessage.mock.mockImplementation(async () => ({ status: 201, data: responseData }));
  mockEmitMentionEvents.mock.mockImplementation(async () => {});

  const ioEmit = mock.fn();
  io.to = mock.fn(() => ({ emit: ioEmit }));

  await handlers['send_message']!(msgData);

  const createArgs = mockCreateMessage.mock.calls[0]!.arguments;
  const body = createArgs[3] as Record<string, unknown>;
  assert.equal(body.replyToId, 'orig1');
  assert.deepEqual(body.mentions, ['u2']);
});

it('calls emitMentionEvents after successful create', async () => {
  const responseData = { message: { _id: 'm1', content: 'hello', mentions: ['u2', 'u3'] } };
  mockCreateMessage.mock.mockImplementation(async () => ({ status: 201, data: responseData }));
  mockEmitMentionEvents.mock.mockImplementation(async () => {});

  const ioEmit = mock.fn();
  io.to = mock.fn(() => ({ emit: ioEmit }));

  await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'hello', mentions: ['u2', 'u3'] });

  assert.equal(mockEmitMentionEvents.mock.callCount(), 1);
  const args = mockEmitMentionEvents.mock.calls[0]!.arguments;
  assert.equal(args[1], 'user-1'); // senderId
  assert.equal(args[2], 's1');     // serverId
  assert.equal(args[3], 'c1');     // channelId
  assert.equal(args[4], 'm1');     // messageId
  assert.deepEqual(args[5], ['u2', 'u3']); // mentions
});

it('does not call emitMentionEvents when no mentions', async () => {
  const responseData = { message: { _id: 'm1', content: 'hello', mentions: [] } };
  mockCreateMessage.mock.mockImplementation(async () => ({ status: 201, data: responseData }));

  const ioEmit = mock.fn();
  io.to = mock.fn(() => ({ emit: ioEmit }));

  await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'hello' });

  assert.equal(mockEmitMentionEvents.mock.callCount(), 0);
});

it('validates replyToId is a non-empty string', async () => {
  await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'hello', replyToId: '' });
  assert.equal(mockCreateMessage.mock.callCount(), 0);
});

it('validates mentions is an array of strings with max 20', async () => {
  await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'hello', mentions: 'not-array' });
  assert.equal(mockCreateMessage.mock.callCount(), 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tone-chat-server test`
Expected: New tests fail

- [ ] **Step 3: Update isValidSendMessage type guard**

In `packages/server/src/messages/messages.socket.ts`, update the `isValidSendMessage` function to accept optional `replyToId` and `mentions`. Add these checks after the existing `attachmentIds` validation:

```typescript
function isValidSendMessage(data: unknown): data is { serverId: string; channelId: string; content: string; attachmentIds?: string[]; replyToId?: string; mentions?: string[] } {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d['serverId'] !== 'string' || typeof d['channelId'] !== 'string') return false;
  if (typeof d['content'] !== 'string' || d['content'].length < 1 || d['content'].length > 4000) return false;
  if (d['attachmentIds'] !== undefined) {
    if (!Array.isArray(d['attachmentIds'])) return false;
    if (d['attachmentIds'].length > 6) return false;
    if (!d['attachmentIds'].every((id: unknown) => typeof id === 'string')) return false;
  }
  if (d['replyToId'] !== undefined) {
    if (typeof d['replyToId'] !== 'string' || d['replyToId'].length === 0) return false;
  }
  if (d['mentions'] !== undefined) {
    if (!Array.isArray(d['mentions'])) return false;
    if (d['mentions'].length > 20) return false;
    if (!d['mentions'].every((m: unknown) => typeof m === 'string')) return false;
  }
  return true;
}
```

- [ ] **Step 4: Update send_message handler to pass new fields and emit mentions**

Add import at the top of `messages.socket.ts`:

```typescript
import { emitMentionEvents } from './mentions.helper.js';
```

Update the `send_message` handler to pass new fields and emit mention events:

```typescript
socket.on('send_message', async (data: unknown) => {
  if (!isValidSendMessage(data)) return;

  const body: Record<string, unknown> = {
    content: data.content,
    attachmentIds: data.attachmentIds,
  };
  if (data.replyToId) body.replyToId = data.replyToId;
  if (data.mentions) body.mentions = data.mentions;

  const result = await messagesClient.createMessage(userId, data.serverId, data.channelId, body);

  if (result.status === 201) {
    const room = `server:${data.serverId}:channel:${data.channelId}`;
    io.to(room).emit('new_message', result.data);

    // Emit mention events to mentioned users
    const msg = (result.data as { message: { _id: string; mentions?: string[] } }).message;
    const mentions = msg.mentions ?? [];
    if (mentions.length > 0) {
      await emitMentionEvents(io, userId, data.serverId, data.channelId, msg._id, mentions);
    }
  }
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter tone-chat-server test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/messages/messages.socket.ts packages/server/src/messages/messages.socket.test.ts
git commit -m "feat(server): pass replyToId/mentions through socket handler and emit mention events"
```

---

### Task 6: Update BFF HTTP message route to emit mention events

**Files:**
- Modify: `packages/server/src/messages/messages.routes.ts`

- [ ] **Step 1: Update POST / handler to emit mention events after create**

The `req.body` already passes through to messagingService (which now handles replyToId + mentions). We just need to emit mention events after the response.

Edit `packages/server/src/messages/messages.routes.ts`:

```typescript
import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import * as client from './messages.client.js';
import { emitMentionEvents } from './mentions.helper.js';

export const messagesRouter = Router({ mergeParams: true });

// Store io reference for mention events
let ioRef: import('socket.io').Server | null = null;
export function setIO(io: import('socket.io').Server): void {
  ioRef = io;
}

messagesRouter.post('/', async (req: AuthRequest, res) => {
  const result = await client.createMessage(req.userId!, req.params['serverId'] as string, req.params['channelId'] as string, req.body as Record<string, unknown>);

  if (result.status === 201 && ioRef) {
    const msg = (result.data as { message: { _id: string; mentions?: string[] } }).message;
    const mentions = msg.mentions ?? [];
    if (mentions.length > 0) {
      await emitMentionEvents(ioRef, req.userId!, req.params['serverId'] as string, req.params['channelId'] as string, msg._id, mentions);
    }
  }

  res.status(result.status).json(result.data);
});
```

Keep the remaining routes unchanged.

- [ ] **Step 2: Wire setIO in socket setup**

In `packages/server/src/socket/index.ts`, add import and call `setIO` after creating the io instance:

```typescript
import { setIO } from '../messages/messages.routes.js';
```

Then after `const io = new Server(httpServer, { ... })`, add:

```typescript
setIO(io);
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter tone-chat-server test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/messages/messages.routes.ts packages/server/src/socket/index.ts
git commit -m "feat(server): emit mention events from HTTP message route"
```

---

## Chunk 3: Client Types + Reply UI in MessageBubble

### Task 7: Update client types for mentions and replies

**Files:**
- Modify: `packages/client/src/types/models.ts`
- Modify: `packages/client/src/types/api.types.ts`
- Modify: `packages/client/src/types/socket.types.ts`

- [ ] **Step 1: Add replyTo and mentions to Message type**

In `packages/client/src/types/models.ts`, add to the `Message` interface after `reactions`:

```typescript
replyTo?: { messageId: string; authorId: string; authorName: string; content: string } | undefined;
mentions?: string[] | undefined;
```

- [ ] **Step 2: Update SendMessageRequest**

In `packages/client/src/types/api.types.ts`, update `SendMessageRequest`:

```typescript
export interface SendMessageRequest {
  content: string;
  attachmentIds?: string[] | undefined;
  replyToId?: string | undefined;
  mentions?: string[] | undefined;
}
```

- [ ] **Step 3: Update socket types**

In `packages/client/src/types/socket.types.ts`, update `SendMessagePayload`:

```typescript
export interface SendMessagePayload {
  serverId: string;
  channelId: string;
  content: string;
  attachmentIds?: string[];
  replyToId?: string;
  mentions?: string[];
}
```

Add `MentionEvent` interface:

```typescript
export interface MentionEvent {
  messageId: string;
  channelId: string;
  serverId: string;
  authorId: string;
}
```

Update `ServerToClientEvents`:

```typescript
export interface ServerToClientEvents {
  new_message: (message: Message) => void;
  typing: (event: TypingEvent) => void;
  reaction_updated: (data: { message: Message }) => void;
  mention: (event: MentionEvent) => void;
}
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter tone-chat-client typecheck`
Expected: Pass (new fields are optional)

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/types/models.ts packages/client/src/types/api.types.ts packages/client/src/types/socket.types.ts
git commit -m "feat(client): add mention and reply types to models, api, and socket types"
```

---

### Task 8: Add reply indicator and mention highlight to MessageBubble

**Files:**
- Modify: `packages/client/src/components/chat/MessageBubble.tsx`

- [ ] **Step 1: Add new props to MessageBubbleProps**

Add to the interface:

```typescript
onReply?: ((message: Message) => void) | undefined;
onReplyPress?: ((messageId: string) => void) | undefined;
highlighted?: boolean | undefined;
```

Add to the destructured props in the component function.

- [ ] **Step 2: Add reply indicator above message content**

Inside the `bubbleWrapper` View, before the content text, add:

```tsx
{message.replyTo ? (
  <Pressable
    onPress={() => onReplyPress?.(message.replyTo!.messageId)}
    style={styles.replyIndicator}
    accessibilityRole="button"
    accessibilityLabel={`Reply to ${message.replyTo.authorName ?? 'Unknown User'}`}
  >
    <Icon source="reply" size={12} color={theme.colors.onSurfaceVariant} />
    <Text variant="labelSmall" style={[styles.replyAuthor, { color: theme.colors.primary }]} numberOfLines={1}>
      @{message.replyTo.authorName ?? 'Unknown User'}
    </Text>
    <Text variant="labelSmall" style={[styles.replyContent, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
      {message.replyTo.content}
    </Text>
  </Pressable>
) : null}
```

Add the required imports at the top: `Pressable` from `react-native`, `Icon` from `react-native-paper`.

- [ ] **Step 3: Add mention highlighting**

Check if the current user is mentioned. Modify the `bubbleStyle` logic:

```typescript
const isMentioned = message.mentions?.includes(currentUserId ?? '') ?? false;

const bubbleStyle = isOwn
  ? [styles.bubble, styles.ownBubble, { backgroundColor: theme.colors.primaryContainer }]
  : [
      styles.bubble,
      { backgroundColor: theme.colors.surfaceVariant },
      isMentioned && { borderLeftWidth: 3, borderLeftColor: theme.colors.tertiary },
    ];
```

- [ ] **Step 4: Add highlight flash for scroll-to-message**

Wrap the container View with a highlighted background when the `highlighted` prop is true:

```typescript
const containerStyle = [
  styles.container,
  isOwn ? styles.ownContainer : null,
  highlighted && { backgroundColor: theme.colors.tertiaryContainer + '40' },
];
```

Use `containerStyle` instead of the inline style array on the outer `<View>`.

- [ ] **Step 5: Add reply button next to reaction button**

In the hover button area, add a reply button above/below the existing emoji button:

```tsx
{(onAddReaction || onReply) ? (
  <View style={styles.hoverButtonPlaceholder}>
    {hovered ? (
      <View style={styles.hoverButtonColumn}>
        {onReply ? (
          <IconButton
            icon="reply"
            size={18}
            onPress={() => onReply(message)}
            accessibilityLabel="Reply to message"
            style={[styles.hoverReactionButton, { backgroundColor: theme.colors.surface }]}
            testID="hover-reply-button"
          />
        ) : null}
        {onAddReaction ? (
          <IconButton
            icon="emoticon-outline"
            size={18}
            onPress={() => onAddReaction(message._id)}
            accessibilityLabel="Add reaction"
            style={[styles.hoverReactionButton, { backgroundColor: theme.colors.surface }]}
            testID="hover-reaction-button"
          />
        ) : null}
      </View>
    ) : null}
  </View>
) : null}
```

- [ ] **Step 6: Add styles for reply indicator and hover column**

Add to the `StyleSheet.create`:

```typescript
replyIndicator: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  marginBottom: 4,
  paddingBottom: 4,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: 'rgba(0,0,0,0.1)',
},
replyAuthor: {
  fontWeight: '600',
  flexShrink: 0,
},
replyContent: {
  flex: 1,
  opacity: 0.7,
},
hoverButtonColumn: {
  flexDirection: 'column',
  gap: 2,
},
```

Update `hoverButtonPlaceholder` to fit two buttons: `width: 34, height: 72` (two 34px buttons + 4px gap).

- [ ] **Step 7: Run typecheck and tests**

Run: `pnpm --filter tone-chat-client typecheck && pnpm --filter tone-chat-client test`
Expected: Pass

- [ ] **Step 8: Commit**

```bash
git add packages/client/src/components/chat/MessageBubble.tsx
git commit -m "feat(client): add reply indicator, mention highlight, and reply button to MessageBubble"
```

---

## Chunk 4: Reply Preview + Mention Autocomplete in MessageInput

### Task 9: Add reply preview bar to MessageInput

**Files:**
- Modify: `packages/client/src/components/chat/MessageInput.tsx`

- [ ] **Step 1: Add new props**

Add to `MessageInputProps`:

```typescript
replyTarget?: {
  messageId: string;
  authorId: string;
  authorName: string;
  content: string;
} | undefined;
onCancelReply?: (() => void) | undefined;
```

Destructure in the component function.

- [ ] **Step 2: Add ReplyPreview inline component**

Above the `return` statement (or as a separate internal component), add the reply preview bar that renders between `AttachmentPreview` and the input row:

```tsx
{replyTarget ? (
  <View style={[styles.replyPreview, { backgroundColor: theme.colors.surfaceVariant }]}>
    <Icon source="reply" size={16} color={theme.colors.primary} />
    <View style={styles.replyPreviewText}>
      <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
        Replying to @{replyTarget.authorName}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
        {replyTarget.content.slice(0, 80)}
      </Text>
    </View>
    <IconButton
      icon="close"
      size={16}
      onPress={() => onCancelReply?.()}
      accessibilityLabel="Cancel reply"
    />
  </View>
) : null}
```

Import `Icon` from `react-native-paper`.

Place this JSX after `<AttachmentPreview>` and before the `<View style={styles.container}>` input row.

- [ ] **Step 3: Update handleSend to include replyToId**

Update `onSend` signature in props to:

```typescript
onSend: (content: string, attachmentIds: string[], options?: { replyToId?: string; mentions?: string[] }) => void;
```

Update the `handleSend` callback:

```typescript
const handleSend = useCallback(() => {
  const trimmed = text.trim();
  const ids = pendingAttachments
    .filter((a) => a.attachment)
    .map((a) => a.attachment!.id);

  if (!trimmed && ids.length === 0) return;

  const options: { replyToId?: string; mentions?: string[] } = {};
  if (replyTarget) {
    options.replyToId = replyTarget.messageId;
  }

  onSend(trimmed, ids, options);
  setText('');
  setPendingAttachments([]);
}, [text, pendingAttachments, onSend, replyTarget]);
```

- [ ] **Step 4: Add styles**

```typescript
replyPreview: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 4,
  gap: 8,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: 'rgba(0,0,0,0.1)',
},
replyPreviewText: {
  flex: 1,
},
```

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter tone-chat-client typecheck`
Expected: Pass

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/components/chat/MessageInput.tsx
git commit -m "feat(client): add reply preview bar and replyToId support to MessageInput"
```

---

### Task 10: Create MentionAutocomplete component

**Files:**
- Create: `packages/client/src/components/chat/MentionAutocomplete.tsx`

- [ ] **Step 1: Create the component**

Create `packages/client/src/components/chat/MentionAutocomplete.tsx`:

```tsx
import React, { useMemo } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { ServerMember } from '../../types/models';

interface MentionAutocompleteProps {
  text: string;
  cursorPosition: number;
  members: ServerMember[];
  onSelect: (member: ServerMember, mentionStart: number, mentionEnd: number) => void;
}

function getMentionQuery(text: string, cursor: number): { query: string; start: number; end: number } | null {
  // Scan backwards from cursor to find '@'
  let i = cursor - 1;
  while (i >= 0) {
    const char = text[i];
    if (char === '@') {
      const query = text.slice(i + 1, cursor);
      // Only trigger if '@' is at start or preceded by whitespace
      if (i === 0 || /\s/.test(text[i - 1] ?? '')) {
        return { query, start: i, end: cursor };
      }
      return null;
    }
    if (/\s/.test(char ?? '')) return null;
    i--;
  }
  return null;
}

const MAX_RESULTS = 5;

export function MentionAutocomplete({ text, cursorPosition, members, onSelect }: MentionAutocompleteProps) {
  const theme = useTheme();

  const mention = useMemo(() => getMentionQuery(text, cursorPosition), [text, cursorPosition]);

  const filtered = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return members
      .filter((m) => {
        const name = (m.nickname ?? m.display_name ?? m.username ?? '').toLowerCase();
        const uname = (m.username ?? '').toLowerCase();
        return name.includes(q) || uname.includes(q);
      })
      .slice(0, MAX_RESULTS);
  }, [mention, members]);

  if (!mention || filtered.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.userId}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item, mention.start, mention.end)}
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: theme.colors.surfaceVariant }]}
            accessibilityRole="button"
            accessibilityLabel={`Mention ${item.nickname ?? item.display_name ?? item.username}`}
          >
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {item.nickname ?? item.display_name ?? item.username}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              @{item.username}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

export { getMentionQuery };
```

- [ ] **Step 2: Add styles**

At the bottom of the file:

```typescript
const styles = StyleSheet.create({
  container: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter tone-chat-client typecheck`
Expected: Pass

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/components/chat/MentionAutocomplete.tsx
git commit -m "feat(client): create MentionAutocomplete component"
```

---

### Task 11: Integrate MentionAutocomplete into MessageInput

**Files:**
- Modify: `packages/client/src/components/chat/MessageInput.tsx`

- [ ] **Step 1: Add members prop and mention state**

Add to `MessageInputProps`:

```typescript
members?: ServerMember[] | undefined;
```

Add import for `ServerMember` from types and `MentionAutocomplete` from the new component.

Add state:

```typescript
const [cursorPosition, setCursorPosition] = useState(0);
const [pendingMentions, setPendingMentions] = useState<Set<string>>(new Set());
```

- [ ] **Step 2: Track cursor position**

Add `onSelectionChange` to the TextInput:

```tsx
onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.end)}
```

- [ ] **Step 3: Handle mention selection**

```typescript
const handleMentionSelect = useCallback(
  (member: ServerMember, start: number, end: number) => {
    const username = member.username ?? member.userId;
    const newText = text.slice(0, start) + `@${username} ` + text.slice(end);
    setText(newText);
    setCursorPosition(start + username.length + 2); // +2 for @ and space
    setPendingMentions((prev) => new Set(prev).add(member.userId));
    onTyping?.();
  },
  [text, onTyping],
);
```

- [ ] **Step 4: Pass mentions on send**

Update `handleSend` to include mentions in the options:

```typescript
if (pendingMentions.size > 0) {
  options.mentions = Array.from(pendingMentions);
}
```

After send, clear: `setPendingMentions(new Set());`

- [ ] **Step 5: Render MentionAutocomplete**

Place above the reply preview (before `{replyTarget ? ...}`):

```tsx
{members ? (
  <MentionAutocomplete
    text={text}
    cursorPosition={cursorPosition}
    members={members}
    onSelect={handleMentionSelect}
  />
) : null}
```

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter tone-chat-client typecheck`
Expected: Pass

- [ ] **Step 7: Commit**

```bash
git add packages/client/src/components/chat/MessageInput.tsx
git commit -m "feat(client): integrate MentionAutocomplete into MessageInput"
```

---

## Chunk 5: MessageList Scroll Support + ChannelScreen Wiring

### Task 12: Add scroll-to-message and new props to MessageList

**Files:**
- Modify: `packages/client/src/components/chat/MessageList.tsx`

- [ ] **Step 1: Add new props and forwardRef**

Update the interface and component to support reply and scroll:

```typescript
interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  authorNames?: Record<string, string> | undefined;
  onLoadMore?: (() => void) | undefined;
  isLoadingMore?: boolean | undefined;
  onMessageLongPress?: ((message: Message) => void) | undefined;
  onImagePress?: ((attachment: Attachment) => void) | undefined;
  onToggleReaction?: ((messageId: string, emoji: string) => void) | undefined;
  onAddReaction?: ((messageId: string) => void) | undefined;
  onReply?: ((message: Message) => void) | undefined;
  onReplyPress?: ((messageId: string) => void) | undefined;
  highlightedMessageId?: string | null | undefined;
}
```

- [ ] **Step 2: Add imperative handle for scrolling**

Convert to `forwardRef` with an imperative handle:

```typescript
export interface MessageListHandle {
  scrollToMessage: (messageId: string) => boolean;
}
```

Use `useImperativeHandle` and `useRef` for the FlatList ref:

```typescript
import React, { useCallback, useRef, useImperativeHandle, forwardRef } from 'react';

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList(props, ref) {
  const { messages, currentUserId, authorNames, onLoadMore, isLoadingMore, onMessageLongPress, onImagePress, onToggleReaction, onAddReaction, onReply, onReplyPress, highlightedMessageId } = props;
  const flatListRef = useRef<FlatList>(null);

  useImperativeHandle(ref, () => ({
    scrollToMessage(messageId: string): boolean {
      const index = messages.findIndex((m) => m._id === messageId);
      if (index === -1) return false;
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      return true;
    },
  }), [messages]);

  // ... rest of component
```

- [ ] **Step 3: Pass new props to MessageBubble in renderItem**

```typescript
const renderItem = useCallback(
  ({ item }: ListRenderItemInfo<Message>) => (
    <MessageBubble
      message={item}
      isOwn={item.authorId === currentUserId}
      authorName={authorNames?.[item.authorId]}
      currentUserId={currentUserId}
      authorNames={authorNames}
      onLongPress={onMessageLongPress}
      onImagePress={onImagePress}
      onToggleReaction={onToggleReaction}
      onAddReaction={onAddReaction}
      onReply={onReply}
      onReplyPress={onReplyPress}
      highlighted={highlightedMessageId === item._id}
    />
  ),
  [currentUserId, authorNames, onMessageLongPress, onImagePress, onToggleReaction, onAddReaction, onReply, onReplyPress, highlightedMessageId],
);
```

- [ ] **Step 4: Add ref and onScrollToIndexFailed to FlatList**

```tsx
<FlatList
  ref={flatListRef}
  onScrollToIndexFailed={(info) => {
    flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
  }}
  // ... existing props
```

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter tone-chat-client typecheck`
Expected: Pass

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/components/chat/MessageList.tsx
git commit -m "feat(client): add scroll-to-message, reply props, and highlight support to MessageList"
```

---

### Task 13: Wire everything in ChannelScreen

**Files:**
- Modify: `packages/client/app/(main)/servers/[serverId]/channels/[channelId].tsx`

- [ ] **Step 1: Add reply state and refs**

Add state and imports:

```typescript
import type { Message } from '../../../../../src/types/models';
import type { MessageListHandle } from '../../../../../src/components/chat/MessageList';
import { useNotificationStore } from '../../../../../src/stores/notificationStore';

// Inside the component:
const setCurrentChannelId = useNotificationStore((s) => s.setCurrentChannelId);
const [replyTarget, setReplyTarget] = useState<{ messageId: string; authorId: string; authorName: string; content: string } | null>(null);
const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
const messageListRef = useRef<MessageListHandle>(null);

// Track current channel for notification suppression
useEffect(() => {
  setCurrentChannelId(cid || null);
  return () => setCurrentChannelId(null);
}, [cid, setCurrentChannelId]);
```

- [ ] **Step 2: Add reply handlers**

```typescript
const handleReply = useCallback((message: Message) => {
  setReplyTarget({
    messageId: message._id,
    authorId: message.authorId,
    authorName: authorNames[message.authorId] ?? 'Unknown',
    content: message.content,
  });
}, [authorNames]);

const handleCancelReply = useCallback(() => {
  setReplyTarget(null);
}, []);

const handleReplyPress = useCallback((messageId: string) => {
  const found = messageListRef.current?.scrollToMessage(messageId);
  if (found) {
    setHighlightMessageId(messageId);
    setTimeout(() => setHighlightMessageId(null), 1500);
  }
}, []);
```

- [ ] **Step 3: Update handleSend**

Update to include replyToId and mentions:

```typescript
const handleSend = useCallback(
  (content: string, attachmentIds: string[], options?: { replyToId?: string; mentions?: string[] }) => {
    sendMessage.mutate({
      content,
      attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      replyToId: options?.replyToId,
      mentions: options?.mentions,
    });
    setReplyTarget(null);
  },
  [sendMessage],
);
```

- [ ] **Step 4: Update JSX to pass new props**

Update `MessageList`:

```tsx
<MessageList
  ref={messageListRef}
  messages={messages}
  currentUserId={userId}
  authorNames={authorNames}
  onLoadMore={handleLoadMore}
  isLoadingMore={isFetchingNextPage}
  onImagePress={handleImagePress}
  onToggleReaction={handleToggleReaction}
  onAddReaction={handleAddReaction}
  onReply={handleReply}
  onReplyPress={handleReplyPress}
  highlightedMessageId={highlightMessageId}
/>
```

Update `MessageInput`:

```tsx
<MessageInput
  onSend={handleSend}
  onTyping={emitTyping}
  disabled={sendMessage.isPending}
  members={members}
  replyTarget={replyTarget ?? undefined}
  onCancelReply={handleCancelReply}
/>
```

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter tone-chat-client typecheck`
Expected: Pass

- [ ] **Step 6: Commit**

```bash
git add packages/client/app/(main)/servers/[serverId]/channels/[channelId].tsx
git commit -m "feat(client): wire reply and mention functionality in ChannelScreen"
```

---

## Chunk 6: Cross-Channel Mention Notifications

### Task 14: Create notification store

**Files:**
- Create: `packages/client/src/stores/notificationStore.ts`

- [ ] **Step 1: Create the store**

```typescript
import { create } from 'zustand';

export interface MentionNotification {
  messageId: string;
  channelId: string;
  serverId: string;
  authorId: string;
}

interface NotificationState {
  currentNotification: MentionNotification | null;
  currentChannelId: string | null;
  showNotification: (notification: MentionNotification) => void;
  dismissNotification: () => void;
  setCurrentChannelId: (channelId: string | null) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  currentNotification: null,
  currentChannelId: null,

  showNotification: (notification) => {
    set({ currentNotification: notification });
  },

  dismissNotification: () => {
    set({ currentNotification: null });
  },

  setCurrentChannelId: (channelId) => {
    set({ currentChannelId: channelId });
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/stores/notificationStore.ts
git commit -m "feat(client): create notification store for mention alerts"
```

---

### Task 15: Create useMentionNotifications hook

**Files:**
- Create: `packages/client/src/hooks/useMentionNotifications.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useEffect } from 'react';
import { useSocketStore } from '../stores/socketStore';
import { useNotificationStore } from '../stores/notificationStore';
import type { MentionEvent } from '../types/socket.types';

export function useMentionNotifications() {
  const socket = useSocketStore((s) => s.socket);
  const showNotification = useNotificationStore((s) => s.showNotification);
  const currentChannelId = useNotificationStore((s) => s.currentChannelId);

  useEffect(() => {
    if (!socket) return;

    const handleMention = (event: MentionEvent) => {
      // Suppress if already viewing the channel where mention occurred
      if (event.channelId === currentChannelId) return;

      showNotification(event);
    };

    socket.on('mention', handleMention);

    return () => {
      socket.off('mention', handleMention);
    };
  }, [socket, currentChannelId, showNotification]);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/hooks/useMentionNotifications.ts
git commit -m "feat(client): create useMentionNotifications hook"
```

---

### Task 16: Add mention Snackbar to main layout

**Files:**
- Modify: `packages/client/app/(main)/_layout.tsx`

- [ ] **Step 1: Add notification Snackbar**

Add imports:

```typescript
import { Snackbar } from 'react-native-paper';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { useMentionNotifications } from '../../src/hooks/useMentionNotifications';
import { useQueryClient } from '@tanstack/react-query';
import type { MembersResponse, ChannelsResponse } from '../../src/types/api.types';
```

In `MainLayout`, add the hook and notification logic:

```typescript
export default function MainLayout() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const notification = useNotificationStore((s) => s.currentNotification);
  const dismissNotification = useNotificationStore((s) => s.dismissNotification);

  useMentionNotifications();

  // Resolve display text from cache
  let notificationText = '';
  if (notification) {
    // Try to get author name from members cache
    const membersData = queryClient.getQueryData<MembersResponse>(['servers', notification.serverId, 'members']);
    const member = membersData?.members?.find((m) => m.userId === notification.authorId);
    const authorName = member?.nickname ?? member?.display_name ?? member?.username ?? 'Someone';

    // Try to get channel name from cache
    const channelsData = queryClient.getQueryData<ChannelsResponse>(['servers', notification.serverId, 'channels']);
    const channel = channelsData?.channels?.find((c) => c._id === notification.channelId);
    const channelName = channel?.name ?? 'a channel';

    notificationText = `@${authorName} mentioned you in #${channelName}`;
  }

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(dismissNotification, 5000);
    return () => clearTimeout(timer);
  }, [notification, dismissNotification]);

  return (
    <>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.surface, borderBottomColor: 'white' },
          headerTintColor: theme.colors.onSurface,
          drawerType: 'front',
          drawerStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {/* ... existing Drawer.Screen entries unchanged ... */}
      </Drawer>
      <Snackbar
        visible={notification !== null}
        onDismiss={dismissNotification}
        duration={5000}
        action={{
          label: 'Go',
          onPress: () => {
            if (notification) {
              router.push(`/(main)/servers/${notification.serverId}/channels/${notification.channelId}`);
              dismissNotification();
            }
          },
        }}
      >
        {notificationText}
      </Snackbar>
    </>
  );
}
```

Add `useEffect` to the import from React. Wrap the return in a fragment `<>...</>` to hold both the Drawer and the Snackbar.

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter tone-chat-client typecheck`
Expected: Pass

- [ ] **Step 3: Commit**

```bash
git add packages/client/app/(main)/_layout.tsx
git commit -m "feat(client): add mention notification Snackbar to main layout"
```

---

## Chunk 7: Integration Tests + Final Verification

### Task 17: Add backend integration tests for replies and mentions

**Files:**
- Modify: `packages/messagingService/src/messages/messages.integration.test.ts` (or create if name pattern differs — check existing test files)

- [ ] **Step 1: Find and read existing integration test file**

Run: `ls packages/messagingService/src/messages/*.integration.test.ts`

Read the existing file to understand the test setup pattern (app import, ephemeral port, headers).

- [ ] **Step 2: Write integration tests**

Add new describe blocks for mentions and replies:

```typescript
describe('POST /messages — mentions', () => {
  it('stores mentions array on created message', async () => {
    // Create a message with mentions
    const res = await request(baseUrl)
      .post(`/servers/${serverId}/channels/${channelId}/messages`)
      .set('x-user-id', userId)
      .set('x-internal-key', 'dev-internal-key')
      .send({ content: 'hey @user', mentions: [otherUserId] });

    assert.equal(res.status, 201);
    assert.deepEqual(res.body.message.mentions, [otherUserId]);
  });

  it('returns 400 for invalid mentions', async () => {
    const res = await request(baseUrl)
      .post(`/servers/${serverId}/channels/${channelId}/messages`)
      .set('x-user-id', userId)
      .set('x-internal-key', 'dev-internal-key')
      .send({ content: 'hey', mentions: 'not-array' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_MENTIONS');
  });
});

describe('POST /messages — replyTo', () => {
  it('stores replyTo snapshot when replying to a message', async () => {
    // First create a message to reply to
    const original = await request(baseUrl)
      .post(`/servers/${serverId}/channels/${channelId}/messages`)
      .set('x-user-id', userId)
      .set('x-internal-key', 'dev-internal-key')
      .send({ content: 'original message' });

    // Reply to it
    const reply = await request(baseUrl)
      .post(`/servers/${serverId}/channels/${channelId}/messages`)
      .set('x-user-id', otherUserId)
      .set('x-internal-key', 'dev-internal-key')
      .send({ content: 'reply!', replyToId: original.body.message._id });

    assert.equal(reply.status, 201);
    assert.ok(reply.body.message.replyTo);
    assert.equal(reply.body.message.replyTo.messageId, original.body.message._id);
    assert.equal(reply.body.message.replyTo.authorId, userId);
    // Auto-adds original author to mentions
    assert.ok(reply.body.message.mentions.includes(userId));
  });

  it('returns 404 for non-existent replyToId', async () => {
    const res = await request(baseUrl)
      .post(`/servers/${serverId}/channels/${channelId}/messages`)
      .set('x-user-id', userId)
      .set('x-internal-key', 'dev-internal-key')
      .send({ content: 'reply', replyToId: '000000000000000000000000' });

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'REPLY_TARGET_NOT_FOUND');
  });
});
```

Adapt the test setup (server creation, member joining, user IDs) to match the existing integration test patterns in the file.

- [ ] **Step 3: Run integration tests**

Run: `pnpm test:integration:up`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/messagingService/src/messages/messages.integration.test.ts
git commit -m "test(messagingService): add integration tests for mentions and replyTo"
```

---

### Task 18: Run full test suite and typecheck

- [ ] **Step 1: Run all backend unit tests**

Run: `pnpm test`
Expected: All pass

- [ ] **Step 2: Run client typecheck**

Run: `pnpm --filter tone-chat-client typecheck`
Expected: Pass

- [ ] **Step 3: Run client tests**

Run: `pnpm --filter tone-chat-client test`
Expected: All pass

- [ ] **Step 4: Run integration tests**

Run: `pnpm test:integration:up`
Expected: All pass

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve test and typecheck issues from mentions/replies feature"
```
