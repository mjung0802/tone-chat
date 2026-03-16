import { create } from 'zustand';
import { Platform } from 'react-native';

type ThemePreference = 'light' | 'dark' | 'system';
type ToneDisplay = 'full' | 'reduced';

const STORAGE_KEY = 'themePreference';
const TONE_DISPLAY_KEY = 'toneDisplay';

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

function isValidToneDisplay(value: string | null): value is ToneDisplay {
  return value === 'full' || value === 'reduced';
}

async function persistToneDisplay(pref: ToneDisplay): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(TONE_DISPLAY_KEY, pref);
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(TONE_DISPLAY_KEY, pref);
  }
}

async function loadToneDisplay(): Promise<ToneDisplay> {
  if (Platform.OS === 'web') {
    const value = localStorage.getItem(TONE_DISPLAY_KEY);
    return isValidToneDisplay(value) ? value : 'full';
  }
  const SecureStore = await import('expo-secure-store');
  const value = await SecureStore.getItemAsync(TONE_DISPLAY_KEY);
  return isValidToneDisplay(value) ? value : 'full';
}

interface UiState {
  themePreference: ThemePreference;
  toneDisplay: ToneDisplay;
  isSidebarOpen: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  setToneDisplay: (pref: ToneDisplay) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  themePreference: 'system',
  toneDisplay: 'full',
  isSidebarOpen: true,

  setThemePreference: (pref: ThemePreference) => {
    set({ themePreference: pref });
    void persistTheme(pref);
  },

  setToneDisplay: (pref: ToneDisplay) => {
    set({ toneDisplay: pref });
    void persistToneDisplay(pref);
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

export async function hydrateToneDisplay(): Promise<void> {
  const toneDisplay = await loadToneDisplay();
  useUiStore.setState({ toneDisplay });
}
