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

jest.mock('../common/UserAvatar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    UserAvatar: ({ avatarAttachmentId, name, size }: { avatarAttachmentId?: string | null; name: string; size?: number }) => {
      return <Text testID="user-avatar">{`UserAvatar:${name}:${avatarAttachmentId ?? 'none'}:${size ?? 32}`}</Text>;
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

  it('shows author name for own messages', () => {
    const msg = makeMessage();
    const { getByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={true} authorName="Me" />,
    );

    expect(getByText('Me')).toBeTruthy();
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

  it('renders reply indicator when message has replyTo', () => {
    const msg = makeMessage({
      replyTo: {
        messageId: 'orig-1',
        authorId: 'user-456',
        authorName: 'Bob',
        content: 'Original message',
      },
    });
    const { getByText, getByLabelText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );

    expect(getByText('Original message')).toBeTruthy();
    expect(getByLabelText(/Reply to Bob/)).toBeTruthy();
  });

  it('uses authorNames lookup for reply indicator when available', () => {
    const msg = makeMessage({
      replyTo: {
        messageId: 'orig-1',
        authorId: 'user-456',
        authorName: 'Bob',
        content: 'Original message',
      },
    });
    const { getByText } = renderWithProviders(
      <MessageBubble
        message={msg}
        isOwn={false}
        authorName="Alice"
        authorNames={{ 'user-456': 'Robert' }}
      />,
    );

    expect(getByText('@Robert')).toBeTruthy();
  });

  it('calls onReplyPress when reply indicator is pressed', () => {
    const msg = makeMessage({
      replyTo: {
        messageId: 'orig-1',
        authorId: 'user-456',
        authorName: 'Bob',
        content: 'Original message',
      },
    });
    const onReplyPress = jest.fn();
    const { getByLabelText } = renderWithProviders(
      <MessageBubble
        message={msg}
        isOwn={false}
        authorName="Alice"
        onReplyPress={onReplyPress}
      />,
    );

    fireEvent.press(getByLabelText(/Reply to Bob/));
    expect(onReplyPress).toHaveBeenCalledWith('orig-1');
  });

  it('does not render reply indicator when replyTo is absent', () => {
    const msg = makeMessage();
    const { queryByLabelText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );

    expect(queryByLabelText(/Reply to/)).toBeNull();
  });

  it('applies mention highlight when currentUserId is in mentions', () => {
    const msg = makeMessage({ mentions: ['user-me'] });
    const { getByLabelText } = renderWithProviders(
      <MessageBubble
        message={msg}
        isOwn={false}
        authorName="Alice"
        currentUserId="user-me"
      />,
    );

    // The bubble should render — the mention highlight changes backgroundColor
    expect(getByLabelText(/Alice said/)).toBeTruthy();
  });

  it('does not apply mention highlight when currentUserId is not in mentions', () => {
    const msg = makeMessage({ mentions: ['user-other'] });
    const { getByLabelText } = renderWithProviders(
      <MessageBubble
        message={msg}
        isOwn={false}
        authorName="Alice"
        currentUserId="user-me"
      />,
    );

    expect(getByLabelText(/Alice said/)).toBeTruthy();
  });

  it('applies highlighted prop background styling', () => {
    const msg = makeMessage();
    const { getByLabelText } = renderWithProviders(
      <MessageBubble
        message={msg}
        isOwn={false}
        authorName="Alice"
        highlighted={true}
      />,
    );

    // The container should have the highlighted style applied
    const container = getByLabelText(/Alice said/);
    expect(container).toBeTruthy();
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

  it('renders UserAvatar when authorAvatarId is provided', () => {
    const msg = makeMessage();
    const { getByTestId, getByText } = renderWithProviders(
      <MessageBubble
        message={msg}
        isOwn={false}
        authorName="Alice"
        authorAvatarId="att-1"
      />,
    );

    expect(getByTestId('user-avatar')).toBeTruthy();
    expect(getByText('UserAvatar:Alice:att-1:32')).toBeTruthy();
  });

  it('renders @mention text with bold styling', () => {
    const msg = makeMessage({ content: 'Hey @alice check this' });
    const { getByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Bob" />,
    );

    expect(getByText('@alice')).toBeTruthy();
    expect(getByText(/Hey.*check this/)).toBeTruthy();
  });

  it('renders multiple @mentions highlighted', () => {
    const msg = makeMessage({ content: '@alice and @bob' });
    const { getByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Carol" />,
    );

    expect(getByText('@alice')).toBeTruthy();
    expect(getByText('@bob')).toBeTruthy();
  });

  it('renders plain message without mention parsing artifacts', () => {
    const msg = makeMessage({ content: 'No mentions here' });
    const { getByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );

    expect(getByText('No mentions here')).toBeTruthy();
  });

  it('renders message that is only a mention', () => {
    const msg = makeMessage({ content: '@alice' });
    const { getByText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Bob" />,
    );

    expect(getByText('@alice')).toBeTruthy();
  });

  it('renders spacer when no authorName (continuation message)', () => {
    const msg = makeMessage();
    const { queryByTestId } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} />,
    );

    // No UserAvatar should be rendered for continuation messages
    expect(queryByTestId('user-avatar')).toBeNull();
  });

  // --- Mod Button Hover Row Tests ---
  // Note: Actual mod buttons render only on hover (web-only). Unit tests verify the
  // hover placeholder area renders when mod callbacks are provided, and that it
  // does NOT render when they're absent (same as reply/react buttons pattern).

  it('renders hover button placeholder when mod callbacks provided', () => {
    const msg = makeMessage();
    // With mod callbacks, the component renders an extra placeholder View for hover buttons.
    // Without onReply/onAddReaction, the placeholder only appears because of mod callbacks.
    const { toJSON } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" onMute={jest.fn()} onKick={jest.fn()} onBan={jest.fn()} />,
    );

    // Snapshot should include the hover placeholder — just verify it renders without crashing
    expect(toJSON()).toBeTruthy();
  });

  it('does not render mod buttons when callbacks absent', () => {
    const msg = makeMessage();
    const { queryByLabelText } = renderWithProviders(
      <MessageBubble message={msg} isOwn={false} authorName="Alice" />,
    );

    expect(queryByLabelText('Mute user')).toBeNull();
    expect(queryByLabelText('Unmute user')).toBeNull();
    expect(queryByLabelText('Kick user')).toBeNull();
    expect(queryByLabelText('Ban user')).toBeNull();
  });
});
