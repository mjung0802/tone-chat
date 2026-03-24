import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const mockGetOrCreateConversation = mock.fn<AnyFn>();
const mockGetConversation = mock.fn<AnyFn>();
const mockListConversations = mock.fn<AnyFn>();
const mockListDmMessages = mock.fn<AnyFn>();
const mockSendDmMessage = mock.fn<AnyFn>();
const mockEditDmMessage = mock.fn<AnyFn>();
const mockReactToDmMessage = mock.fn<AnyFn>();
const mockIsBlockedBidirectional = mock.fn<AnyFn>();

mock.module('./dms.client.js', {
  namedExports: {
    getOrCreateConversation: mockGetOrCreateConversation,
    getConversation: mockGetConversation,
    listConversations: mockListConversations,
    listDmMessages: mockListDmMessages,
    sendDmMessage: mockSendDmMessage,
    editDmMessage: mockEditDmMessage,
    reactToDmMessage: mockReactToDmMessage,
  },
});

const mockGetUser = mock.fn<AnyFn>();
mock.module('../users/users.client.js', {
  namedExports: {
    getMe: mock.fn(),
    patchMe: mock.fn(),
    getUser: mockGetUser,
    getUsersBatch: mock.fn(),
    getBlockedIds: mock.fn(),
    blockUser: mock.fn(),
    unblockUser: mock.fn(),
    isBlockedBidirectional: mockIsBlockedBidirectional,
  },
});

const { dmsRouter, setDmIO } = await import('./dms.routes.js');

type RouteStackEntry = { method?: string; handle?: (req: unknown, res: unknown) => Promise<void> };
type RouterLayer = { route?: { path?: string; methods?: Record<string, boolean>; stack?: RouteStackEntry[] } };

type DmsReq = {
  userId: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
};
type DmsRes = {
  statusCode: number;
  _json: unknown;
  status: (code: number) => DmsRes;
  json: (data: unknown) => DmsRes;
};

function makeRes(): DmsRes {
  const res: DmsRes = {
    statusCode: 200,
    _json: undefined,
    status(c: number) {
      res.statusCode = c;
      return res;
    },
    json(d: unknown) {
      res._json = d;
      return res;
    },
  };
  return res;
}

function findHandler(path: string, httpMethod: string): (req: DmsReq, res: DmsRes) => Promise<void> {
  // @ts-expect-error - simplified RouterLayer type for testing
  const layer = (dmsRouter.stack as RouterLayer[]).find(
    (l) => l.route?.path === path && Boolean(l.route?.methods?.[httpMethod]),
  );
  const handle =
    (layer?.route?.stack?.find((s: RouteStackEntry) => s.method === httpMethod)?.handle) ??
    (async () => {});
  return handle as (req: DmsReq, res: DmsRes) => Promise<void>;
}

// For POST /:otherUserId there are two handlers (rate limiter + async), pick the last one
function findLastHandler(path: string, httpMethod: string): (req: DmsReq, res: DmsRes) => Promise<void> {
  // @ts-expect-error - simplified RouterLayer type for testing
  const layer = (dmsRouter.stack as RouterLayer[]).find(
    (l) => l.route?.path === path && Boolean(l.route?.methods?.[httpMethod]),
  );
  const stack = (layer?.route?.stack ?? []) as RouteStackEntry[];
  const methodHandlers = stack.filter((s) => s.method === httpMethod);
  const handle = methodHandlers[methodHandlers.length - 1]?.handle ?? (async () => {});
  return handle as (req: DmsReq, res: DmsRes) => Promise<void>;
}

describe('POST /:otherUserId', () => {
  const postOtherUserHandler = findLastHandler('/:otherUserId', 'post');

  beforeEach(() => {
    mockGetOrCreateConversation.mock.resetCalls();
    mockIsBlockedBidirectional.mock.resetCalls();
  });

  it('returns 400 CANNOT_DM_SELF when otherUserId === userId', async () => {
    const req: DmsReq = { userId: 'user-1', params: { otherUserId: 'user-1' }, query: {}, body: {} };
    const res = makeRes();

    await postOtherUserHandler(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res._json, { error: { code: 'CANNOT_DM_SELF', message: 'You cannot DM yourself', status: 400 } });
    assert.equal(mockIsBlockedBidirectional.mock.callCount(), 0);
    assert.equal(mockGetOrCreateConversation.mock.callCount(), 0);
  });

  it('returns 403 BLOCKED when bidirectional block check returns true', async () => {
    mockIsBlockedBidirectional.mock.mockImplementation(async () => true);

    const req: DmsReq = { userId: 'user-1', params: { otherUserId: 'user-2' }, query: {}, body: {} };
    const res = makeRes();

    await postOtherUserHandler(req, res);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res._json, { error: { code: 'BLOCKED', message: 'Cannot start conversation due to a block', status: 403 } });
    assert.equal(mockGetOrCreateConversation.mock.callCount(), 0);
  });

  it('forwards to messagingService when no block', async () => {
    mockIsBlockedBidirectional.mock.mockImplementation(async () => false);
    mockGetOrCreateConversation.mock.mockImplementation(async () => ({
      status: 200,
      data: { conversation: { _id: 'conv-1', participantIds: ['user-1', 'user-2'] } },
    }));

    const req: DmsReq = { userId: 'user-1', params: { otherUserId: 'user-2' }, query: {}, body: {} };
    const res = makeRes();

    await postOtherUserHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res._json, { conversation: { _id: 'conv-1', participantIds: ['user-1', 'user-2'] } });
    assert.equal(mockGetOrCreateConversation.mock.callCount(), 1);
    assert.deepEqual(mockGetOrCreateConversation.mock.calls[0]!.arguments, ['user-1', 'user-2']);
  });
});

function makeMockIo() {
  const mockEmit = mock.fn<AnyFn>();
  const mockTo = mock.fn<AnyFn>(() => ({ emit: mockEmit }));
  const mockIo = { to: mockTo } as unknown as import('socket.io').Server;
  return { mockIo, mockTo, mockEmit };
}

describe('POST /:conversationId/messages', () => {
  const postMessagesHandler = findHandler('/:conversationId/messages', 'post');

  beforeEach(() => {
    mockGetConversation.mock.resetCalls();
    mockSendDmMessage.mock.resetCalls();
    mockIsBlockedBidirectional.mock.resetCalls();
    mockGetUser.mock.resetCalls();
    mockGetUser.mock.mockImplementation(async () => ({
      status: 200,
      data: { user: { display_name: 'Test User', username: 'testuser' } },
    }));
  });

  it('returns 403 BLOCKED when bidirectional block check returns true', async () => {
    mockGetConversation.mock.mockImplementation(async () => ({
      status: 200,
      data: { conversation: { participantIds: ['user-1', 'user-2'] } },
    }));
    mockIsBlockedBidirectional.mock.mockImplementation(async () => true);

    const req: DmsReq = {
      userId: 'user-1',
      params: { conversationId: 'conv-1' },
      query: {},
      body: { content: 'hello' },
    };
    const res = makeRes();

    await postMessagesHandler(req, res);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res._json, { error: { code: 'BLOCKED', message: 'Cannot send message due to a block', status: 403 } });
    assert.equal(mockSendDmMessage.mock.callCount(), 0);
  });

  it('forwards to messagingService when no block', async () => {
    mockGetConversation.mock.mockImplementation(async () => ({
      status: 200,
      data: { conversation: { participantIds: ['user-1', 'user-2'] } },
    }));
    mockIsBlockedBidirectional.mock.mockImplementation(async () => false);
    mockSendDmMessage.mock.mockImplementation(async () => ({
      status: 201,
      data: { message: { _id: 'msg-1', content: 'hello' } },
    }));

    const req: DmsReq = {
      userId: 'user-1',
      params: { conversationId: 'conv-1' },
      query: {},
      body: { content: 'hello' },
    };
    const res = makeRes();

    await postMessagesHandler(req, res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res._json, { message: { _id: 'msg-1', content: 'hello' } });
    assert.equal(mockSendDmMessage.mock.callCount(), 1);
    assert.deepEqual(mockSendDmMessage.mock.calls[0]!.arguments, ['user-1', 'conv-1', { content: 'hello' }]);
  });

  it('emits dm:new_message and dm:notification on successful send', async () => {
    const { mockIo, mockTo, mockEmit } = makeMockIo();
    setDmIO(mockIo);

    mockGetConversation.mock.mockImplementation(async () => ({
      status: 200,
      data: { conversation: { participantIds: ['user-1', 'user-2'] } },
    }));
    mockIsBlockedBidirectional.mock.mockImplementation(async () => false);
    mockSendDmMessage.mock.mockImplementation(async () => ({
      status: 201,
      data: { message: { _id: 'msg-1', content: 'hello world' } },
    }));

    const req: DmsReq = {
      userId: 'user-1',
      params: { conversationId: 'conv-1' },
      query: {},
      body: { content: 'hello world' },
    };
    const res = makeRes();

    await postMessagesHandler(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(mockTo.mock.callCount(), 2);
    assert.equal(mockTo.mock.calls[0]!.arguments[0], 'dm:conv-1');
    assert.equal(mockEmit.mock.calls[0]!.arguments[0], 'dm:new_message');
    assert.deepEqual(mockEmit.mock.calls[0]!.arguments[1], { message: { _id: 'msg-1', content: 'hello world' } });
    assert.equal(mockTo.mock.calls[1]!.arguments[0], 'user:user-2');
    assert.equal(mockEmit.mock.calls[1]!.arguments[0], 'dm:notification');
    assert.deepEqual(mockEmit.mock.calls[1]!.arguments[1], {
      conversationId: 'conv-1',
      otherUserId: 'user-1',
      senderName: 'Test User',
      preview: 'hello world',
    });

    setDmIO(null as unknown as import('socket.io').Server);
  });

  it('does not emit socket events when message creation fails', async () => {
    const { mockIo, mockTo } = makeMockIo();
    setDmIO(mockIo);

    mockGetConversation.mock.mockImplementation(async () => ({
      status: 200,
      data: { conversation: { participantIds: ['user-1', 'user-2'] } },
    }));
    mockIsBlockedBidirectional.mock.mockImplementation(async () => false);
    mockSendDmMessage.mock.mockImplementation(async () => ({
      status: 400,
      data: { error: { code: 'MISSING_FIELDS', message: 'Content required' } },
    }));

    const req: DmsReq = {
      userId: 'user-1',
      params: { conversationId: 'conv-1' },
      query: {},
      body: {},
    };
    const res = makeRes();

    await postMessagesHandler(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(mockTo.mock.callCount(), 0);

    setDmIO(null as unknown as import('socket.io').Server);
  });

  it('does not emit socket events when blocked', async () => {
    const { mockIo, mockTo } = makeMockIo();
    setDmIO(mockIo);

    mockGetConversation.mock.mockImplementation(async () => ({
      status: 200,
      data: { conversation: { participantIds: ['user-1', 'user-2'] } },
    }));
    mockIsBlockedBidirectional.mock.mockImplementation(async () => true);

    const req: DmsReq = {
      userId: 'user-1',
      params: { conversationId: 'conv-1' },
      query: {},
      body: { content: 'hello' },
    };
    const res = makeRes();

    await postMessagesHandler(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(mockTo.mock.callCount(), 0);
    assert.equal(mockSendDmMessage.mock.callCount(), 0);

    setDmIO(null as unknown as import('socket.io').Server);
  });

  it('truncates notification preview to 50 characters', async () => {
    const { mockIo, mockEmit } = makeMockIo();
    setDmIO(mockIo);

    const longContent = 'A'.repeat(100);
    mockGetConversation.mock.mockImplementation(async () => ({
      status: 200,
      data: { conversation: { participantIds: ['user-1', 'user-2'] } },
    }));
    mockIsBlockedBidirectional.mock.mockImplementation(async () => false);
    mockSendDmMessage.mock.mockImplementation(async () => ({
      status: 201,
      data: { message: { _id: 'msg-1', content: longContent } },
    }));

    const req: DmsReq = {
      userId: 'user-1',
      params: { conversationId: 'conv-1' },
      query: {},
      body: { content: longContent },
    };
    const res = makeRes();

    await postMessagesHandler(req, res);

    assert.equal(res.statusCode, 201);
    const notificationPayload = mockEmit.mock.calls[1]!.arguments[1] as { senderName: string; preview: string };
    assert.equal(notificationPayload.senderName, 'Test User');
    assert.equal(notificationPayload.preview.length, 50);
    assert.equal(notificationPayload.preview, 'A'.repeat(50));

    setDmIO(null as unknown as import('socket.io').Server);
  });

  it('uses attachment preview when content is absent', async () => {
    const { mockIo, mockEmit } = makeMockIo();
    setDmIO(mockIo);

    mockGetConversation.mock.mockImplementation(async () => ({
      status: 200,
      data: { conversation: { participantIds: ['user-1', 'user-2'] } },
    }));
    mockIsBlockedBidirectional.mock.mockImplementation(async () => false);
    mockSendDmMessage.mock.mockImplementation(async () => ({
      status: 201,
      data: { message: { _id: 'msg-1', attachmentIds: ['att-1'] } },
    }));

    const req: DmsReq = {
      userId: 'user-1',
      params: { conversationId: 'conv-1' },
      query: {},
      body: { attachmentIds: ['att-1'] },
    };
    const res = makeRes();

    await postMessagesHandler(req, res);

    assert.equal(res.statusCode, 201);
    const notificationPayload = mockEmit.mock.calls[1]!.arguments[1] as { senderName: string; preview: string };
    assert.equal(notificationPayload.senderName, 'Test User');
    assert.equal(notificationPayload.preview, '📎 Attachment');

    setDmIO(null as unknown as import('socket.io').Server);
  });
});
