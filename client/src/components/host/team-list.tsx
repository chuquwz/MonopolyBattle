"use client";

import * as React from "react";
import { Wifi, WifiOff, CheckCircle2, Clock } from "lucide-react";
import { vi } from "@/i18n/vi";
import { cn } from "@/lib/utils";
import { formatPercent, formatScore } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HostTeamInfo {
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
  isConnected: boolean;
  /** Whether the team has submitted a decision this round. */
  hasSubmitted: boolean;
}

export interface TeamListProps {
  teams: HostTeamInfo[];
  /** Whether the game is in the decision phase (shows submission status). */
  showSubmissionStatus: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEAM_COLORS: Record<number, string> = {
  1: "#3B82F6",
  2: "#10B981",
  3: "#F59E0B",
  4: "#EF4444",
  5: "#8B5CF6",
  6: "#06B6D4",
  7: "#EC4899",
  8: "#14B8A6",
  9: "#F43F5E",
};
const DEFAULT_COLOR = "#64748B";

// ---------------------------------------------------------------------------
// TeamList
// ---------------------------------------------------------------------------

/**
 * Host-facing team list showing connection status, submission status,
 * and key stats. Used in the host control dashboard.
 */
export function TeamList({ teams, showSubmissionStatus }: TeamListProps): React.JSX.Element {
  const connected = teams.filter((t) => t.isConnected).length;

  return (
    <Card className="border-border bg-card/40 backdrop-blur shadow-xl">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold">
              {vi.pages.hostControl.teamsSectionTitle}
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              {vi.pages.hostControl.connectedTeamsLabel}: {connected}/{teams.length}
            </CardDescription>
          </div>
          <Badge
            variant={connected === teams.length && teams.length > 0 ? "default" : "secondary"}
            className="text-xs font-bold"
          >
            {connected}/{teams.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {teams.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {vi.pages.hostControl.emptyTeams}
          </p>
        ) : (
          <div className="space-y-2.5">
            {teams.map((team) => {
              const color = TEAM_COLORS[team.teamNumber] ?? DEFAULT_COLOR;
              const isOnline = team.isConnected;

              return (
                <div
                  key={team.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors duration-200",
                    isOnline
                      ? "border-border/60 bg-background/30 hover:border-border"
                      : "border-border/30 bg-background/15 opacity-60"
                  )}
                >
                  {/* Team colour dot */}
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />

                  {/* Team number + name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">
                        #{team.teamNumber}
                      </span>
                      <span className="text-sm font-bold text-foreground/90 truncate">
                        {team.name}
                      </span>
                    </div>
                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{vi.stats.marketShare}: {formatPercent(team.marketShare)}</span>
                      <span>{vi.stats.score}: {formatScore(team.totalScore)}</span>
                    </div>
                  </div>

                  {/* Connection status */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isOnline ? (
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <WifiOff className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        isOnline ? "text-emerald-400" : "text-slate-600"
                      )}
                    >
                      {isOnline
                        ? vi.pages.hostControl.teamStatusOnline
                        : vi.pages.hostControl.teamStatusOffline}
                    </span>
                  </div>

                  {/* Submission badge (decision phase only) */}
                  {showSubmissionStatus && (
                    <div className="shrink-0">
                      {team.hasSubmitted ? (
                        <div className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[10px] font-bold">
                            {vi.pages.hostControl.teamSubmitted}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-[10px] font-bold">
                            {vi.pages.hostControl.teamPending}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
