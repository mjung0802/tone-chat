import { ChannelSidebar } from '@/components/channels/ChannelSidebar';
import { useChannels, useCreateChannel } from '@/hooks/useChannels';
import { useMembers } from '@/hooks/useMembers';
import { useServer } from '@/hooks/useServers';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import type { Channel } from '@/types/models';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Button, Dialog, Portal, TextInput as PaperTextInput } from 'react-native-paper';

export function ServerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const userId = useAuthStore((s) => s.userId);

  const serverId = pathname.match(/\/servers\/([^/]+)/)?.[1] ?? '';
  const isWide = width >= 768;
  const showSidebar = isWide || isSidebarOpen;

  const { data: server } = useServer(serverId);
  const { data: channels } = useChannels(serverId);
  const { data: members } = useMembers(serverId);

  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const createChannel = useCreateChannel(serverId);

  if (!serverId || !server || !showSidebar) return null;

  const isAdmin =
    members?.some(
      (m) => m.userId === userId && (m.role === 'admin' || server.ownerId === m.userId),
    ) ?? false;

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
    createChannel.mutate(
      { name },
      {
        onSuccess: (data) => {
          setCreateDialogVisible(false);
          router.push(`/(main)/servers/${serverId}/channels/${data.channel._id}`);
        },
      },
    );
  };

  return (
    <>
      <ChannelSidebar
        serverName={server.name}
        channels={channels ?? []}
        onChannelPress={handleChannelPress}
        onCreateChannel={handleCreateChannel}
        canManage={isAdmin}
      />
      <Portal>
        <Dialog
          visible={createDialogVisible}
          onDismiss={() => setCreateDialogVisible(false)}
          style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}
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
    </>
  );
}
