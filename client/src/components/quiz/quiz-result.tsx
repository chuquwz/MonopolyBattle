"use client";

import * as React from "react";
import { CheckCircle2, XCircle, BookOpen, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { vi } from "@/i18n/vi";
import { cn } from "@/lib/utils";

interface QuizResultProps {
  options: string[];
  selectedOption: number | null;
  correctAnswer: number;
  explanation: string;
  scoreEarned: number;
  isCorrect: boolean;
}

export function QuizResult({
  options,
  selectedOption,
  correctAnswer,
  explanation,
  scoreEarned,
  isCorrect,
}: QuizResultProps): React.JSX.Element {
  const letters = ["A", "B", "C", "D"];

  return (
    <div className="space-y-5 select-none text-left">
      {/* Banner / Header Result */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className={cn(
          "p-4 rounded-xl border flex items-center justify-between shadow-lg relative overflow-hidden",
          isCorrect
            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
            : "bg-rose-950/20 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.06)]"
        )}
      >
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <CheckCircle2 className="w-6 h-6 flex-shrink-0 animate-bounce" />
          ) : (
            <XCircle className="w-6 h-6 flex-shrink-0 animate-shake" />
          )}
          <span className="text-sm font-black tracking-wider">
            {isCorrect ? vi.quiz.resultCorrect : vi.quiz.resultIncorrect}
          </span>
        </div>
        
        {/* Score Earned Banner */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-extrabold uppercase",
            scoreEarned > 0
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-slate-900 border-border text-slate-400"
          )}
        >
          <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>
            {vi.quiz.earnedScoreLabel}: +{scoreEarned.toLocaleString()} {vi.quiz.scoreUnit}
          </span>
        </motion.div>
      </motion.div>

      {/* Answer list review */}
      <div className="space-y-2">
        <h4 className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
          {vi.quiz.quizResultTitle}
        </h4>
        
        <div className="grid grid-cols-1 gap-2.5">
          {options.map((option, idx) => {
            const isCorrectAnswer = idx === correctAnswer;
            const isSelectedAnswer = idx === selectedOption;

            return (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-xl border text-xs flex items-center justify-between gap-3",
                  isCorrectAnswer
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : isSelectedAnswer
                    ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                    : "bg-slate-950/20 border-border/40 text-slate-400 opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center font-black font-mono text-[10px] border flex-shrink-0",
                      isCorrectAnswer
                        ? "bg-emerald-500 border-emerald-400 text-slate-950"
                        : isSelectedAnswer
                        ? "bg-rose-500 border-rose-400 text-slate-950"
                        : "bg-slate-900 border-border/40 text-slate-400"
                    )}
                  >
                    {letters[idx]}
                  </span>
                  <span className="font-bold leading-normal">{option}</span>
                </div>
                
                {/* Result check/cross icon inside options */}
                <div className="flex-shrink-0">
                  {isCorrectAnswer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {isSelectedAnswer && !isCorrectAnswer && (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanation Block */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2 shadow-inner"
      >
        <div className="flex items-center gap-2 text-slate-300">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {vi.quiz.explanationLabel}
          </span>
        </div>
        <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
          {explanation}
        </p>
      </motion.div>
    </div>
  );
}
