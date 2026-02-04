import axios from 'axios';
import type { Book, SearchResult, ReadingProgress, PdfUploadResult } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Books API
export const searchBooks = async (query: string, page = 1): Promise<SearchResult> => {
  const { data } = await api.get('/books/search', { params: { q: query, page } });
  return data;
};

export const getBook = async (id: string, source: string): Promise<Book> => {
  const { data } = await api.get(`/books/${id}`, { params: { source } });
  return data;
};

export const getBookContent = async (
  id: string,
  chapter: number,
  source: string
): Promise<string> => {
  const { data } = await api.get(`/books/${id}/content/${chapter}`, { params: { source } });
  return data.content;
};

export const getGutenbergText = async (id: string): Promise<string> => {
  const { data } = await api.get(`/books/gutenberg/${id}/text`);
  return data.content;
};

// Internet Archive API
export const getInternetArchiveText = async (id: string): Promise<string> => {
  const { data } = await api.get(`/books/internetarchive/${id}/text`);
  return data.content;
};

export const getInternetArchiveFormats = async (id: string): Promise<{
  epub?: string;
  pdf?: string;
  text?: string;
  html?: string;
  mobi?: string;
}> => {
  const { data } = await api.get(`/books/internetarchive/${id}/formats`);
  return data;
};

// PDF API
export const uploadPdf = async (file: File): Promise<PdfUploadResult> => {
  const formData = new FormData();
  formData.append('pdf', file);
  const { data } = await api.post('/pdf/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const getPdfPage = async (sessionId: string, pageNum: number): Promise<string> => {
  const { data } = await api.get(`/pdf/${sessionId}/page/${pageNum}`);
  return data.imageUrl;
};

export const deletePdfSession = async (sessionId: string): Promise<void> => {
  await api.delete(`/pdf/${sessionId}`);
};

// Session & Progress API
export const saveProgress = async (progress: ReadingProgress): Promise<void> => {
  await api.post('/session/progress', progress);
};

export const getProgress = async (bookId: string): Promise<ReadingProgress | null> => {
  try {
    const { data } = await api.get(`/session/progress/${bookId}`);
    return data;
  } catch {
    return null;
  }
};

export const endSession = async (sessionId: string): Promise<void> => {
  await api.delete(`/session/${sessionId}`);
};

// Auth API
export const login = async (email: string, password: string): Promise<{ token: string }> => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

export const register = async (
  email: string,
  password: string,
  name?: string
): Promise<{ token: string }> => {
  const { data } = await api.post('/auth/register', { email, password, name });
  return data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

export const getCurrentUser = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const syncProgress = async (progressList: ReadingProgress[]): Promise<void> => {
  await api.post('/auth/sync', { progress: progressList });
};

// Ebook Conversion API (MOBI/AZW3 to EPUB)
export interface EbookConversionResult {
  sessionId: string;
  title: string;
  format: 'mobi' | 'azw3' | 'azw';
  message: string;
}

export interface EbookStatus {
  calibreAvailable: boolean;
  supportedFormats: string[];
}

export const checkEbookStatus = async (): Promise<EbookStatus> => {
  const { data } = await api.get('/ebook/status');
  return data;
};

export const convertEbook = async (file: File): Promise<EbookConversionResult> => {
  const formData = new FormData();
  formData.append('ebook', file);
  const { data } = await api.post('/ebook/convert', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 minutes for conversion
  });
  return data;
};

export const getConvertedEpubUrl = (sessionId: string): string => {
  return `/api/ebook/${sessionId}/epub`;
};

export const deleteEbookSession = async (sessionId: string): Promise<void> => {
  await api.delete(`/ebook/${sessionId}`);
};

// Set auth token
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};
