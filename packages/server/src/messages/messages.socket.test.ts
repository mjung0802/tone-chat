import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const mockCreateMessage = mock.fn<AnyFn>();
const mockToggleReaction = mock.fn<AnyFn>();
mock.module('./messages.client.js', {
  namedExports: { createMessage: mockCreateMessage, toggleReaction: mockToggleReaction },
});

const mockEmitMentionsFromResult = mock.fn<AnyFn>();
mock.module('./mentions.helper.js', {
  namedExports: { emitMentionsFromResult: mockEmitMentionsFromResult },
});

const { registerMessageHandlers } = await import('./messages.socket.js');

describe('registerMessageHandlers', () => {
  type SocketHandler = (payload?: unknown) => void | Promise<void>;
  type TestSocket = {
    on: (event: string, handler: SocketHandler) => void;
    to: ReturnType<typeof mock.fn>;
    emit: ReturnType<typeof mock.fn>;
    _toEmit?: ReturnType<typeof mock.fn>;
  };
  type TestIo = {
    to: ReturnType<typeof mock.fn>;
  };

  let handlers: Record<string, SocketHandler>;
  let socket: TestSocket;
  let io: TestIo;

  beforeEach(() => {
    mockCreateMessage.mock.resetCalls();
    mockToggleReaction.mock.resetCalls();
    mockEmitMentionsFromResult.mock.resetCalls();
    handlers = {};
    const mockToEmit = mock.fn();
    socket = {
      on: (event: string, handler: SocketHandler) => { handlers[event] = handler; },
      to: mock.fn(() => ({ emit: mockToEmit })),
      emit: mock.fn(),
    };
    socket._toEmit = mockToEmit;
    io = {
      to: mock.fn(() => ({ emit: mock.fn() })),
    };
    // @ts-expect-error - Using simplified test mocks for io and socket
    registerMessageHandlers(io, socket, 'mock-token', 'user-1');
  });

  describe('send_message', () => {
    it('calls createMessage and emits new_message on 201', async () => {
      const msgData = { serverId: 's1', channelId: 'c1', content: 'hello' };
      const responseData = { message: { id: 'm1', content: 'hello' } };
      mockCreateMessage.mock.mockImplementation(async () => ({ status: 201, data: responseData }));

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['send_message']!(msgData);

      assert.equal(mockCreateMessage.mock.callCount(), 1);
      assert.equal(io.to.mock.callCount(), 1);
      assert.equal(io.to.mock.calls[0]!.arguments[0], 'server:s1:channel:c1');
      assert.equal(ioEmit.mock.calls[0]!.arguments[0], 'new_message');
      assert.deepEqual(ioEmit.mock.calls[0]!.arguments[1], responseData);
    });

    it('does not emit new_message on non-201 status, but emits message_error', async () => {
      mockCreateMessage.mock.mockImplementation(async () => ({ status: 400, data: { error: { code: 'BAD', message: 'bad' } } }));

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'test' });
      assert.equal(ioEmit.mock.callCount(), 0);
      assert.equal(socket.emit.mock.callCount(), 1);
      assert.equal(socket.emit.mock.calls[0]!.arguments[0], 'message_error');
    });

    it('passes replyToId and mentions to createMessage', async () => {
      const msgData = { serverId: 's1', channelId: 'c1', content: 'hello', replyToId: 'orig1', mentions: ['u2'] };
      const responseData = { message: { _id: 'm1', content: 'hello', mentions: ['u2'] } };
      mockCreateMessage.mock.mockImplementation(async () => ({ status: 201, data: responseData }));
      mockEmitMentionsFromResult.mock.mockImplementation(async () => {});

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['send_message']!(msgData);

      const createArgs = mockCreateMessage.mock.calls[0]!.arguments;
      const body = createArgs[3] as Record<string, unknown>;
      assert.equal(body.replyToId, 'orig1');
      assert.deepEqual(body.mentions, ['u2']);
    });

    it('calls emitMentionsFromResult after successful create', async () => {
      const responseData = { message: { _id: 'm1', content: 'hello', mentions: ['u2', 'u3'] } };
      mockCreateMessage.mock.mockImplementation(async () => ({ status: 201, data: responseData }));
      mockEmitMentionsFromResult.mock.mockImplementation(async () => {});

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'hello', mentions: ['u2', 'u3'] });

      assert.equal(mockEmitMentionsFromResult.mock.callCount(), 1);
      const args = mockEmitMentionsFromResult.mock.calls[0]!.arguments;
      assert.equal(args[1], 'user-1');     // senderId
      assert.equal(args[2], 's1');         // serverId
      assert.equal(args[3], 'c1');         // channelId
      assert.deepEqual(args[4], responseData); // resultData
    });

    it('does not call emitMentionsFromResult on non-201', async () => {
      mockCreateMessage.mock.mockImplementation(async () => ({ status: 403, data: { error: { code: 'MUTED', message: 'muted', mutedUntil: '2099-01-01' } } }));

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'hello' });

      assert.equal(mockEmitMentionsFromResult.mock.callCount(), 0);
      // Should emit message_error with mutedUntil
      assert.equal(socket.emit.mock.callCount(), 1);
      const errorPayload = socket.emit.mock.calls[0]!.arguments[1] as { code: string; mutedUntil?: string };
      assert.equal(errorPayload.code, 'MUTED');
      assert.equal(errorPayload.mutedUntil, '2099-01-01');
    });

    it('validates replyToId is a non-empty string', async () => {
      await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'hello', replyToId: '' });
      assert.equal(mockCreateMessage.mock.callCount(), 0);
    });

    it('validates mentions is an array of strings with max 20', async () => {
      await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'hello', mentions: 'not-array' });
      assert.equal(mockCreateMessage.mock.callCount(), 0);
    });

    it('passes tone to createMessage body when provided', async () => {
      const msgData = { serverId: 's1', channelId: 'c1', content: 'hello', tone: 'j' };
      mockCreateMessage.mock.mockImplementation(async () => ({ status: 201, data: { message: { _id: 'm1' } } }));
      mockEmitMentionsFromResult.mock.mockImplementation(async () => {});

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['send_message']!(msgData);

      const body = mockCreateMessage.mock.calls[0]!.arguments[3] as Record<string, unknown>;
      assert.equal(body.tone, 'j');
    });

    it('rejects non-string tone', async () => {
      await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'hello', tone: { $gt: '' } });
      assert.equal(mockCreateMessage.mock.callCount(), 0);
    });

    it('rejects tone exceeding 50 chars', async () => {
      await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: 'hello', tone: 'a'.repeat(51) });
      assert.equal(mockCreateMessage.mock.callCount(), 0);
    });

    it('accepts message without tone', async () => {
      const msgData = { serverId: 's1', channelId: 'c1', content: 'hello' };
      mockCreateMessage.mock.mockImplementation(async () => ({ status: 201, data: { message: { _id: 'm1' } } }));
      mockEmitMentionsFromResult.mock.mockImplementation(async () => {});

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['send_message']!(msgData);

      const body = mockCreateMessage.mock.calls[0]!.arguments[3] as Record<string, unknown>;
      assert.equal(body.tone, undefined);
    });
  });

  describe('typing', () => {
    it('broadcasts typing event to the room', () => {
      const toEmit = mock.fn();
      socket.to = mock.fn(() => ({ emit: toEmit }));

      handlers['typing']!({ serverId: 's1', channelId: 'c1' });

      assert.equal(socket.to.mock.callCount(), 1);
      assert.equal(socket.to.mock.calls[0]!.arguments[0], 'server:s1:channel:c1');
      assert.equal(toEmit.mock.calls[0]!.arguments[0], 'typing');
      assert.deepEqual(toEmit.mock.calls[0]!.arguments[1], { userId: 'user-1', channelId: 'c1' });
    });
  });

  describe('toggle_reaction', () => {
    it('calls toggleReaction and broadcasts reaction_updated on 200', async () => {
      const data = { serverId: 's1', channelId: 'c1', messageId: 'm1', emoji: '👍' };
      const responseData = { message: { _id: 'm1', reactions: [{ emoji: '👍', userIds: ['user-1'] }] } };
      mockToggleReaction.mock.mockImplementation(async () => ({ status: 200, data: responseData }));

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['toggle_reaction']!(data);

      assert.equal(mockToggleReaction.mock.callCount(), 1);
      const args = mockToggleReaction.mock.calls[0]!.arguments;
      assert.equal(args[0], 'mock-token');
      assert.equal(args[1], 's1');
      assert.equal(args[2], 'c1');
      assert.equal(args[3], 'm1');
      assert.deepEqual(args[4], { emoji: '👍' });

      assert.equal(io.to.mock.callCount(), 1);
      assert.equal(io.to.mock.calls[0]!.arguments[0], 'server:s1:channel:c1');
      assert.equal(ioEmit.mock.calls[0]!.arguments[0], 'reaction_updated');
      assert.deepEqual(ioEmit.mock.calls[0]!.arguments[1], responseData);
    });

    it('does not broadcast on non-200 status', async () => {
      mockToggleReaction.mock.mockImplementation(async () => ({ status: 400, data: { error: 'bad' } }));

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['toggle_reaction']!({ serverId: 's1', channelId: 'c1', messageId: 'm1', emoji: '👍' });
      assert.equal(ioEmit.mock.callCount(), 0);
    });

    it('ignores missing serverId', async () => {
      await handlers['toggle_reaction']!({ channelId: 'c1', messageId: 'm1', emoji: '👍' });
      assert.equal(mockToggleReaction.mock.callCount(), 0);
    });

    it('ignores missing channelId', async () => {
      await handlers['toggle_reaction']!({ serverId: 's1', messageId: 'm1', emoji: '👍' });
      assert.equal(mockToggleReaction.mock.callCount(), 0);
    });

    it('ignores missing messageId', async () => {
      await handlers['toggle_reaction']!({ serverId: 's1', channelId: 'c1', emoji: '👍' });
      assert.equal(mockToggleReaction.mock.callCount(), 0);
    });

    it('ignores missing emoji', async () => {
      await handlers['toggle_reaction']!({ serverId: 's1', channelId: 'c1', messageId: 'm1' });
      assert.equal(mockToggleReaction.mock.callCount(), 0);
    });

    it('ignores emoji too long', async () => {
      await handlers['toggle_reaction']!({ serverId: 's1', channelId: 'c1', messageId: 'm1', emoji: 'a'.repeat(33) });
      assert.equal(mockToggleReaction.mock.callCount(), 0);
    });

    it('ignores non-string fields', async () => {
      await handlers['toggle_reaction']!({ serverId: 123, channelId: 'c1', messageId: 'm1', emoji: '👍' });
      assert.equal(mockToggleReaction.mock.callCount(), 0);
    });
  });
});
