import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../stores/socketStore';
import { useNotificationStore } from '../stores/notificationStore';
import { hasNotificationPermission, showSystemNotification } from '../utils/systemNotifications';

export function useDmNotifications(): void {
  const socket = useSocketStore((s) => s.socket);
  const currentConversationId = useNotificationStore((s) => s.currentConversationId);
  const incrementDmUnread = useNotificationStore((s) => s.incrementDmUnread);
  const showNotification = useNotificationStore((s) => s.showNotification);
  const notificationPreference = useNotificationStore((s) => s.notificationPreference);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handler = async (event: { conversationId: string; otherUserId: string; senderName: string; preview: string }) => {
      if (event.conversationId === currentConversationId) return;

      incrementDmUnread(event.conversationId, event.otherUserId);
      void queryClient.invalidateQueries({ queryKey: ['dms'], exact: true });

      if (notificationPreference === 'system') {
        const permitted = await hasNotificationPermission();
        if (permitted) {
          await showSystemNotification('Tone Chat', `${event.senderName}: ${event.preview}`);
          return;
        }
      }

      showNotification({
        conversationId: event.conversationId,
        otherUserId: event.otherUserId,
        senderName: event.senderName,
        messageId: '',
        preview: event.preview,
      });
    };

    socket.on('dm:notification', handler);

    return () => {
      socket.off('dm:notification', handler);
    };
  }, [socket, currentConversationId, incrementDmUnread, showNotification, notificationPreference, queryClient]);
}
