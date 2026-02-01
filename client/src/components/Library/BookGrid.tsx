import React from 'react';
import { BookCard } from './BookCard';
import { Spinner } from '../common';
import type { Book } from '../../types';

interface BookGridProps {
  books: Book[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onBookClick: (book: Book) => void;
  emptyMessage?: string;
}

export function BookGrid({
  books,
  isLoading,
  hasMore,
  onLoadMore,
  onBookClick,
  emptyMessage = 'No books found',
}: BookGridProps) {
  if (!isLoading && books.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {books.map((book) => (
          <BookCard key={book.id} book={book} onClick={onBookClick} />
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && hasMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
