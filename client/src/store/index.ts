import { create } from 'zustand';
import type { Book, ReadingProgress, ReaderSettings, Bookmark, User } from '../types';
import * as cacheService from '../services/cacheService';

// Throttle helper for saveProgress - only save every 5 seconds
let lastSaveTime = 0;
const SAVE_THROTTLE_MS = 5000;

interface BookStore {
  // Current book state
  currentBook: Book | null;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  // Reader settings
  settings: ReaderSettings;

  // Bookmarks
  bookmarks: Bookmark[];

  // User state
  user: User | null;
  isAuthenticated: boolean;

  // Library state
  searchQuery: string;
  searchResults: Book[];
  recentBooks: Book[];

  // Actions
  setCurrentBook: (book: Book | null) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateSettings: (settings: Partial<ReaderSettings>) => void;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (bookmarkId: string) => void;
  setUser: (user: User | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (books: Book[]) => void;
  addToRecentBooks: (book: Book) => void;
  loadFromCache: () => void;
  saveProgress: () => void;
}

export const useBookStore = create<BookStore>((set, get) => ({
  // Initial state
  currentBook: null,
  currentPage: 1,
  totalPages: 0,
  isLoading: false,
  error: null,
  settings: cacheService.getReaderSettings(),
  bookmarks: [],
  user: null,
  isAuthenticated: false,
  searchQuery: '',
  searchResults: [],
  recentBooks: cacheService.getRecentBooks().map((r) => r.book),

  // Actions
  setCurrentBook: (book) => {
    set({ currentBook: book });
    if (book) {
      const bookmarks = cacheService.getBookmarks(book.id);
      const progress = cacheService.getReadingProgress(book.id);
      set({
        bookmarks,
        currentPage: progress?.currentPage || 1,
        totalPages: progress?.totalPages || book.pageCount || 0,
      });
      cacheService.addToRecentBooks(book);
    }
  },

  setCurrentPage: (page) => {
    set({ currentPage: page });
    // Throttle saveProgress to avoid excessive writes
    const now = Date.now();
    if (now - lastSaveTime > SAVE_THROTTLE_MS) {
      lastSaveTime = now;
      get().saveProgress();
    }
  },

  setTotalPages: (total) => set({ totalPages: total }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  updateSettings: (newSettings) => {
    const settings = { ...get().settings, ...newSettings };
    set({ settings });
    cacheService.saveReaderSettings(settings);
  },

  addBookmark: (bookmark) => {
    const { currentBook, bookmarks } = get();
    if (currentBook) {
      const newBookmarks = [...bookmarks, bookmark];
      set({ bookmarks: newBookmarks });
      cacheService.saveBookmark(currentBook.id, bookmark);
    }
  },

  removeBookmark: (bookmarkId) => {
    const { currentBook, bookmarks } = get();
    if (currentBook) {
      const newBookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
      set({ bookmarks: newBookmarks });
      cacheService.removeBookmark(currentBook.id, bookmarkId);
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchResults: (books) => set({ searchResults: books }),

  addToRecentBooks: (book) => {
    const { recentBooks } = get();
    const filtered = recentBooks.filter((b) => b.id !== book.id);
    set({ recentBooks: [book, ...filtered].slice(0, 20) });
    cacheService.addToRecentBooks(book);
  },

  loadFromCache: () => {
    const settings = cacheService.getReaderSettings();
    const recentBooks = cacheService.getRecentBooks().map((r) => r.book);
    set({ settings, recentBooks });
  },

  saveProgress: () => {
    const { currentBook, currentPage, totalPages, bookmarks } = get();
    if (currentBook && totalPages > 0) {
      const progress: ReadingProgress = {
        bookId: currentBook.id,
        currentPage,
        totalPages,
        percentage: Math.round((currentPage / totalPages) * 100),
        lastRead: new Date().toISOString(),
        bookmarks,
      };
      cacheService.saveReadingProgress(currentBook.id, progress);
    }
  },
}));
