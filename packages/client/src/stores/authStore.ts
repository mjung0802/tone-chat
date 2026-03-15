import { create } from 'zustand';
import { Platform } from 'react-native';
import { getMe } from '../api/users.api';

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

// SECURITY: On web, tokens are stored in localStorage which is vulnerable to XSS.
// Native platforms use expo-secure-store (encrypted keychain/keystore).
// Mitigation: helmet CSP headers restrict script injection on the BFF.
// Future: migrate web storage to httpOnly cookies for refresh tokens.
async function persistTokens(accessToken: string | null, refreshToken: string | null, emailVerified: boolean) {
  if (Platform.OS === 'web') {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
    localStorage.setItem('emailVerified', emailVerified ? 'true' : 'false');
  } else {
    const SecureStore = await import('expo-secure-store');
    if (accessToken) {
      await SecureStore.setItemAsync('accessToken', accessToken);
    } else {
      await SecureStore.deleteItemAsync('accessToken');
    }
    if (refreshToken) {
      await SecureStore.setItemAsync('refreshToken', refreshToken);
    } else {
      await SecureStore.deleteItemAsync('refreshToken');
    }
    await SecureStore.setItemAsync('emailVerified', emailVerified ? 'true' : 'false');
  }
}

async function loadTokens(): Promise<{ accessToken: string | null; refreshToken: string | null; emailVerified: boolean }> {
  if (Platform.OS === 'web') {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      emailVerified: localStorage.getItem('emailVerified') === 'true',
    };
  }
  const SecureStore = await import('expo-secure-store');
  return {
    accessToken: await SecureStore.getItemAsync('accessToken'),
    refreshToken: await SecureStore.getItemAsync('refreshToken'),
    emailVerified: (await SecureStore.getItemAsync('emailVerified')) === 'true',
  };
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
    void persistTokens(accessToken, refreshToken, resolvedEmailVerified);
  },

  setEmailVerified: (verified: boolean) => {
    set({ emailVerified: verified });
    const state = get();
    void persistTokens(state.accessToken, state.refreshToken, verified);
  },

  clearAuth: () => {
    set({
      accessToken: null,
      refreshToken: null,
      userId: null,
      isAuthenticated: false,
      emailVerified: false,
    });
    void persistTokens(null, null, false);
  },

  hydrate: async () => {
    const { accessToken, refreshToken, emailVerified } = await loadTokens();

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
