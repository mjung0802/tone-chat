import { renderHook, waitFor } from '@testing-library/react-native';
import * as friendsApi from '../api/friends.api';
import { useFriends, useFriendshipStatus, usePendingRequests } from './useFriends';
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
  });
});

describe('useFriends', () => {
  it('does not call the API when isHydrated is false', () => {
    // isHydrated is false by default from beforeEach
    renderHook(() => useFriends(), { wrapper: createHookWrapper() });
    expect(friendsApi.getFriends).not.toHaveBeenCalled();
  });

  it('stays idle when not authenticated', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => useFriends(), {
      wrapper: createHookWrapper(),
    });

    expect(friendsApi.getFriends).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fires when auth is ready', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });

    jest.mocked(friendsApi.getFriends).mockResolvedValueOnce({ friends: [] });

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
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => usePendingRequests(), {
      wrapper: createHookWrapper(),
    });

    expect(friendsApi.getPendingRequests).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fires when auth is ready', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });

    jest.mocked(friendsApi.getPendingRequests).mockResolvedValueOnce({ requests: [] });

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

describe('useFriendshipStatus', () => {
  it('stays idle when isHydrated is false (with a valid userId)', () => {
    // isHydrated is false by default from beforeEach
    const { result } = renderHook(() => useFriendshipStatus('user-42'), {
      wrapper: createHookWrapper(),
    });

    expect(friendsApi.getFriendshipStatus).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stays idle when isAuthenticated is false (with a valid userId)', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => useFriendshipStatus('user-42'), {
      wrapper: createHookWrapper(),
    });

    expect(friendsApi.getFriendshipStatus).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stays idle when auth is ready but userId is null', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });

    const { result } = renderHook(() => useFriendshipStatus(null), {
      wrapper: createHookWrapper(),
    });

    expect(friendsApi.getFriendshipStatus).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fires when auth is ready and userId is set', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });

    jest.mocked(friendsApi.getFriendshipStatus).mockResolvedValueOnce({ status: 'none' });

    const { result } = renderHook(() => useFriendshipStatus('user-42'), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(friendsApi.getFriendshipStatus).toHaveBeenCalledTimes(1);
    expect(friendsApi.getFriendshipStatus).toHaveBeenCalledWith('user-42');
    expect(result.current.data).toBe('none');
  });
});
