"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "./game-header";
import { useGameState } from "@/hooks/use-game-state";
import { Card, CardContent } from "@/components/ui/card";
import { vi } from "@/i18n/vi";

export interface GameLayoutProps {
  children: React.ReactNode;
}

export function GameLayout({ children }: GameLayoutProps) {
  const gameState = useGameState();
  const currentEvent = gameState?.currentEvent;
  const narration = gameState?.narration;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden opacity-20">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-600 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-amber-500 blur-[100px]" />
      </div>

      {/* Top Navigation Header */}
      <GameHeader />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-6 py-8 relative">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>

        {/* Real-time Overlays: Alerts & Notifications */}
        <AnimatePresence>
          {/* Market Event Overlay Drawer */}
          {currentEvent && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 right-6 z-40 max-w-sm w-full"
            >
              <Card className="border-amber-500/30 bg-slate-900/90 backdrop-blur shadow-2xl overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-amber-600" />
                <CardContent className="p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                      />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {vi.game.phase.event}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100">
                    {currentEvent.titleVi}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {currentEvent.descriptionVi}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* AI Narrator Box overlay */}
          {narration && narration.isVisible && narration.text && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-40 max-w-xl w-full px-4"
            >
              <Card className="border-blue-500/20 bg-slate-900/90 backdrop-blur shadow-2xl border-l-4 border-l-blue-500">
                <CardContent className="p-4 flex gap-3 items-start">
                  <div className="p-2 rounded bg-blue-500/10 text-blue-400 mt-0.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                      {vi.game.phase.narration}
                    </div>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed italic">
                      &ldquo;{narration.text}&rdquo;
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Styled Footer */}
      <footer className="h-12 border-t border-slate-800 bg-slate-950 flex items-center justify-center text-[10px] text-slate-500 font-medium px-6 text-center select-none">
        {vi.layout.footer.copyright}
      </footer>
    </div>
  );
}
