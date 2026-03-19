import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { fonts } from './typography';
import { themePresets, type ThemeId } from './presets';

export type { ThemeId } from './presets';

export function buildTheme(themeId: ThemeId, mode: 'light' | 'dark') {
  const preset = themePresets[themeId];
  const base = mode === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const colors = mode === 'dark' ? preset.dark : preset.light;
  return { ...base, colors: { ...base.colors, ...colors }, fonts: { ...base.fonts, ...fonts } };
}

// Backward-compatible exports
export const lightTheme = buildTheme('default', 'light');
export const darkTheme = buildTheme('default', 'dark');
export type AppTheme = typeof lightTheme;
