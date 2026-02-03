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
} from 'lucide-react';
import { Modal } from '../common';
import type { PageContent, ReadingMode, ReaderSettings, Bookmark as BookmarkType, FontFamily } from '../../types';

// Font family mappings
const fontFamilies: Record<FontFamily, { name: string; css: string }> = {
  serif: { name: 'Merriweather', css: 'Merriweather, Georgia, serif' },
  sans: { name: 'Inter', css: 'Inter, system-ui, sans-serif' },
  georgia: { name: 'Georgia', css: 'Georgia, Times New Roman, serif' },
  literata: { name: 'Literata', css: 'Literata, Georgia, serif' },
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

interface ScrollReaderProps {
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

export function ScrollReader({
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
}: ScrollReaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [localFontSize, setLocalFontSize] = useState(settings.fontSize);
  const [showTopBar, setShowTopBar] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastScrollY = useRef(0);

  const styles = modeStyles[settings.mode];
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const isBookmarked = bookmarks.some((b) => b.page === currentPage);

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
        // Find the most visible page
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
        }
      },
      {
        root: containerRef.current,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observe all page elements
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

  // Scroll to page when bookmark is clicked
  const scrollToPage = useCallback((pageNum: number) => {
    const element = pageRefs.current.get(pageNum);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const contentStyle: React.CSSProperties = {
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
      <div
        className={`flex-shrink-0 flex items-center justify-between p-4 bg-black/20 transition-transform duration-300 ${
          showTopBar ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60 }}
      >
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

      {/* Scroll Container */}
      <div
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
                <div className="whitespace-pre-wrap">{page.content}</div>
              ) : (
                <div className="flex items-center justify-center h-32 opacity-50">
                  Page {page.pageNumber}
                </div>
              )}
            </div>
          ))}
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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Margin Size
            </label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onSettingsChange({ marginSize: size })}
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
                    scrollToPage(bookmark.page);
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
