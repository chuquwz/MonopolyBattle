"use client";

import * as React from "react";
import { vi } from "@/i18n/vi";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NarrationDisplayProps {
  /** The narration text to display. */
  text: string;
  /** Visual style variant. */
  type: "info" | "warning" | "education";
  /** Whether the narration panel is visible. */
  isVisible: boolean;
  /** Optional economic concept tag. */
  relatedConcept?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<
  NarrationDisplayProps["type"],
  { border: string; accent: string; icon: string; glow: string }
> = {
  info: {
    border: "border-blue-500/30",
    accent: "text-blue-300",
    icon: "💬",
    glow: "shadow-blue-900/30",
  },
  warning: {
    border: "border-orange-500/40",
    accent: "text-orange-300",
    icon: "⚠️",
    glow: "shadow-orange-900/30",
  },
  education: {
    border: "border-amber-400/40",
    accent: "text-amber-300",
    icon: "🎓",
    glow: "shadow-amber-900/30",
  },
};

// ---------------------------------------------------------------------------
// NarrationDisplay
// ---------------------------------------------------------------------------

/**
 * Large-format narration panel designed for classroom projector display.
 * Renders AI narrator messages at high contrast with large typography.
 */
export function NarrationDisplay({
  text,
  type,
  isVisible,
  relatedConcept,
}: NarrationDisplayProps): React.JSX.Element | null {
  const styles = TYPE_STYLES[type];

  if (!isVisible || !text) {
    return null;
  }

  return (
    <div
      className={cn(
        "w-full rounded-2xl border-2 p-8 md:p-12 backdrop-blur-sm shadow-2xl",
        "bg-slate-900/80",
        styles.border,
        styles.glow
      )}
      role="status"
      aria-live="polite"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl" aria-hidden="true">
          {styles.icon}
        </span>
        <span
          className={cn(
            "text-sm font-black uppercase tracking-[0.3em]",
            styles.accent
          )}
        >
          {vi.pages.projector.narrationTitle}
        </span>
      </div>

      {/* Main narration text */}
      <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-100 leading-snug">
        {text}
      </p>

      {/* Concept badge */}
      {relatedConcept && (
        <div className="mt-8 flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border",
              "border-amber-400/40 bg-amber-400/10 text-amber-300"
            )}
          >
            {vi.concepts[relatedConcept] ?? relatedConcept}
          </span>
        </div>
      )}
    </div>
  );
}
