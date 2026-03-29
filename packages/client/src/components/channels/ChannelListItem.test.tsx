import React from 'react';
import { ChannelListItem } from './ChannelListItem';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import type { Channel } from '@/types/models';

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    _id: 'ch-1',
    serverId: 'server-1',
    name: 'general',
    type: 'text',
    position: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ChannelListItem', () => {
  it('renders the channel name', () => {
    const channel = makeChannel({ name: 'announcements' });
    const { getByText } = renderWithProviders(
      <ChannelListItem channel={channel} onPress={jest.fn()} />,
    );

    expect(getByText('announcements')).toBeTruthy();
  });

  it('sets accessibilityState.selected to true when active', () => {
    const channel = makeChannel();
    const { getByRole } = renderWithProviders(
      <ChannelListItem channel={channel} isActive={true} onPress={jest.fn()} />,
    );

    const item = getByRole('button');
    expect(item.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it('sets accessibilityState.selected to false/undefined when inactive', () => {
    const channel = makeChannel();
    const { getByRole } = renderWithProviders(
      <ChannelListItem channel={channel} isActive={false} onPress={jest.fn()} />,
    );

    const item = getByRole('button');
    expect(item.props.accessibilityState?.selected).toBeFalsy();
  });

  it('calls onPress with the channel when pressed', () => {
    const channel = makeChannel();
    const onPress = jest.fn();
    const { getByRole } = renderWithProviders(
      <ChannelListItem channel={channel} onPress={onPress} />,
    );

    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(getByRole('button'));

    expect(onPress).toHaveBeenCalledWith(channel);
  });
});
