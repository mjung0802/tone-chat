import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import type { IDirectConversation } from './conversation.model.js';

type TestResponse = Response & { statusCode: number; _json: unknown };
type DmReq = Request & { conversation?: IDirectConversation };

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

mock.module('./directMessage.model.js', {
  namedExports: {
    DirectMessage: {
      create: mockMsgCreate,
      findOne: mockMsgFindOne,
      find: mockMsgFind,
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

// --- Mock errorHandler AppError ---
mock.module('../shared/middleware/errorHandler.js', {
  namedExports: {
    AppError: class AppError extends Error {
      code: string;
      status: number;
      constructor(code: string, message: string, status: number) {
        super(message);
        this.code = code;
        this.status = status;
      }
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

function makeConversation(participantIds: [string, string]): IDirectConversation {
  return {
    _id: 'conv1',
    participantIds,
    lastMessageAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as IDirectConversation;
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
  beforeEach(() => mockConvFind.mock.resetCalls());

  it('returns conversations for the user', async () => {
    const convs = [makeConversation(['u1', 'u2'])];
    const sortedResult = { sort: mock.fn<AnyFn>(() => Promise.resolve(convs)) };
    mockConvFind.mock.mockImplementation(() => sortedResult);
    const req = makeReq({ userId: 'u1' });
    const res = makeRes();
    await listConversations(req, res);
    assert.deepEqual((res._json as { conversations: unknown }).conversations, convs);
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
});

// ─── editDmMessage ────────────────────────────────────────────────────────────

describe('editDmMessage', () => {
  beforeEach(() => mockMsgFindOne.mock.resetCalls());

  it('returns 400 when content is missing', async () => {
    const msg = { _id: 'msg1', authorId: 'u1', content: 'old', editedAt: null, save: mock.fn() };
    mockMsgFindOne.mock.mockImplementation(async () => msg);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1', messageId: 'msg1' },
      body: {},
    });
    const res = makeRes();
    await editDmMessage(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MISSING_FIELDS');
  });

  it('returns 400 when content is empty string', async () => {
    const msg = { _id: 'msg1', authorId: 'u1', content: 'old', editedAt: null, save: mock.fn() };
    mockMsgFindOne.mock.mockImplementation(async () => msg);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1', messageId: 'msg1' },
      body: { content: '   ' },
    });
    const res = makeRes();
    await editDmMessage(req, res);
    assert.equal(res.statusCode, 400);
  });

  it('returns 403 when user is not the author', async () => {
    const msg = { _id: 'msg1', authorId: 'u2', content: 'old', editedAt: null, save: mock.fn() };
    mockMsgFindOne.mock.mockImplementation(async () => msg);
    const req = makeReq({
      userId: 'u1',
      params: { conversationId: 'conv1', messageId: 'msg1' },
      body: { content: 'new content' },
    });
    const res = makeRes();
    await editDmMessage(req, res);
    assert.equal(res.statusCode, 403);
    assert.equal((res._json as { error: { code: string } }).error.code, 'FORBIDDEN');
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
