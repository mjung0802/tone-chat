import { AttachmentViewer } from '@/components/chat/AttachmentViewer';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { MessageInput } from '@/components/chat/MessageInput';
import { MessageList, type MessageListHandle } from '@/components/chat/MessageList';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useDmMessages, useSendDmMessage, useReactToDm } from '@/hooks/useDms';
import { useDmSocket, useDmTypingEmit } from '@/hooks/useDmSocket';
import { useMe, useUser } from '@/hooks/useUser';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Attachment, DirectMessage, Message } from '@/types/models';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const TYPING_TIMEOUT = 3000;

function dmToMessage(dm: DirectMessage): Message {
  return {
    _id: dm._id,
    channelId: '',
    serverId: '',
    authorId: dm.authorId,
    content: dm.content ?? '',
    attachmentIds: dm.attachmentIds,
    ...(dm.editedAt != null ? { editedAt: dm.editedAt } : {}),
    reactions: dm.reactions,
    replyTo: dm.replyTo,
    mentions: dm.mentions,
    ...(dm.tone != null ? { tone: dm.tone } : {}),
    createdAt: dm.createdAt,
  };
}

export default function DmConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const cid = conversationId ?? '';

  const userId = useAuthStore((s) => s.userId);
  const setCurrentConversationId = useNotificationStore((s) => s.setCurrentConversationId);
  const clearConversationUnread = useNotificationStore((s) => s.clearConversationUnread);

  useEffect(() => {
    setCurrentConversationId(cid || null);
    if (cid) clearConversationUnread(cid);
    return () => setCurrentConversationId(null);
  }, [cid, setCurrentConversationId, clearConversationUnread]);

  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDmMessages(cid);

  const sendMessage = useSendDmMessage(cid);
  const reactToDm = useReactToDm(cid);
  const emitTyping = useDmTypingEmit(cid);

  // Typing state
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Attachment viewer state
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  // Reply state
  const [replyTarget, setReplyTarget] = useState<{
    messageId: string;
    authorId: string;
    authorName: string;
    content: string;
  } | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const messageListRef = useRef<MessageListHandle>(null);

  // Reaction state
  const [reactionTargetMessageId, setReactionTargetMessageId] = useState<string | null>(null);

  // Determine the other participant to show header title and build author names
  const rawMessages = messagesData?.messages ?? [];
  const otherUserId = useMemo(() => {
    const otherMsg = rawMessages.find((m) => m.authorId !== userId);
    return otherMsg?.authorId ?? null;
  }, [rawMessages, userId]);

  const { data: otherUser } = useUser(otherUserId ?? '');
  const { data: currentUser } = useMe();

  const headerTitle = otherUser?.display_name ?? otherUser?.username ?? 'Direct Message';

  const authorNames = useMemo(() => {
    const names: Record<string, string> = {};
    if (currentUser) {
      names[currentUser.id] = currentUser.display_name ?? currentUser.username;
    }
    if (otherUser) {
      names[otherUser.id] = otherUser.display_name ?? otherUser.username;
    }
    return names;
  }, [currentUser, otherUser]);

  const authorAvatars = useMemo(() => {
    const avatars: Record<string, string | null> = {};
    if (currentUser) {
      avatars[currentUser.id] = currentUser.avatar_url ?? null;
    }
    if (otherUser) {
      avatars[otherUser.id] = otherUser.avatar_url ?? null;
    }
    return avatars;
  }, [currentUser, otherUser]);

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
      reactToDm.mutate({ messageId, emoji });
    },
    [reactToDm],
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

  const clearTypingUser = useCallback((uid: string) => {
    const existing = typingTimersRef.current.get(uid);
    if (existing) clearTimeout(existing);
    typingTimersRef.current.delete(uid);
    setTypingUsers((prev) => {
      if (!prev.has(uid)) return prev;
      const next = new Map(prev);
      next.delete(uid);
      return next;
    });
  }, []);

  const handleTyping = useCallback(
    (event: { conversationId: string; userId: string }) => {
      if (event.userId === userId) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(event.userId, Date.now());
        return next;
      });

      const existing = typingTimersRef.current.get(event.userId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        clearTypingUser(event.userId);
      }, TYPING_TIMEOUT);
      typingTimersRef.current.set(event.userId, timer);
    },
    [userId, clearTypingUser],
  );

  const handleNewMessage = useCallback(
    (authorId: string) => {
      clearTypingUser(authorId);
    },
    [clearTypingUser],
  );

  useDmSocket(cid, handleTyping, handleNewMessage);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      typingTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const typingUserNames = Array.from(typingUsers.keys()).map(
    (id) => authorNames[id] ?? 'Someone',
  );

  const messages: Message[] = useMemo(
    () => [...rawMessages].reverse().map(dmToMessage),
    [rawMessages],
  );

  const handleReply = useCallback(
    (message: Message) => {
      setReplyTarget({
        messageId: message._id,
        authorId: message.authorId,
        authorName: authorNames[message.authorId] ?? 'Unknown',
        content: message.content,
      });
    },
    [authorNames],
  );

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const handleReplyPress = useCallback((messageId: string) => {
    const found = messageListRef.current?.scrollToMessage(messageId);
    if (found) {
      setHighlightMessageId(messageId);
      setTimeout(() => setHighlightMessageId(null), 1500);
    }
  }, []);

  const handleSend = useCallback(
    (
      content: string,
      attachmentIds: string[],
      options?: { replyToId?: string; mentions?: string[]; tone?: string },
    ) => {
      sendMessage.mutate({
        content,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
        replyToId: options?.replyToId,
        mentions: options?.mentions,
        tone: options?.tone,
      });
      setReplyTarget(null);
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: headerTitle }} />
      <MessageList
        ref={messageListRef}
        messages={messages}
        currentUserId={userId}
        authorNames={authorNames}
        authorAvatars={authorAvatars}
        onLoadMore={handleLoadMore}
        isLoadingMore={isFetchingNextPage}
        onImagePress={handleImagePress}
        onToggleReaction={handleToggleReaction}
        onAddReaction={handleAddReaction}
        onReply={handleReply}
        onReplyPress={handleReplyPress}
        highlightedMessageId={highlightMessageId}
        customTones={[]}
        modActionsMap={undefined}
        serverId={undefined}
      />
      <TypingIndicator userNames={typingUserNames} />
      <MessageInput
        onSend={handleSend}
        onTyping={emitTyping}
        disabled={sendMessage.isPending}
        members={undefined}
        currentUserId={userId ?? undefined}
        replyTarget={replyTarget ?? undefined}
        onCancelReply={handleCancelReply}
        customTones={[]}
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
