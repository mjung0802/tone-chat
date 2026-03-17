import React from 'react';
import { List, Chip } from 'react-native-paper';
import { UserAvatar } from '../common/UserAvatar';
import type { ServerMember } from '../../types/models';

interface MemberListItemProps {
  member: ServerMember;
  displayName?: string | undefined;
  isOwner?: boolean | undefined;
  onPress?: ((member: ServerMember) => void) | undefined;
}

export function MemberListItem({ member, displayName, isOwner, onPress }: MemberListItemProps) {
  const name = member.nickname ?? displayName ?? member.userId;
  const isAdmin = member.roles.includes('admin');
  const badgeLabel = isOwner ? 'Owner' : isAdmin ? 'Admin' : '';

  const optionalProps: Record<string, unknown> = {};
  if (badgeLabel) {
    optionalProps['right'] = () => <Chip compact>{badgeLabel}</Chip>;
  }
  if (onPress) {
    const handler = onPress;
    optionalProps['onPress'] = () => handler(member);
  }

  return (
    <List.Item
      title={name}
      description={badgeLabel}
      left={() => (
        <UserAvatar
          avatarAttachmentId={member.avatar_url}
          name={name}
          size={36}
        />
      )}
      {...optionalProps}
      accessibilityRole="text"
      accessibilityLabel={`${name}${badgeLabel ? `, ${badgeLabel.toLowerCase()}` : ''}`}
      style={{ minHeight: 48 }}
    />
  );
}
