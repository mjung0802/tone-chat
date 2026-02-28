import { useAuthStore } from './authStore';
import { VALID_JWT, EXPIRED_JWT, MALFORMED_JWT } from '../test-utils/fixtures';

// With Platform.OS='web' (set in jest.setup.ts), authStore uses localStorage

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    userId: null,
    isAuthenticated: false,
    isHydrated: false,
  });
  localStorage.clear();
  jest.clearAllMocks();
});

describe('authStore', () => {
  describe('setTokens', () => {
    it('sets accessToken, refreshToken, userId, isAuthenticated', () => {
      useAuthStore.getState().setTokens(VALID_JWT, 'refresh-abc');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(VALID_JWT);
      expect(state.refreshToken).toBe('refresh-abc');
      expect(state.userId).toBe('user-123');
      expect(state.isAuthenticated).toBe(true);
    });

    it('with invalid JWT: isAuthenticated=true, userId=null', () => {
      useAuthStore.getState().setTokens(MALFORMED_JWT, 'refresh-abc');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.userId).toBeNull();
    });

    it('persists tokens to localStorage', () => {
      useAuthStore.getState().setTokens(VALID_JWT, 'refresh-abc');

      expect(localStorage.getItem('accessToken')).toBe(VALID_JWT);
      expect(localStorage.getItem('refreshToken')).toBe('refresh-abc');
    });
  });

  describe('clearAuth', () => {
    it('resets all fields to null/false', () => {
      useAuthStore.getState().setTokens(VALID_JWT, 'refresh-abc');
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.userId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('removes tokens from localStorage', () => {
      localStorage.setItem('accessToken', 'old-at');
      localStorage.setItem('refreshToken', 'old-rt');

      useAuthStore.getState().clearAuth();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('hydrate', () => {
    it('with valid non-expired token: full auth state + isHydrated', async () => {
      localStorage.setItem('accessToken', VALID_JWT);
      localStorage.setItem('refreshToken', 'refresh-token');

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(VALID_JWT);
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.userId).toBe('user-123');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isHydrated).toBe(true);
    });

    it('with expired access + valid refresh: isAuthenticated=false, refresh kept', async () => {
      localStorage.setItem('accessToken', EXPIRED_JWT);
      localStorage.setItem('refreshToken', 'refresh-token');

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
    });

    it('with no tokens: only isHydrated=true', async () => {
      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
    });
  });
});
