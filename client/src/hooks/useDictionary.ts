import { useState, useCallback, useRef } from 'react';

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string }[];
  }[];
}

interface DictionaryState {
  word: string;
  entry: DictionaryEntry | null;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  x: number;
  y: number;
}

const cache = new Map<string, DictionaryEntry | null>();

export function useDictionary() {
  const [state, setState] = useState<DictionaryState>({
    word: '',
    entry: null,
    isLoading: false,
    error: null,
    isOpen: false,
    x: 0,
    y: 0,
  });
  const abortRef = useRef<AbortController | null>(null);

  const lookup = useCallback(async (word: string, x: number, y: number) => {
    const clean = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    if (!clean || clean.length < 2) return;

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ word: clean, entry: null, isLoading: true, error: null, isOpen: true, x, y });

    if (cache.has(clean)) {
      const cached = cache.get(clean)!;
      setState({ word: clean, entry: cached, isLoading: false, error: cached ? null : 'No definition found', isOpen: true, x, y });
      return;
    }

    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        cache.set(clean, null);
        setState((prev) => ({ ...prev, isLoading: false, error: 'No definition found' }));
        return;
      }
      const data: DictionaryEntry[] = await res.json();
      const entry = data[0] ?? null;
      cache.set(clean, entry);
      setState((prev) => ({ ...prev, entry, isLoading: false, error: entry ? null : 'No definition found' }));
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to fetch definition' }));
    }
  }, []);

  const close = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { ...state, lookup, close };
}
