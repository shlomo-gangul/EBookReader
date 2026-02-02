import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Upload, Library, Menu, X, TrendingUp } from 'lucide-react';
import { SearchBar, BookGrid, BookCard } from './components/Library';
import { FlipBookReader } from './components/Reader';
import { BookDetails } from './components/BookDetails';
import { PdfUploader } from './components/Upload';
import { useLibrary } from './hooks/useLibrary';
import { useBookReader } from './hooks/useBookReader';
import { usePopularBooks } from './hooks/usePopularBooks';
import { useReadingProgress } from './hooks/useReadingProgress';
import { useBookStore } from './store';
import { Spinner } from './components/common';
import type { Book } from './types';

// Helper to save/load book from localStorage
const BOOK_STORAGE_KEY = 'current_book';

function saveBookToStorage(book: Book) {
  localStorage.setItem(BOOK_STORAGE_KEY, JSON.stringify(book));
}

function loadBookFromStorage(): Book | null {
  try {
    const stored = localStorage.getItem(BOOK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Reader Page Component
function ReaderPage() {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const { settings, updateSettings, currentPage, setCurrentPage } = useBookStore();
  const { loadBook, pages, isLoading: bookLoading, error } = useBookReader();
  const { bookmarks, addBookmark, removeBookmark } = useReadingProgress();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initReader = async () => {
      if (initialized) return;

      const storedBook = loadBookFromStorage();
      if (storedBook && storedBook.id === bookId) {
        await loadBook(storedBook);
      } else {
        // No matching book found, go back to home
        navigate('/');
        return;
      }
      setInitialized(true);
    };

    initReader();
  }, [bookId, loadBook, navigate, initialized]);

  const handleClose = useCallback(() => {
    const storedBook = loadBookFromStorage();
    if (storedBook) {
      navigate(`/book/${storedBook.id}`);
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (bookLoading || !initialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-400">Loading book...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-400">Loading pages...</p>
        </div>
      </div>
    );
  }

  return (
    <FlipBookReader
      pages={pages}
      currentPage={currentPage}
      totalPages={pages.length}
      settings={settings}
      bookmarks={bookmarks}
      onPageChange={setCurrentPage}
      onSettingsChange={updateSettings}
      onAddBookmark={() => addBookmark()}
      onRemoveBookmark={removeBookmark}
      onClose={handleClose}
    />
  );
}

// Book Details Page Component
function BookDetailsPage() {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    const storedBook = loadBookFromStorage();
    if (storedBook && storedBook.id === bookId) {
      setBook(storedBook);
    } else {
      navigate('/');
    }
  }, [bookId, navigate]);

  const handleStartReading = useCallback(() => {
    if (book) {
      navigate(`/read/${book.id}`);
    }
  }, [book, navigate]);

  const handleBookClick = useCallback((clickedBook: Book) => {
    saveBookToStorage(clickedBook);
    navigate(`/book/${clickedBook.id}`);
  }, [navigate]);

  if (!book) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <BookDetails
      book={book}
      onBack={() => navigate('/')}
      onStartReading={handleStartReading}
      onBookClick={handleBookClick}
    />
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const { recentBooks } = useBookStore();
  const { books, isLoading, hasMore, search, loadMore, clearSearch } = useLibrary();
  const { loadPdfFile, isLoading: bookLoading } = useBookReader();
  const { genreBooks, isLoading: genresLoading } = usePopularBooks();

  const handleBookClick = useCallback((book: Book) => {
    saveBookToStorage(book);
    navigate(`/book/${book.id}`);
  }, [navigate]);

  const handlePdfUpload = useCallback(async (file: File) => {
    await loadPdfFile(file);
    setShowUploader(false);
    // For PDF, create a temporary book object
    const pdfBook: Book = {
      id: `pdf-${Date.now()}`,
      title: file.name.replace('.pdf', ''),
      authors: [],
      source: 'pdf',
    };
    saveBookToStorage(pdfBook);
    navigate(`/read/${pdfBook.id}`);
  }, [loadPdfFile, navigate]);

  // Show Library (default view)
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

        {/* Popular Books by Genre */}
        {books.length === 0 && !isLoading && (
          <>
            {genresLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              genreBooks.map((genre) => (
                <section key={genre.genre} className="mb-12">
                  <h3 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    Popular in {genre.genre}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {genre.books.map((book) => (
                      <BookCard key={book.id} book={book} onClick={handleBookClick} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
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
      <Route path="/book/:bookId" element={<BookDetailsPage />} />
      <Route path="/read/:bookId" element={<ReaderPage />} />
    </Routes>
  );
}

export default App;
