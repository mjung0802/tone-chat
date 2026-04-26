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

// Mock react-native-reanimated — the real mock pulls in window.matchMedia
// which isn't available in Jest's JSDOM-lite env.
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, Image } = require('react-native');
  const NOOP = () => {};
  function ID(t: unknown) { return t; }
  return {
    __esModule: true,
    default: {
      View,
      Text,
      Image,
      createAnimatedComponent: ID,
    },
    useSharedValue: (init: unknown) => ({ value: init }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (toValue: unknown) => toValue,
    withRepeat: ID,
    withSequence: () => 0,
    withDelay: (_delay: number, next: unknown) => next,
    cancelAnimation: NOOP,
    useReducedMotion: jest.fn(() => false),
    Easing: {
      linear: ID,
      ease: ID,
      quad: ID,
      cubic: ID,
      in: ID,
      out: ID,
      inOut: ID,
      bezier: () => ({ factory: ID }),
      back: ID,
      bounce: ID,
      elastic: ID,
      poly: ID,
      sin: ID,
      circle: ID,
      exp: ID,
      steps: ID,
      bezierFn: ID,
    },
  };
});

// Use fake timers so clearAllTimers actually clears React's scheduler timers
// (setTimeout / setInterval) that keep the worker process alive after tests finish
jest.useFakeTimers();

afterEach(() => {
  jest.clearAllTimers();
});

// Silence noisy warnings in test output
// eslint-disable-next-line no-console
const originalConsoleError = console.error;
// eslint-disable-next-line no-console
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('VirtualizedLists should never be nested')) return;
  if (msg.includes('not wrapped in act')) return;
  originalConsoleError(...args);
};
