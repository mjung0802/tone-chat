import React from 'react';
import { render } from '@testing-library/react-native';

// Inline Reanimated mock — avoids window.matchMedia issues in Jest JSDOM-lite env.
// Pattern mirrors ToneKineticText.test.tsx and ToneTag.test.tsx.
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, Image } = require('react-native');
  const NOOP = () => {};
  // Use explicit function (not arrow) to avoid <T> being parsed as JSX in .tsx
  function ID(t: unknown) { return t; }
  return {
    __esModule: true,
    default: {
      View,
      Text,
      Image,
      createAnimatedComponent: ID,
    },
    useSharedValue: (init: unknown) => ({ value: init }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (toValue: unknown) => toValue,
    withRepeat: ID,
    withSequence: () => 0,
    withDelay: (_delay: number, next: unknown) => next,
    cancelAnimation: NOOP,
    useReducedMotion: jest.fn(() => false),
    Easing: {
      linear: ID,
      ease: ID,
      quad: ID,
      cubic: ID,
      in: ID,
      out: ID,
      inOut: ID,
      bezier: () => ({ factory: ID }),
      back: ID,
      bounce: ID,
      elastic: ID,
      poly: ID,
      sin: ID,
      circle: ID,
      exp: ID,
      steps: ID,
      bezierFn: ID,
    },
  };
});

// Import after mock is registered
import { ToneEmojiDrift } from './ToneEmojiDrift';

const THREE_EMOJI = ['😂', '✨', '💫'];
const FOUR_EMOJI = ['😂', '✨', '💫', '🌟'];

describe('ToneEmojiDrift', () => {
  describe('renders without throwing for each driftDir', () => {
    const dirs: Array<'UR' | 'U' | 'R' | 'F'> = ['UR', 'U', 'R', 'F'];

    it.each(dirs)('driftDir=%s renders without throwing', (dir) => {
      expect(() =>
        render(<ToneEmojiDrift emojiSet={THREE_EMOJI} driftDir={dir} />),
      ).not.toThrow();
    });
  });

  describe('sprite count', () => {
    it('renders 3 sprites when emojiSet has 3 items', () => {
      const { getAllByText } = render(
        <ToneEmojiDrift emojiSet={THREE_EMOJI} driftDir="UR" />,
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
        <ToneEmojiDrift emojiSet={FOUR_EMOJI} driftDir="R" />,
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
        <ToneEmojiDrift emojiSet={FOUR_EMOJI} driftDir="U" />,
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
        <ToneEmojiDrift emojiSet={THREE_EMOJI} driftDir="F" />,
      );
      // First emoji must be present
      expect(getByText('😂')).toBeTruthy();
    });
  });
});
