"use client";

import * as React from "react";
import { Activity, Users, Trophy } from "lucide-react";
import { vi } from "@/i18n/vi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatScore, formatPercent } from "@/lib/format";
import type { LeaderboardEntry, GamePhase } from "@monopoly/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HostControlPanelProps {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  roundTimeLeft: number;
  roomCode: string;
  connectedTeams: number;
  totalTeams: number;
  submittedCount: number;
  leaderboard: LeaderboardEntry[];
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accentClass?: string;
}

function StatCard({ label, value, sub, icon, accentClass }: StatCardProps): React.JSX.Element {
  return (
    <Card className="border-border bg-card/40 backdrop-blur">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
              {label}
            </p>
            <p className={cn("text-2xl font-black font-mono tabular-nums", accentClass ?? "text-foreground")}>
              {value}
            </p>
            {sub && (
              <p className="text-[10px] text-muted-foreground font-semibold truncate">{sub}</p>
            )}
          </div>
          <div className="text-muted-foreground/60 shrink-0 mt-0.5">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// HostControlPanel
// ---------------------------------------------------------------------------

/**
 * Summary panel at the top of the host control dashboard.
 *
 * Shows:
 * - Phase badge
 * - Round counter
 * - Connected teams
 * - Submission count
 * - Mini top-3 leaderboard snapshot
 */
export function HostControlPanel({
  phase,
  currentRound,
  totalRounds,
  roundTimeLeft,
  roomCode,
  connectedTeams,
  totalTeams,
  submittedCount,
  leaderboard,
}: HostControlPanelProps): React.JSX.Element {
  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Room code + status strip */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {vi.layout.header.gameCode.replace("{code}", roomCode)}
          </span>
        </div>

        <span
          className={cn(
            "ml-auto text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full border",
            phase === "finished"
              ? "border-slate-600 bg-slate-700/30 text-slate-400"
              : phase === "decision"
              ? "border-accent/40 bg-accent/10 text-accent"
              : phase === "quiz"
              ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
              : "border-blue-500/40 bg-blue-500/10 text-blue-400"
          )}
        >
          {vi.game.phase[phase] ?? phase}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={vi.pages.hostControl.roundLabel}
          value={currentRound > 0 ? `${currentRound}/${totalRounds}` : "—"}
          sub={vi.pages.hostControl.phaseLabel}
          icon={<Activity className="w-5 h-5" />}
          accentClass="text-accent"
        />
        <StatCard
          label={vi.pages.hostControl.countdownLabel}
          value={roundTimeLeft > 0 ? `${roundTimeLeft}s` : "—"}
          icon={<Activity className="w-5 h-5" />}
          accentClass={
            roundTimeLeft <= 10 && roundTimeLeft > 0 ? "text-destructive animate-pulse" : "text-foreground"
          }
        />
        <StatCard
          label={vi.pages.hostControl.connectedTeamsLabel}
          value={`${connectedTeams}/${totalTeams}`}
          icon={<Users className="w-5 h-5" />}
          accentClass={connectedTeams === totalTeams && totalTeams > 0 ? "text-emerald-400" : "text-foreground"}
        />
        <StatCard
          label={vi.pages.hostControl.submissionLabel}
          value={phase === "decision" ? `${submittedCount}/${totalTeams}` : "—"}
          icon={<Activity className="w-5 h-5" />}
          accentClass={submittedCount === totalTeams && totalTeams > 0 ? "text-emerald-400" : "text-foreground"}
        />
      </div>

      {/* Mini leaderboard snapshot */}
      {top3.length > 0 && (
        <Card className="border-border bg-card/40 backdrop-blur">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" />
              {vi.layout.sidebar.leaderboardTitle}
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground">
              Top 3 đội dẫn đầu
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {top3.map((entry) => {
                const medals = ["🥇", "🥈", "🥉"] as const;
                const medal = medals[entry.rank - 1] ?? `#${entry.rank}`;
                return (
                  <div
                    key={entry.teamId}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/50 bg-background/30 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{medal}</span>
                      <span className="font-bold text-foreground/90 truncate max-w-[120px]">
                        {entry.teamName}
                      </span>
                    </div>
                    <span className="font-mono font-black text-accent">
                      {formatScore(entry.totalScore)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
