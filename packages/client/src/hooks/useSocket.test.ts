import { renderHook, act } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../stores/socketStore';
import { useChannelSocket, useTypingEmit } from './useSocket';
import { createHookWrapper } from '../test-utils/renderWithProviders';
import { makeMessage } from '../test-utils/fixtures';
import type { MessagesResponse } from '../types/api.types';
import type { TypingEvent } from '../types/socket.types';

// ---------- mock socket ----------

function createMockSocket() {
  return {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    auth: {},
  };
}

// ---------- helpers ----------

type CacheData = {
  pages: MessagesResponse[];
  pageParams: (string | undefined)[];
};

function findHandler(mockSocket: ReturnType<typeof createMockSocket>, event: string) {
  const call = mockSocket.on.mock.calls.find(([e]: [string]) => e === event);
  return call?.[1] as ((...args: unknown[]) => void) | undefined;
}

// ---------- useChannelSocket ----------

describe('useChannelSocket', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let queryClient: QueryClient;

  beforeEach(() => {
    mockSocket = createMockSocket();
    useSocketStore.setState({ socket: mockSocket as never, isConnected: true });
    queryClient = new QueryClient();
  });

  afterEach(() => {
    useSocketStore.setState({ socket: null, isConnected: false });
  });

  it('emits join_channel on mount', () => {
    renderHook(() => useChannelSocket('server-1', 'channel-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('join_channel', {
      serverId: 'server-1',
      channelId: 'channel-1',
    });
  });

  it('emits leave_channel on unmount', () => {
    const { unmount } = renderHook(() => useChannelSocket('server-1', 'channel-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('leave_channel', {
      serverId: 'server-1',
      channelId: 'channel-1',
    });
  });

  it('new_message handler injects into cache', () => {
    const existing = makeMessage({ _id: 'msg-1' });
    queryClient.setQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
      { pages: [{ messages: [existing] }], pageParams: [undefined] },
    );

    renderHook(() => useChannelSocket('server-1', 'channel-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'new_message');
    expect(handler).toBeDefined();

    const newMsg = makeMessage({ _id: 'msg-2', content: 'From socket' });
    act(() => handler!(newMsg));

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data!.pages[0]!.messages).toHaveLength(2);
  });

  it('typing event with matching channelId calls onTyping', () => {
    const onTyping = jest.fn();

    renderHook(() => useChannelSocket('server-1', 'channel-1', onTyping), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'typing');
    const event: TypingEvent = { userId: 'u1', channelId: 'channel-1' };
    act(() => handler!(event));

    expect(onTyping).toHaveBeenCalledWith(event);
  });

  it('typing event with different channelId is ignored', () => {
    const onTyping = jest.fn();

    renderHook(() => useChannelSocket('server-1', 'channel-1', onTyping), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'typing');
    act(() => handler!({ userId: 'u1', channelId: 'other-channel' }));

    expect(onTyping).not.toHaveBeenCalled();
  });

  it('no-ops when socket/serverId/channelId is null', () => {
    useSocketStore.setState({ socket: null, isConnected: false });

    renderHook(() => useChannelSocket(undefined, undefined), {
      wrapper: createHookWrapper(queryClient),
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(mockSocket.on).not.toHaveBeenCalled();
  });
});

// ---------- useTypingEmit ----------

describe('useTypingEmit', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockSocket = createMockSocket();
    useSocketStore.setState({ socket: mockSocket as never, isConnected: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    useSocketStore.setState({ socket: null, isConnected: false });
  });

  it('emits on first call', () => {
    const { result } = renderHook(() => useTypingEmit('server-1', 'channel-1'), {
      wrapper: createHookWrapper(),
    });

    act(() => result.current());

    expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
      serverId: 'server-1',
      channelId: 'channel-1',
    });
  });

  it('throttles within 2s', () => {
    const { result } = renderHook(() => useTypingEmit('server-1', 'channel-1'), {
      wrapper: createHookWrapper(),
    });

    act(() => result.current());
    act(() => result.current());
    act(() => result.current());

    // Only the first call should have emitted
    const typingCalls = mockSocket.emit.mock.calls.filter(
      ([event]: [string]) => event === 'typing',
    );
    expect(typingCalls).toHaveLength(1);
  });

  it('emits again after 2s+', () => {
    const { result } = renderHook(() => useTypingEmit('server-1', 'channel-1'), {
      wrapper: createHookWrapper(),
    });

    act(() => result.current());
    jest.advanceTimersByTime(2000);
    act(() => result.current());

    const typingCalls = mockSocket.emit.mock.calls.filter(
      ([event]: [string]) => event === 'typing',
    );
    expect(typingCalls).toHaveLength(2);
  });
});
