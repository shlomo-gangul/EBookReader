import { useCallback, useRef } from 'react';
import type { ReadingSession, GlobalStats } from '../types';

const STATS_BOOK_PREFIX = 'bookreader_stats_';
const STATS_GLOBAL_KEY = 'bookreader_stats_global';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getBookSessions(bookId: string): ReadingSession[] {
  try {
    const raw = localStorage.getItem(`${STATS_BOOK_PREFIX}${bookId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveBookSessions(bookId: string, sessions: ReadingSession[]): void {
  localStorage.setItem(`${STATS_BOOK_PREFIX}${bookId}`, JSON.stringify(sessions));
}

function getGlobalStats(): GlobalStats {
  try {
    const raw = localStorage.getItem(STATS_GLOBAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  return { totalSessions: 0, totalMs: 0, totalPages: 0, streak: 0, lastReadDate: '' };
}

function saveGlobalStats(stats: GlobalStats): void {
  localStorage.setItem(STATS_GLOBAL_KEY, JSON.stringify(stats));
}

function updateStreak(stats: GlobalStats, today: string): GlobalStats {
  if (!stats.lastReadDate) return { ...stats, streak: 1, lastReadDate: today };
  if (stats.lastReadDate === today) return stats; // already counted today

  const last = new Date(stats.lastReadDate);
  const todayDate = new Date(today);
  const diffDays = Math.round((todayDate.getTime() - last.getTime()) / 86400000);
  const newStreak = diffDays === 1 ? stats.streak + 1 : 1;
  return { ...stats, streak: newStreak, lastReadDate: today };
}

export function useReadingStats() {
  const sessionRef = useRef<{ bookId: string; startPage: number; startTime: number } | null>(null);

  const startSession = useCallback((bookId: string, page: number) => {
    sessionRef.current = { bookId, startPage: page, startTime: Date.now() };
  }, []);

  const endSession = useCallback((endPage: number) => {
    const s = sessionRef.current;
    if (!s) return;
    sessionRef.current = null;

    const durationMs = Date.now() - s.startTime;
    if (durationMs < 5000) return; // ignore sessions under 5 seconds

    const today = todayISO();
    const session: ReadingSession = {
      bookId: s.bookId,
      startPage: s.startPage,
      endPage,
      durationMs,
      date: today,
    };

    // Save per-book
    const sessions = getBookSessions(s.bookId);
    sessions.push(session);
    saveBookSessions(s.bookId, sessions);

    // Update global
    let global = getGlobalStats();
    global = updateStreak(global, today);
    global.totalSessions += 1;
    global.totalMs += durationMs;
    global.totalPages += Math.abs(endPage - s.startPage);
    saveGlobalStats(global);
  }, []);

  const getBookStats = useCallback((bookId: string) => {
    const sessions = getBookSessions(bookId);
    const totalMs = sessions.reduce((acc, s) => acc + s.durationMs, 0);
    const totalPages = sessions.reduce((acc, s) => acc + Math.abs(s.endPage - s.startPage), 0);
    return { totalMs, totalPages, sessions };
  }, []);

  return { startSession, endSession, getBookStats, getGlobalStats };
}
