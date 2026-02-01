import axios from 'axios';

const OPEN_LIBRARY_API = 'https://openlibrary.org';

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  author_key?: string[];
  cover_i?: number;
  first_publish_year?: number;
  publisher?: string[];
  subject?: string[];
  language?: string[];
  number_of_pages_median?: number;
}

export interface OpenLibrarySearchResult {
  numFound: number;
  start: number;
  docs: OpenLibraryBook[];
}

export interface OpenLibraryWork {
  title: string;
  description?: { value: string } | string;
  subjects?: string[];
  authors?: { author: { key: string } }[];
  covers?: number[];
}

export async function searchBooks(query: string, page = 1, limit = 20): Promise<{
  books: OpenLibraryBook[];
  total: number;
  hasMore: boolean;
}> {
  const offset = (page - 1) * limit;
  const url = `${OPEN_LIBRARY_API}/search.json`;

  const response = await axios.get<OpenLibrarySearchResult>(url, {
    params: {
      q: query,
      limit,
      offset,
      fields: 'key,title,author_name,author_key,cover_i,first_publish_year,publisher,subject,language,number_of_pages_median',
    },
  });

  return {
    books: response.data.docs,
    total: response.data.numFound,
    hasMore: offset + response.data.docs.length < response.data.numFound,
  };
}

export async function getWork(workId: string): Promise<OpenLibraryWork | null> {
  try {
    const url = `${OPEN_LIBRARY_API}/works/${workId}.json`;
    const response = await axios.get<OpenLibraryWork>(url);
    return response.data;
  } catch {
    return null;
  }
}

export function getCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export function transformToBook(doc: OpenLibraryBook) {
  return {
    id: doc.key.replace('/works/', ''),
    title: doc.title,
    authors: (doc.author_name || []).map((name, i) => ({
      name,
      key: doc.author_key?.[i],
    })),
    coverUrl: doc.cover_i ? getCoverUrl(doc.cover_i, 'M') : undefined,
    publishDate: doc.first_publish_year?.toString(),
    publisher: doc.publisher?.[0],
    subjects: doc.subject?.slice(0, 5),
    language: doc.language?.[0],
    pageCount: doc.number_of_pages_median,
    source: 'openlibrary' as const,
  };
}
