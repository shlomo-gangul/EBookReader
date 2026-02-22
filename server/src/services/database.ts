import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'bookreader.db');

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reading_progress (
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    current_page INTEGER NOT NULL,
    total_pages INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    last_read TEXT NOT NULL,
    PRIMARY KEY (user_id, book_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS highlights (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    start_char INTEGER NOT NULL,
    end_char INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT '#fef08a',
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

export interface DbHighlight {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  start_char: number;
  end_char: number;
  color: string;
  note: string | null;
  created_at: string;
}

// Prepared statements
const stmts = {
  createUser: db.prepare(
    'INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)'
  ),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  saveProgress: db.prepare(`
    INSERT INTO reading_progress (user_id, book_id, current_page, total_pages, percentage, last_read)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, book_id) DO UPDATE SET
      current_page = excluded.current_page,
      total_pages = excluded.total_pages,
      percentage = excluded.percentage,
      last_read = excluded.last_read
  `),
  getProgress: db.prepare(
    'SELECT * FROM reading_progress WHERE user_id = ? AND book_id = ?'
  ),
  getAllProgress: db.prepare(
    'SELECT * FROM reading_progress WHERE user_id = ?'
  ),
  getHighlights: db.prepare(
    'SELECT * FROM highlights WHERE user_id = ? AND book_id = ? ORDER BY page_number, start_char'
  ),
  saveHighlight: db.prepare(`
    INSERT INTO highlights (id, user_id, book_id, page_number, start_char, end_char, color, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      color = excluded.color,
      note = excluded.note
  `),
  deleteHighlight: db.prepare(
    'DELETE FROM highlights WHERE id = ? AND user_id = ?'
  ),
};

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
}

export interface DbReadingProgress {
  user_id: string;
  book_id: string;
  current_page: number;
  total_pages: number;
  percentage: number;
  last_read: string;
}

export function createUser(
  id: string,
  email: string,
  passwordHash: string,
  name: string | undefined,
  createdAt: string
): void {
  stmts.createUser.run(id, email, passwordHash, name ?? null, createdAt);
}

export function getUserByEmail(email: string): DbUser | undefined {
  return stmts.getUserByEmail.get(email) as DbUser | undefined;
}

export function getUserById(id: string): DbUser | undefined {
  return stmts.getUserById.get(id) as DbUser | undefined;
}

export function saveProgress(
  userId: string,
  bookId: string,
  currentPage: number,
  totalPages: number,
  percentage: number,
  lastRead: string
): void {
  stmts.saveProgress.run(userId, bookId, currentPage, totalPages, percentage, lastRead);
}

export function getProgress(userId: string, bookId: string): DbReadingProgress | undefined {
  return stmts.getProgress.get(userId, bookId) as DbReadingProgress | undefined;
}

export function getAllProgress(userId: string): DbReadingProgress[] {
  return stmts.getAllProgress.all(userId) as DbReadingProgress[];
}

export function saveProgressBatch(
  userId: string,
  items: Array<{ bookId: string; currentPage: number; totalPages: number; percentage: number; lastRead: string }>
): void {
  const transaction = db.transaction(() => {
    for (const item of items) {
      stmts.saveProgress.run(userId, item.bookId, item.currentPage, item.totalPages, item.percentage, item.lastRead);
    }
  });
  transaction();
}

export function getHighlights(userId: string, bookId: string): DbHighlight[] {
  return stmts.getHighlights.all(userId, bookId) as DbHighlight[];
}

export function saveHighlight(
  id: string,
  userId: string,
  bookId: string,
  pageNumber: number,
  startChar: number,
  endChar: number,
  color: string,
  note: string | null,
  createdAt: string
): void {
  stmts.saveHighlight.run(id, userId, bookId, pageNumber, startChar, endChar, color, note, createdAt);
}

export function deleteHighlight(id: string, userId: string): void {
  stmts.deleteHighlight.run(id, userId);
}

export function closeDb(): void {
  db.close();
}
