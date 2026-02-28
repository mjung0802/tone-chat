import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface TypingIndicatorProps {
  userNames: string[];
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  if (userNames.length === 0) return null;

  let text: string;
  if (userNames.length === 1) {
    text = `${userNames[0]} is typing...`;
  } else if (userNames.length === 2) {
    text = `${userNames[0]} and ${userNames[1]} are typing...`;
  } else {
    text = 'Several people are typing...';
  }

  const theme = useTheme();

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={text}
    >
      <Text
        variant="labelSmall"
        style={{ color: theme.colors.onSurfaceVariant, opacity: 0.7 }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 20,
  },
});
