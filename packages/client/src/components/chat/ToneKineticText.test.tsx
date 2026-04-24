import React from 'react';
import { render } from '@testing-library/react-native';
import { BASE_TONES } from '../../tone/toneRegistry';
import type { ToneDefinition } from '../../tone/toneRegistry';
import { ToneKineticText } from './ToneKineticText';

const MENTION_COLOR = '#6200ee';

const BASE_PROPS = {
  isDark: false,
  displayMode: 'full' as const,
  mentionColor: MENTION_COLOR,
};

// A tone with no char animation for fallback testing
const noCharTone: ToneDefinition = {
  key: 'test',
  tag: '/test',
  label: 'test',
  emoji: '🧪',
  color: { light: '#333333', dark: '#cccccc' },
  textStyle: 'normal',
  // char intentionally omitted
};

describe('ToneKineticText', () => {
  describe('animated rendering — all char values', () => {
    const charTones = BASE_TONES.filter((t) => t.char !== undefined);

    it.each(charTones.map((t) => [t.key, t]))(
      'renders without throwing for char=%s',
      (_key, tone) => {
        expect(() =>
          render(
            <ToneKineticText
              {...BASE_PROPS}
              text="Hello world"
              tone={tone as ToneDefinition}
            />,
          ),
        ).not.toThrow();
      },
    );
  });

  describe('fallback rendering', () => {
    it('renders plain text when displayMode is "reduced"', () => {
      const tone = BASE_TONES.find((t) => t.char !== undefined)!;
      const { queryByTestId, getByText } = render(
        <ToneKineticText
          {...BASE_PROPS}
          displayMode="reduced"
          text="Hello world"
          tone={tone}
        />,
      );

      // Should render text content
      expect(getByText('Hello world')).toBeTruthy();
      // Animated.View container for words should NOT be present (plain Text fallback)
      expect(queryByTestId('animated-container')).toBeNull();
    });

    it('renders plain text when displayMode is "off"', () => {
      const tone = BASE_TONES.find((t) => t.char !== undefined)!;
      const { getByText } = render(
        <ToneKineticText
          {...BASE_PROPS}
          displayMode="off"
          text="Hello plain"
          tone={tone}
        />,
      );
      expect(getByText('Hello plain')).toBeTruthy();
    });

    it('renders plain text when tone has no char', () => {
      const { getByText } = render(
        <ToneKineticText
          {...BASE_PROPS}
          text="No animation here"
          tone={noCharTone}
        />,
      );
      expect(getByText('No animation here')).toBeTruthy();
    });

    it('renders plain text when useReducedMotion returns true', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useReducedMotion } = require('react-native-reanimated') as {
        useReducedMotion: jest.Mock;
      };
      useReducedMotion.mockReturnValueOnce(true);

      const tone = BASE_TONES.find((t) => t.char !== undefined)!;
      const { getByText } = render(
        <ToneKineticText
          {...BASE_PROPS}
          text="Reduced motion"
          tone={tone}
        />,
      );
      expect(getByText('Reduced motion')).toBeTruthy();
    });
  });

  describe('mention rendering', () => {
    it('renders @mention tokens with mentionColor and bold weight in full mode', () => {
      const tone = BASE_TONES.find((t) => t.char !== undefined)!;
      const { getByText } = render(
        <ToneKineticText
          {...BASE_PROPS}
          text="Hello @alice how are you"
          tone={tone}
        />,
      );

      const mentionNode = getByText('@alice');
      expect(mentionNode).toBeTruthy();
      expect(mentionNode.props.style).toMatchObject({
        color: MENTION_COLOR,
        fontWeight: 'bold',
      });
    });

    it('renders @mention tokens with mentionColor and bold weight in fallback mode', () => {
      const tone = BASE_TONES.find((t) => t.char !== undefined)!;
      const { getByText } = render(
        <ToneKineticText
          {...BASE_PROPS}
          displayMode="reduced"
          text="Hey @bob check this"
          tone={tone}
        />,
      );

      const mentionNode = getByText('@bob');
      expect(mentionNode).toBeTruthy();
      expect(mentionNode.props.style).toMatchObject({
        color: MENTION_COLOR,
        fontWeight: 'bold',
      });
    });
  });

  describe('text styling', () => {
    it('applies italic style for italic textStyle tones', () => {
      const italicTone = BASE_TONES.find((t) => t.textStyle === 'italic')!;
      const { getByText } = render(
        <ToneKineticText
          {...BASE_PROPS}
          displayMode="reduced"
          text="Italic text"
          tone={italicTone}
        />,
      );

      const textNode = getByText('Italic text');
      // The wrapper Text has fontStyle italic
      expect(textNode.props.style).toMatchObject({ fontStyle: 'italic' });
    });

    it('applies fontWeight 500 for medium textStyle tones', () => {
      const mediumTone = BASE_TONES.find((t) => t.textStyle === 'medium')!;
      const { getByText } = render(
        <ToneKineticText
          {...BASE_PROPS}
          displayMode="reduced"
          text="Medium text"
          tone={mediumTone}
        />,
      );

      const textNode = getByText('Medium text');
      expect(textNode.props.style).toMatchObject({ fontWeight: '500' });
    });

    it('uses dark color when isDark is true', () => {
      const tone = BASE_TONES[0]!;
      const { getByText } = render(
        <ToneKineticText
          {...BASE_PROPS}
          isDark
          displayMode="reduced"
          text="Dark mode"
          tone={tone}
        />,
      );

      const textNode = getByText('Dark mode');
      expect(textNode.props.style).toMatchObject({ color: tone.color.dark });
    });

    it('uses light color when isDark is false', () => {
      const tone = BASE_TONES[0]!;
      const { getByText } = render(
        <ToneKineticText
          {...BASE_PROPS}
          isDark={false}
          displayMode="reduced"
          text="Light mode"
          tone={tone}
        />,
      );

      const textNode = getByText('Light mode');
      expect(textNode.props.style).toMatchObject({ color: tone.color.light });
    });
  });
});
