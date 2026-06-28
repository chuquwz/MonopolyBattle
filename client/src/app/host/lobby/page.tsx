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

    socket.on("team:joined", handleUpdate);
    socket.on("team:ready", handleUpdate);

    // If game state changes (e.g. host starts and phase shifts to countdown/decision)
    const handlePhaseChange = (data: { phase: string }) => {
      if (data.phase !== "lobby") {
        // Redirection target can be a placeholder host control or message
        setError("Trò chơi đang bắt đầu...");
      }
    };
    socket.on("game:phase-change", handlePhaseChange);

    return () => {
      socket.off("team:joined", handleUpdate);
      socket.off("team:ready", handleUpdate);
      socket.off("game:phase-change", handlePhaseChange);
    };
  }, [socket, fetchGameDetails]);

  // Click handler to trigger game start countdown
  const handleStartGame = () => {
    if (socket && isConnected) {
      socket.emit("host:start-game");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400 text-sm animate-pulse">{vi.ui.loading.loading}</p>
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
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            {vi.pages.hostLobby.title}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isConnected ? vi.layout.header.connectionConnected : vi.layout.header.connectionDisconnected}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isConnected ? "default" : "destructive"} className="px-3 py-1 text-xs">
            {isConnected ? "SOCKET ONLINE" : "SOCKET OFFLINE"}
          </Badge>
        </div>
      </div>

      {/* Main room code and QR */}
      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-2 border-slate-800 bg-slate-900/40 backdrop-blur shadow-xl">
          <CardHeader className="pb-4">
            <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {vi.pages.hostLobby.roomCodeLabel}
            </CardDescription>
            <CardTitle className="text-6xl font-black text-amber-400 tracking-widest py-2 select-all">
              {game?.roomCode}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-slate-950/60 rounded border border-slate-800 space-y-2">
              <p className="text-xs text-slate-400 font-semibold uppercase">Đường dẫn tham gia</p>
              <p className="text-xs text-blue-400 font-mono break-all select-all">{joinUrl}</p>
            </div>
            {error && (
              <div className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 p-3 rounded">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-slate-800/60 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              {canStart ? vi.pages.hostLobby.readyToStart : vi.pages.hostLobby.waitingTeams}
            </div>
            <Button
              onClick={handleStartGame}
              disabled={!canStart || !isConnected}
              className="w-full sm:w-auto bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold px-8"
            >
              {vi.pages.hostLobby.startButton}
            </Button>
          </CardFooter>
        </Card>

        {/* QR Placeholder card */}
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur shadow-xl flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full aspect-square max-w-[200px] border-2 border-dashed border-slate-700 bg-slate-950 rounded-xl flex flex-col items-center justify-center gap-2 group hover:border-amber-500/30 transition-colors">
            {/* Visual styling to look like a premium QR code box */}
            <div className="w-10 h-10 border-4 border-amber-500/40 rounded-sm relative flex items-center justify-center">
              <span className="w-4 h-4 bg-amber-500/40 rounded-xs" />
            </div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {vi.pages.hostLobby.qrPlaceholder}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-bold mt-4">
            {vi.pages.hostLobby.qrLabel}
          </p>
        </Card>
      </div>

      {/* Joined teams list */}
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">
              {vi.pages.hostLobby.teamsJoinedTitle.replace("{count}", String(totalTeamsCount))}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {vi.pages.hostLobby.readyCounterLabel.replace("{ready}", String(readyTeamsCount)).replace("{total}", String(totalTeamsCount))}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {teams.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              {vi.pages.hostLobby.noTeams}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {teams.map((t) => {
                const teamPlayers = players.filter((p) => p.teamId === t.id);
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-lg border border-slate-800 bg-slate-950/40 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 font-mono">#{t.teamNumber}</span>
                        <h4 className="text-sm font-bold text-slate-200">{t.name}</h4>
                      </div>
                      <div className="text-[10px] text-slate-500">
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-600 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-amber-500 blur-[110px]" />
      </div>

      <div className="flex-1 p-6 z-10">
        <SocketProvider>
          <HostLobbyContent gameId={gameId} />
        </SocketProvider>
      </div>

      {/* Footer */}
      <footer className="h-14 border-t border-slate-800 bg-slate-950 flex items-center justify-center text-[10px] text-slate-500 font-medium px-6 text-center select-none z-10">
        {vi.layout.footer.copyright}
      </footer>
    </div>
  );
}
