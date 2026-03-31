import React, { memo, useState } from 'react';
import { View, Pressable, Platform, StyleSheet, useColorScheme } from 'react-native';
import { Text, Icon, IconButton, useTheme } from 'react-native-paper';
import { AttachmentBubble } from './AttachmentBubble';
import { ReactionChips } from './ReactionChips';
import { UserAvatar } from '../common/UserAvatar';
import type { Message, Attachment, CustomToneDefinition } from '../../types/models';
import { resolveTone } from '../../tone/toneRegistry';
import { useUiStore } from '../../stores/uiStore';

const MENTION_REGEX = /@\w+/g;

function renderContentWithMentions(
  content: string,
  mentionColor: string,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <Text key={match.index} style={{ color: mentionColor, fontWeight: 'bold' }}>
        {match[0]}
      </Text>,
    );
    lastIndex = MENTION_REGEX.lastIndex;
  }
  MENTION_REGEX.lastIndex = 0;

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  authorName?: string | undefined;
  currentUserId?: string | null | undefined;
  authorNames?: Record<string, string> | undefined;
  onLongPress?: ((message: Message) => void) | undefined;
  onImagePress?: ((attachment: Attachment) => void) | undefined;
  onToggleReaction?: ((messageId: string, emoji: string) => void) | undefined;
  onAddReaction?: ((messageId: string) => void) | undefined;
  onReply?: ((message: Message) => void) | undefined;
  onReplyPress?: ((messageId: string) => void) | undefined;
  highlighted?: boolean | undefined;
  authorAvatarId?: string | null | undefined;
  customTones?: CustomToneDefinition[] | undefined;
  onMute?: (() => void) | undefined;
  onUnmute?: (() => void) | undefined;
  onKick?: (() => void) | undefined;
  onBan?: (() => void) | undefined;
  serverId?: string | undefined;
  isContinuation?: boolean | undefined;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  authorName,
  currentUserId,
  authorNames,
  onLongPress,
  onImagePress,
  onToggleReaction,
  onAddReaction,
  onReply,
  onReplyPress,
  highlighted,
  authorAvatarId,
  customTones,
  onMute,
  onUnmute,
  onKick,
  onBan,
  serverId,
  isContinuation,
}: MessageBubbleProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const toneDisplay = useUiStore((s) => s.toneDisplay);
  const openProfileModal = useUiStore((s) => s.openProfileModal);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const toneDef = message.tone ? resolveTone(message.tone, customTones) : undefined;
  const toneColor = toneDef ? (isDark ? toneDef.color.dark : toneDef.color.light) : undefined;

  const isMentioned = message.mentions?.includes(currentUserId ?? '') ?? false;

  const bubbleStyle = isOwn
    ? [styles.bubble, { backgroundColor: theme.colors.primaryContainer }]
    : [
        styles.bubble,
        { backgroundColor: theme.colors.surfaceVariant },
        isMentioned && { backgroundColor: theme.colors.tertiaryContainer + '4D' },
      ];

  const textColor = isOwn
    ? theme.colors.onPrimaryContainer
    : theme.colors.onSurfaceVariant;

  const toneBubbleStyle = (toneDef && toneColor && toneDisplay === 'full') ? {
    borderWidth: 1.5,
    borderColor: toneColor,
    ...(Platform.OS === 'web' ? { boxShadow: `0 0 12px ${toneColor}66, 0 0 28px ${toneColor}1A` } : {
      shadowColor: toneColor,
      shadowRadius: 8,
      shadowOpacity: 0.35,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    }),
  } : undefined;

  const effectiveTextColor = (toneDef && toneColor && toneDisplay === 'full') ? toneColor : textColor;

  const toneTextStyle = toneDef && toneDisplay === 'full' ? {
    ...(toneDef.textStyle === 'italic' ? { fontStyle: 'italic' as const } : {}),
    ...(toneDef.textStyle === 'medium' ? { fontWeight: '500' as const } : {}),
  } : {};

  const handleAuthorPress = serverId ? () => openProfileModal(message.authorId, serverId) : undefined;

  const hasAttachments = message.attachmentIds.length > 0;
  const attachmentLabel = hasAttachments
    ? `, ${message.attachmentIds.length} attachment${message.attachmentIds.length > 1 ? 's' : ''}`
    : '';

  const hasReactions = (message.reactions?.length ?? 0) > 0;

  const containerStyle = [
    styles.container,
    isContinuation && styles.containerContinuation,
    highlighted && { backgroundColor: theme.colors.tertiaryContainer + '40' },
  ];

  return (
    <View
      onPointerEnter={Platform.OS === 'web' ? () => setHovered(true) : undefined}
      onPointerLeave={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      style={[containerStyle, styles.messageRow]}
      accessibilityRole="text"
      accessibilityLabel={`${authorName ?? 'Unknown'} said: ${message.content}. ${formatTime(message.createdAt)}${message.editedAt ? ', edited' : ''}${attachmentLabel}${toneDef ? `, tone: ${toneDef.label}` : ''}`}
    >
      {authorName && !isContinuation ? (
        <Pressable
          style={styles.avatarColumn}
          onPress={handleAuthorPress}
          accessibilityRole="button"
          accessibilityLabel={`View ${authorName}'s avatar`}
        >
          <UserAvatar avatarAttachmentId={authorAvatarId} name={authorName} size={32} />
        </Pressable>
      ) : (
        <View style={styles.avatarSpacer} />
      )}
      <View style={styles.messageContent}>
      {authorName && !isContinuation ? (
        <View style={styles.authorRow}>
          <Pressable
            onPress={handleAuthorPress}
            accessibilityRole="button"
            accessibilityLabel={`View ${authorName}'s profile`}
          >
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.primary }}
            >
              {authorName}
            </Text>
          </Pressable>
          <Text variant="labelSmall" style={[styles.time, { color: theme.colors.onSurfaceVariant, opacity: 0.6 }]}>
            {formatTime(message.createdAt)}
          </Text>
          {message.editedAt ? (
            <Text variant="labelSmall" style={[styles.edited, { color: theme.colors.onSurfaceVariant, opacity: 0.6 }]}>
              (edited)
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.bubbleRow}>
        <View
          style={[styles.bubbleWrapper, bubbleStyle, toneBubbleStyle]}
          onTouchEnd={onLongPress ? () => onLongPress(message) : undefined}
        >
          {message.replyTo ? (
            <Pressable
              onPress={() => onReplyPress?.(message.replyTo!.messageId)}
              style={styles.replyIndicator}
              accessibilityRole="button"
              accessibilityLabel={`Reply to ${authorNames?.[message.replyTo.authorId] ?? message.replyTo.authorName ?? 'Unknown User'}`}
            >
              <Icon source="reply" size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={[styles.replyAuthor, { color: theme.colors.primary }]} numberOfLines={1}>
                @{authorNames?.[message.replyTo.authorId] ?? message.replyTo.authorName ?? 'Unknown User'}
              </Text>
              <Text variant="labelSmall" style={[styles.replyContent, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {message.replyTo.content}
              </Text>
            </Pressable>
          ) : null}
          {(() => {
            const contentBlock = (
              <>
                {message.content ? (
                  <Text style={[{ color: effectiveTextColor }, toneTextStyle]}>
                    {renderContentWithMentions(message.content, theme.colors.primary)}
                  </Text>
                ) : null}
                {hasAttachments ? (
                  <View style={styles.attachments}>
                    {message.attachmentIds.map((id) => (
                      <AttachmentBubble key={id} attachmentId={id} onImagePress={onImagePress} />
                    ))}
                  </View>
                ) : null}
              </>
            );

            return toneDef && toneDisplay === 'full' ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                <Text style={{ fontSize: 18 }}>{toneDef.emoji}</Text>
                <View style={{ flex: 1 }}>{contentBlock}</View>
              </View>
            ) : contentBlock;
          })()}
          {toneDef ? (
            <Text style={{
              color: toneColor,
              fontSize: 11,
              marginTop: 2,
              ...(toneDisplay === 'reduced' ? { opacity: 0.7 } : {}),
            }}>
              {toneDisplay === 'full' ? toneDef.label : `/${toneDef.key}`}
            </Text>
          ) : null}
        </View>
        {(onAddReaction || onReply || onMute || onUnmute || onKick || onBan) ? (
          <View style={styles.hoverButtonPlaceholder}>
            {hovered ? (
              <View style={styles.hoverButtonRow}>
                {onReply ? (
                  <IconButton
                    icon="reply"
                    size={18}
                    onPress={() => onReply(message)}
                    accessibilityLabel="Reply to message"
                    style={[styles.hoverReactionButton, { backgroundColor: theme.colors.surface }]}
                    testID="hover-reply-button"
                  />
                ) : null}
                {onAddReaction ? (
                  <IconButton
                    icon="emoticon-outline"
                    size={18}
                    onPress={() => onAddReaction(message._id)}
                    accessibilityLabel="Add reaction"
                    style={[styles.hoverReactionButton, { backgroundColor: theme.colors.surface }]}
                    testID="hover-reaction-button"
                  />
                ) : null}
                {onMute ? (
                  <IconButton
                    icon="volume-off"
                    size={18}
                    onPress={onMute}
                    accessibilityLabel="Mute user"
                    style={[styles.hoverReactionButton, { backgroundColor: theme.colors.surface }]}
                  />
                ) : null}
                {onUnmute ? (
                  <IconButton
                    icon="volume-high"
                    size={18}
                    onPress={onUnmute}
                    accessibilityLabel="Unmute user"
                    style={[styles.hoverReactionButton, { backgroundColor: theme.colors.surface }]}
                  />
                ) : null}
                {onKick ? (
                  <IconButton
                    icon="account-remove"
                    size={18}
                    onPress={onKick}
                    accessibilityLabel="Kick user"
                    style={[styles.hoverReactionButton, { backgroundColor: theme.colors.surface }]}
                  />
                ) : null}
                {onBan ? (
                  <IconButton
                    icon="cancel"
                    size={18}
                    onPress={onBan}
                    accessibilityLabel="Ban user"
                    style={[styles.hoverReactionButton, { backgroundColor: theme.colors.surface }]}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      {hasReactions ? (
        <ReactionChips
          reactions={message.reactions!}
          currentUserId={currentUserId ?? null}
          authorNames={authorNames}
          onToggle={(emoji) => onToggleReaction?.(message._id, emoji)}
          onAddReaction={() => onAddReaction?.(message._id)}
        />
      ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 2,
    maxWidth: '80%',
  },
  containerContinuation: {
    paddingVertical: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarColumn: {
    width: 40,
    paddingTop: 6,
  },
  avatarSpacer: {
    width: 40,
  },
  messageContent: {
    flex: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubbleWrapper: {
    flex: 1,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 2,
    marginLeft: 4,
  },
  attachments: {
    marginTop: 4,
  },
  time: {
    fontSize: 11,
  },
  edited: {
    fontSize: 11,
  },
  hoverButtonPlaceholder: {
    width: 180,
    height: 34,
  },
  hoverButtonRow: {
    flexDirection: 'row',
    gap: 2,
    paddingLeft: 4,
  },
  hoverReactionButton: {
    margin: 0,
    elevation: 2,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  replyAuthor: {
    fontWeight: '600',
    flexShrink: 0,
  },
  replyContent: {
    flex: 1,
    opacity: 0.7,
  },
});
