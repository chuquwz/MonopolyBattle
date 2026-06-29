"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertCircle, TrendingUp, TrendingDown, Zap, ShieldAlert, Award, Landmark } from "lucide-react";
import { useGameStore } from "@/stores/game.store";
import { useUiStore } from "@/stores/ui.store";
import { vi } from "@/i18n/vi";
import { formatMoney, formatPercent } from "@/lib/format";

export function EventOverlay(): React.JSX.Element | null {
  const showEventOverlay = useUiStore((s) => s.showEventOverlay);
  const setShowEventOverlay = useUiStore((s) => s.setShowEventOverlay);
  const currentEvent = useGameStore((s) => s.currentEvent);

  React.useEffect(() => {
    if (!showEventOverlay) {
      return () => {};
    }
    const timer = setTimeout(() => {
      setShowEventOverlay(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [showEventOverlay, setShowEventOverlay]);

  if (!showEventOverlay || !currentEvent) return null;

  const effects = currentEvent.effects;
  const hasEffects = effects && Object.values(effects).some((val) => val !== 0);

  // Helper to format deltas
  const formatDelta = (key: keyof typeof effects, val: number): string => {
    const prefix = val > 0 ? "+" : "";
    if (key === "money") {
      return `${prefix}${formatMoney(val)}`;
    }
    if (key === "marketShare") {
      return `${prefix}${formatPercent(val)}`;
    }
    if (key === "monopolyRisk") {
      return `${prefix}${val}%`;
    }
    return `${prefix}${val}`;
  };

  // Maps metric key to Vietnamese name and colors
  const getMetricDetails = (key: string, val: number) => {
    switch (key) {
      case "money":
        return {
          label: vi.stats.money,
          color: val > 0 ? "text-emerald-400" : "text-rose-400",
          icon: Landmark,
        };
      case "marketShare":
        return {
          label: vi.stats.marketShare,
          color: val > 0 ? "text-emerald-400" : "text-rose-400",
          icon: TrendingUp,
        };
      case "technology":
        return {
          label: vi.stats.technology,
          color: val > 0 ? "text-emerald-400" : "text-rose-400",
          icon: Zap,
        };
      case "reputation":
        return {
          label: vi.stats.reputation,
          color: val > 0 ? "text-emerald-400" : "text-rose-400",
          icon: Award,
        };
      case "monopolyRisk":
        return {
          label: vi.stats.monopolyRisk,
          // For monopoly risk, negative is green (risk decreased), positive is orange/red (risk increased)
          color: val > 0 ? "text-amber-500" : "text-emerald-400",
          icon: ShieldAlert,
        };
      default:
        return {
          label: key,
          color: "text-slate-400",
          icon: AlertCircle,
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative max-w-lg w-full rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl"
      >
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]" />

        {/* Closing x button */}
        <button
          onClick={() => setShowEventOverlay(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-foreground hover:bg-slate-800/80 transition-all font-sans text-xs focus:outline-none"
        >
          ✕
        </button>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Badge & Icon Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-rose-500 uppercase">
                {vi.eventOverlay.title}
              </span>
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                {currentEvent.titleVi}
              </h2>
            </div>
          </div>

          {/* Description Text */}
          <div className="p-4 rounded-xl border border-slate-800/50 bg-slate-950/40">
            <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium text-center">
              {currentEvent.descriptionVi}
            </p>
          </div>

          {/* Effects summary */}
          {hasEffects && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                {vi.eventOverlay.effectsTitle}
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(effects).map(([key, val]) => {
                  if (val === 0) return null;
                  const details = getMetricDetails(key, val);
                  const Icon = details.icon;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-800/40 bg-slate-950/20"
                    >
                      <div className={`p-1.5 rounded bg-slate-900 ${details.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-1">
                          {details.label}
                        </span>
                        <span className={`text-sm font-extrabold font-mono ${details.color}`}>
                          {formatDelta(key as keyof typeof effects, val)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Action CTA */}
          <div className="pt-2">
            <button
              onClick={() => setShowEventOverlay(false)}
              className="w-full py-3 px-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-850/80 text-sm font-bold text-foreground transition-all focus:outline-none"
            >
              {vi.eventOverlay.dismissCta}
            </button>
          </div>
        </div>

        {/* Auto Dismiss Progress Bar Indicator */}
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 5, ease: "linear" }}
          className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500/80"
        />
      </motion.div>
    </motion.div>
  );
}
