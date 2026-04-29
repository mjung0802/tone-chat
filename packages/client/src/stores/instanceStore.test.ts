import { useInstanceStore } from './instanceStore';

beforeEach(() => {
  useInstanceStore.setState({
    instances: [],
    activeInstance: null,
    isHydrated: false,
  });
  localStorage.clear();
});

describe('instanceStore', () => {
  describe('addInstance', () => {
    it('adds a URL and sets it active', () => {
      useInstanceStore.getState().addInstance('https://chat.example.com');
      const state = useInstanceStore.getState();
      expect(state.instances).toEqual(['https://chat.example.com']);
      expect(state.activeInstance).toBe('https://chat.example.com');
    });

    it('does not duplicate an existing URL', () => {
      useInstanceStore.getState().addInstance('https://chat.example.com');
      useInstanceStore.getState().addInstance('https://chat.example.com');
      expect(useInstanceStore.getState().instances).toEqual(['https://chat.example.com']);
    });

    it('strips trailing slash from URL', () => {
      useInstanceStore.getState().addInstance('https://chat.example.com/');
      expect(useInstanceStore.getState().instances).toEqual(['https://chat.example.com']);
      expect(useInstanceStore.getState().activeInstance).toBe('https://chat.example.com');
    });

    it('persists to localStorage', () => {
      useInstanceStore.getState().addInstance('https://chat.example.com');
      expect(localStorage.getItem('instances')).toBe(JSON.stringify(['https://chat.example.com']));
      expect(localStorage.getItem('activeInstance')).toBe('https://chat.example.com');
    });
  });

  describe('setActiveInstance', () => {
    it('sets the active instance', () => {
      useInstanceStore.getState().addInstance('https://a.com');
      useInstanceStore.getState().addInstance('https://b.com');
      useInstanceStore.getState().setActiveInstance('https://a.com');
      expect(useInstanceStore.getState().activeInstance).toBe('https://a.com');
    });

    it('persists activeInstance to localStorage', () => {
      useInstanceStore.getState().addInstance('https://a.com');
      useInstanceStore.getState().setActiveInstance('https://a.com');
      expect(localStorage.getItem('activeInstance')).toBe('https://a.com');
    });
  });

  describe('clearActiveInstance', () => {
    it('sets activeInstance to null when one is set', () => {
      useInstanceStore.getState().addInstance('https://a.com');
      useInstanceStore.getState().clearActiveInstance();
      expect(useInstanceStore.getState().activeInstance).toBeNull();
    });

    it('persists null activeInstance and leaves instances JSON intact', () => {
      useInstanceStore.getState().addInstance('https://a.com');
      useInstanceStore.getState().addInstance('https://b.com');
      useInstanceStore.getState().clearActiveInstance();
      expect(localStorage.getItem('activeInstance')).toBeNull();
      expect(localStorage.getItem('instances')).toBe(
        JSON.stringify(['https://a.com', 'https://b.com']),
      );
    });

    it('is a no-op when activeInstance is already null', () => {
      // Pre-state: nothing saved, nothing active
      const before = useInstanceStore.getState();
      expect(before.activeInstance).toBeNull();
      expect(() => useInstanceStore.getState().clearActiveInstance()).not.toThrow();
      const after = useInstanceStore.getState();
      expect(after.activeInstance).toBeNull();
      expect(after.instances).toEqual([]);
    });

    it('preserves the cleared URL in instances and supports re-selecting it', () => {
      useInstanceStore.getState().addInstance('https://a.com');
      useInstanceStore.getState().clearActiveInstance();
      expect(useInstanceStore.getState().instances).toEqual(['https://a.com']);
      useInstanceStore.getState().setActiveInstance('https://a.com');
      expect(useInstanceStore.getState().activeInstance).toBe('https://a.com');
    });

    it('multi-instance: leaves both saved instances in the list', () => {
      useInstanceStore.getState().addInstance('https://a.com');
      useInstanceStore.getState().addInstance('https://b.com');
      useInstanceStore.getState().setActiveInstance('https://a.com');
      useInstanceStore.getState().clearActiveInstance();
      const state = useInstanceStore.getState();
      expect(state.instances).toEqual(['https://a.com', 'https://b.com']);
      expect(state.activeInstance).toBeNull();
    });
  });

  describe('removeInstance', () => {
    it('removes the URL from instances', () => {
      useInstanceStore.getState().addInstance('https://a.com');
      useInstanceStore.getState().addInstance('https://b.com');
      useInstanceStore.getState().removeInstance('https://a.com');
      expect(useInstanceStore.getState().instances).toEqual(['https://b.com']);
    });

    it('clears activeInstance if it was the removed one', () => {
      useInstanceStore.getState().addInstance('https://a.com');
      useInstanceStore.getState().removeInstance('https://a.com');
      expect(useInstanceStore.getState().activeInstance).toBeNull();
    });

    it('removes URL even when trailing slash is passed', () => {
      useInstanceStore.getState().addInstance('https://a.com');
      useInstanceStore.getState().removeInstance('https://a.com/');
      expect(useInstanceStore.getState().instances).toEqual([]);
      expect(useInstanceStore.getState().activeInstance).toBeNull();
    });

    it('keeps activeInstance if a different URL was removed', () => {
      useInstanceStore.getState().addInstance('https://a.com');
      useInstanceStore.getState().addInstance('https://b.com');
      useInstanceStore.getState().setActiveInstance('https://b.com');
      useInstanceStore.getState().removeInstance('https://a.com');
      expect(useInstanceStore.getState().activeInstance).toBe('https://b.com');
    });
  });

  describe('hydrate', () => {
    it('loads instances and activeInstance from localStorage', async () => {
      localStorage.setItem('instances', JSON.stringify(['https://a.com']));
      localStorage.setItem('activeInstance', 'https://a.com');
      await useInstanceStore.getState().hydrate();
      const state = useInstanceStore.getState();
      expect(state.instances).toEqual(['https://a.com']);
      expect(state.activeInstance).toBe('https://a.com');
      expect(state.isHydrated).toBe(true);
    });

    it('handles empty localStorage gracefully', async () => {
      await useInstanceStore.getState().hydrate();
      const state = useInstanceStore.getState();
      expect(state.instances).toEqual([]);
      expect(state.activeInstance).toBeNull();
      expect(state.isHydrated).toBe(true);
    });
  });
});
