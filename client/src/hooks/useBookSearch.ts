import { useState, useCallback, useRef } from 'react';
import type { PageContent } from '../types';

export interface SearchResult {
  pageNumber: number;
  startChar: number;
  endChar: number;
  contextSnippet: string;
}

export interface BookSearchState {
  query: string;
  results: SearchResult[];
  currentResultIndex: number;
  isOpen: boolean;
  currentMatch: SearchResult | null;
}

export interface BookSearchActions {
  search: (query: string, pages: PageContent[]) => void;
  nextResult: () => void;
  prevResult: () => void;
  clearSearch: () => void;
  openSearch: () => void;
  closeSearch: () => void;
}

const CONTEXT_CHARS = 60;

function buildResults(query: string, pages: PageContent[]): SearchResult[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const page of pages) {
    const text = page.content ?? '';
    const lowerText = text.toLowerCase();
    let idx = 0;
    while (true) {
      const found = lowerText.indexOf(lower, idx);
      if (found === -1) break;

      const startChar = found;
      const endChar = found + query.length;

      // Build context snippet
      const snippetStart = Math.max(0, startChar - CONTEXT_CHARS);
      const snippetEnd = Math.min(text.length, endChar + CONTEXT_CHARS);
      let snippet = text.slice(snippetStart, snippetEnd).replace(/\n/g, ' ');
      if (snippetStart > 0) snippet = '…' + snippet;
      if (snippetEnd < text.length) snippet = snippet + '…';

      results.push({ pageNumber: page.pageNumber, startChar, endChar, contextSnippet: snippet });
      idx = endChar;
    }
  }

  return results;
}

export function useBookSearch(): BookSearchState & BookSearchActions {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string, pages: PageContent[]) => {
    setQuery(q);
    setCurrentResultIndex(0);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const r = buildResults(q, pages);
      setResults(r);
    }, 200);
  }, []);

  const nextResult = useCallback(() => {
    setCurrentResultIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
  }, [results.length]);

  const prevResult = useCallback(() => {
    setCurrentResultIndex((i) =>
      results.length === 0 ? 0 : (i - 1 + results.length) % results.length
    );
  }, [results.length]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setCurrentResultIndex(0);
  }, []);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => {
    setIsOpen(false);
    clearSearch();
  }, [clearSearch]);

  const currentMatch = results[currentResultIndex] ?? null;

  return {
    query,
    results,
    currentResultIndex,
    isOpen,
    currentMatch,
    search,
    nextResult,
    prevResult,
    clearSearch,
    openSearch,
    closeSearch,
  };
}
