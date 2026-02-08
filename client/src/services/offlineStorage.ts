import Dexie, { type Table } from 'dexie';
import type { Book } from '../types';

export interface OfflineBook {
  id: string;
  title: string;
  authors: string[];
  coverBlob?: Blob;
  source: Book['source'];
  content: string;
  sizeBytes: number;
  downloadedAt: number;
  bookMetadata: Book;
}

class BookReaderDB extends Dexie {
  offlineBooks!: Table<OfflineBook, string>;

  constructor() {
    super('BookReaderDB');
    this.version(1).stores({
      offlineBooks: 'id, title, downloadedAt',
    });
  }
}

const db = new BookReaderDB();

export async function saveBookOffline(
  book: Book,
  content: string,
  coverBlob?: Blob
): Promise<void> {
  const sizeBytes = new Blob([content]).size + (coverBlob?.size ?? 0);

  await db.offlineBooks.put({
    id: book.id,
    title: book.title,
    authors: book.authors.map((a) => a.name),
    coverBlob,
    source: book.source,
    content,
    sizeBytes,
    downloadedAt: Date.now(),
    bookMetadata: book,
  });
}

export async function getOfflineBook(id: string): Promise<OfflineBook | undefined> {
  return db.offlineBooks.get(id);
}

export async function isBookOffline(id: string): Promise<boolean> {
  const count = await db.offlineBooks.where('id').equals(id).count();
  return count > 0;
}

export async function removeOfflineBook(id: string): Promise<void> {
  await db.offlineBooks.delete(id);
}

export async function getAllOfflineBooks(): Promise<OfflineBook[]> {
  return db.offlineBooks.orderBy('downloadedAt').reverse().toArray();
}

export async function getStorageUsed(): Promise<number> {
  const books = await db.offlineBooks.toArray();
  return books.reduce((total, book) => total + book.sizeBytes, 0);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
