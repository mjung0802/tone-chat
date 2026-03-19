import { useUiStore, hydrateColorTheme } from './uiStore';

beforeEach(() => {
  useUiStore.setState({ colorTheme: 'default' });
  localStorage.clear();
});

describe('uiStore colorTheme', () => {
  it('starts with default color theme', () => {
    expect(useUiStore.getState().colorTheme).toBe('default');
  });

  it('setColorTheme updates state', () => {
    useUiStore.getState().setColorTheme('vibe');
    expect(useUiStore.getState().colorTheme).toBe('vibe');
  });

  it('setColorTheme persists to localStorage', () => {
    useUiStore.getState().setColorTheme('major');
    expect(localStorage.getItem('colorTheme')).toBe('major');
  });

  it('hydrateColorTheme loads persisted value', async () => {
    localStorage.setItem('colorTheme', 'softboy');
    await hydrateColorTheme();
    expect(useUiStore.getState().colorTheme).toBe('softboy');
  });

  it('hydrateColorTheme falls back to default for invalid value', async () => {
    localStorage.setItem('colorTheme', 'nonexistent');
    await hydrateColorTheme();
    expect(useUiStore.getState().colorTheme).toBe('default');
  });
});
