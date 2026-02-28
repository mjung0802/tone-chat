import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketState {
  socket: TypedSocket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  updateToken: (token: string) => void;
}

const SOCKET_URL = 'http://localhost:4000';

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token: string) => {
    const existing = get().socket;
    if (existing?.connected) return;

    // Disconnect any stale socket
    existing?.disconnect();

    const socket: TypedSocket = io(SOCKET_URL, {
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
}));
