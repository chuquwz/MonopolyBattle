import { io, type Socket } from "socket.io-client";
import { STORAGE_KEYS } from "./constants";

let socketInstance: Socket | null = null;

/**
 * Returns the client-side Socket.IO instance. 
 * Prevents multiple instantiations during HMR and handles SSR safety.
 */
export function getSocket(url?: string): Socket | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!socketInstance) {
    const targetUrl = url || process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
    socketInstance = io(targetUrl, {
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ["websocket"],
    });
  }

  // Retrieve JWT from localStorage and set on socket auth context dynamically
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  socketInstance.auth = { token };

  return socketInstance;
}
