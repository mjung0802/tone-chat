import { renderHook } from '@testing-library/react-native';
import * as invitesApi from '../api/invites.api';
import { useInvites, useDefaultInvite } from './useInvites';
import { createHookWrapper } from '../test-utils/renderWithProviders';
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
