import React from 'react';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';

interface AccessiblePressableProps extends PressableProps {
  accessibilityLabel: string;
  accessibilityRole: PressableProps['accessibilityRole'];
  style?: StyleProp<ViewStyle>;
}

export function AccessiblePressable({
  children,
  style,
  ...props
}: AccessiblePressableProps) {
  return (
    <Pressable
      {...props}
      style={[styles.minTarget, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  minTarget: {
    minWidth: 44,
    minHeight: 44,
  },
});
