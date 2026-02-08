import { useState, useEffect, useCallback } from 'react';
import {
  getAllOfflineBooks,
  removeOfflineBook,
  getStorageUsed,
  isBookOffline,
  saveBookOffline,
  formatBytes,
  type OfflineBook,
} from '../services/offlineStorage';
import { fetchBookContent } from '../services/bookContentFetcher';
import type { Book } from '../types';

interface UseOfflineBooksReturn {
  offlineBooks: OfflineBook[];
  storageUsed: string;
  isLoading: boolean;
  refresh: () => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  downloadBook: (book: Book) => Promise<void>;
  isDownloading: string | null;
  checkOffline: (id: string) => Promise<boolean>;
}

export function useOfflineBooks(): UseOfflineBooksReturn {
  const [offlineBooks, setOfflineBooks] = useState<OfflineBook[]>([]);
  const [storageUsed, setStorageUsed] = useState('0 B');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [books, bytes] = await Promise.all([
        getAllOfflineBooks(),
        getStorageUsed(),
      ]);
      setOfflineBooks(books);
      setStorageUsed(formatBytes(bytes));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const removeBook = useCallback(async (id: string) => {
    await removeOfflineBook(id);
    await refresh();
  }, [refresh]);

  const downloadBook = useCallback(async (book: Book) => {
    setIsDownloading(book.id);
    try {
      const { content, epubDoc } = await fetchBookContent(book);

      // Fetch cover as blob if available
      let coverBlob: Blob | undefined;
      if (book.coverUrl) {
        try {
          const res = await fetch(book.coverUrl);
          if (res.ok) {
            coverBlob = await res.blob();
          }
        } catch {
          // Cover fetch failed, save without it
        }
      }

      await saveBookOffline(book, content, coverBlob);

      // Clean up epub doc if created during fetch
      if (epubDoc) {
        epubDoc.destroy();
      }

      await refresh();
    } finally {
      setIsDownloading(null);
    }
  }, [refresh]);

  const checkOffline = useCallback(async (id: string) => {
    return isBookOffline(id);
  }, []);

  return {
    offlineBooks,
    storageUsed,
    isLoading,
    refresh,
    removeBook,
    downloadBook,
    isDownloading,
    checkOffline,
  };
}
