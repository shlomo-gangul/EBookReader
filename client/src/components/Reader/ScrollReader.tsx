import { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { Modal } from '../common';
import { hapticPageTurn } from '../../utils/native';
import { renderWithHighlights } from '../../utils/highlightText';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { useBookSearch } from '../../hooks/useBookSearch';
import { useHighlights } from '../../hooks/useHighlights';
import type { PageContent, ReadingMode, ReaderSettings, Bookmark as BookmarkType, FontFamily } from '../../types';

// Font family mappings
const fontFamilies: Record<FontFamily, { name: string; css: string }> = {
  serif: { name: 'Merriweather', css: 'Merriweather, Georgia, serif' },
  sans: { name: 'Inter', css: 'Inter, system-ui, sans-serif' },
  georgia: { name: 'Georgia', css: 'Georgia, Times New Roman, serif' },
  literata: { name: 'Literata', css: 'Literata, Georgia, serif' },
  opendyslexic: { name: 'OpenDyslexic', css: 'OpenDyslexic, sans-serif' },
};

const modeStyles: Record<ReadingMode, { bg: string; text: string; pageBg: string }> = {
  day: {
    bg: 'bg-gray-100',
    text: 'text-gray-900',
    pageBg: 'bg-[#fefce8]',
  },
  night: {
    bg: 'bg-slate-950',
    text: 'text-slate-200',
    pageBg: 'bg-[#1e293b]',
  },
  sepia: {
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    pageBg: 'bg-[#fef3c7]',
  },
};

const marginSizes: Record<'small' | 'medium' | 'large', string> = {
  small: 'px-4 md:px-8',
  medium: 'px-6 md:px-16',
  large: 'px-8 md:px-24',
};

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bae6fd' },
  { label: 'Pink', value: '#fbcfe8' },
];

interface ScrollReaderProps {
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

interface SelectionInfo {
  startChar: number;
  endChar: number;
  x: number;
  y: number;
  pageNumber: number;
}

export function ScrollReader({
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
}: ScrollReaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHighlightsPanel, setShowHighlightsPanel] = useState(false);
  const [localFontSize, setLocalFontSize] = useState(settings.fontSize);
  const [showTopBar, setShowTopBar] = useState(true);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastScrollY = useRef(0);

  const styles = modeStyles[settings.mode];
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const isBookmarked = bookmarks.some((b) => b.page === currentPage);

  const tts = useTextToSpeech();
  const bookSearch = useBookSearch();
  const { highlights, addHighlight, removeHighlight, updateNote, highlightsForPage } = useHighlights(bookId ?? null);

  // Sync font size with debounce
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

  // Set up IntersectionObserver to track current page
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let visiblePage = currentPage;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '1', 10);
            visiblePage = pageNum;
          }
        });

        if (visiblePage !== currentPage && maxRatio > 0.3) {
          onPageChange(visiblePage);
          hapticPageTurn();
        }
      },
      {
        root: containerRef.current,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    pageRefs.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [pages, currentPage, onPageChange]);

  // Hide/show top bar on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      const isScrollingDown = currentScrollY > lastScrollY.current;

      if (isScrollingDown && currentScrollY > 100) {
        setShowTopBar(false);
      } else if (!isScrollingDown) {
        setShowTopBar(true);
      }

      lastScrollY.current = currentScrollY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToPage = useCallback((pageNum: number) => {
    const element = pageRefs.current.get(pageNum);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Jump to search result
  useEffect(() => {
    const match = bookSearch.currentMatch;
    if (match) {
      scrollToPage(match.pageNumber);
    }
  }, [bookSearch.currentMatch, scrollToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, [onClose, bookSearch.isOpen, selection]);

  // TTS — read current page
  const handleTTSPlay = useCallback(() => {
    const page = pages[currentPage - 1];
    if (!page?.content) return;
    tts.play(page.content, () => {
      if (currentPage < totalPages) {
        onPageChange(currentPage + 1);
        scrollToPage(currentPage + 1);
      }
    });
  }, [tts, pages, currentPage, totalPages, onPageChange, scrollToPage]);

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
    <div className={`fixed inset-0 z-50 ${styles.bg} flex flex-col`}>
      {/* Skip link */}
      <a
        href="#reader-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to content
      </a>

      {/* Top Bar */}
      <div
        className={`flex-shrink-0 flex items-center justify-between p-4 bg-black/20 transition-transform duration-300 ${
          showTopBar ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60 }}
        role="toolbar"
        aria-label="Reader controls"
      >
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
        <div
          className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-3"
          style={{ position: 'absolute', top: showTopBar ? '72px' : '0', left: 0, right: 0, zIndex: 61 }}
          role="search"
          aria-label="Search within book"
        >
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

      {/* Scroll Container */}
      <div
        id="reader-content"
        ref={containerRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth ${marginSizes[settings.marginSize]}`}
        style={{
          paddingTop: showTopBar ? '80px' : '20px',
          paddingBottom: '100px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className={`max-w-3xl mx-auto ${styles.pageBg} shadow-lg rounded-lg`}>
          {pages.map((page) => (
            <div
              key={page.pageNumber}
              ref={(el) => {
                if (el) pageRefs.current.set(page.pageNumber, el);
              }}
              data-page={page.pageNumber}
              className={`py-8 px-6 md:px-12 ${styles.text} border-b border-black/5 last:border-b-0`}
              style={contentStyle}
            >
              {page.content ? (
                <div
                  data-page-content
                  onMouseUp={() => handleMouseUp(page.pageNumber)}
                >
                  {renderWithHighlights(
                    page.content,
                    highlightsForPage(page.pageNumber),
                    bookSearch.currentMatch?.pageNumber === page.pageNumber
                      ? { startChar: bookSearch.currentMatch.startChar, endChar: bookSearch.currentMatch.endChar }
                      : null,
                    page.pageNumber === currentPage && tts.ttsWordRange
                      ? { start: tts.ttsWordRange.start, end: tts.ttsWordRange.end }
                      : null
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 opacity-50">
                  Page {page.pageNumber}
                </div>
              )}
            </div>
          ))}
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
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Size: {settings.fontSize}px
            </label>
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
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Line Height: {settings.lineHeight}
            </label>
            <input type="range" min={1.2} max={2.4} step={0.1} value={settings.lineHeight} onChange={(e) => onSettingsChange({ lineHeight: parseFloat(e.target.value) })} aria-label={`Line height: ${settings.lineHeight}`} className="w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Margin Size</label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onSettingsChange({ marginSize: size })}
                  aria-pressed={settings.marginSize === size}
                  className={`flex-1 py-2 rounded-lg transition-colors capitalize ${
                    settings.marginSize === size
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
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
                <button onClick={() => { scrollToPage(bookmark.page); setShowBookmarks(false); }} className="flex-1 text-left">
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
                      <button onClick={() => { scrollToPage(h.pageNumber); setShowHighlightsPanel(false); }} className="text-xs text-slate-400 hover:text-slate-200" aria-label={`Go to page ${h.pageNumber}`}>
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
