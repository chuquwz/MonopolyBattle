"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { vi } from "@/i18n/vi";
import { apiRequest } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";
import { SocketProvider } from "@/providers/socket-provider";
import { useSocket } from "@/hooks/use-socket";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameLayout } from "@/components/layout/game-layout";
import { useGameStore } from "@/stores/game.store";
import { SOCKET_EVENTS } from "@monopoly/shared";

interface GameStateResponse {
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
  myTeam: {
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
  } | null;
  allTeams: Array<{
    id: string;
    name: string;
    teamNumber: number;
    marketShare: number;
    monopolyRisk: number;
    totalScore: number;
    status: "waiting" | "ready" | "playing" | "eliminated";
  }>;
}

function PlayerLobbyContent({ gameId, teamId }: { gameId: string; teamId: string }) {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  
  const [game, setGame] = React.useState<GameStateResponse["game"] | null>(null);
  const [myTeam, setMyTeam] = React.useState<GameStateResponse["myTeam"] | null>(null);
  const [allTeams, setAllTeams] = React.useState<GameStateResponse["allTeams"]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const [transitioning, setTransitioning] = React.useState(false);
  const [countdownSeconds, setCountdownSeconds] = React.useState<number | null>(null);

  const fetchGameState = React.useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return;

    const response = await apiRequest<GameStateResponse>(`/api/games/${gameId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data) {
      setGame(response.data.game);
      setMyTeam(response.data.myTeam);
      setAllTeams(response.data.allTeams);

      // Sync state to Zustand game store so layout header stays updated
      useGameStore.getState().syncFullState({
        roomCode: response.data.game.roomCode,
        role: "player",
        phase: response.data.game.status as any,
        currentRound: response.data.game.currentRound,
        totalRounds: response.data.game.totalRounds,
        myTeam: response.data.myTeam,
        allTeams: response.data.allTeams,
      });

      // If game has already started, redirect to game page!
      if (response.data.game.status !== "lobby" && response.data.game.status !== "countdown") {
        router.push("/play/game");
      }
    }
    setLoading(false);
  }, [gameId, router]);

  // Initial fetch on mount
  React.useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  // Handle Socket.IO real-time synchronization in lobby
  React.useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchGameState();
    };

    socket.on(SOCKET_EVENTS.TEAM_JOINED, handleUpdate);
    socket.on(SOCKET_EVENTS.TEAM_READY, handleUpdate);

    // Watch for countdown starting
    const handleCountdown = (data: { seconds: number }) => {
      setTransitioning(true);
      setCountdownSeconds(data.seconds);
      useGameStore.setState({ phase: "countdown" });
    };
    socket.on(SOCKET_EVENTS.GAME_COUNTDOWN, handleCountdown);

    // Handle phase transitions
    const handlePhaseChange = (data: { phase: string }) => {
      useGameStore.setState({ phase: data.phase as any });
      
      if (data.phase === "countdown") {
        setTransitioning(true);
      } else if (data.phase !== "lobby") {
        router.push("/play/game");
      }
    };
    socket.on(SOCKET_EVENTS.GAME_PHASE_CHANGE, handlePhaseChange);

    return () => {
      socket.off(SOCKET_EVENTS.TEAM_JOINED, handleUpdate);
      socket.off(SOCKET_EVENTS.TEAM_READY, handleUpdate);
      socket.off(SOCKET_EVENTS.GAME_COUNTDOWN, handleCountdown);
      socket.off(SOCKET_EVENTS.GAME_PHASE_CHANGE, handlePhaseChange);
    };
  }, [socket, fetchGameState, router]);

  const handleMarkReady = () => {
    if (socket && isConnected) {
      // Must supply teamId as payload parameter matching server-side schema
      socket.emit(SOCKET_EVENTS.PLAYER_READY, { teamId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm animate-pulse">{vi.ui.loading.loading}</p>
      </div>
    );
  }

  // Intercept view during pre-game countdown
  if (transitioning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full border-4 border-accent/20 animate-ping" />
          <div className="w-20 h-20 rounded-full bg-card border border-accent/50 flex items-center justify-center text-4xl font-extrabold text-accent font-mono shadow-2xl">
            {countdownSeconds ?? "!"}
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-wide uppercase text-foreground">
            {vi.game.phase.countdown}
          </h2>
          <p className="text-muted-foreground text-xs">
            Trận chiến độc quyền chuẩn bị bắt đầu. Sẵn sàng đưa ra quyết định chiến lược!
          </p>
        </div>
      </div>
    );
  }

  const otherTeams = allTeams.filter((t) => t.id !== teamId);
  const isReady = myTeam?.status === "ready";

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left column: Own Team detail and Ready button */}
        <Card className="md:col-span-2 border-border bg-card/40 backdrop-blur shadow-xl flex flex-col justify-between">
          <CardHeader>
            <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Thông tin đội của bạn
            </CardDescription>
            <CardTitle className="text-3xl font-black text-foreground flex items-center gap-3">
              <span className="text-accent font-mono">#{myTeam?.teamNumber}</span>
              {myTeam?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-background/40 border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {vi.stats.money}
                </span>
                <span className="text-lg font-bold text-foreground/90 mt-1 block">
                  {myTeam?.money.toLocaleString()} {vi.stats.moneyUnit}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-background/40 border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {vi.stats.marketShare}
                </span>
                <span className="text-lg font-bold text-foreground/90 mt-1 block">
                  {myTeam?.marketShare}%
                </span>
              </div>
            </div>

            {/* Waiting animation */}
            <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-background/60">
              <div className="flex space-x-1.5 items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {vi.pages.playerLobby.waitingForHost}
              </span>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-6">
            <Button
              onClick={handleMarkReady}
              disabled={isReady || !isConnected}
              variant={isReady ? "outline" : "accent"}
              className={`w-full font-bold h-11 transition-all ${isReady ? 'bg-success/10 text-success border border-success/25 hover:bg-success/20 hover:text-success' : ''}`}
            >
              {isReady ? vi.pages.playerLobby.isReadyLabel : vi.pages.playerLobby.readyButton}
            </Button>
          </CardFooter>
        </Card>

        {/* Right column: Status of other teams in the lobby */}
        <Card className="border-border bg-card/40 backdrop-blur shadow-xl">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-bold">
              {vi.pages.playerLobby.otherTeamsTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 max-h-[350px] overflow-y-auto">
            {otherTeams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs leading-relaxed">
                {vi.pages.playerLobby.noOtherTeams}
              </div>
            ) : (
              <div className="space-y-3">
                {otherTeams.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded border border-border bg-background/40 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono font-bold">#{t.teamNumber}</span>
                      <span className="font-bold text-foreground/90">{t.name}</span>
                    </div>
                    <Badge variant={t.status === "ready" ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                      {t.status === "ready" ? "Sẵn sàng" : "Chờ..."}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PlayerLobbyPage() {
  const router = useRouter();
  const [authData, setAuthData] = React.useState<{ gameId: string; teamId: string } | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const gameId = localStorage.getItem(STORAGE_KEYS.GAME_ID);
    const teamId = localStorage.getItem(STORAGE_KEYS.TEAM_ID);
    const role = localStorage.getItem(STORAGE_KEYS.ROLE);

    if (!token || !gameId || !teamId || role !== "player") {
      router.push("/play/join");
    } else {
      setAuthData({ gameId, teamId });
    }
  }, [router]);

  if (!authData) {
    return null;
  }

  return (
    <SocketProvider>
      <GameLayout>
        <PlayerLobbyContent gameId={authData.gameId} teamId={authData.teamId} />
      </GameLayout>
    </SocketProvider>
  );
}
