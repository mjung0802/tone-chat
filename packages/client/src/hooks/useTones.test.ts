import { renderHook, waitFor } from '@testing-library/react-native';
import * as tonesApi from '../api/tones.api';
import { useCustomTones, useAddCustomTone, useRemoveCustomTone } from './useTones';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';
import { useAuthStore } from '../stores/authStore';

jest.mock('../api/tones.api');

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

describe('useCustomTones', () => {
  it('stays idle when isHydrated is false', () => {
    useAuthStore.setState({ isHydrated: false, isAuthenticated: false });

    const { result } = renderHook(() => useCustomTones(SERVER_ID), { wrapper: createHookWrapper() });

    expect(tonesApi.getCustomTones).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stays idle when isAuthenticated is false', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => useCustomTones(SERVER_ID), { wrapper: createHookWrapper() });

    expect(tonesApi.getCustomTones).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCustomTones — success', () => {
  it('fetches and returns customTones when auth is ready', async () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: true });

    jest.mocked(tonesApi.getCustomTones).mockResolvedValueOnce({ customTones: [] });

    const { result } = renderHook(() => useCustomTones(SERVER_ID), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(tonesApi.getCustomTones).toHaveBeenCalledWith(SERVER_ID);
    expect(result.current.data).toEqual([]);
  });
});

describe('useAddCustomTone', () => {
  it('calls addCustomTone API and invalidates customTones query on success', async () => {
    const fakeCustomTone = {
      key: 'chill',
      label: 'chill',
      emoji: '😎',
      colorLight: '#111111',
      colorDark: '#eeeeee',
      textStyle: 'normal' as const,
    };
    jest.mocked(tonesApi.addCustomTone).mockResolvedValueOnce({ customTone: fakeCustomTone });

    const queryClient = createTestQueryClient();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddCustomTone(SERVER_ID), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate({
      key: 'chill',
      label: 'chill',
      emoji: '😎',
      colorLight: '#111111',
      colorDark: '#eeeeee',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(tonesApi.addCustomTone).toHaveBeenCalledWith(SERVER_ID, {
      key: 'chill',
      label: 'chill',
      emoji: '😎',
      colorLight: '#111111',
      colorDark: '#eeeeee',
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['servers', SERVER_ID, 'customTones'] });
  });
});

describe('useRemoveCustomTone', () => {
  it('calls removeCustomTone API and invalidates customTones query on success', async () => {
    jest.mocked(tonesApi.removeCustomTone).mockResolvedValueOnce(undefined);

    const queryClient = createTestQueryClient();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRemoveCustomTone(SERVER_ID), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate('chill');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(tonesApi.removeCustomTone).toHaveBeenCalledWith(SERVER_ID, 'chill');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['servers', SERVER_ID, 'customTones'] });
  });
});
