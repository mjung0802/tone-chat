import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMessages, useSendMessage } from '../../../../../src/hooks/useMessages';
import { useMembers } from '../../../../../src/hooks/useMembers';
import { useChannel } from '../../../../../src/hooks/useChannels';
import { useChannelSocket, useTypingEmit } from '../../../../../src/hooks/useSocket';
import { useAuthStore } from '../../../../../src/stores/authStore';
import { MessageList } from '../../../../../src/components/chat/MessageList';
import { MessageInput } from '../../../../../src/components/chat/MessageInput';
import { TypingIndicator } from '../../../../../src/components/chat/TypingIndicator';
import { AttachmentViewer } from '../../../../../src/components/chat/AttachmentViewer';
import { EmojiPicker } from '../../../../../src/components/chat/EmojiPicker';
import { LoadingSpinner } from '../../../../../src/components/common/LoadingSpinner';
import { useSocketStore } from '../../../../../src/stores/socketStore';
import type { TypingEvent } from '../../../../../src/types/socket.types';
import type { Attachment } from '../../../../../src/types/models';

const TYPING_TIMEOUT = 3000;

export default function ChannelScreen() {
  const { serverId, channelId } = useLocalSearchParams<{
    serverId: string;
    channelId: string;
  }>();
  const sid = serverId ?? '';
  const cid = channelId ?? '';

  const userId = useAuthStore((s) => s.userId);
  const { data: channel } = useChannel(sid, cid);
  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(sid, cid);
  const { data: members } = useMembers(sid);
  const sendMessage = useSendMessage(sid, cid);
  const emitTyping = useTypingEmit(sid, cid);

  // Typing state
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Attachment viewer state
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  // Reaction state
  const [reactionTargetMessageId, setReactionTargetMessageId] = useState<string | null>(null);
  const socket = useSocketStore((s) => s.socket);

  const handleImagePress = useCallback((attachment: Attachment) => {
    setViewerAttachment(attachment);
    setViewerVisible(true);
  }, []);

  const handleViewerClose = useCallback(() => {
    setViewerVisible(false);
    setViewerAttachment(null);
  }, []);

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket) return;
      socket.emit('toggle_reaction', { serverId: sid, channelId: cid, messageId, emoji });
    },
    [socket, sid, cid],
  );

  const handleAddReaction = useCallback((messageId: string) => {
    setReactionTargetMessageId(messageId);
  }, []);

  const handleReactionEmojiSelect = useCallback(
    (emoji: string) => {
      if (reactionTargetMessageId) {
        handleToggleReaction(reactionTargetMessageId, emoji);
      }
      setReactionTargetMessageId(null);
    },
    [reactionTargetMessageId, handleToggleReaction],
  );

  const handleTyping = useCallback(
    (event: TypingEvent) => {
      if (event.userId === userId) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(event.userId, Date.now());
        return next;
      });

      // Clear after timeout
      const existing = typingTimersRef.current.get(event.userId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(event.userId);
          return next;
        });
        typingTimersRef.current.delete(event.userId);
      }, TYPING_TIMEOUT);
      typingTimersRef.current.set(event.userId, timer);
    },
    [userId],
  );

  useChannelSocket(sid, cid, handleTyping);

  // Clean up timers
  useEffect(() => {
    return () => {
      typingTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Build author name map from members
  const authorNames: Record<string, string> = {};
  members?.forEach((m) => {
    authorNames[m.userId] = m.nickname ?? m.display_name ?? m.username ?? m.userId;
  });

  const typingUserNames = Array.from(typingUsers.keys()).map(
    (id) => authorNames[id] ?? 'Someone',
  );

  const handleSend = useCallback(
    (content: string, attachmentIds: string[]) => {
      sendMessage.mutate({
        content,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      });
    },
    [sendMessage],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <LoadingSpinner message="Loading messages..." />;
  }

  // Messages come chronological from API, but FlatList is inverted so reverse
  const messages = [...(messagesData?.messages ?? [])].reverse();

  return (
    <View style={styles.container}>
      <MessageList
        messages={messages}
        currentUserId={userId}
        authorNames={authorNames}
        onLoadMore={handleLoadMore}
        isLoadingMore={isFetchingNextPage}
        onImagePress={handleImagePress}
        onToggleReaction={handleToggleReaction}
        onAddReaction={handleAddReaction}
      />
      <TypingIndicator userNames={typingUserNames} />
      <MessageInput
        onSend={handleSend}
        onTyping={emitTyping}
        disabled={sendMessage.isPending}
      />
      <AttachmentViewer
        visible={viewerVisible}
        attachment={viewerAttachment}
        onClose={handleViewerClose}
      />
      <EmojiPicker
        visible={reactionTargetMessageId !== null}
        onSelect={handleReactionEmojiSelect}
        onDismiss={() => setReactionTargetMessageId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
