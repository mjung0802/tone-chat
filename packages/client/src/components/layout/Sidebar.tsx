import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Badge, useTheme } from 'react-native-paper';
import { useSegments, useRouter } from 'expo-router';
import { DmList } from '@/components/dms/DmList';
import { useUiStore } from '@/stores/uiStore';
import { usePendingRequests } from '@/hooks/useFriends';

interface SidebarProps {
  currentUserId: string;
}

export function Sidebar({ currentUserId }: SidebarProps) {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const isFriendsViewOpen = useUiStore((s) => s.isFriendsViewOpen);
  const openFriendsView = useUiStore((s) => s.openFriendsView);
  const closeFriendsView = useUiStore((s) => s.closeFriendsView);
  const { data: pendingRequests } = usePendingRequests();

  const incomingCount = pendingRequests?.filter((r) => r.direction === 'incoming').length ?? 0;

  if (!isSidebarOpen) return null;

  // Determine if we are on a home route (DM conversations)
  const isHomeRoute = segments.includes('home');

  // On server routes the server layout renders its own ChannelSidebar
  if (!isHomeRoute) return null;

  const handleConversationPress = (conversationId: string) => {
    closeFriendsView();
    router.push(`/(main)/home/${conversationId}`);
  };

  const handleFriendsPress = () => {
    openFriendsView();
    const lastSegment = segments[segments.length - 1];
    const isOnHomeIndex = lastSegment === 'home' || lastSegment === 'index';
    if (!isOnHomeIndex) {
      router.push('/(main)/home');
    }
  };

  return (
    <View
      style={[styles.sidebar, { backgroundColor: theme.colors.background, borderRightColor: theme.colors.outlineVariant }]}
      accessible={true}
      accessibilityLabel="Direct messages sidebar"
    >
      <View style={styles.friendsButtonContainer}>
        <Button
          mode={isFriendsViewOpen ? 'contained-tonal' : 'text'}
          icon="account-group"
          onPress={handleFriendsPress}
          style={styles.friendsButton}
          contentStyle={styles.friendsButtonContent}
          accessibilityLabel={`Friends${incomingCount > 0 ? `, ${incomingCount} pending requests` : ''}`}
        >
          Friends
        </Button>
        {incomingCount > 0 ? (
          <Badge style={styles.badge}>{incomingCount}</Badge>
        ) : null}
      </View>
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
  },
  friendsButtonContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    position: 'relative',
  },
  friendsButton: {
    alignSelf: 'stretch',
  },
  friendsButtonContent: {
    justifyContent: 'flex-start',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 8,
  },
});
