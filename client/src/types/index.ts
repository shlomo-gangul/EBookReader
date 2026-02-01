export interface Book {
  id: string;
  title: string;
  authors: Author[];
  coverUrl?: string;
  description?: string;
  subjects?: string[];
  publishDate?: string;
  publisher?: string;
  language?: string;
  pageCount?: number;
  source: 'openlibrary' | 'gutenberg' | 'pdf';
  downloadUrl?: string;
  formats?: BookFormats;
}

export interface Author {
  name: string;
  key?: string;
}

export interface BookFormats {
  epub?: string;
  html?: string;
  text?: string;
  pdf?: string;
}

export interface SearchResult {
  books: Book[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  lastRead: string;
  bookmarks: Bookmark[];
}

export interface Bookmark {
  id: string;
  page: number;
  note?: string;
  createdAt: string;
}

export interface UserSession {
  id: string;
  isAuthenticated: boolean;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export type ReadingMode = 'day' | 'night' | 'sepia';

export type FontFamily = 'serif' | 'sans' | 'georgia' | 'literata';

export interface ReaderSettings {
  mode: ReadingMode;
  fontSize: number;
  fontFamily: FontFamily;
  lineHeight: number;
  marginSize: 'small' | 'medium' | 'large';
}

export interface PageContent {
  pageNumber: number;
  content: string;
  isImage?: boolean;
  imageUrl?: string;
}

export interface PdfUploadResult {
  sessionId: string;
  pageCount: number;
  title?: string;
}

export interface ChapterInfo {
  id: string;
  title: string;
  startPage: number;
}
