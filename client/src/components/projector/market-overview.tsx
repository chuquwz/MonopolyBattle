"use client";

import * as React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip } from "recharts";
import { vi } from "@/i18n/vi";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicTeamInfo } from "@monopoly/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketOverviewProps {
  /** All teams' public info from the game store. */
  teams: PublicTeamInfo[];
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
// Custom bar chart tooltip (projector-sized)
// ---------------------------------------------------------------------------

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PublicTeamInfo & { color: string } }>;
}

function ProjectorTooltip({ active, payload }: TooltipProps): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="px-4 py-3 bg-slate-900/95 border border-slate-700 rounded-xl shadow-xl text-sm">
      <p className="font-extrabold text-white mb-1">{item.name}</p>
      <p className="text-slate-400">
        {vi.pages.projector.marketShareLabel}:{" "}
        <span className="text-amber-300 font-mono font-bold">
          {formatPercent(item.marketShare)}
        </span>
      </p>
      <p className="text-slate-400">
        {vi.pages.projector.monopolyRiskLabel}:{" "}
        <span
          className={cn(
            "font-mono font-bold",
            item.monopolyRisk >= 70
              ? "text-rose-400"
              : item.monopolyRisk >= 50
              ? "text-orange-400"
              : "text-emerald-400"
          )}
        >
          {item.monopolyRisk}%
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MarketOverview
// ---------------------------------------------------------------------------

/**
 * Full-width market overview panel for projector display.
 * Shows a bar chart of market share and a team summary grid.
 * Accepts teams as a prop so it can be used independently of Zustand.
 */
export function MarketOverview({ teams }: MarketOverviewProps): React.JSX.Element {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const sortedTeams = [...teams].sort((a, b) => b.marketShare - a.marketShare);

  const chartData = sortedTeams.map((t) => ({
    ...t,
    color: TEAM_COLORS[t.teamNumber] ?? DEFAULT_COLOR,
  }));

  if (!mounted) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-slate-500 text-lg animate-pulse">
        {vi.ui.loading.loading}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="w-full h-32 flex items-center justify-center text-slate-500 text-xl">
        {vi.pages.projector.waitingTeams}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Bar chart */}
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 18, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: "#64748b", fontSize: 14 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<ProjectorTooltip />} cursor={false} />
            <Bar dataKey="marketShare" radius={[6, 6, 0, 0]} maxBarSize={80}>
              {chartData.map((entry, idx) => (
                <Cell key={`bar-${idx}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Team cards grid */}
      <div className="grid grid-cols-3 gap-4">
        {sortedTeams.map((team, idx) => {
          const color = TEAM_COLORS[team.teamNumber] ?? DEFAULT_COLOR;
          const risk = team.monopolyRisk;
          const riskColor =
            risk >= 70
              ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
              : risk >= 50
              ? "text-orange-400 border-orange-500/30 bg-orange-500/10"
              : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";

          return (
            <div
              key={team.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-3"
              style={{ borderLeftColor: color, borderLeftWidth: 4 }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xl font-black text-slate-100 truncate">
                  #{idx + 1} {team.name}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-base font-semibold">
                  {vi.pages.projector.marketShareLabel}
                </span>
                <span className="text-2xl font-black font-mono text-amber-300">
                  {formatPercent(team.marketShare)}
                </span>
              </div>

              <div
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-1.5 border text-sm font-bold",
                  riskColor
                )}
              >
                <span>{vi.pages.projector.monopolyRiskLabel}</span>
                <span className="font-mono font-black">{risk}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
