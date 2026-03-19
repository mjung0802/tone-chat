import type { ColorPalette } from './colors';
import { lightColors, darkColors } from './colors';

export type ThemeId = 'default' | 'softboy' | 'major' | 'high' | 'emotion' | 'vibe' | 'afters';

export interface ThemePreset {
  label: string;
  accent: string;
  light: ColorPalette;
  dark: ColorPalette;
}

// Shared semantic colors — consistent across all themes
const sharedError = {
  light: { error: '#BA1A1A', onError: '#FFFFFF', errorContainer: '#FFDAD6', onErrorContainer: '#410002' },
  dark: { error: '#FFB4AB', onError: '#690005', errorContainer: '#93000A', onErrorContainer: '#FFDAD6' },
};

const sharedSuccess = {
  light: { success: '#2E7D32', onSuccess: '#FFFFFF' },
  dark: { success: '#81C784', onSuccess: '#1B5E20' },
};

export const themePresets: Record<ThemeId, ThemePreset> = {
  default: {
    label: 'Default',
    accent: '#1565C0',
    light: lightColors,
    dark: darkColors,
  },

  softboy: {
    label: 'Softboy',
    accent: '#87B1E6',
    light: {
      primary: '#3A6FA8',         // Darkened soft blue — 4.6:1 on white
      onPrimary: '#FFFFFF',
      primaryContainer: '#D4E4F7',
      onPrimaryContainer: '#0A2744',

      secondary: '#586577',       // 5.1:1 on white
      onSecondary: '#FFFFFF',
      secondaryContainer: '#DCE6F2',
      onSecondaryContainer: '#151E2B',

      tertiary: '#6E5B7B',        // 5.0:1 on white
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#F5DCFF',
      onTertiaryContainer: '#281634',

      ...sharedError.light,
      ...sharedSuccess.light,

      background: '#FAFCFF',
      onBackground: '#1A1C1E',
      surface: '#FAFCFF',
      onSurface: '#1A1C1E',
      surfaceVariant: '#DDE2EB',
      onSurfaceVariant: '#42474F',

      outline: '#72777F',
      outlineVariant: '#C2C7D0',
      inverseSurface: '#2F3033',
      inverseOnSurface: '#F1F0F4',
      inversePrimary: '#A8CCFA',

      elevation: {
        level0: 'transparent',
        level1: '#EEF3FA',
        level2: '#E7EEF7',
        level3: '#E0E9F4',
        level4: '#DEE7F2',
        level5: '#D9E3EF',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(44, 49, 55, 0.4)',
    },
    dark: {
      primary: '#87B1E6',         // Soft blue — 7.8:1 on dark bg
      onPrimary: '#0E3B6A',
      primaryContainer: '#265A8E',
      onPrimaryContainer: '#D4E4F7',

      secondary: '#BCC8DC',       // 10.0:1 on dark bg
      onSecondary: '#263241',
      secondaryContainer: '#3D4858',
      onSecondaryContainer: '#DCE6F2',

      tertiary: '#D8BDE8',        // 9.0:1 on dark bg
      onTertiary: '#3D2A4A',
      tertiaryContainer: '#554162',
      onTertiaryContainer: '#F5DCFF',

      ...sharedError.dark,
      ...sharedSuccess.dark,

      background: '#1A1C1E',
      onBackground: '#E3E2E6',
      surface: '#1A1C1E',
      onSurface: '#E3E2E6',
      surfaceVariant: '#42474F',
      onSurfaceVariant: '#C2C7D0',

      outline: '#8C9199',
      outlineVariant: '#42474F',
      inverseSurface: '#E3E2E6',
      inverseOnSurface: '#2F3033',
      inversePrimary: '#3A6FA8',

      elevation: {
        level0: 'transparent',
        level1: '#20262E',
        level2: '#252B34',
        level3: '#2A313B',
        level4: '#2C333D',
        level5: '#2F3742',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(44, 49, 55, 0.4)',
    },
  },

  major: {
    label: 'Major',
    accent: '#EC78FF',
    light: {
      primary: '#8B2FA0',         // Darkened magenta — 5.0:1 on white
      onPrimary: '#FFFFFF',
      primaryContainer: '#F8D8FF',
      onPrimaryContainer: '#34003F',

      secondary: '#6B5870',       // 5.2:1 on white
      onSecondary: '#FFFFFF',
      secondaryContainer: '#F3DBF8',
      onSecondaryContainer: '#25152A',

      tertiary: '#815343',        // 5.0:1 on white
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#FFDBD0',
      onTertiaryContainer: '#321206',

      ...sharedError.light,
      ...sharedSuccess.light,

      background: '#FFFBFF',
      onBackground: '#1E1A1E',
      surface: '#FFFBFF',
      onSurface: '#1E1A1E',
      surfaceVariant: '#ECDFE5',
      onSurfaceVariant: '#4D4349',

      outline: '#7F747A',
      outlineVariant: '#D0C3CA',
      inverseSurface: '#332F33',
      inverseOnSurface: '#F7EEF3',
      inversePrimary: '#E8B0FF',

      elevation: {
        level0: 'transparent',
        level1: '#F8F0F6',
        level2: '#F4EAF2',
        level3: '#F0E4EE',
        level4: '#EEE2EC',
        level5: '#EBDEE9',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(50, 44, 50, 0.4)',
    },
    dark: {
      primary: '#EC78FF',         // Bright magenta — 6.2:1 on dark bg
      onPrimary: '#560067',
      primaryContainer: '#733088',
      onPrimaryContainer: '#F8D8FF',

      secondary: '#D6BFDC',       // 9.5:1 on dark bg
      onSecondary: '#3B2A40',
      secondaryContainer: '#534058',
      onSecondaryContainer: '#F3DBF8',

      tertiary: '#F5B9A6',        // 9.1:1 on dark bg
      onTertiary: '#4C2519',
      tertiaryContainer: '#663C2D',
      onTertiaryContainer: '#FFDBD0',

      ...sharedError.dark,
      ...sharedSuccess.dark,

      background: '#1E1A1E',
      onBackground: '#E9E0E5',
      surface: '#1E1A1E',
      onSurface: '#E9E0E5',
      surfaceVariant: '#4D4349',
      onSurfaceVariant: '#D0C3CA',

      outline: '#998D93',
      outlineVariant: '#4D4349',
      inverseSurface: '#E9E0E5',
      inverseOnSurface: '#332F33',
      inversePrimary: '#8B2FA0',

      elevation: {
        level0: 'transparent',
        level1: '#272027',
        level2: '#2D252D',
        level3: '#332A33',
        level4: '#352C35',
        level5: '#392F39',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(50, 44, 50, 0.4)',
    },
  },

  high: {
    label: 'High',
    accent: '#D5F377',
    light: {
      primary: '#4A6600',         // Darkened lime — 4.7:1 on white
      onPrimary: '#FFFFFF',
      primaryContainer: '#C9E89A',
      onPrimaryContainer: '#142000',

      secondary: '#5B6146',       // 5.0:1 on white
      onSecondary: '#FFFFFF',
      secondaryContainer: '#DFE6C3',
      onSecondaryContainer: '#181E08',

      tertiary: '#3A665D',        // 4.5:1 on white
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#BDECD9',
      onTertiaryContainer: '#00201B',

      ...sharedError.light,
      ...sharedSuccess.light,

      background: '#FDFCF5',
      onBackground: '#1B1C17',
      surface: '#FDFCF5',
      onSurface: '#1B1C17',
      surfaceVariant: '#E2E4D4',
      onSurfaceVariant: '#45483C',

      outline: '#76786B',
      outlineVariant: '#C6C8B9',
      inverseSurface: '#30312C',
      inverseOnSurface: '#F2F1EA',
      inversePrimary: '#B6D97A',

      elevation: {
        level0: 'transparent',
        level1: '#F3F3E8',
        level2: '#EDEDE1',
        level3: '#E7E8DA',
        level4: '#E5E6D7',
        level5: '#E1E2D3',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(44, 46, 40, 0.4)',
    },
    dark: {
      primary: '#D5F377',         // Lime green — 12.5:1 on dark bg
      onPrimary: '#253600',
      primaryContainer: '#374E00',
      onPrimaryContainer: '#C9E89A',

      secondary: '#C3C9A8',       // 10.2:1 on dark bg
      onSecondary: '#2D331B',
      secondaryContainer: '#434930',
      onSecondaryContainer: '#DFE6C3',

      tertiary: '#A1D0BE',        // 10.3:1 on dark bg
      onTertiary: '#063730',
      tertiaryContainer: '#224E46',
      onTertiaryContainer: '#BDECD9',

      ...sharedError.dark,
      ...sharedSuccess.dark,

      background: '#1B1C17',
      onBackground: '#E4E3DC',
      surface: '#1B1C17',
      onSurface: '#E4E3DC',
      surfaceVariant: '#45483C',
      onSurfaceVariant: '#C6C8B9',

      outline: '#909284',
      outlineVariant: '#45483C',
      inverseSurface: '#E4E3DC',
      inverseOnSurface: '#30312C',
      inversePrimary: '#4A6600',

      elevation: {
        level0: 'transparent',
        level1: '#22241C',
        level2: '#272921',
        level3: '#2C2F26',
        level4: '#2E3128',
        level5: '#31342B',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(44, 46, 40, 0.4)',
    },
  },

  emotion: {
    label: 'Emotion',
    accent: '#DFBAF9',
    light: {
      primary: '#7340A0',         // Darkened lavender — 4.8:1 on white
      onPrimary: '#FFFFFF',
      primaryContainer: '#EDDCFF',
      onPrimaryContainer: '#2A0050',

      secondary: '#655A6E',       // 5.0:1 on white
      onSecondary: '#FFFFFF',
      secondaryContainer: '#ECDDF6',
      onSecondaryContainer: '#201829',

      tertiary: '#805064',        // 4.6:1 on white
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#FFD8E7',
      onTertiaryContainer: '#330F20',

      ...sharedError.light,
      ...sharedSuccess.light,

      background: '#FFFBFF',
      onBackground: '#1D1A20',
      surface: '#FFFBFF',
      onSurface: '#1D1A20',
      surfaceVariant: '#E8E0EB',
      onSurfaceVariant: '#4A444E',

      outline: '#7B757F',
      outlineVariant: '#CCC4CF',
      inverseSurface: '#322F35',
      inverseOnSurface: '#F5EFF5',
      inversePrimary: '#D8B4FF',

      elevation: {
        level0: 'transparent',
        level1: '#F7F0FA',
        level2: '#F2EBF7',
        level3: '#EDE5F3',
        level4: '#EBE3F2',
        level5: '#E8DFEF',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(50, 44, 54, 0.4)',
    },
    dark: {
      primary: '#DFBAF9',         // Light lavender — 8.8:1 on dark bg
      onPrimary: '#43116E',
      primaryContainer: '#5B2987',
      onPrimaryContainer: '#EDDCFF',

      secondary: '#D0C1DA',       // 9.6:1 on dark bg
      onSecondary: '#362D3E',
      secondaryContainer: '#4D4356',
      onSecondaryContainer: '#ECDDF6',

      tertiary: '#F0B7CC',        // 9.0:1 on dark bg
      onTertiary: '#4D2235',
      tertiaryContainer: '#66384C',
      onTertiaryContainer: '#FFD8E7',

      ...sharedError.dark,
      ...sharedSuccess.dark,

      background: '#1D1A20',
      onBackground: '#E7E0E7',
      surface: '#1D1A20',
      onSurface: '#E7E0E7',
      surfaceVariant: '#4A444E',
      onSurfaceVariant: '#CCC4CF',

      outline: '#959099',
      outlineVariant: '#4A444E',
      inverseSurface: '#E7E0E7',
      inverseOnSurface: '#322F35',
      inversePrimary: '#7340A0',

      elevation: {
        level0: 'transparent',
        level1: '#262128',
        level2: '#2B262E',
        level3: '#302B34',
        level4: '#322D36',
        level5: '#35303A',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(50, 44, 54, 0.4)',
    },
  },

  vibe: {
    label: 'Vibe',
    accent: '#977AEF',
    light: {
      primary: '#5B3DBD',         // Darkened purple — 5.6:1 on white
      onPrimary: '#FFFFFF',
      primaryContainer: '#E3DEFF',
      onPrimaryContainer: '#1A0060',

      secondary: '#5F5C71',       // 5.0:1 on white
      onSecondary: '#FFFFFF',
      secondaryContainer: '#E5DFF9',
      onSecondaryContainer: '#1C192B',

      tertiary: '#7B5264',        // 4.7:1 on white
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#FFD8E8',
      onTertiaryContainer: '#301020',

      ...sharedError.light,
      ...sharedSuccess.light,

      background: '#FFFBFF',
      onBackground: '#1C1B1F',
      surface: '#FFFBFF',
      onSurface: '#1C1B1F',
      surfaceVariant: '#E6E0EC',
      onSurfaceVariant: '#48454E',

      outline: '#797487',
      outlineVariant: '#C9C4D0',
      inverseSurface: '#313034',
      inverseOnSurface: '#F4EFF4',
      inversePrimary: '#C7BFFF',

      elevation: {
        level0: 'transparent',
        level1: '#F5F0FA',
        level2: '#F0EAF7',
        level3: '#ECE5F3',
        level4: '#EAE3F2',
        level5: '#E7DFEF',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(48, 44, 54, 0.4)',
    },
    dark: {
      primary: '#977AEF',         // Purple — 5.4:1 on dark bg
      onPrimary: '#2E0F8A',
      primaryContainer: '#4527A4',
      onPrimaryContainer: '#E3DEFF',

      secondary: '#C8C3DC',       // 9.8:1 on dark bg
      onSecondary: '#312E41',
      secondaryContainer: '#484459',
      onSecondaryContainer: '#E5DFF9',

      tertiary: '#ECB8CD',        // 8.7:1 on dark bg
      onTertiary: '#492535',
      tertiaryContainer: '#623B4C',
      onTertiaryContainer: '#FFD8E8',

      ...sharedError.dark,
      ...sharedSuccess.dark,

      background: '#1C1B1F',
      onBackground: '#E5E1E6',
      surface: '#1C1B1F',
      onSurface: '#E5E1E6',
      surfaceVariant: '#48454E',
      onSurfaceVariant: '#C9C4D0',

      outline: '#938F99',
      outlineVariant: '#48454E',
      inverseSurface: '#E5E1E6',
      inverseOnSurface: '#313034',
      inversePrimary: '#5B3DBD',

      elevation: {
        level0: 'transparent',
        level1: '#252329',
        level2: '#2A282F',
        level3: '#2F2D36',
        level4: '#312F38',
        level5: '#34323C',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(48, 44, 54, 0.4)',
    },
  },

  afters: {
    label: 'Afters',
    accent: '#010329',
    light: {
      primary: '#1A1E5C',         // Deep navy — 9.6:1 on white
      onPrimary: '#FFFFFF',
      primaryContainer: '#DDE1FF',
      onPrimaryContainer: '#000B3E',

      secondary: '#5B5D72',       // 5.0:1 on white
      onSecondary: '#FFFFFF',
      secondaryContainer: '#E0E1FA',
      onSecondaryContainer: '#181A2C',

      tertiary: '#775570',        // 4.6:1 on white
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#FFD7F5',
      onTertiaryContainer: '#2D122A',

      ...sharedError.light,
      ...sharedSuccess.light,

      background: '#FAFBFF',
      onBackground: '#1A1B21',
      surface: '#FAFBFF',
      onSurface: '#1A1B21',
      surfaceVariant: '#E2E1EC',
      onSurfaceVariant: '#45454F',

      outline: '#767680',
      outlineVariant: '#C6C5D0',
      inverseSurface: '#2F3036',
      inverseOnSurface: '#F1F0F9',
      inversePrimary: '#B8C3FF',

      elevation: {
        level0: 'transparent',
        level1: '#F0F0FA',
        level2: '#EAEBF6',
        level3: '#E3E4F3',
        level4: '#E1E2F1',
        level5: '#DDDEEE',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(44, 44, 54, 0.4)',
    },
    dark: {
      primary: '#8090C0',         // Lighter navy — 5.5:1 on deep navy bg
      onPrimary: '#0A1250',
      primaryContainer: '#283170',
      onPrimaryContainer: '#DDE1FF',

      secondary: '#C4C5DD',       // 8.7:1 on deep navy bg
      onSecondary: '#2D2F42',
      secondaryContainer: '#444559',
      onSecondaryContainer: '#E0E1FA',

      tertiary: '#E5BAD8',        // 8.3:1 on deep navy bg
      onTertiary: '#44263F',
      tertiaryContainer: '#5D3C57',
      onTertiaryContainer: '#FFD7F5',

      ...sharedError.dark,
      ...sharedSuccess.dark,

      background: '#0C0E22',       // Deep navy background
      onBackground: '#E3E1EC',
      surface: '#0C0E22',
      onSurface: '#E3E1EC',
      surfaceVariant: '#45454F',
      onSurfaceVariant: '#C6C5D0',

      outline: '#908F9A',
      outlineVariant: '#45454F',
      inverseSurface: '#E3E1EC',
      inverseOnSurface: '#2F3036',
      inversePrimary: '#1A1E5C',

      elevation: {
        level0: 'transparent',
        level1: '#151829',
        level2: '#1A1D30',
        level3: '#1F2237',
        level4: '#21243A',
        level5: '#24273F',
      },

      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(44, 44, 54, 0.4)',
    },
  },
};

export const THEME_IDS = Object.keys(themePresets) as ThemeId[];
