import { useState, useEffect, useRef, useCallback } from 'react';

interface ReadingTimerState {
  duration: number; // minutes chosen, 0 = off
  remaining: number; // seconds remaining
  isActive: boolean;
  isExpired: boolean;
}

export function useReadingTimer() {
  const [state, setState] = useState<ReadingTimerState>({
    duration: 0,
    remaining: 0,
    isActive: false,
    isExpired: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((minutes: number) => {
    clearTimer();
    if (minutes === 0) {
      setState({ duration: 0, remaining: 0, isActive: false, isExpired: false });
      return;
    }
    const seconds = minutes * 60;
    setState({ duration: minutes, remaining: seconds, isActive: true, isExpired: false });
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (!prev.isActive) return prev;
        const next = prev.remaining - 1;
        if (next <= 0) {
          return { ...prev, remaining: 0, isActive: false, isExpired: true };
        }
        return { ...prev, remaining: next };
      });
    }, 1000);
  }, [clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    setState({ duration: 0, remaining: 0, isActive: false, isExpired: false });
  }, [clearTimer]);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, isExpired: false }));
  }, []);

  // Clean up on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  // Auto-clear interval when expired
  useEffect(() => {
    if (state.isExpired) {
      clearTimer();
    }
  }, [state.isExpired, clearTimer]);

  // Format remaining time as MM:SS
  const formattedRemaining = (() => {
    const m = Math.floor(state.remaining / 60);
    const s = state.remaining % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  return { ...state, formattedRemaining, start, stop, dismiss };
}
