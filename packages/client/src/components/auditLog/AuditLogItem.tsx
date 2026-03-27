import React from 'react';
import { List, Text, useTheme } from 'react-native-paper';
import type { AuditLogEntry, AuditAction } from '@/types/models';

const ACTION_CONFIG: Record<AuditAction, { icon: string; verb: string }> = {
  mute: { icon: 'volume-off', verb: 'muted' },
  unmute: { icon: 'volume-high', verb: 'unmuted' },
  kick: { icon: 'exit-to-app', verb: 'kicked' },
  ban: { icon: 'shield-alert', verb: 'banned' },
  unban: { icon: 'shield-check', verb: 'unbanned' },
  promote: { icon: 'arrow-up-bold', verb: 'promoted' },
  demote: { icon: 'arrow-down-bold', verb: 'demoted' },
};

function formatDuration(minutes: number): string {
  if (minutes === 60) return '1 hour';
  if (minutes === 1440) return '1 day';
  if (minutes === 10080) return '1 week';
  return `${minutes} minutes`;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function getDisplayName(entry: AuditLogEntry, type: 'actor' | 'target'): string {
  if (type === 'actor') {
    return entry.actorDisplayName ?? entry.actorUsername ?? entry.actorId;
  }
  return entry.targetDisplayName ?? entry.targetUsername ?? entry.targetId;
}

function getDescription(entry: AuditLogEntry): string {
  const time = formatRelativeTime(entry.createdAt);
  const parts: string[] = [time];

  if (entry.action === 'mute' && entry.metadata.duration) {
    parts.push(`Duration: ${formatDuration(entry.metadata.duration as number)}`);
  }
  if (entry.action === 'ban' && entry.metadata.reason) {
    parts.push(`Reason: ${entry.metadata.reason as string}`);
  }
  if ((entry.action === 'promote' || entry.action === 'demote') && entry.metadata.fromRole) {
    parts.push(`${entry.metadata.fromRole as string} → ${entry.metadata.toRole as string}`);
  }

  return parts.join(' · ');
}

interface Props {
  entry: AuditLogEntry;
}

export function AuditLogItem({ entry }: Props) {
  const theme = useTheme();
  const config = ACTION_CONFIG[entry.action];
  const actor = getDisplayName(entry, 'actor');
  const target = getDisplayName(entry, 'target');

  return (
    <List.Item
      title={() => (
        <Text variant="bodyMedium">
          <Text style={{ fontWeight: '600' }}>{actor}</Text>
          {' '}{config.verb}{' '}
          <Text style={{ fontWeight: '600' }}>{target}</Text>
        </Text>
      )}
      description={getDescription(entry)}
      left={(props) => (
        <List.Icon
          {...props}
          icon={config.icon}
          color={theme.colors.onSurfaceVariant}
        />
      )}
      accessibilityRole="text"
      accessibilityLabel={`${actor} ${config.verb} ${target}`}
    />
  );
}
