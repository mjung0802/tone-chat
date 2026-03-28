import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFriends } from '@/hooks/useFriends';
import { useGetOrCreateConversation } from '@/hooks/useDms';
import { useUiStore } from '@/stores/uiStore';
import { FriendListItem } from './FriendListItem';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { FriendEntry } from '@/types/models';

export function FriendsList() {
  const { data: friends, isLoading } = useFriends();
  const getOrCreateConversation = useGetOrCreateConversation();
  const openProfileModal = useUiStore((s) => s.openProfileModal);
  const closeFriendsView = useUiStore((s) => s.closeFriendsView);
  const router = useRouter();

  const handleMessage = (userId: string) => {
    getOrCreateConversation.mutate(userId, {
      onSuccess: (data) => {
        closeFriendsView();
        router.push(`/(main)/home/${data.conversation._id}`);
      },
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading friends..." />;
  }

  if (!friends || friends.length === 0) {
    return (
      <EmptyState
        icon="account-group-outline"
        title="No friends yet"
        description="Add friends from their profile to see them here."
      />
    );
  }

  const renderItem = ({ item }: { item: FriendEntry }) => (
    <FriendListItem
      friend={item}
      onPress={() => openProfileModal(item.userId)}
      onMessage={() => handleMessage(item.userId)}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={friends}
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
