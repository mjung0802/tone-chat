import { renderHook, act } from '@testing-library/react-native';
import { useSocketStore } from '../stores/socketStore';
import { useNotificationStore } from '../stores/notificationStore';
import { createHookWrapper } from '../test-utils/renderWithProviders';
import { useMentionNotifications } from './useMentionNotifications';
import * as systemNotifications from '../utils/systemNotifications';
import type { MentionEvent } from '../types/socket.types';

jest.mock('../utils/systemNotifications');

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

function findHandler(mockSocket: ReturnType<typeof createMockSocket>, event: string) {
  const call = mockSocket.on.mock.calls.find(([e]: [string]) => e === event);
  return call?.[1] as ((event: MentionEvent) => Promise<void>) | undefined;
}

describe('useMentionNotifications', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = createMockSocket();
    useSocketStore.setState({ socket: mockSocket as never, isConnected: true });
    useNotificationStore.setState({
      currentNotification: null,
      currentChannelId: null,
      notificationPreference: 'quiet',
    });
    jest.mocked(systemNotifications.hasNotificationPermission).mockResolvedValue(false);
    jest.mocked(systemNotifications.showSystemNotification).mockResolvedValue(undefined);
  });

  afterEach(() => {
    useSocketStore.setState({ socket: null, isConnected: false });
  });

  it('registers mention listener on socket', () => {
    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    expect(mockSocket.on).toHaveBeenCalledWith('mention', expect.any(Function));
  });

  it('calls showNotification when mention event fires', () => {
    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    const handler = findHandler(mockSocket, 'mention');
    const event: MentionEvent = {
      messageId: 'msg-1',
      channelId: 'ch-1',
      serverId: 'srv-1',
      authorId: 'user-2',
    };
    handler!(event);

    expect(useNotificationStore.getState().currentNotification).toEqual(event);
  });

  it('suppresses notification when currentChannelId matches', () => {
    useNotificationStore.setState({ currentChannelId: 'ch-1' });

    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    const handler = findHandler(mockSocket, 'mention');
    handler!({
      messageId: 'msg-1',
      channelId: 'ch-1',
      serverId: 'srv-1',
      authorId: 'user-2',
    });

    expect(useNotificationStore.getState().currentNotification).toBeNull();
  });

  it('does not suppress when currentChannelId differs', () => {
    useNotificationStore.setState({ currentChannelId: 'ch-other' });

    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    const handler = findHandler(mockSocket, 'mention');
    const event: MentionEvent = {
      messageId: 'msg-1',
      channelId: 'ch-1',
      serverId: 'srv-1',
      authorId: 'user-2',
    };
    handler!(event);

    expect(useNotificationStore.getState().currentNotification).toEqual(event);
  });

  it('cleans up listener on unmount', () => {
    const { unmount } = renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('mention', expect.any(Function));
  });

  it('does not register listener when socket is null', () => {
    useSocketStore.setState({ socket: null, isConnected: false });

    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    expect(mockSocket.on).not.toHaveBeenCalled();
  });

  it('uses in-app notification when preference is quiet', async () => {
    useNotificationStore.setState({ notificationPreference: 'quiet' });

    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    const handler = findHandler(mockSocket, 'mention');
    const event: MentionEvent = {
      messageId: 'msg-1',
      channelId: 'ch-1',
      serverId: 'srv-1',
      authorId: 'user-2',
    };
    await act(async () => { await handler!(event); });

    expect(useNotificationStore.getState().currentNotification).toEqual(event);
    expect(systemNotifications.showSystemNotification).not.toHaveBeenCalled();
  });

  it('uses system notification when preference is system and permission granted', async () => {
    useNotificationStore.setState({ notificationPreference: 'system' });
    jest.mocked(systemNotifications.hasNotificationPermission).mockResolvedValue(true);

    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    const handler = findHandler(mockSocket, 'mention');
    const event: MentionEvent = {
      messageId: 'msg-1',
      channelId: 'ch-1',
      serverId: 'srv-1',
      authorId: 'user-2',
    };
    await act(async () => { await handler!(event); });

    expect(systemNotifications.showSystemNotification).toHaveBeenCalledWith(
      'Tone Chat',
      expect.stringContaining('mentioned you'),
    );
    expect(useNotificationStore.getState().currentNotification).toBeNull();
  });

  it('falls back to in-app when preference is system but permission denied', async () => {
    useNotificationStore.setState({ notificationPreference: 'system' });
    jest.mocked(systemNotifications.hasNotificationPermission).mockResolvedValue(false);

    renderHook(() => useMentionNotifications(), {
      wrapper: createHookWrapper(),
    });

    const handler = findHandler(mockSocket, 'mention');
    const event: MentionEvent = {
      messageId: 'msg-1',
      channelId: 'ch-1',
      serverId: 'srv-1',
      authorId: 'user-2',
    };
    await act(async () => { await handler!(event); });

    expect(useNotificationStore.getState().currentNotification).toEqual(event);
    expect(systemNotifications.showSystemNotification).not.toHaveBeenCalled();
  });
});
