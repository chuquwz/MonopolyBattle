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
    status: "waiting" | "ready" | "playing" | "eliminated";
  }>;
  players: Array<{
    id: string;
    teamId: string;
    displayName: string;
    isConnected: boolean;
  }>;
}

function HostLobbyContent({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [game, setGame] = React.useState<GameDetailResponse["game"] | null>(null);
  const [teams, setTeams] = React.useState<GameDetailResponse["teams"]>([]);
  const [players, setPlayers] = React.useState<GameDetailResponse["players"]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fetchGameDetails = React.useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return;

    const response = await apiRequest<GameDetailResponse>(`/api/games/${gameId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data) {
      setGame(response.data.game);
      setTeams(response.data.teams);
      setPlayers(response.data.players);

      // Sync state to Zustand game store so layout header stays updated
      useGameStore.getState().syncFullState({
        roomCode: response.data.game.roomCode,
        role: "host",
        phase: response.data.game.status as any,
        currentRound: response.data.game.currentRound,
        totalRounds: response.data.game.totalRounds,
        allTeams: response.data.teams.map((t) => ({
          id: t.id,
          name: t.name,
          teamNumber: t.teamNumber,
          status: t.status,
          marketShare: 0,
          monopolyRisk: 0,
          totalScore: 0,
        })),
      });
    }
    setLoading(false);
  }, [gameId]);

  // Initial fetch
  React.useEffect(() => {
    fetchGameDetails();
  }, [fetchGameDetails]);

  // Listen to Socket.IO events to sync room dynamically
  React.useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchGameDetails();
    };

    socket.on(SOCKET_EVENTS.TEAM_JOINED, handleUpdate);
    socket.on(SOCKET_EVENTS.TEAM_READY, handleUpdate);

    // If game state changes (e.g. host starts and phase shifts to countdown/decision)
    const handlePhaseChange = (data: { phase: string }) => {
      useGameStore.setState({ phase: data.phase as any });
      
      if (data.phase !== "lobby") {
        setError("Trò chơi đang bắt đầu...");
      }
    };
    socket.on(SOCKET_EVENTS.GAME_PHASE_CHANGE, handlePhaseChange);

    return () => {
      socket.off(SOCKET_EVENTS.TEAM_JOINED, handleUpdate);
      socket.off(SOCKET_EVENTS.TEAM_READY, handleUpdate);
      socket.off(SOCKET_EVENTS.GAME_PHASE_CHANGE, handlePhaseChange);
    };
  }, [socket, fetchGameDetails]);

  // Click handler to trigger game start countdown
  const handleStartGame = () => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.HOST_START_GAME);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm animate-pulse">{vi.ui.loading.loading}</p>
      </div>
    );
  }

  const readyTeamsCount = teams.filter((t) => t.status === "ready").length;
  const totalTeamsCount = teams.length;
  const canStart = readyTeamsCount >= 2;

  // Compute absolute join URL
  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/play/join?code=${game?.roomCode}`
    : `/play/join?code=${game?.roomCode}`;

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      {/* Main room code and QR */}
      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-2 border-border bg-card/40 backdrop-blur shadow-xl">
          <CardHeader className="pb-4">
            <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {vi.pages.hostLobby.roomCodeLabel}
            </CardDescription>
            <CardTitle className="text-6xl font-black text-accent tracking-widest py-2 select-all">
              {game?.roomCode}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-background/60 rounded border border-border space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Đường dẫn tham gia</p>
              <p className="text-xs text-blue-400 font-mono break-all select-all">{joinUrl}</p>
            </div>
            {error && (
              <div className="text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-border pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              {canStart ? vi.pages.hostLobby.readyToStart : vi.pages.hostLobby.waitingTeams}
            </div>
            <Button
              onClick={handleStartGame}
              disabled={!canStart || !isConnected}
              variant="accent"
              className="w-full sm:w-auto font-bold px-8"
            >
              {vi.pages.hostLobby.startButton}
            </Button>
          </CardFooter>
        </Card>

        {/* QR Placeholder card */}
        <Card className="border-border bg-card/40 backdrop-blur shadow-xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full aspect-square max-w-[200px] border-2 border-dashed border-border bg-background rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-accent/30 transition-colors">
            {/* Visual styling to look like a premium QR code box */}
            <div className="w-10 h-10 border-4 border-accent/40 rounded-sm relative flex items-center justify-center">
              <span className="w-4 h-4 bg-accent/40 rounded-xs" />
            </div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {vi.pages.hostLobby.qrPlaceholder}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-bold mt-4">
            {vi.pages.hostLobby.qrLabel}
          </p>
        </Card>
      </div>

      {/* Joined teams list */}
      <Card className="border-border bg-card/40 backdrop-blur shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">
              {vi.pages.hostLobby.teamsJoinedTitle.replace("{count}", String(totalTeamsCount))}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {vi.pages.hostLobby.readyCounterLabel.replace("{ready}", String(readyTeamsCount)).replace("{total}", String(totalTeamsCount))}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {teams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              {vi.pages.hostLobby.noTeams}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {teams.map((t) => {
                const teamPlayers = players.filter((p) => p.teamId === t.id);
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-lg border border-border bg-background/40 flex items-center justify-between hover:border-border transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground font-mono">#{t.teamNumber}</span>
                        <h4 className="text-sm font-bold text-foreground/90">{t.name}</h4>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {teamPlayers.map((p) => p.displayName).join(", ")}
                      </div>
                    </div>
                    <Badge variant={t.status === "ready" ? "default" : "secondary"}>
                      {t.status === "ready" ? "Sẵn sàng" : "Đang chờ"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function HostLobbyPage() {
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

  if (!gameId) {
    return null;
  }

  return (
    <SocketProvider>
      <GameLayout>
        <HostLobbyContent gameId={gameId} />
      </GameLayout>
    </SocketProvider>
  );
}
