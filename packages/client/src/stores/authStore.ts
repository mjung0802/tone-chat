import { create } from 'zustand';
import { Platform } from 'react-native';
import { getMe } from '../api/users.api';
import { useInstanceStore } from './instanceStore';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  emailVerified: boolean;
  setTokens: (accessToken: string, refreshToken: string, emailVerified?: boolean | undefined) => void;
  setEmailVerified: (verified: boolean) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

function parseJwtPayload(token: string): { sub?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    const payload = parts[1];
    if (!payload) return null;
    const decoded = atob(payload);
    return JSON.parse(decoded) as { sub?: string; exp?: number };
  } catch {
    return null;
  }
}

function makeKeys(instance: string): { accessKey: string; refreshKey: string; emailVerifiedKey: string } {
  return {
    accessKey: `accessToken:${instance}`,
    refreshKey: `refreshToken:${instance}`,
    emailVerifiedKey: `emailVerified:${instance}`,
  };
}

// SECURITY: On web, tokens are stored in localStorage which is vulnerable to XSS.
// Native platforms use expo-secure-store (encrypted keychain/keystore).
// Mitigation: helmet CSP headers restrict script injection on the BFF.
// Future: migrate web storage to httpOnly cookies for refresh tokens.
// Tokens are scoped per instance URL to prevent cross-server token leakage.
async function persistTokens(instance: string, accessToken: string | null, refreshToken: string | null, emailVerified: boolean) {
  const { accessKey, refreshKey, emailVerifiedKey } = makeKeys(instance);
  if (Platform.OS === 'web') {
    if (accessToken) {
      localStorage.setItem(accessKey, accessToken);
    } else {
      localStorage.removeItem(accessKey);
    }
    if (refreshToken) {
      localStorage.setItem(refreshKey, refreshToken);
    } else {
      localStorage.removeItem(refreshKey);
    }
    localStorage.setItem(emailVerifiedKey, emailVerified ? 'true' : 'false');
  } else {
    const SecureStore = await import('expo-secure-store');
    if (accessToken) {
      await SecureStore.setItemAsync(accessKey, accessToken);
    } else {
      await SecureStore.deleteItemAsync(accessKey);
    }
    if (refreshToken) {
      await SecureStore.setItemAsync(refreshKey, refreshToken);
    } else {
      await SecureStore.deleteItemAsync(refreshKey);
    }
    await SecureStore.setItemAsync(emailVerifiedKey, emailVerified ? 'true' : 'false');
  }
}

async function loadTokensForInstance(instance: string): Promise<{ accessToken: string | null; refreshToken: string | null; emailVerified: boolean }> {
  const { accessKey, refreshKey, emailVerifiedKey } = makeKeys(instance);
  if (Platform.OS === 'web') {
    return {
      accessToken: localStorage.getItem(accessKey),
      refreshToken: localStorage.getItem(refreshKey),
      emailVerified: localStorage.getItem(emailVerifiedKey) === 'true',
    };
  }
  const SecureStore = await import('expo-secure-store');
  return {
    accessToken: await SecureStore.getItemAsync(accessKey),
    refreshToken: await SecureStore.getItemAsync(refreshKey),
    emailVerified: (await SecureStore.getItemAsync(emailVerifiedKey)) === 'true',
  };
}

/**
 * Loads tokens for the given instance URL and updates the auth store state.
 * Resets auth state to blank if no tokens are found for that instance.
 */
export async function loadInstanceTokens(instance: string): Promise<void> {
  const { accessToken, refreshToken, emailVerified } = await loadTokensForInstance(instance);
  const payload = accessToken ? parseJwtPayload(accessToken) : null;
  useAuthStore.setState({
    accessToken,
    refreshToken,
    userId: payload?.sub ?? null,
    emailVerified,
    isAuthenticated: false,
    isHydrated: false,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  userId: null,
  isAuthenticated: false,
  isHydrated: false,
  emailVerified: false,

  setTokens: (accessToken: string, refreshToken: string, emailVerified?: boolean | undefined) => {
    const payload = parseJwtPayload(accessToken);
    set((state) => ({
      accessToken,
      refreshToken,
      userId: payload?.sub ?? null,
      isAuthenticated: true,
      emailVerified: emailVerified !== undefined ? emailVerified : state.emailVerified,
    }));
    const resolvedEmailVerified = emailVerified !== undefined ? emailVerified : get().emailVerified;
    const instance = useInstanceStore.getState().activeInstance;
    if (instance) {
      void persistTokens(instance, accessToken, refreshToken, resolvedEmailVerified);
    }
  },

  setEmailVerified: (verified: boolean) => {
    set({ emailVerified: verified });
    const state = get();
    const instance = useInstanceStore.getState().activeInstance;
    if (instance) {
      void persistTokens(instance, state.accessToken, state.refreshToken, verified);
    }
  },

  clearAuth: () => {
    set({
      accessToken: null,
      refreshToken: null,
      userId: null,
      isAuthenticated: false,
      emailVerified: false,
    });
    const instance = useInstanceStore.getState().activeInstance;
    if (instance) {
      void persistTokens(instance, null, null, false);
    }
  },

  hydrate: async () => {
    const instance = useInstanceStore.getState().activeInstance;

    if (!instance) {
      set({ isHydrated: true });
      return;
    }

    const { accessToken, refreshToken, emailVerified } = await loadTokensForInstance(instance);

    if (!accessToken && !refreshToken) {
      set({ isHydrated: true });
      return;
    }

    // Pre-set tokens (without isAuthenticated) so the API client
    // can read them via configureAuth callbacks during the request
    const payload = accessToken ? parseJwtPayload(accessToken) : null;
    set({ accessToken, refreshToken, userId: payload?.sub ?? null, emailVerified });

    try {
      await getMe();
      set({ isAuthenticated: true, isHydrated: true });
    } catch {
      get().clearAuth();
      set({ isHydrated: true });
    }
  },
}));
