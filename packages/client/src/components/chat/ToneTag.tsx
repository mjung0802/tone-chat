import React, { useEffect } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import type { ToneDefinition } from '../../tone/toneRegistry';

interface ToneTagProps {
  tone: ToneDefinition;
  isDark: boolean;
  displayMode: 'full' | 'reduced' | 'off';
  hovered?: boolean | undefined;
}

export function ToneTag({ tone, isDark, displayMode, hovered }: ToneTagProps) {
  const toneColor = isDark ? tone.color.dark : tone.color.light;

  // Shared value for label opacity (web hover reveal). Always initialised
  // so hooks are never called conditionally.
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

  const monoFont = Platform.OS === 'web' ? 'monospace' : 'Courier New';

  if (displayMode === 'reduced') {
    return (
      <View style={styles.container}>
        <Text
          style={[styles.tag, { color: toneColor, opacity: 0.7, fontFamily: monoFont }]}
        >
          {tone.tag}
        </Text>
      </View>
    );
  }

  // displayMode === 'full'
  if (Platform.OS !== 'web') {
    // Native: always show full label inline
    return (
      <View style={styles.container}>
        <Text style={[styles.tag, { color: toneColor, fontFamily: monoFont }]}>
          {tone.tag + ' · ' + tone.label}
        </Text>
      </View>
    );
  }

  // Web: show tag always, fade in label on hover
  return (
    <View style={styles.container}>
      <Text style={[styles.tag, { color: toneColor, fontFamily: monoFont }]}>
        {tone.tag}
      </Text>
      <Animated.Text
        style={[styles.label, { color: toneColor, fontFamily: monoFont }, animatedLabelStyle]}
      >
        {' · ' + tone.label}
      </Animated.Text>
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
