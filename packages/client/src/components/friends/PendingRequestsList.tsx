import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { usePendingRequests, useAcceptFriendRequest, useDeclineFriendRequest } from '@/hooks/useFriends';
import { PendingRequestItem } from './PendingRequestItem';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { FriendRequest } from '@/types/models';

export function PendingRequestsList() {
  const { data: requests, isLoading } = usePendingRequests();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();

  if (isLoading) {
    return <LoadingSpinner message="Loading requests..." />;
  }

  if (!requests || requests.length === 0) {
    return (
      <EmptyState
        icon="account-clock-outline"
        title="No pending requests"
        description="Friend requests you send or receive will appear here."
      />
    );
  }

  const renderItem = ({ item }: { item: FriendRequest }) => (
    <PendingRequestItem
      request={item}
      onAccept={() => acceptRequest.mutate(item.userId)}
      onDecline={() => declineRequest.mutate(item.userId)}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={(item) => item.userId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
