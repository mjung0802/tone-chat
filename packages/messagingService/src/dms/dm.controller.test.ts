import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import type { IDirectConversation } from './conversation.model.js';

type TestResponse = Response & { statusCode: number; _json: unknown };
type DmReq = Request & { conversation?: IDirectConversation };

function assertErrorCode(error: unknown, code: string): true {
  assert.equal(typeof error, 'object');
  assert.notEqual(error, null);
  assert.equal((error as { code?: unknown }).code, code);
  return true;
}

// --- Mock DirectConversation ---
const mockConvFindOneAndUpdate = mock.fn<AnyFn>();
const mockConvFind = mock.fn<AnyFn>();
const mockConvFindByIdAndUpdate = mock.fn<AnyFn>();

mock.module('./conversation.model.js', {
  namedExports: {
    DirectConversation: {
      findOneAndUpdate: mockConvFindOneAndUpdate,
      find: mockConvFind,
      findByIdAndUpdate: mockConvFindByIdAndUpdate,
    },
  },
});

// --- Mock DirectMessage ---
const mockMsgCreate = mock.fn<AnyFn>();
const mockMsgFindOne = mock.fn<AnyFn>();
const mockMsgFind = mock.fn<AnyFn>();
const mockMsgAggregate = mock.fn<AnyFn>();

mock.module('./directMessage.model.js', {
  namedExports: {
    DirectMessage: {
      create: mockMsgCreate,
      findOne: mockMsgFindOne,
      find: mockMsgFind,
      aggregate: mockMsgAggregate,
    },
  },
});

// --- Mock config ---
mock.module('../config/index.js', {
  namedExports: {
    config: {
      usersServiceUrl: 'http://localhost:3002',
      internalApiKey: 'dev-internal-key',
    },
  },
});

const {
  getOrCreateConversation,
  getConversation,
  listConversations,
  listDmMessages,
  sendDmMessage,
  editDmMessage,
  toggleDmReaction,
} = await import('./dm.controller.js');

function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
  res.status = (c: number) => {
    res.statusCode = c;
    return res;
  };
  res.json = (d: unknown) => {
    res._json = d;
    return res;
  };
  return res;
}

function makeReq(opts: {
  userId?: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  conversation?: IDirectConversation;
}): DmReq {
  const req = {
    headers: opts.userId ? { 'x-user-id': opts.userId } : {},
    params: opts.params ?? {},
    body: opts.body ?? {},
    query: opts.query ?? {},
  } as DmReq;
  if (opts.conversation) {
    req.conversation = opts.conversation;
  }
  return req;
}

function makeConversation(participantIds: [string, string], overrides?: Partial<{ _id: Types.ObjectId; lastMessageAt: Date | null }>): IDirectConversation {
  const base = {
    _id: overrides?._id ?? new Types.ObjectId(),
    participantIds,
    lastMessageAt: overrides?.lastMessageAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const conv: Partial<IDirectConversation> = { ...base, toObject: () => base };
  return conv as IDirectConversation;
}

// ─── getOrCreateConversation ─────────────────────────────────────────────────

describe('getOrCreateConversation', () => {
  beforeEach(() => mockConvFindOneAndUpdate.mock.resetCalls());

  it('creates and returns a new conversation', async () => {
    const conv = makeConversation(['u1', 'u2']);
    mockConvFindOneAndUpdate.mock.mockImplementation(async () => conv);
    const req = makeReq({ userId: 'u1', params: { otherUserId: 'u2' } });
    const res = makeRes();
    await getOrCreateConversation(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { conversation: unknown }).conversation, conv);
  });

  it('returns existing conversation idempotently', async () => {
    const conv = makeConversation(['u1', 'u2']);
    mockConvFindOneAndUpdate.mock.mockImplementation(async () => conv);
    const req = makeReq({ userId: 'u2', params: { otherUserId: 'u1' } });
    const res = makeRes();
    await getOrCreateConversation(req, res);
    // Participants should be sorted alphabetically regardless of call order
    const callArgs = mockConvFindOneAndUpdate.mock.calls[0]?.arguments;
    assert.ok(callArgs, 'findOneAndUpdate was called');
    const filter = callArgs[0] as { participantIds: string[] };
    assert.deepEqual(filter.participantIds, ['u1', 'u2']);
  });

  it('returns 400 when trying to DM yourself', async () => {
    const req = makeReq({ userId: 'u1', params: { otherUserId: 'u1' } });
    const res = makeRes();
    await getOrCreateConversation(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_USER_ID');
  });
});

// ─── getConversation ─────────────────────────────────────────────────────────

describe('getConversation', () => {
  it('returns the conversation attached by middleware', async () => {
    const conv = makeConversation(['u1', 'u2']);
    const req = makeReq({ userId: 'u1', params: { conversationId: 'conv1' }, conversation: conv });
    const res = makeRes();
    await getConversation(req, res);
    assert.deepEqual((res._json as { conversation: unknown }).conversation, conv);
  });
});

// ─── listConversations ────────────────────────────────────────────────────────

describe('listConversations', () => {
  beforeEach(() => {
    mockConvFind.mock.resetCalls();
    mockMsgAggregate.mock.resetCalls();
  });

  it('returns conversations with lastMessage when messages exist', async () => {
    const convId = new Types.ObjectId();
    const conv = makeConversation(['u1', 'u2'], { _id: convId, lastMessageAt: new Date() });
    const sortedResult = { sort: mock.fn<AnyFn>(() => Promise.resolve([conv])) };
    mockConvFind.mock.mockImplementation(() => sortedResult);
    mockMsgAggregate.mock.mockImplementation(async () => [
      { _id: String(convId), lastMessage: { _id: 'msg1', content: 'hello', conversationId: String(convId) } },
    ]);
    const req = makeReq({ userId: 'u1' });
    const res = makeRes();
    await listConversations(req, res);
    const result = (res._json as { conversations: { lastMessage: unknown }[] }).conversations;
    assert.equal(result.length, 1);
    assert.deepEqual(result[0]?.lastMessage, { _id: 'msg1', content: 'hello', conversationId: String(convId) });
  });

  it('returns lastMessage as null when conversation has no messages', async () => {
    const conv = makeConversation(['u1', 'u2']);
    const sortedResult = { sort: mock.fn<AnyFn>(() => Promise.resolve([conv])) };
    mockConvFind.mock.mockImplementation(() => sortedResult);
    const req = makeReq({ userId: 'u1' });
    const res = makeRes();
    await listConversations(req, res);
    const result = (res._json as { conversations: { lastMessage: unknown }[] }).conversations;
    assert.equal(result.length, 1);
    assert.equal(result[0]?.lastMessage, null);
    // Should not call aggregate when no conversations have messages
    assert.equal(mockMsgAggregate.mock.callCount(), 0);
  });
});

// ─── listDmMessages ───────────────────────────────────────────────────────────

describe('listDmMessages', () => {
  beforeEach(() => mockMsgFind.mock.resetCalls());

  it('returns messages oldest-first', async () => {
    const msgs = [{ _id: 'msg2' }, { _id: 'msg1' }];
    const chain: { sort: AnyFn; limit: AnyFn } = {
      sort: mock.fn<AnyFn>(() => chain),
      limit: mock.fn<AnyFn>(async () => msgs),
    };
    mockMsgFind.mock.mockImplementation(() => chain);
    const req = makeReq({ userId: 'u1', params: { conversationId: 'conv1' } });
    const res = makeRes();
    await listDmMessages(req, res);
    const result = (res._json as { messages: unknown[] }).messages;
    assert.deepEqual(result, msgs.reverse());
  });

  it('returns 400 for non-string before cursor', async () => {
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1' },
      query: { before: { $gt: '' } },
    });
    const res = makeRes();
    await listDmMessages(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_CURSOR');
  });
});

// ─── sendDmMessage ────────────────────────────────────────────────────────────

describe('sendDmMessage', () => {
  beforeEach(() => {
    mockMsgCreate.mock.resetCalls();
    mockMsgFindOne.mock.resetCalls();
    mockConvFindByIdAndUpdate.mock.resetCalls();
  });

  it('returns 400 when neither content nor attachments provided', async () => {
    const conv = makeConversation(['u1', 'u2']);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1' },
      body: {},
      conversation: conv,
    });
    const res = makeRes();
    await sendDmMessage(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MISSING_FIELDS');
  });

  it('creates message and updates lastMessageAt', async () => {
    const conv = makeConversation(['u1', 'u2']);
    const createdMsg = { _id: 'msg1', content: 'hello', authorId: 'u1' };
    mockMsgCreate.mock.mockImplementation(async () => createdMsg);
    mockConvFindByIdAndUpdate.mock.mockImplementation(async () => null);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1' },
      body: { content: 'hello' },
      conversation: conv,
    });
    const res = makeRes();
    await sendDmMessage(req, res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual((res._json as { message: unknown }).message, createdMsg);
    assert.equal(mockConvFindByIdAndUpdate.mock.callCount(), 1);
  });

  it('returns 400 for invalid mentions (non-participant)', async () => {
    const conv = makeConversation(['u1', 'u2']);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1' },
      body: { content: 'hello', mentions: ['u3'] },
      conversation: conv,
    });
    const res = makeRes();
    await sendDmMessage(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_MENTIONS');
  });

  it('returns 400 when user tries to mention themselves', async () => {
    const conv = makeConversation(['u1', 'u2']);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1' },
      body: { content: 'hello', mentions: ['u1'] },
      conversation: conv,
    });
    const res = makeRes();
    await sendDmMessage(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_MENTIONS');
  });

  it('accepts valid participant mention', async () => {
    const conv = makeConversation(['u1', 'u2']);
    const createdMsg = { _id: 'msg1', content: 'hello', mentions: ['u2'] };
    mockMsgCreate.mock.mockImplementation(async () => createdMsg);
    mockConvFindByIdAndUpdate.mock.mockImplementation(async () => null);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1' },
      body: { content: 'hello', mentions: ['u2'] },
      conversation: conv,
    });
    const res = makeRes();
    await sendDmMessage(req, res);
    assert.equal(res.statusCode, 201);
  });

  it('serverInvite only (no content, no attachments) → 201', async () => {
    const conv = makeConversation(['u1', 'u2']);
    const createdMsg = { _id: 'msg1', serverInvite: { code: 'abc', serverId: 's1', serverName: 'TestServer' } };
    mockMsgCreate.mock.mockImplementation(async () => createdMsg);
    mockConvFindByIdAndUpdate.mock.mockImplementation(async () => null);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1' },
      body: { serverInvite: { code: 'abc', serverId: 's1', serverName: 'TestServer' } },
      conversation: conv,
    });
    const res = makeRes();
    await sendDmMessage(req, res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual((res._json as { message: unknown }).message, createdMsg);
  });

  it('invalid serverInvite shape (missing fields) → 400 INVALID_SERVER_INVITE', async () => {
    const conv = makeConversation(['u1', 'u2']);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1' },
      body: { serverInvite: { code: 'abc' } },
      conversation: conv,
    });
    const res = makeRes();
    await sendDmMessage(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_SERVER_INVITE');
  });

  it('serverInvite + content → 201', async () => {
    const conv = makeConversation(['u1', 'u2']);
    const createdMsg = { _id: 'msg1', content: 'check this out', serverInvite: { code: 'abc', serverId: 's1', serverName: 'TestServer' } };
    mockMsgCreate.mock.mockImplementation(async () => createdMsg);
    mockConvFindByIdAndUpdate.mock.mockImplementation(async () => null);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1' },
      body: { content: 'check this out', serverInvite: { code: 'abc', serverId: 's1', serverName: 'TestServer' } },
      conversation: conv,
    });
    const res = makeRes();
    await sendDmMessage(req, res);
    assert.equal(res.statusCode, 201);
  });
});

// ─── editDmMessage ────────────────────────────────────────────────────────────

describe('editDmMessage', () => {
  beforeEach(() => mockMsgFindOne.mock.resetCalls());

  it('throws MESSAGE_NOT_FOUND when message does not exist', async () => {
    mockMsgFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => editDmMessage(
        makeReq({ userId: 'u1', params: { conversationId: 'conv1', messageId: 'msg1' }, body: { content: 'new' } }),
        makeRes(),
      ),
      (error) => assertErrorCode(error, 'MESSAGE_NOT_FOUND'),
    );
  });

  it('throws FORBIDDEN when user is not the author', async () => {
    mockMsgFindOne.mock.mockImplementation(async () => ({ _id: 'msg1', authorId: 'u2' }));
    await assert.rejects(
      () => editDmMessage(
        makeReq({ userId: 'u1', params: { conversationId: 'conv1', messageId: 'msg1' }, body: { content: 'new' } }),
        makeRes(),
      ),
      (error) => assertErrorCode(error, 'FORBIDDEN'),
    );
  });

  it('returns 400 when content is missing', async () => {
    const msg = { _id: 'msg1', authorId: 'u1', content: 'old', editedAt: null, save: mock.fn() };
    mockMsgFindOne.mock.mockImplementation(async () => msg);
    const res = makeRes();
    await editDmMessage(makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1', messageId: 'msg1' },
      body: {},
    }), res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MISSING_FIELDS');
  });

  it('returns 400 when content is empty string', async () => {
    const msg = { _id: 'msg1', authorId: 'u1', content: 'old', editedAt: null, save: mock.fn() };
    mockMsgFindOne.mock.mockImplementation(async () => msg);
    const res = makeRes();
    await editDmMessage(makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1', messageId: 'msg1' },
      body: { content: '   ' },
    }), res);
    assert.equal(res.statusCode, 400);
  });

  it('updates content and editedAt when user is author', async () => {
    const saveFn = mock.fn<AnyFn>(async () => undefined);
    const msg = { _id: 'msg1', authorId: 'u1', content: 'old', editedAt: null as Date | null, save: saveFn };
    mockMsgFindOne.mock.mockImplementation(async () => msg);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1', messageId: 'msg1' },
      body: { content: 'new content' },
    });
    const res = makeRes();
    await editDmMessage(req, res);
    assert.equal(msg.content, 'new content');
    assert.ok(msg.editedAt instanceof Date);
    assert.equal(saveFn.mock.callCount(), 1);
    assert.deepEqual((res._json as { message: unknown }).message, msg);
  });
});

// ─── toggleDmReaction ─────────────────────────────────────────────────────────

describe('toggleDmReaction', () => {
  beforeEach(() => mockMsgFindOne.mock.resetCalls());

  it('throws MESSAGE_NOT_FOUND when message does not exist', async () => {
    mockMsgFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => toggleDmReaction(
        makeReq({ userId: 'u1', params: { conversationId: 'conv1', messageId: 'msg1' }, body: { emoji: '👍' } }),
        makeRes(),
      ),
      (error) => assertErrorCode(error, 'MESSAGE_NOT_FOUND'),
    );
  });

  it('adds a reaction when none exists', async () => {
    const saveFn = mock.fn<AnyFn>(async () => undefined);
    const msg = {
      _id: 'msg1',
      reactions: [] as { emoji: string; userIds: string[] }[],
      save: saveFn,
    };
    mockMsgFindOne.mock.mockImplementation(async () => msg);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1', messageId: 'msg1' },
      body: { emoji: '👍' },
    });
    const res = makeRes();
    await toggleDmReaction(req, res);
    assert.equal(msg.reactions.length, 1);
    assert.equal(msg.reactions[0]?.emoji, '👍');
    assert.deepEqual(msg.reactions[0]?.userIds, ['u1']);
    assert.equal(saveFn.mock.callCount(), 1);
  });

  it('removes reaction when toggling again', async () => {
    const saveFn = mock.fn<AnyFn>(async () => undefined);
    const msg = {
      _id: 'msg1',
      reactions: [{ emoji: '👍', userIds: ['u1'] }] as { emoji: string; userIds: string[] }[],
      save: saveFn,
    };
    mockMsgFindOne.mock.mockImplementation(async () => msg);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1', messageId: 'msg1' },
      body: { emoji: '👍' },
    });
    const res = makeRes();
    await toggleDmReaction(req, res);
    // After remove + filter for 0-length, reactions should be empty
    assert.equal(msg.reactions.length, 0);
    assert.equal(saveFn.mock.callCount(), 1);
  });

  it('returns 400 for invalid emoji', async () => {
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1', messageId: 'msg1' },
      body: { emoji: '' },
    });
    const res = makeRes();
    await toggleDmReaction(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_EMOJI');
  });
});
