import { create } from 'zustand';

export interface MentionNotification {
  messageId: string;
  channelId: string;
  serverId: string;
  authorId: string;
}

interface NotificationState {
  currentNotification: MentionNotification | null;
  currentChannelId: string | null;
  showNotification: (notification: MentionNotification) => void;
  dismissNotification: () => void;
  setCurrentChannelId: (channelId: string | null) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  currentNotification: null,
  currentChannelId: null,

  showNotification: (notification) => {
    set({ currentNotification: notification });
  },

  dismissNotification: () => {
    set({ currentNotification: null });
  },

  setCurrentChannelId: (channelId) => {
    set({ currentChannelId: channelId });
  },
}));
