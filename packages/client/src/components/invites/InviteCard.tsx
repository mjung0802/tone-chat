import React from 'react';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import type { Invite } from '../../types/models';

interface InviteCardProps {
  invite: Invite;
  onRevoke?: ((invite: Invite) => void) | null | undefined;
}

export function InviteCard({ invite, onRevoke }: InviteCardProps) {
  const theme = useTheme();
  const isExpired = invite.expiresAt ? new Date(invite.expiresAt) < new Date() : false;
  const isExhausted = invite.maxUses != null && invite.uses >= invite.maxUses;

  return (
    <Card style={{ marginVertical: 4 }} accessibilityRole="text">
      <Card.Content>
        <Text variant="titleMedium" style={{ fontFamily: 'monospace' }}>
          {invite.code}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Uses: {invite.uses}{invite.maxUses != null ? ` / ${invite.maxUses}` : ''}
          {isExpired ? ' (expired)' : ''}
          {isExhausted ? ' (exhausted)' : ''}
        </Text>
      </Card.Content>
      {onRevoke ? (
        <Card.Actions>
          <Button
            onPress={() => onRevoke(invite)}
            textColor={theme.colors.error}
            accessibilityLabel={`Revoke invite ${invite.code}`}
            accessibilityHint="Permanently disables this invite code"
          >
            Revoke
          </Button>
        </Card.Actions>
      ) : null}
    </Card>
  );
}
