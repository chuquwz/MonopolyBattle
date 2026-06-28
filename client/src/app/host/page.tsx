"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { vi } from "@/i18n/vi";
import { apiRequest } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface HostLoginResponse {
  success: boolean;
  token: string;
  role: string;
}

interface GameCreateResponse {
  success: boolean;
  token: string;
  game: {
    id: string;
    roomCode: string;
    status: string;
    currentRound: number;
    totalRounds: number;
    roundDurationSec: number;
    createdAt: string;
  };
}

export default function HostPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [hostPin, setHostPin] = React.useState("");
  const [totalRounds, setTotalRounds] = React.useState(8);
  const [roundDurationSec, setRoundDurationSec] = React.useState(60);
  const [quizEnabled, setQuizEnabled] = React.useState(true);
  
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // Process Host authentication with PIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hostPin.length !== 6) {
      setError(vi.validation.roomCodeLength); // Uses 6-character length message
      return;
    }

    setLoading(true);
    setError("");

    const response = await apiRequest<HostLoginResponse>("/api/auth/host", {
      method: "POST",
      body: JSON.stringify({ hostPin }),
    });

    setLoading(false);

    if (response.error || !response.data) {
      setError(response.error || vi.errors.invalidInput);
    } else {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
      localStorage.setItem(STORAGE_KEYS.ROLE, "host");
      setIsAuthenticated(true);
    }
  };

  // Process game creation form submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) {
      setError(vi.errors.serverError);
      setIsAuthenticated(false);
      return;
    }

    setLoading(true);
    setError("");

    const response = await apiRequest<GameCreateResponse>("/api/games", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        totalRounds: Number(totalRounds),
        roundDurationSec: Number(roundDurationSec),
        quizEnabled,
      }),
    });

    setLoading(false);

    if (response.error || !response.data) {
      setError(response.error || vi.errors.serverError);
    } else {
      // Save the new token containing gameId
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
      localStorage.setItem(STORAGE_KEYS.GAME_ID, response.data.game.id);
      
      router.push("/host/lobby");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-25">
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] rounded-full bg-blue-600 blur-[130px] animate-pulse" />
        <div className="absolute bottom-1/3 left-1/4 w-[350px] h-[350px] rounded-full bg-amber-500 blur-[110px] animate-pulse" style={{ animationDuration: '7s' }} />
      </div>

      {/* Main form container */}
      <div className="flex-1 flex items-center justify-center p-6 z-10">
        {!isAuthenticated ? (
          /* Authentication Screen */
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur w-full max-w-md shadow-2xl">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                {vi.pages.host.loginTitle}
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                {vi.pages.host.loginSubtitle}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLoginSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin-input">{vi.pages.host.pinLabel}</Label>
                  <Input
                    id="pin-input"
                    type="password"
                    maxLength={6}
                    placeholder={vi.pages.host.pinPlaceholder}
                    value={hostPin}
                    onChange={(e) => setHostPin(e.target.value.replace(/\D/g, ""))}
                    disabled={loading}
                    className="text-center tracking-widest font-mono text-lg"
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
                  {loading ? vi.pages.host.creating : vi.pages.host.loginButton}
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          /* Game Setup Screen */
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur w-full max-w-lg shadow-2xl">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                {vi.pages.host.createTitle}
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                {vi.pages.host.createSubtitle}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateSubmit}>
              <CardContent className="space-y-6">
                {/* Total Rounds */}
                <div className="space-y-2">
                  <Label htmlFor="rounds-input">{vi.pages.host.roundsLabel}</Label>
                  <Input
                    id="rounds-input"
                    type="number"
                    min={1}
                    max={20}
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(Number(e.target.value))}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Round Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration-input">{vi.pages.host.durationLabel}</Label>
                  <Input
                    id="duration-input"
                    type="number"
                    min={10}
                    max={300}
                    value={roundDurationSec}
                    onChange={(e) => setRoundDurationSec(Number(e.target.value))}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Quiz Enabled toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40">
                  <div className="space-y-0.5">
                    <Label htmlFor="quiz-toggle" className="text-sm font-semibold">
                      {vi.pages.host.quizLabel}
                    </Label>
                  </div>
                  <input
                    id="quiz-toggle"
                    type="checkbox"
                    checked={quizEnabled}
                    onChange={(e) => setQuizEnabled(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-slate-800 text-amber-500 focus:ring-amber-500 bg-slate-950 accent-amber-500 cursor-pointer"
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
                  {loading ? vi.pages.host.creating : vi.pages.host.createButton}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>

      {/* Styled Footer */}
      <footer className="h-14 border-t border-slate-800 bg-slate-950 flex items-center justify-center text-[10px] text-slate-500 font-medium px-6 text-center select-none z-10">
        {vi.layout.footer.copyright}
      </footer>
    </div>
  );
}
