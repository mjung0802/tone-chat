import { renderHook, waitFor } from '@testing-library/react-native';
import * as friendsApi from '../api/friends.api';
import { useFriends, usePendingRequests } from './useFriends';
import { createHookWrapper } from '../test-utils/renderWithProviders';
import { useAuthStore } from '../stores/authStore';

jest.mock('../api/friends.api');

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    userId: null,
    isAuthenticated: false,
    isHydrated: false,
    emailVerified: false,
  } as never);
});

describe('useFriends', () => {
  it('does not call the API when isHydrated is false', () => {
    // isHydrated is false by default from beforeEach
    renderHook(() => useFriends(), { wrapper: createHookWrapper() });
    expect(friendsApi.getFriends).not.toHaveBeenCalled();
  });

  it('stays idle when not authenticated', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false } as never);

    const { result } = renderHook(() => useFriends(), {
      wrapper: createHookWrapper(),
    });

    expect(friendsApi.getFriends).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fires when auth is ready', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true } as never);

    jest.mocked(friendsApi.getFriends).mockResolvedValueOnce({ friends: [] } as never);

    const { result } = renderHook(() => useFriends(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(friendsApi.getFriends).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([]);
  });
});

describe('usePendingRequests', () => {
  it('does not call the API when isHydrated is false', () => {
    // isHydrated is false by default from beforeEach
    renderHook(() => usePendingRequests(), { wrapper: createHookWrapper() });
    expect(friendsApi.getPendingRequests).not.toHaveBeenCalled();
  });

  it('stays idle when not authenticated', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false } as never);

    const { result } = renderHook(() => usePendingRequests(), {
      wrapper: createHookWrapper(),
    });

    expect(friendsApi.getPendingRequests).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fires when auth is ready', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true } as never);

    jest.mocked(friendsApi.getPendingRequests).mockResolvedValueOnce({ requests: [] } as never);

    const { result } = renderHook(() => usePendingRequests(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(friendsApi.getPendingRequests).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([]);
  });
});
