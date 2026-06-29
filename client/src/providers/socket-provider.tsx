"use client";

import * as React from "react";
import { getSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/types/socket.types";
import { useSocketStore } from "@/stores/socket.store";
import { useGameStore } from "@/stores/game.store";
import { useUiStore } from "@/stores/ui.store";

export interface SocketProviderProps {
  children: React.ReactNode;
  url?: string;
}

export function SocketProvider({ children, url }: SocketProviderProps) {
  const { setSocket, setConnected, setConnecting, setError } = useSocketStore();

  React.useEffect(() => {
    // Get singleton Socket.IO client instance
    const socketInstance = getSocket(url);
    if (!socketInstance) return;

    // Set socket instance in Zustand store
    setSocket(socketInstance);
    setConnecting(true);

    // Establish WebSocket connection
    socketInstance.connect();

    // Connection events
    const onConnect = () => {
      setConnected(true);
      setConnecting(false);
      setError(null);
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onConnectError = (err: Error) => {
      setConnected(false);
      setConnecting(false);
      setError(err.message);
    };

    // Game logic events mapped to Zustand stores
    const onGameStateSync = (payload: any) => {
      useGameStore.getState().syncFullState(payload);
    };

    const onGamePhaseChange = (payload: { phase: any; roundNumber: number }) => {
      useGameStore.setState({
        phase: payload.phase,
        currentRound: payload.roundNumber,
      });
    };

    const onRoundStart = (payload: { roundNumber: number; decisions: any[]; timeLimit: number }) => {
      useGameStore.setState({
        currentRound: payload.roundNumber,
        availableDecisions: payload.decisions,
        roundTimeLeft: payload.timeLimit,
        selectedDecision: null, // Reset decision on new round start
      });
    };

    const onRoundTick = (payload: { timeLeft: number }) => {
      useGameStore.setState({
        roundTimeLeft: payload.timeLeft,
      });
    };

    const onRoundResults = (payload: { teamResults: any[]; marketState: any }) => {
      // Round results can trigger UI updates or specific results lists
      // Real-time scores will also sync via next state-sync
    };

    const onEventTriggered = (payload: any) => {
      const event = payload.event || payload;
      useGameStore.setState({ currentEvent: event });
      useUiStore.setState({ showEventOverlay: true });
    };

    const onTeamStatsUpdate = (payload: any) => {
      useGameStore.getState().updateMyTeam(payload);
    };

    const onNarratorMessage = (payload: { text: string; type?: "info" | "warning" | "education"; relatedConcept?: string }) => {
      useGameStore.setState({
        narration: {
          text: payload.text,
          isVisible: true,
          type: payload.type || "info",
          ...(payload.relatedConcept ? { relatedConcept: payload.relatedConcept } : {}),
        },
      });
      useUiStore.setState({ showNarrator: true });
    };

    const onQuizStart = (payload: { question: string; options: string[]; timeLimit: number }) => {
      useGameStore.setState({
        activeQuiz: {
          question: payload.question,
          options: payload.options,
          timeLimit: payload.timeLimit,
          answered: false,
        },
        selectedAnswer: null,
        hasAnswered: false,
        quizResult: null,
      });
      useUiStore.setState({ showQuizModal: true });
    };

    const onQuizResults = (payload: { correctAnswer: number; teamScores: any[]; explanation: string }) => {
      const active = useGameStore.getState().activeQuiz;
      const myTeam = useGameStore.getState().myTeam;
      
      let scoreEarned = 0;
      let isCorrect = false;
      
      if (myTeam) {
        const myScoreEntry = payload.teamScores.find((t: any) => t.teamId === myTeam.id);
        if (myScoreEntry) {
          scoreEarned = myScoreEntry.scoreEarned ?? 0;
          isCorrect = myScoreEntry.isCorrect ?? false;
        }
      }

      useGameStore.setState({
        ...(active ? {
          activeQuiz: {
            ...active,
            answered: true,
          },
        } : {}),
        quizResult: {
          correctAnswer: payload.correctAnswer,
          explanation: payload.explanation,
          scoreEarned,
          isCorrect,
        },
      });
    };

    const onGameOver = (payload: { finalLeaderboard: any[] }) => {
      useGameStore.setState({
        phase: "finished",
        leaderboard: payload.finalLeaderboard || [],
      });
    };

    const onError = (payload: { message: string }) => {
      useUiStore.getState().addToast({
        title: "Lỗi",
        description: payload.message,
        variant: "destructive",
      });
    };

    // Bind listeners
    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("connect_error", onConnectError);
    socketInstance.on(SOCKET_EVENTS.GAME_STATE_SYNC, onGameStateSync);
    socketInstance.on(SOCKET_EVENTS.GAME_PHASE_CHANGE, onGamePhaseChange);
    socketInstance.on(SOCKET_EVENTS.ROUND_START, onRoundStart);
    socketInstance.on(SOCKET_EVENTS.ROUND_TICK, onRoundTick);
    socketInstance.on(SOCKET_EVENTS.ROUND_RESULTS, onRoundResults);
    socketInstance.on(SOCKET_EVENTS.EVENT_TRIGGERED, onEventTriggered);
    socketInstance.on(SOCKET_EVENTS.TEAM_STATS_UPDATE, onTeamStatsUpdate);
    socketInstance.on(SOCKET_EVENTS.NARRATOR_MESSAGE, onNarratorMessage);
    socketInstance.on(SOCKET_EVENTS.QUIZ_START, onQuizStart);
    socketInstance.on(SOCKET_EVENTS.QUIZ_RESULTS, onQuizResults);
    socketInstance.on(SOCKET_EVENTS.GAME_OVER, onGameOver);
    socketInstance.on(SOCKET_EVENTS.ERROR, onError);

    // Sync initial state if socket is already connected
    if (socketInstance.connected) {
      onConnect();
    }

    return () => {
      // Unbind all listeners on unmount
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("connect_error", onConnectError);
      socketInstance.off(SOCKET_EVENTS.GAME_STATE_SYNC, onGameStateSync);
      socketInstance.off(SOCKET_EVENTS.GAME_PHASE_CHANGE, onGamePhaseChange);
      socketInstance.off(SOCKET_EVENTS.ROUND_START, onRoundStart);
      socketInstance.off(SOCKET_EVENTS.ROUND_TICK, onRoundTick);
      socketInstance.off(SOCKET_EVENTS.ROUND_RESULTS, onRoundResults);
      socketInstance.off(SOCKET_EVENTS.EVENT_TRIGGERED, onEventTriggered);
      socketInstance.off(SOCKET_EVENTS.TEAM_STATS_UPDATE, onTeamStatsUpdate);
      socketInstance.off(SOCKET_EVENTS.NARRATOR_MESSAGE, onNarratorMessage);
      socketInstance.off(SOCKET_EVENTS.QUIZ_START, onQuizStart);
      socketInstance.off(SOCKET_EVENTS.QUIZ_RESULTS, onQuizResults);
      socketInstance.off(SOCKET_EVENTS.GAME_OVER, onGameOver);
      socketInstance.off(SOCKET_EVENTS.ERROR, onError);
    };
  }, [url, setSocket, setConnected, setConnecting, setError]);

  return <>{children}</>;
}
