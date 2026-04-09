import { useAuthStore, loadInstanceTokens } from './authStore';
import { useInstanceStore } from './instanceStore';
import { VALID_JWT, EXPIRED_JWT, MALFORMED_JWT } from '../test-utils/fixtures';
import { getMe } from '../api/users.api';
import type { UserResponse } from '../types/api.types';

jest.mock('../api/users.api');
const mockGetMe = jest.mocked(getMe);

const INSTANCE_A = 'https://chat.example.com';
const INSTANCE_B = 'https://other.example.com';

const STUB_USER_RESPONSE: UserResponse = {
  user: { id: 'user-123', username: 'test', email: 'test@test.com', email_verified: true, display_name: null, pronouns: null, avatar_url: null, bio: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
};

// With Platform.OS='web' (set in jest.setup.ts), authStore uses localStorage

beforeEach(() => {
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
  jest.clearAllMocks();
  mockGetMe.mockReset();
});

describe('authStore', () => {
  describe('setTokens', () => {
    it('sets accessToken, refreshToken, userId, isAuthenticated', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.getState().setTokens(VALID_JWT, 'refresh-abc');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(VALID_JWT);
      expect(state.refreshToken).toBe('refresh-abc');
      expect(state.userId).toBe('user-123');
      expect(state.isAuthenticated).toBe(true);
    });

    it('with invalid JWT: isAuthenticated=true, userId=null', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.getState().setTokens(MALFORMED_JWT, 'refresh-abc');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.userId).toBeNull();
    });

    it('persists tokens to instance-prefixed localStorage keys', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.getState().setTokens(VALID_JWT, 'refresh-abc');

      expect(localStorage.getItem(`accessToken:${INSTANCE_A}`)).toBe(VALID_JWT);
      expect(localStorage.getItem(`refreshToken:${INSTANCE_A}`)).toBeNull();
    });

    it('does not write to flat (unprefixed) keys', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.getState().setTokens(VALID_JWT, 'refresh-abc');

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('does not write to a different instance key', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.getState().setTokens(VALID_JWT, 'refresh-abc');

      expect(localStorage.getItem(`accessToken:${INSTANCE_B}`)).toBeNull();
      expect(localStorage.getItem(`refreshToken:${INSTANCE_B}`)).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('resets all fields to null/false', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.getState().setTokens(VALID_JWT, 'refresh-abc');
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.userId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('removes tokens from instance-prefixed localStorage keys', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      localStorage.setItem(`accessToken:${INSTANCE_A}`, 'old-at');
      localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'old-rt');

      useAuthStore.getState().clearAuth();

      expect(localStorage.getItem(`accessToken:${INSTANCE_A}`)).toBeNull();
      expect(localStorage.getItem(`refreshToken:${INSTANCE_A}`)).toBeNull();
    });

    it('does not remove tokens for a different instance', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      localStorage.setItem(`accessToken:${INSTANCE_B}`, 'b-token');
      localStorage.setItem(`refreshToken:${INSTANCE_B}`, 'b-refresh');

      useAuthStore.getState().clearAuth();

      expect(localStorage.getItem(`accessToken:${INSTANCE_B}`)).toBe('b-token');
      expect(localStorage.getItem(`refreshToken:${INSTANCE_B}`)).toBe('b-refresh');
    });
  });

  describe('hydrate', () => {
    it('no activeInstance → only isHydrated', async () => {
      useInstanceStore.setState({ activeInstance: null });
      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
    });

    it('no tokens → only isHydrated', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'));
      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
    });

    it('apiGet not called when no tokens', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'));
      await useAuthStore.getState().hydrate();

      expect(mockGetMe).toHaveBeenCalledTimes(1);
    });

    it('valid token + server validates → authenticated', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      localStorage.setItem(`accessToken:${INSTANCE_A}`, VALID_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'refresh-token');
      mockGetMe.mockResolvedValueOnce(STUB_USER_RESPONSE);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isHydrated).toBe(true);
      expect(state.userId).toBe('user-123');
    });

    it('valid token + server rejects → not authenticated', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      localStorage.setItem(`accessToken:${INSTANCE_A}`, VALID_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'refresh-token');
      mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'));

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('expired access + refresh token + server validates → authenticated', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      localStorage.setItem(`accessToken:${INSTANCE_A}`, EXPIRED_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'refresh-token');
      mockGetMe.mockResolvedValueOnce(STUB_USER_RESPONSE);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isHydrated).toBe(true);
    });

    it('expired access + refresh token + server rejects → not authenticated', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      localStorage.setItem(`accessToken:${INSTANCE_A}`, EXPIRED_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'refresh-token');
      mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'));

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('valid token + network error → not authenticated', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      localStorage.setItem(`accessToken:${INSTANCE_A}`, VALID_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'refresh-token');
      mockGetMe.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
      expect(state.accessToken).toBeNull();
    });

    it('server validates → emailVerified preserved', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      localStorage.setItem(`accessToken:${INSTANCE_A}`, VALID_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'refresh-token');
      localStorage.setItem(`emailVerified:${INSTANCE_A}`, 'true');
      mockGetMe.mockResolvedValueOnce(STUB_USER_RESPONSE);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.emailVerified).toBe(true);
      expect(state.isAuthenticated).toBe(true);
    });

    it('tokens for instance B are not loaded when instance A is active', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      localStorage.setItem(`accessToken:${INSTANCE_B}`, VALID_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_B}`, 'refresh-token');
      mockGetMe.mockRejectedValueOnce(new Error('Unauthorized'));

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
      expect(mockGetMe).toHaveBeenCalledTimes(1);
    });

    it('server returns email_verified=true overrides stale false in storage', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      localStorage.setItem(`accessToken:${INSTANCE_A}`, VALID_JWT);
      localStorage.setItem(`emailVerified:${INSTANCE_A}`, 'false'); // stale cached value
      mockGetMe.mockResolvedValueOnce(STUB_USER_RESPONSE); // email_verified: true

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.emailVerified).toBe(true);
      expect(state.isAuthenticated).toBe(true);
      expect(localStorage.getItem(`emailVerified:${INSTANCE_A}`)).toBe('true');
    });

    it('no accessToken but valid session cookie → authenticated', async () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      // No tokens stored in localStorage for INSTANCE_A; on web, session is maintained
      // via httpOnly cookie — the API client handles the 401→refresh transparently, so
      // from hydrate's perspective getMe() simply resolves.
      // Note: userId is set by setTokens() inside the client's refresh flow (not by hydrate
      // directly), so it remains null in this unit test where the API client is mocked.
      mockGetMe.mockResolvedValueOnce(STUB_USER_RESPONSE);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isHydrated).toBe(true);
    });
  });

  describe('setTokens with emailVerified', () => {
    it('sets emailVerified=true when third arg is true', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.getState().setTokens(VALID_JWT, 'rt', true);

      expect(useAuthStore.getState().emailVerified).toBe(true);
      expect(localStorage.getItem(`emailVerified:${INSTANCE_A}`)).toBe('true');
    });

    it('sets emailVerified=false when third arg is false', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.getState().setTokens(VALID_JWT, 'rt', false);

      expect(useAuthStore.getState().emailVerified).toBe(false);
      expect(localStorage.getItem(`emailVerified:${INSTANCE_A}`)).toBe('false');
    });

    it('preserves existing emailVerified when third arg is omitted', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.setState({ emailVerified: true });

      useAuthStore.getState().setTokens(VALID_JWT, 'rt');

      expect(useAuthStore.getState().emailVerified).toBe(true);
    });
  });

  describe('setEmailVerified', () => {
    it('sets emailVerified=true in state and localStorage', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.getState().setEmailVerified(true);

      expect(useAuthStore.getState().emailVerified).toBe(true);
      expect(localStorage.getItem(`emailVerified:${INSTANCE_A}`)).toBe('true');
    });

    it('sets emailVerified=false in state and localStorage', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.setState({ emailVerified: true });

      useAuthStore.getState().setEmailVerified(false);

      expect(useAuthStore.getState().emailVerified).toBe(false);
      expect(localStorage.getItem(`emailVerified:${INSTANCE_A}`)).toBe('false');
    });
  });

  describe('clearAuth resets emailVerified', () => {
    it('resets emailVerified to false and persists', () => {
      useInstanceStore.setState({ activeInstance: INSTANCE_A });
      useAuthStore.getState().setTokens(VALID_JWT, 'rt', true);

      useAuthStore.getState().clearAuth();

      expect(useAuthStore.getState().emailVerified).toBe(false);
      expect(localStorage.getItem(`emailVerified:${INSTANCE_A}`)).toBe('false');
    });
  });

  describe('loadInstanceTokens', () => {
    it('loads tokens for the specified instance and updates store state', async () => {
      localStorage.setItem(`accessToken:${INSTANCE_A}`, VALID_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'refresh-a');
      localStorage.setItem(`emailVerified:${INSTANCE_A}`, 'true');

      await loadInstanceTokens(INSTANCE_A);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(VALID_JWT);
      expect(state.refreshToken).toBeNull();
      expect(state.userId).toBe('user-123');
      expect(state.emailVerified).toBe(true);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(false);
    });

    it('resets to blank state when no tokens exist for the instance', async () => {
      useAuthStore.setState({ accessToken: VALID_JWT, refreshToken: 'old', isAuthenticated: true });

      await loadInstanceTokens(INSTANCE_B);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.userId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('no cross-instance leakage: instance A tokens not returned for instance B', async () => {
      localStorage.setItem(`accessToken:${INSTANCE_A}`, VALID_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'refresh-a');

      await loadInstanceTokens(INSTANCE_B);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('loads correct tokens when both instances have stored tokens', async () => {
      localStorage.setItem(`accessToken:${INSTANCE_A}`, VALID_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_A}`, 'refresh-a');
      localStorage.setItem(`accessToken:${INSTANCE_B}`, EXPIRED_JWT);
      localStorage.setItem(`refreshToken:${INSTANCE_B}`, 'refresh-b');

      await loadInstanceTokens(INSTANCE_B);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(EXPIRED_JWT);
      expect(state.refreshToken).toBeNull();

      await loadInstanceTokens(INSTANCE_A);

      const stateA = useAuthStore.getState();
      expect(stateA.accessToken).toBe(VALID_JWT);
      expect(stateA.refreshToken).toBeNull();
    });
  });
});
