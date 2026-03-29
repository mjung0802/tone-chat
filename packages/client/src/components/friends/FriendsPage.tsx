import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, useTheme } from 'react-native-paper';
import { useUiStore } from '@/stores/uiStore';
import { usePendingRequests } from '@/hooks/useFriends';
import { FriendsList } from './FriendsList';
import { PendingRequestsList } from './PendingRequestsList';

export function FriendsPage() {
  const theme = useTheme();
  const friendsTab = useUiStore((s) => s.friendsTab);
  const setFriendsTab = useUiStore((s) => s.setFriendsTab);
  const { data: pendingRequests } = usePendingRequests();

  const incomingCount = pendingRequests?.filter((r) => r.direction === 'incoming').length ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SegmentedButtons
          value={friendsTab}
          onValueChange={(value) => setFriendsTab(value as 'friends' | 'pending')}
          style={styles.segmentedButtons}
          buttons={[
            { value: 'friends', label: 'Friends', icon: 'account-group', style: { borderWidth: 0, borderColor: 'transparent' } },
            { value: 'pending', label: `Pending${incomingCount > 0 ? ` (${incomingCount})` : ''}`, icon: 'account-clock', style: { borderWidth: 0, borderColor: 'transparent' } },
          ]}
        />
      </View>
      <View style={styles.content}>
        {friendsTab === 'friends' ? <FriendsList /> : <PendingRequestsList />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  segmentedButtons: {
    borderWidth: 0,
  },
  content: {
    flex: 1,
  },
});
