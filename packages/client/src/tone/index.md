# tone/

- **toneRegistry.ts** — `ToneDefinition` interface (key, label, emoji, colorLight, colorDark, textStyle, char?, emojiSet?, driftDir?, matchEmojis?); `BASE_TONES` (9 tones: /j, /s, /srs, /lh, /hj, /pos, /neg, /gen, /t — each with full animation config); `getBaseTone()`, `customToneToDefinition()`, `resolveTone()` (merges custom with base), `parseToneTag()` (extracts tone from message suffix), `resolveToneColor(tone, isDark)` (returns hex color for current theme), `toneTextStyleProps(textStyle)` (maps `ToneTextStyle` → React Native `fontStyle`/`fontWeight` props)
- **toneRegistry.test.ts** — unit tests
