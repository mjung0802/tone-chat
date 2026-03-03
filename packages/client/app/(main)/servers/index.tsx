import React, { useState } from 'react';
import { View, FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { FAB, useTheme, Portal, Dialog, TextInput as PaperTextInput, Button, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useServers } from '../../../src/hooks/useServers';
import { useJoinViaCode } from '../../../src/hooks/useInvites';
import { ApiClientError } from '../../../src/api/client';
import { ServerListItem } from '../../../src/components/servers/ServerListItem';
import { LoadingSpinner } from '../../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../../src/components/common/EmptyState';
import type { Server } from '../../../src/types/models';

export default function ServersScreen() {
  const { data: servers, isLoading, refetch, isRefetching } = useServers();
  const router = useRouter();
  const theme = useTheme();
  const [joinDialogVisible, setJoinDialogVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const joinServer = useJoinViaCode();

  const joinError =
    joinServer.error instanceof ApiClientError
      ? joinServer.error.message
      : joinServer.error ? 'Failed to join server' : '';

  if (isLoading) {
    return <LoadingSpinner message="Loading servers..." />;
  }

  const handleServerPress = (server: Server) => {
    router.push(`/(main)/servers/${server._id}`);
  };

  const handleCreate = () => {
    router.push('/(main)/servers/create');
  };

  const handleOpenJoin = () => {
    setInviteCode('');
    joinServer.reset();
    setJoinDialogVisible(true);
  };

  const handleSubmitJoin = () => {
    const code = inviteCode.trim();
    if (!code) return;
    joinServer.mutate(code, {
      onSuccess: (response) => {
        setJoinDialogVisible(false);
        router.push(`/(main)/servers/${response.server._id}`);
      },
    });
  };

  const renderItem = ({ item }: ListRenderItemInfo<Server>) => (
    <ServerListItem server={item} onPress={handleServerPress} />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {!servers || servers.length === 0 ? (
        <EmptyState
          icon="server-network"
          title="No servers yet"
          description="Create or join a server to get started"
          actionLabel="Create Server"
          onAction={handleCreate}
        />
      ) : (
        <FlatList
          data={servers}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          onRefresh={refetch}
          refreshing={isRefetching}
          accessibilityRole="list"
          accessibilityLabel="Server list"
        />
      )}
      <FAB
        icon="plus"
        label="Create Server"
        onPress={handleCreate}
        style={styles.fab}
        accessibilityLabel="Create new server"
        accessibilityRole="button"
      />
      <FAB
        icon="link-variant-plus"
        label="Join Server via Invite Code"
        onPress={handleOpenJoin}
        style={styles.fabJoin}
        accessibilityLabel="Join server with invite code"
        accessibilityRole="button"
      />
      <Portal>
        <Dialog
          visible={joinDialogVisible}
          onDismiss={() => setJoinDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Join Server</Dialog.Title>
          <Dialog.Content>
            <PaperTextInput
              label="Invite code"
              value={inviteCode}
              onChangeText={(text) => { setInviteCode(text); joinServer.reset(); }}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSubmitJoin}
              returnKeyType="done"
              accessibilityLabel="Invite code"
            />
            {joinError ? (
              <HelperText type="error" visible accessibilityLiveRegion="polite">
                {joinError}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setJoinDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleSubmitJoin}
              loading={joinServer.isPending}
              disabled={!inviteCode.trim() || joinServer.isPending}
            >
              Join
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
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
  },
  fabJoin: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  dialog: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
});
