import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '../../stores/notificationStore';
import type { MentionNotification } from '../../stores/notificationStore';
import type { MembersResponse, ChannelsResponse } from '../../types/api.types';

function isMentionNotification(n: unknown): n is MentionNotification {
  return typeof n === 'object' && n !== null && 'channelId' in n;
}

export function NotificationBanner() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const notification = useNotificationStore((s) => s.currentNotification);
  const dismissNotification = useNotificationStore((s) => s.dismissNotification);
  const translateY = useRef(new Animated.Value(-100)).current;
  const isVisible = useRef(false);

  let notificationText = '';
  if (notification) {
    if (isMentionNotification(notification)) {
      const membersData = queryClient.getQueryData<MembersResponse>(['servers', notification.serverId, 'members']);
      const member = membersData?.members?.find((m) => m.userId === notification.authorId);
      const authorName = member?.nickname ?? member?.display_name ?? member?.username ?? 'Someone';

      const channelsData = queryClient.getQueryData<ChannelsResponse>(['servers', notification.serverId, 'channels']);
      const channel = channelsData?.channels?.find((c) => c._id === notification.channelId);
      const channelName = channel?.name ?? 'a channel';

      notificationText = `@${authorName} mentioned you in #${channelName}`;
    } else {
      notificationText = `${notification.senderName}: ${notification.preview}`;
    }
  }

  const slideIn = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
    isVisible.current = true;
  }, [translateY]);

  const slideOut = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start();
    isVisible.current = false;
  }, [translateY]);

  useEffect(() => {
    if (notification && !isVisible.current) {
      slideIn();
    } else if (!notification && isVisible.current) {
      slideOut();
    }
  }, [notification, slideIn, slideOut]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(dismissNotification, 5000);
    return () => clearTimeout(timer);
  }, [notification, dismissNotification]);

  const handleGo = () => {
    if (notification) {
      if (isMentionNotification(notification)) {
        router.push(`/(main)/servers/${notification.serverId}/channels/${notification.channelId}`);
      } else {
        router.push(`/(main)/home/${notification.conversationId}`);
      }
      dismissNotification();
    }
  };

  return (
    <Animated.View
      style={[
        styles.notification,
        {
          top: insets.top + 8,
          backgroundColor: theme.colors.inverseSurface,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text
        style={[styles.notificationText, { color: theme.colors.inverseOnSurface }]}
        numberOfLines={2}
      >
        {notificationText}
      </Text>
      <Pressable
        onPress={handleGo}
        accessibilityRole="button"
        accessibilityLabel={notification && isMentionNotification(notification) ? 'Go to mentioned channel' : 'Go to conversation'}
        style={[styles.goButton, { backgroundColor: theme.colors.inversePrimary }]}
      >
        <Text style={[styles.goButtonText, { color: theme.colors.onSurface }]}>Go</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notification: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: 400,
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 9999,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  goButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
