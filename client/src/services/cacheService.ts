const CACHE_PREFIX = 'bookreader_';
const PROGRESS_KEY = `${CACHE_PREFIX}progress_`;
const SETTINGS_KEY = `${CACHE_PREFIX}settings`;
const SESSION_KEY = `${CACHE_PREFIX}session`;
const BOOKMARKS_KEY = `${CACHE_PREFIX}bookmarks_`;
const RECENT_BOOKS_KEY = `${CACHE_PREFIX}recent_books`;

import type { ReadingProgress, ReaderSettings, Bookmark, Book } from '../types';

// Reading Progress
export function saveReadingProgress(bookId: string, progress: ReadingProgress): void {
  localStorage.setItem(`${PROGRESS_KEY}${bookId}`, JSON.stringify(progress));
  updateRecentBooks(bookId, progress);
}

export function getReadingProgress(bookId: string): ReadingProgress | null {
  const data = localStorage.getItem(`${PROGRESS_KEY}${bookId}`);
  return data ? JSON.parse(data) : null;
}

export function getAllReadingProgress(): Record<string, ReadingProgress> {
  const progress: Record<string, ReadingProgress> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PROGRESS_KEY)) {
      const bookId = key.replace(PROGRESS_KEY, '');
      const data = localStorage.getItem(key);
      if (data) {
        progress[bookId] = JSON.parse(data);
      }
    }
  }
  return progress;
}

export function clearReadingProgress(bookId: string): void {
  localStorage.removeItem(`${PROGRESS_KEY}${bookId}`);
}

// Reader Settings
export function saveReaderSettings(settings: ReaderSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getReaderSettings(): ReaderSettings {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (data) {
    const settings = JSON.parse(data);
    // Ensure readerMode is set (for backwards compatibility)
    if (!settings.readerMode) {
      settings.readerMode = 'flip';
    }
    return settings;
  }
  // Default settings
  return {
    mode: 'day',
    fontSize: 14,
    fontFamily: 'serif',
    lineHeight: 1.6,
    marginSize: 'medium',
    readerMode: 'flip',
  };
}

// Session
export function saveSession(sessionId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
}

export function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Bookmarks
export function saveBookmark(bookId: string, bookmark: Bookmark): void {
  const bookmarks = getBookmarks(bookId);
  bookmarks.push(bookmark);
  localStorage.setItem(`${BOOKMARKS_KEY}${bookId}`, JSON.stringify(bookmarks));
}

export function getBookmarks(bookId: string): Bookmark[] {
  const data = localStorage.getItem(`${BOOKMARKS_KEY}${bookId}`);
  return data ? JSON.parse(data) : [];
}

export function removeBookmark(bookId: string, bookmarkId: string): void {
  const bookmarks = getBookmarks(bookId).filter((b) => b.id !== bookmarkId);
  localStorage.setItem(`${BOOKMARKS_KEY}${bookId}`, JSON.stringify(bookmarks));
}

// Recent Books
interface RecentBook {
  book: Book;
  lastRead: string;
  progress: number;
}

function updateRecentBooks(bookId: string, progress: ReadingProgress): void {
  const recent = getRecentBooks();
  const existingIndex = recent.findIndex((r) => r.book.id === bookId);

  if (existingIndex !== -1) {
    recent[existingIndex].lastRead = new Date().toISOString();
    recent[existingIndex].progress = progress.percentage;
    // Move to front
    const [item] = recent.splice(existingIndex, 1);
    recent.unshift(item);
  }

  // Keep only last 20 books
  localStorage.setItem(RECENT_BOOKS_KEY, JSON.stringify(recent.slice(0, 20)));
}

export function addToRecentBooks(book: Book): void {
  const recent = getRecentBooks();
  const existingIndex = recent.findIndex((r) => r.book.id === book.id);

  if (existingIndex !== -1) {
    recent[existingIndex].lastRead = new Date().toISOString();
    const [item] = recent.splice(existingIndex, 1);
    recent.unshift(item);
  } else {
    recent.unshift({
      book,
      lastRead: new Date().toISOString(),
      progress: 0,
    });
  }

  localStorage.setItem(RECENT_BOOKS_KEY, JSON.stringify(recent.slice(0, 20)));
}

export function getRecentBooks(): RecentBook[] {
  const data = localStorage.getItem(RECENT_BOOKS_KEY);
  return data ? JSON.parse(data) : [];
}

// Clear all cache
export function clearAllCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
