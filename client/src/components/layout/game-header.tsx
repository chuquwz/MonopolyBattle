"use client";

import * as React from "react";
import { useSocket } from "@/hooks/use-socket";
import { useGameState } from "@/hooks/use-game-state";
import { Badge } from "@/components/ui/badge";
import { vi } from "@/i18n/vi";

/**
 * MM:SS time formatter helper.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function GameHeader() {
  const { isConnected } = useSocket();
  const gameState = useGameState();

  const roomCode = gameState?.roomCode || "";
  const phase = gameState?.phase || "lobby";
  const currentRound = gameState?.currentRound || 0;
  const totalRounds = gameState?.totalRounds || 8;
  const secondsLeft = gameState?.roundTimeLeft ?? 0;
  const role = gameState?.role || "player";
  const myTeam = gameState?.myTeam;

  // Translate role to Vietnamese
  const roleLabel = React.useMemo(() => {
    switch (role) {
      case "host":
        return vi.layout.header.roleHost;
      case "projector":
        return vi.layout.header.roleProjector;
      default:
        return vi.layout.header.rolePlayer;
    }
  }, [role]);

  // Determine connection status text and color
  const connectionState = React.useMemo(() => {
    if (isConnected) {
      return {
        label: vi.layout.header.connectionConnected,
        color: "bg-success text-success-foreground",
        dotColor: "bg-emerald-500",
      };
    }
    return {
      label: vi.layout.header.connectionDisconnected,
      color: "bg-destructive text-destructive-foreground",
      dotColor: "bg-rose-500",
    };
  }, [isConnected]);

  return (
    <header className="h-[4.5rem] w-full border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between z-10">
      {/* Brand Logo & Connection Badge */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
          {vi.meta.title.split(" — ")[0]}
        </h1>
        <div className="flex items-center gap-2">
          <span className={`flex h-2.5 w-2.5 relative`}>
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connectionState.dotColor}`} />
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {connectionState.label}
          </span>
        </div>
      </div>

      {/* Game context (Round, Phase, Countdown) */}
      {gameState && (
        <div className="flex items-center gap-6">
          {/* Round counter */}
          {phase !== "lobby" && phase !== "finished" && (
            <div className="text-sm font-semibold text-slate-300">
              {vi.game.round.replace("{round}", `${currentRound}/${totalRounds}`)}
            </div>
          )}

          {/* Phase indicator */}
          <Badge variant={phase === "processing" ? "warning" : "default"}>
            {vi.game.phase[phase]}
          </Badge>

          {/* Countdown timer */}
          {phase !== "lobby" && phase !== "finished" && secondsLeft > 0 && (
            <div className={`font-mono text-lg font-bold tracking-wider px-3 py-1 rounded bg-slate-900 border ${secondsLeft <= 10 ? 'text-red-500 border-red-500/30 animate-pulse' : 'text-amber-400 border-slate-800'}`}>
              {formatTime(secondsLeft)}
            </div>
          )}
        </div>
      )}

      {/* Room code and user context */}
      <div className="flex items-center gap-4">
        {roomCode && (
          <div className="text-sm font-semibold text-amber-500 bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">
            {vi.layout.header.gameCode.replace("{code}", roomCode)}
          </div>
        )}
        
        {/* Role & Team display */}
        <div className="text-right hidden sm:block">
          <div className="text-xs text-slate-500 font-medium tracking-wide uppercase">
            {roleLabel}
          </div>
          {myTeam && (
            <div className="text-sm font-bold text-slate-300">
              {myTeam.name}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
