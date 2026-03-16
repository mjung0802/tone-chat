import { create } from 'zustand';
import { Platform } from 'react-native';

type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'themePreference';

function isValidThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

async function persistTheme(pref: ThemePreference): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(STORAGE_KEY, pref);
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(STORAGE_KEY, pref);
  }
}

async function loadTheme(): Promise<ThemePreference> {
  if (Platform.OS === 'web') {
    const value = localStorage.getItem(STORAGE_KEY);
    return isValidThemePreference(value) ? value : 'system';
  }
  const SecureStore = await import('expo-secure-store');
  const value = await SecureStore.getItemAsync(STORAGE_KEY);
  return isValidThemePreference(value) ? value : 'system';
}

interface UiState {
  themePreference: ThemePreference;
  isSidebarOpen: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  themePreference: 'system',
  isSidebarOpen: true,

  setThemePreference: (pref: ThemePreference) => {
    set({ themePreference: pref });
    void persistTheme(pref);
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  setSidebarOpen: (open: boolean) => {
    set({ isSidebarOpen: open });
  },
}));

export async function hydrateTheme(): Promise<void> {
  const themePreference = await loadTheme();
  useUiStore.setState({ themePreference });
}
