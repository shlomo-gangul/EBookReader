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
const REQUEST_DELAY = 500; // 500ms between requests to avoid rate limiting

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      const results: GenreBooks[] = [];

      // Stagger requests to avoid rate limiting
      for (const genre of GENRES) {
        try {
          const response = await axios.get(
            `https://gutendex.com/books?topic=${genre.topic}&sort=popular`,
            { timeout: 30000 }
          );

          const books: Book[] = response.data.results.slice(0, 6).map((book: {
            id: number;
            title: string;
            authors: { name: string }[];
            subjects: string[];
            languages: string[];
            formats: Record<string, string>;
          }) => ({
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

          if (books.length > 0) {
            results.push({ genre: genre.name, books });
            // Update UI progressively as genres load
            setGenreBooks([...results]);
          }

          // Delay between requests to be nice to the API
          await delay(REQUEST_DELAY);
        } catch (error) {
          console.error(`Failed to fetch ${genre.name} books:`, error);
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
