import axios from 'axios';

const GUTENDEX_API = 'https://gutendex.com';

export interface GutenbergBook {
  id: number;
  title: string;
  authors: { name: string; birth_year?: number; death_year?: number }[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean;
  media_type: string;
  formats: Record<string, string>;
  download_count: number;
}

export interface GutendexSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutenbergBook[];
}

export async function searchBooks(query: string, page = 1): Promise<{
  books: GutenbergBook[];
  total: number;
  hasMore: boolean;
}> {
  const url = `${GUTENDEX_API}/books`;

  const response = await axios.get<GutendexSearchResult>(url, {
    params: {
      search: query,
      page,
    },
  });

  return {
    books: response.data.results,
    total: response.data.count,
    hasMore: response.data.next !== null,
  };
}

export async function getBook(id: string): Promise<GutenbergBook | null> {
  try {
    const url = `${GUTENDEX_API}/books/${id}`;
    const response = await axios.get<GutenbergBook>(url);
    return response.data;
  } catch {
    return null;
  }
}

export async function getBookText(id: string): Promise<string | null> {
  try {
    const book = await getBook(id);
    if (!book) return null;

    // Prefer plain text format
    const textUrl =
      book.formats['text/plain; charset=utf-8'] ||
      book.formats['text/plain'] ||
      book.formats['text/plain; charset=us-ascii'];

    if (!textUrl) {
      // Try HTML as fallback
      const htmlUrl = book.formats['text/html'];
      if (htmlUrl) {
        const response = await axios.get(htmlUrl, { responseType: 'text' });
        // Strip HTML tags for basic text extraction
        return response.data.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }
      return null;
    }

    const response = await axios.get(textUrl, { responseType: 'text' });
    return response.data;
  } catch (error) {
    console.error('Error fetching book text:', error);
    return null;
  }
}

export function getCoverUrl(id: number): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
}

export function transformToBook(book: GutenbergBook) {
  return {
    id: book.id.toString(),
    title: book.title,
    authors: book.authors.map((a) => ({ name: a.name })),
    coverUrl: getCoverUrl(book.id),
    subjects: book.subjects.slice(0, 5),
    language: book.languages[0],
    source: 'gutenberg' as const,
    formats: {
      text: book.formats['text/plain; charset=utf-8'] || book.formats['text/plain'],
      html: book.formats['text/html'],
      epub: book.formats['application/epub+zip'],
    },
  };
}
