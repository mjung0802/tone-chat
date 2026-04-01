import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CreateInviteForm } from '@/components/invites/CreateInviteForm';
import { InviteCard } from '@/components/invites/InviteCard';
import { MemberActionDialogs, type DialogType } from '@/components/members/MemberActionDialogs';
import { MemberList } from '@/components/members/MemberList';
import { ServerIcon } from '@/components/servers/ServerIcon';
import { useUpload } from '@/hooks/useAttachments';
import { useBans, useUnban } from '@/hooks/useBans';
import { useChannels, useCreateChannel } from '@/hooks/useChannels';
import { useCreateInvite, useInvites, useRevokeInvite } from '@/hooks/useInvites';
import { useCustomTones, useAddCustomTone, useRemoveCustomTone } from '@/hooks/useTones';
import { CustomToneForm } from '@/components/servers/CustomToneForm';
import { useMembers, useMuteMember, useUnmuteMember, usePromoteMember, useDemoteMember, useBanMember, useKickMember } from '@/hooks/useMembers';
import { useDeleteServer, useServer, useUpdateServer, useTransferOwnership, useUpdateInviteSettings } from '@/hooks/useServers';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { getRoleLevel, type Role } from '@/utils/roles';
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
  IconButton,
  List,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { ServerMember } from '@/types/models';

export default function ServerSettingsScreen() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  const sid = serverId ?? '';
  const router = useRouter();
  const userId = useAuthStore((s) => s.userId);
  const theme = useTheme();

  const openProfileModal = useUiStore((s) => s.openProfileModal);

  const { data: server, isLoading } = useServer(sid);
  const { data: channels } = useChannels(sid);
  const { data: members } = useMembers(sid);
  const { data: invites } = useInvites(sid);
  const { data: bans } = useBans(sid);

  const displayNames: Record<string, string> = {};
  members?.forEach((m) => {
    displayNames[m.userId] = m.display_name ?? m.username ?? m.userId;
  });

  function sortRank(member: ServerMember, ownerId: string | undefined): number {
    if (member.userId === ownerId) return 0;
    const level = getRoleLevel((member.role ?? 'member') as Role, false);
    return level === 2 ? 1 : level === 1 ? 2 : 3;
  }

  const sortedMembers = [...(members ?? [])].sort((a, b) =>
    sortRank(a, server?.ownerId) - sortRank(b, server?.ownerId)
  );

  const updateServer = useUpdateServer(sid);
  const updateInviteSettings = useUpdateInviteSettings(sid);
  const deleteServer = useDeleteServer(sid);
  const createChannel = useCreateChannel(sid);
  const createInvite = useCreateInvite(sid);
  const revokeInvite = useRevokeInvite(sid);
  const { data: customTones } = useCustomTones(sid);
  const addCustomTone = useAddCustomTone(sid);
  const removeCustomTone = useRemoveCustomTone(sid);
  const upload = useUpload();
  const muteMember = useMuteMember(sid);
  const unmuteMember = useUnmuteMember(sid);
  const promoteMember = usePromoteMember(sid);
  const demoteMember = useDemoteMember(sid);
  const banMember = useBanMember(sid);
  const transferOwnership = useTransferOwnership(sid);
  const kickMember = useKickMember(sid);
  const unban = useUnban(sid);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameInitialized, setNameInitialized] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconError, setIconError] = useState('');

  // Member action dialog state
  const [dialogMember, setDialogMember] = useState<ServerMember | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);

  const currentMember = members?.find((m) => m.userId === userId);
  const isAdmin = currentMember ? (getRoleLevel((currentMember.role ?? 'member') as Role, false) >= getRoleLevel('admin', false) || server?.ownerId === userId) : false;

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
  const actorRole = (currentMember?.role ?? 'member') as Role;

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

  const openDialog = (member: ServerMember, type: DialogType) => {
    setDialogMember(member);
    setDialogType(type);
  };

  const closeDialog = () => {
    setDialogMember(null);
    setDialogType(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Server Info */}
      <Text variant="titleLarge" style={styles.section}>Server Info</Text>
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

      <Divider style={styles.divider} />

      {/* Members */}
      <Text variant="titleLarge" style={styles.section}>
        Members ({members?.length ?? 0})
      </Text>
      <MemberList
        members={sortedMembers}
        displayNames={displayNames}
        ownerId={server.ownerId}
        actorRole={actorRole}
        actorIsOwner={isOwner}
        onMemberPress={(m) => openProfileModal(m.userId, sid)}
        onMute={(m) => openDialog(m, 'mute')}
        onUnmute={(m) => unmuteMember.mutate(m.userId)}
        onKick={(m) => openDialog(m, 'kick')}
        onBan={(m) => openDialog(m, 'ban')}
        onPromote={(m) => openDialog(m, 'promote')}
        onDemote={(m) => openDialog(m, 'demote')}
        onTransferOwnership={(m) => openDialog(m, 'transfer')}
      />

      <MemberActionDialogs
        member={dialogMember}
        dialogType={dialogType}
        onDismiss={closeDialog}
        onMute={(uid, duration) => muteMember.mutate({ userId: uid, data: { duration } })}
        onKick={(uid) => kickMember.mutate(uid)}
        onBan={(uid, reason) => banMember.mutate({ userId: uid, data: { reason } })}
        onPromote={(uid) => promoteMember.mutate(uid)}
        onDemote={(uid) => demoteMember.mutate(uid)}
        onTransferOwnership={(uid) => transferOwnership.mutate({ userId: uid })}
      />

      <Divider style={styles.divider} />

      {/* Invites */}
      <Text variant="titleLarge" style={styles.section}>Invites</Text>
      <View style={styles.settingRow}>
        <Text variant="bodyMedium">Allow members to invite others</Text>
        <Switch
          value={server.allowMemberInvites ?? true}
          onValueChange={(value) => updateInviteSettings.mutate({ allowMemberInvites: value })}
          disabled={updateInviteSettings.isPending}
        />
      </View>
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

      <Divider style={styles.divider} />

      {/* Custom Tones */}
      <Text variant="titleLarge" style={styles.section}>Custom Tones</Text>
      {customTones?.map((tone) => (
        <List.Item
          key={tone.key}
          title={`${tone.emoji} /${tone.key}`}
          description={tone.label}
          right={() => (
            <IconButton
              icon="delete"
              size={20}
              onPress={() => removeCustomTone.mutate(tone.key)}
              accessibilityLabel={`Remove ${tone.label} tone`}
            />
          )}
          accessibilityRole="text"
        />
      ))}
      <CustomToneForm
        onSubmit={(data) => addCustomTone.mutate(data)}
        isLoading={addCustomTone.isPending}
      />

      {/* Bans (admin+ only) */}
      {bans && bans.length > 0 ? (
        <>
          <Divider style={styles.divider} />
          <Text variant="titleLarge" style={styles.section}>
            Banned Users ({bans.length})
          </Text>
          {bans.map((ban) => (
            <List.Item
              key={ban.userId}
              title={ban.username ?? ban.display_name ?? ban.userId}
              description={ban.reason ? `Reason: ${ban.reason}` : 'No reason given'}
              right={() => (
                <Button
                  mode="outlined"
                  compact
                  onPress={() => unban.mutate(ban.userId)}
                  accessibilityLabel={`Unban ${ban.username ?? ban.userId}`}
                >
                  Unban
                </Button>
              )}
              accessibilityRole="text"
            />
          ))}
        </>
      ) : null}

      {/* Audit Log */}
      <Divider style={styles.divider} />
      <List.Item
        title="Audit Log"
        description="View moderation action history"
        left={(props) => <List.Icon {...props} icon="clipboard-text-clock" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => router.push(`/(main)/servers/${sid}/audit-log`)}
        accessibilityRole="button"
        accessibilityLabel="View audit log"
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
