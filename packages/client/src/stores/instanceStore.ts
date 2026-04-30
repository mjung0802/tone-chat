import { create } from 'zustand';
import { Platform } from 'react-native';

interface InstanceState {
  instances: string[];
  activeInstance: string | null;
  isHydrated: boolean;
  addInstance: (url: string) => void;
  setActiveInstance: (url: string) => void;
  clearActiveInstance: () => void;
  removeInstance: (url: string) => void;
  hydrate: () => Promise<void>;
}

export const DEFAULT_INSTANCE_URL = 'http://localhost:4000';

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

async function persistInstances(instances: string[], activeInstance: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem('instances', JSON.stringify(instances));
    if (activeInstance) {
      localStorage.setItem('activeInstance', activeInstance);
    } else {
      localStorage.removeItem('activeInstance');
    }
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync('instances', JSON.stringify(instances));
    if (activeInstance) {
      await SecureStore.setItemAsync('activeInstance', activeInstance);
    } else {
      await SecureStore.deleteItemAsync('activeInstance');
    }
  }
}

function parseInstances(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed as string[];
    }
  } catch {
    // corrupted storage — fall through to empty
  }
  return [];
}

async function loadInstances(): Promise<{ instances: string[]; activeInstance: string | null }> {
  if (Platform.OS === 'web') {
    const instances = parseInstances(localStorage.getItem('instances'));
    const stored = localStorage.getItem('activeInstance');
    const activeInstance = stored && instances.includes(stored) ? stored : null;
    return { instances, activeInstance };
  }
  const SecureStore = await import('expo-secure-store');
  const [instancesRaw, stored] = await Promise.all([
    SecureStore.getItemAsync('instances'),
    SecureStore.getItemAsync('activeInstance'),
  ]);
  const instances = parseInstances(instancesRaw);
  const activeInstance = stored && instances.includes(stored) ? stored : null;
  return { instances, activeInstance };
}

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [],
  activeInstance: null,
  isHydrated: false,

  addInstance: (url: string) => {
    const normalized = normalizeUrl(url);
    const { instances } = get();
    if (instances.includes(normalized)) {
      set({ activeInstance: normalized });
      void persistInstances(instances, normalized);
      return;
    }
    const updated = [...instances, normalized];
    set({ instances: updated, activeInstance: normalized });
    void persistInstances(updated, normalized);
  },

  setActiveInstance: (url: string) => {
    const normalized = normalizeUrl(url);
    set({ activeInstance: normalized });
    void persistInstances(get().instances, normalized);
  },

  clearActiveInstance: () => {
    set({ activeInstance: null });
    void persistInstances(get().instances, null);
  },

  removeInstance: (url: string) => {
    const normalized = normalizeUrl(url);
    const { instances, activeInstance } = get();
    const updated = instances.filter((u) => u !== normalized);
    const newActive = activeInstance === normalized ? null : activeInstance;
    set({ instances: updated, activeInstance: newActive });
    void persistInstances(updated, newActive);
  },

  hydrate: async () => {
    const { instances, activeInstance } = await loadInstances();
    set({ instances, activeInstance, isHydrated: true });
  },
}));
