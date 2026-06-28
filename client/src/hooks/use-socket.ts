import { useContext } from "react";
import { SocketContext } from "@/providers/socket-provider";

/**
 * Custom hook to consume the SocketContext.
 */
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
