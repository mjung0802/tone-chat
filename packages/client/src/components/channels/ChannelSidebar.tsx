import React from 'react';
import { View, FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { Divider, Text, IconButton, useTheme } from 'react-native-paper';
import { ChannelListItem } from './ChannelListItem';
import type { Channel } from '../../types/models';

interface ChannelSidebarProps {
  serverName: string;
  channels: Channel[];
  activeChannelId?: string | undefined;
  onChannelPress: (channel: Channel) => void;
  onInvite?: (() => void) | undefined;
  canInvite?: boolean | undefined;
}

export function ChannelSidebar({
  serverName,
  channels,
  activeChannelId,
  onChannelPress,
  onInvite,
  canInvite,
}: ChannelSidebarProps) {
  const theme = useTheme();

  const renderItem = ({ item }: ListRenderItemInfo<Channel>) => (
    <ChannelListItem
      channel={item}
      isActive={item._id === activeChannelId}
      onPress={onChannelPress}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.outlineVariant }]}>
      <View style={styles.header}>
        <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
          {serverName}
        </Text>
        {canInvite && onInvite ? (
          <IconButton
            icon="account-plus"
            size={20}
            onPress={onInvite}
            accessibilityLabel="Invite people"
            accessibilityHint="Opens the invite modal"
          />
        ) : null}
      </View>
      <Divider style={{ backgroundColor: theme.colors.outlineVariant, marginBottom: 8 }} />
      <FlatList
        data={channels}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        accessibilityRole="list"
        accessibilityLabel="Channels"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    paddingHorizontal: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    minHeight: 63,
  },
  title: {
    flex: 1,
    paddingHorizontal: 12,
  },
});
