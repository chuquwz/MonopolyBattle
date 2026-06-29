"use client";

import * as React from "react";
import { ArrowUp, ArrowDown, Minus, Trophy } from "lucide-react";
import { useGameStore } from "@/stores/game.store";
import { vi } from "@/i18n/vi";
import { formatScore } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Colors mapped stably to each team number 1-9
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

export function Leaderboard(): React.JSX.Element {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const myTeamId = useGameStore((s) => s.myTeam?.id ?? "");

  return (
    <Card className="border-border bg-card/40 backdrop-blur shadow-xl select-none">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          <span>{vi.layout.sidebar.leaderboardTitle}</span>
        </CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">
          Bảng xếp hạng điểm số hiện tại
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        {leaderboard.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-8">
            Đang cập nhật xếp hạng từ máy chủ...
          </p>
        ) : (
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {leaderboard.map((item) => {
              const isOwnTeam = item.teamId === myTeamId;
              const color = TEAM_COLORS[item.teamNumber] || "#64748B";
              
              return (
                <div
                  key={item.teamId}
                  className={cn(
                    "p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors duration-200",
                    isOwnTeam
                      ? "bg-accent/5 border-accent/40 shadow-[0_0_12px_rgba(245,166,35,0.05)]"
                      : "bg-background/25 border-border/40 hover:border-border"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {/* Rank Badge */}
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono text-[10px]",
                      item.rank === 1
                        ? "bg-accent text-slate-950 shadow-md"
                        : item.rank === 2
                        ? "bg-slate-300 text-slate-900"
                        : item.rank === 3
                        ? "bg-amber-700 text-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {item.rank}
                    </span>
                    
                    {/* Team Color indicator and Name */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className={cn("font-bold text-slate-300", isOwnTeam && "text-accent")}>
                      {item.teamName}
                    </span>
                    {isOwnTeam && (
                      <span className="text-[8px] bg-accent/20 text-accent border border-accent/20 px-1 py-0.2 rounded font-black tracking-widest scale-90">
                        BẠN
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Rank change icon */}
                    <div className="flex items-center justify-center w-4 h-4">
                      {item.rankChange === "up" && (
                        <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {item.rankChange === "down" && (
                        <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      {item.rankChange === "same" && (
                        <Minus className="w-3 h-3 text-slate-500" />
                      )}
                    </div>
                    
                    {/* Total Score */}
                    <span className="font-extrabold text-slate-200 font-mono">
                      {formatScore(item.totalScore)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
