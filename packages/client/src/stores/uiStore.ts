import { create } from 'zustand';
import { Platform } from 'react-native';
import type { ThemeId } from '@/theme';
import { THEME_IDS } from '@/theme/presets';

type ThemePreference = 'light' | 'dark' | 'system';
type ToneDisplay = 'full' | 'reduced';
type FriendsTab = 'friends' | 'pending';

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

function createJsonPersister<T>(
  key: string,
  defaultValue: T,
): { persist: (value: T) => Promise<void>; load: () => Promise<T> } {
  return {
    async persist(value: T): Promise<void> {
      const json = JSON.stringify(value);
      if (Platform.OS === 'web') {
        localStorage.setItem(key, json);
      } else {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.setItemAsync(key, json);
      }
    },
    async load(): Promise<T> {
      try {
        if (Platform.OS === 'web') {
          const raw = localStorage.getItem(key);
          return raw ? (JSON.parse(raw) as T) : defaultValue;
        }
        const SecureStore = await import('expo-secure-store');
        const raw = await SecureStore.getItemAsync(key);
        return raw ? (JSON.parse(raw) as T) : defaultValue;
      } catch {
        return defaultValue;
      }
    },
  };
}

const lastViewedPersister = createJsonPersister<Record<string, string>>(
  'lastViewedChannels',
  {},
);

interface ProfileModalState {
  visible: boolean;
  userId: string | null;
  serverId: string | null;
}

interface UiState {
  themePreference: ThemePreference;
  toneDisplay: ToneDisplay;
  colorTheme: ThemeId;
  isSidebarOpen: boolean;
  profileModal: ProfileModalState;
  isFriendsViewOpen: boolean;
  friendsTab: FriendsTab;
  setThemePreference: (pref: ThemePreference) => void;
  setToneDisplay: (pref: ToneDisplay) => void;
  setColorTheme: (id: ThemeId) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openProfileModal: (userId: string, serverId?: string | undefined) => void;
  closeProfileModal: () => void;
  openFriendsView: () => void;
  closeFriendsView: () => void;
  setFriendsTab: (tab: FriendsTab) => void;
  lastViewedChannels: Record<string, string>;
  setLastViewedChannel: (serverId: string, channelId: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  themePreference: 'system',
  toneDisplay: 'full',
  colorTheme: 'default',
  isSidebarOpen: true,
  profileModal: { visible: false, userId: null, serverId: null },
  isFriendsViewOpen: false,
  friendsTab: 'friends',
  lastViewedChannels: {},

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

  openProfileModal: (userId: string, serverId?: string | undefined) => {
    set({ profileModal: { visible: true, userId, serverId: serverId ?? null } });
  },

  closeProfileModal: () => {
    set({ profileModal: { visible: false, userId: null, serverId: null } });
  },

  openFriendsView: () => {
    set({ isFriendsViewOpen: true });
  },

  closeFriendsView: () => {
    set({ isFriendsViewOpen: false });
  },

  setFriendsTab: (tab: FriendsTab) => {
    set({ friendsTab: tab });
  },

  setLastViewedChannel: (serverId: string, channelId: string) => {
    set((state) => {
      if (state.lastViewedChannels[serverId] === channelId) return state;
      const updated = { ...state.lastViewedChannels, [serverId]: channelId };
      void lastViewedPersister.persist(updated);
      return { lastViewedChannels: updated };
    });
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
  const [themePreference, toneDisplay, colorTheme, lastViewedChannels] = await Promise.all([
    themePersister.load(),
    toneDisplayPersister.load(),
    colorThemePersister.load(),
    lastViewedPersister.load(),
  ]);
  useUiStore.setState({ themePreference, toneDisplay, colorTheme, lastViewedChannels });
}
