import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import type { ToneDefinition } from '../../tone/toneRegistry';

// Inline Reanimated mock — avoids window.matchMedia issues in Jest JSDOM-lite env.
// Pattern mirrors ToneKineticText.test.tsx.
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
import { ToneTag } from './ToneTag';

const MOCK_TONE: ToneDefinition = {
  key: 'j',
  tag: '/j',
  label: 'joking',
  emoji: '😄',
  color: { light: '#92400e', dark: '#fcd34d' },
  textStyle: 'italic',
};

describe('ToneTag', () => {
  // jest.setup.ts sets Platform.OS = 'web' globally (writable)
  // We reset it to 'web' before each test since some tests change it.
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
  });

  describe('displayMode === "off"', () => {
    it('renders nothing', () => {
      const { toJSON } = render(
        <ToneTag tone={MOCK_TONE} isDark={false} displayMode="off" />,
      );
      expect(toJSON()).toBeNull();
    });
  });

  describe('displayMode === "reduced"', () => {
    it('shows the tone tag text', () => {
      const { getByText } = render(
        <ToneTag tone={MOCK_TONE} isDark={false} displayMode="reduced" />,
      );
      expect(getByText('/j')).toBeTruthy();
    });

    it('does not show the label', () => {
      const { queryByText } = render(
        <ToneTag tone={MOCK_TONE} isDark={false} displayMode="reduced" />,
      );
      expect(queryByText('joking')).toBeNull();
      expect(queryByText('/j · joking')).toBeNull();
    });

    it('applies opacity 0.7 to the tag text', () => {
      const { getByText } = render(
        <ToneTag tone={MOCK_TONE} isDark={false} displayMode="reduced" />,
      );
      const tagNode = getByText('/j');
      const flatStyle = Array.isArray(tagNode.props.style)
        ? Object.assign({}, ...tagNode.props.style)
        : tagNode.props.style;
      expect(flatStyle.opacity).toBe(0.7);
    });
  });

  describe('displayMode === "full" on native (Platform.OS !== "web")', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
    });

    it('always shows tag · label concatenated', () => {
      const { getByText } = render(
        <ToneTag tone={MOCK_TONE} isDark={false} displayMode="full" />,
      );
      expect(getByText('/j · joking')).toBeTruthy();
    });

    it('shows label even without hovered prop', () => {
      const { getByText } = render(
        <ToneTag tone={MOCK_TONE} isDark={false} displayMode="full" />,
      );
      expect(getByText('/j · joking')).toBeTruthy();
    });
  });

  describe('displayMode === "full" on web', () => {
    // Platform.OS is already 'web' from beforeEach above

    it('shows the tag text when hovered is false', () => {
      const { getByText } = render(
        <ToneTag tone={MOCK_TONE} isDark={false} displayMode="full" hovered={false} />,
      );
      expect(getByText('/j')).toBeTruthy();
    });

    it('label has opacity 0 when hovered is false', () => {
      const { getByText } = render(
        <ToneTag tone={MOCK_TONE} isDark={false} displayMode="full" hovered={false} />,
      );
      // The Reanimated mock: useSharedValue(0) returns {value:0},
      // useAnimatedStyle(fn) returns fn() which reads opacity.value === 0
      const labelNode = getByText(' · joking');
      const flatStyle = Array.isArray(labelNode.props.style)
        ? Object.assign({}, ...labelNode.props.style)
        : labelNode.props.style;
      expect(flatStyle.opacity).toBe(0);
    });

    it('label is present and visible when hovered is true', () => {
      const { getByText } = render(
        <ToneTag tone={MOCK_TONE} isDark={false} displayMode="full" hovered={true} />,
      );
      // Label node should exist in the tree
      expect(getByText(' · joking')).toBeTruthy();
    });

    it('uses dark tone color when isDark is true', () => {
      const { getByText } = render(
        <ToneTag tone={MOCK_TONE} isDark={true} displayMode="full" hovered={false} />,
      );
      const tagNode = getByText('/j');
      const flatStyle = Array.isArray(tagNode.props.style)
        ? Object.assign({}, ...tagNode.props.style)
        : tagNode.props.style;
      expect(flatStyle.color).toBe(MOCK_TONE.color.dark);
    });

    it('uses light tone color when isDark is false', () => {
      const { getByText } = render(
        <ToneTag tone={MOCK_TONE} isDark={false} displayMode="full" hovered={false} />,
      );
      const tagNode = getByText('/j');
      const flatStyle = Array.isArray(tagNode.props.style)
        ? Object.assign({}, ...tagNode.props.style)
        : tagNode.props.style;
      expect(flatStyle.color).toBe(MOCK_TONE.color.light);
    });
  });
});
