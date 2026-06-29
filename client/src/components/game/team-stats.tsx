"use client";

import * as React from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { Landmark, TrendingUp, Zap, Award, ShieldAlert, Trophy } from "lucide-react";
import { useGameStore } from "@/stores/game.store";
import { vi } from "@/i18n/vi";
import { formatMoney, formatPercent, formatScore } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// ─── AnimatedNumber Component ───────────────────────────────────────────────────

interface AnimatedNumberProps {
  value: number;
  formatter?: (v: number) => string;
}

export function AnimatedNumber({ value, formatter }: AnimatedNumberProps): React.JSX.Element {
  const ref = React.useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(value);

  React.useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.8, ease: "easeOut" });
    return () => controls.stop();
  }, [value, motionValue]);

  React.useEffect(() => {
    // Set initial text
    if (ref.current) {
      ref.current.textContent = formatter ? formatter(value) : Math.round(value).toString();
    }

    return motionValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatter ? formatter(latest) : Math.round(latest).toString();
      }
    });
  }, [motionValue, formatter, value]);

  return <span ref={ref} />;
}

// ─── TeamStats Component ─────────────────────────────────────────────────────────

export function TeamStats(): React.JSX.Element {
  // Narrow subscriptions to specific metrics to optimize performance
  const money = useGameStore((s) => s.myTeam?.money ?? 0);
  const marketShare = useGameStore((s) => s.myTeam?.marketShare ?? 0);
  const technology = useGameStore((s) => s.myTeam?.technology ?? 0);
  const reputation = useGameStore((s) => s.myTeam?.reputation ?? 0);
  const monopolyRisk = useGameStore((s) => s.myTeam?.monopolyRisk ?? 0);
  const totalScore = useGameStore((s) => s.myTeam?.totalScore ?? 0);
  
  const teamName = useGameStore((s) => s.myTeam?.name ?? "");
  const teamNumber = useGameStore((s) => {
    const myId = s.myTeam?.id;
    if (!myId) return 0;
    const match = s.allTeams.find((t) => t.id === myId);
    return match?.teamNumber ?? 0;
  });

  return (
    <Card className="border-border bg-card/60 backdrop-blur shadow-xl overflow-hidden select-none">
      <CardHeader className="border-b border-border pb-4 relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
        <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
          {vi.layout.header.rolePlayer}
        </CardDescription>
        <CardTitle className="text-2xl font-black text-foreground flex items-center gap-2 mt-1">
          <span className="text-accent font-mono">#{teamNumber}</span>
          {teamName || vi.ui.loading.loading}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-5">
        {/* Money Stat Row */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/30 hover:bg-background/50 transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Landmark className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase">{vi.stats.money}</span>
          </div>
          <span className="font-extrabold text-sm text-foreground/90 font-mono">
            <AnimatedNumber value={money} formatter={formatMoney} />
          </span>
        </div>

        {/* Market Share Stat Row */}
        <div className="space-y-2 p-3 rounded-lg border border-border bg-background/30">
          <div className="flex justify-between text-xs font-bold leading-none">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold uppercase">{vi.stats.marketShare}</span>
            </div>
            <span className="text-foreground/95 font-mono">
              <AnimatedNumber value={marketShare} formatter={formatPercent} />
            </span>
          </div>
          <Progress value={marketShare} className="h-2" indicatorColor="bg-accent" />
        </div>

        {/* Monopoly Risk Stat Row */}
        <div className="space-y-2 p-3 rounded-lg border border-border bg-background/30">
          <div className="flex justify-between text-xs font-bold leading-none">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldAlert className="w-4 h-4 text-monopoly-risk" />
              <span className="text-xs font-bold uppercase">{vi.stats.monopolyRisk}</span>
            </div>
            <span className="text-monopoly-risk font-bold font-mono">
              <AnimatedNumber value={monopolyRisk} formatter={(v) => `${Math.round(v)}%`} />
            </span>
          </div>
          <Progress
            value={monopolyRisk}
            className="h-2 bg-monopoly-risk/20"
            indicatorColor="bg-monopoly-risk"
          />
        </div>

        {/* Mini Grid for Tech, Reputation, Total Score */}
        <div className="grid grid-cols-3 gap-3">
          {/* Tech */}
          <div className="flex flex-col items-center p-3 rounded-lg border border-border bg-background/25 text-center hover:bg-background/40 transition-colors">
            <Zap className="w-4 h-4 text-blue-400 mb-1" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{vi.stats.technology}</span>
            <span className="text-sm font-black text-foreground font-mono">
              <AnimatedNumber value={technology} />
            </span>
          </div>

          {/* Reputation */}
          <div className="flex flex-col items-center p-3 rounded-lg border border-border bg-background/25 text-center hover:bg-background/40 transition-colors">
            <Award className="w-4 h-4 text-pink-400 mb-1" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{vi.stats.reputation}</span>
            <span className="text-sm font-black text-foreground font-mono">
              <AnimatedNumber value={reputation} />
            </span>
          </div>

          {/* Total Score */}
          <div className="flex flex-col items-center p-3 rounded-lg border border-border bg-background/25 text-center hover:bg-background/40 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/5 rounded-full blur-sm pointer-events-none" />
            <Trophy className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{vi.stats.score}</span>
            <span className="text-sm font-black text-amber-400 font-mono">
              <AnimatedNumber value={totalScore} formatter={formatScore} />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
