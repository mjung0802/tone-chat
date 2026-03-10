import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { MessageList } from './MessageList';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makeMessage } from '../../test-utils/fixtures';

jest.mock('./MessageBubble', () => ({
  MessageBubble: ({ message, onImagePress }: { message: { _id: string; content: string }; onImagePress?: unknown }) => {
    const { Text } = require('react-native');
    return (
      <Text testID={`bubble-${message._id}`} onPress={() => (onImagePress as (() => void) | undefined)?.()}>
        {message.content}
      </Text>
    );
  },
}));

jest.mock('../common/LoadingSpinner', () => ({
  LoadingSpinner: () => {
    const { ActivityIndicator } = require('react-native-paper');
    return <ActivityIndicator testID="loading-spinner" />;
  },
}));

describe('MessageList', () => {
  it('renders a MessageBubble for each message', () => {
    const messages = [
      makeMessage({ _id: 'msg-1', content: 'Hello' }),
      makeMessage({ _id: 'msg-2', content: 'World' }),
    ];

    const { getByTestId } = renderWithProviders(
      <MessageList messages={messages} currentUserId="user-123" />,
    );

    expect(getByTestId('bubble-msg-1')).toBeTruthy();
    expect(getByTestId('bubble-msg-2')).toBeTruthy();
  });

  it('passes onImagePress through to MessageBubble', () => {
    const messages = [makeMessage({ _id: 'msg-1' })];
    const onImagePress = jest.fn();

    const { getByTestId } = renderWithProviders(
      <MessageList
        messages={messages}
        currentUserId="user-123"
        onImagePress={onImagePress}
      />,
    );

    fireEvent.press(getByTestId('bubble-msg-1'));
    expect(onImagePress).toHaveBeenCalled();
  });

  it('shows empty state when messages is empty', () => {
    const { getByText } = renderWithProviders(
      <MessageList messages={[]} currentUserId="user-123" />,
    );

    expect(getByText('No messages yet')).toBeTruthy();
  });

  it('calls onLoadMore when scrolled to end', () => {
    const messages = [makeMessage({ _id: 'msg-1' })];
    const onLoadMore = jest.fn();

    const { getByLabelText } = renderWithProviders(
      <MessageList
        messages={messages}
        currentUserId="user-123"
        onLoadMore={onLoadMore}
      />,
    );

    const list = getByLabelText('Messages');
    fireEvent(list, 'onEndReached');

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('shows loading spinner when isLoadingMore is true', () => {
    const messages = [makeMessage({ _id: 'msg-1' })];

    const { getByTestId } = renderWithProviders(
      <MessageList
        messages={messages}
        currentUserId="user-123"
        isLoadingMore={true}
      />,
    );

    expect(getByTestId('loading-spinner')).toBeTruthy();
  });
});
