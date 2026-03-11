import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DictionaryEntrySchema } from '../schemas/api';
import type { DictionaryEntry } from '../schemas/api';

export function useDictionary() {
  const [word, setWord] = useState('');
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const { data: entry, isFetching, isError } = useQuery<DictionaryEntry | null>({
    queryKey: ['dictionary', word],
    queryFn: async () => {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );
      if (!res.ok) return null;
      const raw = await res.json();
      const parsed = DictionaryEntrySchema.safeParse(raw[0]);
      if (!parsed.success) {
        console.warn('[useDictionary] Zod parse error:', parsed.error.flatten());
        return raw[0] ?? null;
      }
      return parsed.data;
    },
    enabled: !!word,
    staleTime: Infinity,
    retry: false,
  });

  const lookup = useCallback((newWord: string, newX: number, newY: number) => {
    const clean = newWord.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    if (!clean || clean.length < 2) return;
    setWord(clean);
    setX(newX);
    setY(newY);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const error = isError || (word && !isFetching && entry === null)
    ? 'No definition found'
    : null;

  return {
    word,
    entry: entry ?? null,
    isLoading: isFetching,
    error,
    isOpen,
    x,
    y,
    lookup,
    close,
  };
}
