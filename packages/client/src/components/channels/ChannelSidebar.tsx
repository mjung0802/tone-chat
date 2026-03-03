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
  onCreateChannel?: (() => void) | undefined;
  canManage?: boolean | undefined;
  onGoHome?: (() => void) | undefined;
}

export function ChannelSidebar({
  serverName,
  channels,
  activeChannelId,
  onChannelPress,
  onCreateChannel,
  canManage,
  onGoHome,
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
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        {onGoHome ? (
          <IconButton
            icon="arrow-left"
            size={20}
            onPress={onGoHome}
            accessibilityLabel="Back to server list"
            accessibilityHint="Returns to the server selection screen"
          />
        ) : null}
        <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
          {serverName}
        </Text>
        {canManage && onCreateChannel ? (
          <IconButton
            icon="plus"
            size={20}
            onPress={onCreateChannel}
            accessibilityLabel="Create channel"
            accessibilityHint="Opens the create channel form"
          />
        ) : null}
      </View>
      <Divider style={{ backgroundColor: theme.colors.inverseSurface }} />
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
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
  },
  title: {
    flex: 1,
  },
});
