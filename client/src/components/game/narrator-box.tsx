"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, Bot, AlertTriangle, BookOpen, X } from "lucide-react";
import { useGameStore } from "@/stores/game.store";
import { useUiStore } from "@/stores/ui.store";
import { vi } from "@/i18n/vi";

export function NarratorBox(): React.JSX.Element | null {
  const showNarrator = useUiStore((s) => s.showNarrator);
  const setShowNarrator = useUiStore((s) => s.setShowNarrator);
  const narration = useGameStore((s) => s.narration);

  // Typewriter effect state
  const [displayedText, setDisplayedText] = React.useState("");

  React.useEffect(() => {
    if (!showNarrator) {
      return () => {};
    }
    const timer = setTimeout(() => {
      setShowNarrator(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [showNarrator, setShowNarrator]);

  React.useEffect(() => {
    if (!narration.text) {
      setDisplayedText("");
      return () => {};
    }

    setDisplayedText("");
    let i = 0;
    const text = narration.text;
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, 15); // Fast typing speed (15ms per char)

    return () => clearInterval(interval);
  }, [narration.text]);

  if (!showNarrator || !narration.text) return null;

  const { type, relatedConcept } = narration;

  // Determine styles and icon based on narration type
  const getTypeStyles = () => {
    switch (type) {
      case "warning":
        return {
          border: "border-amber-500/80 shadow-[0_0_20px_rgba(245,166,35,0.15)]",
          glow: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          icon: AlertTriangle,
          themeClass: "from-amber-600 to-amber-500",
        };
      case "education":
        return {
          border: "border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
          glow: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          icon: BookOpen,
          themeClass: "from-emerald-600 to-emerald-500",
        };
      case "info":
      default:
        return {
          border: "border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
          glow: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          icon: Bot,
          themeClass: "from-blue-600 to-blue-500",
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  // Retrieve concept Vietnamese name from dictionary
  const getConceptName = (key: string): string => {
    // Check if it exists in the concepts dictionary of vi.ts
    const conceptObj = (vi as any).concepts;
    if (conceptObj && conceptObj[key]) {
      return conceptObj[key];
    }
    return key;
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 180 }}
      className={`fixed bottom-6 right-6 z-40 max-w-md w-full sm:w-[450px] rounded-xl border bg-slate-950/90 backdrop-blur-md p-5 shadow-2xl overflow-hidden ${styles.border}`}
    >
      {/* Auto Dismiss Progress Bar Indicator */}
      <motion.div
        key={narration.text} // Reset progress bar animation when message text changes
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 6, ease: "linear" }}
        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${styles.themeClass}`}
      />

      <div className="flex gap-4">
        {/* Narrator Avatar */}
        <div className="flex-shrink-0">
          <div className={`p-2.5 rounded-xl border ${styles.glow} flex items-center justify-center`}>
            <IconComponent className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Narrator Content */}
        <div className="flex-grow space-y-2.5 pr-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
              {vi.narratorBox.title}
            </span>
            <button
              onClick={() => setShowNarrator(false)}
              className="text-slate-400 hover:text-foreground p-0.5 rounded transition-all focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Narration text with Typewriter animation */}
          <p className="text-sm font-semibold text-slate-200 leading-relaxed min-h-[3rem]">
            {displayedText}
            {displayedText.length < (narration.text || "").length && (
              <span className="inline-block w-1.5 h-3.5 bg-accent ml-0.5 animate-pulse align-middle" />
            )}
          </p>

          {/* Related Concept Badge */}
          {relatedConcept && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                {vi.narratorBox.badgeLabel}:
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-3 h-3" />
                {getConceptName(relatedConcept)}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
