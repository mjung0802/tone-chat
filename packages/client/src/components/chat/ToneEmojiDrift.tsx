import React, { useEffect, useMemo } from 'react';
import { View, Text, Platform, StyleSheet, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';

interface ToneEmojiDriftProps {
  emojiSet: string[];
}

type DriftDir = 'UL' | 'UR' | 'DL' | 'DR';
type DriftFamily = 'UP' | 'DOWN';
type SpriteSlot = { left: DimensionValue; top: DimensionValue };

interface EmojiSpriteProps {
  emoji: string;
  driftDir: DriftDir;
  position: SpriteSlot;
  delayMs: number;
}

type DriftConfig = {
  family: DriftFamily;
  txStart: number;
  txEnd: number;
  tyStart: number;
  tyEnd: number;
  rotStart: number;
  rotEnd: number;
};

const DRIFT_CONFIGS: Record<DriftDir, DriftConfig> = {
  UL: { family: 'UP',   txStart: 0, txEnd: -12, tyStart: 0, tyEnd: -64, rotStart: -6, rotEnd: -14 },
  UR: { family: 'UP',   txStart: 0, txEnd:  12, tyStart: 0, tyEnd: -64, rotStart:  6, rotEnd:  14 },
  DL: { family: 'DOWN', txStart: 0, txEnd:  -4, tyStart: 0, tyEnd:  60, rotStart:  6, rotEnd:  -6 },
  DR: { family: 'DOWN', txStart: 0, txEnd:   4, tyStart: 0, tyEnd:  60, rotStart: -6, rotEnd:   6 },
};

const ALL_DIRS: readonly DriftDir[] = ['UL', 'UR', 'DL', 'DR'];

const SPRITE_SLOTS: Record<DriftFamily, SpriteSlot[]> = {
  UP: [
    { left: '66%', top: '80%' },
    { left: '78%', top: '88%' },
    { left: '88%', top: '76%' },
    { left: '96%', top: '84%' },
  ],
  DOWN: [
    { left: '66%', top: '10%' },
    { left: '78%', top: '18%' },
    { left: '88%', top: '6%' },
    { left: '96%', top: '14%' },
  ],
};

const MAX_SPRITES = SPRITE_SLOTS.UP.length;

function randomDir(): DriftDir {
  return ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)] ?? 'UR';
}

function loopAnim(
  shared: SharedValue<number>,
  start: number,
  end: number,
  durationMs: number,
  delayMs: number,
) {
  shared.value = withDelay(
    delayMs,
    withRepeat(
      withSequence(
        withTiming(end, { duration: durationMs }),
        withTiming(start, { duration: 0 }),
      ),
      -1,
      false,
    ),
  );
}

function EmojiSprite({ emoji, driftDir, position, delayMs }: EmojiSpriteProps) {
  const config = DRIFT_CONFIGS[driftDir];

  const translateX = useSharedValue(config.txStart);
  const translateY = useSharedValue(config.tyStart);
  const rotateDeg = useSharedValue(config.rotStart);
  const opacity = useSharedValue(0);

  useEffect(() => {
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

    loopAnim(translateX, config.txStart, config.txEnd, 4000, delayMs);
    loopAnim(translateY, config.tyStart, config.tyEnd, 4000, delayMs);

    if (config.rotStart !== config.rotEnd) {
      loopAnim(rotateDeg, config.rotStart, config.rotEnd, 4000, delayMs);
    }

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(rotateDeg);
    };
  }, [delayMs, config, opacity, translateX, translateY, rotateDeg]);

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

export function ToneEmojiDrift({ emojiSet }: ToneEmojiDriftProps) {
  const reducedMotion = useReducedMotion();

  const stable = useMemo(
    () => ({
      dirs: Array.from({ length: MAX_SPRITES }, randomDir),
      baseOffset: Math.floor(Math.random() * 4000),
    }),
    [],
  );

  if (reducedMotion) {
    const firstEmoji = emojiSet[0] ?? '';
    return (
      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.sprite, { left: '78%', top: '80%', opacity: 0.4 }]}>
          <Text style={styles.emoji}>{firstEmoji}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay} pointerEvents="none">
      {emojiSet.slice(0, MAX_SPRITES).map((emoji, i) => {
        const dir = stable.dirs[i];
        if (dir === undefined) return null;
        const slot = SPRITE_SLOTS[DRIFT_CONFIGS[dir].family][i];
        if (slot === undefined) return null;
        return (
          <EmojiSprite
            key={i}
            emoji={emoji}
            driftDir={dir}
            position={slot}
            delayMs={stable.baseOffset + i * 1000}
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
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
  },
  sprite: {
    position: 'absolute',
  },
  emoji: {
    fontSize: 16,
  },
});
