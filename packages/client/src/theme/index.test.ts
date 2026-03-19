import { buildTheme, lightTheme, darkTheme } from './index';
import { THEME_IDS } from './presets';

describe('buildTheme', () => {
  const modes = ['light', 'dark'] as const;

  for (const id of THEME_IDS) {
    for (const mode of modes) {
      it(`returns a valid theme for ${id}/${mode}`, () => {
        const theme = buildTheme(id, mode);
        expect(typeof theme.colors.primary).toBe('string');
        expect(typeof theme.colors.background).toBe('string');
        expect(theme.fonts).toBeDefined();
        expect(theme.colors.error).toBeDefined();
        expect(theme.colors.surface).toBeDefined();
      });
    }
  }

  it('buildTheme("default", "light") matches exported lightTheme', () => {
    expect(buildTheme('default', 'light')).toEqual(lightTheme);
  });

  it('buildTheme("default", "dark") matches exported darkTheme', () => {
    expect(buildTheme('default', 'dark')).toEqual(darkTheme);
  });
});
