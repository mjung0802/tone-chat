import React, { useEffect } from 'react';
import { View, Text, Platform, StyleSheet, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  useReducedMotion,
} from 'react-native-reanimated';

interface ToneEmojiDriftProps {
  emojiSet: string[];           // 1+ emoji characters, max shown: min(emojiSet.length, 4)
  driftDir: 'UR' | 'U' | 'R' | 'F';
}

interface EmojiSpriteProps {
  emoji: string;
  driftDir: 'UR' | 'U' | 'R' | 'F';
  position: { left: DimensionValue; top: DimensionValue };
  delayMs: number;
}

// Drift direction start/end values
type DriftConfig = {
  txStart: number;
  txEnd: number;
  tyStart: number;
  tyEnd: number;
  rotStart: number;
  rotEnd: number;
};

function getDriftConfig(driftDir: 'UR' | 'U' | 'R' | 'F'): DriftConfig {
  switch (driftDir) {
    case 'UR':
      return { txStart: 0, txEnd: 12, tyStart: 6, tyEnd: -26, rotStart: 6, rotEnd: 14 };
    case 'U':
      return { txStart: 0, txEnd: 4, tyStart: 6, tyEnd: -28, rotStart: 0, rotEnd: 0 };
    case 'R':
      return { txStart: -2, txEnd: 16, tyStart: 2, tyEnd: -10, rotStart: -4, rotEnd: 8 };
    case 'F':
      return { txStart: 0, txEnd: 4, tyStart: -4, tyEnd: 22, rotStart: 0, rotEnd: 0 };
  }
}

function EmojiSprite({ emoji, driftDir, position, delayMs }: EmojiSpriteProps) {
  const config = getDriftConfig(driftDir);

  const translateX = useSharedValue(config.txStart);
  const translateY = useSharedValue(config.tyStart);
  const rotateDeg = useSharedValue(config.rotStart);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Opacity: fade in 800ms, hold and fade out 3200ms, loop
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 800 }),
          withTiming(0, { duration: 3200 }),
        ),
        -1,
        false,
      ),
    );

    // TranslateX: travel from start to end over 4000ms, instant reset, loop
    translateX.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(config.txEnd, { duration: 4000 }),
          withTiming(config.txStart, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );

    // TranslateY: travel from start to end over 4000ms, instant reset, loop
    translateY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(config.tyEnd, { duration: 4000 }),
          withTiming(config.tyStart, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );

    // Rotate: travel from start to end over 4000ms, instant reset, loop (only for UR and R)
    if (config.rotStart !== config.rotEnd) {
      rotateDeg.value = withDelay(
        delayMs,
        withRepeat(
          withSequence(
            withTiming(config.rotEnd, { duration: 4000 }),
            withTiming(config.rotStart, { duration: 0 }),
          ),
          -1,
          false,
        ),
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotateDeg.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.sprite,
        { left: position.left, top: position.top },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

const SPRITE_CONFIGS: Array<{ left: DimensionValue; top: DimensionValue; delayMs: number }> = [
  { left: '66%', top: '58%', delayMs: 0 },
  { left: '78%', top: '72%', delayMs: 1000 },
  { left: '88%', top: '48%', delayMs: 2000 },
  { left: '96%', top: '66%', delayMs: 3000 },
];

export function ToneEmojiDrift({ emojiSet, driftDir }: ToneEmojiDriftProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    // Static fallback: single sprite, no animation
    const firstEmoji = emojiSet[0] ?? '';
    return (
      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.sprite, { left: '78%', top: '68%', opacity: 0.4 }]}>
          <Text style={styles.emoji}>{firstEmoji}</Text>
        </View>
      </View>
    );
  }

  const count = Math.min(emojiSet.length, 4);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => {
        const spriteConfig = SPRITE_CONFIGS[i];
        const emoji = emojiSet[i];
        if (spriteConfig === undefined || emoji === undefined) return null;
        return (
          <EmojiSprite
            key={i}
            emoji={emoji}
            driftDir={driftDir}
            position={{ left: spriteConfig.left, top: spriteConfig.top }}
            delayMs={spriteConfig.delayMs}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // pointerEvents in StyleSheet not recognized by RN types; set via prop
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
  },
  sprite: {
    position: 'absolute',
  },
  emoji: {
    fontSize: 16,
  },
});
