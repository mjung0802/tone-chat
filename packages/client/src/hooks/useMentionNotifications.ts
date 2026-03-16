import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../stores/socketStore';
import { useNotificationStore } from '../stores/notificationStore';
import { hasNotificationPermission, showSystemNotification } from '../utils/systemNotifications';
import type { MentionEvent } from '../types/socket.types';
import type { MembersResponse, ChannelsResponse } from '../types/api.types';

export function useMentionNotifications() {
  const socket = useSocketStore((s) => s.socket);
  const showNotification = useNotificationStore((s) => s.showNotification);
  const currentChannelId = useNotificationStore((s) => s.currentChannelId);
  const notificationPreference = useNotificationStore((s) => s.notificationPreference);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleMention = async (event: MentionEvent) => {
      // Suppress if already viewing the channel where mention occurred
      if (event.channelId === currentChannelId) return;

      if (notificationPreference === 'system') {
        const permitted = await hasNotificationPermission();
        if (permitted) {
          const membersData = queryClient.getQueryData<MembersResponse>(['servers', event.serverId, 'members']);
          const member = membersData?.members?.find((m) => m.userId === event.authorId);
          const authorName = member?.nickname ?? member?.display_name ?? member?.username ?? 'Someone';

          const channelsData = queryClient.getQueryData<ChannelsResponse>(['servers', event.serverId, 'channels']);
          const channel = channelsData?.channels?.find((c) => c._id === event.channelId);
          const channelName = channel?.name ?? 'a channel';

          await showSystemNotification('Tone Chat', `@${authorName} mentioned you in #${channelName}`);
          return;
        }
        // Permission denied — fall back to in-app banner
      }

      showNotification(event);
    };

    socket.on('mention', handleMention);

    return () => {
      socket.off('mention', handleMention);
    };
  }, [socket, currentChannelId, showNotification, notificationPreference, queryClient]);
}
