import { useRef, useEffect, useCallback } from 'react';
import { PageFlipComponent, type PageFlipHandle } from './PageFlip';
import { ReaderControls } from './ReaderControls';
import { Spinner } from '../common';
import { useBookStore } from '../../store';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import type { PageContent } from '../../types';

interface BookReaderProps {
  pages: PageContent[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export function BookReader({ pages, isLoading, error, onClose }: BookReaderProps) {
  const pageFlipRef = useRef<PageFlipHandle>(null);

  const { currentPage, settings, setCurrentPage, updateSettings, setTotalPages } = useBookStore();

  // Sync totalPages with actual pages array
  useEffect(() => {
    if (pages.length > 0) {
      setTotalPages(pages.length);
    }
  }, [pages.length, setTotalPages]);

  const totalPages = pages.length;

  const {
    bookmarks,
    addBookmark,
    removeBookmark,
    goToBookmark,
  } = useReadingProgress();

  const handleNextPage = useCallback(() => {
    pageFlipRef.current?.flipNext();
  }, []);

  const handlePrevPage = useCallback(() => {
    pageFlipRef.current?.flipPrev();
  }, []);

  const handleGoToPage = useCallback((page: number) => {
    pageFlipRef.current?.flipTo(page);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, [setCurrentPage]);

  const handleGoToBookmark = useCallback((bookmark: { page: number }) => {
    handleGoToPage(bookmark.page);
    goToBookmark(bookmark as Parameters<typeof goToBookmark>[0]);
  }, [handleGoToPage, goToBookmark]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage, onClose]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-400">Loading book...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
        <div className="text-center max-w-md px-4">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-slate-400">No content available</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900">
      <div className="relative w-full h-full">
        <PageFlipComponent
          ref={pageFlipRef}
          pages={pages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          mode={settings.mode}
          fontSize={settings.fontSize}
          fontFamily={settings.fontFamily}
          lineHeight={settings.lineHeight}
        />

        <ReaderControls
          currentPage={currentPage}
          totalPages={totalPages}
          settings={settings}
          bookmarks={bookmarks}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          onGoToPage={handleGoToPage}
          onSettingsChange={updateSettings}
          onAddBookmark={addBookmark}
          onRemoveBookmark={removeBookmark}
          onGoToBookmark={handleGoToBookmark}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
