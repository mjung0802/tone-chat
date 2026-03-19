import { create } from 'zustand';
import { Platform } from 'react-native';
import type { ThemeId } from '@/theme';
import { THEME_IDS } from '@/theme/presets';

type ThemePreference = 'light' | 'dark' | 'system';
type ToneDisplay = 'full' | 'reduced';

function createPersister<T extends string>(
  key: string,
  validator: (value: string | null) => value is T,
  defaultValue: T,
): { persist: (value: T) => Promise<void>; load: () => Promise<T> } {
  return {
    async persist(value: T): Promise<void> {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.setItemAsync(key, value);
      }
    },
    async load(): Promise<T> {
      if (Platform.OS === 'web') {
        const stored = localStorage.getItem(key);
        return validator(stored) ? stored : defaultValue;
      }
      const SecureStore = await import('expo-secure-store');
      const stored = await SecureStore.getItemAsync(key);
      return validator(stored) ? stored : defaultValue;
    },
  };
}

const themePersister = createPersister<ThemePreference>(
  'themePreference',
  (v): v is ThemePreference => v === 'light' || v === 'dark' || v === 'system',
  'system',
);

const toneDisplayPersister = createPersister<ToneDisplay>(
  'toneDisplay',
  (v): v is ToneDisplay => v === 'full' || v === 'reduced',
  'full',
);

const colorThemePersister = createPersister<ThemeId>(
  'colorTheme',
  (v): v is ThemeId => THEME_IDS.includes(v as ThemeId),
  'default',
);

interface UiState {
  themePreference: ThemePreference;
  toneDisplay: ToneDisplay;
  colorTheme: ThemeId;
  isSidebarOpen: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  setToneDisplay: (pref: ToneDisplay) => void;
  setColorTheme: (id: ThemeId) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  themePreference: 'system',
  toneDisplay: 'full',
  colorTheme: 'default',
  isSidebarOpen: true,

  setThemePreference: (pref: ThemePreference) => {
    set({ themePreference: pref });
    void themePersister.persist(pref);
  },

  setToneDisplay: (pref: ToneDisplay) => {
    set({ toneDisplay: pref });
    void toneDisplayPersister.persist(pref);
  },

  setColorTheme: (id: ThemeId) => {
    set({ colorTheme: id });
    void colorThemePersister.persist(id);
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  setSidebarOpen: (open: boolean) => {
    set({ isSidebarOpen: open });
  },
}));

export async function hydrateTheme(): Promise<void> {
  const themePreference = await themePersister.load();
  useUiStore.setState({ themePreference });
}

export async function hydrateToneDisplay(): Promise<void> {
  const toneDisplay = await toneDisplayPersister.load();
  useUiStore.setState({ toneDisplay });
}

export async function hydrateColorTheme(): Promise<void> {
  const colorTheme = await colorThemePersister.load();
  useUiStore.setState({ colorTheme });
}

export async function hydrateUiStore(): Promise<void> {
  const [themePreference, toneDisplay, colorTheme] = await Promise.all([
    themePersister.load(),
    toneDisplayPersister.load(),
    colorThemePersister.load(),
  ]);
  useUiStore.setState({ themePreference, toneDisplay, colorTheme });
}
