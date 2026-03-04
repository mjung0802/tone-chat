import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Divider,
  List,
  useTheme,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useServer, useUpdateServer, useDeleteServer } from '../../../../src/hooks/useServers';
import { useChannels, useCreateChannel, useDeleteChannel } from '../../../../src/hooks/useChannels';
import { useMembers, useRemoveMember } from '../../../../src/hooks/useMembers';
import { useInvites, useCreateInvite, useRevokeInvite } from '../../../../src/hooks/useInvites';
import { useAuthStore } from '../../../../src/stores/authStore';
import { ConfirmDialog } from '../../../../src/components/common/ConfirmDialog';
import { LoadingSpinner } from '../../../../src/components/common/LoadingSpinner';
import { MemberList } from '../../../../src/components/members/MemberList';
import { InviteCard } from '../../../../src/components/invites/InviteCard';
import { CreateInviteForm } from '../../../../src/components/invites/CreateInviteForm';

export default function ServerSettingsScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const sid = serverId ?? '';
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const theme = useTheme();

  const { data: server, isLoading } = useServer(sid);
  const { data: channels } = useChannels(sid);
  const { data: members } = useMembers(sid);
  const { data: invites } = useInvites(sid);

  const displayNames: Record<string, string> = {};
  members?.forEach((m) => {
    displayNames[m.userId] = m.display_name ?? m.username ?? m.userId;
  });

  const updateServer = useUpdateServer(sid);
  const deleteServer = useDeleteServer(sid);
  const createChannel = useCreateChannel(sid);
  const deleteChannel = useDeleteChannel(sid, '');
  const removeMember = useRemoveMember(sid, '');
  const createInvite = useCreateInvite(sid);
  const revokeInvite = useRevokeInvite(sid);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameInitialized, setNameInitialized] = useState(false);

  if (isLoading || !server) {
    return <LoadingSpinner />;
  }

  if (!nameInitialized) {
    setName(server.name);
    setDescription(server.description ?? '');
    setNameInitialized(true);
  }

  const isOwner = server.ownerId === userId;

  const handleSaveInfo = () => {
    const data: { name?: string; description?: string } = {};
    if (name.trim()) data.name = name.trim();
    if (description.trim()) data.description = description.trim();
    updateServer.mutate(data);
  };

  const handleDeleteServer = () => {
    deleteServer.mutate(undefined, {
      onSuccess: () => {
        router.replace('/(main)/servers');
      },
    });
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    createChannel.mutate({ name: newChannelName.trim() }, {
      onSuccess: () => setNewChannelName(''),
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Server Info */}
      <Text variant="titleLarge" style={styles.section}>Server Info</Text>
      {isOwner ? (
        <>
          <TextInput
            label="Server Name"
            value={name}
            onChangeText={setName}
            accessibilityLabel="Server name"
            style={styles.input}
          />
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            accessibilityLabel="Server description"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleSaveInfo}
            loading={updateServer.isPending}
            accessibilityLabel="Save server info"
            style={styles.button}
          >
            Save
          </Button>
        </>
      ) : (
        <>
          <Text variant="titleMedium">{server.name}</Text>
          <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
            {server.description ?? 'No description'}
          </Text>
        </>
      )}

      <Divider style={styles.divider} />

      {/* Channels */}
      <Text variant="titleLarge" style={styles.section}>Channels</Text>
      {channels?.map((channel) => (
        <List.Item
          key={channel._id}
          title={`# ${channel.name}`}
          description={channel.topic}
          accessibilityRole="text"
        />
      ))}
      {isOwner ? (
        <View style={styles.row}>
          <TextInput
            label="New channel name"
            value={newChannelName}
            onChangeText={setNewChannelName}
            accessibilityLabel="New channel name"
            style={[styles.input, { flex: 1 }]}
          />
          <Button
            mode="outlined"
            onPress={handleCreateChannel}
            loading={createChannel.isPending}
            disabled={!newChannelName.trim()}
            accessibilityLabel="Create channel"
          >
            Add
          </Button>
        </View>
      ) : null}

      <Divider style={styles.divider} />

      {/* Members */}
      <Text variant="titleLarge" style={styles.section}>
        Members ({members?.length ?? 0})
      </Text>
      <MemberList members={members ?? []} displayNames={displayNames} />

      <Divider style={styles.divider} />

      {/* Invites */}
      <Text variant="titleLarge" style={styles.section}>Invites</Text>
      {invites?.map((invite) => (
        <InviteCard
          key={invite._id}
          invite={invite}
          onRevoke={isOwner ? (i) => revokeInvite.mutate(i.code) : null}
        />
      ))}
      <CreateInviteForm
        onSubmit={(data) => createInvite.mutate(data)}
        isLoading={createInvite.isPending}
      />

      {/* Danger Zone */}
      {isOwner ? (
        <>
          <Divider style={styles.divider} />
          <Text variant="titleLarge" style={[styles.section, { color: theme.colors.error }]}>
            Danger Zone
          </Text>
          <Button
            mode="outlined"
            textColor={theme.colors.error}
            onPress={() => setShowDeleteConfirm(true)}
            accessibilityLabel="Delete server"
            accessibilityHint="Permanently deletes this server and all its data"
          >
            Delete Server
          </Button>
        </>
      ) : null}

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Server"
        message={`Are you sure you want to delete "${server.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteServer}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    marginBottom: 12,
    marginTop: 4,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
