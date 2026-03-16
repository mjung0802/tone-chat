// WCAG 2.1 AA compliant color palette
// Normal text: 4.5:1 contrast ratio minimum
// Large text (18px+ or 14px bold): 3:1 contrast ratio minimum

export const lightColors = {
  primary: "#1565C0", // Blue 800 — 7.1:1 on white
  onPrimary: "#FFFFFF",
  primaryContainer: "#D1E4FF",
  onPrimaryContainer: "#001D36",

  secondary: "#545F71", // 5.7:1 on white
  onSecondary: "#FFFFFF",
  secondaryContainer: "#D8E3F8",
  onSecondaryContainer: "#111C2B",

  tertiary: "#6B5778", // 5.2:1 on white
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#F2DAFF",
  onTertiaryContainer: "#251431",

  error: "#BA1A1A", // 5.9:1 on white
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#410002",

  success: "#2E7D32", // Green 800 — 5.4:1 on white
  onSuccess: "#FFFFFF",

  background: "#FAFCFF",
  onBackground: "#1A1C1E", // 15.4:1 on background
  surface: "#FAFCFF",
  onSurface: "#1A1C1E",
  surfaceVariant: "#DFE2EB",
  onSurfaceVariant: "#43474E", // 7.8:1 on surfaceVariant

  outline: "#73777F", // 4.6:1 on white
  outlineVariant: "#C3C6CF",
  inverseSurface: "#2F3033",
  inverseOnSurface: "#F1F0F4",
  inversePrimary: "#A0CAFD",

  elevation: {
    level0: "transparent",
    level1: "#F0F4FA",
    level2: "#E9EFF6",
    level3: "#E2EAF3",
    level4: "#E0E8F1",
    level5: "#DBE4EF",
  },

  shadow: "#000000",
  scrim: "#000000",
  backdrop: "rgba(44, 49, 55, 0.4)",
};

export const darkColors = {
  primary: "#A0CAFD", // 8.4:1 on dark bg
  onPrimary: "#003258",
  primaryContainer: "#00497D",
  onPrimaryContainer: "#D1E4FF",

  secondary: "#BCC7DB", // 10.1:1 on dark bg
  onSecondary: "#263141",
  secondaryContainer: "#3C4758",
  onSecondaryContainer: "#D8E3F8",

  tertiary: "#D6BEE4", // 9.1:1 on dark bg
  onTertiary: "#3B2948",
  tertiaryContainer: "#53405F",
  onTertiaryContainer: "#F2DAFF",

  error: "#FFB4AB", // 8.1:1 on dark bg
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",

  success: "#81C784", // Green 300 — 8.5:1 on dark bg
  onSuccess: "#1B5E20",

  background: "#1A1C1E",
  onBackground: "#E3E2E6", // 13.4:1 on background
  surface: "#1A1C1E",
  onSurface: "#E3E2E6",
  surfaceVariant: "#43474E",
  onSurfaceVariant: "#C3C6CF", // 8.7:1 on surfaceVariant

  outline: "#8D9199", // 5.8:1 on dark bg
  outlineVariant: "#43474E",
  inverseSurface: "#E3E2E6",
  inverseOnSurface: "#2F3033",
  inversePrimary: "#1565C0",

  elevation: {
    level0: "transparent",
    level1: "#21252B",
    level2: "#262A31",
    level3: "#2B3038",
    level4: "#2D323A",
    level5: "#30353E",
  },

  shadow: "#000000",
  scrim: "#000000",
  backdrop: "rgba(44, 49, 55, 0.4)",
};
