import React, { memo, useState } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
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
}: MessageBubbleProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

  const bubbleStyle = isOwn
    ? [styles.bubble, styles.ownBubble, { backgroundColor: theme.colors.primaryContainer }]
    : [styles.bubble, { backgroundColor: theme.colors.surfaceVariant }];

  const textColor = isOwn
    ? theme.colors.onPrimaryContainer
    : theme.colors.onSurfaceVariant;

  const hasAttachments = message.attachmentIds.length > 0;
  const attachmentLabel = hasAttachments
    ? `, ${message.attachmentIds.length} attachment${message.attachmentIds.length > 1 ? 's' : ''}`
    : '';

  const hasReactions = (message.reactions?.length ?? 0) > 0;

  return (
    <View
      onPointerEnter={Platform.OS === 'web' ? () => setHovered(true) : undefined}
      onPointerLeave={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      style={[styles.container, isOwn ? styles.ownContainer : null]}
      accessibilityRole="text"
      accessibilityLabel={`${authorName ?? 'Unknown'} said: ${message.content}. ${formatTime(message.createdAt)}${message.editedAt ? ', edited' : ''}${attachmentLabel}`}
    >
      {!isOwn && authorName ? (
        <Text
          variant="labelMedium"
          style={[styles.author, { color: theme.colors.primary }]}
        >
          {authorName}
        </Text>
      ) : null}
      <View style={styles.bubbleRow}>
        <View
          style={[styles.bubbleWrapper, bubbleStyle]}
          onTouchEnd={onLongPress ? () => onLongPress(message) : undefined}
        >
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
          <View style={styles.meta}>
            <Text variant="labelSmall" style={[styles.time, { color: textColor, opacity: 0.6 }]}>
              {formatTime(message.createdAt)}
            </Text>
            {message.editedAt ? (
              <Text variant="labelSmall" style={[styles.edited, { color: textColor, opacity: 0.6 }]}>
                (edited)
              </Text>
            ) : null}
          </View>
        </View>
        {onAddReaction ? (
          <View style={styles.hoverButtonPlaceholder}>
            {hovered ? (
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
  ownContainer: {
    alignSelf: 'flex-end',
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
  ownBubble: {
    borderBottomRightRadius: 4,
  },
  author: {
    marginBottom: 2,
    marginLeft: 4,
  },
  attachments: {
    marginTop: 4,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  edited: {
    fontSize: 11,
  },
  hoverButtonPlaceholder: {
    width: 34,
    height: 34,
  },
  hoverReactionButton: {
    margin: 0,
    elevation: 2,
  },
});
