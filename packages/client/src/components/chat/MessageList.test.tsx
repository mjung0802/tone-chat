import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { makeMessage } from '../../test-utils/fixtures';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { MessageList } from './MessageList';

jest.mock('./MessageBubble', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    MessageBubble: ({ message, onImagePress, isContinuation }: { message: { _id: string; content: string }; onImagePress?: unknown; isContinuation?: boolean }) => {
      return (<Text testID={`bubble-${message._id}`} accessibilityHint={isContinuation ? 'continuation' : 'first'} onPress={() => (onImagePress as (() => void) | undefined)?.()}>{message.content}</Text>);
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

  describe('message grouping (isContinuation)', () => {
    const T0 = '2025-01-01T00:00:00.000Z';
    const T1 = '2025-01-01T00:02:00.000Z'; // 2 min after T0 (within threshold)
    const T2 = '2025-01-01T00:10:00.000Z'; // 10 min after T0 (beyond threshold)

    it('marks second message as continuation when same author within 5 min', () => {
      // messages array is newest-first (after channel screen reverse)
      const messages = [
        makeMessage({ _id: 'msg-2', authorId: 'user-a', createdAt: T1 }),
        makeMessage({ _id: 'msg-1', authorId: 'user-a', createdAt: T0 }),
      ];

      const { getByTestId } = renderWithProviders(
        <MessageList messages={messages} currentUserId="user-123" />,
      );

      expect(getByTestId('bubble-msg-2').props.accessibilityHint).toBe('continuation');
      expect(getByTestId('bubble-msg-1').props.accessibilityHint).toBe('first');
    });

    it('does not mark as continuation when authors differ', () => {
      const messages = [
        makeMessage({ _id: 'msg-2', authorId: 'user-b', createdAt: T1 }),
        makeMessage({ _id: 'msg-1', authorId: 'user-a', createdAt: T0 }),
      ];

      const { getByTestId } = renderWithProviders(
        <MessageList messages={messages} currentUserId="user-123" />,
      );

      expect(getByTestId('bubble-msg-2').props.accessibilityHint).toBe('first');
      expect(getByTestId('bubble-msg-1').props.accessibilityHint).toBe('first');
    });

    it('does not mark as continuation when same author but gap > 5 min', () => {
      const messages = [
        makeMessage({ _id: 'msg-2', authorId: 'user-a', createdAt: T2 }),
        makeMessage({ _id: 'msg-1', authorId: 'user-a', createdAt: T0 }),
      ];

      const { getByTestId } = renderWithProviders(
        <MessageList messages={messages} currentUserId="user-123" />,
      );

      expect(getByTestId('bubble-msg-2').props.accessibilityHint).toBe('first');
      expect(getByTestId('bubble-msg-1').props.accessibilityHint).toBe('first');
    });

    it('first message in list is never a continuation', () => {
      const messages = [makeMessage({ _id: 'msg-1', authorId: 'user-a', createdAt: T0 })];

      const { getByTestId } = renderWithProviders(
        <MessageList messages={messages} currentUserId="user-123" />,
      );

      expect(getByTestId('bubble-msg-1').props.accessibilityHint).toBe('first');
    });
  });
});
