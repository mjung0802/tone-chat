import React, { useState } from 'react';
import { Button, Dialog, Portal, RadioButton, Text, TextInput } from 'react-native-paper';
import type { ServerMember } from '../../types/models';
import { ConfirmDialog } from '../common/ConfirmDialog';

export type DialogType = 'mute' | 'kick' | 'ban' | 'promote' | 'demote' | 'transfer';

interface MemberActionDialogsProps {
  member?: ServerMember;
  dialogType?: DialogType;
  onDismiss: () => void;
  onMute?: (userId: string, duration: number) => void;
  onKick?: (userId: string) => void;
  onBan?: (userId: string, reason?: string) => void;
  onPromote?: (userId: string) => void;
  onDemote?: (userId: string) => void;
  onTransferOwnership?: (userId: string) => void;
}

export function MemberActionDialogs({
  member,
  dialogType,
  onDismiss,
  onMute,
  onKick,
  onBan,
  onPromote,
  onDemote,
  onTransferOwnership,
}: MemberActionDialogsProps) {
  const [muteDuration, setMuteDuration] = useState('60');
  const [banReason, setBanReason] = useState('');

  if (!member) return null;

  const memberName = member.nickname ?? member.display_name ?? member.username ?? member.userId;
  const targetRole = member.role ?? 'member';
  const nextRole = targetRole === 'member' ? 'Mod' : 'Admin';
  const prevRole = targetRole === 'admin' ? 'Mod' : 'Member';

  const handleConfirmMute = () => {
    onMute?.(member.userId, Number(muteDuration));
    onDismiss();
  };

  const handleConfirmBan = () => {
    onBan?.(member.userId, banReason || undefined);
    setBanReason('');
    onDismiss();
  };

  return (
    <>
      {/* Mute duration dialog */}
      <Portal>
        <Dialog visible={dialogType === 'mute'} onDismiss={onDismiss} style={{ maxWidth: 400, alignSelf: 'center', width: '100%' }}>
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
            <Button onPress={onDismiss}>Cancel</Button>
            <Button onPress={handleConfirmMute}>Mute</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ConfirmDialog
        visible={dialogType === 'kick'}
        title="Kick Member"
        message={`Are you sure you want to kick ${memberName} from the server?`}
        confirmLabel="Kick"
        destructive
        onConfirm={() => { onKick?.(member.userId); onDismiss(); }}
        onCancel={onDismiss}
      />

      {/* Ban dialog with reason input */}
      <Portal>
        <Dialog visible={dialogType === 'ban'} onDismiss={onDismiss} style={{ maxWidth: 400, alignSelf: 'center', width: '100%' }}>
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
            <Button onPress={() => { setBanReason(''); onDismiss(); }}>Cancel</Button>
            <Button textColor="#BA1A1A" onPress={handleConfirmBan}>Ban</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ConfirmDialog
        visible={dialogType === 'promote'}
        title="Promote Member"
        message={`Promote ${memberName} to ${nextRole}?`}
        confirmLabel="Promote"
        onConfirm={() => { onPromote?.(member.userId); onDismiss(); }}
        onCancel={onDismiss}
      />

      <ConfirmDialog
        visible={dialogType === 'demote'}
        title="Demote Member"
        message={`Demote ${memberName} to ${prevRole}?`}
        confirmLabel="Demote"
        destructive
        onConfirm={() => { onDemote?.(member.userId); onDismiss(); }}
        onCancel={onDismiss}
      />

      <ConfirmDialog
        visible={dialogType === 'transfer'}
        title="Transfer Ownership"
        message={`Transfer server ownership to ${memberName}? You will be demoted to Admin. This cannot be undone.`}
        confirmLabel="Transfer"
        destructive
        onConfirm={() => { onTransferOwnership?.(member.userId); onDismiss(); }}
        onCancel={onDismiss}
      />
    </>
  );
}
