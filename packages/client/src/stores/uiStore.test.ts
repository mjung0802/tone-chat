import { useUiStore, hydrateColorTheme, hydrateUiStore } from './uiStore';

beforeEach(() => {
  useUiStore.setState({ colorTheme: 'default', lastViewedChannels: {} });
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

describe('uiStore lastViewedChannels', () => {
  it('setLastViewedChannel updates state for the given serverId', () => {
    useUiStore.getState().setLastViewedChannel('server-1', 'channel-a');
    expect(useUiStore.getState().lastViewedChannels['server-1']).toBe('channel-a');
  });

  it('setLastViewedChannel persists to localStorage as JSON', () => {
    useUiStore.getState().setLastViewedChannel('server-1', 'channel-a');
    const stored = JSON.parse(localStorage.getItem('lastViewedChannels') ?? '{}') as Record<string, string>;
    expect(stored['server-1']).toBe('channel-a');
  });

  it('accumulates entries across multiple servers without overwriting unrelated ones', () => {
    useUiStore.getState().setLastViewedChannel('server-1', 'channel-a');
    useUiStore.getState().setLastViewedChannel('server-2', 'channel-b');
    const state = useUiStore.getState().lastViewedChannels;
    expect(state['server-1']).toBe('channel-a');
    expect(state['server-2']).toBe('channel-b');
  });

  it('hydrateUiStore loads persisted lastViewedChannels from localStorage', async () => {
    localStorage.setItem('lastViewedChannels', JSON.stringify({ 'server-1': 'channel-x' }));
    await hydrateUiStore();
    expect(useUiStore.getState().lastViewedChannels['server-1']).toBe('channel-x');
  });

  it('hydrateUiStore defaults to empty object when nothing is stored', async () => {
    await hydrateUiStore();
    expect(useUiStore.getState().lastViewedChannels).toEqual({});
  });

  it('hydrateUiStore defaults to empty object when stored JSON is malformed', async () => {
    localStorage.setItem('lastViewedChannels', 'not-valid-json{{{');
    await hydrateUiStore();
    expect(useUiStore.getState().lastViewedChannels).toEqual({});
  });
});
