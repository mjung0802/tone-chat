# theme/

- **colors.ts** — `lightColors`, `darkColors` — WCAG 2.1 AA palettes (4.5:1+ contrast): primary, secondary, tertiary, error, success, surface colors
- **index.ts** — `buildTheme()`, `lightTheme`, `darkTheme`, `AppTheme` type — Material Design 3 theme builder
- **presets.ts** — `themePresets` record with 7 themes: default, softboy, major, high, emotion, vibe, afters; each has light/dark palettes + accent color. Exports `THEME_IDS`, `ThemeId`
- **typography.ts** — `fonts` — MD3 typography scale (12 levels: displayLarge→labelSmall); dynamic scaling to 200%; min 16px body
- **index.test.ts** — unit tests for theme builder
