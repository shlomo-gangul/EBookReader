import { useState, useCallback, useEffect } from 'react';
import type { Highlight } from '../types';

const STORAGE_PREFIX = 'bookreader_highlights_';

function loadHighlights(bookId: string): Highlight[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${bookId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistHighlights(bookId: string, highlights: Highlight[]) {
  localStorage.setItem(`${STORAGE_PREFIX}${bookId}`, JSON.stringify(highlights));
}

export function useHighlights(bookId: string | null) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // Load on bookId change
  useEffect(() => {
    if (bookId) {
      setHighlights(loadHighlights(bookId));
    } else {
      setHighlights([]);
    }
  }, [bookId]);

  const addHighlight = useCallback(
    (
      pageNumber: number,
      startChar: number,
      endChar: number,
      color: string,
      note?: string
    ): Highlight => {
      const h: Highlight = {
        id: `hl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        bookId: bookId ?? '',
        pageNumber,
        startChar,
        endChar,
        color,
        note,
        createdAt: new Date().toISOString(),
      };
      setHighlights((prev) => {
        const next = [...prev, h];
        if (bookId) persistHighlights(bookId, next);
        return next;
      });
      return h;
    },
    [bookId]
  );

  const removeHighlight = useCallback(
    (id: string) => {
      setHighlights((prev) => {
        const next = prev.filter((h) => h.id !== id);
        if (bookId) persistHighlights(bookId, next);
        return next;
      });
    },
    [bookId]
  );

  const updateNote = useCallback(
    (id: string, note: string) => {
      setHighlights((prev) => {
        const next = prev.map((h) => (h.id === id ? { ...h, note } : h));
        if (bookId) persistHighlights(bookId, next);
        return next;
      });
    },
    [bookId]
  );

  const highlightsForPage = useCallback(
    (pageNumber: number) => highlights.filter((h) => h.pageNumber === pageNumber),
    [highlights]
  );

  return { highlights, addHighlight, removeHighlight, updateNote, highlightsForPage };
}
