import { useState, useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useBookStore } from '../store';
import { searchBooks } from '../services/api';
import type { Book } from '../types';

interface UseLibraryReturn {
  books: Book[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  search: (query: string) => void;
  loadMore: () => void;
  clearSearch: () => void;
}

export function useLibrary(): UseLibraryReturn {
  const [query, setQuery] = useState('');
  const queryClient = useQueryClient();
  const { setSearchQuery, setSearchResults } = useBookStore();

  const {
    data,
    isFetching,
    isError,
    error: queryError,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['search', query],
    queryFn: ({ pageParam }) => searchBooks(query, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: !!query.trim(),
  });

  const books: Book[] = useMemo(
    () => data?.pages.flatMap((p) => p.books) ?? [],
    [data]
  );

  // Sync with zustand store so other consumers stay in sync
  useEffect(() => {
    setSearchResults(books);
  }, [books, setSearchResults]);

  const search = useCallback(
    (newQuery: string) => {
      if (!newQuery.trim()) {
        setQuery('');
        setSearchQuery('');
        setSearchResults([]);
        return;
      }
      setSearchQuery(newQuery);
      setQuery(newQuery);
    },
    [setSearchQuery, setSearchResults]
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetching, fetchNextPage]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchQuery('');
    setSearchResults([]);
    queryClient.removeQueries({ queryKey: ['search'] });
  }, [setSearchQuery, setSearchResults, queryClient]);

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Search failed'
    : null;

  // Current page: last page fetched, or 1
  const page = data?.pages.length ?? 1;

  return {
    books,
    isLoading: isFetching,
    error,
    hasMore: hasNextPage ?? false,
    page,
    search,
    loadMore,
    clearSearch,
  };
}
