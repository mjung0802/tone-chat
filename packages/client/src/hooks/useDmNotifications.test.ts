import { renderHook, act } from '@testing-library/react-native';
import { useSocketStore } from '../stores/socketStore';
import { useNotificationStore } from '../stores/notificationStore';
import { createHookWrapper } from '../test-utils/renderWithProviders';
import { useDmNotifications } from './useDmNotifications';
import * as systemNotifications from '../utils/systemNotifications';

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

type DmNotificationEvent = { conversationId: string; otherUserId: string; senderName: string; preview: string };

function findHandler(mockSocket: ReturnType<typeof createMockSocket>, event: string) {
  const call = mockSocket.on.mock.calls.find(([e]: [string]) => e === event);
  return call?.[1] as ((event: DmNotificationEvent) => Promise<void>) | undefined;
}

describe('useDmNotifications', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = createMockSocket();
    useSocketStore.setState({ socket: mockSocket as never, isConnected: true });
    useNotificationStore.setState({
      currentNotification: null,
      currentConversationId: null,
      notificationPreference: 'quiet',
      dmUnreadEntries: {},
    });
    jest.mocked(systemNotifications.hasNotificationPermission).mockResolvedValue(false);
    jest.mocked(systemNotifications.showSystemNotification).mockResolvedValue(undefined);
  });

  afterEach(() => {
    useSocketStore.setState({ socket: null, isConnected: false });
  });

  it('registers dm:notification listener on socket', () => {
    renderHook(() => useDmNotifications(), { wrapper: createHookWrapper() });
    expect(mockSocket.on).toHaveBeenCalledWith('dm:notification', expect.any(Function));
  });

  it('increments DM unread count when notification fires', async () => {
    renderHook(() => useDmNotifications(), { wrapper: createHookWrapper() });
    const handler = findHandler(mockSocket, 'dm:notification');
    await act(async () => {
      await handler!({ conversationId: 'conv-1', otherUserId: 'user-2', senderName: 'Alice', preview: 'Hello' });
    });
    const { dmUnreadEntries } = useNotificationStore.getState();
    expect(dmUnreadEntries['conv-1']).toBeDefined();
    expect(dmUnreadEntries['conv-1']!.count).toBe(1);
  });

  it('suppresses increment when currentConversationId matches', async () => {
    useNotificationStore.setState({ currentConversationId: 'conv-1' });
    renderHook(() => useDmNotifications(), { wrapper: createHookWrapper() });
    const handler = findHandler(mockSocket, 'dm:notification');
    await act(async () => {
      await handler!({ conversationId: 'conv-1', otherUserId: 'user-2', senderName: 'Alice', preview: 'Hello' });
    });
    const { dmUnreadEntries } = useNotificationStore.getState();
    expect(dmUnreadEntries['conv-1']).toBeUndefined();
  });

  it('shows system notification when preference is system and permission granted', async () => {
    useNotificationStore.setState({ notificationPreference: 'system' });
    jest.mocked(systemNotifications.hasNotificationPermission).mockResolvedValue(true);
    renderHook(() => useDmNotifications(), { wrapper: createHookWrapper() });
    const handler = findHandler(mockSocket, 'dm:notification');
    await act(async () => {
      await handler!({ conversationId: 'conv-1', otherUserId: 'user-2', senderName: 'Alice', preview: 'Hello!' });
    });
    expect(systemNotifications.showSystemNotification).toHaveBeenCalledWith('Tone Chat', 'Alice: Hello!');
  });

  it('falls back to in-app notification when permission denied', async () => {
    useNotificationStore.setState({ notificationPreference: 'system' });
    jest.mocked(systemNotifications.hasNotificationPermission).mockResolvedValue(false);
    renderHook(() => useDmNotifications(), { wrapper: createHookWrapper() });
    const handler = findHandler(mockSocket, 'dm:notification');
    await act(async () => {
      await handler!({ conversationId: 'conv-1', otherUserId: 'user-2', senderName: 'Alice', preview: 'Hello!' });
    });
    const { currentNotification } = useNotificationStore.getState();
    expect(currentNotification).not.toBeNull();
    expect(systemNotifications.showSystemNotification).not.toHaveBeenCalled();
  });

  it('cleans up listener on unmount', () => {
    const { unmount } = renderHook(() => useDmNotifications(), { wrapper: createHookWrapper() });
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith('dm:notification', expect.any(Function));
  });

  it('does not register listener when socket is null', () => {
    useSocketStore.setState({ socket: null, isConnected: false });
    renderHook(() => useDmNotifications(), { wrapper: createHookWrapper() });
    expect(mockSocket.on).not.toHaveBeenCalled();
  });
});
