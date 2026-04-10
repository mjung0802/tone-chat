import { renderHook } from '@testing-library/react-native';
import * as tonesApi from '../api/tones.api';
import { useCustomTones } from './useTones';
import { createHookWrapper } from '../test-utils/renderWithProviders';
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
