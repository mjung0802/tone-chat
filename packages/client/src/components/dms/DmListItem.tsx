import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { UserAvatar } from '@/components/common/UserAvatar';
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
        <UserAvatar avatarAttachmentId={otherUser?.avatar_url} name={displayName} size={40} />
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
