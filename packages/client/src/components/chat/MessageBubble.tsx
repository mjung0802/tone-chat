import React, { memo, useState } from 'react';
import { View, Pressable, Platform, StyleSheet } from 'react-native';
import { Text, Icon, IconButton, useTheme } from 'react-native-paper';
import { AttachmentBubble } from './AttachmentBubble';
import { ReactionChips } from './ReactionChips';
import type { Message, Attachment } from '../../types/models';

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
}: MessageBubbleProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

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

  const hasAttachments = message.attachmentIds.length > 0;
  const attachmentLabel = hasAttachments
    ? `, ${message.attachmentIds.length} attachment${message.attachmentIds.length > 1 ? 's' : ''}`
    : '';

  const hasReactions = (message.reactions?.length ?? 0) > 0;

  const containerStyle = [
    styles.container,
    highlighted && { backgroundColor: theme.colors.tertiaryContainer + '40' },
  ];

  return (
    <View
      onPointerEnter={Platform.OS === 'web' ? () => setHovered(true) : undefined}
      onPointerLeave={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      style={containerStyle}
      accessibilityRole="text"
      accessibilityLabel={`${authorName ?? 'Unknown'} said: ${message.content}. ${formatTime(message.createdAt)}${message.editedAt ? ', edited' : ''}${attachmentLabel}`}
    >
      {authorName ? (
        <View style={styles.authorRow}>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.primary }}
          >
            {authorName}
          </Text>
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
          style={[styles.bubbleWrapper, bubbleStyle]}
          onTouchEnd={onLongPress ? () => onLongPress(message) : undefined}
        >
          {message.replyTo ? (
            <Pressable
              onPress={() => onReplyPress?.(message.replyTo!.messageId)}
              style={styles.replyIndicator}
              accessibilityRole="button"
              accessibilityLabel={`Reply to ${message.replyTo.authorName ?? 'Unknown User'}`}
            >
              <Icon source="reply" size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={[styles.replyAuthor, { color: theme.colors.primary }]} numberOfLines={1}>
                @{message.replyTo.authorName ?? 'Unknown User'}
              </Text>
              <Text variant="labelSmall" style={[styles.replyContent, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {message.replyTo.content}
              </Text>
            </Pressable>
          ) : null}
          {message.content ? (
            <Text style={{ color: textColor }}>{message.content}</Text>
          ) : null}
          {hasAttachments ? (
            <View style={styles.attachments}>
              {message.attachmentIds.map((id) => (
                <AttachmentBubble
                  key={id}
                  attachmentId={id}
                  onImagePress={onImagePress}
                />
              ))}
            </View>
          ) : null}
        </View>
        {(onAddReaction || onReply) ? (
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
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 2,
    maxWidth: '80%',
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
    width: 72,
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
