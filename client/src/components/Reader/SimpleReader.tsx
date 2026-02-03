import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Bookmark,
  Sun,
  Moon,
  BookOpen,
  X,
  Plus,
  Minus,
  Type,
} from 'lucide-react';
import { Modal } from '../common';
import type { PageContent, ReadingMode, ReaderSettings, Bookmark as BookmarkType, FontFamily } from '../../types';
import './PageFlipAnimation.css';

// Font family mappings
const fontFamilies: Record<FontFamily, { name: string; css: string }> = {
  serif: { name: 'Merriweather', css: 'Merriweather, Georgia, serif' },
  sans: { name: 'Inter', css: 'Inter, system-ui, sans-serif' },
  georgia: { name: 'Georgia', css: 'Georgia, Times New Roman, serif' },
  literata: { name: 'Literata', css: 'Literata, Georgia, serif' },
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

interface SimpleReaderProps {
  pages: PageContent[];
  currentPage: number;
  totalPages: number;
  settings: ReaderSettings;
  bookmarks: BookmarkType[];
  onPageChange: (page: number) => void;
  onSettingsChange: (settings: Partial<ReaderSettings>) => void;
  onAddBookmark: () => void;
  onRemoveBookmark: (id: string) => void;
  onClose: () => void;
}

const modeStyles: Record<ReadingMode, { bg: string; text: string; pageBg: string; pageBgHex: string }> = {
  day: {
    bg: 'bg-gray-100',
    text: 'text-gray-900',
    pageBg: 'bg-white',
    pageBgHex: '#ffffff',
  },
  night: {
    bg: 'bg-slate-900',
    text: 'text-slate-200',
    pageBg: 'bg-slate-800',
    pageBgHex: '#1e293b',
  },
  sepia: {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    pageBg: 'bg-amber-100',
    pageBgHex: '#fef3c7',
  },
};

export function SimpleReader({
  pages,
  currentPage,
  totalPages,
  settings,
  bookmarks,
  onPageChange,
  onSettingsChange,
  onAddBookmark,
  onRemoveBookmark,
  onClose,
}: SimpleReaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isWideScreen, setIsWideScreen] = useState(window.innerWidth >= 900);
  const [localFontSize, setLocalFontSize] = useState(settings.fontSize);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [hoverNext, setHoverNext] = useState(false);
  const [hoverPrev, setHoverPrev] = useState(false);
  const debouncedFontSize = useDebounce(localFontSize, 150);

  const styles = modeStyles[settings.mode];
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const isBookmarked = bookmarks.some((b) => b.page === currentPage);

  // Sync debounced font size to settings
  useEffect(() => {
    if (debouncedFontSize !== settings.fontSize) {
      onSettingsChange({ fontSize: debouncedFontSize });
    }
  }, [debouncedFontSize, settings.fontSize, onSettingsChange]);

  // Sync local font size when settings change externally
  useEffect(() => {
    setLocalFontSize(settings.fontSize);
  }, [settings.fontSize]);

  // Check for wide screen
  useEffect(() => {
    const handleResize = () => setIsWideScreen(window.innerWidth >= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, isFlipping]);

  const getPageIncrement = () => (isWideScreen ? 2 : 1);

  const handleNext = useCallback(() => {
    if (isFlipping || currentPage >= totalPages) return;

    setFlipDirection('next');
    setIsFlipping(true);
    setHoverNext(false);

    setTimeout(() => {
      const increment = getPageIncrement();
      const newPage = Math.min(currentPage + increment, totalPages);
      onPageChange(newPage);
      setIsFlipping(false);
      setFlipDirection(null);
    }, 500);
  }, [currentPage, totalPages, isWideScreen, onPageChange, isFlipping]);

  const handlePrev = useCallback(() => {
    if (isFlipping || currentPage <= 1) return;

    setFlipDirection('prev');
    setIsFlipping(true);
    setHoverPrev(false);

    setTimeout(() => {
      const decrement = getPageIncrement();
      const newPage = Math.max(currentPage - decrement, 1);
      onPageChange(newPage);
      setIsFlipping(false);
      setFlipDirection(null);
    }, 500);
  }, [currentPage, isWideScreen, onPageChange, isFlipping]);

  // Get page content by index
  const getPage = (pageNum: number): PageContent | null => {
    if (pageNum < 1 || pageNum > totalPages) return null;
    return pages[pageNum - 1] || null;
  };

  // Current visible pages
  const leftPage = getPage(currentPage);
  const rightPage = isWideScreen ? getPage(currentPage + 1) : null;

  // Next/prev pages for flip animation
  const nextLeftPage = getPage(currentPage + getPageIncrement());
  const prevLeftPage = getPage(currentPage - getPageIncrement());
  const prevRightPage = isWideScreen ? getPage(currentPage - getPageIncrement() + 1) : null;

  // Render page content
  const renderPageContent = (page: PageContent | null, showPageNum?: number) => {
    if (!page) {
      return showPageNum ? (
        <div className="flex items-center justify-center h-full text-slate-400">
          Page {showPageNum}
        </div>
      ) : null;
    }

    return page.content ? (
      <div className="whitespace-pre-wrap">{page.content}</div>
    ) : (
      <div className="flex items-center justify-center h-full text-slate-400">
        Page {page.pageNumber}
      </div>
    );
  };

  const contentStyle = {
    fontSize: `${localFontSize}px`,
    fontFamily: fontFamilies[settings.fontFamily].css,
    lineHeight: settings.lineHeight,
  };

  const modeButtons: { mode: ReadingMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'day', icon: <Sun className="w-4 h-4" />, label: 'Day' },
    { mode: 'night', icon: <Moon className="w-4 h-4" />, label: 'Night' },
    { mode: 'sepia', icon: <BookOpen className="w-4 h-4" />, label: 'Sepia' },
  ];

  return (
    <div className={`fixed inset-0 z-50 ${styles.bg} flex flex-col`}>
      {/* Top Bar */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black/20">
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <Home className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddBookmark}
            className={`p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors ${
              isBookmarked ? 'text-yellow-400' : 'text-white'
            }`}
          >
            <Bookmark className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setShowBookmarks(true)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <span className="text-sm">{bookmarks.length}</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Area - Book */}
      <div className="flex-1 flex items-stretch px-4 md:px-8 py-4 overflow-hidden relative book-container">
        <div className={`book-pages h-full w-full relative ${!isWideScreen ? 'single-page-mode' : ''}`}>

          {/* Two-page mode */}
          {isWideScreen ? (
            <>
              {/* Left Page (static) */}
              <div
                className={`page-card ${styles.pageBg} rounded-l-lg shadow-2xl flex flex-col relative`}
                style={{ zIndex: 1 }}
              >
                <div className="page-shadow-right" />
                <div className={`flex-1 px-8 md:px-12 lg:px-16 py-6 overflow-auto ${styles.text}`} style={contentStyle}>
                  {renderPageContent(leftPage)}
                </div>
                <div className={`flex items-center justify-between px-4 py-2 border-t border-current/10 ${styles.text}`}>
                  <button
                    onClick={handlePrev}
                    onMouseEnter={() => !isFlipping && currentPage > 1 && setHoverPrev(true)}
                    onMouseLeave={() => setHoverPrev(false)}
                    disabled={currentPage <= 1 || isFlipping}
                    className={`nav-button flex items-center gap-1 text-sm transition-all ${
                      hoverPrev ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'
                    } disabled:opacity-20`}
                  >
                    <ChevronLeft className={`w-4 h-4 transition-transform ${hoverPrev ? '-translate-x-1' : ''}`} />
                    <span>Prev</span>
                  </button>
                  <span className="text-xs opacity-50">{leftPage?.pageNumber}</span>
                  <div />
                </div>
              </div>

              {/* Right Page (static) */}
              <div
                className={`page-card ${styles.pageBg} rounded-r-lg shadow-2xl flex flex-col relative`}
                style={{ zIndex: 1 }}
              >
                <div className="page-shadow-left" />
                <div className={`flex-1 px-8 md:px-12 lg:px-16 py-6 overflow-auto ${styles.text}`} style={contentStyle}>
                  {renderPageContent(rightPage)}
                </div>
                <div className={`flex items-center justify-between px-4 py-2 border-t border-current/10 ${styles.text}`}>
                  <div />
                  <span className="text-xs opacity-50">{rightPage?.pageNumber}</span>
                  <button
                    onClick={handleNext}
                    onMouseEnter={() => !isFlipping && currentPage < totalPages && setHoverNext(true)}
                    onMouseLeave={() => setHoverNext(false)}
                    disabled={currentPage >= totalPages || isFlipping}
                    className={`nav-button flex items-center gap-1 text-sm transition-all ${
                      hoverNext ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'
                    } disabled:opacity-20`}
                  >
                    <span>Next</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${hoverNext ? 'translate-x-1' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Spine shadow */}
              <div className="spine-shadow" />
            </>
          ) : (
            /* Single page mode */
            <>
              <div
                className={`page-card ${styles.pageBg} rounded-lg shadow-2xl flex flex-col relative w-full`}
                style={{ zIndex: 1 }}
              >
                <div className="page-shadow-left" />
                <div className="page-shadow-right" />
                <div className={`flex-1 px-6 md:px-10 py-6 overflow-auto ${styles.text}`} style={contentStyle}>
                  {renderPageContent(leftPage)}
                </div>
                <div className={`flex items-center justify-between px-4 py-2 border-t border-current/10 ${styles.text}`}>
                  <button
                    onClick={handlePrev}
                    onMouseEnter={() => !isFlipping && currentPage > 1 && setHoverPrev(true)}
                    onMouseLeave={() => setHoverPrev(false)}
                    disabled={currentPage <= 1 || isFlipping}
                    className={`nav-button flex items-center gap-1 text-sm transition-all ${
                      hoverPrev ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'
                    } disabled:opacity-20`}
                  >
                    <ChevronLeft className={`w-4 h-4 transition-transform ${hoverPrev ? '-translate-x-1' : ''}`} />
                    <span>Prev</span>
                  </button>
                  <span className="text-xs opacity-50">{leftPage?.pageNumber}</span>
                  <button
                    onClick={handleNext}
                    onMouseEnter={() => !isFlipping && currentPage < totalPages && setHoverNext(true)}
                    onMouseLeave={() => setHoverNext(false)}
                    disabled={currentPage >= totalPages || isFlipping}
                    className={`nav-button flex items-center gap-1 text-sm transition-all ${
                      hoverNext ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'
                    } disabled:opacity-20`}
                  >
                    <span>Next</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${hoverNext ? 'translate-x-1' : ''}`} />
                  </button>
                </div>
              </div>

            </>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex-shrink-0 p-4 bg-black/20">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/20 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-white text-sm whitespace-nowrap">
            Page {currentPage} of {totalPages}
          </span>

          {/* Font Size Slider */}
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Type className="w-4 h-4 text-white/70" />
            <input
              type="range"
              min={12}
              max={24}
              value={localFontSize}
              onChange={(e) => setLocalFontSize(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-500
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110"
            />
            <span className="text-white/70 text-xs w-8">{localFontSize}px</span>
          </div>

          <span className="text-white text-sm whitespace-nowrap">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Page Flip Overlay - Fixed position above everything */}
      {flipDirection === 'next' && (
        <div className={`flipping-page-container ${!isWideScreen ? 'single-page-mode' : ''}`}>
          <div className="flipping-page from-right flipping">
            <div className="flip-page-front" style={{ backgroundColor: styles.pageBgHex }}>
              <div className={`h-full px-8 md:px-12 lg:px-16 py-6 overflow-hidden ${styles.text}`} style={contentStyle}>
                {renderPageContent(isWideScreen ? rightPage : leftPage)}
              </div>
            </div>
            <div className="flip-page-back" style={{ backgroundColor: styles.pageBgHex }}>
              <div className={`h-full px-8 md:px-12 lg:px-16 py-6 overflow-hidden ${styles.text}`} style={contentStyle}>
                {renderPageContent(nextLeftPage)}
              </div>
            </div>
            <div className="flip-shadow" />
          </div>
        </div>
      )}

      {flipDirection === 'prev' && (
        <div className={`flipping-page-container ${!isWideScreen ? 'single-page-mode' : ''}`}>
          <div className="flipping-page from-left flipping">
            <div className="flip-page-front" style={{ backgroundColor: styles.pageBgHex }}>
              <div className={`h-full px-8 md:px-12 lg:px-16 py-6 overflow-hidden ${styles.text}`} style={contentStyle}>
                {renderPageContent(leftPage)}
              </div>
            </div>
            <div className="flip-page-back" style={{ backgroundColor: styles.pageBgHex }}>
              <div className={`h-full px-8 md:px-12 lg:px-16 py-6 overflow-hidden ${styles.text}`} style={contentStyle}>
                {renderPageContent(isWideScreen ? prevRightPage : prevLeftPage)}
              </div>
            </div>
            <div className="flip-shadow" />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Reader Settings">
        <div className="space-y-6">
          {/* Reading Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reading Mode
            </label>
            <div className="flex gap-2">
              {modeButtons.map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => onSettingsChange({ mode })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                    settings.mode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {icon}
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Size: {settings.fontSize}px
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onSettingsChange({ fontSize: Math.max(12, settings.fontSize - 2) })}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={12}
                max={28}
                value={settings.fontSize}
                onChange={(e) => onSettingsChange({ fontSize: parseInt(e.target.value, 10) })}
                className="flex-1"
              />
              <button
                onClick={() => onSettingsChange({ fontSize: Math.min(28, settings.fontSize + 2) })}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Family
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(fontFamilies) as FontFamily[]).map((font) => (
                <button
                  key={font}
                  onClick={() => onSettingsChange({ fontFamily: font })}
                  className={`py-2 px-3 rounded-lg transition-colors ${
                    settings.fontFamily === font
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  style={{ fontFamily: fontFamilies[font].css }}
                >
                  {fontFamilies[font].name}
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Line Height: {settings.lineHeight}
            </label>
            <input
              type="range"
              min={1.2}
              max={2.4}
              step={0.1}
              value={settings.lineHeight}
              onChange={(e) => onSettingsChange({ lineHeight: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </Modal>

      {/* Bookmarks Modal */}
      <Modal
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        title="Bookmarks"
      >
        {bookmarks.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No bookmarks yet</p>
        ) : (
          <ul className="space-y-2">
            {bookmarks.map((bookmark) => (
              <li
                key={bookmark.id}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
              >
                <button
                  onClick={() => {
                    onPageChange(bookmark.page);
                    setShowBookmarks(false);
                  }}
                  className="flex-1 text-left"
                >
                  <span className="text-slate-100">Page {bookmark.page}</span>
                  {bookmark.note && (
                    <p className="text-sm text-slate-400 mt-1">{bookmark.note}</p>
                  )}
                </button>
                <button
                  onClick={() => onRemoveBookmark(bookmark.id)}
                  className="p-1 hover:bg-slate-600 rounded"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
