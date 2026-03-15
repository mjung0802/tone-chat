import { useEffect } from 'react';
import { useSocketStore } from '../stores/socketStore';
import { useNotificationStore } from '../stores/notificationStore';
import type { MentionEvent } from '../types/socket.types';

export function useMentionNotifications() {
  const socket = useSocketStore((s) => s.socket);
  const showNotification = useNotificationStore((s) => s.showNotification);
  const currentChannelId = useNotificationStore((s) => s.currentChannelId);

  useEffect(() => {
    if (!socket) return;

    const handleMention = (event: MentionEvent) => {
      // Suppress if already viewing the channel where mention occurred
      if (event.channelId === currentChannelId) return;

      showNotification(event);
    };

    socket.on('mention', handleMention);

    return () => {
      socket.off('mention', handleMention);
    };
  }, [socket, currentChannelId, showNotification]);
}
