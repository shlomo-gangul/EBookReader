import { useCallback, useEffect } from 'react';
import { useBookStore } from '../store';
import type { ReadingProgress, Bookmark } from '../types';

interface UseReadingProgressReturn {
  progress: ReadingProgress | null;
  bookmarks: Bookmark[];
  addBookmark: (note?: string) => void;
  removeBookmark: (bookmarkId: string) => void;
  goToBookmark: (bookmark: Bookmark) => void;
  getProgressPercentage: () => number;
}

export function useReadingProgress(): UseReadingProgressReturn {
  const {
    currentBook,
    currentPage,
    totalPages,
    bookmarks,
    addBookmark: storeAddBookmark,
    removeBookmark: storeRemoveBookmark,
    setCurrentPage,
    saveProgress,
  } = useBookStore();

  // Auto-save progress periodically
  useEffect(() => {
    if (!currentBook) return;

    const interval = setInterval(() => {
      saveProgress();
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [currentBook, saveProgress]);

  // Save progress when page changes
  useEffect(() => {
    if (currentBook && currentPage > 0) {
      saveProgress();
    }
  }, [currentBook, currentPage, saveProgress]);

  const addBookmark = useCallback((note?: string) => {
    if (!currentBook) return;

    const bookmark: Bookmark = {
      id: `bookmark_${Date.now()}`,
      page: currentPage,
      note,
      createdAt: new Date().toISOString(),
    };

    storeAddBookmark(bookmark);
  }, [currentBook, currentPage, storeAddBookmark]);

  const removeBookmark = useCallback((bookmarkId: string) => {
    storeRemoveBookmark(bookmarkId);
  }, [storeRemoveBookmark]);

  const goToBookmark = useCallback((bookmark: Bookmark) => {
    setCurrentPage(bookmark.page);
  }, [setCurrentPage]);

  const getProgressPercentage = useCallback(() => {
    if (totalPages === 0) return 0;
    return Math.round((currentPage / totalPages) * 100);
  }, [currentPage, totalPages]);

  const progress: ReadingProgress | null = currentBook
    ? {
        bookId: currentBook.id,
        currentPage,
        totalPages,
        percentage: getProgressPercentage(),
        lastRead: new Date().toISOString(),
        bookmarks,
      }
    : null;

  return {
    progress,
    bookmarks,
    addBookmark,
    removeBookmark,
    goToBookmark,
    getProgressPercentage,
  };
}
