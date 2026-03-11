import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { EmojiPicker } from './EmojiPicker';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { emojiCategories } from './emojiData';

describe('EmojiPicker', () => {
  it('renders emojis when visible', () => {
    const { getByLabelText } = renderWithProviders(
      <EmojiPicker visible onSelect={jest.fn()} onDismiss={jest.fn()} />,
    );

    expect(getByLabelText('Emoji picker')).toBeTruthy();
  });

  it('does not render content when not visible', () => {
    const { queryByLabelText } = renderWithProviders(
      <EmojiPicker visible={false} onSelect={jest.fn()} onDismiss={jest.fn()} />,
    );

    expect(queryByLabelText('Emoji picker')).toBeNull();
  });

  it('calls onSelect when an emoji is pressed', () => {
    const onSelect = jest.fn();
    const firstEmoji = emojiCategories[0]!.emojis[0]!;

    const { getByLabelText } = renderWithProviders(
      <EmojiPicker visible onSelect={onSelect} onDismiss={jest.fn()} />,
    );

    fireEvent.press(getByLabelText(firstEmoji));

    expect(onSelect).toHaveBeenCalledWith(firstEmoji);
  });

  it('renders category tabs', () => {
    const { getByLabelText } = renderWithProviders(
      <EmojiPicker visible onSelect={jest.fn()} onDismiss={jest.fn()} />,
    );

    for (const cat of emojiCategories) {
      expect(getByLabelText(cat.name)).toBeTruthy();
    }
  });

  it('switches category when tab is pressed', () => {
    const secondCategory = emojiCategories[1]!;
    const secondCategoryEmoji = secondCategory.emojis[0]!;

    const { getByLabelText } = renderWithProviders(
      <EmojiPicker visible onSelect={jest.fn()} onDismiss={jest.fn()} />,
    );

    fireEvent.press(getByLabelText(secondCategory.name));

    expect(getByLabelText(secondCategoryEmoji)).toBeTruthy();
  });
});
