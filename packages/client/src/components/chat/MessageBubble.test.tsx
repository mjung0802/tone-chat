import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { makeMessage, makeReaction } from '../../test-utils/fixtures';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { MessageBubble } from './MessageBubble';

jest.mock('./AttachmentBubble', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    AttachmentBubble: ({ attachmentId }: { attachmentId: string }) => {
      return <Text testID={`attachment-${attachmentId}`}>AttachmentBubble</Text>;
    },
  };
});

jest.mock('./ReactionChips', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text, View } = require('react-native');
  return {
    ReactionChips: (props: { reactions: unknown[]; onToggle: (e: string) => void; onAddReaction: () => void }) => {
      return (
        <View testID="reaction-chips">
          <Text testID="reaction-count">{(props.reactions as unknown[]).length}</Text>
          <Pressable testID="mock-toggle" onPress={() => props.onToggle('👍')} />
          <Pressable testID="mock-add" onPress={props.onAddReaction} />
        </View>
      );
    },
  };
});

describe('MessageBubble', () => {
  it('renders message content', () => {
    const msg = makeMessage({ content: 'Test message' });
    const { getByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );

    expect(getByText('Test message')).toBeTruthy();
  });

  it('shows author name for other\'s messages', () => {
    const msg = makeMessage();
    const { getByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Bob" />,
    );

    expect(getByText('Bob')).toBeTruthy();
  });

  it('hides author name for own messages', () => {
    const msg = makeMessage();
    const { queryByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={true} authorName="Me" />,
    );

    expect(queryByText('Me')).toBeNull();
  });

  it('shows "(edited)" when editedAt is set', () => {
    const msg = makeMessage({ editedAt: '2025-01-01T01:00:00.000Z' });
    const { getByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );

    expect(getByText('(edited)')).toBeTruthy();
  });

  it('hides "(edited)" when editedAt is absent', () => {
    const msg = makeMessage();
    const { queryByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );

    expect(queryByText('(edited)')).toBeNull();
  });

  it('accessibility label includes content and author', () => {
    const msg = makeMessage({ content: 'Hi there' });
    const { getByLabelText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Carol" />,
    );

    // accessibilityLabel format: "{author} said: {content}. {time}{edited}"
    const element = getByLabelText(/Carol said: Hi there/);
    expect(element).toBeTruthy();
  });

  it('renders AttachmentBubble for each attachment ID', () => {
    const msg = makeMessage({ attachmentIds: ['att-1', 'att-2'] });
    const { getByTestId } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );

    expect(getByTestId('attachment-att-1')).toBeTruthy();
    expect(getByTestId('attachment-att-2')).toBeTruthy();
  });

  it('does not render AttachmentBubble when attachmentIds is empty', () => {
    const msg = makeMessage({ attachmentIds: [] });
    const { queryByTestId } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );

    expect(queryByTestId(/^attachment-/)).toBeNull();
  });

  it('accessibility label includes attachment count', () => {
    const msg = makeMessage({ content: 'Check this', attachmentIds: ['att-1', 'att-2'] });
    const { getByLabelText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Bob" />,
    );

    expect(getByLabelText(/2 attachments/)).toBeTruthy();
  });

  it('renders content even without text when attachments present', () => {
    const msg = makeMessage({ content: '', attachmentIds: ['att-1'] });
    const { getByTestId } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );

    expect(getByTestId('attachment-att-1')).toBeTruthy();
  });

  it('calls onLongPress when bubble is touched', () => {
    const msg = makeMessage({ content: 'Press me' });
    const onLongPress = jest.fn();
    const { getByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" onLongPress={onLongPress} />,
    );

    // The bubble uses onTouchEnd to trigger onLongPress
    const bubble = getByText('Press me');
    // Find the parent View with onTouchEnd — the bubble wrapper
    const bubbleView = bubble.parent!;
    fireEvent(bubbleView, 'onTouchEnd');

    expect(onLongPress).toHaveBeenCalledWith(msg);
  });

  it('renders ReactionChips when message has reactions', () => {
    const msg = makeMessage({
      reactions: [makeReaction({ emoji: '👍', userIds: ['u1'] })],
    });
    const { getByTestId } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" currentUserId="u1" />,
    );
    expect(getByTestId('reaction-chips')).toBeTruthy();
  });

  it('does not render ReactionChips when message has no reactions', () => {
    const msg = makeMessage();
    const { queryByTestId } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );
    expect(queryByTestId('reaction-chips')).toBeNull();
  });

  it('forwards onToggleReaction with messageId', () => {
    const msg = makeMessage({
      _id: 'msg-99',
      reactions: [makeReaction()],
    });
    const onToggleReaction = jest.fn();
    const { getByTestId } = renderWithProviders(
      <MessageBubble
        message={msg}
        isOwn={false}
        authorName="Alice"
        onToggleReaction={onToggleReaction}
      />,
    );
    fireEvent.press(getByTestId('mock-toggle'));
    expect(onToggleReaction).toHaveBeenCalledWith('msg-99', '👍');
  });

  it('forwards onAddReaction with messageId', () => {
    const msg = makeMessage({
      _id: 'msg-99',
      reactions: [makeReaction()],
    });
    const onAddReaction = jest.fn();
    const { getByTestId } = renderWithProviders(
      <MessageBubble
        message={msg}
        isOwn={false}
        authorName="Alice"
        onAddReaction={onAddReaction}
      />,
    );
    fireEvent.press(getByTestId('mock-add'));
    expect(onAddReaction).toHaveBeenCalledWith('msg-99');
  });
});
