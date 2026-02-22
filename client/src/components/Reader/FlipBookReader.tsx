import { useState, useEffect, useRef, forwardRef, memo, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import {
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
  ChevronLeft,
  ChevronRight,
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
import type { PageContent, ReadingMode, ReaderSettings, Bookmark as BookmarkType, FontFamily, Highlight } from '../../types';

// Font family mappings
const fontFamilies: Record<FontFamily, { name: string; css: string }> = {
  serif: { name: 'Merriweather', css: 'Merriweather, Georgia, serif' },
  sans: { name: 'Inter', css: 'Inter, system-ui, sans-serif' },
  georgia: { name: 'Georgia', css: 'Georgia, Times New Roman, serif' },
  literata: { name: 'Literata', css: 'Literata, Georgia, serif' },
  opendyslexic: { name: 'OpenDyslexic', css: 'OpenDyslexic, sans-serif' },
};

const modeStyles: Record<ReadingMode, { bg: string; text: string; pageBg: string; pageBgHex: string }> = {
  day: {
    bg: 'bg-gray-200',
    text: 'text-gray-900',
    pageBg: 'bg-[#fefce8]',
    pageBgHex: '#fefce8',
  },
  night: {
    bg: 'bg-slate-950',
    text: 'text-slate-200',
    pageBg: 'bg-[#1e293b]',
    pageBgHex: '#1e293b',
  },
  sepia: {
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    pageBg: 'bg-[#fef3c7]',
    pageBgHex: '#fef3c7',
  },
};

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bae6fd' },
  { label: 'Pink', value: '#fbcfe8' },
];

interface FlipBookReaderProps {
  pages: PageContent[];
  currentPage: number;
  totalPages: number;
  settings: ReaderSettings;
  bookmarks: BookmarkType[];
  bookId?: string;
  coverColor?: string;
  onPageChange: (page: number) => void;
  onSettingsChange: (settings: Partial<ReaderSettings>) => void;
  onAddBookmark: () => void;
  onRemoveBookmark: (id: string) => void;
  onClose: () => void;
}

interface SelectionInfo {
  startChar: number;
  endChar: number;
  x: number;
  y: number;
  pageNumber: number;
}

// Page component that forwards ref properly for react-pageflip
const Page = memo(forwardRef<HTMLDivElement, {
  page: PageContent;
  styles: typeof modeStyles.day;
  contentStyle: React.CSSProperties;
  pageHighlights: Highlight[];
  searchMatch: { startChar: number; endChar: number } | null;
  ttsWordRange: { start: number; end: number } | null;
  onMouseUp: (pageNum: number) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}>(({ page, styles, contentStyle, pageHighlights, searchMatch, ttsWordRange, onMouseUp, onDoubleClick }, ref) => {
  const isLeftPage = page.pageNumber % 2 === 0;

  const pageGradient = isLeftPage
    ? `linear-gradient(to right,
        ${styles.pageBgHex} 0%,
        ${styles.pageBgHex} 75%,
        rgba(255,255,255,0.12) 88%,
        rgba(0,0,0,0.06) 96%,
        rgba(0,0,0,0.12) 100%
      )`
    : `linear-gradient(to left,
        ${styles.pageBgHex} 0%,
        ${styles.pageBgHex} 75%,
        rgba(255,255,255,0.08) 88%,
        rgba(0,0,0,0.06) 96%,
        rgba(0,0,0,0.12) 100%
      )`;

  const pageShadows = `
    inset 0 3px 6px -3px rgba(0,0,0,0.08),
    inset 0 -3px 6px -3px rgba(0,0,0,0.06)
  `;

  return (
    <div
      ref={ref}
      className="h-full w-full"
      style={{
        background: pageGradient,
        boxShadow: pageShadows,
        willChange: 'transform',
      }}
    >
      <div
        className={`h-full w-full px-8 py-6 overflow-auto ${styles.text}`}
        style={contentStyle}
      >
        {page.content ? (
          <div data-page-content onMouseUp={() => onMouseUp(page.pageNumber)} onDoubleClick={onDoubleClick}>
            {renderWithHighlights(page.content, pageHighlights, searchMatch, ttsWordRange)}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full opacity-50">
            Page {page.pageNumber}
          </div>
        )}
      </div>
    </div>
  );
}));

Page.displayName = 'Page';

export function FlipBookReader({
  pages,
  currentPage,
  totalPages,
  settings,
  bookmarks,
  bookId,
  coverColor = '#8B4513',
  onPageChange,
  onSettingsChange,
  onAddBookmark,
  onRemoveBookmark,
  onClose,
}: FlipBookReaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);
  const [localFontSize, setLocalFontSize] = useState(settings.fontSize);
  const [bookSize, setBookSize] = useState({ width: 550, height: 700 });
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null);
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const styles = modeStyles[settings.mode];
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const isBookmarked = bookmarks.some((b) => b.page === currentPage);

  const tts = useTextToSpeech();
  const bookSearch = useBookSearch();
  const { highlights, addHighlight, removeHighlight, updateNote, highlightsForPage } = useHighlights(bookId ?? null);
  const timer = useReadingTimer();
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const TIMER_OPTIONS = [0, 5, 10, 15, 30, 60];
  const dict = useDictionary();

  // Calculate book size
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const updateSize = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const containerWidth = containerRef.current.clientWidth;
        const bookRatio = 6 / 9;
        let pageHeight = containerHeight * 0.92;
        let pageWidth = pageHeight * bookRatio;

        if (pageWidth * 2 > containerWidth * 0.95) {
          pageWidth = (containerWidth * 0.95) / 2;
          pageHeight = pageWidth / bookRatio;
        }

        setBookSize({
          width: Math.floor(pageWidth),
          height: Math.floor(pageHeight),
        });
      }
    };

    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSize, 200);
    };

    updateSize();
    window.addEventListener('resize', debouncedUpdate);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedUpdate);
    };
  }, []);

  // Sync font size
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localFontSize !== settings.fontSize) {
        onSettingsChange({ fontSize: localFontSize });
      }
    }, 150);
    return () => clearTimeout(handler);
  }, [localFontSize, settings.fontSize, onSettingsChange]);

  useEffect(() => {
    setLocalFontSize(settings.fontSize);
  }, [settings.fontSize]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (bookSearch.isOpen || showSettings || showBookmarks) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        bookRef.current?.pageFlip()?.flipNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        bookRef.current?.pageFlip()?.flipPrev();
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
  }, [onClose, bookSearch.isOpen, showSettings, showBookmarks, selection]);

  // Jump to search result page
  useEffect(() => {
    const match = bookSearch.currentMatch;
    if (match && match.pageNumber !== currentPage) {
      bookRef.current?.pageFlip()?.flip(match.pageNumber - 1);
    }
  }, [bookSearch.currentMatch]);

  const onFlip = (e: any) => {
    const newPage = e.data + 1;
    onPageChange(newPage);
    hapticPageTurn();
  };

  // TTS — read current page
  const handleTTSPlay = useCallback(() => {
    const page = pages[currentPage - 1];
    if (!page?.content) return;
    tts.play(page.content, () => {
      if (currentPage < totalPages) {
        bookRef.current?.pageFlip()?.flipNext();
      }
    });
  }, [tts, pages, currentPage, totalPages]);

  // Text selection for highlighting
  const handleMouseUp = useCallback((pageNum: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const pageEl = (container instanceof Element ? container : container.parentElement)
      ?.closest('[data-page-content]');
    if (!pageEl) return;

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
          return true;
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
    if (endChar === 0) endChar = pages[pageNum - 1]?.content?.length ?? 0;
    if (startChar >= endChar) return;

    const rect = range.getBoundingClientRect();
    setSelection({ startChar, endChar, x: rect.left + rect.width / 2, y: rect.top, pageNumber: pageNum });
  }, [pages]);

  const applyHighlight = useCallback((color: string) => {
    if (!selection) return;
    addHighlight(selection.pageNumber, selection.startChar, selection.endChar, color);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, [selection, addHighlight]);

  const contentStyle: React.CSSProperties = {
    fontSize: `${localFontSize}px`,
    fontFamily: fontFamilies[settings.fontFamily]?.css ?? fontFamilies.serif.css,
    lineHeight: settings.lineHeight,
  };

  const modeButtons: { mode: ReadingMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'day', icon: <Sun className="w-4 h-4" />, label: 'Day' },
    { mode: 'night', icon: <Moon className="w-4 h-4" />, label: 'Night' },
    { mode: 'sepia', icon: <BookOpen className="w-4 h-4" />, label: 'Sepia' },
  ];

  return (
    <div className={`fixed inset-0 z-50 ${styles.bg} flex flex-col ${settings.mode}-mode`}>
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
          <div className="flex items-center gap-2">
            <input
              type="search"
              autoFocus
              placeholder="Search in book…"
              value={bookSearch.query}
              onChange={(e) => bookSearch.search(e.target.value, pages)}
              aria-label="Search query"
              className="flex-1 px-3 py-1.5 bg-slate-700 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 text-sm whitespace-nowrap" aria-live="polite">
              {bookSearch.results.length > 0
                ? `${bookSearch.currentResultIndex + 1} of ${bookSearch.results.length}`
                : bookSearch.query ? 'No results' : ''}
            </span>
            <button onClick={bookSearch.prevResult} disabled={bookSearch.results.length === 0} aria-label="Previous result" className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button onClick={bookSearch.nextResult} disabled={bookSearch.results.length === 0} aria-label="Next result" className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button onClick={bookSearch.closeSearch} aria-label="Close search" className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Book Container */}
      <div
        id="reader-content"
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden relative"
      >
        {/* Outer hardcover */}
        {pages.length > 0 && bookSize.width > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: bookSize.width * 2 + 30,
              height: bookSize.height + 30,
              background: coverColor,
              borderRadius: '3px 8px 8px 3px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.2)',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
            }}
            aria-hidden="true"
          />
        )}
        {pages.length > 0 && bookSize.width > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: bookSize.width * 2 + 10,
              height: bookSize.height + 10,
              background: '#f5f5f0',
              borderRadius: '1px',
              boxShadow: 'inset 0 0 3px rgba(0,0,0,0.1)',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
            aria-hidden="true"
          />
        )}
        {pages.length > 0 && bookSize.width > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: bookSize.width * 2 + 20,
              height: bookSize.height + 20,
              backgroundColor: styles.pageBgHex,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9,
            }}
            aria-hidden="true"
          />
        )}
        {pages.length > 0 && bookSize.width > 0 && (
          <>
            <div className="absolute pointer-events-none" style={{ width: 8, height: bookSize.height, background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.3) 60%, transparent)', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 15 }} aria-hidden="true" />
            <div className="absolute pointer-events-none" style={{ width: 25, height: bookSize.height, background: 'linear-gradient(to left, transparent 0%, rgba(255,255,255,0.18) 60%, transparent 100%)', right: 'calc(50% + 4px)', top: '50%', transform: 'translateY(-50%)', zIndex: 15 }} aria-hidden="true" />
            <div className="absolute pointer-events-none" style={{ width: 25, height: bookSize.height, background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.1) 60%, transparent 100%)', left: 'calc(50% + 4px)', top: '50%', transform: 'translateY(-50%)', zIndex: 15 }} aria-hidden="true" />
          </>
        )}
        {pages.length > 0 && bookSize.width > 0 && (
          <HTMLFlipBook
            ref={bookRef}
            width={bookSize.width}
            height={bookSize.height}
            size="fixed"
            minWidth={200}
            maxWidth={1500}
            minHeight={300}
            maxHeight={2000}
            drawShadow={false}
            flippingTime={300}
            usePortrait={true}
            startPage={currentPage - 1}
            showCover={false}
            maxShadowOpacity={0.5}
            mobileScrollSupport={false}
            clickEventForward={true}
            useMouseEvents={true}
            swipeDistance={30}
            showPageCorners={true}
            disableFlipByClick={false}
            onFlip={onFlip}
            className="shadow-2xl relative z-10"
            style={{ backgroundColor: styles.pageBgHex }}
            startZIndex={0}
            autoSize={true}
            renderOnlyPageLengthChange={false}
          >
            {pages.map((page) => (
              <Page
                key={page.pageNumber}
                page={page}
                styles={styles}
                contentStyle={contentStyle}
                pageHighlights={highlightsForPage(page.pageNumber)}
                searchMatch={
                  bookSearch.currentMatch?.pageNumber === page.pageNumber
                    ? { startChar: bookSearch.currentMatch.startChar, endChar: bookSearch.currentMatch.endChar }
                    : null
                }
                ttsWordRange={
                  page.pageNumber === currentPage && tts.ttsWordRange
                    ? { start: tts.ttsWordRange.start, end: tts.ttsWordRange.end }
                    : null
                }
                onMouseUp={handleMouseUp}
                onDoubleClick={(e) => {
                  const sel = window.getSelection()?.toString().trim();
                  if (sel && sel.split(/\s+/).length === 1) {
                    dict.lookup(sel, e.clientX, e.clientY);
                  }
                }}
              />
            ))}
          </HTMLFlipBook>
        )}
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
        {/* TTS toolbar */}
        <div className="flex items-center gap-3 mb-3 px-1">
          {tts.isPlaying ? (
            <button onClick={tts.pause} aria-label="Pause text-to-speech" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
              <Pause className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : tts.isPaused ? (
            <button onClick={tts.resume} aria-label="Resume text-to-speech" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
              <Play className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button onClick={handleTTSPlay} aria-label="Start text-to-speech" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
              <Play className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          {(tts.isPlaying || tts.isPaused) && (
            <button onClick={tts.stop} aria-label="Stop text-to-speech" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
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
              className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400"
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
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-white/70 text-xs w-8">{localFontSize}px</span>
          </div>

          <span className="text-white text-sm whitespace-nowrap">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Reader Settings">
        <div className="space-y-6">
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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Font Size: {settings.fontSize}px</label>
            <div className="flex items-center gap-4">
              <button onClick={() => onSettingsChange({ fontSize: Math.max(12, settings.fontSize - 2) })} aria-label="Decrease font size" className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <input type="range" min={12} max={28} value={settings.fontSize} onChange={(e) => onSettingsChange({ fontSize: parseInt(e.target.value, 10) })} aria-label={`Font size: ${settings.fontSize}px`} className="flex-1" />
              <button onClick={() => onSettingsChange({ fontSize: Math.min(28, settings.fontSize + 2) })} aria-label="Increase font size" className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Line Height: {settings.lineHeight}</label>
            <input type="range" min={1.2} max={2.4} step={0.1} value={settings.lineHeight} onChange={(e) => onSettingsChange({ lineHeight: parseFloat(e.target.value) })} aria-label={`Line height: ${settings.lineHeight}`} className="w-full" />
          </div>

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

          {tts.voices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">TTS Voice</label>
              <select value={tts.settings.voiceUri} onChange={(e) => tts.setVoice(e.target.value)} aria-label="Text-to-speech voice" className="w-full bg-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Default</option>
                {tts.voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">TTS Pitch: {tts.settings.pitch.toFixed(1)}</label>
            <input type="range" min={0.5} max={2} step={0.1} value={tts.settings.pitch} onChange={(e) => tts.setPitch(parseFloat(e.target.value))} aria-label={`TTS pitch: ${tts.settings.pitch}`} className="w-full" />
          </div>
        </div>
      </Modal>

      {/* Bookmarks Modal */}
      <Modal isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} title="Bookmarks">
        {bookmarks.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No bookmarks yet</p>
        ) : (
          <ul className="space-y-2" role="list">
            {bookmarks.map((bookmark) => (
              <li key={bookmark.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <button
                  onClick={() => {
                    bookRef.current?.pageFlip()?.flip(bookmark.page - 1);
                    setShowBookmarks(false);
                  }}
                  className="flex-1 text-left"
                >
                  <span className="text-slate-100">Page {bookmark.page}</span>
                  {bookmark.note && <p className="text-sm text-slate-400 mt-1">{bookmark.note}</p>}
                </button>
                <button onClick={() => onRemoveBookmark(bookmark.id)} aria-label={`Remove bookmark at page ${bookmark.page}`} className="p-1 hover:bg-slate-600 rounded">
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
      <Modal isOpen={showHighlightsPanel} onClose={() => setShowHighlightsPanel(false)} title="Highlights">
        {highlights.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No highlights yet. Select text while reading to highlight it.</p>
        ) : (
          <ul className="space-y-3" role="list">
            {highlights.map((h) => (
              <li key={h.id} className="bg-slate-700 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: h.color }} aria-hidden="true" />
                      <button
                        onClick={() => {
                          bookRef.current?.pageFlip()?.flip(h.pageNumber - 1);
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
                        <input type="text" value={editingNote.note} onChange={(e) => setEditingNote({ id: h.id, note: e.target.value })} aria-label="Edit note" className="flex-1 text-sm bg-slate-600 text-slate-100 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button onClick={() => { updateNote(h.id, editingNote.note); setEditingNote(null); }} className="text-xs text-blue-400 hover:text-blue-300">Save</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingNote({ id: h.id, note: h.note ?? '' })} className="text-sm text-slate-400 hover:text-slate-200 italic text-left" aria-label={h.note ? `Edit note: ${h.note}` : 'Add a note'}>
                        {h.note || 'Add a note…'}
                      </button>
                    )}
                  </div>
                  <button onClick={() => removeHighlight(h.id)} aria-label="Remove highlight" className="p-1 hover:bg-slate-600 rounded flex-shrink-0">
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
