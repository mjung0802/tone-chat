import { NotificationBanner } from '@/components/common/NotificationBanner';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import { ServerRail } from '@/components/layout/ServerRail';
import { ServerSidebar } from '@/components/layout/ServerSidebar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useMentionNotifications } from '@/hooks/useMentionNotifications';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSocketStore } from '@/stores/socketStore';
import { useUiStore } from '@/stores/uiStore';
import { hasNotificationPermission, showSystemNotification } from '@/utils/systemNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import React, { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Portal, useTheme } from 'react-native-paper';

export default function MainLayout() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const userId = useAuthStore((s) => s.userId);

  const socket = useSocketStore((s) => s.socket);
  const currentConversationId = useNotificationStore((s) => s.currentConversationId);
  const incrementDmUnread = useNotificationStore((s) => s.incrementDmUnread);
  const showNotification = useNotificationStore((s) => s.showNotification);
  const notificationPreference = useNotificationStore((s) => s.notificationPreference);
  const queryClient = useQueryClient();
  useMentionNotifications();

  // Auto-collapse sidebar on narrow screens
  useEffect(() => {
    if (!isWide && isSidebarOpen) {
      setSidebarOpen(false);
    } else if (isWide && !isSidebarOpen) {
      setSidebarOpen(true);
    }
    // Only run when isWide changes
  }, [isWide]);

  // DM notification handler
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
        // Permission denied — fall back to in-app banner
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

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background }}>
      <ServerRail />
      <ServerSidebar />
      {(isWide || isSidebarOpen) ? <Sidebar currentUserId={userId ?? ''} /> : null}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <Portal>
        <NotificationBanner />
      </Portal>
      <UserProfileModal />
    </View>
  );
}
