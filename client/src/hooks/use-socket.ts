import { useSocketStore } from "@/stores/socket.store";

/**
 * Custom hook to consume the Socket connection state from Zustand store.
 */
export function useSocket() {
  const socket = useSocketStore((s) => s.socket);
  const connected = useSocketStore((s) => s.connected);
  const connecting = useSocketStore((s) => s.connecting);
  const error = useSocketStore((s) => s.error);

  return {
    socket,
    isConnected: connected,
    isConnecting: connecting,
    error,
  };
}
