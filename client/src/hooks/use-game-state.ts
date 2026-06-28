import { useSocket } from "./use-socket";
import type { GameStateSyncPayload } from "@/types/socket.types";

/**
 * Custom hook to retrieve the current game state synchronizing from Socket.IO client.
 */
export function useGameState(): GameStateSyncPayload | null {
  const { gameState } = useSocket();
  return gameState;
}
