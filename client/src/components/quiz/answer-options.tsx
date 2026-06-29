"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AnswerOptionsProps {
  options: string[];
  selectedOption: number | null;
  onSelectOption: (idx: number) => void;
  disabled: boolean;
}

export function AnswerOptions({
  options,
  selectedOption,
  onSelectOption,
  disabled,
}: AnswerOptionsProps): React.JSX.Element {
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (disabled) return () => {};

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      
      // Grid movement for 2x2 grid
      if (key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev === null ? 0 : prev < 2 ? prev + 2 : prev - 2));
      } else if (key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev === null ? 0 : prev >= 2 ? prev - 2 : prev + 2));
      } else if (key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev === null ? 0 : prev % 2 === 0 ? prev + 1 : prev - 1));
      } else if (key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev === null ? 0 : prev % 2 === 1 ? prev - 1 : prev + 1));
      } 
      // Alphabet keys A, B, C, D
      else if (key.toLowerCase() === "a") {
        onSelectOption(0);
        setFocusedIndex(0);
      } else if (key.toLowerCase() === "b") {
        onSelectOption(1);
        setFocusedIndex(1);
      } else if (key.toLowerCase() === "c") {
        onSelectOption(2);
        setFocusedIndex(2);
      } else if (key.toLowerCase() === "d") {
        onSelectOption(3);
        setFocusedIndex(3);
      } 
      // Enter to select focused
      else if (key === "Enter") {
        if (focusedIndex !== null) {
          e.preventDefault();
          onSelectOption(focusedIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, focusedIndex, onSelectOption]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 select-none">
      {options.map((option, idx) => {
        const isSelected = selectedOption === idx;
        const isFocused = focusedIndex === idx;
        const letter = String.fromCharCode(65 + idx); // A, B, C, D

        return (
          <button
            key={idx}
            onClick={() => {
              if (!disabled) {
                onSelectOption(idx);
                setFocusedIndex(idx);
              }
            }}
            disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onFocus={() => !disabled && setFocusedIndex(idx)}
            onBlur={() => setFocusedIndex(null)}
            className={cn(
              "p-4 rounded-xl border text-left transition-all duration-200 flex items-start gap-3 relative overflow-hidden group focus:outline-none",
              disabled
                ? isSelected
                  ? "bg-primary/25 border-primary/50 text-slate-300 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                  : "bg-background/20 border-border/40 text-muted-foreground opacity-60"
                : isSelected
                ? "bg-primary/10 border-accent/80 text-foreground shadow-[0_0_15px_rgba(245,166,35,0.08)] ring-1 ring-accent/30"
                : isFocused
                ? "bg-slate-900/60 border-slate-700 text-slate-200 ring-1 ring-slate-800"
                : "bg-background/40 border-border hover:border-slate-800 hover:bg-slate-900/20 text-slate-300"
            )}
          >
            {/* Visual glow on selection */}
            {isSelected && !disabled && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 rounded-full blur-md pointer-events-none" />
            )}

            {/* Prefix Letter Container */}
            <span
              className={cn(
                "w-6 h-6 rounded flex items-center justify-center font-bold font-mono text-xs border flex-shrink-0 transition-colors duration-200",
                disabled
                  ? isSelected
                    ? "bg-primary border-primary-foreground text-foreground"
                    : "bg-slate-900 border-border/40 text-muted-foreground"
                  : isSelected
                  ? "bg-accent border-accent-foreground text-slate-950 shadow-md"
                  : isFocused
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-slate-900 border-border group-hover:border-slate-800 text-muted-foreground"
              )}
            >
              {letter}
            </span>

            {/* Option text */}
            <span className="text-sm font-bold leading-relaxed">{option}</span>
          </button>
        );
      })}
    </div>
  );
}
