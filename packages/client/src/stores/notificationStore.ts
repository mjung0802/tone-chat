import { create } from 'zustand';
import { Platform } from 'react-native';

export type NotificationPreference = 'quiet' | 'system';

export interface MentionNotification {
  messageId: string;
  channelId: string;
  serverId: string;
  authorId: string;
}

export interface DmNotification {
  conversationId: string;
  otherUserId: string;
  messageId: string;
  preview: string;
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

export interface NotificationState {
  currentNotification: MentionNotification | DmNotification | null;
  currentChannelId: string | null;
  currentConversationId: string | null;
  dmUnreadEntries: Record<string, { count: number; otherUserId: string }>;
  notificationPreference: NotificationPreference;
  showNotification: (notification: MentionNotification | DmNotification) => void;
  dismissNotification: () => void;
  setCurrentChannelId: (channelId: string | null) => void;
  setCurrentConversationId: (conversationId: string | null) => void;
  incrementDmUnread: (conversationId: string, otherUserId: string) => void;
  clearConversationUnread: (conversationId: string) => void;
  clearAllDmUnreads: () => void;
  setNotificationPreference: (pref: NotificationPreference) => void;
}

export function selectTotalDmUnread(state: NotificationState): number {
  return Object.values(state.dmUnreadEntries).reduce((sum, e) => sum + e.count, 0);
}

export const useNotificationStore = create<NotificationState>((set) => ({
  currentNotification: null,
  currentChannelId: null,
  currentConversationId: null,
  dmUnreadEntries: {},
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

  setCurrentConversationId: (conversationId) => {
    set({ currentConversationId: conversationId });
  },

  incrementDmUnread: (conversationId, otherUserId) => {
    set((state) => {
      const existing = state.dmUnreadEntries[conversationId];
      return {
        dmUnreadEntries: {
          ...state.dmUnreadEntries,
          [conversationId]: {
            count: (existing?.count ?? 0) + 1,
            otherUserId: existing?.otherUserId ?? otherUserId,
          },
        },
      };
    });
  },

  clearConversationUnread: (conversationId) => {
    set((state) => {
      const next = { ...state.dmUnreadEntries };
      delete next[conversationId];
      return { dmUnreadEntries: next };
    });
  },

  clearAllDmUnreads: () => {
    set({ dmUnreadEntries: {} });
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
