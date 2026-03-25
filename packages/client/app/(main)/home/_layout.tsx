import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function HomeLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outlineVariant } as Record<string, unknown>,
        headerTintColor: theme.colors.onSurface,
      }}
    />
  );
}
