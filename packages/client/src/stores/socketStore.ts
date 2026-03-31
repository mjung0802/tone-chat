import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types';
import { useInstanceStore, DEFAULT_INSTANCE_URL } from './instanceStore';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketState {
  socket: TypedSocket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  updateToken: (token: string) => void;
}

const getSocketUrl = () => useInstanceStore.getState().activeInstance ?? DEFAULT_INSTANCE_URL;

export const useSocketStore = create<SocketState>((set, get) => {
  // Subscribe to instanceStore: reconnect if activeInstance changes while connected
  useInstanceStore.subscribe((state, prevState) => {
    if (state.activeInstance === prevState.activeInstance) return;
    const { socket } = get();
    if (!socket) return;
    // Capture current token before disconnecting
    const currentToken = (socket.auth as { token?: string }).token;
    socket.disconnect();
    if (currentToken) {
      get().connect(currentToken);
    }
  });

  return {
    socket: null,
    isConnected: false,

    connect: (token: string) => {
      const existing = get().socket;
      if (existing?.connected) return;

      // Disconnect any stale socket
      existing?.disconnect();

      const socket: TypedSocket = io(getSocketUrl(), {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        set({ isConnected: true });
      });

      socket.on('disconnect', () => {
        set({ isConnected: false });
      });

      set({ socket });
    },

    disconnect: () => {
      const { socket } = get();
      socket?.disconnect();
      set({ socket: null, isConnected: false });
    },

    updateToken: (token: string) => {
      const { socket } = get();
      if (socket) {
        (socket.auth as { token: string }).token = token;
        if (!socket.connected) {
          socket.connect();
        }
      }
    },
  };
});
