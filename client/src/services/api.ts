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

// Set auth token
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};
