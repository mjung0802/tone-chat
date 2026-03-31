import React, { useState } from 'react';
import { Button, Dialog, HelperText, Portal, TextInput } from 'react-native-paper';
import { useJoinViaCode } from '@/hooks/useInvites';
import { ApiClientError } from '@/api/client';

interface JoinServerDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onJoined: (serverId: string) => void;
}

export function JoinServerDialog({ visible, onDismiss, onJoined }: JoinServerDialogProps) {
  const [code, setCode] = useState('');
  const joinMutation = useJoinViaCode();

  const errorMessage =
    joinMutation.error instanceof ApiClientError
      ? joinMutation.error.message
      : joinMutation.error
        ? 'Failed to join server'
        : '';

  const handleJoin = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    joinMutation.mutate(trimmed, {
      onSuccess: (response) => {
        onJoined(response.server._id);
      },
    });
  };

  const handleDismiss = () => {
    setCode('');
    joinMutation.reset();
    onDismiss();
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={handleDismiss}
        style={{ maxWidth: 400, alignSelf: 'center', width: '100%' }}
      >
        <Dialog.Title>Join Server</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Invite code"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            autoCorrect={false}
            mode="outlined"
            accessibilityLabel="Invite code"
          />
          {errorMessage ? (
            <HelperText type="error" visible accessibilityLiveRegion="polite">
              {errorMessage}
            </HelperText>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleDismiss} accessibilityLabel="Cancel">
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleJoin}
            disabled={!code.trim() || joinMutation.isPending}
            loading={joinMutation.isPending}
            accessibilityLabel="Join server"
          >
            Join
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
