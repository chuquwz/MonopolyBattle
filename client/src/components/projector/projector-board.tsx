"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { vi } from "@/i18n/vi";
import { cn } from "@/lib/utils";
import { formatPercent, formatScore } from "@/lib/format";
import { NarrationDisplay } from "./narration-display";
import { MarketOverview } from "./market-overview";
import { t } from "@/lib/utils";
import type { GamePhase, PublicTeamInfo, LeaderboardEntry, GameEvent } from "@monopoly/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectorBoardState {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  roundTimeLeft: number;
  roomCode: string;
  allTeams: PublicTeamInfo[];
  leaderboard: LeaderboardEntry[];
  narration: {
    text: string;
    isVisible: boolean;
    type: "info" | "warning" | "education";
    relatedConcept?: string;
  };
  currentEvent: GameEvent | null;
  activeQuiz: {
    question: string;
    options: string[];
    timeLimit: number;
    answered: boolean;
    timeLeft?: number;
  } | null;
  submittedTeamsCount: number;
}

export interface ProjectorBoardProps {
  state: ProjectorBoardState;
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

const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

// ---------------------------------------------------------------------------
// Shared layout elements
// ---------------------------------------------------------------------------

function ProjectorHeader({
  roomCode,
  phase,
  currentRound,
  totalRounds,
}: {
  roomCode: string;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
}): React.JSX.Element {
  return (
    <header className="flex items-center justify-between px-10 py-5 border-b border-slate-800 bg-slate-950/80 backdrop-blur select-none">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-black bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent tracking-tight">
          MonopolyBattle
        </span>
        {roomCode && (
          <span className="text-xl font-mono font-bold text-slate-400">
            #{roomCode}
          </span>
        )}
      </div>

      <div className="flex items-center gap-6">
        {currentRound > 0 && (
          <span className="text-xl font-bold text-slate-300">
            {t(vi.pages.projector.roundLabel, {
              round: currentRound,
              total: totalRounds,
            })}
          </span>
        )}
        <span className="px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-base font-black text-amber-400 uppercase tracking-widest">
          {vi.game.phase[phase] ?? phase}
        </span>
      </div>
    </header>
  );
}

function CountdownTimer({
  seconds,
}: {
  seconds: number;
}): React.JSX.Element {
  const isUrgent = seconds <= 10;
  return (
    <div
      className={cn(
        "text-[9rem] font-black font-mono leading-none tabular-nums select-none",
        isUrgent ? "text-rose-400 animate-pulse" : "text-amber-400"
      )}
    >
      {seconds}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase layouts
// ---------------------------------------------------------------------------

/**
 * Lobby phase — shows QR code, join URL, and list of registered teams.
 */
function LobbyLayout({
  roomCode,
  teams,
}: {
  roomCode: string;
  teams: PublicTeamInfo[];
}): React.JSX.Element {
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/join?code=${roomCode}`
      : `/play/join?code=${roomCode}`;

  const readyCount = teams.filter((t) => t.status === "ready").length;

  return (
    <div className="flex flex-col lg:flex-row gap-12 items-start justify-center flex-1 p-10">
      {/* QR Code */}
      <div className="flex flex-col items-center gap-6 shrink-0">
        <h2 className="text-3xl font-black text-slate-200">
          {vi.pages.projector.qrScanLabel}
        </h2>
        <div className="p-6 bg-white rounded-3xl shadow-2xl">
          <QRCodeSVG
            value={joinUrl}
            size={280}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="M"
          />
        </div>
        <div className="text-center space-y-1">
          <p className="text-slate-400 text-xl font-semibold">
            {vi.pages.projector.lobbyTitle}
          </p>
          <p className="text-4xl font-black font-mono tracking-widest text-amber-400">
            {roomCode}
          </p>
        </div>
      </div>

      {/* Team list */}
      <div className="flex-1 space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-3xl font-black text-slate-200">
            {vi.pages.projector.teamsJoinedLabel} ({teams.length})
          </h2>
          <span className="text-2xl font-bold text-emerald-400">
            {vi.pages.projector.teamsReadyLabel}: {readyCount}/{teams.length}
          </span>
        </div>

        {teams.length === 0 ? (
          <p className="text-2xl text-slate-500 animate-pulse">
            {vi.pages.projector.waitingTeams}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {teams.map((team) => {
              const color = TEAM_COLORS[team.teamNumber] ?? DEFAULT_COLOR;
              return (
                <div
                  key={team.id}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border-2 px-6 py-4 transition-all duration-300",
                    team.status === "ready"
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-900/60"
                  )}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-2xl font-black text-slate-100 truncate flex-1">
                    {team.name}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-black uppercase tracking-widest px-3 py-1 rounded-full",
                      team.status === "ready"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-800 text-slate-500"
                    )}
                  >
                    {team.status === "ready" ? "✓ Sẵn sàng" : "Chờ..."}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Decision phase — shows countdown, round info, and submission status.
 */
function DecisionLayout({
  currentRound,
  totalRounds,
  roundTimeLeft,
  teams,
  submittedCount,
}: {
  currentRound: number;
  totalRounds: number;
  roundTimeLeft: number;
  teams: PublicTeamInfo[];
  submittedCount: number;
}): React.JSX.Element {
  const remaining = teams.length - submittedCount;

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-10 gap-12">
      {/* Round label */}
      <h2 className="text-4xl font-black text-slate-300 uppercase tracking-widest">
        {t(vi.pages.projector.roundLabel, {
          round: currentRound,
          total: totalRounds,
        })}
      </h2>

      {/* Countdown */}
      <CountdownTimer seconds={roundTimeLeft} />

      {/* Submission status */}
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between text-2xl font-bold text-slate-300">
          <span>
            {t(vi.pages.projector.submittedLabel, {
              count: submittedCount,
              total: teams.length,
            })}
          </span>
          {remaining > 0 && (
            <span className="text-rose-400">
              {t(vi.pages.projector.remainingLabel, { count: remaining })}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
            style={{
              width: teams.length > 0 ? `${(submittedCount / teams.length) * 100}%` : "0%",
            }}
          />
        </div>

        {/* Team submission dots */}
        <div className="flex flex-wrap gap-3 justify-center">
          {teams.map((team) => {
            const color = TEAM_COLORS[team.teamNumber] ?? DEFAULT_COLOR;
            return (
              <div key={team.id} className="flex flex-col items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full border-2 border-slate-700"
                  style={{ backgroundColor: color, opacity: 1 }}
                />
                <span className="text-xs text-slate-500 font-bold truncate max-w-[60px] text-center">
                  {team.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Event phase — full-screen event card.
 */
function EventLayout({ event }: { event: GameEvent }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-12 gap-10">
      {/* Flashing label */}
      <div className="px-8 py-3 rounded-full bg-rose-500/20 border-2 border-rose-500/50">
        <span className="text-2xl font-black uppercase tracking-[0.3em] text-rose-400 animate-pulse">
          {vi.pages.projector.eventTitle}
        </span>
      </div>

      <div className="max-w-4xl w-full rounded-3xl border-2 border-rose-500/30 bg-slate-900/80 p-12 shadow-[0_0_80px_rgba(239,68,68,0.15)] text-center space-y-8">
        <h2 className="text-5xl md:text-6xl font-black text-white leading-tight">
          {event.titleVi}
        </h2>
        <p className="text-2xl md:text-3xl text-slate-300 leading-relaxed">
          {event.descriptionVi}
        </p>

        {/* Effect pills */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          {Object.entries(event.effects).map(([key, value]) => {
            if (value === 0) return null;
            const isPositive = value > 0;
            return (
              <span
                key={key}
                className={cn(
                  "px-5 py-2.5 rounded-full border text-xl font-black font-mono",
                  isPositive
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                )}
              >
                {isPositive ? "+" : ""}
                {value} {key}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Quiz phase — shows question + options (read-only) and a timer.
 */
function QuizLayout({
  quiz,
}: {
  quiz: NonNullable<ProjectorBoardState["activeQuiz"]>;
}): React.JSX.Element {
  const OPTION_LABELS = ["A", "B", "C", "D"] as const;

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-10 gap-10">
      {/* Title bar */}
      <div className="flex items-center gap-6">
        <span className="px-6 py-2 rounded-full bg-amber-500/20 border-2 border-amber-400/50">
          <span className="text-2xl font-black uppercase tracking-[0.3em] text-amber-400">
            {vi.pages.projector.quizTitle}
          </span>
        </span>
        {quiz.timeLeft !== undefined && (
          <div
            className={cn(
              "text-5xl font-black font-mono tabular-nums",
              quiz.timeLeft <= 10 ? "text-rose-400 animate-pulse" : "text-emerald-400"
            )}
          >
            {quiz.timeLeft}s
          </div>
        )}
      </div>

      {/* Question */}
      <div className="max-w-5xl w-full rounded-2xl border-2 border-amber-400/30 bg-slate-900/80 p-10 shadow-2xl">
        <p className="text-4xl md:text-5xl font-bold text-slate-100 leading-snug">
          {quiz.question}
        </p>
      </div>

      {/* Options grid */}
      <div className="max-w-5xl w-full grid grid-cols-2 gap-5">
        {quiz.options.map((option, idx) => (
          <div
            key={idx}
            className="flex items-start gap-5 rounded-xl border-2 border-slate-700 bg-slate-900/60 px-7 py-5"
          >
            <span className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xl font-black text-amber-400 shrink-0">
              {OPTION_LABELS[idx]}
            </span>
            <span className="text-2xl font-semibold text-slate-200 leading-snug">{option}</span>
          </div>
        ))}
      </div>

      <p className="text-xl text-slate-500 font-semibold italic">
        {vi.pages.projector.quizNoInteraction}
      </p>
    </div>
  );
}

/**
 * Results phase — team ranking with market share and scores.
 */
function ResultsLayout({
  leaderboard,
  teams,
  currentRound,
}: {
  leaderboard: LeaderboardEntry[];
  teams: PublicTeamInfo[];
  currentRound: number;
}): React.JSX.Element {
  return (
    <div className="flex flex-col flex-1 p-10 gap-8">
      <h2 className="text-4xl font-black text-slate-200 text-center uppercase tracking-widest">
        {t(vi.pages.projector.resultsTitle, { round: currentRound })}
      </h2>

      <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full">
        {leaderboard.map((entry) => {
          const teamInfo = teams.find((t) => t.id === entry.teamId);
          const color = TEAM_COLORS[entry.teamNumber] ?? DEFAULT_COLOR;
          const medal = RANK_MEDAL[entry.rank];

          return (
            <div
              key={entry.teamId}
              className={cn(
                "flex items-center gap-6 rounded-2xl border-2 px-8 py-5 transition-all",
                entry.rank === 1
                  ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_40px_rgba(245,166,35,0.12)]"
                  : entry.rank === 2
                  ? "border-slate-400/30 bg-slate-500/10"
                  : entry.rank === 3
                  ? "border-amber-700/30 bg-amber-900/10"
                  : "border-slate-800 bg-slate-900/40"
              )}
            >
              {/* Rank */}
              <div className="w-16 text-center">
                {medal ? (
                  <span className="text-4xl">{medal}</span>
                ) : (
                  <span className="text-3xl font-black text-slate-500">
                    {entry.rank}
                  </span>
                )}
              </div>

              {/* Team colour + name */}
              <span
                className="w-5 h-5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-2xl font-black text-slate-100 flex-1 truncate">
                {entry.teamName}
              </span>

              {/* Market share */}
              <div className="text-right min-w-[120px]">
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  {vi.pages.projector.marketShareLabel}
                </div>
                <div className="text-2xl font-black font-mono text-slate-200">
                  {formatPercent(teamInfo?.marketShare ?? entry.marketShare)}
                </div>
              </div>

              {/* Score */}
              <div className="text-right min-w-[140px]">
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  {vi.pages.projector.totalScoreLabel}
                </div>
                <div
                  className={cn(
                    "text-3xl font-black font-mono",
                    entry.rank === 1 ? "text-amber-400" : "text-slate-200"
                  )}
                >
                  {formatScore(entry.totalScore)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Game-over phase — animated top-3 podium with celebratory display.
 */
function GameOverLayout({
  leaderboard,
}: {
  leaderboard: LeaderboardEntry[];
}): React.JSX.Element {
  const top3 = leaderboard.slice(0, 3);
  // Display order: 2nd, 1st, 3rd (classic podium shape)
  const podiumOrder = [
    top3[1] ?? null,
    top3[0] ?? null,
    top3[2] ?? null,
  ] as const;

  const PODIUM_HEIGHTS = ["h-40", "h-52", "h-32"] as const;
  const PODIUM_RANK_LABELS = [2, 1, 3] as const;

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-10 gap-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
          {vi.pages.projector.gameOverTitle}
        </h2>
        <p className="text-3xl font-bold text-slate-400">
          {vi.pages.projector.gameOverSubtitle}
        </p>
      </div>

      {/* Podium */}
      <div className="flex items-end gap-6 justify-center">
        {podiumOrder.map((entry, position) => {
          if (!entry) return <div key={position} className="w-48" />;
          const rank = PODIUM_RANK_LABELS[position];
          const color = TEAM_COLORS[entry.teamNumber] ?? DEFAULT_COLOR;
          const heightClass = PODIUM_HEIGHTS[position];
          const medal = RANK_MEDAL[rank ?? 0];

          return (
            <div
              key={entry.teamId}
              className="flex flex-col items-center gap-4"
            >
              {/* Team info above podium */}
              <div className="text-center space-y-2">
                <span className="text-5xl">{medal}</span>
                <p
                  className="text-2xl font-black text-slate-100 max-w-[160px] truncate"
                  style={{ textShadow: `0 0 20px ${color}55` }}
                >
                  {entry.teamName}
                </p>
                <p className="text-xl font-mono font-black text-amber-400">
                  {formatScore(entry.totalScore)}
                </p>
              </div>

              {/* Podium block */}
              <div
                className={cn(
                  "w-48 rounded-t-2xl flex items-start justify-center pt-4",
                  heightClass
                )}
                style={{
                  backgroundColor: `${color}22`,
                  borderTop: `4px solid ${color}`,
                  borderLeft: `2px solid ${color}44`,
                  borderRight: `2px solid ${color}44`,
                }}
              >
                <span
                  className="text-5xl font-black"
                  style={{ color }}
                >
                  {rank}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Remaining teams */}
      {leaderboard.length > 3 && (
        <div className="w-full max-w-3xl space-y-3">
          {leaderboard.slice(3).map((entry) => {
            const color = TEAM_COLORS[entry.teamNumber] ?? DEFAULT_COLOR;
            return (
              <div
                key={entry.teamId}
                className="flex items-center gap-4 px-6 py-3 rounded-xl border border-slate-800 bg-slate-900/40"
              >
                <span className="text-2xl font-black text-slate-500 w-8">
                  {entry.rank}
                </span>
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xl font-bold text-slate-300 flex-1 truncate">
                  {entry.teamName}
                </span>
                <span className="text-xl font-mono font-black text-slate-300">
                  {formatScore(entry.totalScore)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectorBoard — main orchestrator
// ---------------------------------------------------------------------------

/**
 * Orchestrates which phase-specific layout to render based on the current
 * game phase. Accepts the full board state as a single prop so it can be
 * controlled by any parent (page or Storybook).
 */
export function ProjectorBoard({ state }: ProjectorBoardProps): React.JSX.Element {
  const {
    phase,
    currentRound,
    totalRounds,
    roundTimeLeft,
    roomCode,
    allTeams,
    leaderboard,
    narration,
    currentEvent,
    activeQuiz,
    submittedTeamsCount,
  } = state;

  const renderPhaseContent = (): React.JSX.Element => {
    switch (phase) {
      case "lobby":
      case "countdown":
        return <LobbyLayout roomCode={roomCode} teams={allTeams} />;

      case "decision":
        return (
          <DecisionLayout
            currentRound={currentRound}
            totalRounds={totalRounds}
            roundTimeLeft={roundTimeLeft}
            teams={allTeams}
            submittedCount={submittedTeamsCount}
          />
        );

      case "event":
        if (currentEvent) {
          return <EventLayout event={currentEvent} />;
        }
        return (
          <div className="flex items-center justify-center flex-1 text-3xl text-slate-500 animate-pulse">
            {vi.ui.loading.loading}
          </div>
        );

      case "narration":
        return (
          <div className="flex flex-col flex-1 p-10 items-center justify-center">
            <NarrationDisplay
              text={narration.text}
              type={narration.type}
              isVisible={narration.isVisible}
              {...(narration.relatedConcept !== undefined
                ? { relatedConcept: narration.relatedConcept }
                : {})}
            />
          </div>
        );

      case "quiz":
        if (activeQuiz) {
          return <QuizLayout quiz={activeQuiz} />;
        }
        return (
          <div className="flex items-center justify-center flex-1 text-3xl text-slate-500 animate-pulse">
            {vi.ui.loading.loading}
          </div>
        );

      case "results":
        return (
          <ResultsLayout
            leaderboard={leaderboard}
            teams={allTeams}
            currentRound={currentRound}
          />
        );

      case "finished":
        return <GameOverLayout leaderboard={leaderboard} />;

      default:
        return (
          <div className="flex items-center justify-center flex-1 text-3xl text-slate-500 animate-pulse">
            {vi.ui.loading.loading}
          </div>
        );
    }
  };

  const showMarketOverview =
    phase === "decision" || phase === "results";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-600 blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-700 blur-[150px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <ProjectorHeader
          roomCode={roomCode}
          phase={phase}
          currentRound={currentRound}
          totalRounds={totalRounds}
        />

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Phase content */}
          <div
            className={cn(
              "flex flex-col min-h-0 overflow-y-auto",
              showMarketOverview ? "flex-1" : "w-full"
            )}
          >
            {renderPhaseContent()}
          </div>

          {/* Market sidebar (decision + results phases only) */}
          {showMarketOverview && allTeams.length > 0 && (
            <aside className="w-96 xl:w-[28rem] shrink-0 border-l border-slate-800 p-8 overflow-y-auto">
              <MarketOverview teams={allTeams} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
