import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Chip, Dialog, Divider, IconButton, Portal, Text, Tooltip, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { UserAvatar } from './UserAvatar';
import { MemberActionDialogs, type DialogType } from '../members/MemberActionDialogs';
import { useUiStore } from '@/stores/uiStore';
import { useUser, useMe } from '@/hooks/useUser';
import { useMembers, useMuteMember, useUnmuteMember, useKickMember, useBanMember } from '@/hooks/useMembers';
import { useServer } from '@/hooks/useServers';
import { useGetOrCreateConversation, useBlockedIds, useBlockUser, useUnblockUser } from '@/hooks/useDms';
import { getBadgeLabel, getAvailableActions, isMemberMuted, type Role } from '@/utils/roles';

export function UserProfileModal() {
  const { visible, userId, serverId } = useUiStore((s) => s.profileModal);
  const closeProfileModal = useUiStore((s) => s.closeProfileModal);
  const theme = useTheme();
  const router = useRouter();

  const [dialogType, setDialogType] = useState<DialogType>(null);

  const { data: user } = useUser(userId ?? '');
  const { data: members } = useMembers(serverId ?? '');
  const { data: me } = useMe();
  const { data: server } = useServer(serverId ?? '');

  const muteMember = useMuteMember(serverId ?? '');
  const unmuteMember = useUnmuteMember(serverId ?? '');
  const kickMember = useKickMember(serverId ?? '');
  const banMember = useBanMember(serverId ?? '');

  const { data: blockedIds } = useBlockedIds();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const getOrCreateConversation = useGetOrCreateConversation();

  if (!visible || !userId) return null;

  const hasServerContext = !!serverId;

  const targetMember = hasServerContext ? (members?.find((m) => m.userId === userId) ?? null) : null;
  const currentMember = hasServerContext ? (members?.find((m) => m.userId === me?.id) ?? null) : null;

  const displayName = (hasServerContext ? (targetMember?.nickname ?? targetMember?.display_name) : null) ?? user?.display_name ?? null;
  const username = user?.username ?? userId;
  const headerName = displayName ?? username;
  const avatarAttachmentId = (hasServerContext ? targetMember?.avatar_url : null) ?? user?.avatar_url ?? null;

  const actorRole = (currentMember?.role ?? 'member') as Role;
  const actorIsOwner = server?.ownerId === me?.id;
  const targetRole = (targetMember?.role ?? 'member') as Role;
  const targetIsOwner = server?.ownerId === userId;

  const actions = (targetMember && currentMember && userId !== me?.id)
    ? getAvailableActions(actorRole, actorIsOwner, targetRole, targetIsOwner)
    : null;

  const isMuted = isMemberMuted(targetMember?.mutedUntil ?? null);

  const hasActions = hasServerContext && actions && (actions.canMute || actions.canKick || actions.canBan);

  const badgeLabel = getBadgeLabel(targetRole, targetIsOwner);

  const isBlocked = blockedIds?.includes(userId) ?? false;

  const handleToggleBlock = () => {
    if (isBlocked) {
      unblockUser.mutate(userId);
    } else {
      blockUser.mutate(userId);
    }
  };

  const handleSendMessage = () => {
    getOrCreateConversation.mutate(userId, {
      onSuccess: (data) => {
        router.push(`/(main)/home/${data.conversation._id}`);
        closeProfileModal();
      },
    });
  };

  const openDialog = (type: DialogType) => {
    if (targetMember) {
      setDialogType(type);
    }
  };

  const closeDialog = () => {
    setDialogType(null);
  };

  const handleMute = (userId: string, duration: number) => {
    muteMember.mutate({ userId, data: { duration } });
    closeProfileModal();
  };

  const handleKick = (userId: string) => {
    kickMember.mutate(userId);
    closeProfileModal();
  };

  const handleBan = (userId: string, reason?: string | undefined) => {
    banMember.mutate({ userId, data: reason ? { reason } : {} });
    closeProfileModal();
  };

  return (
    <>
      <Portal>
        <Dialog
          visible={visible}
          onDismiss={closeProfileModal}
          dismissable={dialogType === null}
          style={styles.dialog}
          testID="user-profile-modal"
        >
          <Dialog.Content>
            <View style={styles.profileHeader}>
              <UserAvatar
                avatarAttachmentId={avatarAttachmentId}
                name={headerName}
                size={64}
              />
              <View style={styles.nameBlock}>
                <Text variant="titleMedium" accessibilityRole="text">
                  {headerName}
                </Text>
                {displayName && displayName !== username ? (
                  <Text variant="bodySmall" style={styles.usernameSubtext}>
                    @{username}
                  </Text>
                ) : null}
                {user?.pronouns ? (
                  <Text variant="bodySmall" style={styles.pronouns}>
                    {user.pronouns}
                  </Text>
                ) : null}
              </View>
            </View>

            {user?.bio ? (
              <>
                <Divider style={styles.divider} />
                <Text variant="bodyMedium">{user.bio}</Text>
              </>
            ) : null}

            {hasServerContext && (badgeLabel || targetMember?.nickname) ? (
              <>
                <Divider style={styles.divider} />
                <View style={styles.metaRow}>
                  {badgeLabel ? (
                    <Chip compact accessibilityLabel={`Role: ${badgeLabel}`}>
                      {badgeLabel}
                    </Chip>
                  ) : null}
                  {isMuted ? (
                    <Chip compact accessibilityLabel="Muted">
                      Muted
                    </Chip>
                  ) : null}
                  {targetMember?.nickname ? (
                    <Text variant="bodySmall" style={styles.nickname}>
                      Nickname: {targetMember.nickname}
                    </Text>
                  ) : null}
                </View>
              </>
            ) : null}

            {hasServerContext && hasActions ? (
              <>
                <Divider style={styles.divider} />
                <View style={styles.actionRow}>
                  {actions?.canMute && !isMuted ? (
                    <Tooltip title="Mute">
                      <IconButton
                        icon="volume-off"
                        size={20}
                        onPress={() => openDialog('mute')}
                        accessibilityLabel="Mute user"
                      />
                    </Tooltip>
                  ) : null}
                  {actions?.canMute && isMuted ? (
                    <Tooltip title="Unmute">
                      <IconButton
                        icon="volume-high"
                        size={20}
                        onPress={() => unmuteMember.mutate(userId)}
                        accessibilityLabel="Unmute user"
                      />
                    </Tooltip>
                  ) : null}
                  {actions?.canKick ? (
                    <Tooltip title="Kick">
                      <IconButton
                        icon="account-remove"
                        size={20}
                        onPress={() => openDialog('kick')}
                        accessibilityLabel="Kick user"
                      />
                    </Tooltip>
                  ) : null}
                  {actions?.canBan ? (
                    <Tooltip title="Ban">
                      <IconButton
                        icon="cancel"
                        size={20}
                        onPress={() => openDialog('ban')}
                        accessibilityLabel="Ban user"
                      />
                    </Tooltip>
                  ) : null}
                </View>
              </>
            ) : null}
          </Dialog.Content>

          <Dialog.Actions>
            {userId !== me?.id && (
              <Button
                onPress={handleSendMessage}
                loading={getOrCreateConversation.isPending ?? false}
                accessibilityLabel="Send message"
              >
                Message
              </Button>
            )}
            {userId !== me?.id && (
              <Button
                onPress={handleToggleBlock}
                loading={blockUser.isPending ?? unblockUser.isPending ?? false}
                {...(!isBlocked && { textColor: theme.colors.error })}
                accessibilityLabel={isBlocked ? 'Unblock user' : 'Block user'}
              >
                {isBlocked ? 'Unblock' : 'Block'}
              </Button>
            )}
            <Button onPress={closeProfileModal} accessibilityLabel="Close profile">
              Close
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {hasServerContext && (
        <MemberActionDialogs
          member={targetMember}
          dialogType={dialogType}
          onDismiss={closeDialog}
          onMute={handleMute}
          onKick={handleKick}
          onBan={handleBan}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  usernameSubtext: {
    opacity: 0.6,
  },
  pronouns: {
    opacity: 0.7,
  },
  divider: {
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  nickname: {
    opacity: 0.7,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 4,
  },
});
