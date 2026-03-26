import React from 'react';
import { FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { Text } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { DmListItem } from './DmListItem';
import { useDmConversations } from '@/hooks/useDms';
import type { DirectConversation } from '@/types/models';

interface DmListProps {
  currentUserId: string;
  onConversationPress: (conversationId: string) => void;
}

export function DmList({ currentUserId, onConversationPress }: DmListProps) {
  const { data: conversations, isLoading } = useDmConversations();

  if (isLoading) {
    return <LoadingSpinner message="Loading conversations..." />;
  }

  if (!conversations || conversations.length === 0) {
    return (
      <EmptyState
        icon="message-outline"
        title="No conversations yet"
        description="Start a conversation by messaging someone from their profile."
      />
    );
  }

  const renderItem = ({ item }: ListRenderItemInfo<DirectConversation>) => (
    <DmListItem
      conversation={item}
      currentUserId={currentUserId}
      onPress={() => onConversationPress(item._id)}
    />
  );

  const keyExtractor = (item: DirectConversation) => item._id;

  return (
    <>
      <Text variant="titleMedium" style={styles.title}>
        Direct Messages
      </Text>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        accessibilityRole="list"
        accessibilityLabel="Direct messages"
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  title: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
});
