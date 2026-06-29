"use client";

import * as React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useGameStore } from "@/stores/game.store";
import { vi } from "@/i18n/vi";
import { formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

// Colors mapped stably to each team number 1-9
const TEAM_COLORS: Record<number, string> = {
  1: "#3B82F6", // Blue
  2: "#10B981", // Emerald
  3: "#F59E0B", // Amber
  4: "#EF4444", // Rose
  5: "#8B5CF6", // Purple
  6: "#06B6D4", // Cyan
  7: "#EC4899", // Pink
  8: "#14B8A6", // Teal
  9: "#F43F5E", // Crimson
};

// Default fallback color
const DEFAULT_COLOR = "#64748B";

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      value: number;
      monopolyRisk: number;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps): React.JSX.Element | null {
  if (active && payload && payload.length > 0) {
    const data = payload[0]?.payload;
    if (!data) return null;
    
    return (
      <div className="p-3 bg-slate-900/95 border border-slate-800 rounded-lg shadow-xl backdrop-blur-sm text-xs space-y-1 select-none">
        <p className="font-extrabold text-foreground">{data.name}</p>
        <p className="text-slate-400 font-bold">
          {vi.stats.marketShare}:{" "}
          <span className="text-accent font-mono">{formatPercent(data.value)}</span>
        </p>
        <p className="text-[10px] text-slate-500 font-bold uppercase">
          {vi.stats.monopolyRisk}: {data.monopolyRisk}%
        </p>
      </div>
    );
  }
  return null;
}

// ─── MarketShareChart Component ──────────────────────────────────────────────────

export function MarketShareChart(): React.JSX.Element {
  const [mounted, setMounted] = React.useState(false);

  // Subscribe narrowly to state changes to optimize performance
  const allTeams = useGameStore((s) => s.allTeams);
  const myTeamId = useGameStore((s) => s.myTeam?.id ?? "");
  const myMarketShare = useGameStore((s) => s.myTeam?.marketShare ?? 0);
  const phase = useGameStore((s) => s.phase);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="border-border bg-card/40 backdrop-blur shadow-xl select-none">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-sm font-bold">{vi.stats.marketShare}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="w-full h-[220px] flex items-center justify-center">
            <div className="text-muted-foreground text-xs animate-pulse">
              {vi.ui.loading.loading}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Map public team info to Recharts data format
  const chartData = allTeams.map((team) => ({
    name: team.name,
    value: team.marketShare,
    color: TEAM_COLORS[team.teamNumber] || DEFAULT_COLOR,
    monopolyRisk: team.monopolyRisk,
    teamId: team.id,
  }));

  // Sort teams for structured rendering under the chart
  const sortedTeams = [...allTeams].sort((a, b) => b.marketShare - a.marketShare);

  return (
    <Card className="border-border bg-card/40 backdrop-blur shadow-xl select-none">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-sm font-bold">{vi.stats.marketShare}</CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">
          Phân chia thị phần tập đoàn
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-4">
        {chartData.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-12">
            Không có đội chơi nào trên thị trường.
          </p>
        ) : (
          <>
            {/* Chart Area */}
            <div className="relative w-full h-[220px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    animationDuration={850}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="stroke-slate-950 focus:outline-none hover:opacity-90 transition-opacity"
                        strokeWidth={entry.teamId === myTeamId ? 2 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Centered Donut Value */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  Thị phần của bạn
                </span>
                <span className="text-2xl font-black text-accent font-mono mt-1.5">
                  {formatPercent(myMarketShare)}
                </span>
              </div>
            </div>

            {/* Legend / Competitor list detail */}
            <div className="space-y-2 mt-4 max-h-[190px] overflow-y-auto pr-1">
              {sortedTeams.map((team) => {
                const isOwnTeam = team.id === myTeamId;
                const color = TEAM_COLORS[team.teamNumber] || DEFAULT_COLOR;
                
                return (
                  <div
                    key={team.id}
                    className={cn(
                      "p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors duration-200",
                      isOwnTeam
                        ? "bg-accent/5 border-accent/40 shadow-[0_0_12px_rgba(245,166,35,0.05)]"
                        : "bg-background/25 border-border/40 hover:border-border"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className={cn("font-bold text-slate-300", isOwnTeam && "text-accent")}>
                        #{team.teamNumber} {team.name}
                      </span>
                      {isOwnTeam && (
                        <span className="text-[8px] bg-accent/20 text-accent border border-accent/20 px-1 py-0.2 rounded font-black tracking-widest scale-90">
                          BẠN
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {phase === "lobby" ? (
                        <span className={cn(
                          "text-[9px] font-black uppercase border px-1.5 py-0.5 rounded",
                          team.status === "ready"
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                            : "border-slate-800 bg-slate-900 text-slate-400"
                        )}>
                          {team.status === "ready" ? "Sẵn sàng" : "Chờ..."}
                        </span>
                      ) : (
                        <div className="text-right">
                          <span className="font-extrabold text-slate-300 font-mono">
                            {formatPercent(team.marketShare)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
