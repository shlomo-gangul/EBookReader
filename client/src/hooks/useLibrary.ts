import { useState, useCallback } from 'react';
import { useBookStore } from '../store';
import { searchBooks } from '../services/api';
import type { Book } from '../types';

interface UseLibraryReturn {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearSearch: () => void;
}

export function useLibrary(): UseLibraryReturn {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [currentQuery, setCurrentQuery] = useState('');

  const { setSearchQuery, setSearchResults } = useBookStore();

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setBooks([]);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentQuery(query);
    setSearchQuery(query);
    setPage(1);

    try {
      const result = await searchBooks(query, 1);
      setBooks(result.books);
      setSearchResults(result.books);
      setHasMore(result.hasMore);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [setSearchQuery, setSearchResults]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !currentQuery) return;

    setIsLoading(true);
    const nextPage = page + 1;

    try {
      const result = await searchBooks(currentQuery, nextPage);
      setBooks((prev) => [...prev, ...result.books]);
      setSearchResults([...books, ...result.books]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load more';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, currentQuery, page, books, setSearchResults]);

  const clearSearch = useCallback(() => {
    setBooks([]);
    setCurrentQuery('');
    setSearchQuery('');
    setSearchResults([]);
    setPage(1);
    setHasMore(false);
    setError(null);
  }, [setSearchQuery, setSearchResults]);

  return {
    books,
    isLoading,
    error,
    hasMore,
    page,
    search,
    loadMore,
    clearSearch,
  };
}
