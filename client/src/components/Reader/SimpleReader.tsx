import { useState, useEffect, useCallback, useRef } from 'react';
import { useDrag } from '@use-gesture/react';
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
  Play,
  Pause,
  Square,
  Search,
  Highlighter,
  Trash2,
  Timer,
} from 'lucide-react';
import { Modal } from '../common';
import { hapticPageTurn } from '../../utils/native';
import { renderWithHighlights } from '../../utils/highlightText';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { useBookSearch } from '../../hooks/useBookSearch';
import { useHighlights } from '../../hooks/useHighlights';
import { useReadingTimer } from '../../hooks/useReadingTimer';
import { useDictionary } from '../../hooks/useDictionary';
import { DictionaryPopup } from './DictionaryPopup';
import type { PageContent, ReadingMode, ReaderSettings, Bookmark as BookmarkType, FontFamily } from '../../types';
import './PageFlipAnimation.css';

// Font family mappings
const fontFamilies: Record<FontFamily, { name: string; css: string }> = {
  serif: { name: 'Merriweather', css: 'Merriweather, Georgia, serif' },
  sans: { name: 'Inter', css: 'Inter, system-ui, sans-serif' },
  georgia: { name: 'Georgia', css: 'Georgia, Times New Roman, serif' },
  literata: { name: 'Literata', css: 'Literata, Georgia, serif' },
  opendyslexic: { name: 'OpenDyslexic', css: 'OpenDyslexic, sans-serif' },
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

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bae6fd' },
  { label: 'Pink', value: '#fbcfe8' },
];

interface SimpleReaderProps {
  pages: PageContent[];
  currentPage: number;
  totalPages: number;
  settings: ReaderSettings;
  bookmarks: BookmarkType[];
  bookId?: string;
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

interface SelectionInfo {
  startChar: number;
  endChar: number;
  x: number;
  y: number;
  pageNumber: number;
}

export function SimpleReader({
  pages,
  currentPage,
  totalPages,
  settings,
  bookmarks,
  bookId,
  onPageChange,
  onSettingsChange,
  onAddBookmark,
  onRemoveBookmark,
  onClose,
}: SimpleReaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);
  const [isWideScreen, setIsWideScreen] = useState(window.innerWidth >= 900);
  const [localFontSize, setLocalFontSize] = useState(settings.fontSize);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [hoverNext, setHoverNext] = useState(false);
  const [hoverPrev, setHoverPrev] = useState(false);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null);
  const debouncedFontSize = useDebounce(localFontSize, 150);

  const styles = modeStyles[settings.mode];
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const isBookmarked = bookmarks.some((b) => b.page === currentPage);

  // TTS
  const tts = useTextToSpeech();
  // Search
  const bookSearch = useBookSearch();
  // Highlights
  const { highlights, addHighlight, removeHighlight, updateNote, highlightsForPage } = useHighlights(bookId ?? null);
  // Reading Timer
  const timer = useReadingTimer();
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const TIMER_OPTIONS = [0, 5, 10, 15, 30, 60];
  // Dictionary
  const dict = useDictionary();

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

  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (bookSearch.isOpen || showSettings || showBookmarks) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        if (bookSearch.isOpen) bookSearch.closeSearch();
        else if (selection) setSelection(null);
        else onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        bookSearch.openSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, isFlipping, bookSearch.isOpen, showSettings, showBookmarks, selection]);

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

  // Auto-advance TTS to next page when utterance ends
  const handleTTSPlay = useCallback(() => {
    const page = pages[currentPage - 1];
    if (!page?.content) return;
    tts.play(page.content, () => {
      if (currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
    });
  }, [tts, pages, currentPage, totalPages, onPageChange]);

  // Swipe gesture via @use-gesture/react
  const SWIPE_THRESHOLD = 60;
  const VELOCITY_THRESHOLD = 0.3;
  const RUBBER_BAND_FACTOR = 0.3;

  const bindDrag = useDrag(
    ({ active, movement: [mx], velocity: [vx], direction: [dx], cancel }) => {
      if (isFlipping) {
        cancel();
        return;
      }

      if (active) {
        const atStart = currentPage <= 1 && mx > 0;
        const atEnd = currentPage >= totalPages && mx < 0;
        const effectiveMx = (atStart || atEnd) ? mx * RUBBER_BAND_FACTOR : mx;
        setDragX(effectiveMx);
        setIsDragging(true);
      } else {
        setIsDragging(false);
        const absVx = Math.abs(vx);
        const absMx = Math.abs(mx);

        const triggered =
          (absVx > VELOCITY_THRESHOLD && absMx > 20) || absMx > SWIPE_THRESHOLD;

        if (triggered) {
          if (dx < 0 && currentPage < totalPages) {
            hapticPageTurn();
            handleNext();
          } else if (dx > 0 && currentPage > 1) {
            hapticPageTurn();
            handlePrev();
          }
        }
        setDragX(0);
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  // Text selection for highlighting
  const handleMouseUp = useCallback((pageNum: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

    // Find the page content container
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const pageEl = (container instanceof Element ? container : container.parentElement)
      ?.closest('[data-page-content]');
    if (!pageEl) return;

    const pageText = pages[pageNum - 1]?.content ?? '';

    // Compute character offsets relative to the page text
    // We walk the text nodes in the page element to find offsets
    let startChar = 0;
    let endChar = 0;
    let charCount = 0;
    let foundStart = false;

    function walkNodes(node: Node): boolean {
      if (node.nodeType === Node.TEXT_NODE) {
        const len = node.textContent?.length ?? 0;
        if (!foundStart && node === range.startContainer) {
          startChar = charCount + range.startOffset;
          foundStart = true;
        }
        if (node === range.endContainer) {
          endChar = charCount + range.endOffset;
          return true; // done
        }
        charCount += len;
      } else {
        for (const child of Array.from(node.childNodes)) {
          if (walkNodes(child)) return true;
        }
      }
      return false;
    }

    walkNodes(pageEl);
    if (!foundStart) startChar = 0;
    if (endChar === 0) endChar = pageText.length;

    if (startChar >= endChar) return;

    // Show color picker near selection
    const rect = range.getBoundingClientRect();
    setSelection({
      startChar,
      endChar,
      x: rect.left + rect.width / 2,
      y: rect.top,
      pageNumber: pageNum,
    });
  }, [pages]);

  const applyHighlight = useCallback((color: string) => {
    if (!selection) return;
    addHighlight(selection.pageNumber, selection.startChar, selection.endChar, color);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, [selection, addHighlight]);

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

  // Search match for current page
  const searchMatchForPage = (pageNum: number) => {
    const match = bookSearch.currentMatch;
    if (!match || match.pageNumber !== pageNum) return null;
    return { startChar: match.startChar, endChar: match.endChar };
  };

  // TTS word range (relative to page text)
  const ttsRangeForPage = (pageNum: number) => {
    if (pageNum !== currentPage) return null;
    return tts.ttsWordRange ? { start: tts.ttsWordRange.start, end: tts.ttsWordRange.end } : null;
  };

  // Render page content with highlights
  const renderPageContent = (page: PageContent | null, showPageNum?: number) => {
    if (!page) {
      return showPageNum ? (
        <div className="flex items-center justify-center h-full text-slate-400">
          Page {showPageNum}
        </div>
      ) : null;
    }

    return page.content ? (
      <div
        data-page-content
        onMouseUp={() => handleMouseUp(page.pageNumber)}
        onDoubleClick={(e) => {
          const sel = window.getSelection()?.toString().trim();
          if (sel && sel.split(/\s+/).length === 1) {
            dict.lookup(sel, e.clientX, e.clientY);
          }
        }}
      >
        {renderWithHighlights(
          page.content,
          highlightsForPage(page.pageNumber),
          searchMatchForPage(page.pageNumber),
          ttsRangeForPage(page.pageNumber)
        )}
      </div>
    ) : (
      <div className="flex items-center justify-center h-full text-slate-400">
        Page {page.pageNumber}
      </div>
    );
  };

  const contentStyle = {
    fontSize: `${localFontSize}px`,
    fontFamily: fontFamilies[settings.fontFamily]?.css ?? fontFamilies.serif.css,
    lineHeight: settings.lineHeight,
  };

  const modeButtons: { mode: ReadingMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'day', icon: <Sun className="w-4 h-4" />, label: 'Day' },
    { mode: 'night', icon: <Moon className="w-4 h-4" />, label: 'Night' },
    { mode: 'sepia', icon: <BookOpen className="w-4 h-4" />, label: 'Sepia' },
  ];

  // Jump to search result page
  useEffect(() => {
    const match = bookSearch.currentMatch;
    if (match && match.pageNumber !== currentPage) {
      onPageChange(match.pageNumber);
    }
  }, [bookSearch.currentMatch]);

  return (
    <div className={`fixed inset-0 z-50 ${styles.bg} flex flex-col`}>
      {/* Skip link */}
      <a
        href="#reader-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to content
      </a>

      {/* Top Bar */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black/20" role="toolbar" aria-label="Reader controls">
        <button
          onClick={onClose}
          aria-label="Close reader and return home"
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <Home className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddBookmark}
            aria-label={isBookmarked ? 'Remove bookmark from this page' : 'Add bookmark to this page'}
            className={`p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors ${
              isBookmarked ? 'text-yellow-400' : 'text-white'
            }`}
          >
            <Bookmark className="w-5 h-5" aria-hidden="true" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setShowBookmarks(true)}
            aria-label={`View ${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}`}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <span className="text-sm" aria-hidden="true">{bookmarks.length}</span>
          </button>
          <button
            onClick={() => setShowHighlightsPanel(true)}
            aria-label={`View ${highlights.length} highlight${highlights.length !== 1 ? 's' : ''}`}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Highlighter className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            onClick={bookSearch.openSearch}
            aria-label="Search within book"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Search className="w-5 h-5" aria-hidden="true" />
          </button>
          {/* Timer button */}
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu((v) => !v)}
              aria-label="Reading timer"
              className={`p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1 ${timer.isActive ? 'text-orange-400' : 'text-white'}`}
            >
              <Timer className="w-5 h-5" aria-hidden="true" />
              {timer.isActive && <span className="text-xs font-mono">{timer.formattedRemaining}</span>}
            </button>
            {showTimerMenu && (
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[80] py-1 min-w-[120px]">
                {TIMER_OPTIONS.map((min) => (
                  <button
                    key={min}
                    onClick={() => { timer.start(min); setShowTimerMenu(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${timer.duration === min && timer.isActive ? 'text-orange-400' : 'text-slate-200'}`}
                  >
                    {min === 0 ? 'Off' : `${min} min`}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Reader settings"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Search Panel */}
      {bookSearch.isOpen && (
        <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-3" role="search" aria-label="Search within book">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="search"
              autoFocus
              placeholder="Search in book…"
              value={bookSearch.query}
              onChange={(e) => bookSearch.search(e.target.value, pages)}
              aria-label="Search query"
              className="flex-1 px-3 py-1.5 bg-slate-700 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 text-sm whitespace-nowrap" aria-live="polite" aria-atomic="true">
              {bookSearch.results.length > 0
                ? `${bookSearch.currentResultIndex + 1} of ${bookSearch.results.length}`
                : bookSearch.query
                ? 'No results'
                : ''}
            </span>
            <button
              onClick={bookSearch.prevResult}
              disabled={bookSearch.results.length === 0}
              aria-label="Previous search result"
              className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={bookSearch.nextResult}
              disabled={bookSearch.results.length === 0}
              aria-label="Next search result"
              className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={bookSearch.closeSearch}
              aria-label="Close search"
              className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Content Area - Book */}
      <div
        id="reader-content"
        ref={contentAreaRef}
        {...bindDrag()}
        className="flex-1 flex items-stretch px-4 md:px-8 py-4 overflow-hidden relative book-container"
        style={{ touchAction: 'pan-y' }}
      >
        <div
          className={`book-pages h-full w-full relative ${!isWideScreen ? 'single-page-mode' : ''}`}
          style={{
            transform: dragX !== 0 ? `translateX(${dragX}px)` : undefined,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          {/* Two-page mode */}
          {isWideScreen ? (
            <>
              {/* Left Page */}
              <div
                className={`page-card ${styles.pageBg} rounded-l-lg shadow-2xl flex flex-col relative`}
                style={{ zIndex: 1 }}
              >
                <div className="page-shadow-right" />
                <div
                  className={`flex-1 px-8 md:px-12 lg:px-16 py-6 overflow-auto ${styles.text}`}
                  style={contentStyle}
                  aria-label={`Page ${currentPage} content`}
                >
                  {renderPageContent(leftPage)}
                </div>
                <div className={`flex items-center justify-between px-4 py-2 border-t border-current/10 ${styles.text}`}>
                  <button
                    onClick={handlePrev}
                    onMouseEnter={() => !isFlipping && currentPage > 1 && setHoverPrev(true)}
                    onMouseLeave={() => setHoverPrev(false)}
                    disabled={currentPage <= 1 || isFlipping}
                    aria-label="Previous page"
                    className={`nav-button flex items-center gap-1 text-sm transition-all ${
                      hoverPrev ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'
                    } disabled:opacity-20`}
                  >
                    <ChevronLeft className={`w-4 h-4 transition-transform ${hoverPrev ? '-translate-x-1' : ''}`} aria-hidden="true" />
                    <span>Prev</span>
                  </button>
                  <span className="text-xs opacity-50" aria-label={`Page ${leftPage?.pageNumber}`}>{leftPage?.pageNumber}</span>
                  <div />
                </div>
              </div>

              {/* Right Page */}
              <div
                className={`page-card ${styles.pageBg} rounded-r-lg shadow-2xl flex flex-col relative`}
                style={{ zIndex: 1 }}
              >
                <div className="page-shadow-left" />
                <div
                  className={`flex-1 px-8 md:px-12 lg:px-16 py-6 overflow-auto ${styles.text}`}
                  style={contentStyle}
                  aria-label={`Page ${currentPage + 1} content`}
                >
                  {renderPageContent(rightPage)}
                </div>
                <div className={`flex items-center justify-between px-4 py-2 border-t border-current/10 ${styles.text}`}>
                  <div />
                  <span className="text-xs opacity-50" aria-label={`Page ${rightPage?.pageNumber}`}>{rightPage?.pageNumber}</span>
                  <button
                    onClick={handleNext}
                    onMouseEnter={() => !isFlipping && currentPage < totalPages && setHoverNext(true)}
                    onMouseLeave={() => setHoverNext(false)}
                    disabled={currentPage >= totalPages || isFlipping}
                    aria-label="Next page"
                    className={`nav-button flex items-center gap-1 text-sm transition-all ${
                      hoverNext ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'
                    } disabled:opacity-20`}
                  >
                    <span>Next</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${hoverNext ? 'translate-x-1' : ''}`} aria-hidden="true" />
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
                <div
                  className={`flex-1 px-6 md:px-10 py-6 overflow-auto ${styles.text}`}
                  style={contentStyle}
                  aria-label={`Page ${currentPage} content`}
                >
                  {renderPageContent(leftPage)}
                </div>
                <div className={`flex items-center justify-between px-4 py-2 border-t border-current/10 ${styles.text}`}>
                  <button
                    onClick={handlePrev}
                    onMouseEnter={() => !isFlipping && currentPage > 1 && setHoverPrev(true)}
                    onMouseLeave={() => setHoverPrev(false)}
                    disabled={currentPage <= 1 || isFlipping}
                    aria-label="Previous page"
                    className={`nav-button flex items-center gap-1 text-sm transition-all ${
                      hoverPrev ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'
                    } disabled:opacity-20`}
                  >
                    <ChevronLeft className={`w-4 h-4 transition-transform ${hoverPrev ? '-translate-x-1' : ''}`} aria-hidden="true" />
                    <span>Prev</span>
                  </button>
                  <span className="text-xs opacity-50">{leftPage?.pageNumber}</span>
                  <button
                    onClick={handleNext}
                    onMouseEnter={() => !isFlipping && currentPage < totalPages && setHoverNext(true)}
                    onMouseLeave={() => setHoverNext(false)}
                    disabled={currentPage >= totalPages || isFlipping}
                    aria-label="Next page"
                    className={`nav-button flex items-center gap-1 text-sm transition-all ${
                      hoverNext ? 'opacity-100 scale-110' : 'opacity-60 hover:opacity-100'
                    } disabled:opacity-20`}
                  >
                    <span>Next</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${hoverNext ? 'translate-x-1' : ''}`} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Text Selection Highlight Picker */}
      {selection && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Highlight color picker"
          className="fixed z-[70] flex items-center gap-1 bg-slate-800 border border-slate-600 rounded-lg p-2 shadow-xl"
          style={{
            left: Math.min(selection.x - 80, window.innerWidth - 180),
            top: Math.max(selection.y - 56, 4),
          }}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => applyHighlight(c.value)}
              aria-label={`Highlight ${c.label}`}
              className="w-7 h-7 rounded-full border-2 border-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: c.value }}
            />
          ))}
          <button
            onClick={() => { window.getSelection()?.removeAllRanges(); setSelection(null); }}
            aria-label="Cancel"
            className="p-1 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="flex-shrink-0 p-4 bg-black/20">
        {/* TTS Toolbar */}
        <div className="flex items-center gap-3 mb-3 px-1">
          {tts.isPlaying ? (
            <button
              onClick={tts.pause}
              aria-label="Pause text-to-speech"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Pause className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : tts.isPaused ? (
            <button
              onClick={tts.resume}
              aria-label="Resume text-to-speech"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={handleTTSPlay}
              aria-label="Start text-to-speech"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          {(tts.isPlaying || tts.isPaused) && (
            <button
              onClick={tts.stop}
              aria-label="Stop text-to-speech"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Square className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-white/50 text-xs">Speed</span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={tts.settings.rate}
              onChange={(e) => tts.setRate(parseFloat(e.target.value))}
              aria-label={`TTS speed: ${tts.settings.rate}x`}
              className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-400"
            />
            <span className="text-white/50 text-xs w-8">{tts.settings.rate.toFixed(1)}×</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/20 rounded-full mb-3 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Reading progress: ${Math.round(progress)}%`}>
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
            <Type className="w-4 h-4 text-white/70" aria-hidden="true" />
            <input
              type="range"
              min={12}
              max={24}
              value={localFontSize}
              onChange={(e) => setLocalFontSize(parseInt(e.target.value, 10))}
              aria-label={`Font size: ${localFontSize}px`}
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

      {/* Page Flip Overlays */}
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Reading Mode</label>
            <div className="flex gap-2">
              {modeButtons.map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => onSettingsChange({ mode })}
                  aria-pressed={settings.mode === mode}
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
                aria-label="Decrease font size"
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <input
                type="range"
                min={12}
                max={28}
                value={settings.fontSize}
                onChange={(e) => onSettingsChange({ fontSize: parseInt(e.target.value, 10) })}
                aria-label={`Font size: ${settings.fontSize}px`}
                className="flex-1"
              />
              <button
                onClick={() => onSettingsChange({ fontSize: Math.min(28, settings.fontSize + 2) })}
                aria-label="Increase font size"
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Font Family</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(fontFamilies) as FontFamily[]).map((font) => (
                <button
                  key={font}
                  onClick={() => onSettingsChange({ fontFamily: font })}
                  aria-pressed={settings.fontFamily === font}
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
              aria-label={`Line height: ${settings.lineHeight}`}
              className="w-full"
            />
          </div>

          {/* High Contrast */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.highContrast ?? false}
                onChange={(e) => onSettingsChange({ highContrast: e.target.checked })}
                aria-label="High contrast mode"
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-slate-300">High Contrast</span>
            </label>
          </div>

          {/* Auto Night Mode */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoNightMode ?? false}
                onChange={(e) => onSettingsChange({ autoNightMode: e.target.checked })}
                aria-label="Follow system theme"
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-slate-300">Follow system theme</span>
            </label>
          </div>

          {/* TTS Voice */}
          {tts.voices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">TTS Voice</label>
              <select
                value={tts.settings.voiceUri}
                onChange={(e) => tts.setVoice(e.target.value)}
                aria-label="Text-to-speech voice"
                className="w-full bg-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Default</option>
                {tts.voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* TTS Pitch */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              TTS Pitch: {tts.settings.pitch.toFixed(1)}
            </label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={tts.settings.pitch}
              onChange={(e) => tts.setPitch(parseFloat(e.target.value))}
              aria-label={`TTS pitch: ${tts.settings.pitch}`}
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
          <ul className="space-y-2" role="list">
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
                  aria-label={`Remove bookmark at page ${bookmark.page}`}
                  className="p-1 hover:bg-slate-600 rounded"
                >
                  <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Dictionary Popup */}
      {dict.isOpen && (
        <DictionaryPopup
          word={dict.word}
          entry={dict.entry}
          isLoading={dict.isLoading}
          error={dict.error}
          x={dict.x}
          y={dict.y}
          onClose={dict.close}
        />
      )}

      {/* Timer Expiry Overlay */}
      {timer.isExpired && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-8 text-center shadow-2xl max-w-sm mx-4">
            <Timer className="w-12 h-12 text-orange-400 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-bold text-slate-100 mb-2">Time's up!</h2>
            <p className="text-slate-400 mb-6">Take a break — you've been reading for {timer.duration} minutes.</p>
            <button
              onClick={timer.dismiss}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Highlights Panel */}
      <Modal
        isOpen={showHighlightsPanel}
        onClose={() => setShowHighlightsPanel(false)}
        title="Highlights"
      >
        {highlights.length === 0 ? (
          <p className="text-slate-400 text-center py-8">
            No highlights yet. Select text while reading to highlight it.
          </p>
        ) : (
          <ul className="space-y-3" role="list">
            {highlights.map((h) => (
              <li key={h.id} className="bg-slate-700 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: h.color }}
                        aria-hidden="true"
                      />
                      <button
                        onClick={() => {
                          onPageChange(h.pageNumber);
                          setShowHighlightsPanel(false);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200"
                        aria-label={`Go to page ${h.pageNumber}`}
                      >
                        Page {h.pageNumber}
                      </button>
                    </div>
                    {editingNote?.id === h.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingNote.note}
                          onChange={(e) => setEditingNote({ id: h.id, note: e.target.value })}
                          aria-label="Edit note"
                          className="flex-1 text-sm bg-slate-600 text-slate-100 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => {
                            updateNote(h.id, editingNote.note);
                            setEditingNote(null);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingNote({ id: h.id, note: h.note ?? '' })}
                        className="text-sm text-slate-400 hover:text-slate-200 italic text-left"
                        aria-label={h.note ? `Edit note: ${h.note}` : 'Add a note'}
                      >
                        {h.note || 'Add a note…'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => removeHighlight(h.id)}
                    aria-label="Remove highlight"
                    className="p-1 hover:bg-slate-600 rounded flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
