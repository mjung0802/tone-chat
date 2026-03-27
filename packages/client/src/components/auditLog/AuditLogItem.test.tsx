import React from 'react';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { AuditLogItem } from './AuditLogItem';
import type { AuditLogEntry } from '@/types/models';

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    _id: 'entry-1',
    serverId: 's1',
    action: 'kick',
    actorId: 'actor-1',
    targetId: 'target-1',
    metadata: {},
    createdAt: new Date().toISOString(),
    actorUsername: 'Alice',
    targetUsername: 'Bob',
    ...overrides,
  };
}

describe('AuditLogItem', () => {
  it('renders kick action', () => {
    const { getByText } = renderWithProviders(
      <AuditLogItem entry={makeEntry({ action: 'kick' })} />,
    );
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText(/kicked/)).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });

  it('renders ban action with reason', () => {
    const { getByText } = renderWithProviders(
      <AuditLogItem entry={makeEntry({ action: 'ban', metadata: { reason: 'spam' } })} />,
    );
    expect(getByText(/banned/)).toBeTruthy();
    expect(getByText(/Reason: spam/)).toBeTruthy();
  });

  it('renders mute action with duration', () => {
    const { getByText } = renderWithProviders(
      <AuditLogItem entry={makeEntry({ action: 'mute', metadata: { duration: 60 } })} />,
    );
    expect(getByText(/muted/)).toBeTruthy();
    expect(getByText(/Duration: 1 hour/)).toBeTruthy();
  });

  it('renders promote action with role change', () => {
    const { getByText } = renderWithProviders(
      <AuditLogItem entry={makeEntry({ action: 'promote', metadata: { fromRole: 'member', toRole: 'mod' } })} />,
    );
    expect(getByText(/promoted/)).toBeTruthy();
    expect(getByText(/member → mod/)).toBeTruthy();
  });

  it('renders demote action with role change', () => {
    const { getByText } = renderWithProviders(
      <AuditLogItem entry={makeEntry({ action: 'demote', metadata: { fromRole: 'admin', toRole: 'mod' } })} />,
    );
    expect(getByText(/demoted/)).toBeTruthy();
    expect(getByText(/admin → mod/)).toBeTruthy();
  });

  it('renders unban action', () => {
    const { getByText } = renderWithProviders(
      <AuditLogItem entry={makeEntry({ action: 'unban' })} />,
    );
    expect(getByText(/unbanned/)).toBeTruthy();
  });

  it('renders unmute action', () => {
    const { getByText } = renderWithProviders(
      <AuditLogItem entry={makeEntry({ action: 'unmute' })} />,
    );
    expect(getByText(/unmuted/)).toBeTruthy();
  });

  it('falls back to user IDs when usernames are absent', () => {
    const { getByText } = renderWithProviders(
      <AuditLogItem
        entry={makeEntry({
          actorUsername: undefined,
          targetUsername: undefined,
          actorDisplayName: undefined,
          targetDisplayName: undefined,
        })}
      />,
    );
    expect(getByText('actor-1')).toBeTruthy();
    expect(getByText('target-1')).toBeTruthy();
  });

  it('prefers display name over username', () => {
    const { getByText } = renderWithProviders(
      <AuditLogItem
        entry={makeEntry({
          actorDisplayName: 'Alice Display',
          targetDisplayName: 'Bob Display',
        })}
      />,
    );
    expect(getByText('Alice Display')).toBeTruthy();
    expect(getByText('Bob Display')).toBeTruthy();
  });
});
