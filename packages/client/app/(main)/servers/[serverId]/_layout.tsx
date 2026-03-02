import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { IconButton, useTheme } from 'react-native-paper';
import { useServer } from '../../../../src/hooks/useServers';
import { useChannels } from '../../../../src/hooks/useChannels';
import { ChannelSidebar } from '../../../../src/components/channels/ChannelSidebar';
import { LoadingSpinner } from '../../../../src/components/common/LoadingSpinner';
import { useUiStore } from '../../../../src/stores/uiStore';
import { useAuthStore } from '../../../../src/stores/authStore';
import type { Channel } from '../../../../src/types/models';

export default function ServerLayout() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const { data: server, isLoading: serverLoading } = useServer(serverId ?? '');
  const { data: channels, isLoading: channelsLoading } = useChannels(serverId ?? '');
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const userId = useAuthStore((s) => s.userId);

  const isWide = width >= 768;
  const showSidebar = isWide || isSidebarOpen;
  const isOwner = server?.ownerId === userId;
  const theme = useTheme();

  if (serverLoading || channelsLoading) {
    return <LoadingSpinner />;
  }

  if (!server || !serverId) {
    return <LoadingSpinner message="Server not found" />;
  }

  const handleChannelPress = (channel: Channel) => {
    router.push(`/(main)/servers/${serverId}/channels/${channel._id}`);
    if (!isWide) {
      useUiStore.getState().setSidebarOpen(false);
    }
  };

  const handleCreateChannel = () => {
    // Navigate to a create channel flow — for now just create via the settings
    router.push(`/(main)/servers/${serverId}/settings`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {showSidebar ? (
        <ChannelSidebar
          serverName={server.name}
          channels={channels ?? []}
          onChannelPress={handleChannelPress}
          onCreateChannel={handleCreateChannel}
          canManage={isOwner}
        />
      ) : null}
      <View style={[styles.content, { backgroundColor: theme.colors.background }]}>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: theme.colors.background },
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.onSurface,
            headerLeft: () =>
            !isWide ? (
              <IconButton
                icon="menu"
                onPress={toggleSidebar}
                accessibilityLabel="Toggle channel sidebar"
              />
            ) : null,
            headerRight: () => (
              <IconButton
                icon="cog"
                onPress={() => router.push(`/(main)/servers/${serverId}/settings`)}
                accessibilityLabel="Server settings"
              />
            ),
          }}
        >
          <Stack.Screen
            name="index"
            options={{ title: server.name }}
          />
          <Stack.Screen
            name="settings"
            options={{ title: 'Server Settings' }}
          />
          <Stack.Screen
            name="channels/[channelId]"
            options={{ title: server.name }}
          />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    paddingTop: 1,
  },
});
