import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, IconButton, useTheme } from 'react-native-paper';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { ServerIcon } from '@/components/servers/ServerIcon';
import { useServers } from '@/hooks/useServers';
import { useNotificationStore, selectTotalDmUnread } from '@/stores/notificationStore';
import { useLogout, useSwitchInstance } from '@/hooks/useAuth';
import { DmRailAvatar } from '@/components/dms/DmRailAvatar';
import { JoinServerDialog } from '@/components/servers/JoinServerDialog';
import { RailTooltip } from '@/components/common/RailTooltip';

export function ServerRail() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const activeServerId = pathname.match(/\/servers\/([^/]+)/)?.[1] ?? '';
  const { data: servers } = useServers();
  const dmUnreadCount = useNotificationStore(selectTotalDmUnread);
  const dmUnreadEntries = useNotificationStore((s) => s.dmUnreadEntries);
  const logout = useLogout();
  const switchInstance = useSwitchInstance();
  const [joinDialogVisible, setJoinDialogVisible] = useState(false);

  const dmEntries = Object.entries(dmUnreadEntries)
    .filter(([, e]) => e.count > 0)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5);

  return (
    <View
      style={[styles.rail, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.outlineVariant }]}
      accessible={true}
      accessibilityLabel="Server navigation rail"
    >
      {/* Home button */}
      <RailTooltip label="Home">
        <View style={styles.homeButtonContainer}>
          <IconButton
            icon="home"
            size={28}
            onPress={() => {
              const lastSegment = segments[segments.length - 1];
              const isOnHomeIndex = lastSegment === 'home' || lastSegment === 'index';
              if (!isOnHomeIndex) router.push('/(main)/home');
            }}
            accessibilityLabel="Home — direct messages"
            accessibilityRole="button"
          />
          {dmUnreadCount > 0 && (
            <Badge style={styles.badge} size={16}>
              {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
            </Badge>
          )}
        </View>
      </RailTooltip>

      {/* DM avatars (max 5 with unread) */}
      {dmEntries.map(([conversationId, entry]) => (
        <DmRailAvatar
          key={conversationId}
          otherUserId={entry.otherUserId}
          unreadCount={entry.count}
          onPress={() => router.push(`/(main)/home/${conversationId}`)}
        />
      ))}

      {/* Separator between DM entries and server list */}
      {dmEntries.length > 0 && (
        <View
          style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]}
        />
      )}

      {/* Server icons */}
      <ScrollView
        style={styles.serverList}
        contentContainerStyle={styles.serverListContent}
        showsVerticalScrollIndicator={false}
        accessibilityRole="list"
        accessibilityLabel="Server list"
      >
        {servers?.map((server) => (
          <RailTooltip key={server._id} label={server.name}>
            <View style={styles.serverIconWrapper}>
              <IconButton
                icon={() => <ServerIcon name={server.name} icon={server.icon} size={32} />}
                onPress={() => router.push(`/(main)/servers/${server._id}`)}
                accessibilityLabel={`${server.name} server`}
                accessibilityRole="button"
                {...(server._id === activeServerId ? { mode: 'contained-tonal' as const } : {})}
                size={32}
              />
            </View>
          </RailTooltip>
        ))}

        {/* Add server button */}
        <RailTooltip label="Create server">
          <IconButton
            icon="plus-circle-outline"
            size={28}
            onPress={() => router.push('/(main)/servers/create')}
            accessibilityLabel="Create server"
            accessibilityRole="button"
          />
        </RailTooltip>

        {/* Join server button */}
        <RailTooltip label="Join server">
          <IconButton
            icon="link-plus"
            size={28}
            onPress={() => setJoinDialogVisible(true)}
            accessibilityLabel="Join server via invite code"
            accessibilityRole="button"
          />
        </RailTooltip>
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        <RailTooltip label="Profile">
          <IconButton
            icon="account-circle"
            size={28}
            onPress={() => router.push(`/(main)/profile`)}
            accessibilityLabel="Profile"
            accessibilityRole="button"
          />
        </RailTooltip>
        <RailTooltip label="Switch server">
          <IconButton
            icon="swap-horizontal"
            size={24}
            onPress={switchInstance}
            accessibilityLabel="Switch instance"
            accessibilityRole="button"
          />
        </RailTooltip>
        <RailTooltip label="Logout">
          <IconButton
            icon="logout"
            size={24}
            onPress={logout}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          />
        </RailTooltip>
      </View>

      <JoinServerDialog
        visible={joinDialogVisible}
        onDismiss={() => setJoinDialogVisible(false)}
        onJoined={(serverId) => {
          setJoinDialogVisible(false);
          router.push(`/(main)/servers/${serverId}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 60,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  homeButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  separator: {
    width: 36,
    height: 1,
    marginVertical: 4,
  },
  serverList: {
    flex: 1,
    width: '100%',
  },
  serverListContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  serverIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bottomActions: {
    alignItems: 'center',
    paddingTop: 8,
  },
});
