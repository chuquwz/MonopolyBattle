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
  const [error, setError] = React.useState("");
  
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
    }
    setLoading(false);
  }, [gameId]);

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

    socket.on("team:joined", handleUpdate);
    socket.on("team:ready", handleUpdate);

    // Watch for countdown starting
    const handleCountdown = (data: { seconds: number }) => {
      setTransitioning(true);
      setCountdownSeconds(data.seconds);
    };
    socket.on("game:countdown", handleCountdown);

    // Handle phase transitions
    const handlePhaseChange = (data: { phase: string }) => {
      if (data.phase === "countdown") {
        setTransitioning(true);
      } else if (data.phase !== "lobby") {
        // Here, the game has fully started. Normally we redirect to /play/game.
        // As game page implementation is out of scope for Task 14, we just show state.
        setTransitioning(true);
      }
    };
    socket.on("game:phase-change", handlePhaseChange);

    return () => {
      socket.off("team:joined", handleUpdate);
      socket.off("team:ready", handleUpdate);
      socket.off("game:countdown", handleCountdown);
      socket.off("game:phase-change", handlePhaseChange);
    };
  }, [socket, fetchGameState]);

  const handleMarkReady = () => {
    if (socket && isConnected) {
      socket.emit("player:ready");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400 text-sm animate-pulse">{vi.ui.loading.loading}</p>
      </div>
    );
  }

  // Intercept view during pre-game countdown
  if (transitioning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full border-4 border-amber-500/20 animate-ping" />
          <div className="w-20 h-20 rounded-full bg-slate-900 border border-amber-500/50 flex items-center justify-center text-4xl font-extrabold text-amber-400 font-mono shadow-2xl">
            {countdownSeconds ?? "!"}
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-wide uppercase text-slate-100">
            {vi.game.phase.countdown}
          </h2>
          <p className="text-slate-400 text-xs">
            Trận chiến độc quyền chuẩn bị bắt đầu. Sẵn sàng đưa ra quyết định chiến lược!
          </p>
        </div>
      </div>
    );
  }

  const otherTeams = allTeams.filter((t) => t.id !== teamId);
  const isReady = myTeam?.status === "ready";

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      {/* Top connection banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            {vi.pages.playerLobby.title}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {vi.pages.playerLobby.connectionStatus}: {isConnected ? vi.layout.header.connectionConnected : vi.layout.header.connectionDisconnected}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isConnected ? "default" : "destructive"} className="px-3 py-1 text-xs">
            {isConnected ? "ONLINE" : "OFFLINE"}
          </Badge>
          {game && (
            <div className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">
              {vi.layout.header.gameCode.replace("{code}", game.roomCode)}
            </div>
          )}
        </div>
      </div>

      {/* Main card grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left column: Own Team detail and Ready button */}
        <Card className="md:col-span-2 border-slate-800 bg-slate-900/40 backdrop-blur shadow-xl flex flex-col justify-between">
          <CardHeader>
            <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Thông tin đội của bạn
            </CardDescription>
            <CardTitle className="text-3xl font-black text-slate-100 flex items-center gap-3">
              <span className="text-amber-500 font-mono">#{myTeam?.teamNumber}</span>
              {myTeam?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {vi.stats.money}
                </span>
                <span className="text-lg font-bold text-slate-200 mt-1 block">
                  {myTeam?.money.toLocaleString()} {vi.stats.moneyUnit}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {vi.stats.marketShare}
                </span>
                <span className="text-lg font-bold text-slate-200 mt-1 block">
                  {myTeam?.marketShare}%
                </span>
              </div>
            </div>

            {/* Waiting animation */}
            <div className="flex items-center gap-4 p-4 rounded-lg border border-slate-800 bg-slate-950/60">
              <div className="flex space-x-1.5 items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {vi.pages.playerLobby.waitingForHost}
              </span>
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-800/60 pt-6">
            <Button
              onClick={handleMarkReady}
              disabled={isReady || !isConnected}
              className={`w-full font-bold h-11 transition-all ${isReady ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/10' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'}`}
            >
              {isReady ? vi.pages.playerLobby.isReadyLabel : vi.pages.playerLobby.readyButton}
            </Button>
          </CardFooter>
        </Card>

        {/* Right column: Status of other teams in the lobby */}
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur shadow-xl">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-base font-bold">
              {vi.pages.playerLobby.otherTeamsTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 max-h-[350px] overflow-y-auto">
            {otherTeams.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs leading-relaxed">
                {vi.pages.playerLobby.noOtherTeams}
              </div>
            ) : (
              <div className="space-y-3">
                {otherTeams.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded border border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono font-bold">#{t.teamNumber}</span>
                      <span className="font-bold text-slate-300">{t.name}</span>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-600 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-amber-500 blur-[110px]" />
      </div>

      <div className="flex-1 p-6 z-10">
        <SocketProvider>
          <PlayerLobbyContent gameId={authData.gameId} teamId={authData.teamId} />
        </SocketProvider>
      </div>

      {/* Footer */}
      <footer className="h-14 border-t border-slate-800 bg-slate-950 flex items-center justify-center text-[10px] text-slate-500 font-medium px-6 text-center select-none z-10">
        {vi.layout.footer.copyright}
      </footer>
    </div>
  );
}
