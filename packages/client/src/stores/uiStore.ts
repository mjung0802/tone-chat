import { create } from 'zustand';
import { Appearance } from 'react-native';

type ThemePreference = 'light' | 'dark' | 'system';

interface UiState {
  themePreference: ThemePreference;
  isSidebarOpen: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

export const useUiStore = create<UiState>((set, get) => ({
  themePreference: 'system',
  isSidebarOpen: true,

  setThemePreference: (pref: ThemePreference) => {
    set({ themePreference: pref });
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  setSidebarOpen: (open: boolean) => {
    set({ isSidebarOpen: open });
  },

  getEffectiveTheme: () => {
    const { themePreference } = get();
    if (themePreference === 'system') {
      const scheme = Appearance.getColorScheme();
      return scheme === 'light' ? 'light' : 'dark';
    }
    return themePreference;
  },
}));
