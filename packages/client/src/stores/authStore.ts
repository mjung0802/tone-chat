import { create } from 'zustand';
import { Platform } from 'react-native';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
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

function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

async function persistTokens(accessToken: string | null, refreshToken: string | null) {
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
  }
}

async function loadTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  if (Platform.OS === 'web') {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    };
  }
  const SecureStore = await import('expo-secure-store');
  return {
    accessToken: await SecureStore.getItemAsync('accessToken'),
    refreshToken: await SecureStore.getItemAsync('refreshToken'),
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  userId: null,
  isAuthenticated: false,
  isHydrated: false,

  setTokens: (accessToken: string, refreshToken: string) => {
    const payload = parseJwtPayload(accessToken);
    set({
      accessToken,
      refreshToken,
      userId: payload?.sub ?? null,
      isAuthenticated: true,
    });
    void persistTokens(accessToken, refreshToken);
  },

  clearAuth: () => {
    set({
      accessToken: null,
      refreshToken: null,
      userId: null,
      isAuthenticated: false,
    });
    void persistTokens(null, null);
  },

  hydrate: async () => {
    const { accessToken, refreshToken } = await loadTokens();
    if (accessToken && !isTokenExpired(accessToken)) {
      const payload = parseJwtPayload(accessToken);
      set({
        accessToken,
        refreshToken,
        userId: payload?.sub ?? null,
        isAuthenticated: true,
        isHydrated: true,
      });
    } else if (refreshToken) {
      // Access token expired but we have a refresh token — let the API client handle refresh
      set({
        accessToken: null,
        refreshToken,
        userId: null,
        isAuthenticated: false,
        isHydrated: true,
      });
    } else {
      set({ isHydrated: true });
    }
  },
}));
