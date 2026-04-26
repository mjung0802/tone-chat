import React, { useEffect } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { resolveToneColor, type ToneDefinition } from '../../tone/toneRegistry';

interface ToneTagProps {
  tone: ToneDefinition;
  isDark: boolean;
  displayMode: 'full' | 'reduced' | 'off';
  hovered?: boolean | undefined;
}

const MONO_FONT = Platform.OS === 'web' ? 'monospace' : 'Courier New';

export function ToneTag({ tone, isDark, displayMode, hovered }: ToneTagProps) {
  const toneColor = resolveToneColor(tone, isDark);

  const labelOpacity = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS === 'web' && displayMode === 'full') {
      labelOpacity.value = withTiming(hovered === true ? 1 : 0, { duration: 150 });
    }
  }, [hovered, displayMode, labelOpacity]);

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  if (displayMode === 'off') {
    return null;
  }

  if (displayMode === 'reduced') {
    return (
      <View style={styles.container}>
        <Text style={[styles.tag, { color: toneColor, opacity: 0.7, fontFamily: MONO_FONT }]}>
          {tone.tag}
        </Text>
      </View>
    );
  }

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={[styles.tag, { color: toneColor, fontFamily: MONO_FONT }]}>
          {`${tone.label} · ${tone.tag}`}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[styles.label, { color: toneColor, fontFamily: MONO_FONT }, animatedLabelStyle]}
      >
        {`${tone.label} · `}
      </Animated.Text>
      <Text style={[styles.tag, { color: toneColor, fontFamily: MONO_FONT }]}>
        {tone.tag}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    fontSize: 12,
  },
  label: {
    fontSize: 12,
  },
});
