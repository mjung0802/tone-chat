import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface TypingIndicatorProps {
  userNames: string[];
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  const theme = useTheme();

  let text: string | null = null;
  if (userNames.length === 1) {
    text = `${userNames[0]} is typing...`;
  } else if (userNames.length === 2) {
    text = `${userNames[0]} and ${userNames[1]} are typing...`;
  } else if (userNames.length > 2) {
    text = 'Several people are typing...';
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={text ?? undefined}
    >
      {text ? (
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant, opacity: 0.7 }}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    minHeight: 16,
  },
});
