"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@monopoly/shared";
import type {
  GamePhase,
  PublicTeamInfo,
  LeaderboardEntry,
  GameEvent,
} from "@monopoly/shared";
import { vi } from "@/i18n/vi";
import { cn } from "@/lib/utils";
import { ProjectorBoard, type ProjectorBoardState } from "@/components/projector/projector-board";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectorPhaseChangePayload {
  phase: GamePhase;
  roundNumber: number;
}

interface RoundStartPayload {
  roundNumber: number;
  timeLimit: number;
}

interface RoundTickPayload {
  timeLeft: number;
}

interface RoundResultsPayload {
  leaderboard: LeaderboardEntry[];
}

interface NarratorMessagePayload {
  text: string;
  type: "info" | "warning" | "education";
  relatedConcept?: string;
}

interface EventTriggeredPayload {
  eventType: string;
  title: string;
  description: string;
  effects: Record<string, number>;
}

interface QuizStartPayload {
  question: string;
  options: string[];
  timeLimit: number;
}

interface QuizResultsPayload {
  correctAnswer: number;
  teamScores: Array<{ teamId: string; isCorrect: boolean; scoreEarned: number }>;
  explanation: string;
}

interface TeamJoinedPayload {
  teamId: string;
  teamName: string;
  teamNumber: number;
}

interface GameStateSyncPayload {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  roundTimeLeft: number;
  allTeams: PublicTeamInfo[];
  leaderboard: LeaderboardEntry[];
}

interface GameOverPayload {
  finalLeaderboard: LeaderboardEntry[];
}

// ---------------------------------------------------------------------------
// Connection state machine
// ---------------------------------------------------------------------------

type ConnectionStatus = "idle" | "connecting" | "connected" | "error" | "disconnected";

const INITIAL_BOARD_STATE: ProjectorBoardState = {
  phase: "lobby",
  currentRound: 0,
  totalRounds: 8,
  roundTimeLeft: 0,
  roomCode: "",
  allTeams: [],
  leaderboard: [],
  narration: { text: "", isVisible: false, type: "info" },
  currentEvent: null,
  activeQuiz: null,
  submittedTeamsCount: 0,
};

// ---------------------------------------------------------------------------
// Projector Page
// ---------------------------------------------------------------------------

export default function ProjectorPage(): React.JSX.Element {
  // --- Input state ---
  const [roomCodeInput, setRoomCodeInput] = React.useState("");
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState("");

  // --- Game board state ---
  const [boardState, setBoardState] = React.useState<ProjectorBoardState>(INITIAL_BOARD_STATE);

  // --- Socket ref (not state — we don't want re-renders on socket identity changes) ---
  const socketRef = React.useRef<Socket | null>(null);

  // Quiz countdown ticker
  const quizTickerRef = React.useRef<NodeJS.Timeout | null>(null);

  // --------------------------------------------------------------------------
  // Socket connection
  // --------------------------------------------------------------------------

  const connect = React.useCallback((roomCode: string): void => {
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }

    setConnectionStatus("connecting");
    setErrorMessage("");

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";
    const socket = io(wsUrl, {
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ["websocket"],
      auth: { token: null, roomCode, role: "projector" },
    });

    socketRef.current = socket;

    // ── Connection lifecycle ──────────────────────────────────────────────

    socket.on("connect", () => {
      setConnectionStatus("connected");

      // Announce projector join
      socket.emit(SOCKET_EVENTS.PROJECTOR_JOIN, { roomCode });

      setBoardState((prev) => ({ ...prev, roomCode }));
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
      clearQuizTicker();
    });

    socket.on("connect_error", (err: Error) => {
      setConnectionStatus("error");
      setErrorMessage(err.message || vi.ui.error.message);
    });

    socket.on("reconnect_attempt", () => {
      setConnectionStatus("connecting");
    });

    // ── Game events ───────────────────────────────────────────────────────

    socket.on(SOCKET_EVENTS.GAME_STATE_SYNC, (payload: GameStateSyncPayload) => {
      setBoardState((prev) => ({
        ...prev,
        phase: payload.phase,
        currentRound: payload.currentRound,
        totalRounds: payload.totalRounds,
        roundTimeLeft: payload.roundTimeLeft,
        allTeams: payload.allTeams,
        leaderboard: payload.leaderboard,
      }));
    });

    socket.on(SOCKET_EVENTS.GAME_PHASE_CHANGE, (payload: ProjectorPhaseChangePayload) => {
      setBoardState((prev) => ({
        ...prev,
        phase: payload.phase,
        currentRound: payload.roundNumber > 0 ? payload.roundNumber : prev.currentRound,
        // Reset per-phase state
        activeQuiz: payload.phase !== "quiz" ? null : prev.activeQuiz,
        narration:
          payload.phase !== "narration"
            ? { text: "", isVisible: false, type: "info" as const }
            : prev.narration,
        currentEvent: payload.phase !== "event" ? prev.currentEvent : prev.currentEvent,
        submittedTeamsCount: payload.phase === "decision" ? 0 : prev.submittedTeamsCount,
      }));
    });

    socket.on(SOCKET_EVENTS.ROUND_START, (payload: RoundStartPayload) => {
      setBoardState((prev) => ({
        ...prev,
        phase: "decision",
        currentRound: payload.roundNumber,
        roundTimeLeft: payload.timeLimit,
        submittedTeamsCount: 0,
      }));
    });

    socket.on(SOCKET_EVENTS.ROUND_TICK, (payload: RoundTickPayload) => {
      setBoardState((prev) => ({ ...prev, roundTimeLeft: payload.timeLeft }));
    });

    socket.on(SOCKET_EVENTS.ROUND_DECISION_RECEIVED, () => {
      setBoardState((prev) => ({
        ...prev,
        submittedTeamsCount: prev.submittedTeamsCount + 1,
      }));
    });

    socket.on(SOCKET_EVENTS.ROUND_RESULTS, (payload: RoundResultsPayload) => {
      setBoardState((prev) => ({
        ...prev,
        leaderboard: payload.leaderboard,
        phase: "results",
      }));
    });

    socket.on(SOCKET_EVENTS.EVENT_TRIGGERED, (payload: EventTriggeredPayload) => {
      const event: GameEvent = {
        id: "projector-event",
        type: payload.eventType,
        titleVi: payload.title,
        descriptionVi: payload.description,
        effects: {
          money: payload.effects["money"] ?? 0,
          marketShare: payload.effects["marketShare"] ?? 0,
          technology: payload.effects["technology"] ?? 0,
          reputation: payload.effects["reputation"] ?? 0,
          monopolyRisk: payload.effects["monopolyRisk"] ?? 0,
        },
        scope: "all",
      };
      setBoardState((prev) => ({ ...prev, currentEvent: event }));
    });

    socket.on(SOCKET_EVENTS.NARRATOR_MESSAGE, (payload: NarratorMessagePayload) => {
      setBoardState((prev) => ({
        ...prev,
        narration: {
          text: payload.text,
          isVisible: true,
          type: payload.type,
          ...(payload.relatedConcept !== undefined
            ? { relatedConcept: payload.relatedConcept }
            : {}),
        },
      }));
    });

    socket.on(SOCKET_EVENTS.QUIZ_START, (payload: QuizStartPayload) => {
      clearQuizTicker();
      let timeLeft = payload.timeLimit;

      setBoardState((prev) => ({
        ...prev,
        phase: "quiz",
        activeQuiz: {
          question: payload.question,
          options: payload.options,
          timeLimit: payload.timeLimit,
          answered: false,
          timeLeft,
        },
      }));

      quizTickerRef.current = setInterval(() => {
        timeLeft -= 1;
        setBoardState((prev) => {
          if (!prev.activeQuiz) return prev;
          return {
            ...prev,
            activeQuiz: { ...prev.activeQuiz, timeLeft: Math.max(0, timeLeft) },
          };
        });
        if (timeLeft <= 0) {
          clearQuizTicker();
        }
      }, 1000);
    });

    socket.on(SOCKET_EVENTS.QUIZ_RESULTS, (_payload: QuizResultsPayload) => {
      clearQuizTicker();
      setBoardState((prev) => ({
        ...prev,
        activeQuiz: prev.activeQuiz
          ? { ...prev.activeQuiz, answered: true }
          : null,
      }));
    });

    socket.on(SOCKET_EVENTS.TEAM_JOINED, (payload: TeamJoinedPayload) => {
      setBoardState((prev) => {
        const exists = prev.allTeams.some((t) => t.id === payload.teamId);
        if (exists) return prev;
        const newTeam: PublicTeamInfo = {
          id: payload.teamId,
          name: payload.teamName,
          teamNumber: payload.teamNumber,
          marketShare: 0,
          monopolyRisk: 0,
          totalScore: 0,
          status: "waiting",
        };
        return { ...prev, allTeams: [...prev.allTeams, newTeam] };
      });
    });

    socket.on(SOCKET_EVENTS.TEAM_READY, (payload: { teamId: string }) => {
      setBoardState((prev) => ({
        ...prev,
        allTeams: prev.allTeams.map((t) =>
          t.id === payload.teamId ? { ...t, status: "ready" } : t
        ),
      }));
    });

    socket.on(SOCKET_EVENTS.TEAM_STATS_UPDATE, (payload: Partial<PublicTeamInfo> & { teamId: string }) => {
      setBoardState((prev) => ({
        ...prev,
        allTeams: prev.allTeams.map((t) =>
          t.id === payload.teamId ? { ...t, ...payload } : t
        ),
      }));
    });

    socket.on(SOCKET_EVENTS.GAME_OVER, (payload: GameOverPayload) => {
      clearQuizTicker();
      setBoardState((prev) => ({
        ...prev,
        phase: "finished",
        leaderboard: payload.finalLeaderboard,
      }));
    });

    socket.on(SOCKET_EVENTS.ERROR, (payload: { message: string }) => {
      setErrorMessage(payload.message ?? vi.ui.error.message);
    });

    socket.connect();
  }, []);

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  const clearQuizTicker = (): void => {
    if (quizTickerRef.current) {
      clearInterval(quizTickerRef.current);
      quizTickerRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => {
      clearQuizTicker();
      socketRef.current?.disconnect();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleJoin = (e: React.FormEvent): void => {
    e.preventDefault();
    const normalized = roomCodeInput.trim().toUpperCase();
    if (normalized.length !== 6) {
      setErrorMessage(vi.validation.roomCodeLength);
      return;
    }
    connect(normalized);
  };

  // --------------------------------------------------------------------------
  // Render: join screen
  // --------------------------------------------------------------------------

  if (connectionStatus !== "connected") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-amber-600 blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-blue-700 blur-[130px] animate-pulse" />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-10">
          {/* Brand */}
          <div className="text-center space-y-3">
            <h1 className="text-5xl font-black bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              MonopolyBattle
            </h1>
            <p className="text-2xl font-bold text-slate-400">
              {vi.pages.projector.title}
            </p>
          </div>

          {/* Join form */}
          <form
            onSubmit={handleJoin}
            className="bg-slate-900/80 border border-slate-800 rounded-3xl p-10 space-y-8 shadow-2xl backdrop-blur"
          >
            <div className="space-y-3">
              <label
                htmlFor="projector-room-code"
                className="block text-lg font-black uppercase tracking-widest text-slate-300"
              >
                {vi.pages.projector.enterRoomCode}
              </label>
              <input
                id="projector-room-code"
                type="text"
                maxLength={6}
                placeholder={vi.pages.projector.roomCodePlaceholder}
                value={roomCodeInput}
                onChange={(e) =>
                  setRoomCodeInput(e.target.value.replace(/[^A-Za-z0-9]/g, ""))
                }
                disabled={connectionStatus === "connecting"}
                className={cn(
                  "w-full text-center text-5xl font-black font-mono tracking-[0.4em] py-5 px-4",
                  "bg-slate-950 border-2 border-slate-700 rounded-2xl text-amber-400",
                  "focus:outline-none focus:border-amber-400 transition-colors",
                  "placeholder:text-slate-700 placeholder:tracking-widest placeholder:text-2xl"
                )}
                autoComplete="off"
                autoFocus
              />
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="text-xl font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-5 py-4">
                {errorMessage}
              </div>
            )}

            {/* Status indicator */}
            {connectionStatus === "connecting" && (
              <div className="flex items-center gap-3 text-amber-400 text-xl font-bold animate-pulse">
                <div className="w-4 h-4 rounded-full bg-amber-400 animate-ping" />
                {vi.pages.projector.joining}
              </div>
            )}
            {connectionStatus === "disconnected" && (
              <div className="flex items-center gap-3 text-slate-400 text-xl font-bold animate-pulse">
                <div className="w-4 h-4 rounded-full bg-slate-400" />
                {vi.pages.projector.reconnecting}
              </div>
            )}

            <button
              type="submit"
              id="projector-join-btn"
              disabled={
                connectionStatus === "connecting" || roomCodeInput.length !== 6
              }
              className={cn(
                "w-full py-6 rounded-2xl text-2xl font-black uppercase tracking-widest transition-all duration-200",
                "bg-amber-500 hover:bg-amber-400 text-slate-950",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500",
                "shadow-[0_0_30px_rgba(245,166,35,0.25)] hover:shadow-[0_0_40px_rgba(245,166,35,0.35)]"
              )}
            >
              {connectionStatus === "connecting"
                ? vi.pages.projector.joining
                : vi.pages.projector.joinButton}
            </button>
          </form>

          {/* Projector icon hint */}
          <p className="text-center text-slate-600 text-base font-semibold">
            {vi.layout.header.roleProjector} · {vi.layout.header.connectionConnecting}
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Render: connected projector board
  // --------------------------------------------------------------------------

  const isSocketDisconnected = socketRef.current !== null && !socketRef.current.connected;

  return (
    <div className="relative">
      {/* Connection status overlay (disconnected warning) */}
      {isSocketDisconnected && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center bg-rose-900/90 backdrop-blur py-4 px-8 border-b border-rose-700">
          <span className="text-xl font-black text-rose-200 animate-pulse uppercase tracking-widest">
            ⚠ {vi.pages.projector.disconnected}
          </span>
        </div>
      )}

      <ProjectorBoard state={boardState} />
    </div>
  );
}
