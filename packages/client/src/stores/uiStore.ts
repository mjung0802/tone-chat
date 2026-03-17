import { create } from 'zustand';
import { Platform } from 'react-native';

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
    void themePersister.persist(pref);
  },

  setToneDisplay: (pref: ToneDisplay) => {
    set({ toneDisplay: pref });
    void toneDisplayPersister.persist(pref);
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
