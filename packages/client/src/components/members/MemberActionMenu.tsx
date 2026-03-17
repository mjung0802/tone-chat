import React, { useState } from 'react';
import { Button, Dialog, Menu, Portal, RadioButton, Text, TextInput } from 'react-native-paper';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { getAvailableActions, type Role } from '../../utils/roles';
import type { ServerMember } from '../../types/models';

interface MemberActionMenuProps {
  visible: boolean;
  anchor: { x: number; y: number };
  member: ServerMember;
  actorRole: Role;
  actorIsOwner: boolean;
  onDismiss: () => void;
  onMute?: ((userId: string, duration: number) => void) | undefined;
  onUnmute?: ((userId: string) => void) | undefined;
  onKick?: ((userId: string) => void) | undefined;
  onBan?: ((userId: string, reason?: string) => void) | undefined;
  onPromote?: ((userId: string) => void) | undefined;
  onDemote?: ((userId: string) => void) | undefined;
  onTransferOwnership?: ((userId: string) => void) | undefined;
}

export function MemberActionMenu({
  visible,
  anchor,
  member,
  actorRole,
  actorIsOwner,
  onDismiss,
  onMute,
  onUnmute,
  onKick,
  onBan,
  onPromote,
  onDemote,
  onTransferOwnership,
}: MemberActionMenuProps) {
  const targetRole = (member.role ?? 'member') as Role;
  const targetIsOwner = false; // Owner is determined by server.ownerId, not by role field
  const actions = getAvailableActions(actorRole, actorIsOwner, targetRole, targetIsOwner);
  const isMuted = member.mutedUntil ? new Date(member.mutedUntil) > new Date() : false;

  const [muteDialogVisible, setMuteDialogVisible] = useState(false);
  const [muteDuration, setMuteDuration] = useState('60');
  const [kickDialogVisible, setKickDialogVisible] = useState(false);
  const [banDialogVisible, setBanDialogVisible] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [transferDialogVisible, setTransferDialogVisible] = useState(false);
  const [promoteDialogVisible, setPromoteDialogVisible] = useState(false);
  const [demoteDialogVisible, setDemoteDialogVisible] = useState(false);

  const handleMute = () => {
    onDismiss();
    setMuteDialogVisible(true);
  };

  const handleConfirmMute = () => {
    onMute?.(member.userId, Number(muteDuration));
    setMuteDialogVisible(false);
  };

  const handleUnmute = () => {
    onUnmute?.(member.userId);
    onDismiss();
  };

  const handleKick = () => {
    onDismiss();
    setKickDialogVisible(true);
  };

  const handleBan = () => {
    onDismiss();
    setBanDialogVisible(true);
  };

  const handleConfirmBan = () => {
    onBan?.(member.userId, banReason || undefined);
    setBanDialogVisible(false);
    setBanReason('');
  };

  const handlePromote = () => {
    onDismiss();
    setPromoteDialogVisible(true);
  };

  const handleDemote = () => {
    onDismiss();
    setDemoteDialogVisible(true);
  };

  const handleTransfer = () => {
    onDismiss();
    setTransferDialogVisible(true);
  };

  const memberName = member.nickname ?? member.display_name ?? member.username ?? member.userId;
  const nextRole = targetRole === 'member' ? 'Mod' : 'Admin';
  const prevRole = targetRole === 'admin' ? 'Mod' : 'Member';

  return (
    <>
      <Menu visible={visible} onDismiss={onDismiss} anchor={anchor}>
        {actions.canMute && !isMuted ? (
          <Menu.Item onPress={handleMute} title="Mute" leadingIcon="volume-off" />
        ) : null}
        {actions.canMute && isMuted ? (
          <Menu.Item onPress={handleUnmute} title="Unmute" leadingIcon="volume-high" />
        ) : null}
        {actions.canKick ? (
          <Menu.Item onPress={handleKick} title="Kick" leadingIcon="account-remove" />
        ) : null}
        {actions.canBan ? (
          <Menu.Item onPress={handleBan} title="Ban" leadingIcon="cancel" />
        ) : null}
        {actions.canPromote ? (
          <Menu.Item onPress={handlePromote} title={`Promote to ${nextRole}`} leadingIcon="arrow-up-bold" />
        ) : null}
        {actions.canDemote ? (
          <Menu.Item onPress={handleDemote} title={`Demote to ${prevRole}`} leadingIcon="arrow-down-bold" />
        ) : null}
        {actions.canTransferOwnership ? (
          <Menu.Item onPress={handleTransfer} title="Transfer Ownership" leadingIcon="crown" />
        ) : null}
      </Menu>

      {/* Mute duration dialog */}
      <Portal>
        <Dialog visible={muteDialogVisible} onDismiss={() => setMuteDialogVisible(false)}>
          <Dialog.Title>Mute {memberName}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Select mute duration:</Text>
            <RadioButton.Group onValueChange={setMuteDuration} value={muteDuration}>
              <RadioButton.Item label="1 hour" value="60" />
              <RadioButton.Item label="1 day" value="1440" />
              <RadioButton.Item label="7 days" value="10080" />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMuteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleConfirmMute}>Mute</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ConfirmDialog
        visible={kickDialogVisible}
        title="Kick Member"
        message={`Are you sure you want to kick ${memberName} from the server?`}
        confirmLabel="Kick"
        destructive
        onConfirm={() => { onKick?.(member.userId); setKickDialogVisible(false); }}
        onCancel={() => setKickDialogVisible(false)}
      />

      {/* Ban dialog with reason input */}
      <Portal>
        <Dialog visible={banDialogVisible} onDismiss={() => setBanDialogVisible(false)}>
          <Dialog.Title>Ban {memberName}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">This will remove {memberName} from the server and prevent them from rejoining.</Text>
            <TextInput
              label="Reason (optional)"
              value={banReason}
              onChangeText={setBanReason}
              style={{ marginTop: 12 }}
              accessibilityLabel="Ban reason"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setBanDialogVisible(false); setBanReason(''); }}>Cancel</Button>
            <Button textColor="#BA1A1A" onPress={handleConfirmBan}>Ban</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ConfirmDialog
        visible={promoteDialogVisible}
        title="Promote Member"
        message={`Promote ${memberName} to ${nextRole}?`}
        confirmLabel="Promote"
        onConfirm={() => { onPromote?.(member.userId); setPromoteDialogVisible(false); }}
        onCancel={() => setPromoteDialogVisible(false)}
      />

      <ConfirmDialog
        visible={demoteDialogVisible}
        title="Demote Member"
        message={`Demote ${memberName} to ${prevRole}?`}
        confirmLabel="Demote"
        destructive
        onConfirm={() => { onDemote?.(member.userId); setDemoteDialogVisible(false); }}
        onCancel={() => setDemoteDialogVisible(false)}
      />

      <ConfirmDialog
        visible={transferDialogVisible}
        title="Transfer Ownership"
        message={`Transfer server ownership to ${memberName}? You will be demoted to Admin. This cannot be undone.`}
        confirmLabel="Transfer"
        destructive
        onConfirm={() => { onTransferOwnership?.(member.userId); setTransferDialogVisible(false); }}
        onCancel={() => setTransferDialogVisible(false)}
      />
    </>
  );
}
