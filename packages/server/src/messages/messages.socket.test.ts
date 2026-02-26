import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockCreateMessage = mock.fn<AnyFn>();
mock.module('./messages.client.js', {
  namedExports: { createMessage: mockCreateMessage },
});

const { registerMessageHandlers } = await import('./messages.socket.js');

describe('registerMessageHandlers', () => {
  let handlers: Record<string, Function>;
  let socket: any;
  let io: any;

  beforeEach(() => {
    mockCreateMessage.mock.resetCalls();
    handlers = {};
    const mockToEmit = mock.fn();
    socket = {
      on: (event: string, handler: Function) => { handlers[event] = handler; },
      to: mock.fn(() => ({ emit: mockToEmit })),
    };
    socket._toEmit = mockToEmit;
    io = {
      to: mock.fn(() => ({ emit: mock.fn() })),
    };
    registerMessageHandlers(io, socket, 'user-1');
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

    it('does not emit on non-201 status', async () => {
      mockCreateMessage.mock.mockImplementation(async () => ({ status: 400, data: { error: 'bad' } }));

      const ioEmit = mock.fn();
      io.to = mock.fn(() => ({ emit: ioEmit }));

      await handlers['send_message']!({ serverId: 's1', channelId: 'c1', content: '' });
      assert.equal(ioEmit.mock.callCount(), 0);
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
});
