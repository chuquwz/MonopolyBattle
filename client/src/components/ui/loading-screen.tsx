"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { vi } from "@/i18n/vi.js";

export interface LoadingScreenProps {
  messageType?: "connecting" | "fetching" | "loading";
  customMessage?: string;
}

export function LoadingScreen({
  messageType = "loading",
  customMessage,
}: LoadingScreenProps) {
  const message = customMessage || vi.ui.loading[messageType];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background glow animations */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-30">
        <motion.div
          className="w-[400px] h-[400px] rounded-full bg-blue-500 blur-[80px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full bg-amber-500 blur-[80px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full opacity-65"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100 - Math.random() * 100],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: "easeOut",
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>

      {/* Rotating spinner */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer glowing ring */}
        <motion.div
          className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-amber-500"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        {/* Inner reverse-rotating ring */}
        <motion.div
          className="absolute w-14 h-14 rounded-full border-4 border-slate-800 border-b-blue-500"
          animate={{ rotate: -360 }}
          transition={{
            duration: 2.0,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        {/* Central pulsing core */}
        <motion.div
          className="absolute w-6 h-6 rounded-full bg-slate-100 shadow-[0_0_15px_rgba(255,255,255,0.8)]"
          animate={{
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Display text */}
      <motion.p
        className="text-lg font-medium text-slate-300 tracking-wide text-center max-w-xs px-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {message}
      </motion.p>
    </div>
  );
}
