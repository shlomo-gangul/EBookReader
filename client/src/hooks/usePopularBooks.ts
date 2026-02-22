import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import type { Book } from '../types';

interface GenreBooks {
  genre: string;
  books: Book[];
}

const GENRES = [
  { name: 'Fiction', topic: 'fiction' },
  { name: 'Science Fiction', topic: 'science fiction' },
  { name: 'Romance', topic: 'romance' },
  { name: 'Mystery', topic: 'mystery' },
  { name: 'Adventure', topic: 'adventure' },
  { name: 'History', topic: 'history' },
];

function parseGutenbergBooks(data: { results: Array<{
  id: number;
  title: string;
  authors: { name: string }[];
  subjects: string[];
  languages: string[];
  formats: Record<string, string>;
}> }): Book[] {
  return data.results.slice(0, 6).map((book) => ({
    id: book.id.toString(),
    title: book.title,
    authors: book.authors.map((a) => ({ name: a.name })),
    coverUrl: `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`,
    subjects: book.subjects?.slice(0, 3),
    language: book.languages?.[0],
    source: 'gutenberg' as const,
    formats: {
      text: book.formats['text/plain; charset=utf-8'] || book.formats['text/plain'],
      html: book.formats['text/html'],
      epub: book.formats['application/epub+zip'],
    },
  }));
}

export function usePopularBooks() {
  const queries = useQueries({
    queries: GENRES.map((genre) => ({
      queryKey: ['popular', genre.topic],
      queryFn: async (): Promise<GenreBooks | null> => {
        const response = await axios.get(
          `https://gutendex.com/books?topic=${genre.topic}&sort=popular`,
          { timeout: 15000 }
        );
        const books = parseGutenbergBooks(response.data);
        if (books.length === 0) return null;
        return { genre: genre.name, books };
      },
      staleTime: 60 * 60 * 1000,
      retry: 1,
    })),
  });

  const genreBooks: GenreBooks[] = queries
    .map((q) => q.data)
    .filter((d): d is GenreBooks => d != null);

  const isLoading = queries.some((q) => q.isPending);

  return { genreBooks, isLoading };
}
