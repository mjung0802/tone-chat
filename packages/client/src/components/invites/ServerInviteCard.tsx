import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { joinViaCode } from '../../api/invites.api';
import { ApiClientError } from '../../api/client';

interface ServerInviteCardProps {
  serverName: string;
  serverId: string;
  code: string;
}

export function ServerInviteCard({ serverName, serverId, code }: ServerInviteCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  const handleJoin = async () => {
    setIsPending(true);
    try {
      await joinViaCode(code);
      router.push(`/(main)/servers/${serverId}` as Parameters<typeof router.push>[0]);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setAlreadyMember(true);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Surface
      style={[styles.card, { borderColor: theme.colors.outline }]}
      elevation={1}
      accessibilityRole="none"
    >
      <View style={styles.content}>
        <Text variant="bodyMedium" style={styles.label}>
          You&apos;ve been invited to join{' '}
          <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
            {serverName}
          </Text>
        </Text>
        <Button
          mode="contained"
          onPress={() => { void handleJoin(); }}
          loading={isPending}
          disabled={isPending || alreadyMember}
          style={styles.button}
          accessibilityLabel={alreadyMember ? `Already a member of ${serverName}` : `Join ${serverName}`}
        >
          {alreadyMember ? 'Already a member' : 'Join Server'}
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginVertical: 4,
  },
  content: {
    gap: 10,
  },
  label: {
    flexShrink: 1,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
