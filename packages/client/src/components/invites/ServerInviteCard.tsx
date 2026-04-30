import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ApiClientError } from '../../api/client';
import { useJoinViaCode, useInviteStatus } from '../../hooks/useInvites';
import { useServers } from '../../hooks/useServers';
import type { InviteStatusResponse } from '../../types/api.types';

interface ServerInviteCardProps {
  serverName: string;
  serverId: string;
  code: string;
}

type DisabledReason =
  | 'already-member'
  | 'banned'
  | 'expired'
  | 'revoked'
  | 'exhausted'
  | 'not-found';

const DISABLED_COPY: Record<DisabledReason, string> = {
  'already-member': "You're already a member of this server.",
  'banned': 'You are banned from this server.',
  'expired': 'This invite has expired.',
  'revoked': 'This invite was revoked.',
  'exhausted': 'This invite has reached its maximum uses.',
  'not-found': 'This invite is no longer valid.',
};

const DISABLED_BUTTON_LABEL: Record<DisabledReason, string> = {
  'already-member': 'Already a member',
  'banned': 'Cannot join',
  'expired': 'Invite expired',
  'revoked': 'Invite revoked',
  'exhausted': 'Invite unavailable',
  'not-found': 'Invite unavailable',
};

function reasonFromStatus(status: InviteStatusResponse['status']): DisabledReason | null {
  if (status === 'expired' || status === 'revoked' || status === 'exhausted' || status === 'not-found') {
    return status;
  }
  return null;
}

function reasonFromErrorCode(code: string): DisabledReason | null {
  switch (code) {
    case 'INVITE_EXPIRED': return 'expired';
    case 'INVITE_REVOKED': return 'revoked';
    case 'INVITE_EXHAUSTED': return 'exhausted';
    case 'INVITE_NOT_FOUND': return 'not-found';
    case 'BANNED': return 'banned';
    case 'ALREADY_MEMBER': return 'already-member';
    default: return null;
  }
}

export function ServerInviteCard({ serverName, serverId, code }: ServerInviteCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const [clickReason, setClickReason] = useState<DisabledReason | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useInviteStatus(code);
  const { data: servers } = useServers();
  const { mutate: joinViaCode, isPending } = useJoinViaCode();

  const localMember = !!servers?.some((s) => s._id === serverId);

  let derivedReason: DisabledReason | null = clickReason;
  if (!derivedReason) {
    if (localMember) {
      derivedReason = 'already-member';
    } else if (status) {
      if (status.alreadyMember) {
        derivedReason = 'already-member';
      } else if (status.banned) {
        derivedReason = 'banned';
      } else {
        derivedReason = reasonFromStatus(status.status);
      }
    }
  }

  const displayName = serverName || status?.serverName || 'this server';
  const isLoading = statusLoading && !derivedReason;
  const isDisabled = isPending || isLoading || derivedReason !== null;

  let buttonLabel: string;
  if (isLoading) {
    buttonLabel = 'Checking invite…';
  } else if (derivedReason) {
    buttonLabel = DISABLED_BUTTON_LABEL[derivedReason];
  } else {
    buttonLabel = 'Join Server';
  }

  const handleJoin = () => {
    setGenericError(null);
    joinViaCode(code, {
      onSuccess: () => {
        router.push(`/(main)/servers/${serverId}` as Parameters<typeof router.push>[0]);
      },
      onError: (err) => {
        if (err instanceof ApiClientError) {
          const reason = reasonFromErrorCode(err.code);
          if (reason) {
            setClickReason(reason);
            return;
          }
        }
        setGenericError('Something went wrong. Please try again.');
      },
    });
  };

  const helperText = derivedReason ? DISABLED_COPY[derivedReason] : genericError;

  return (
    <Surface
      style={[styles.card, { borderColor: theme.colors.outline }]}
      elevation={1}
      accessibilityRole="none"
    >
      <View style={styles.content}>
        <Text variant="bodyMedium" style={styles.label}>
          You've been invited to join{' '}
          <Text variant="bodyMedium" style={styles.bold}>
            {displayName}
          </Text>
        </Text>
        <Button
          mode="contained"
          onPress={handleJoin}
          loading={isPending}
          disabled={isDisabled}
          style={styles.button}
          accessibilityLabel={
            derivedReason
              ? `${DISABLED_BUTTON_LABEL[derivedReason]} — ${displayName}`
              : `Join ${displayName}`
          }
        >
          {buttonLabel}
        </Button>
        {helperText !== null && helperText !== undefined ? (
          <Text
            variant="bodySmall"
            style={{ color: derivedReason ? theme.colors.onSurfaceVariant : theme.colors.error }}
            accessibilityRole="alert"
          >
            {helperText}
          </Text>
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
  bold: {
    fontWeight: 'bold',
  },
});
