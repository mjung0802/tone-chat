import { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { useSocketStore } from '../stores/socketStore';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';
import type { DirectMessagesResponse } from '../types/api.types';
import type { DirectMessage } from '../types/models';
import { useDmSocket } from './useDmSocket';

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

type DmCacheData = {
  pages: DirectMessagesResponse[];
  pageParams: (string | undefined)[];
};

function makeDm(overrides: Partial<DirectMessage> = {}): DirectMessage {
  return {
    _id: 'dm-1',
    conversationId: 'conv-1',
    authorId: 'user-1',
    content: 'Hello DM',
    attachmentIds: [],
    mentions: [],
    reactions: [],
    tone: null,
    editedAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function findHandler(mockSocket: ReturnType<typeof createMockSocket>, event: string) {
  const call = mockSocket.on.mock.calls.find(([e]: [string]) => e === event);
  return call?.[1] as ((...args: unknown[]) => void) | undefined;
}

function seedDmCache(queryClient: QueryClient, conversationId: string, pages: DirectMessagesResponse[]): void {
  queryClient.setQueryData<DmCacheData>(
    ['dms', conversationId, 'messages'],
    { pages, pageParams: [undefined] },
  );
}

// ---------- useDmSocket ----------

describe('useDmSocket', () => {
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

  it('emits join_dm on mount when conversationId and socket are available', () => {
    renderHook(() => useDmSocket('conv-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('join_dm', { conversationId: 'conv-1' });
  });

  it('emits leave_dm on unmount', () => {
    const { unmount } = renderHook(() => useDmSocket('conv-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('leave_dm', { conversationId: 'conv-1' });
  });

  it('does not emit join_dm when conversationId is undefined', () => {
    renderHook(() => useDmSocket(undefined), {
      wrapper: createHookWrapper(queryClient),
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(mockSocket.on).not.toHaveBeenCalled();
  });

  it('does not emit join_dm when socket is null', () => {
    useSocketStore.setState({ socket: null, isConnected: false });

    renderHook(() => useDmSocket('conv-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('injects message into cache on dm:new_message', () => {
    const existing = makeDm({ _id: 'dm-1', conversationId: 'conv-1' });
    seedDmCache(queryClient, 'conv-1', [{ messages: [existing] }]);

    renderHook(() => useDmSocket('conv-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'dm:new_message');
    expect(handler).toBeDefined();

    const newDm = makeDm({ _id: 'dm-2', content: 'New DM from socket', conversationId: 'conv-1' });
    act(() => handler!({ message: newDm }));

    const data = queryClient.getQueryData<DmCacheData>(['dms', 'conv-1', 'messages']);
    expect(data!.pages[0]!.messages).toHaveLength(2);
    expect(data!.pages[0]!.messages[1]!._id).toBe('dm-2');
  });

  it('calls onTyping when dm:typing event matches conversationId', () => {
    const onTyping = jest.fn();

    renderHook(() => useDmSocket('conv-1', onTyping), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'dm:typing');
    expect(handler).toBeDefined();

    const event = { conversationId: 'conv-1', userId: 'user-2' };
    act(() => handler!(event));

    expect(onTyping).toHaveBeenCalledWith(event);
  });

  it('does NOT call onTyping when event.conversationId !== current conversationId', () => {
    const onTyping = jest.fn();

    renderHook(() => useDmSocket('conv-1', onTyping), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'dm:typing');
    act(() => handler!({ conversationId: 'conv-OTHER', userId: 'user-2' }));

    expect(onTyping).not.toHaveBeenCalled();
  });

  it('calls onNewMessage with authorId on dm:new_message', () => {
    const onNewMessage = jest.fn();
    const existing = makeDm({ _id: 'dm-1', conversationId: 'conv-1' });
    seedDmCache(queryClient, 'conv-1', [{ messages: [existing] }]);

    renderHook(() => useDmSocket('conv-1', undefined, onNewMessage), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'dm:new_message');
    const newDm = makeDm({ _id: 'dm-2', authorId: 'user-99', conversationId: 'conv-1' });
    act(() => handler!({ message: newDm }));

    expect(onNewMessage).toHaveBeenCalledWith('user-99');
  });

  it('cleans up all event listeners on unmount', () => {
    const { unmount } = renderHook(() => useDmSocket('conv-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('dm:new_message', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('dm:typing', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('dm:reaction_updated', expect.any(Function));
  });

  it('dm:reaction_updated handler updates message in cache', () => {
    const existing = makeDm({ _id: 'dm-1', conversationId: 'conv-1', reactions: [] });
    seedDmCache(queryClient, 'conv-1', [{ messages: [existing] }]);

    renderHook(() => useDmSocket('conv-1'), {
      wrapper: createHookWrapper(queryClient),
    });

    const handler = findHandler(mockSocket, 'dm:reaction_updated');
    expect(handler).toBeDefined();

    const updated = makeDm({
      _id: 'dm-1',
      conversationId: 'conv-1',
      reactions: [{ emoji: '👍', userIds: ['user-1'] }],
    });
    act(() => handler!({ message: updated }));

    const data = queryClient.getQueryData<DmCacheData>(['dms', 'conv-1', 'messages']);
    expect(data!.pages[0]!.messages[0]!.reactions).toEqual([{ emoji: '👍', userIds: ['user-1'] }]);
  });
});
