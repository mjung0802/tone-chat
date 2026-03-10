import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { MessageBubble } from './MessageBubble';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makeMessage } from '../../test-utils/fixtures';

jest.mock('./AttachmentBubble', () => ({
  AttachmentBubble: ({ attachmentId }: { attachmentId: string }) => {
    const { Text } = require('react-native');
    return <Text testID={`attachment-${attachmentId}`}>AttachmentBubble</Text>;
  },
}));

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
});
