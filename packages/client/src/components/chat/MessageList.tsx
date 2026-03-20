import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import type { Attachment, CustomToneDefinition, Message } from '../../types/models';
import { EmptyState } from '../common/EmptyState';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MessageBubble } from './MessageBubble';

export interface MessageListHandle {
  scrollToMessage: (messageId: string) => boolean;
}

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  authorNames?: Record<string, string>;
  authorAvatars?: Record<string, string>;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onMessageLongPress?: (message: Message) => void;
  onImagePress?: (attachment: Attachment) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onAddReaction?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onReplyPress?: (messageId: string) => void;
  highlightedMessageId?: string;
  customTones?: CustomToneDefinition[];
  modActionsMap?: Record<string, { onMute?: () => void; onUnmute?: () => void; onKick?: () => void; onBan?: () => void }>;
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
    customTones,
    modActionsMap,
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
        customTones={customTones}
        onMute={modActionsMap?.[item.authorId]?.onMute}
        onUnmute={modActionsMap?.[item.authorId]?.onUnmute}
        onKick={modActionsMap?.[item.authorId]?.onKick}
        onBan={modActionsMap?.[item.authorId]?.onBan}
      />
    ),
    [currentUserId, authorNames, authorAvatars, onMessageLongPress, onImagePress, onToggleReaction, onAddReaction, onReply, onReplyPress, highlightedMessageId, customTones, modActionsMap],
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
