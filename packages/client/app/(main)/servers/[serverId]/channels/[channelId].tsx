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
import { LoadingSpinner } from '../../../../../src/components/common/LoadingSpinner';
import type { TypingEvent } from '../../../../../src/types/socket.types';

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
    (content: string) => {
      sendMessage.mutate({ content });
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
      />
      <TypingIndicator userNames={typingUserNames} />
      <MessageInput
        onSend={handleSend}
        onTyping={emitTyping}
        disabled={sendMessage.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
