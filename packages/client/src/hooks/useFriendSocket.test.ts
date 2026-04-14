import { renderHook } from '@testing-library/react-native';
import { useSocketStore } from '../stores/socketStore';
import { createHookWrapper } from '../test-utils/renderWithProviders';
import { useFriendSocket } from './useFriendSocket';

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

describe('useFriendSocket', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = createMockSocket();
    useSocketStore.setState({ socket: mockSocket as never, isConnected: true });
  });

  afterEach(() => {
    useSocketStore.setState({ socket: null, isConnected: false });
  });

  it('registers friend:request_received listener', () => {
    renderHook(() => useFriendSocket(), { wrapper: createHookWrapper() });
    expect(mockSocket.on).toHaveBeenCalledWith('friend:request_received', expect.any(Function));
  });

  it('registers friend:request_accepted listener', () => {
    renderHook(() => useFriendSocket(), { wrapper: createHookWrapper() });
    expect(mockSocket.on).toHaveBeenCalledWith('friend:request_accepted', expect.any(Function));
  });

  it('cleans up both listeners on unmount', () => {
    const { unmount } = renderHook(() => useFriendSocket(), { wrapper: createHookWrapper() });
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith('friend:request_received', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('friend:request_accepted', expect.any(Function));
  });

  it('does not register listeners when socket is null', () => {
    useSocketStore.setState({ socket: null, isConnected: false });
    renderHook(() => useFriendSocket(), { wrapper: createHookWrapper() });
    expect(mockSocket.on).not.toHaveBeenCalled();
  });
});
