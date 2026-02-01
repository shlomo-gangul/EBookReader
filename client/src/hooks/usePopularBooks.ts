import { useState, useEffect } from 'react';
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

export function usePopularBooks() {
  const [genreBooks, setGenreBooks] = useState<GenreBooks[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPopularBooks = async () => {
      setIsLoading(true);
      const results: GenreBooks[] = [];

      for (const genre of GENRES) {
        try {
          const response = await axios.get(
            `https://gutendex.com/books?topic=${genre.topic}&sort=popular`,
            { timeout: 10000 }
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
          }
        } catch (error) {
          console.error(`Failed to fetch ${genre.name} books:`, error);
        }
      }

      setGenreBooks(results);
      setIsLoading(false);
    };

    fetchPopularBooks();
  }, []);

  return { genreBooks, isLoading };
}
