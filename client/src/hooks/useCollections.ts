import { useState, useCallback } from 'react';
import type { Collection } from '../types';
import type { Book } from '../types';

const STORAGE_KEY = 'bookreader_collections';

const DEFAULT_COLLECTIONS: Collection[] = [
  { id: 'reading', name: 'Reading', bookIds: [], createdAt: new Date().toISOString() },
  { id: 'want-to-read', name: 'Want to Read', bookIds: [], createdAt: new Date().toISOString() },
  { id: 'finished', name: 'Finished', bookIds: [], createdAt: new Date().toISOString() },
  { id: 'favourites', name: 'Favourites', bookIds: [], createdAt: new Date().toISOString() },
];

function loadCollections(): Collection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  return DEFAULT_COLLECTIONS;
}

function persistCollections(collections: Collection[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
}

// Separate books metadata store (bookId → Book)
const BOOKS_META_KEY = 'bookreader_collections_books';

function loadBooksMeta(): Record<string, Book> {
  try {
    const raw = localStorage.getItem(BOOKS_META_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  return {};
}

function saveBookMeta(book: Book): void {
  const meta = loadBooksMeta();
  meta[book.id] = book;
  localStorage.setItem(BOOKS_META_KEY, JSON.stringify(meta));
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>(loadCollections);

  const update = useCallback((updated: Collection[]) => {
    setCollections(updated);
    persistCollections(updated);
  }, []);

  const addToCollection = useCallback((collectionId: string, book: Book) => {
    saveBookMeta(book);
    setCollections((prev) => {
      const next = prev.map((c) =>
        c.id === collectionId && !c.bookIds.includes(book.id)
          ? { ...c, bookIds: [...c.bookIds, book.id] }
          : c
      );
      persistCollections(next);
      return next;
    });
  }, []);

  const removeFromCollection = useCallback((collectionId: string, bookId: string) => {
    setCollections((prev) => {
      const next = prev.map((c) =>
        c.id === collectionId ? { ...c, bookIds: c.bookIds.filter((id) => id !== bookId) } : c
      );
      persistCollections(next);
      return next;
    });
  }, []);

  const createCollection = useCallback((name: string) => {
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name,
      bookIds: [],
      createdAt: new Date().toISOString(),
    };
    setCollections((prev) => {
      const next = [...prev, newCol];
      persistCollections(next);
      return next;
    });
    return newCol;
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persistCollections(next);
      return next;
    });
  }, [update]);

  const getCollectionsForBook = useCallback((bookId: string): Collection[] => {
    return collections.filter((c) => c.bookIds.includes(bookId));
  }, [collections]);

  const getBooksForCollection = useCallback((collectionId: string): Book[] => {
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return [];
    const meta = loadBooksMeta();
    return col.bookIds.map((id) => meta[id]).filter(Boolean);
  }, [collections]);

  return {
    collections,
    addToCollection,
    removeFromCollection,
    createCollection,
    deleteCollection,
    getCollectionsForBook,
    getBooksForCollection,
  };
}
