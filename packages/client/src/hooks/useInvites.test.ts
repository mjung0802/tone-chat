import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import * as invitesApi from '../api/invites.api';
import { useInvites, useDefaultInvite, useInviteStatus, useJoinViaCode } from './useInvites';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';
import { useAuthStore } from '../stores/authStore';

jest.mock('../api/invites.api');

const SERVER_ID = 'server-1';

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

describe('useInvites', () => {
  it('stays idle when isHydrated is false', () => {
    useAuthStore.setState({ isHydrated: false, isAuthenticated: false });

    const { result } = renderHook(() => useInvites(SERVER_ID), { wrapper: createHookWrapper() });

    expect(invitesApi.getInvites).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stays idle when isAuthenticated is false', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => useInvites(SERVER_ID), { wrapper: createHookWrapper() });

    expect(invitesApi.getInvites).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useDefaultInvite', () => {
  it('stays idle when isHydrated is false', () => {
    useAuthStore.setState({ isHydrated: false, isAuthenticated: false });

    const { result } = renderHook(() => useDefaultInvite(SERVER_ID), {
      wrapper: createHookWrapper(),
    });

    expect(invitesApi.getDefaultInvite).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stays idle when isAuthenticated is false', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => useDefaultInvite(SERVER_ID), {
      wrapper: createHookWrapper(),
    });

    expect(invitesApi.getDefaultInvite).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useInviteStatus', () => {
  it('stays idle when not authed', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => useInviteStatus('abc'), {
      wrapper: createHookWrapper(),
    });

    expect(invitesApi.getInviteStatus).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches and caches status by code when authed', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });
    jest.mocked(invitesApi.getInviteStatus).mockResolvedValueOnce({
      code: 'abc',
      serverId: 's1',
      serverName: 'Test',
      status: 'valid',
      alreadyMember: false,
      banned: false,
    });

    const { result } = renderHook(() => useInviteStatus('abc'), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invitesApi.getInviteStatus).toHaveBeenCalledWith('abc');
    expect(result.current.data?.status).toBe('valid');
  });

  it('stays idle when code is empty', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });

    const { result } = renderHook(() => useInviteStatus(''), {
      wrapper: createHookWrapper(),
    });

    expect(invitesApi.getInviteStatus).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useJoinViaCode', () => {
  it('invalidates servers and invite-status caches on success', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });
    jest.mocked(invitesApi.joinViaCode).mockResolvedValueOnce({
      member: { _id: 'm1', userId: 'u1', serverId: 's1' } as never,
      server: { _id: 's1', name: 'Test' } as never,
    });

    const queryClient: QueryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useJoinViaCode(), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate('abc');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map(([arg]) =>
      ((arg as { queryKey: unknown[] } | undefined)?.queryKey ?? [])[0],
    );
    expect(invalidatedKeys).toContain('servers');
    expect(invalidatedKeys).toContain('invite-status');
  });
});
