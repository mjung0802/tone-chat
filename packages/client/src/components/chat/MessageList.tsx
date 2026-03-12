import React, { useCallback } from 'react';
import { FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import type { Message, Attachment } from '../../types/models';

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  authorNames?: Record<string, string> | undefined;
  onLoadMore?: (() => void) | undefined;
  isLoadingMore?: boolean | undefined;
  onMessageLongPress?: ((message: Message) => void) | undefined;
  onImagePress?: ((attachment: Attachment) => void) | undefined;
  onToggleReaction?: ((messageId: string, emoji: string) => void) | undefined;
  onAddReaction?: ((messageId: string) => void) | undefined;
}

export function MessageList({
  messages,
  currentUserId,
  authorNames,
  onLoadMore,
  isLoadingMore,
  onMessageLongPress,
  onImagePress,
  onToggleReaction,
  onAddReaction,
}: MessageListProps) {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Message>) => (
      <MessageBubble
        message={item}
        isOwn={item.authorId === currentUserId}
        authorName={authorNames?.[item.authorId]}
        currentUserId={currentUserId}
        authorNames={authorNames}
        onLongPress={onMessageLongPress}
        onImagePress={onImagePress}
        onToggleReaction={onToggleReaction}
        onAddReaction={onAddReaction}
      />
    ),
    [currentUserId, authorNames, onMessageLongPress, onImagePress, onToggleReaction, onAddReaction],
  );

  const keyExtractor = useCallback((item: Message) => item._id, []);

  if (messages.length === 0) {
    return (
      <EmptyState
        icon="chat-outline"
        title="No messages yet"
        description="Be the first to send a message!"
      />
    );
  }

  return (
    <FlatList
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      inverted
      contentContainerStyle={styles.content}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={isLoadingMore ? <LoadingSpinner /> : null}
      accessibilityRole="list"
      accessibilityLabel="Messages"
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 8,
  },
});
