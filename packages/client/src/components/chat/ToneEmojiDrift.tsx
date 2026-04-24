import React, { useEffect, useRef } from 'react';
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
import type { DriftDir } from '../../tone/toneRegistry';

interface ToneEmojiDriftProps {
  emojiSet: string[];
}

interface EmojiSpriteProps {
  emoji: string;
  driftDir: DriftDir;
  position: { left: DimensionValue; top: DimensionValue };
  delayMs: number;
}

type DriftConfig = {
  txStart: number;
  txEnd: number;
  tyStart: number;
  tyEnd: number;
  rotStart: number;
  rotEnd: number;
};

const DRIFT_CONFIGS: Record<DriftDir, DriftConfig> = {
  UL: { txStart: 0, txEnd: -12, tyStart: 0, tyEnd: -64, rotStart: -6, rotEnd: -14 },
  UR: { txStart: 0, txEnd: 12, tyStart: 0, tyEnd: -64, rotStart: 6, rotEnd: 14 },
  DL: { txStart: 0, txEnd: -4, tyStart: 0, tyEnd: 60, rotStart: 6, rotEnd: -6 },
  DR: { txStart: 0, txEnd: 4, tyStart: 0, tyEnd: 60, rotStart: -6, rotEnd: 6 },
};

const ALL_DIRS: DriftDir[] = ['UL', 'UR', 'DL', 'DR'];

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

const SPRITE_SLOTS_UP: Array<{ left: DimensionValue; top: DimensionValue }> = [
  { left: '66%', top: '80%' },
  { left: '78%', top: '88%' },
  { left: '88%', top: '76%' },
  { left: '96%', top: '84%' },
];

const SPRITE_SLOTS_DOWN: Array<{ left: DimensionValue; top: DimensionValue }> = [
  { left: '66%', top: '10%' },
  { left: '78%', top: '18%' },
  { left: '88%', top: '6%' },
  { left: '96%', top: '14%' },
];

function getSpriteSlots(driftDir: DriftDir) {
  return driftDir === 'DL' || driftDir === 'DR' ? SPRITE_SLOTS_DOWN : SPRITE_SLOTS_UP;
}

export function ToneEmojiDrift({ emojiSet }: ToneEmojiDriftProps) {
  const reducedMotion = useReducedMotion();
  const count = Math.min(emojiSet.length, SPRITE_SLOTS_UP.length);

  const stableRef = useRef<{ dirs: DriftDir[]; baseOffset: number } | null>(null);
  if (stableRef.current === null) {
    stableRef.current = {
      dirs: Array.from(
        { length: count },
        () => ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)] ?? 'UR',
      ),
      baseOffset: Math.floor(Math.random() * 4000),
    };
  }
  const { dirs: spriteDirections, baseOffset } = stableRef.current;

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
      {Array.from({ length: count }, (_, i) => {
        const spriteDriftDir = spriteDirections[i] ?? 'UR';
        const slot = getSpriteSlots(spriteDriftDir)[i];
        const emoji = emojiSet[i];
        if (slot === undefined || emoji === undefined) return null;
        return (
          <EmojiSprite
            key={i}
            emoji={emoji}
            driftDir={spriteDriftDir}
            position={slot}
            delayMs={baseOffset + i * 1000}
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
