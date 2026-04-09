import { renderHook, waitFor } from '@testing-library/react-native';
import * as channelsApi from '../api/channels.api';
import { useChannels, useChannel } from './useChannels';
import { createHookWrapper } from '../test-utils/renderWithProviders';
import { useAuthStore } from '../stores/authStore';

jest.mock('../api/channels.api');

const SERVER_ID = 'server-1';
const CHANNEL_ID = 'channel-1';

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

describe('useChannels', () => {
  it('stays idle when isHydrated is false', () => {
    useAuthStore.setState({ isHydrated: false, isAuthenticated: false });

    const { result } = renderHook(() => useChannels(SERVER_ID), { wrapper: createHookWrapper() });

    expect(channelsApi.getChannels).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stays idle when isAuthenticated is false', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => useChannels(SERVER_ID), { wrapper: createHookWrapper() });

    expect(channelsApi.getChannels).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fires and returns channels when auth is ready', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });

    jest.mocked(channelsApi.getChannels).mockResolvedValueOnce({ channels: [] });

    const { result } = renderHook(() => useChannels(SERVER_ID), { wrapper: createHookWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(channelsApi.getChannels).toHaveBeenCalledWith(SERVER_ID);
    expect(result.current.data).toEqual([]);
  });
});

describe('useChannel', () => {
  it('stays idle when auth is not ready, even with valid IDs', () => {
    useAuthStore.setState({ isHydrated: false, isAuthenticated: false });

    const { result } = renderHook(() => useChannel(SERVER_ID, CHANNEL_ID), {
      wrapper: createHookWrapper(),
    });

    expect(channelsApi.getChannel).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});
