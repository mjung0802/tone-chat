import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const mockGetConversation = mock.fn<AnyFn>();
const mockSendDmMessage = mock.fn<AnyFn>();
const mockReactToDmMessage = mock.fn<AnyFn>();
mock.module('./dms.client.js', {
  namedExports: {
    getConversation: mockGetConversation,
    sendDmMessage: mockSendDmMessage,
    reactToDmMessage: mockReactToDmMessage,
  },
});

const mockIsBlockedBidirectional = mock.fn<AnyFn>();
mock.module('../users/users.client.js', {
  namedExports: {
    isBlockedBidirectional: mockIsBlockedBidirectional,
  },
});

const { registerDmHandlers } = await import('./dms.socket.js');

describe('registerDmHandlers', () => {
  type SocketHandler = (payload?: unknown) => void | Promise<void>;
  type TestSocket = {
    on: (event: string, handler: SocketHandler) => void;
    to: ReturnType<typeof mock.fn>;
    emit: ReturnType<typeof mock.fn>;
    join: ReturnType<typeof mock.fn>;
    leave: ReturnType<typeof mock.fn>;
  };
  type TestIo = {
    to: ReturnType<typeof mock.fn>;
  };

  let handlers: Record<string, SocketHandler>;
  let socket: TestSocket;
  let io: TestIo;

  beforeEach(() => {
    mockGetConversation.mock.resetCalls();
    mockSendDmMessage.mock.resetCalls();
    mockReactToDmMessage.mock.resetCalls();
    mockIsBlockedBidirectional.mock.resetCalls();

    handlers = {};
    socket = {
      on: (event: string, handler: SocketHandler) => { handlers[event] = handler; },
      to: mock.fn(() => ({ emit: mock.fn() })),
      emit: mock.fn(),
      join: mock.fn(),
      leave: mock.fn(),
    };
    io = {
      to: mock.fn(() => ({ emit: mock.fn() })),
    };
    // @ts-expect-error - Using simplified test mocks for io and socket
    registerDmHandlers(io, socket, 'user-1');
  });

  describe('join_dm', () => {
    it('ignores invalid data (no conversationId)', async () => {
      await handlers['join_dm']!({ notAConversationId: 'abc' });
      assert.equal(mockGetConversation.mock.callCount(), 0);
    });

    it('emits error if conversation not found (service returns non-200)', async () => {
      mockGetConversation.mock.mockImplementation(async () => ({ status: 404, data: null }));

      await handlers['join_dm']!({ conversationId: 'conv-1' });

      assert.equal(socket.emit.mock.callCount(), 1);
      assert.equal(socket.emit.mock.calls[0]!.arguments[0], 'error');
      assert.deepEqual(socket.emit.mock.calls[0]!.arguments[1], { message: 'Conversation not found or access denied' });
      assert.equal(socket.join.mock.callCount(), 0);
    });

    it('joins room and caches participants on success', async () => {
      mockGetConversation.mock.mockImplementation(async () => ({
        status: 200,
        data: { conversation: { participantIds: ['user-1', 'user-2'] } },
      }));

      await handlers['join_dm']!({ conversationId: 'conv-1' });

      assert.equal(socket.emit.mock.callCount(), 0);
      assert.equal(socket.join.mock.callCount(), 1);
      assert.equal(socket.join.mock.calls[0]!.arguments[0], 'dm:conv-1');
    });
  });

  describe('dm:send', () => {
    it('ignores invalid data (no conversationId)', async () => {
      await handlers['dm:send']!({ content: 'hello' });
      assert.equal(mockSendDmMessage.mock.callCount(), 0);
    });

    it('ignores data with neither content nor attachmentIds', async () => {
      await handlers['dm:send']!({ conversationId: 'conv-1' });
      assert.equal(mockSendDmMessage.mock.callCount(), 0);
    });

    it('emits dm_error BLOCKED when bidirectional block', async () => {
      mockGetConversation.mock.mockImplementation(async () => ({
        status: 200,
        data: { conversation: { participantIds: ['user-1', 'user-2'] } },
      }));
      mockIsBlockedBidirectional.mock.mockImplementation(async () => true);

      await handlers['dm:send']!({ conversationId: 'conv-1', content: 'hello' });

      assert.equal(mockSendDmMessage.mock.callCount(), 0);
      assert.equal(socket.emit.mock.callCount(), 1);
      assert.equal(socket.emit.mock.calls[0]!.arguments[0], 'dm_error');
      const payload = socket.emit.mock.calls[0]!.arguments[1] as { code: string };
      assert.equal(payload.code, 'BLOCKED');
    });

    it('broadcasts dm:new_message and dm:notification on success', async () => {
      // First join to cache participants
      mockGetConversation.mock.mockImplementation(async () => ({
        status: 200,
        data: { conversation: { participantIds: ['user-1', 'user-2'] } },
      }));
      await handlers['join_dm']!({ conversationId: 'conv-1' });

      mockIsBlockedBidirectional.mock.mockImplementation(async () => false);

      const responseData = { message: { _id: 'm1', content: 'hello' } };
      mockSendDmMessage.mock.mockImplementation(async () => ({ status: 201, data: responseData }));

      const ioEmitNewMessage = mock.fn();
      const ioEmitNotification = mock.fn();
      let callCount = 0;
      io.to = mock.fn(() => {
        callCount++;
        if (callCount === 1) return { emit: ioEmitNewMessage };
        return { emit: ioEmitNotification };
      });

      await handlers['dm:send']!({ conversationId: 'conv-1', content: 'hello' });

      assert.equal(mockSendDmMessage.mock.callCount(), 1);

      // Verify dm:new_message was emitted to room
      assert.ok(io.to.mock.calls.some((c) => c.arguments[0] === 'dm:conv-1'));
      assert.equal(ioEmitNewMessage.mock.calls[0]!.arguments[0], 'dm:new_message');
      assert.deepEqual(ioEmitNewMessage.mock.calls[0]!.arguments[1], responseData);

      // Verify dm:notification was emitted to other user's room
      assert.ok(io.to.mock.calls.some((c) => c.arguments[0] === 'user:user-2'));
      assert.equal(ioEmitNotification.mock.calls[0]!.arguments[0], 'dm:notification');
      const notification = ioEmitNotification.mock.calls[0]!.arguments[1] as {
        conversationId: string;
        otherUserId: string;
        preview: string;
      };
      assert.equal(notification.conversationId, 'conv-1');
      assert.equal(notification.otherUserId, 'user-1');
      assert.equal(notification.preview, 'hello');
    });
  });

  describe('dm:typing', () => {
    it('broadcasts to room excluding sender', () => {
      const toEmit = mock.fn();
      socket.to = mock.fn(() => ({ emit: toEmit }));

      handlers['dm:typing']!({ conversationId: 'conv-1' });

      assert.equal(socket.to.mock.callCount(), 1);
      assert.equal(socket.to.mock.calls[0]!.arguments[0], 'dm:conv-1');
      assert.equal(toEmit.mock.calls[0]!.arguments[0], 'dm:typing');
      assert.deepEqual(toEmit.mock.calls[0]!.arguments[1], { conversationId: 'conv-1', userId: 'user-1' });
    });

    it('ignores invalid data', () => {
      const toEmit = mock.fn();
      socket.to = mock.fn(() => ({ emit: toEmit }));

      handlers['dm:typing']!({ notConversationId: 'x' });

      assert.equal(toEmit.mock.callCount(), 0);
    });
  });

  describe('dm:react', () => {
    it('emits dm:reaction_updated on success', async () => {
      const responseData = { message: { _id: 'm1', reactions: [{ emoji: '👍', userIds: ['user-1'] }] } };
      mockReactToDmMessage.mock.mockImplementation(async () => ({ status: 200, data: responseData }));

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['dm:react']!({ conversationId: 'conv-1', messageId: 'm1', emoji: '👍' });

      assert.equal(mockReactToDmMessage.mock.callCount(), 1);
      const args = mockReactToDmMessage.mock.calls[0]!.arguments;
      assert.equal(args[0], 'user-1');
      assert.equal(args[1], 'conv-1');
      assert.equal(args[2], 'm1');
      assert.deepEqual(args[3], { emoji: '👍' });

      assert.equal(io.to.mock.callCount(), 1);
      assert.equal(io.to.mock.calls[0]!.arguments[0], 'dm:conv-1');
      assert.equal(ioEmit.mock.calls[0]!.arguments[0], 'dm:reaction_updated');
      assert.deepEqual(ioEmit.mock.calls[0]!.arguments[1], responseData);
    });

    it('does not emit dm:reaction_updated on non-200', async () => {
      mockReactToDmMessage.mock.mockImplementation(async () => ({ status: 400, data: { error: 'bad' } }));

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['dm:react']!({ conversationId: 'conv-1', messageId: 'm1', emoji: '👍' });

      assert.equal(ioEmit.mock.callCount(), 0);
    });

    it('ignores invalid data (missing emoji)', async () => {
      await handlers['dm:react']!({ conversationId: 'conv-1', messageId: 'm1' });
      assert.equal(mockReactToDmMessage.mock.callCount(), 0);
    });
  });
});
