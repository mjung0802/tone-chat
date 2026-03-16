import React, { useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import type { Message, Attachment } from '../../types/models';

export interface MessageListHandle {
  scrollToMessage: (messageId: string) => boolean;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  authorNames?: Record<string, string> | undefined;
  authorAvatars?: Record<string, string | null> | undefined;
  onLoadMore?: (() => void) | undefined;
  isLoadingMore?: boolean | undefined;
  onMessageLongPress?: ((message: Message) => void) | undefined;
  onImagePress?: ((attachment: Attachment) => void) | undefined;
  onToggleReaction?: ((messageId: string, emoji: string) => void) | undefined;
  onAddReaction?: ((messageId: string) => void) | undefined;
  onReply?: ((message: Message) => void) | undefined;
  onReplyPress?: ((messageId: string) => void) | undefined;
  highlightedMessageId?: string | null | undefined;
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList(props, ref) {
  const {
    messages,
    currentUserId,
    authorNames,
    authorAvatars,
    onLoadMore,
    isLoadingMore,
    onMessageLongPress,
    onImagePress,
    onToggleReaction,
    onAddReaction,
    onReply,
    onReplyPress,
    highlightedMessageId,
  } = props;

  const flatListRef = useRef<FlatList>(null);

  useImperativeHandle(ref, () => ({
    scrollToMessage(messageId: string): boolean {
      const index = messages.findIndex((m) => m._id === messageId);
      if (index === -1) return false;
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      return true;
    },
  }), [messages]);

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
        onReply={onReply}
        onReplyPress={onReplyPress}
        highlighted={highlightedMessageId === item._id}
        authorAvatarId={authorAvatars?.[item.authorId]}
      />
    ),
    [currentUserId, authorNames, authorAvatars, onMessageLongPress, onImagePress, onToggleReaction, onAddReaction, onReply, onReplyPress, highlightedMessageId],
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
      ref={flatListRef}
      onScrollToIndexFailed={(info) => {
        flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
      }}
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
});

const styles = StyleSheet.create({
  content: {
    paddingVertical: 8,
  },
});
