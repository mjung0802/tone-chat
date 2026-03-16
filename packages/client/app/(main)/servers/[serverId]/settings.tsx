import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CreateInviteForm } from '@/components/invites/CreateInviteForm';
import { InviteCard } from '@/components/invites/InviteCard';
import { MemberList } from '@/components/members/MemberList';
import { ServerIcon } from '@/components/servers/ServerIcon';
import { useUpload } from '@/hooks/useAttachments';
import { useChannels, useCreateChannel } from '@/hooks/useChannels';
import { useCreateInvite, useInvites, useRevokeInvite } from '@/hooks/useInvites';
import { useMembers } from '@/hooks/useMembers';
import { useDeleteServer, useServer, useUpdateServer } from '@/hooks/useServers';
import { useAuthStore } from '@/stores/authStore';
import * as DocumentPicker from 'expo-document-picker';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  HelperText,
  Icon,
  List,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

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
  const createInvite = useCreateInvite(sid);
  const revokeInvite = useRevokeInvite(sid);
  const upload = useUpload();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameInitialized, setNameInitialized] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconError, setIconError] = useState('');

  const isAdmin = members?.some((m) => m.userId === userId && m.roles.includes('admin')) ?? false;

  if (isLoading || !server) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return <Redirect href={`/(main)/servers/${sid}`} />;
  }

  if (!nameInitialized) {
    setName(server.name);
    setDescription(server.description ?? '');
    setNameInitialized(true);
  }

  const isOwner = server.ownerId === userId;

  const handleIconPress = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'] });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0]!;
    setIsUploadingIcon(true);
    setIconError('');
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uploadResult = await upload.mutateAsync({
        data: blob,
        filename: asset.name,
        contentType: asset.mimeType ?? 'image/jpeg',
      });
      updateServer.mutate({ icon: uploadResult.attachment.id });
    } catch {
      setIconError('Failed to upload server icon');
    } finally {
      setIsUploadingIcon(false);
    }
  };

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
          <Pressable
            onPress={handleIconPress}
            style={styles.iconContainer}
            accessibilityRole="button"
            accessibilityLabel="Change server icon"
          >
            <ServerIcon name={server.name} icon={server.icon} size={80} />
            <View style={[styles.cameraOverlay, { backgroundColor: theme.colors.surface }]}>
              {isUploadingIcon ? (
                <ActivityIndicator size={16} />
              ) : (
                <Icon source="camera" size={16} color={theme.colors.onSurface} />
              )}
            </View>
          </Pressable>
          {iconError ? (
            <HelperText type="error" visible accessibilityLiveRegion="polite">
              {iconError}
            </HelperText>
          ) : null}
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
          <ServerIcon name={server.name} icon={server.icon} size={80} />
          <Text variant="titleMedium">{server.name}</Text>
          <Text variant="bodyMedium" style={styles.subdued}>
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
  iconContainer: {
    position: 'relative',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  subdued: {
    opacity: 0.7,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
});
