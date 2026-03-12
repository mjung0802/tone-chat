
import { ServerIcon } from '@/components/servers/ServerIcon';
import { useLogout } from '@/hooks/useAuth';
import { useMentionNotifications } from '@/hooks/useMentionNotifications';
import { useServers } from '@/hooks/useServers';
import { DrawerContentScrollView, DrawerItem, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { useNotificationStore } from '@/stores/notificationStore';
import { useQueryClient } from '@tanstack/react-query';
import type { MembersResponse, ChannelsResponse } from '@/types/api.types';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Divider, Icon, IconButton, Portal, Text, useTheme } from 'react-native-paper';

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { data: servers } = useServers();
  const logout = useLogout();
  const router = useRouter();
  const theme = useTheme();

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.drawerHeader}>
        <Text variant="titleLarge">Tone Chat</Text>
      </View>
      <Divider />

      <DrawerItem
        label="Home"
        icon={({ size, color }) => <Icon source="home" size={size} color={color} />}
        onPress={() => router.push('/(main)/servers')}
      />

      <Divider />
      <View style={styles.sectionHeader}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Servers
        </Text>
        <IconButton
          icon="plus"
          size={18}
          onPress={() => router.push('/(main)/servers/create')}
          accessibilityLabel="Create server"
        />
      </View>

      {servers?.map((server) => (
        <DrawerItem
          key={server._id}
          label={server.name}
          icon={() => <ServerIcon name={server.name} icon={server.icon} size={28} />}
          onPress={() => router.push(`/(main)/servers/${server._id}`)}
        />
      ))}

      <Divider style={styles.bottomDivider} />

      <DrawerItem
        label="Profile"
        icon={({ size, color }) => <Icon source="account" size={size} color={color} />}
        onPress={() => router.push('/(main)/profile')}
      />

      <DrawerItem
        label="Sign Out"
        icon={({ size, color }) => <Icon source="logout" size={size} color={color} />}
        onPress={logout}
      />
    </DrawerContentScrollView>
  );
}

export default function MainLayout() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const notification = useNotificationStore((s) => s.currentNotification);
  const dismissNotification = useNotificationStore((s) => s.dismissNotification);
  const translateY = useRef(new Animated.Value(-100)).current;
  const isVisible = useRef(false);

  useMentionNotifications();

  // Resolve display text from cache
  let notificationText = '';
  if (notification) {
    const membersData = queryClient.getQueryData<MembersResponse>(['servers', notification.serverId, 'members']);
    const member = membersData?.members?.find((m) => m.userId === notification.authorId);
    const authorName = member?.nickname ?? member?.display_name ?? member?.username ?? 'Someone';

    const channelsData = queryClient.getQueryData<ChannelsResponse>(['servers', notification.serverId, 'channels']);
    const channel = channelsData?.channels?.find((c) => c._id === notification.channelId);
    const channelName = channel?.name ?? 'a channel';

    notificationText = `@${authorName} mentioned you in #${channelName}`;
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

  // Animate in/out based on notification state
  useEffect(() => {
    if (notification && !isVisible.current) {
      slideIn();
    } else if (!notification && isVisible.current) {
      slideOut();
    }
  }, [notification, slideIn, slideOut]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(dismissNotification, 5000);
    return () => clearTimeout(timer);
  }, [notification, dismissNotification]);

  const handleGo = () => {
    if (notification) {
      router.push(`/(main)/servers/${notification.serverId}/channels/${notification.channelId}`);
      dismissNotification();
    }
  };

  return (
    <>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.surface, borderBottomColor: 'white' },
          headerTintColor: theme.colors.onSurface,
          drawerType: 'front',
          drawerStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Drawer.Screen name="servers/index" options={{ title: 'Servers' }} />
        <Drawer.Screen name="servers/create" options={{ title: 'Create Server' }} />
        <Drawer.Screen
          name="servers/[serverId]"
          options={{ headerShown: false }}
        />
        <Drawer.Screen name="profile/index" options={{ title: 'Profile' }} />
        <Drawer.Screen name="invites/[code]" options={{ title: 'Join Server' }} />
      </Drawer>
      <Portal>
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
            accessibilityLabel="Go to mentioned channel"
            style={[styles.goButton, { backgroundColor: theme.colors.inversePrimary }]}
          >
            <Text style={[styles.goButtonText, { color: theme.colors.onSurface }]}>Go</Text>
          </Pressable>
        </Animated.View>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bottomDivider: {
    marginTop: 8,
  },
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
