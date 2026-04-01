import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ApiClientError } from '../../api/client';
import { useJoinViaCode } from '../../hooks/useInvites';

interface ServerInviteCardProps {
  serverName: string;
  serverId: string;
  code: string;
}

export function ServerInviteCard({ serverName, serverId, code }: ServerInviteCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: joinViaCode, isPending } = useJoinViaCode();

  const handleJoin = () => {
    setErrorMessage(null);
    joinViaCode(code, {
      onSuccess: () => {
        router.push(`/(main)/servers/${serverId}` as Parameters<typeof router.push>[0]);
      },
      onError: (err) => {
        if (err instanceof ApiClientError && err.status === 409) {
          setAlreadyMember(true);
        } else if (err instanceof ApiClientError && err.status === 403) {
          setErrorMessage('You are banned from this server.');
        } else if (err instanceof ApiClientError && err.status === 404) {
          setErrorMessage('This invite is no longer valid.');
        } else {
          setErrorMessage('Something went wrong. Please try again.');
        }
      },
    });
  };

  return (
    <Surface
      style={[styles.card, { borderColor: theme.colors.outline }]}
      elevation={1}
      accessibilityRole="none"
    >
      <View style={styles.content}>
        <Text variant="bodyMedium" style={styles.label}>
          You've been invited to join{' '}
          <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
            {serverName}
          </Text>
        </Text>
        <Button
          mode="contained"
          onPress={handleJoin}
          loading={isPending}
          disabled={isPending || alreadyMember}
          style={styles.button}
          accessibilityLabel={alreadyMember ? `Already a member of ${serverName}` : `Join ${serverName}`}
        >
          {alreadyMember ? 'Already a member' : 'Join Server'}
        </Button>
        {errorMessage !== null ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>{errorMessage}</Text>
        ) : null}
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
