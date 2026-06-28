"use client";

import * as React from "react";
import { useSocket } from "@/hooks/use-socket";
import { useGameStore } from "@/stores/game.store";
import { Badge } from "@/components/ui/badge";
import { vi } from "@/i18n/vi";
import { formatTime } from "@/lib/format";

export function GameHeader() {
  const { isConnected } = useSocket();

  // Optimized selector subscriptions
  const roomCode = useGameStore((s) => s.roomCode);
  const phase = useGameStore((s) => s.phase);
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const secondsLeft = useGameStore((s) => s.roundTimeLeft);
  const role = useGameStore((s) => s.role);
  const myTeam = useGameStore((s) => s.myTeam);

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
        dotColor: "bg-success",
      };
    }
    return {
      label: vi.layout.header.connectionDisconnected,
      color: "bg-destructive text-destructive-foreground",
      dotColor: "bg-destructive",
    };
  }, [isConnected]);

  return (
    <header className="h-[4.5rem] w-full border-b border-border bg-background px-6 flex items-center justify-between z-10">
      {/* Brand Logo & Connection Badge */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
          {vi.meta.title.split(" — ")[0]}
        </h1>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connectionState.dotColor}`} />
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {connectionState.label}
          </span>
        </div>
      </div>

      {/* Game context (Round, Phase, Countdown) */}
      <div className="flex items-center gap-6">
        {/* Round counter */}
        {phase !== "lobby" && phase !== "finished" && (
          <div className="text-sm font-semibold text-foreground/90">
            {vi.game.round.replace("{round}", `${currentRound}/${totalRounds}`)}
          </div>
        )}

        {/* Phase indicator */}
        <Badge variant={phase === "processing" ? "secondary" : "default"}>
          {vi.game.phase[phase]}
        </Badge>

        {/* Countdown timer */}
        {phase !== "lobby" && phase !== "finished" && secondsLeft > 0 && (
          <div className={`font-mono text-lg font-bold tracking-wider px-3 py-1 rounded bg-card border ${secondsLeft <= 10 ? 'text-destructive border-destructive/30 animate-pulse' : 'text-accent border-border'}`}>
            {formatTime(secondsLeft)}
          </div>
        )}
      </div>

      {/* Room code and user context */}
      <div className="flex items-center gap-4">
        {roomCode && (
          <div className="text-sm font-semibold text-accent bg-accent/10 px-3 py-1 rounded border border-accent/20">
            {vi.layout.header.gameCode.replace("{code}", roomCode)}
          </div>
        )}
        
        {/* Role & Team display */}
        <div className="text-right hidden sm:block">
          <div className="text-[10px] text-muted-foreground font-bold tracking-wide uppercase">
            {roleLabel}
          </div>
          {myTeam && (
            <div className="text-sm font-bold text-foreground/80">
              {myTeam.name}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
