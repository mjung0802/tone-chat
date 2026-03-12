import React from 'react';
import { List } from 'react-native-paper';
import type { Channel } from '../../types/models';

interface ChannelListItemProps {
  channel: Channel;
  isActive?: boolean | undefined;
  onPress: (channel: Channel) => void;
}

export function ChannelListItem({ channel, isActive, onPress }: ChannelListItemProps) {
  const icon = channel.type === 'voice' ? 'volume-high' : 'pound';

  return (
    <List.Item
      title={channel.name}
      description={channel.topic}
      left={(props) => <List.Icon {...props} icon={icon} />}
      onPress={() => onPress(channel)}
      accessibilityRole="button"
      accessibilityLabel={`${channel.type} channel ${channel.name}${channel.topic ? `, ${channel.topic}` : ''}`}
      accessibilityHint="Opens this channel"
      accessibilityState={{ selected: isActive }}
      style={[
        { minHeight: 44 },
        isActive ? { backgroundColor: 'rgba(0,0,0,0.08)' } : null,
      ]}
    />
  );
}
