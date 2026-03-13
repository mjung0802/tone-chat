import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { makeMessage } from '../../test-utils/fixtures';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { MessageList } from './MessageList';

jest.mock('./MessageBubble', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    MessageBubble: ({ message, onImagePress }: { message: { _id: string; content: string }; onImagePress?: unknown }) => {
      return (
        <Text testID={`bubble-${message._id}`} onPress={() => (onImagePress as (() => void) | undefined)?.()}>
          {message.content}
        </Text>
      );
    },
  };
});

jest.mock('../common/LoadingSpinner', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ActivityIndicator } = require('react-native-paper');
  return {
    LoadingSpinner: () => {
      return <ActivityIndicator testID="loading-spinner" />;
    },
  };
});

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
