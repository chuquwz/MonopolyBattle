import { useState, useEffect, useRef, useCallback } from "react";

interface UseCountdownResult {
  seconds: number;
  isActive: boolean;
  start: () => void;
  pause: () => void;
  reset: (newSeconds?: number) => void;
  setSeconds: (sec: number) => void;
}

/**
 * Custom hook to manage a client-side countdown timer with controls.
 */
export function useCountdown(
  initialSeconds = 0,
  onTick?: (sec: number) => void,
  onComplete?: () => void
): UseCountdownResult {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setIsActive(true);
  }, []);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const reset = useCallback(
    (newSeconds?: number) => {
      setIsActive(false);
      setSeconds(newSeconds !== undefined ? newSeconds : initialSeconds);
    },
    [initialSeconds]
  );

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          onComplete?.();
          return 0;
        }
        const next = prev - 1;
        onTick?.(next);
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, onComplete, onTick]);

  return {
    seconds,
    isActive,
    start,
    pause,
    reset,
    setSeconds,
  };
}
