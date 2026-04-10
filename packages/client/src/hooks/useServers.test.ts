import { renderHook, waitFor } from '@testing-library/react-native';
import * as serversApi from '../api/servers.api';
import { useServers, useServer } from './useServers';
import { createHookWrapper } from '../test-utils/renderWithProviders';
import { useAuthStore } from '../stores/authStore';

jest.mock('../api/servers.api');

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

describe('useServers', () => {
  it('stays idle when isHydrated is false', () => {
    useAuthStore.setState({ isHydrated: false, isAuthenticated: false });

    const { result } = renderHook(() => useServers(), {
      wrapper: createHookWrapper(),
    });

    expect(serversApi.getServers).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stays idle when isAuthenticated is false', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => useServers(), {
      wrapper: createHookWrapper(),
    });

    expect(serversApi.getServers).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fires and returns data when isHydrated and isAuthenticated are true', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });

    jest.mocked(serversApi.getServers).mockResolvedValueOnce({ servers: [] });

    const { result } = renderHook(() => useServers(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(serversApi.getServers).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([]);
  });
});

describe('useServer', () => {
  it('stays idle when auth is not ready, even with a valid serverId', () => {
    useAuthStore.setState({ isHydrated: false, isAuthenticated: false });

    const { result } = renderHook(() => useServer('server-1'), {
      wrapper: createHookWrapper(),
    });

    expect(serversApi.getServer).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fires when auth is ready and serverId is provided', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });

    jest.mocked(serversApi.getServer).mockResolvedValueOnce({
      server: { _id: 'server-1', name: 'Test', ownerId: 'user-1', visibility: 'public', createdAt: '', updatedAt: '' },
    });

    const { result } = renderHook(() => useServer('server-1'), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(serversApi.getServer).toHaveBeenCalledWith('server-1');
  });
});
