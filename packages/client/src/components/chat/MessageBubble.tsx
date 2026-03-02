import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { Message } from '../../types/models';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  authorName?: string | undefined;
  onLongPress?: ((message: Message) => void) | undefined;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  authorName,
  onLongPress,
}: MessageBubbleProps) {
  const theme = useTheme();

  const bubbleStyle = isOwn
    ? [styles.bubble, styles.ownBubble, { backgroundColor: theme.colors.primaryContainer }]
    : [styles.bubble, { backgroundColor: theme.colors.surfaceVariant }];

  const textColor = isOwn
    ? theme.colors.onPrimaryContainer
    : theme.colors.onSurfaceVariant;

  return (
    <View
      style={[styles.container, isOwn ? styles.ownContainer : null]}
      accessibilityRole="text"
      accessibilityLabel={`${authorName ?? 'Unknown'} said: ${message.content}. ${formatTime(message.createdAt)}${message.editedAt ? ', edited' : ''}`}
    >
      {!isOwn && authorName ? (
        <Text
          variant="labelMedium"
          style={[styles.author, { color: theme.colors.primary }]}
        >
          {authorName}
        </Text>
      ) : null}
      <View
        style={bubbleStyle}
        onTouchEnd={onLongPress ? () => onLongPress(message) : undefined}
      >
        <Text style={{ color: textColor }}>{message.content}</Text>
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    maxWidth: '80%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
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
});
