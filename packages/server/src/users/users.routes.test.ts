import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const mockSendFriendRequest = mock.fn<AnyFn>();
const mockGetMe = mock.fn<AnyFn>();
const mockAcceptFriendRequest = mock.fn<AnyFn>();
mock.module('./users.client.js', {
  namedExports: {
    getMe: mockGetMe,
    patchMe: mock.fn(),
    getUser: mock.fn(),
    getFriends: mock.fn(),
    getPendingRequests: mock.fn(),
    getFriendshipStatus: mock.fn(),
    sendFriendRequest: mockSendFriendRequest,
    acceptFriendRequest: mockAcceptFriendRequest,
    removeFriend: mock.fn(),
    getBlockedIds: mock.fn(),
    blockUser: mock.fn(),
    unblockUser: mock.fn(),
  },
});

const mockIoEmit = mock.fn<AnyFn>();
const mockIoTo = mock.fn<AnyFn>(() => ({ emit: mockIoEmit }));
const mockGetIO = mock.fn<AnyFn>(() => ({ to: mockIoTo }));
mock.module('../socket/index.js', {
  namedExports: {
    getIO: mockGetIO,
    removeUserFromServerRooms: mock.fn(),
    setupSocketIO: mock.fn(),
  },
});

const { usersRouter } = await import('./users.routes.js');

type RouteStackEntry = { method?: string; handle?: (req: unknown, res: unknown) => Promise<void> };
type RouterLayer = { route?: { path?: string; methods?: Record<string, boolean>; stack?: RouteStackEntry[] } };

type UsersReq = {
  userId: string;
  token: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
};
type UsersRes = {
  statusCode: number;
  _json: unknown;
  _ended: boolean;
  status: (code: number) => UsersRes;
  json: (data: unknown) => UsersRes;
  end: () => UsersRes;
};

function makeRes(): UsersRes {
  const res: UsersRes = {
    statusCode: 200,
    _json: undefined,
    _ended: false,
    status(c) { res.statusCode = c; return res; },
    json(d) { res._json = d; return res; },
    end() { res._ended = true; return res; },
  };
  return res;
}

function findHandler(path: string, httpMethod: string): (req: UsersReq, res: UsersRes) => Promise<void> {
  // @ts-expect-error - simplified RouterLayer type for testing
  const layer = (usersRouter.stack as RouterLayer[]).find(
    (l) => l.route?.path === path && Boolean(l.route?.methods?.[httpMethod]),
  );
  const handle =
    (layer?.route?.stack?.find((s: RouteStackEntry) => s.method === httpMethod)?.handle) ??
    (async () => {});
  return handle as (req: UsersReq, res: UsersRes) => Promise<void>;
}

const TEST_TOKEN = 'header.payload.signature';
const TEST_USER_ID = 'user-abc-123';
const TARGET_USER_ID = 'target-xyz-456';

describe('usersRouter — socket emissions', () => {
  beforeEach(() => {
    mockSendFriendRequest.mock.resetCalls();
    mockGetMe.mock.resetCalls();
    mockAcceptFriendRequest.mock.resetCalls();
    mockIoTo.mock.resetCalls();
    mockIoEmit.mock.resetCalls();
    mockGetMe.mock.mockImplementation(async () => ({
      status: 200,
      data: { user: { display_name: 'Alice', username: 'alice' } },
    }));
  });

  describe('POST /me/friends/:userId — friend:request_received', () => {
    const handler = findHandler('/me/friends/:userId', 'post');

    it('emits userId (not token) as requesterId in friend:request_received', async () => {
      mockSendFriendRequest.mock.mockImplementation(async () => ({ status: 200, data: { status: 'pending' } }));

      const req: UsersReq = {
        userId: TEST_USER_ID,
        token: TEST_TOKEN,
        params: { userId: TARGET_USER_ID },
        query: {},
        body: {},
      };
      await handler(req, makeRes());

      assert.equal(mockIoTo.mock.callCount(), 1);
      assert.equal(mockIoTo.mock.calls[0]!.arguments[0], `user:${TARGET_USER_ID}`);
      const payload = mockIoEmit.mock.calls[0]!.arguments[1] as { requesterId: string };
      assert.equal(payload.requesterId, TEST_USER_ID);
      assert.notEqual(payload.requesterId, TEST_TOKEN);
    });
  });

  describe('POST /me/friends/:userId — friend:request_accepted (already friends)', () => {
    const handler = findHandler('/me/friends/:userId', 'post');

    it('emits userId (not token) as accepterId when status is accepted', async () => {
      mockSendFriendRequest.mock.mockImplementation(async () => ({ status: 200, data: { status: 'accepted' } }));

      const req: UsersReq = {
        userId: TEST_USER_ID,
        token: TEST_TOKEN,
        params: { userId: TARGET_USER_ID },
        query: {},
        body: {},
      };
      await handler(req, makeRes());

      assert.equal(mockIoTo.mock.callCount(), 1);
      const payload = mockIoEmit.mock.calls[0]!.arguments[1] as { accepterId: string };
      assert.equal(payload.accepterId, TEST_USER_ID);
      assert.notEqual(payload.accepterId, TEST_TOKEN);
    });
  });

  describe('PATCH /me/friends/:userId/accept — friend:request_accepted', () => {
    const handler = findHandler('/me/friends/:userId/accept', 'patch');

    it('emits userId (not token) as accepterId', async () => {
      mockAcceptFriendRequest.mock.mockImplementation(async () => ({ status: 204, data: null }));

      const req: UsersReq = {
        userId: TEST_USER_ID,
        token: TEST_TOKEN,
        params: { userId: TARGET_USER_ID },
        query: {},
        body: {},
      };
      await handler(req, makeRes());

      assert.equal(mockIoTo.mock.callCount(), 1);
      assert.equal(mockIoTo.mock.calls[0]!.arguments[0], `user:${TARGET_USER_ID}`);
      assert.equal(mockIoEmit.mock.calls[0]!.arguments[0], 'friend:request_accepted');
      const payload = mockIoEmit.mock.calls[0]!.arguments[1] as { accepterId: string };
      assert.equal(payload.accepterId, TEST_USER_ID);
      assert.notEqual(payload.accepterId, TEST_TOKEN);
    });
  });
});
