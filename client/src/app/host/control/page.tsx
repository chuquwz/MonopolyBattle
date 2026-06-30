"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { SOCKET_EVENTS } from "@monopoly/shared";
import type { GamePhase, LeaderboardEntry, PublicTeamInfo } from "@monopoly/shared";
import { vi } from "@/i18n/vi";
import { apiRequest } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";
import { useSocket } from "@/hooks/use-socket";
import { SocketProvider } from "@/providers/socket-provider";
import { GameLayout } from "@/components/layout/game-layout";
import { HostControlPanel } from "@/components/host/host-control-panel";
import { TeamList, type HostTeamInfo } from "@/components/host/team-list";
import { RoundController } from "@/components/host/round-controller";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game.store";
import { useUiStore } from "@/stores/ui.store";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface GameDetailResponse {
  success: boolean;
  role: string;
  game: {
    id: string;
    roomCode: string;
    status: string;
    currentRound: number;
    totalRounds: number;
    roundDurationSec: number;
  };
  teams: Array<{
    id: string;
    name: string;
    teamNumber: number;
    money: number;
    marketShare: number;
    technology: number;
    reputation: number;
    monopolyRisk: number;
    totalScore: number;
    quizScore: number;
    status: "waiting" | "ready" | "playing" | "eliminated";
  }>;
  players: Array<{
    id: string;
    teamId: string;
    displayName: string;
    isConnected: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Inner content (needs socket context)
// ---------------------------------------------------------------------------

function HostControlContent({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const addToast = useUiStore((s) => s.addToast);

  // Game state from API
  const [game, setGame] = React.useState<GameDetailResponse["game"] | null>(null);
  const [rawTeams, setRawTeams] = React.useState<GameDetailResponse["teams"]>([]);
  const [players, setPlayers] = React.useState<GameDetailResponse["players"]>([]);
  const [loading, setLoading] = React.useState(true);

  // Live game state (updated via socket)
  const phase = useGameStore((s) => s.phase);
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const roundTimeLeft = useGameStore((s) => s.roundTimeLeft);
  const leaderboard = useGameStore((s) => s.leaderboard);

  const [isPaused, setIsPaused] = React.useState(false);
  const [submittedCount, setSubmittedCount] = React.useState(0);

  // Build host team info with connection + submission status
  const hostTeams: HostTeamInfo[] = React.useMemo(() => {
    return rawTeams.map((t) => {
      const teamPlayers = players.filter((p) => p.teamId === t.id);
      const isConnected = teamPlayers.some((p) => p.isConnected);
      return {
        ...t,
        isConnected,
        hasSubmitted: false, // will be toggled by socket events
      };
    });
  }, [rawTeams, players]);

  const [submittedTeamIds, setSubmittedTeamIds] = React.useState<Set<string>>(new Set());

  const enrichedTeams: HostTeamInfo[] = React.useMemo(() => {
    return hostTeams.map((t) => ({
      ...t,
      hasSubmitted: submittedTeamIds.has(t.id),
    }));
  }, [hostTeams, submittedTeamIds]);

  const connectedCount = enrichedTeams.filter((t) => t.isConnected).length;

  // --------------------------------------------------------------------------
  // Initial data fetch
  // --------------------------------------------------------------------------

  const fetchGameDetails = React.useCallback(async (): Promise<void> => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return;

    const response = await apiRequest<GameDetailResponse>(`/api/games/${gameId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data) {
      setGame(response.data.game);
      setRawTeams(response.data.teams);
      setPlayers(response.data.players);
      setIsPaused(response.data.game.status === "paused");

      useGameStore.getState().syncFullState({
        roomCode: response.data.game.roomCode,
        role: "host",
        currentRound: response.data.game.currentRound,
        totalRounds: response.data.game.totalRounds,
        allTeams: response.data.teams.map((t) => ({
          id: t.id,
          name: t.name,
          teamNumber: t.teamNumber,
          status: t.status,
          marketShare: t.marketShare,
          monopolyRisk: t.monopolyRisk,
          totalScore: t.totalScore,
        })),
      });
    }
    setLoading(false);
  }, [gameId]);

  React.useEffect(() => {
    fetchGameDetails();
  }, [fetchGameDetails]);

  // --------------------------------------------------------------------------
  // Socket event listeners
  // --------------------------------------------------------------------------

  React.useEffect(() => {
    if (!socket) return;

    const handlePhaseChange = (data: { phase: GamePhase; roundNumber: number; data?: { paused?: boolean } }) => {
      if (data.data?.paused !== undefined) {
        setIsPaused(data.data.paused);
      }
      // Reset submission tracker on new decision phase
      if (data.phase === "decision") {
        setSubmittedCount(0);
        setSubmittedTeamIds(new Set());
      }
      // Update game store phase (SocketProvider already does this, but keep in sync)
    };

    const handleRoundStart = (data: { roundNumber: number }) => {
      setSubmittedCount(0);
      setSubmittedTeamIds(new Set());
      fetchGameDetails();
      // Update leaderboard on each round
    };

    const handleDecisionReceived = (data: { teamId: string }) => {
      setSubmittedCount((c) => c + 1);
      setSubmittedTeamIds((prev) => new Set([...prev, data.teamId]));
    };

    const handleRoundResults = () => {
      fetchGameDetails();
    };

    const handleTeamJoined = () => {
      fetchGameDetails();
    };

    const handleGameOver = () => {
      fetchGameDetails();
    };

    socket.on(SOCKET_EVENTS.GAME_PHASE_CHANGE, handlePhaseChange);
    socket.on(SOCKET_EVENTS.ROUND_START, handleRoundStart);
    socket.on(SOCKET_EVENTS.ROUND_DECISION_RECEIVED, handleDecisionReceived);
    socket.on(SOCKET_EVENTS.ROUND_RESULTS, handleRoundResults);
    socket.on(SOCKET_EVENTS.TEAM_JOINED, handleTeamJoined);
    socket.on(SOCKET_EVENTS.GAME_OVER, handleGameOver);

    return () => {
      socket.off(SOCKET_EVENTS.GAME_PHASE_CHANGE, handlePhaseChange);
      socket.off(SOCKET_EVENTS.ROUND_START, handleRoundStart);
      socket.off(SOCKET_EVENTS.ROUND_DECISION_RECEIVED, handleDecisionReceived);
      socket.off(SOCKET_EVENTS.ROUND_RESULTS, handleRoundResults);
      socket.off(SOCKET_EVENTS.TEAM_JOINED, handleTeamJoined);
      socket.off(SOCKET_EVENTS.GAME_OVER, handleGameOver);
    };
  }, [socket, fetchGameDetails]);

  // --------------------------------------------------------------------------
  // Action handlers
  // --------------------------------------------------------------------------

  const emit = React.useCallback(
    (event: string, payload?: unknown): void => {
      if (socket && isConnected) {
        if (payload !== undefined) {
          socket.emit(event, payload);
        } else {
          socket.emit(event);
        }
      }
    },
    [socket, isConnected]
  );

  const handlePause = (): void => {
    emit(SOCKET_EVENTS.HOST_PAUSE);
    setIsPaused(true);
    addToast({ title: vi.pages.hostControl.toastPaused, variant: "default" });
  };

  const handleResume = (): void => {
    emit(SOCKET_EVENTS.HOST_RESUME);
    setIsPaused(false);
    addToast({ title: vi.pages.hostControl.toastResumed, variant: "default" });
  };

  const handleForceNextPhase = (): void => {
    emit(SOCKET_EVENTS.HOST_NEXT_PHASE);
    addToast({ title: vi.pages.hostControl.toastForced, variant: "default" });
  };

  const handleEndGame = (): void => {
    emit(SOCKET_EVENTS.HOST_END_GAME);
    addToast({ title: vi.pages.hostControl.toastEnded, variant: "default" });
    // Navigate to results after short delay
    setTimeout(() => {
      router.push(`/results?gameId=${gameId}`);
    }, 1500);
  };

  // --------------------------------------------------------------------------
  // Loading state
  // --------------------------------------------------------------------------

  if (loading || !game) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm animate-pulse">{vi.ui.loading.loading}</p>
      </div>
    );
  }

  const isFinished = phase === "finished" || game.status === "finished";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-foreground">
            {vi.pages.hostControl.title}
          </h1>
          <p className="text-sm text-muted-foreground">{vi.pages.hostControl.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Link to projector view */}
          <Button
            asChild
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground text-xs font-bold"
            id="host-projector-link"
          >
            <Link href="/projector" target="_blank">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Màn chiếu
            </Link>
          </Button>

          {/* Results link (after game ends) */}
          {isFinished && (
            <Button
              asChild
              variant="accent"
              className="font-bold text-xs"
              id="host-results-link"
            >
              <Link href={`/results?gameId=${gameId}`}>
                {vi.pages.hostControl.gameOverNav}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Top summary panel */}
      <HostControlPanel
        phase={phase}
        currentRound={currentRound}
        totalRounds={totalRounds}
        roundTimeLeft={roundTimeLeft}
        roomCode={game.roomCode}
        connectedTeams={connectedCount}
        totalTeams={enrichedTeams.length}
        submittedCount={submittedCount}
        leaderboard={leaderboard}
      />

      {/* Two-column layout: controller | team list */}
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        {/* Left — round controller */}
        <RoundController
          phase={phase}
          currentRound={currentRound}
          totalRounds={totalRounds}
          roundTimeLeft={roundTimeLeft}
          isPaused={isPaused}
          submittedCount={submittedCount}
          totalTeams={enrichedTeams.length}
          onPause={handlePause}
          onResume={handleResume}
          onForceNextPhase={handleForceNextPhase}
          onEndGame={handleEndGame}
          disabled={!isConnected}
        />

        {/* Right — team list */}
        <TeamList
          teams={enrichedTeams}
          showSubmissionStatus={phase === "decision"}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page shell (auth guard + socket provider)
// ---------------------------------------------------------------------------

export default function HostControlPage(): React.JSX.Element {
  const router = useRouter();
  const [gameId, setGameId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const storedGameId = localStorage.getItem(STORAGE_KEYS.GAME_ID);
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const role = localStorage.getItem(STORAGE_KEYS.ROLE);

    if (!storedGameId || !token || role !== "host") {
      router.push("/host");
    } else {
      setGameId(storedGameId);
    }
  }, [router]);

  if (!gameId) return <></>;

  return (
    <SocketProvider>
      <GameLayout>
        <HostControlContent gameId={gameId} />
      </GameLayout>
    </SocketProvider>
  );
}
