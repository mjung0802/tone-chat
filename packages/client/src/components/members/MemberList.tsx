import React from 'react';
import { FlatList, type ListRenderItemInfo } from 'react-native';
import { MemberListItem } from './MemberListItem';
import { EmptyState } from '../common/EmptyState';
import type { Role } from '../../utils/roles';
import type { ServerMember } from '../../types/models';

type ActionCallback = ((member: ServerMember) => void) | undefined;

interface MemberListProps {
  members: ServerMember[];
  displayNames?: Record<string, string> | undefined;
  ownerId?: string | undefined;
  onMemberPress?: ((member: ServerMember) => void) | undefined;
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

export function MemberList({
  members,
  displayNames,
  ownerId,
  onMemberPress,
  actorRole,
  actorIsOwner,
  onMute,
  onUnmute,
  onKick,
  onBan,
  onPromote,
  onDemote,
  onTransferOwnership,
}: MemberListProps) {
  const renderItem = ({ item }: ListRenderItemInfo<ServerMember>) => (
    <MemberListItem
      member={item}
      displayName={displayNames?.[item.userId]}
      isOwner={item.userId === ownerId}
      onPress={onMemberPress}
      actorRole={actorRole}
      actorIsOwner={actorIsOwner}
      onMute={onMute}
      onUnmute={onUnmute}
      onKick={onKick}
      onBan={onBan}
      onPromote={onPromote}
      onDemote={onDemote}
      onTransferOwnership={onTransferOwnership}
    />
  );

  if (members.length === 0) {
    return <EmptyState icon="account-group-outline" title="No members" />;
  }

  return (
    <FlatList
      data={members}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      accessibilityRole="list"
      accessibilityLabel="Members"
    />
  );
}
