import { useState, useEffect } from 'react';
import axios from 'axios';
import type { Book } from '../types';

interface GenreBooks {
  genre: string;
  books: Book[];
}

interface CachedData {
  genreBooks: GenreBooks[];
  timestamp: number;
}

const GENRES = [
  { name: 'Fiction', topic: 'fiction' },
  { name: 'Science Fiction', topic: 'science fiction' },
  { name: 'Romance', topic: 'romance' },
  { name: 'Mystery', topic: 'mystery' },
  { name: 'Adventure', topic: 'adventure' },
  { name: 'History', topic: 'history' },
];

const CACHE_KEY = 'popular_books_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

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
  const [genreBooks, setGenreBooks] = useState<GenreBooks[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPopularBooks = async () => {
      // Check cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const data: CachedData = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_DURATION) {
            setGenreBooks(data.genreBooks);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Cache read failed, continue to fetch
      }

      setIsLoading(true);

      // Fetch all genres in parallel for faster loading
      const promises = GENRES.map(async (genre) => {
        try {
          const response = await axios.get(
            `https://gutendex.com/books?topic=${genre.topic}&sort=popular`,
            { timeout: 15000 }
          );
          const books = parseGutenbergBooks(response.data);
          if (books.length > 0) {
            return { genre: genre.name, books };
          }
        } catch (error) {
          console.error(`Failed to fetch ${genre.name} books:`, error);
        }
        return null;
      });

      const settled = await Promise.allSettled(promises);
      const results: GenreBooks[] = [];

      for (const result of settled) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
          // Update UI progressively as results come in
          setGenreBooks([...results]);
        }
      }

      // Cache the results
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          genreBooks: results,
          timestamp: Date.now(),
        }));
      } catch {
        // Cache write failed, not critical
      }

      setGenreBooks(results);
      setIsLoading(false);
    };

    fetchPopularBooks();
  }, []);

  return { genreBooks, isLoading };
}
