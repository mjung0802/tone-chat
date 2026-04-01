import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Portal, Dialog, Button, Text, ActivityIndicator, IconButton, useTheme } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useDefaultInvite } from '../../hooks/useInvites';
import { useFriends } from '../../hooks/useFriends';
import { useMembers } from '../../hooks/useMembers';
import { getOrCreateConversation, sendDmMessage } from '../../api/dms.api';

interface InviteModalProps {
  visible: boolean;
  onDismiss: () => void;
  serverId: string;
  serverName: string;
}

export function InviteModal({ visible, onDismiss, serverId, serverName }: InviteModalProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());
  const [sendingSet, setSendingSet] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: invite, isLoading: inviteLoading } = useDefaultInvite(serverId);
  const { data: friends, isLoading: friendsLoading } = useFriends();
  const { data: members, isLoading: membersLoading } = useMembers(serverId);

  const isLoadingFriends = friendsLoading || membersLoading;
  const eligibleFriends = (!friends || !members) ? [] : friends.filter(
    (f) => !members.some((m) => m.userId === f.userId),
  );

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setSentSet(new Set());
      setSendingSet(new Set());
      setCopied(false);
      setErrorMessage(null);
    }
  }, [visible]);

  // Cleanup copy timer on unmount
  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!invite) return;
    await Clipboard.setStringAsync(invite.code);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopied(true);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async (friendUserId: string) => {
    if (!invite) return;
    setSendingSet((prev) => new Set(prev).add(friendUserId));
    try {
      const result = await getOrCreateConversation(friendUserId);
      await sendDmMessage(result.conversation._id, {
        serverInvite: { code: invite.code, serverId, serverName },
      });
      setSentSet((prev) => new Set(prev).add(friendUserId));
    } catch {
      setErrorMessage('Failed to send invite. Please try again.');
    } finally {
      setSendingSet((prev) => {
        const next = new Set(prev);
        next.delete(friendUserId);
        return next;
      });
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Invite to {serverName}</Dialog.Title>
        <Dialog.Content>
          {inviteLoading ? (
            <ActivityIndicator accessibilityLabel="Loading invite code" />
          ) : invite ? (
            <View style={styles.codeRow}>
              <Text variant="bodyMedium" style={styles.code} accessibilityLabel={`Invite code: ${invite.code}`}>
                {invite.code}
              </Text>
              <IconButton
                icon={copied ? 'check' : 'content-copy'}
                size={20}
                onPress={() => { void handleCopy(); }}
                accessibilityLabel={copied ? 'Copied' : 'Copy invite code'}
              />
              {copied ? (
                <Text variant="bodySmall" style={styles.copiedText}>Copied!</Text>
              ) : null}
            </View>
          ) : (
            <Text variant="bodyMedium">Unable to load invite code.</Text>
          )}

          <Text variant="titleSmall" style={styles.sectionTitle}>Invite Friends</Text>

          {isLoadingFriends ? (
            <ActivityIndicator accessibilityLabel="Loading friends" />
          ) : eligibleFriends.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>No friends to invite</Text>
          ) : (
            <ScrollView style={styles.friendList} contentContainerStyle={styles.friendListContent}>
              {eligibleFriends.map((friend) => {
                const isSent = sentSet.has(friend.userId);
                const isSending = sendingSet.has(friend.userId);
                const displayName = friend.display_name ?? friend.username;
                return (
                  <View key={friend.userId} style={styles.friendRow}>
                    <Text variant="bodyMedium" style={styles.friendName}>{displayName}</Text>
                    <Button
                      mode="contained-tonal"
                      compact
                      disabled={isSending || isSent || !invite}
                      loading={isSending}
                      onPress={() => { void handleSend(friend.userId); }}
                      accessibilityLabel={isSent ? `Invite sent to ${displayName}` : `Send invite to ${displayName}`}
                    >
                      {isSent ? 'Sent ✓' : 'Send'}
                    </Button>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {errorMessage !== null ? (
            <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.error }}>{errorMessage}</Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} accessibilityLabel="Close invite modal">Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  code: {
    fontFamily: 'monospace',
    flex: 1,
  },
  copiedText: {
    marginLeft: 4,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    opacity: 0.6,
  },
  friendList: {
    maxHeight: 240,
  },
  friendListContent: {
    gap: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendName: {
    flex: 1,
    marginRight: 8,
  },
});
