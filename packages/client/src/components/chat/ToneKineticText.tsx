import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import type { ToneDefinition } from '../../tone/toneRegistry';

export interface ToneKineticTextProps {
  text: string;
  tone: ToneDefinition;
  isDark: boolean;
  displayMode: 'full' | 'reduced' | 'off';
  mentionColor: string;
}

type CharAnimation = NonNullable<ToneDefinition['char']>;

interface AnimatedWordProps {
  children: React.ReactNode;
  index: number;
  char: CharAnimation;
  wordStyle: object;
}

function AnimatedWord({ children, index, char, wordStyle }: AnimatedWordProps) {
  // All shared values initialised at neutral / entry-start positions
  const isEntryOnly = char === 'lock' || char === 'rise' || char === 'sink';

  const translateX = useSharedValue(char === 'lock' ? 8 : 0);
  const translateY = useSharedValue(
    char === 'rise' ? 8 : char === 'sink' ? -4 : 0,
  );
  const opacity = useSharedValue(isEntryOnly ? 0 : 1);
  const rotateDeg = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    switch (char) {
      case 'bounce':
        translateY.value = withDelay(
          index * 80,
          withRepeat(
            withSequence(
              withTiming(-5, { duration: 250, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: 250, easing: Easing.in(Easing.quad) }),
            ),
            -1,
            false,
          ),
        );
        break;

      case 'tilt':
        translateX.value = withDelay(
          index * 40,
          withRepeat(
            withSequence(
              withTiming(3, { duration: 100 }),
              withTiming(-3, { duration: 200 }),
              withTiming(0, { duration: 100 }),
            ),
            -1,
            false,
          ),
        );
        break;

      case 'lock':
        translateX.value = withDelay(index * 50, withTiming(0, { duration: 200 }));
        opacity.value = withDelay(index * 50, withTiming(1, { duration: 200 }));
        break;

      case 'sway':
        rotateDeg.value = withDelay(
          index * 60,
          withRepeat(
            withSequence(
              withTiming(-1, { duration: 300 }),
              withTiming(1.5, { duration: 300 }),
            ),
            -1,
            true,
          ),
        );
        break;

      case 'wobble':
        rotateDeg.value = withDelay(
          index * 40,
          withRepeat(
            withSequence(
              withTiming(-1.5, { duration: 200 }),
              withTiming(1.5, { duration: 200 }),
            ),
            -1,
            true,
          ),
        );
        break;

      case 'rise':
        translateY.value = withDelay(index * 60, withTiming(0, { duration: 200 }));
        opacity.value = withDelay(index * 60, withTiming(1, { duration: 200 }));
        break;

      case 'sink':
        translateY.value = withDelay(index * 60, withTiming(2, { duration: 200 }));
        opacity.value = withDelay(index * 60, withTiming(0.75, { duration: 200 }));
        break;

      case 'breathe':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.02, { duration: 400 }),
            withTiming(1, { duration: 400 }),
          ),
          -1,
          true,
        );
        opacity.value = withRepeat(
          withSequence(
            withTiming(1.0, { duration: 400 }),
            withTiming(0.85, { duration: 400 }),
          ),
          -1,
          true,
        );
        break;

      case 'jitter':
        translateX.value = withRepeat(
          withSequence(
            withTiming(0.5, { duration: 50 }),
            withTiming(-0.5, { duration: 50 }),
          ),
          -1,
          false,
        );
        translateY.value = withRepeat(
          withSequence(
            withTiming(-0.5, { duration: 50 }),
            withTiming(0.5, { duration: 50 }),
          ),
          -1,
          false,
        );
        break;
    }
    // char and index are stable props — intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotateDeg.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.wordWrapper, animatedStyle]}>
      <Text style={wordStyle}>{children}</Text>
    </Animated.View>
  );
}

export function ToneKineticText({
  text,
  tone,
  isDark,
  displayMode,
  mentionColor,
}: ToneKineticTextProps) {
  const reducedMotion = useReducedMotion();

  const toneColor = isDark ? tone.color.dark : tone.color.light;

  const wordTextStyle: object = {
    color: toneColor,
    ...(tone.textStyle === 'italic' ? { fontStyle: 'italic' as const } : {}),
    ...(tone.textStyle === 'medium' ? { fontWeight: '500' as const } : {}),
  };

  // Fallback: plain text rendering
  if (displayMode !== 'full' || reducedMotion || tone.char === undefined) {
    const parts = renderPlainWithMentions(text, mentionColor, toneColor, tone);
    return <Text style={wordTextStyle}>{parts}</Text>;
  }

  // Full animated mode — tone.char is defined here
  const charAnim: CharAnimation = tone.char;

  // Split text into mention and plain-text segments, then words
  const segments = parseSegments(text);
  const nodes: React.ReactNode[] = [];
  let wordIndex = 0;

  for (const segment of segments) {
    if (segment.type === 'mention') {
      nodes.push(
        <Text
          key={`mention-${segment.start}`}
          style={{ color: mentionColor, fontWeight: 'bold' }}
        >
          {segment.value}
        </Text>,
      );
      nodes.push(
        <Text key={`mention-space-${segment.start}`} style={wordTextStyle}>{' '}</Text>,
      );
    } else {
      // Split plain text by whitespace into individual words
      const words = segment.value.split(/\s+/).filter((w) => w.length > 0);
      for (const word of words) {
        const currentIndex = wordIndex;
        nodes.push(
          <AnimatedWord
            key={`word-${segment.start}-${currentIndex}`}
            index={currentIndex}
            char={charAnim}
            wordStyle={wordTextStyle}
          >
            {word}
          </AnimatedWord>,
        );
        nodes.push(
          <Text
            key={`space-${segment.start}-${currentIndex}`}
            style={wordTextStyle}
          >
            {' '}
          </Text>,
        );
        wordIndex++;
      }
    }
  }

  return (
    <View style={styles.container} accessibilityLabel={text}>
      {nodes}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Segment {
  type: 'text' | 'mention';
  value: string;
  start: number;
}

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /@\w+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
        start: lastIndex,
      });
    }
    segments.push({ type: 'mention', value: match[0], start: match.index });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex), start: lastIndex });
  }

  return segments;
}

function renderPlainWithMentions(
  text: string,
  mentionColor: string,
  toneColor: string,
  tone: ToneDefinition,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /@\w+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const plainStyle: object = {
    color: toneColor,
    ...(tone.textStyle === 'italic' ? { fontStyle: 'italic' as const } : {}),
    ...(tone.textStyle === 'medium' ? { fontWeight: '500' as const } : {}),
  };

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`plain-${lastIndex}`} style={plainStyle}>
          {text.slice(lastIndex, match.index)}
        </Text>,
      );
    }
    parts.push(
      <Text key={`mention-${match.index}`} style={{ color: mentionColor, fontWeight: 'bold' }}>
        {match[0]}
      </Text>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`plain-end-${lastIndex}`} style={plainStyle}>
        {text.slice(lastIndex)}
      </Text>,
    );
  }

  return parts;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wordWrapper: {},
});
