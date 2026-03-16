import React from "react";
import { FlatList, type ListRenderItemInfo } from "react-native";
import { MemberListItem } from "./MemberListItem";
import { EmptyState } from "../common/EmptyState";
import type { ServerMember } from "../../types/models";

interface MemberListProps {
  members: ServerMember[];
  displayNames?: Record<string, string> | undefined;
  onMemberPress?: ((member: ServerMember) => void) | undefined;
}

export function MemberList({
  members,
  displayNames,
  onMemberPress,
}: MemberListProps) {
  const renderItem = ({ item }: ListRenderItemInfo<ServerMember>) => (
    <MemberListItem
      member={item}
      displayName={displayNames?.[item.userId]}
      onPress={onMemberPress}
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
