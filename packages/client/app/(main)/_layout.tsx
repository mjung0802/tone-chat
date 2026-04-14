import { NotificationBanner } from '@/components/common/NotificationBanner';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import { ServerRail } from '@/components/layout/ServerRail';
import { ServerSidebar } from '@/components/layout/ServerSidebar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useDmNotifications } from '@/hooks/useDmNotifications';
import { useFriendSocket } from '@/hooks/useFriendSocket';
import { useMentionNotifications } from '@/hooks/useMentionNotifications';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
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

  useMentionNotifications();
  useDmNotifications();
  useFriendSocket();

  // Auto-collapse sidebar on narrow screens
  useEffect(() => {
    if (!isWide && isSidebarOpen) {
      setSidebarOpen(false);
    } else if (isWide && !isSidebarOpen) {
      setSidebarOpen(true);
    }
    // Only run when isWide changes
  }, [isWide]);

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
