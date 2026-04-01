import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Portal, Dialog, Button, Text, ActivityIndicator, IconButton } from 'react-native-paper';
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
  const [copied, setCopied] = useState(false);
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());

  const { data: invite, isLoading: inviteLoading } = useDefaultInvite(serverId);
  const { data: friends } = useFriends();
  const { data: members } = useMembers(serverId);

  const eligibleFriends = (friends ?? []).filter(
    (f) => !(members ?? []).some((m) => m.userId === f.userId),
  );

  const handleCopy = async () => {
    if (!invite) return;
    await Clipboard.setStringAsync(invite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async (friendUserId: string) => {
    if (!invite) return;
    const result = await getOrCreateConversation(friendUserId);
    await sendDmMessage(result.conversation._id, {
      serverInvite: { code: invite.code, serverId, serverName },
    });
    setSentSet((prev) => new Set(prev).add(friendUserId));
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

          {eligibleFriends.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>No friends to invite</Text>
          ) : (
            <ScrollView style={styles.friendList} contentContainerStyle={styles.friendListContent}>
              {eligibleFriends.map((friend) => {
                const isSent = sentSet.has(friend.userId);
                const displayName = friend.display_name ?? friend.username;
                return (
                  <View key={friend.userId} style={styles.friendRow}>
                    <Text variant="bodyMedium" style={styles.friendName}>{displayName}</Text>
                    <Button
                      mode="contained-tonal"
                      compact
                      disabled={isSent || !invite}
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
