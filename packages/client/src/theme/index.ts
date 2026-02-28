import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { lightColors, darkColors } from './colors';
import { fonts } from './typography';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    ...fonts,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  fonts: {
    ...MD3DarkTheme.fonts,
    ...fonts,
  },
};

export type AppTheme = typeof lightTheme;
