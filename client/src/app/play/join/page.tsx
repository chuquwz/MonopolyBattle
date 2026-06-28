"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { vi } from "@/i18n/vi";
import { apiRequest } from "@/lib/api";
import { joinGameSchema } from "@/lib/validation";
import { STORAGE_KEYS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JoinGameResponse {
  success: boolean;
  token: string;
  player: {
    id: string;
    displayName: string;
    isConnected: boolean;
  };
  team: {
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
    status: string;
  };
}

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1] || ""));
  } catch {
    return null;
  }
}

function JoinFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [roomCode, setRoomCode] = React.useState("");
  const [teamName, setTeamName] = React.useState("");
  const [playerName, setPlayerName] = React.useState("");
  
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // Auto-populate room code from URL parameters
  React.useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setRoomCode(code.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs locally using Zod
    const validation = joinGameSchema.safeParse({
      roomCode: roomCode.trim(),
      teamName: teamName.trim(),
      playerName: playerName.trim(),
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || vi.errors.invalidInput;
      setError(firstError);
      return;
    }

    setLoading(true);
    setError("");

    const response = await apiRequest<JoinGameResponse>("/api/auth/join", {
      method: "POST",
      body: JSON.stringify({
        roomCode: roomCode.toUpperCase().trim(),
        teamName: teamName.trim(),
        playerName: playerName.trim(),
      }),
    });

    setLoading(false);

    if (response.error || !response.data) {
      setError(response.error || vi.errors.invalidInput);
    } else {
      const token = response.data.token;
      const decoded = parseJwt(token);
      
      if (decoded) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.ROLE, "player");
        localStorage.setItem(STORAGE_KEYS.GAME_ID, decoded.gameId || "");
        localStorage.setItem(STORAGE_KEYS.TEAM_ID, decoded.teamId || "");
        
        router.push("/play/lobby");
      } else {
        setError(vi.errors.serverError);
      }
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/60 backdrop-blur w-full max-w-md shadow-2xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent select-none">
          {vi.pages.join.title}
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs">
          {vi.pages.join.subtitle}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Room Code */}
          <div className="space-y-2">
            <Label htmlFor="room-code-input">{vi.pages.join.roomCodeLabel}</Label>
            <Input
              id="room-code-input"
              type="text"
              maxLength={6}
              placeholder={vi.pages.join.roomCodePlaceholder}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/gi, ""))}
              disabled={loading}
              className="font-mono tracking-widest text-center"
              required
            />
          </div>

          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="team-name-input">{vi.pages.join.teamNameLabel}</Label>
            <Input
              id="team-name-input"
              type="text"
              maxLength={30}
              placeholder={vi.pages.join.teamNamePlaceholder}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Player Name */}
          <div className="space-y-2">
            <Label htmlFor="player-name-input">{vi.pages.join.playerNameLabel}</Label>
            <Input
              id="player-name-input"
              type="text"
              maxLength={30}
              placeholder={vi.pages.join.playerNamePlaceholder}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 p-3 rounded">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold"
          >
            {loading ? vi.pages.join.joining : vi.pages.join.joinButton}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function JoinGamePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-25">
        <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] rounded-full bg-blue-600 blur-[130px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] rounded-full bg-amber-500 blur-[110px] animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 z-10">
        <React.Suspense fallback={
          <div className="text-slate-400 text-sm animate-pulse">{vi.ui.loading.loading}</div>
        }>
          <JoinFormContent />
        </React.Suspense>
      </div>

      {/* Styled Footer */}
      <footer className="h-14 border-t border-slate-800 bg-slate-950 flex items-center justify-center text-[10px] text-slate-500 font-medium px-6 text-center select-none z-10">
        {vi.layout.footer.copyright}
      </footer>
    </div>
  );
}
