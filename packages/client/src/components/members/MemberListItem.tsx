import React from 'react';
import { View } from 'react-native';
import { Chip, IconButton, List, Tooltip } from 'react-native-paper';
import { UserAvatar } from '../common/UserAvatar';
import { getAvailableActions, type Role } from '../../utils/roles';
import type { ServerMember } from '../../types/models';

type ActionCallback = ((member: ServerMember) => void) | undefined;

interface MemberListItemProps {
  member: ServerMember;
  displayName?: string | undefined;
  isOwner?: boolean | undefined;
  onPress?: ((member: ServerMember) => void) | undefined;
  actorRole?: Role | undefined;
  actorIsOwner?: boolean | undefined;
  onMute?: ActionCallback;
  onUnmute?: ActionCallback;
  onKick?: ActionCallback;
  onBan?: ActionCallback;
  onPromote?: ActionCallback;
  onDemote?: ActionCallback;
  onTransferOwnership?: ActionCallback;
}

export function MemberListItem({
  member,
  displayName,
  isOwner,
  onPress,
  actorRole,
  actorIsOwner,
  onMute,
  onUnmute,
  onKick,
  onBan,
  onPromote,
  onDemote,
  onTransferOwnership,
}: MemberListItemProps) {
  const name = member.nickname ?? displayName ?? member.userId;
  const badgeLabel = isOwner ? 'Owner' : member.role === 'admin' ? 'Admin' : member.role === 'mod' ? 'Mod' : '';
  const isMuted = member.mutedUntil ? new Date(member.mutedUntil) > new Date() : false;

  const targetRole = (member.role ?? 'member') as Role;
  const targetIsOwner = isOwner ?? false;
  const actions = actorRole
    ? getAvailableActions(actorRole, actorIsOwner ?? false, targetRole, targetIsOwner)
    : null;

  const hasActions = actions && (
    actions.canMute || actions.canKick || actions.canBan ||
    actions.canPromote || actions.canDemote || actions.canTransferOwnership
  );

  const nextRole = targetRole === 'member' ? 'Mod' : 'Admin';
  const prevRole = targetRole === 'admin' ? 'Mod' : 'Member';

  const optionalProps: Record<string, unknown> = {};
  if (badgeLabel || isMuted || hasActions) {
    optionalProps['right'] = () => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {isMuted ? <Chip compact style={{ marginRight: 4 }}>Muted</Chip> : null}
        {badgeLabel ? <Chip compact style={{ marginRight: 4 }}>{badgeLabel}</Chip> : null}
        {hasActions && actions.canMute && !isMuted ? (
          <Tooltip title="Mute">
            <IconButton icon="volume-off" size={20} onPress={() => onMute?.(member)} accessibilityLabel="Mute" />
          </Tooltip>
        ) : null}
        {hasActions && actions.canMute && isMuted ? (
          <Tooltip title="Unmute">
            <IconButton icon="volume-high" size={20} onPress={() => onUnmute?.(member)} accessibilityLabel="Unmute" />
          </Tooltip>
        ) : null}
        {hasActions && actions.canKick ? (
          <Tooltip title="Kick">
            <IconButton icon="account-remove" size={20} onPress={() => onKick?.(member)} accessibilityLabel="Kick" />
          </Tooltip>
        ) : null}
        {hasActions && actions.canBan ? (
          <Tooltip title="Ban">
            <IconButton icon="cancel" size={20} onPress={() => onBan?.(member)} accessibilityLabel="Ban" />
          </Tooltip>
        ) : null}
        {hasActions && actions.canPromote ? (
          <Tooltip title={`Promote to ${nextRole}`}>
            <IconButton icon="arrow-up-bold" size={20} onPress={() => onPromote?.(member)} accessibilityLabel={`Promote to ${nextRole}`} />
          </Tooltip>
        ) : null}
        {hasActions && actions.canDemote ? (
          <Tooltip title={`Demote to ${prevRole}`}>
            <IconButton icon="arrow-down-bold" size={20} onPress={() => onDemote?.(member)} accessibilityLabel={`Demote to ${prevRole}`} />
          </Tooltip>
        ) : null}
        {hasActions && actions.canTransferOwnership ? (
          <Tooltip title="Transfer Ownership">
            <IconButton icon="crown" size={20} onPress={() => onTransferOwnership?.(member)} accessibilityLabel="Transfer Ownership" />
          </Tooltip>
        ) : null}
      </View>
    );
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
      accessibilityLabel={`${name}${badgeLabel ? `, ${badgeLabel.toLowerCase()}` : ''}${isMuted ? ', muted' : ''}`}
      style={{ minHeight: 48 }}
    />
  );
}
