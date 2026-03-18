import { AttachmentViewer } from '@/components/chat/AttachmentViewer';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { MessageInput } from '@/components/chat/MessageInput';
import { MessageList, type MessageListHandle } from '@/components/chat/MessageList';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { MemberActionDialogs, type DialogType } from '@/components/members/MemberActionDialogs';
import { useChannel } from '@/hooks/useChannels';
import { useMembers, useMuteMember, useUnmuteMember, useKickMember, useBanMember } from '@/hooks/useMembers';
import { useServer } from '@/hooks/useServers';
import { useCustomTones } from '@/hooks/useTones';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useChannelSocket, useTypingEmit } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSocketStore } from '@/stores/socketStore';
import type { Attachment, Message, ServerMember } from '@/types/models';
import { getAvailableActions, isMemberMuted, type Role } from '@/utils/roles';
import type { TypingEvent } from '@/types/socket.types';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from 'react-native-paper';

const TYPING_TIMEOUT = 3000;

export default function ChannelScreen() {
  const { serverId, channelId } = useLocalSearchParams<{
    serverId: string;
    channelId: string;
  }>();
  const sid = serverId ?? '';
  const cid = channelId ?? '';

  const userId = useAuthStore((s) => s.userId);
  const setCurrentChannelId = useNotificationStore((s) => s.setCurrentChannelId);

  useEffect(() => {
    setCurrentChannelId(cid || null);
    return () => setCurrentChannelId(null);
  }, [cid, setCurrentChannelId]);

  useChannel(sid, cid);
  const { data: server } = useServer(sid);
  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(sid, cid);
  const { data: members } = useMembers(sid);
  const { data: customTones } = useCustomTones(sid);
  const sendMessage = useSendMessage(sid, cid);
  const emitTyping = useTypingEmit(sid, cid);
  const muteMember = useMuteMember(sid);
  const unmuteMember = useUnmuteMember(sid);
  const kickMember = useKickMember(sid);
  const banMember = useBanMember(sid);

  // Typing state
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Attachment viewer state
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  // Reply state
  const [replyTarget, setReplyTarget] = useState<{ messageId: string; authorId: string; authorName: string; content: string } | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const messageListRef = useRef<MessageListHandle>(null);

  // Reaction state
  const [reactionTargetMessageId, setReactionTargetMessageId] = useState<string | null>(null);

  // Mod action dialog state
  const [dialogMember, setDialogMember] = useState<ServerMember | null>(null);
  const [dialogType, setDialogType] = useState<DialogType | null>(null);
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

  // Build author name + avatar maps from members
  const { authorNames, authorAvatars } = useMemo(() => {
    const names: Record<string, string> = {};
    const avatars: Record<string, string | null> = {};
    members?.forEach((m) => {
      names[m.userId] = m.nickname ?? m.display_name ?? m.username ?? m.userId;
      avatars[m.userId] = m.avatar_url ?? null;
    });
    return { authorNames: names, authorAvatars: avatars };
  }, [members]);

  const currentMember = members?.find((m: ServerMember) => m.userId === userId);
  const actorRole = (currentMember?.role ?? 'member') as Role;
  const actorIsOwner = server?.ownerId === userId;

  const modActionsMap = useMemo(() => {
    if (!members) return {};
    const map: Record<string, { onMute?: (() => void) | undefined; onUnmute?: (() => void) | undefined; onKick?: (() => void) | undefined; onBan?: (() => void) | undefined }> = {};
    for (const target of members) {
      if (target.userId === userId) continue;
      const targetRole = (target.role ?? 'member') as Role;
      const targetIsOwner = server?.ownerId === target.userId;
      const actions = getAvailableActions(actorRole, actorIsOwner, targetRole, targetIsOwner);
      if (!actions.canMute && !actions.canKick && !actions.canBan) continue;
      const isMuted = isMemberMuted(target.mutedUntil);
      map[target.userId] = {
        onMute:   actions.canMute && !isMuted ? () => { setDialogMember(target); setDialogType('mute'); } : undefined,
        onUnmute: actions.canMute && isMuted  ? () => { unmuteMember.mutate(target.userId); } : undefined,
        onKick:   actions.canKick ? () => { setDialogMember(target); setDialogType('kick'); } : undefined,
        onBan:    actions.canBan  ? () => { setDialogMember(target); setDialogType('ban');  } : undefined,
      };
    }
    return map;
  }, [members, userId, actorRole, actorIsOwner, server?.ownerId, unmuteMember]);

  const typingUserNames = Array.from(typingUsers.keys()).map(
    (id) => authorNames[id] ?? 'Someone',
  );

  const handleReply = useCallback((message: Message) => {
    setReplyTarget({
      messageId: message._id,
      authorId: message.authorId,
      authorName: authorNames[message.authorId] ?? 'Unknown',
      content: message.content,
    });
  }, [authorNames]);

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
    (content: string, attachmentIds: string[], options?: { replyToId?: string; mentions?: string[]; tone?: string }) => {
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

  // Check if current user is muted
  const isMuted = isMemberMuted(currentMember?.mutedUntil);
  const mutedUntilStr = currentMember?.mutedUntil ? new Date(currentMember.mutedUntil).toLocaleString() : '';

  // Messages come chronological from API, but FlatList is inverted so reverse
  const messages = [...(messagesData?.messages ?? [])].reverse();

  return (
    <View style={styles.container}>
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
        customTones={customTones}
        modActionsMap={modActionsMap}
      />
      <TypingIndicator userNames={typingUserNames} />
      {isMuted ? (
        <Banner visible icon="volume-off" actions={[]}>
          {`You are muted until ${mutedUntilStr}`}
        </Banner>
      ) : null}
      <MessageInput
        onSend={handleSend}
        onTyping={emitTyping}
        disabled={sendMessage.isPending || isMuted}
        members={members}
        currentUserId={userId ?? undefined}
        replyTarget={replyTarget ?? undefined}
        onCancelReply={handleCancelReply}
        customTones={customTones}
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
      <MemberActionDialogs
        member={dialogMember}
        dialogType={dialogType}
        onDismiss={() => { setDialogType(null); setDialogMember(null); }}
        onMute={(targetUserId, duration) => muteMember.mutate({ userId: targetUserId, data: { duration } })}
        onKick={(targetUserId) => kickMember.mutate(targetUserId)}
        onBan={(targetUserId, reason) => banMember.mutate({ userId: targetUserId, data: { reason } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
