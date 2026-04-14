import { NotificationBanner } from '@/components/common/NotificationBanner';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import { ServerRail } from '@/components/layout/ServerRail';
import { ServerSidebar } from '@/components/layout/ServerSidebar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useDmNotifications } from '@/hooks/useDmNotifications';
import { useMentionNotifications } from '@/hooks/useMentionNotifications';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import { useUiStore } from '@/stores/uiStore';
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
  const queryClient = useQueryClient();
  useMentionNotifications();
  useDmNotifications();

  // Auto-collapse sidebar on narrow screens
  useEffect(() => {
    if (!isWide && isSidebarOpen) {
      setSidebarOpen(false);
    } else if (isWide && !isSidebarOpen) {
      setSidebarOpen(true);
    }
    // Only run when isWide changes
  }, [isWide]);

  // Friend request notification handler
  useEffect(() => {
    if (!socket) return;

    const handleRequestReceived = (event: { requesterId: string; requesterName: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'status', event.requesterId] });
    };

    const handleRequestAccepted = (event: { accepterId: string; accepterName: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'status', event.accepterId] });
    };

    socket.on('friend:request_received', handleRequestReceived);
    socket.on('friend:request_accepted', handleRequestAccepted);

    return () => {
      socket.off('friend:request_received', handleRequestReceived);
      socket.off('friend:request_accepted', handleRequestAccepted);
    };
  }, [socket, queryClient]);

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
