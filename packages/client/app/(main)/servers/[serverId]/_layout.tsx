import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { IconButton, useTheme, Portal, Dialog, TextInput as PaperTextInput, Button } from 'react-native-paper';
import { useServer } from '../../../../src/hooks/useServers';
import { useChannels, useCreateChannel } from '../../../../src/hooks/useChannels';
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

  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const createChannel = useCreateChannel(serverId ?? '');

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
    setNewChannelName('');
    setCreateDialogVisible(true);
  };

  const handleSubmitChannel = () => {
    const name = newChannelName.trim();
    if (!name) return;
    createChannel.mutate({ name }, {
      onSuccess: (data) => {
        setCreateDialogVisible(false);
        router.push(`/(main)/servers/${serverId}/channels/${data.channel._id}`);
      },
    });
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
          onGoHome={() => router.push('/(main)/servers')}
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
      <Portal>
        <Dialog
          visible={createDialogVisible}
          onDismiss={() => setCreateDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>New Channel</Dialog.Title>
          <Dialog.Content>
            <PaperTextInput
              label="Channel name"
              value={newChannelName}
              onChangeText={setNewChannelName}
              autoFocus
              onSubmitEditing={handleSubmitChannel}
              returnKeyType="done"
              accessibilityLabel="Channel name"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleSubmitChannel}
              loading={createChannel.isPending}
              disabled={!newChannelName.trim() || createChannel.isPending}
            >
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  dialog: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
});
