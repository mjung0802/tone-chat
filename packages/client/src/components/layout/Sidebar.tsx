import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSegments, useRouter } from 'expo-router';
import { DmList } from '@/components/dms/DmList';
import { useUiStore } from '@/stores/uiStore';

interface SidebarProps {
  currentUserId: string;
}

export function Sidebar({ currentUserId }: SidebarProps) {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);

  if (!isSidebarOpen) return null;

  // Determine if we are on a home route (DM conversations)
  const isHomeRoute = segments.includes('home');

  // On server routes the server layout renders its own ChannelSidebar
  if (!isHomeRoute) return null;

  const handleConversationPress = (conversationId: string) => {
    router.push(`/(main)/home/${conversationId}`);
  };

  return (
    <View
      style={[styles.sidebar, { backgroundColor: theme.colors.background }]}
      accessible={true}
      accessibilityLabel="Direct messages sidebar"
    >
      <DmList
        currentUserId={currentUserId}
        onConversationPress={handleConversationPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    flexDirection: 'column',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0,0,0,0.1)',
  },
});
