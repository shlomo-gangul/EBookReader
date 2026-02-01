import { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { BookOpen, Upload, Library, Menu, X } from 'lucide-react';
import { SearchBar, BookGrid } from './components/Library';
import { BookReader } from './components/Reader';
import { PdfUploader } from './components/Upload';
import { useLibrary } from './hooks/useLibrary';
import { useBookReader } from './hooks/useBookReader';
import { useBookStore } from './store';
import type { Book } from './types';

function HomePage() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { recentBooks } = useBookStore();
  const { books, isLoading, hasMore, search, loadMore, clearSearch } = useLibrary();
  const { loadBook, loadPdfFile, pages, isLoading: bookLoading, error } = useBookReader();
  const [showReader, setShowReader] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const handleBookClick = useCallback(async (book: Book) => {
    await loadBook(book);
    setShowReader(true);
  }, [loadBook]);

  const handlePdfUpload = useCallback(async (file: File) => {
    await loadPdfFile(file);
    setShowUploader(false);
    setShowReader(true);
  }, [loadPdfFile]);

  const handleCloseReader = useCallback(() => {
    setShowReader(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold text-slate-100">BookReader</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4">
              <button
                onClick={() => setShowUploader(true)}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload PDF
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-slate-300 hover:text-slate-100"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <nav className="md:hidden mt-4 pb-2 border-t border-slate-800 pt-4">
              <button
                onClick={() => {
                  setShowUploader(true);
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload PDF
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Section */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
              Discover Your Next Read
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Search millions of free books from Open Library and Project Gutenberg,
              or upload your own PDFs for a beautiful reading experience.
            </p>
          </div>
          <SearchBar onSearch={search} onClear={clearSearch} isLoading={isLoading} />
        </section>

        {/* Search Results */}
        {books.length > 0 && (
          <section className="mb-12">
            <h3 className="text-xl font-semibold text-slate-100 mb-6">Search Results</h3>
            <BookGrid
              books={books}
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onBookClick={handleBookClick}
            />
          </section>
        )}

        {/* Recent Books */}
        {books.length === 0 && recentBooks.length > 0 && (
          <section className="mb-12">
            <h3 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
              <Library className="w-5 h-5" />
              Continue Reading
            </h3>
            <BookGrid
              books={recentBooks}
              isLoading={false}
              hasMore={false}
              onLoadMore={() => {}}
              onBookClick={handleBookClick}
              emptyMessage="No recent books"
            />
          </section>
        )}

        {/* Empty State */}
        {books.length === 0 && recentBooks.length === 0 && !isLoading && (
          <section className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              Start Your Reading Journey
            </h3>
            <p className="text-slate-500 mb-6">
              Search for a book above or upload a PDF to begin
            </p>
            <button
              onClick={() => setShowUploader(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload a PDF
            </button>
          </section>
        )}
      </main>

      {/* PDF Uploader Modal */}
      {showUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-xl shadow-2xl max-w-xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-100">Upload PDF</h2>
              <button
                onClick={() => setShowUploader(false)}
                className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <PdfUploader onUpload={handlePdfUpload} isLoading={bookLoading} />
          </div>
        </div>
      )}

      {/* Book Reader */}
      {showReader && (
        <BookReader
          pages={pages}
          isLoading={bookLoading}
          error={error}
          onClose={handleCloseReader}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>
            Books provided by{' '}
            <a
              href="https://openlibrary.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              Open Library
            </a>{' '}
            and{' '}
            <a
              href="https://www.gutenberg.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              Project Gutenberg
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}

export default App;
