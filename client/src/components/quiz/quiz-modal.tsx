"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Send, ShieldAlert, Sparkles } from "lucide-react";
import { useGameStore } from "@/stores/game.store";
import { useUiStore } from "@/stores/ui.store";
import { useSocketStore } from "@/stores/socket.store";
import { SOCKET_EVENTS } from "@monopoly/shared";
import { vi } from "@/i18n/vi";
import { QuestionCard } from "./question-card";
import { AnswerOptions } from "./answer-options";
import { QuizResult } from "./quiz-result";

export function QuizModal(): React.JSX.Element | null {
  const showQuizModal = useUiStore((s) => s.showQuizModal);
  const setShowQuizModal = useUiStore((s) => s.setShowQuizModal);
  
  // Zustand store state
  const activeQuiz = useGameStore((s) => s.activeQuiz);
  const selectedAnswer = useGameStore((s) => s.selectedAnswer);
  const hasAnswered = useGameStore((s) => s.hasAnswered);
  const quizResult = useGameStore((s) => s.quizResult);
  const myTeam = useGameStore((s) => s.myTeam);
  
  const setSelectedAnswer = useGameStore((s) => s.setSelectedAnswer);
  const setHasAnswered = useGameStore((s) => s.setHasAnswered);
  const socket = useSocketStore((s) => s.socket);

  // Time taken reference
  const startTimeRef = React.useRef<number>(Date.now());
  const [secondsLeft, setSecondsLeft] = React.useState(30);

  // Sync internal state when activeQuiz payload loads
  React.useEffect(() => {
    if (activeQuiz) {
      startTimeRef.current = Date.now();
      setSecondsLeft(activeQuiz.timeLimit || 30);
    }
  }, [activeQuiz]);

  // Local timer ticks down
  React.useEffect(() => {
    if (!activeQuiz || quizResult !== null) return () => {};

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeQuiz, quizResult]);

  // Auto-advance results after 8 seconds
  React.useEffect(() => {
    if (quizResult === null) {
      return () => {};
    }
    const timer = setTimeout(() => {
      setShowQuizModal(false);
      // Clear active quiz to return gameplay layout back to normal
      useGameStore.setState({
        activeQuiz: null,
        selectedAnswer: null,
        hasAnswered: false,
        quizResult: null,
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, [quizResult, setShowQuizModal]);

  // Enter key press triggers submit if choice is highlighted
  React.useEffect(() => {
    if (hasAnswered || selectedAnswer === null || quizResult !== null) return () => {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasAnswered, selectedAnswer, quizResult]);

  if (!showQuizModal || !activeQuiz) return null;

  // Handles client-side answer emission to server
  const handleSubmit = () => {
    if (hasAnswered || selectedAnswer === null || !socket || !myTeam) return;

    const timeTakenMs = Date.now() - startTimeRef.current;

    // Emit player:quiz-answer socket event
    socket.emit(SOCKET_EVENTS.PLAYER_QUIZ_ANSWER, {
      roundId: "current",
      teamId: myTeam.id,
      questionId: "current",
      selectedOption: selectedAnswer,
      timeTakenMs,
    });

    setHasAnswered(true);

    useUiStore.getState().addToast({
      title: vi.quiz.lockedAnswer,
      description: "Câu trả lời đã được ghi nhận trên máy chủ.",
      variant: "success",
    });
  };

  const isWarning = secondsLeft <= 10 && secondsLeft > 0;
  const progressPercent = (secondsLeft / (activeQuiz.timeLimit || 30)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.92, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 15, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative max-w-2xl w-full rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col"
      >
        {/* Glow Accent Border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-accent" />

        {/* Modal Top Bar */}
        <div className="p-5 border-b border-border/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <h3 className="text-sm font-black tracking-tight uppercase">
              {vi.quiz.modalTitle}
            </h3>
          </div>
          
          {/* Timer Display */}
          {quizResult === null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/40 border border-slate-800">
              <Clock className={`w-3.5 h-3.5 ${isWarning ? "text-rose-500 animate-pulse" : "text-muted-foreground"}`} />
              <span className={`text-xs font-mono font-bold tabular-nums ${isWarning ? "text-rose-400" : "text-slate-300"}`}>
                {secondsLeft}s
              </span>
            </div>
          )}
        </div>

        {/* Timer Progress Indicator */}
        {quizResult === null && (
          <div className="w-full h-1 bg-slate-950/60 relative">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className={`absolute top-0 bottom-0 left-0 ${isWarning ? "bg-rose-500" : "bg-blue-500"}`}
            />
          </div>
        )}

        {/* Modal Main Body */}
        <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {quizResult === null ? (
            <>
              {/* Question card */}
              <QuestionCard
                question={activeQuiz.question}
                category="Lý thuyết kinh tế"
              />

              {/* Answers grid */}
              <AnswerOptions
                options={activeQuiz.options}
                selectedOption={selectedAnswer}
                onSelectOption={setSelectedAnswer}
                disabled={hasAnswered}
              />
            </>
          ) : (
            /* Results Panel */
            <QuizResult
              options={activeQuiz.options}
              selectedOption={selectedAnswer}
              correctAnswer={quizResult.correctAnswer}
              explanation={quizResult.explanation}
              scoreEarned={quizResult.scoreEarned}
              isCorrect={quizResult.isCorrect}
            />
          )}
        </div>

        {/* Modal Footer Controls */}
        {quizResult === null && (
          <div className="p-5 border-t border-border/40 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
            <span className="text-slate-400 font-semibold italic text-center sm:text-left">
              {vi.quiz.keyboardHint}
            </span>
            
            <button
              onClick={handleSubmit}
              disabled={hasAnswered || selectedAnswer === null}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all focus:outline-none ${
                hasAnswered
                  ? "bg-slate-900 border-border text-slate-500 cursor-not-allowed"
                  : selectedAnswer === null
                  ? "bg-slate-900 border-border text-slate-500 cursor-not-allowed"
                  : "bg-accent border-accent-foreground text-slate-950 hover:bg-accent/95 hover:shadow-lg"
              }`}
            >
              {hasAnswered ? (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>{vi.quiz.lockedAnswer}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{vi.quiz.submitButton}</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
