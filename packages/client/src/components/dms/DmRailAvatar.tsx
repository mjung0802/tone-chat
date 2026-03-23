import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Badge, useTheme } from 'react-native-paper';
import { useUser } from '@/hooks/useUser';

interface DmRailAvatarProps {
  conversationId: string;
  otherUserId: string;
  unreadCount: number;
  onPress: () => void;
}

export function DmRailAvatar({ conversationId: _conversationId, otherUserId, unreadCount, onPress }: DmRailAvatarProps) {
  const theme = useTheme();
  const { data: otherUser } = useUser(otherUserId);
  const displayName = otherUser?.display_name ?? otherUser?.username ?? otherUserId;
  const avatarLabel = displayName.charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={styles.touchTarget}
      accessibilityRole="button"
      accessibilityLabel={`Direct message with ${displayName}`}
    >
      <View style={styles.avatarWrapper}>
        {otherUser?.avatar_url ? (
          <Avatar.Image
            size={32}
            source={{ uri: otherUser.avatar_url }}
            style={{ backgroundColor: theme.colors.surfaceVariant }}
          />
        ) : (
          <Avatar.Text size={32} label={avatarLabel} />
        )}
        {unreadCount > 0 && (
          <Badge style={styles.badge} size={16}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
});
