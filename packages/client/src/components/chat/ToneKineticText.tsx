import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  useReducedMotion,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import {
  resolveToneColor,
  toneTextStyleProps,
  type ToneDefinition,
  type CharAnimation,
} from '../../tone/toneRegistry';
import { parseMentionSegments } from '../../utils/mentions';

export interface ToneKineticTextProps {
  text: string;
  tone: ToneDefinition;
  isDark: boolean;
  displayMode: 'full' | 'reduced' | 'off';
  mentionColor: string;
}

interface AnimatedWordProps {
  children: React.ReactNode;
  index: number;
  char: CharAnimation;
  wordStyle: object;
}

function AnimatedWord({ children, index, char, wordStyle }: AnimatedWordProps) {
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
          index * 15,
          withRepeat(
            withSequence(
              withTiming(1.5, { duration: 450, easing: Easing.inOut(Easing.sin) }),
              withTiming(-1.5, { duration: 450, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
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
            withTiming(0.5, { duration: 100 }),
            withTiming(-0.5, { duration: 100 }),
          ),
          -1,
          false,
        );
        translateY.value = withRepeat(
          withSequence(
            withTiming(-0.5, { duration: 120 }),
            withTiming(0.5, { duration: 120 }),
          ),
          -1,
          false,
        );
        break;
    }

    return () => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(rotateDeg);
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [char, index, translateX, translateY, rotateDeg, scale, opacity]);

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
    <Animated.Text style={[wordStyle, animatedStyle]}>{children}</Animated.Text>
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

  const toneColor = resolveToneColor(tone, isDark);

  const wordTextStyle = useMemo<object>(
    () => ({ color: toneColor, ...toneTextStyleProps(tone.textStyle) }),
    [toneColor, tone.textStyle],
  );

  const fallback = displayMode !== 'full' || reducedMotion || tone.char === undefined;

  const nodes = useMemo<React.ReactNode[]>(() => {
    if (fallback) {
      return parseMentionSegments(text).map((segment) =>
        segment.type === 'mention' ? (
          <Text key={`m-${segment.start}`} style={{ color: mentionColor, fontWeight: 'bold' }}>
            {segment.value}
          </Text>
        ) : (
          segment.value
        ),
      );
    }

    const charAnim = tone.char as CharAnimation;
    const result: React.ReactNode[] = [];
    let wordIndex = 0;

    for (const segment of parseMentionSegments(text)) {
      if (segment.type === 'mention') {
        result.push(
          <Text
            key={`mention-${segment.start}`}
            style={{ color: mentionColor, fontWeight: 'bold' }}
          >
            {segment.value}
          </Text>,
        );
        result.push(
          <Text key={`mention-space-${segment.start}`} style={wordTextStyle}>{' '}</Text>,
        );
        continue;
      }

      const words = segment.value.trim().split(/\s+/);
      for (const word of words) {
        if (!word) continue;
        const currentIndex = wordIndex;
        result.push(
          <AnimatedWord
            key={`word-${segment.start}-${currentIndex}`}
            index={currentIndex}
            char={charAnim}
            wordStyle={wordTextStyle}
          >
            {word}
          </AnimatedWord>,
        );
        result.push(
          <Text key={`space-${segment.start}-${currentIndex}`} style={wordTextStyle}>
            {' '}
          </Text>,
        );
        wordIndex++;
      }
    }

    return result;
  }, [fallback, text, tone.char, wordTextStyle, mentionColor]);

  if (fallback) {
    return <Text style={wordTextStyle}>{nodes}</Text>;
  }

  return (
    <View style={styles.container} accessibilityLabel={text}>
      {nodes}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
