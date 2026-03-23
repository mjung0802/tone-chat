import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, IconButton, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ServerIcon } from '@/components/servers/ServerIcon';
import { useServers } from '@/hooks/useServers';
import { useNotificationStore, selectTotalDmUnread } from '@/stores/notificationStore';
import { useLogout } from '@/hooks/useAuth';

export function ServerRail() {
  const theme = useTheme();
  const router = useRouter();
  const { data: servers } = useServers();
  const dmUnreadCount = useNotificationStore(selectTotalDmUnread);
  const logout = useLogout();

  return (
    <View
      style={[styles.rail, { backgroundColor: theme.colors.surface }]}
      accessible={true}
      accessibilityLabel="Server navigation rail"
    >
      {/* Home button */}
      <View style={styles.homeButtonContainer}>
        <IconButton
          icon="home"
          size={28}
          onPress={() => router.push('/(main)/home')}
          accessibilityLabel="Home — direct messages"
          accessibilityRole="button"
        />
        {dmUnreadCount > 0 && (
          <Badge style={styles.badge} size={16}>
            {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
          </Badge>
        )}
      </View>

      {/* Server icons */}
      <ScrollView
        style={styles.serverList}
        contentContainerStyle={styles.serverListContent}
        showsVerticalScrollIndicator={false}
        accessibilityRole="list"
        accessibilityLabel="Server list"
      >
        {servers?.map((server) => (
          <View key={server._id} style={styles.serverIconWrapper}>
            <IconButton
              icon={() => <ServerIcon name={server.name} icon={server.icon} size={32} />}
              onPress={() => router.push(`/(main)/servers/${server._id}`)}
              accessibilityLabel={`${server.name} server`}
              accessibilityRole="button"
              size={32}
            />
          </View>
        ))}

        {/* Add server button */}
        <IconButton
          icon="plus-circle-outline"
          size={28}
          onPress={() => router.push('/(main)/servers/create')}
          accessibilityLabel="Create server"
          accessibilityRole="button"
        />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        <IconButton
          icon="account-circle"
          size={28}
          onPress={() => router.push('/(main)/profile')}
          accessibilityLabel="Profile"
          accessibilityRole="button"
        />
        <IconButton
          icon="logout"
          size={24}
          onPress={logout}
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 60,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
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
