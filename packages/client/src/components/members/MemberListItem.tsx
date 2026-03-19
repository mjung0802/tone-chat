import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { Chip, IconButton, List, Tooltip } from 'react-native-paper';
import { UserAvatar } from '../common/UserAvatar';
import { getAvailableActions, isMemberMuted, type Role } from '../../utils/roles';
import type { ServerMember } from '../../types/models';

type ActionCallback = ((member: ServerMember) => void) | undefined;

interface ActionButtonProps {
  visible: boolean | null | undefined;
  icon: string;
  label: string;
  onPress?: ActionCallback;
  member: ServerMember;
}

function ActionButton({ visible, icon, label, onPress, member }: ActionButtonProps) {
  if (!visible) return null;
  return (
    <Tooltip title={label}>
      <IconButton icon={icon} size={20} style={noMargin} onPress={() => onPress?.(member)} accessibilityLabel={label} />
    </Tooltip>
  );
}

function getBadgeLabel(role: string | undefined, isOwner: boolean | undefined): string {
  if (isOwner) return 'Owner';
  if (role === 'admin') return 'Admin';
  if (role === 'mod') return 'Mod';
  return '';
}

const noMargin = { margin: 0 } as const;
const rowCenter = { flexDirection: 'row', alignItems: 'center' } as const;

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
  const [hovered, setHovered] = useState(false);
  const showActions = Platform.OS !== 'web' || hovered;

  const name = member.nickname ?? displayName ?? member.userId;
  const badgeLabel = getBadgeLabel(member.role, isOwner);
  const isMuted = isMemberMuted(member.mutedUntil);

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
      <View style={rowCenter}>
        {isMuted ? <Chip compact style={{ marginRight: 4 }}>Muted</Chip> : null}
        <View style={{ ...rowCenter, opacity: showActions ? 1 : 0, pointerEvents: showActions ? 'auto' : 'none' }}>
          <ActionButton visible={actions?.canMute && !isMuted} icon="volume-off" label="Mute" onPress={onMute} member={member} />
          <ActionButton visible={actions?.canMute && isMuted} icon="volume-high" label="Unmute" onPress={onUnmute} member={member} />
          <ActionButton visible={actions?.canKick} icon="account-remove" label="Kick" onPress={onKick} member={member} />
          <ActionButton visible={actions?.canBan} icon="cancel" label="Ban" onPress={onBan} member={member} />
          <ActionButton visible={actions?.canPromote} icon="arrow-up-bold" label={`Promote to ${nextRole}`} onPress={onPromote} member={member} />
          <ActionButton visible={actions?.canDemote} icon="arrow-down-bold" label={`Demote to ${prevRole}`} onPress={onDemote} member={member} />
          <ActionButton visible={actions?.canTransferOwnership} icon="crown" label="Transfer Ownership" onPress={onTransferOwnership} member={member} />
        </View>
        {badgeLabel ? <Chip compact style={{ marginRight: 4 }}>{badgeLabel}</Chip> : null}
      </View>
    );
  }
  if (onPress) {
    const handler = onPress;
    optionalProps['onPress'] = () => handler(member);
  }

  const pointerProps = Platform.OS === 'web'
    ? { onPointerEnter: () => setHovered(true), onPointerLeave: () => setHovered(false) }
    : {};

  return (
    <View {...pointerProps}>
      <List.Item
        title={name}
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
    </View>
  );
}
