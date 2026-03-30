import { create } from 'zustand';
import { Platform } from 'react-native';

interface InstanceState {
  instances: string[];
  activeInstance: string | null;
  isHydrated: boolean;
  addInstance: (url: string) => void;
  setActiveInstance: (url: string) => void;
  removeInstance: (url: string) => void;
  hydrate: () => Promise<void>;
}

function normalizeUrl(url: string): string {
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

async function loadInstances(): Promise<{ instances: string[]; activeInstance: string | null }> {
  if (Platform.OS === 'web') {
    const raw = localStorage.getItem('instances');
    const instances = raw ? (JSON.parse(raw) as string[]) : [];
    const activeInstance = localStorage.getItem('activeInstance');
    return { instances, activeInstance };
  }
  const SecureStore = await import('expo-secure-store');
  const raw = await SecureStore.getItemAsync('instances');
  const instances = raw ? (JSON.parse(raw) as string[]) : [];
  const activeInstance = await SecureStore.getItemAsync('activeInstance');
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
    set({ activeInstance: url });
    void persistInstances(get().instances, url);
  },

  removeInstance: (url: string) => {
    const { instances, activeInstance } = get();
    const updated = instances.filter((u) => u !== url);
    const newActive = activeInstance === url ? null : activeInstance;
    set({ instances: updated, activeInstance: newActive });
    void persistInstances(updated, newActive);
  },

  hydrate: async () => {
    const { instances, activeInstance } = await loadInstances();
    set({ instances, activeInstance, isHydrated: true });
  },
}));
