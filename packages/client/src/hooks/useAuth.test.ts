import { renderHook, waitFor } from '@testing-library/react-native';
import * as authApi from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { useInstanceStore } from '../stores/instanceStore';
import { useLogin, useRegister, useLogout, useSwitchInstance, useVerifyEmail, useResendVerification } from './useAuth';
import { createHookWrapper, createTestQueryClient } from '../test-utils/renderWithProviders';
import { makeUser, VALID_JWT } from '../test-utils/fixtures';

jest.mock('../api/auth.api');

beforeEach(() => {
  jest.clearAllMocks();

  // Spy on store methods
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    userId: null,
    isAuthenticated: false,
    isHydrated: false,
    emailVerified: false,
  });
  useInstanceStore.setState({
    instances: [],
    activeInstance: null,
    isHydrated: false,
  });
  localStorage.clear();
});

describe('useLogin', () => {
  it('onSuccess calls setTokens, connect, queryClient.clear', async () => {
    const setTokensSpy = jest.spyOn(useAuthStore.getState(), 'setTokens');
    const connectSpy = jest.fn();
    useSocketStore.setState({ connect: connectSpy } as never);

    jest.mocked(authApi.login).mockResolvedValueOnce({
      user: makeUser(),
      accessToken: 'at-1',
      refreshToken: 'rt-1',
    });

    const queryClient = createTestQueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');

    const { result } = renderHook(() => useLogin(), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate({ email: 'a@b.com', password: 'pass' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setTokensSpy).toHaveBeenCalledWith('at-1', 'rt-1', true);
    expect(connectSpy).toHaveBeenCalledWith('at-1');
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe('useRegister', () => {
  it('onSuccess calls setTokens, connect, queryClient.clear', async () => {
    const setTokensSpy = jest.spyOn(useAuthStore.getState(), 'setTokens');
    const connectSpy = jest.fn();
    useSocketStore.setState({ connect: connectSpy } as never);

    jest.mocked(authApi.register).mockResolvedValueOnce({
      user: makeUser(),
      accessToken: 'at-2',
      refreshToken: 'rt-2',
    });

    const queryClient = createTestQueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');

    const { result } = renderHook(() => useRegister(), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate({ username: 'user', email: 'a@b.com', password: 'pass' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setTokensSpy).toHaveBeenCalledWith('at-2', 'rt-2', true);
    expect(connectSpy).toHaveBeenCalledWith('at-2');
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe('useLogout', () => {
  it('calls disconnect, clearAuth, queryClient.clear', () => {
    const clearAuthSpy = jest.spyOn(useAuthStore.getState(), 'clearAuth');
    const disconnectSpy = jest.fn();
    useSocketStore.setState({ disconnect: disconnectSpy } as never);

    const queryClient = createTestQueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');

    const { result } = renderHook(() => useLogout(), {
      wrapper: createHookWrapper(queryClient),
    });

    // useLogout returns a function (not a mutation)
    result.current();

    expect(disconnectSpy).toHaveBeenCalled();
    expect(clearAuthSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe('useSwitchInstance', () => {
  const INSTANCE_A = 'https://a.example.com';

  it('disconnects, clears in-memory auth, clears DM unreads, clears query cache, and clears active instance', () => {
    useInstanceStore.getState().addInstance(INSTANCE_A);
    useAuthStore.setState({
      accessToken: 'at-1',
      refreshToken: 'rt-1',
      userId: 'user-123',
      isAuthenticated: true,
      emailVerified: true,
    });

    const disconnectSpy = jest.fn();
    useSocketStore.setState({ disconnect: disconnectSpy } as never);

    const queryClient = createTestQueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');

    const { result } = renderHook(() => useSwitchInstance(), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current();

    expect(disconnectSpy).toHaveBeenCalled();
    const auth = useAuthStore.getState();
    expect(auth.accessToken).toBeNull();
    expect(auth.refreshToken).toBeNull();
    expect(auth.userId).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.emailVerified).toBe(false);
    expect(clearSpy).toHaveBeenCalled();
    expect(useInstanceStore.getState().activeInstance).toBeNull();
  });

  it('preserves stored tokens for the current instance (the contract that distinguishes switch from logout)', () => {
    useInstanceStore.getState().addInstance(INSTANCE_A);
    localStorage.setItem(`accessToken:${INSTANCE_A}`, 'at-stored');
    localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'rt-stored');
    localStorage.setItem(`emailVerifiedKey:${INSTANCE_A}`, 'true');
    localStorage.setItem(`emailVerified:${INSTANCE_A}`, 'true');

    useSocketStore.setState({ disconnect: jest.fn() } as never);

    const { result } = renderHook(() => useSwitchInstance(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current();

    // Stored per-instance tokens must remain so the user can return later
    expect(localStorage.getItem(`accessToken:${INSTANCE_A}`)).toBe('at-stored');
    expect(localStorage.getItem(`refreshToken:${INSTANCE_A}`)).toBe('rt-stored');
    expect(localStorage.getItem(`emailVerified:${INSTANCE_A}`)).toBe('true');
    // And the instance URL itself must remain in the saved list
    expect(useInstanceStore.getState().instances).toEqual([INSTANCE_A]);
  });

  it('does not invoke clearAuth (regression guard for switch ≠ logout)', () => {
    useInstanceStore.getState().addInstance(INSTANCE_A);
    const clearAuthSpy = jest.spyOn(useAuthStore.getState(), 'clearAuth');
    useSocketStore.setState({ disconnect: jest.fn() } as never);

    const { result } = renderHook(() => useSwitchInstance(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current();

    expect(clearAuthSpy).not.toHaveBeenCalled();
  });

  it('does not throw and still resets state when no socket and no active instance', () => {
    // No active instance, no auth, no socket connected — simulating a "double switch" or stale state
    const disconnectSpy = jest.fn();
    useSocketStore.setState({ disconnect: disconnectSpy } as never);

    const { result } = renderHook(() => useSwitchInstance(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    expect(() => result.current()).not.toThrow();
    expect(disconnectSpy).toHaveBeenCalled();
    expect(useInstanceStore.getState().activeInstance).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('useLogin — email unverified', () => {
  it('calls setTokens with false and does NOT connect socket when email_verified=false', async () => {
    const setTokensSpy = jest.spyOn(useAuthStore.getState(), 'setTokens');
    const connectSpy = jest.fn();
    useSocketStore.setState({ connect: connectSpy } as never);

    jest.mocked(authApi.login).mockResolvedValueOnce({
      user: makeUser({ email_verified: false }),
      accessToken: 'at-1',
      refreshToken: 'rt-1',
    });

    const { result } = renderHook(() => useLogin(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current.mutate({ email: 'a@b.com', password: 'pass' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setTokensSpy).toHaveBeenCalledWith('at-1', 'rt-1', false);
    expect(connectSpy).not.toHaveBeenCalled();
  });
});

describe('useRegister — email unverified', () => {
  it('does NOT connect socket when email_verified=false', async () => {
    const connectSpy = jest.fn();
    useSocketStore.setState({ connect: connectSpy } as never);

    jest.mocked(authApi.register).mockResolvedValueOnce({
      user: makeUser({ email_verified: false }),
      accessToken: 'at-2',
      refreshToken: 'rt-2',
    });

    const { result } = renderHook(() => useRegister(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current.mutate({ username: 'user', email: 'a@b.com', password: 'pass' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(connectSpy).not.toHaveBeenCalled();
  });
});

describe('useVerifyEmail', () => {
  it('calls setEmailVerified(true) and connect on success', async () => {
    const setEmailVerifiedSpy = jest.spyOn(useAuthStore.getState(), 'setEmailVerified');
    const connectSpy = jest.fn();
    useSocketStore.setState({ connect: connectSpy } as never);
    useAuthStore.setState({ accessToken: VALID_JWT } as never);

    jest.mocked(authApi.verifyEmail).mockResolvedValueOnce({ message: 'Email verified' });

    const { result } = renderHook(() => useVerifyEmail(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current.mutate({ code: '123456' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setEmailVerifiedSpy).toHaveBeenCalledWith(true);
    expect(connectSpy).toHaveBeenCalledWith(VALID_JWT);
  });

  it('sets isError on failure', async () => {
    jest.mocked(authApi.verifyEmail).mockRejectedValueOnce(new Error('INVALID_CODE'));

    const { result } = renderHook(() => useVerifyEmail(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current.mutate({ code: '000000' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useResendVerification', () => {
  it('sets isSuccess on success', async () => {
    jest.mocked(authApi.resendVerification).mockResolvedValueOnce({ message: 'Verification email sent' });

    const { result } = renderHook(() => useResendVerification(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
