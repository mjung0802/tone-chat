import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { UserAvatar } from '@/components/common/UserAvatar';
import type { FriendRequest } from '@/types/models';

interface PendingRequestItemProps {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
}

export function PendingRequestItem({ request, onAccept, onDecline }: PendingRequestItemProps) {
  const theme = useTheme();
  const displayName = request.display_name ?? request.username;

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={styles.avatarContainer}>
        <UserAvatar avatarAttachmentId={request.avatar_url} name={displayName} size={40} />
      </View>
      <View style={styles.textContainer}>
        <Text variant="titleSmall" numberOfLines={1}>
          {displayName}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.username}>
          @{request.username}
        </Text>
      </View>
      <View style={styles.actions}>
        {request.direction === 'incoming' ? (
          <>
            <Button
              mode="contained"
              compact
              onPress={onAccept}
              style={styles.actionButton}
              accessibilityLabel={`Accept friend request from ${displayName}`}
            >
              Accept
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={onDecline}
              style={styles.actionButton}
              accessibilityLabel={`Decline friend request from ${displayName}`}
            >
              Decline
            </Button>
          </>
        ) : (
          <Button
            mode="outlined"
            compact
            onPress={onDecline}
            accessibilityLabel={`Cancel friend request to ${displayName}`}
          >
            Cancel
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    marginLeft: 4,
  },
});
