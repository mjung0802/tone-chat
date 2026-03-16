import React from 'react';
import { List, Chip } from 'react-native-paper';
import { UserAvatar } from '../common/UserAvatar';
import type { ServerMember } from '../../types/models';

interface MemberListItemProps {
  member: ServerMember;
  displayName?: string | undefined;
  onPress?: ((member: ServerMember) => void) | undefined;
}

export function MemberListItem({ member, displayName, onPress }: MemberListItemProps) {
  const name = member.nickname ?? displayName ?? member.userId;
  const isAdmin = member.roles.includes('admin');

  const optionalProps: Record<string, unknown> = {};
  if (isAdmin) {
    optionalProps['right'] = () => <Chip compact>Admin</Chip>;
  }
  if (onPress) {
    const handler = onPress;
    optionalProps['onPress'] = () => handler(member);
  }

  return (
    <List.Item
      title={name}
      description={isAdmin ? 'Admin' : ''}
      left={() => (
        <UserAvatar
          avatarAttachmentId={member.avatar_url}
          name={name}
          size={36}
        />
      )}
      {...optionalProps}
      accessibilityRole="text"
      accessibilityLabel={`${name}${isAdmin ? ', admin' : ''}`}
      style={{ minHeight: 48 }}
    />
  );
}
