"use client";

import * as React from "react";
import { Play, Pause, SkipForward, StopCircle } from "lucide-react";
import { vi } from "@/i18n/vi";
import { cn } from "@/lib/utils";
import { t } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { GamePhase } from "@monopoly/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoundControllerProps {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  roundTimeLeft: number;
  isPaused: boolean;
  submittedCount: number;
  totalTeams: number;
  onPause: () => void;
  onResume: () => void;
  onForceNextPhase: () => void;
  onEndGame: () => void;
  disabled: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WARNING_THRESHOLD = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m > 0) return `${m}:${rem.toString().padStart(2, "0")}`;
  return `${s}s`;
}

// ---------------------------------------------------------------------------
// RoundController
// ---------------------------------------------------------------------------

/**
 * Host-side round controller.
 *
 * Shows:
 * - Current phase badge
 * - Round label + countdown timer
 * - Submission progress bar (decision phase only)
 *
 * Buttons: Pause / Resume, Force Next Phase, End Game.
 * Each destructive action shows a browser `confirm()` before firing.
 */
export function RoundController({
  phase,
  currentRound,
  totalRounds,
  roundTimeLeft,
  isPaused,
  submittedCount,
  totalTeams,
  onPause,
  onResume,
  onForceNextPhase,
  onEndGame,
  disabled,
}: RoundControllerProps): React.JSX.Element {
  const isDecision = phase === "decision";
  const isFinished = phase === "finished";
  const isUrgent = roundTimeLeft <= WARNING_THRESHOLD && roundTimeLeft > 0;

  const handleForceNext = (): void => {
    if (window.confirm(vi.pages.hostControl.confirmForcePhase)) {
      onForceNextPhase();
    }
  };

  const handleEndGame = (): void => {
    if (window.confirm(vi.pages.hostControl.confirmEndGame)) {
      onEndGame();
    }
  };

  const statusLabel = isFinished
    ? vi.pages.hostControl.statusFinished
    : isPaused
    ? vi.pages.hostControl.statusPaused
    : vi.pages.hostControl.statusRunning;

  const statusColor = isFinished
    ? "border-slate-600 bg-slate-700/30 text-slate-400"
    : isPaused
    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";

  return (
    <Card className="border-border bg-card/40 backdrop-blur shadow-xl">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">
            {vi.pages.hostControl.roundSectionTitle}
          </CardTitle>
          <span
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
              statusColor
            )}
          >
            {statusLabel}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* Phase + Round info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {vi.pages.hostControl.phaseLabel}
            </p>
            <p className="text-lg font-black text-foreground">
              {vi.game.phase[phase] ?? phase}
            </p>
          </div>

          {currentRound > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {vi.pages.hostControl.roundLabel}
              </p>
              <p className="text-lg font-black text-foreground">
                {t(vi.pages.hostControl.roundValue, {
                  round: currentRound,
                  total: totalRounds,
                })}
              </p>
            </div>
          )}
        </div>

        {/* Countdown timer */}
        {roundTimeLeft > 0 && isDecision && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {vi.pages.hostControl.countdownLabel}
              </p>
              <span
                className={cn(
                  "text-2xl font-black font-mono tabular-nums",
                  isUrgent ? "text-destructive animate-pulse" : "text-accent"
                )}
              >
                {formatSeconds(roundTimeLeft)}
              </span>
            </div>
            {/* Thin progress bar */}
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  isUrgent ? "bg-destructive" : "bg-accent"
                )}
                style={{
                  width: `${Math.max(0, Math.min(100, (roundTimeLeft / 60) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Submission progress (decision phase) */}
        {isDecision && totalTeams > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {vi.pages.hostControl.submissionLabel}
              </p>
              <span className="text-sm font-bold text-foreground">
                {t(vi.pages.hostControl.submissionValue, {
                  count: submittedCount,
                  total: totalTeams,
                })}
              </span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${(submittedCount / totalTeams) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Pause / Resume */}
          {!isFinished && (
            isPaused ? (
              <Button
                id="host-resume-btn"
                variant="outline"
                className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500 font-bold"
                onClick={onResume}
                disabled={disabled}
              >
                <Play className="w-4 h-4 mr-2" />
                {vi.pages.hostControl.resumeButton}
              </Button>
            ) : (
              <Button
                id="host-pause-btn"
                variant="outline"
                className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 font-bold"
                onClick={onPause}
                disabled={disabled}
              >
                <Pause className="w-4 h-4 mr-2" />
                {vi.pages.hostControl.pauseButton}
              </Button>
            )
          )}

          {/* Force Next Phase */}
          {!isFinished && (
            <Button
              id="host-force-phase-btn"
              variant="outline"
              className="w-full border-blue-500/40 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500 font-bold"
              onClick={handleForceNext}
              disabled={disabled}
            >
              <SkipForward className="w-4 h-4 mr-2" />
              {vi.pages.hostControl.forceNextPhaseButton}
            </Button>
          )}

          {/* End Game — full row */}
          {!isFinished && (
            <Button
              id="host-end-game-btn"
              variant="outline"
              className="col-span-2 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive font-bold"
              onClick={handleEndGame}
              disabled={disabled}
            >
              <StopCircle className="w-4 h-4 mr-2" />
              {vi.pages.hostControl.endGameButton}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
