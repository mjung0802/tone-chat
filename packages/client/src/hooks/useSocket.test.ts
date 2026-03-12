import { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { useSocketStore } from '../stores/socketStore';
import { makeMessage } from '../test-utils/fixtures';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';
import type { MessagesResponse } from '../types/api.types';
import type { TypingEvent } from '../types/socket.types';
import { useChannelSocket, useTypingEmit } from './useSocket';

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
    queryClient = createTestQueryClient();
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
    act(() => handler!({ message: newMsg }));

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

  it('reaction_updated handler updates message in cache', () => {
    const existing = makeMessage({ _id: 'msg-1' });
    queryClient.setQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
      { pages: [{ messages: [existing] }], pageParams: [undefined] },
    );

    renderHook(() => useChannelSocket('server-1', 'channel-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'reaction_updated');
    expect(handler).toBeDefined();

    const updatedMsg = makeMessage({
      _id: 'msg-1',
      reactions: [{ emoji: '👍', userIds: ['u1'] }],
    });
    act(() => handler!({ message: updatedMsg }));

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data!.pages[0]!.messages[0]!.reactions).toEqual([
      { emoji: '👍', userIds: ['u1'] },
    ]);
  });

  it('cleans up reaction_updated handler on unmount', () => {
    const { unmount } = renderHook(() => useChannelSocket('server-1', 'channel-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    unmount();

    const offCalls = mockSocket.off.mock.calls.filter(
      ([event]: [string]) => event === 'reaction_updated',
    );
    expect(offCalls).toHaveLength(1);
  });

  it('no-ops when socket/serverId/channelId is null', () => {
    useSocketStore.setState({ socket: null, isConnected: false });

    renderHook(() => useChannelSocket(undefined, undefined), {
      wrapper: createHookWrapper(queryClient),
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(mockSocket.on).not.toHaveBeenCalled();
  });

  it('new_message handler with empty pages creates initial page', () => {
    queryClient.setQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
      { pages: [], pageParams: [undefined] },
    );

    renderHook(() => useChannelSocket('server-1', 'channel-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'new_message');
    const newMsg = makeMessage({ _id: 'msg-1', content: 'First' });
    act(() => handler!({ message: newMsg }));

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    // Should not create new page if pages array is empty
    expect(data!.pages).toHaveLength(0);
  });

  it('reaction_updated with multiple pages updates correct message', () => {
    const page1 = { messages: [makeMessage({ _id: 'msg-1' })] };
    const page2 = { messages: [makeMessage({ _id: 'msg-2' })] };
    queryClient.setQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
      { pages: [page1, page2], pageParams: [undefined, 'cursor1'] },
    );

    renderHook(() => useChannelSocket('server-1', 'channel-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'reaction_updated');
    const updatedMsg = makeMessage({
      _id: 'msg-2',
      reactions: [{ emoji: '❤️', userIds: ['u1'] }],
    });
    act(() => handler!({ message: updatedMsg }));

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data!.pages[1]!.messages[0]!.reactions).toEqual([{ emoji: '❤️', userIds: ['u1'] }]);
  });

  it('reaction_updated when message not found in cache does nothing', () => {
    queryClient.setQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
      { pages: [{ messages: [makeMessage({ _id: 'msg-1' })] }], pageParams: [undefined] },
    );

    renderHook(() => useChannelSocket('server-1', 'channel-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'reaction_updated');
    const updatedMsg = makeMessage({
      _id: 'msg-999',
      reactions: [{ emoji: '👎', userIds: ['u2'] }],
    });
    act(() => handler!({ message: updatedMsg }));

    const data = queryClient.getQueryData<CacheData>(
      ['servers', 'server-1', 'channels', 'channel-1', 'messages'],
    );
    expect(data!.pages[0]!.messages).toHaveLength(1);
    expect(data!.pages[0]!.messages[0]!._id).toBe('msg-1');
  });

  it('cleans up all event listeners on unmount', () => {
    const { unmount } = renderHook(() => useChannelSocket('server-1', 'channel-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('new_message', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('reaction_updated', expect.any(Function));
  });
});

// ---------- useTypingEmit ----------

describe('useTypingEmit', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'setImmediate', 'clearImmediate'] });
    mockSocket = createMockSocket();
    useSocketStore.setState({ socket: mockSocket as never, isConnected: true });
  });

  afterEach(() => {
    jest.clearAllTimers();
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

  it('no-ops when socket is null', () => {
    useSocketStore.setState({ socket: null, isConnected: false });

    const { result } = renderHook(() => useTypingEmit('server-1', 'channel-1'), {
      wrapper: createHookWrapper(),
    });

    act(() => result.current());

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('no-ops when serverId is undefined', () => {
    const { result } = renderHook(() => useTypingEmit(undefined, 'channel-1'), {
      wrapper: createHookWrapper(),
    });

    act(() => result.current());

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('no-ops when channelId is undefined', () => {
    const { result } = renderHook(() => useTypingEmit('server-1', undefined), {
      wrapper: createHookWrapper(),
    });

    act(() => result.current());

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('multiple calls within throttle period only emit once', () => {
    const { result } = renderHook(() => useTypingEmit('server-1', 'channel-1'), {
      wrapper: createHookWrapper(),
    });

    act(() => {
      result.current();
      result.current();
    });

    jest.advanceTimersByTime(500);

    act(() => {
      result.current();
    });

    const typingCalls = mockSocket.emit.mock.calls.filter(
      ([event]: [string]) => event === 'typing',
    );
    expect(typingCalls).toHaveLength(1);
  });
});
