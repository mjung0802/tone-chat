import React from 'react';
import { render } from '@testing-library/react-native';
import { ToneEmojiDrift } from './ToneEmojiDrift';

const THREE_EMOJI = ['😂', '✨', '💫'];
const FOUR_EMOJI = ['😂', '✨', '💫', '🌟'];

describe('ToneEmojiDrift', () => {
  describe('sprite count', () => {
    it('renders 3 sprites when emojiSet has 3 items', () => {
      const { getAllByText } = render(
        <ToneEmojiDrift emojiSet={THREE_EMOJI} />,
      );
      // Each sprite renders its emoji as a Text node
      const nodes = [
        ...getAllByText('😂').filter((n) => n.props.children === '😂'),
        ...getAllByText('✨').filter((n) => n.props.children === '✨'),
        ...getAllByText('💫').filter((n) => n.props.children === '💫'),
      ];
      expect(nodes).toHaveLength(3);
    });

    it('renders 4 sprites when emojiSet has 4 items', () => {
      const { getAllByText } = render(
        <ToneEmojiDrift emojiSet={FOUR_EMOJI} />,
      );
      const nodes = [
        ...getAllByText('😂').filter((n) => n.props.children === '😂'),
        ...getAllByText('✨').filter((n) => n.props.children === '✨'),
        ...getAllByText('💫').filter((n) => n.props.children === '💫'),
        ...getAllByText('🌟').filter((n) => n.props.children === '🌟'),
      ];
      expect(nodes).toHaveLength(4);
    });
  });

  describe('reduced motion fallback', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useReducedMotion } = require('react-native-reanimated') as {
        useReducedMotion: jest.Mock;
      };
      useReducedMotion.mockReturnValue(true);
    });

    afterEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useReducedMotion } = require('react-native-reanimated') as {
        useReducedMotion: jest.Mock;
      };
      useReducedMotion.mockReturnValue(false);
    });

    it('renders exactly 1 sprite when useReducedMotion returns true', () => {
      const { getAllByText, queryAllByText } = render(
        <ToneEmojiDrift emojiSet={FOUR_EMOJI} />,
      );
      // Only the first emoji should appear
      const firstNodes = getAllByText('😂').filter((n) => n.props.children === '😂');
      const secondNodes = queryAllByText('✨').filter(
        (n) => n.props.children === '✨',
      );
      expect(firstNodes).toHaveLength(1);
      expect(secondNodes).toHaveLength(0);
    });

    it('static fallback renders the first emoji from emojiSet', () => {
      const { getByText } = render(
        <ToneEmojiDrift emojiSet={THREE_EMOJI} />,
      );
      // First emoji must be present
      expect(getByText('😂')).toBeTruthy();
    });
  });
});
