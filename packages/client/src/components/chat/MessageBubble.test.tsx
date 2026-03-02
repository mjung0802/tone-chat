import React from 'react';
import { MessageBubble } from './MessageBubble';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makeMessage } from '../../test-utils/fixtures';

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
});
