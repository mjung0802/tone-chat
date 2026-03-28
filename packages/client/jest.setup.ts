import '@testing-library/react-native/build/matchers/extend-expect';
import { Platform } from 'react-native';

// Force web platform so authStore uses localStorage instead of dynamic import('expo-secure-store')
// which isn't supported in Jest's VM without --experimental-vm-modules
Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

// Polyfill localStorage for jest-expo (RN environment doesn't have it)
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    auth: {},
  })),
}));

// Mock expo-secure-store (kept for any direct imports)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Use fake timers so clearAllTimers actually clears React's scheduler timers
// (setTimeout / setInterval) that keep the worker process alive after tests finish
jest.useFakeTimers();

afterEach(() => {
  jest.clearAllTimers();
});

// Silence noisy warnings in test output
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('VirtualizedLists should never be nested')) return;
  if (msg.includes('not wrapped in act')) return;
  originalConsoleError(...args);
};
