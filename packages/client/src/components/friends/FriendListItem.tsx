import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { UserAvatar } from '@/components/common/UserAvatar';
import type { FriendEntry } from '@/types/models';

interface FriendListItemProps {
  friend: FriendEntry;
  onPress: () => void;
  onMessage: () => void;
}

export function FriendListItem({ friend, onPress, onMessage }: FriendListItemProps) {
  const theme = useTheme();
  const displayName = friend.display_name ?? friend.username;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && { backgroundColor: theme.colors.surfaceVariant },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Friend ${displayName}`}
    >
      <View style={styles.avatarContainer}>
        <UserAvatar avatarAttachmentId={friend.avatar_url} name={displayName} size={40} />
      </View>
      <View style={styles.textContainer}>
        <Text variant="titleSmall" numberOfLines={1}>
          {displayName}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.username}>
          @{friend.username}
        </Text>
      </View>
      <IconButton
        icon="message-outline"
        size={20}
        onPress={onMessage}
        accessibilityLabel={`Message ${displayName}`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatarContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  username: {
    opacity: 0.6,
    marginTop: 2,
  },
});
