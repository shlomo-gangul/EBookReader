import React from 'react';
import { Book as BookIcon, User } from 'lucide-react';
import type { Book } from '../../types';

interface BookCardProps {
  book: Book;
  onClick: (book: Book) => void;
}

export function BookCard({ book, onClick }: BookCardProps) {
  const handleClick = () => onClick(book);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(book);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-slate-700">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookIcon className="w-16 h-16 text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-100 line-clamp-2 mb-1 group-hover:text-blue-400 transition-colors">
          {book.title}
        </h3>
        <div className="flex items-center text-sm text-slate-400">
          <User className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="line-clamp-1">
            {book.authors.map((a) => a.name).join(', ') || 'Unknown Author'}
          </span>
        </div>
        {book.publishDate && (
          <p className="text-xs text-slate-500 mt-1">{book.publishDate}</p>
        )}
        <div className="mt-2">
          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
            book.source === 'gutenberg'
              ? 'bg-green-900/50 text-green-400'
              : book.source === 'openlibrary'
              ? 'bg-blue-900/50 text-blue-400'
              : 'bg-purple-900/50 text-purple-400'
          }`}>
            {book.source === 'gutenberg' ? 'Gutenberg' : book.source === 'openlibrary' ? 'Open Library' : 'PDF'}
          </span>
        </div>
      </div>
    </div>
  );
}
