import { create } from 'zustand';
import { Platform } from 'react-native';

export type NotificationPreference = 'quiet' | 'system';

export interface MentionNotification {
  messageId: string;
  channelId: string;
  serverId: string;
  authorId: string;
}

const NOTIF_PREF_KEY = 'notificationPreference';

function isValidNotificationPreference(value: string | null): value is NotificationPreference {
  return value === 'quiet' || value === 'system';
}

async function persistPreference(pref: NotificationPreference): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(NOTIF_PREF_KEY, pref);
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(NOTIF_PREF_KEY, pref);
  }
}

async function loadPreference(): Promise<NotificationPreference> {
  if (Platform.OS === 'web') {
    const value = localStorage.getItem(NOTIF_PREF_KEY);
    return isValidNotificationPreference(value) ? value : 'quiet';
  }
  const SecureStore = await import('expo-secure-store');
  const value = await SecureStore.getItemAsync(NOTIF_PREF_KEY);
  return isValidNotificationPreference(value) ? value : 'quiet';
}

interface NotificationState {
  currentNotification: MentionNotification | null;
  currentChannelId: string | null;
  notificationPreference: NotificationPreference;
  showNotification: (notification: MentionNotification) => void;
  dismissNotification: () => void;
  setCurrentChannelId: (channelId: string | null) => void;
  setNotificationPreference: (pref: NotificationPreference) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  currentNotification: null,
  currentChannelId: null,
  notificationPreference: 'quiet',

  showNotification: (notification) => {
    set({ currentNotification: notification });
  },

  dismissNotification: () => {
    set({ currentNotification: null });
  },

  setCurrentChannelId: (channelId) => {
    set({ currentChannelId: channelId });
  },

  setNotificationPreference: (pref: NotificationPreference) => {
    set({ notificationPreference: pref });
    void persistPreference(pref);
  },
}));

export async function hydrateNotificationPreference(): Promise<void> {
  const notificationPreference = await loadPreference();
  useNotificationStore.setState({ notificationPreference });
}
