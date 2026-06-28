import { create } from "zustand";
import type { Socket } from "socket.io-client";

export interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  socket: Socket | null;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  setSocket: (socket: Socket | null) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  connected: false,
  connecting: false,
  error: null,
  socket: null,
  setConnected: (connected) => set({ connected }),
  setConnecting: (connecting) => set({ connecting }),
  setError: (error) => set({ error }),
  setSocket: (socket) => set({ socket }),
}));
