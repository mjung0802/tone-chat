import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

interface LoadingSpinnerProps {
  message?: string | undefined;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'Loading'}
    >
      <ActivityIndicator size="large" />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    marginTop: 16,
  },
});
