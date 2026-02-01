import { useState, useEffect } from 'react';
import {
  BookOpen,
  User,
  Calendar,
  Tag,
  ExternalLink,
  ArrowLeft,
  Play
} from 'lucide-react';
import { BookCard } from '../Library/BookCard';
import { Spinner } from '../common';
import type { Book } from '../../types';
import axios from 'axios';

interface BookDetailsProps {
  book: Book;
  onBack: () => void;
  onStartReading: () => void;
  onBookClick: (book: Book) => void;
}

export function BookDetails({ book, onBack, onStartReading, onBookClick }: BookDetailsProps) {
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(true);

  useEffect(() => {
    const fetchRelatedBooks = async () => {
      setIsLoadingRelated(true);
      try {
        // Get related books from the same genre/subject
        const subject = book.subjects?.[0] || 'fiction';
        const response = await axios.get(
          `https://gutendex.com/books?topic=${encodeURIComponent(subject)}`,
          { timeout: 10000 }
        );

        const books: Book[] = response.data.results
          .filter((b: { id: number }) => b.id.toString() !== book.id)
          .slice(0, 6)
          .map((b: {
            id: number;
            title: string;
            authors: { name: string }[];
            subjects: string[];
            languages: string[];
            formats: Record<string, string>;
          }) => ({
            id: b.id.toString(),
            title: b.title,
            authors: b.authors.map((a) => ({ name: a.name })),
            coverUrl: `https://www.gutenberg.org/cache/epub/${b.id}/pg${b.id}.cover.medium.jpg`,
            subjects: b.subjects?.slice(0, 3),
            language: b.languages?.[0],
            source: 'gutenberg' as const,
          }));

        setRelatedBooks(books);
      } catch (error) {
        console.error('Failed to fetch related books:', error);
      } finally {
        setIsLoadingRelated(false);
      }
    };

    fetchRelatedBooks();
  }, [book.id, book.subjects]);

  const sourceLabel = book.source === 'gutenberg'
    ? 'Project Gutenberg'
    : book.source === 'openlibrary'
    ? 'Open Library'
    : 'PDF Upload';

  const sourceUrl = book.source === 'gutenberg'
    ? `https://www.gutenberg.org/ebooks/${book.id}`
    : book.source === 'openlibrary'
    ? `https://openlibrary.org/works/${book.id}`
    : null;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Library
          </button>
        </div>
      </div>

      {/* Book Info */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover */}
          <div className="flex-shrink-0">
            <div className="w-48 md:w-64 mx-auto md:mx-0">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={`Cover of ${book.title}`}
                  className="w-full rounded-lg shadow-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-slate-800 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-slate-600" />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
              {book.title}
            </h1>

            {/* Author */}
            <div className="flex items-center gap-2 text-slate-300 mb-4">
              <User className="w-5 h-5 text-slate-500" />
              <span className="text-lg">
                {book.authors.map((a) => a.name).join(', ') || 'Unknown Author'}
              </span>
            </div>

            {/* Publish Date */}
            {book.publishDate && (
              <div className="flex items-center gap-2 text-slate-400 mb-4">
                <Calendar className="w-5 h-5 text-slate-500" />
                <span>{book.publishDate}</span>
              </div>
            )}

            {/* Source */}
            <div className="flex items-center gap-2 text-slate-400 mb-4">
              <ExternalLink className="w-5 h-5 text-slate-500" />
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  {sourceLabel}
                </a>
              ) : (
                <span>{sourceLabel}</span>
              )}
            </div>

            {/* Genres/Subjects */}
            {book.subjects && book.subjects.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Tag className="w-5 h-5 text-slate-500" />
                  <span>Genres</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {book.subjects.map((subject, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-sm"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {book.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-2">Summary</h3>
                <p className="text-slate-400 leading-relaxed">{book.description}</p>
              </div>
            )}

            {/* Start Reading Button */}
            <button
              onClick={onStartReading}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl transition-colors shadow-lg hover:shadow-xl"
            >
              <Play className="w-6 h-6" />
              Start Reading
            </button>
          </div>
        </div>

        {/* Related Books */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">More Like This</h2>
          {isLoadingRelated ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : relatedBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {relatedBooks.map((relatedBook) => (
                <BookCard
                  key={relatedBook.id}
                  book={relatedBook}
                  onClick={onBookClick}
                />
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No related books found</p>
          )}
        </div>
      </div>
    </div>
  );
}
