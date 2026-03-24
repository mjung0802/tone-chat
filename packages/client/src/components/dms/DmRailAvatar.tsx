import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge } from 'react-native-paper';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useUser } from '@/hooks/useUser';

interface DmRailAvatarProps {
  otherUserId: string;
  unreadCount: number;
  onPress: () => void;
}

export function DmRailAvatar({ otherUserId, unreadCount, onPress }: DmRailAvatarProps) {
  const { data: otherUser } = useUser(otherUserId);
  const displayName = otherUser?.display_name ?? otherUser?.username ?? otherUserId;

  return (
    <Pressable
      onPress={onPress}
      style={styles.touchTarget}
      accessibilityRole="button"
      accessibilityLabel={`Direct message with ${displayName}`}
    >
      <View style={styles.avatarWrapper}>
        <UserAvatar avatarAttachmentId={otherUser?.avatar_url} name={displayName} size={32} />
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
