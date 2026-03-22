import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import { useUser } from '@/hooks/useUser';
import type { DirectConversation } from '@/types/models';

interface DmListItemProps {
  conversation: DirectConversation;
  currentUserId: string;
  onPress: () => void;
}

export function DmListItem({ conversation, currentUserId, onPress }: DmListItemProps) {
  const theme = useTheme();

  const otherUserId =
    conversation.participantIds[0] === currentUserId
      ? conversation.participantIds[1]
      : conversation.participantIds[0];

  const { data: otherUser } = useUser(otherUserId ?? '');

  const displayName = otherUser?.display_name ?? otherUser?.username ?? otherUserId ?? '?';
  const preview = conversation.lastMessageAt !== null ? '...' : 'No messages yet';
  const avatarLabel = displayName.charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && { backgroundColor: theme.colors.surfaceVariant },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${displayName}`}
    >
      <View style={styles.avatarContainer}>
        {otherUser?.avatar_url ? (
          <Avatar.Image size={40} source={{ uri: otherUser.avatar_url }} />
        ) : (
          <Avatar.Text size={40} label={avatarLabel} />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text variant="titleSmall" numberOfLines={1}>
          {displayName}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.preview}>
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  preview: {
    opacity: 0.6,
    marginTop: 2,
  },
});
