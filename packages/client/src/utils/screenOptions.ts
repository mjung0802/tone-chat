import { StyleSheet } from 'react-native';
import type { MD3Theme } from 'react-native-paper';

export function getDefaultScreenOptions(theme: MD3Theme) {
  return {
    contentStyle: { backgroundColor: theme.colors.background },
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
    } as Record<string, unknown>,
    headerTintColor: theme.colors.onSurface,
  } as const;
}
