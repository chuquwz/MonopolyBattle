"use client";

import * as React from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/types/socket.types";
import type { GameStateSyncPayload } from "@/types/socket.types";

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  gameState: GameStateSyncPayload | null;
  joinRoom: (roomCode: string, teamName: string, playerName: string) => void;
  submitDecision: (decisionType: string) => void;
  submitQuizAnswer: (questionId: string, selectedOption: number, timeTakenMs: number) => void;
}

export const SocketContext = React.createContext<SocketContextType | undefined>(undefined);

export interface SocketProviderProps {
  children: React.ReactNode;
  url?: string;
}

export function SocketProvider({ children, url }: SocketProviderProps) {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [gameState, setGameState] = React.useState<GameStateSyncPayload | null>(null);

  React.useEffect(() => {
    const socketInstance = getSocket(url);
    if (!socketInstance) return;

    setSocket(socketInstance);
    
    // Connect automatically on mount if client-side
    socketInstance.connect();

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onGameStateSync = (payload: GameStateSyncPayload) => {
      setGameState(payload);
    };

    const onGamePhaseChange = (data: { phase: GameStateSyncPayload["phase"]; currentRound: number }) => {
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          phase: data.phase,
          currentRound: data.currentRound,
        };
      });
    };

    const onRoundTick = (data: { secondsLeft: number }) => {
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          roundTimeLeft: data.secondsLeft,
        };
      });
    };

    const onGameCountdown = (data: { secondsLeft: number }) => {
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          roundTimeLeft: data.secondsLeft,
        };
      });
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on(SOCKET_EVENTS.GAME_STATE_SYNC, onGameStateSync);
    socketInstance.on(SOCKET_EVENTS.GAME_PHASE_CHANGE, onGamePhaseChange);
    socketInstance.on(SOCKET_EVENTS.ROUND_TICK, onRoundTick);
    socketInstance.on(SOCKET_EVENTS.GAME_COUNTDOWN, onGameCountdown);

    if (socketInstance.connected) {
      setIsConnected(true);
    }

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off(SOCKET_EVENTS.GAME_STATE_SYNC, onGameStateSync);
      socketInstance.off(SOCKET_EVENTS.GAME_PHASE_CHANGE, onGamePhaseChange);
      socketInstance.off(SOCKET_EVENTS.ROUND_TICK, onRoundTick);
      socketInstance.off(SOCKET_EVENTS.GAME_COUNTDOWN, onGameCountdown);
      socketInstance.disconnect();
    };
  }, [url]);

  const joinRoom = React.useCallback(
    (roomCode: string, teamName: string, playerName: string) => {
      if (socket && isConnected) {
        socket.emit(SOCKET_EVENTS.PLAYER_JOIN, {
          roomCode: roomCode.toUpperCase(),
          teamName,
          playerName,
        });
      }
    },
    [socket, isConnected]
  );

  const submitDecision = React.useCallback(
    (decisionType: string) => {
      if (socket && isConnected && gameState) {
        const roundId = "current"; // Will be populated based on server round tracking
        const teamId = gameState.myTeam?.id || "";
        socket.emit(SOCKET_EVENTS.PLAYER_DECISION, {
          roundId,
          teamId,
          decisionType,
        });
      }
    },
    [socket, isConnected, gameState]
  );

  const submitQuizAnswer = React.useCallback(
    (questionId: string, selectedOption: number, timeTakenMs: number) => {
      if (socket && isConnected && gameState) {
        const roundId = "current";
        const teamId = gameState.myTeam?.id || "";
        socket.emit(SOCKET_EVENTS.PLAYER_QUIZ_ANSWER, {
          roundId,
          teamId,
          questionId,
          selectedOption,
          timeTakenMs,
        });
      }
    },
    [socket, isConnected, gameState]
  );

  const value = React.useMemo(
    () => ({
      socket,
      isConnected,
      gameState,
      joinRoom,
      submitDecision,
      submitQuizAnswer,
    }),
    [socket, isConnected, gameState, joinRoom, submitDecision, submitQuizAnswer]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
