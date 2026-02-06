import { useState, useEffect, useRef, forwardRef, memo } from 'react';
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

interface FlipBookReaderProps {
  pages: PageContent[];
  currentPage: number;
  totalPages: number;
  settings: ReaderSettings;
  bookmarks: BookmarkType[];
  coverColor?: string; // Color extracted from book cover
  onPageChange: (page: number) => void;
  onSettingsChange: (settings: Partial<ReaderSettings>) => void;
  onAddBookmark: () => void;
  onRemoveBookmark: (id: string) => void;
  onClose: () => void;
}

// Number of pages to render before/after current page
const PAGE_BUFFER = 3;

// Lightweight placeholder for pages outside the buffer
// Still needs ref forwarding for react-pageflip
const PlaceholderPage = memo(forwardRef<HTMLDivElement, {
  pageNumber: number;
  styles: typeof modeStyles.day;
}>(({ pageNumber, styles }, ref) => {
  return (
    <div
      ref={ref}
      className="h-full w-full"
      style={{
        backgroundColor: styles.pageBgHex,
        willChange: 'transform',
      }}
    >
      <div className="flex items-center justify-center h-full opacity-30">
        <span className="text-sm">Page {pageNumber}</span>
      </div>
    </div>
  );
}));

PlaceholderPage.displayName = 'PlaceholderPage';

// Page component that forwards ref properly for react-pageflip
// Memoized to prevent unnecessary re-renders
const Page = memo(forwardRef<HTMLDivElement, {
  page: PageContent;
  styles: typeof modeStyles.day;
  contentStyle: React.CSSProperties;
}>(({ page, styles, contentStyle }, ref) => {
  // In a book spread: odd pages (1,3,5) are on right, even pages (2,4,6) are on left
  const isLeftPage = page.pageNumber % 2 === 0;

  // Create illusion of curved page surface:
  // Left page: spine on RIGHT side
  // Right page: spine on LEFT side
  // Near spine: dark shadow -> highlight (page curves up) -> neutral middle
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

  // Subtle top/bottom shadow for depth
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
        willChange: 'transform', // GPU acceleration for flip animation
      }}
    >
      <div
        className={`h-full w-full px-8 py-6 overflow-auto ${styles.text}`}
        style={contentStyle}
      >
        {page.content ? (
          <div className="whitespace-pre-wrap">{page.content}</div>
        ) : (
          <div className="flex items-center justify-center h-full opacity-50">
            Page {page.pageNumber}
          </div>
        )}
      </div>
    </div>
  );
}), (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if these change
  return prevProps.page.pageNumber === nextProps.page.pageNumber &&
         prevProps.page.content === nextProps.page.content &&
         prevProps.styles.pageBgHex === nextProps.styles.pageBgHex &&
         prevProps.styles.text === nextProps.styles.text &&
         prevProps.contentStyle.fontSize === nextProps.contentStyle.fontSize &&
         prevProps.contentStyle.fontFamily === nextProps.contentStyle.fontFamily &&
         prevProps.contentStyle.lineHeight === nextProps.contentStyle.lineHeight;
});

Page.displayName = 'Page';

export function FlipBookReader({
  pages,
  currentPage,
  totalPages,
  settings,
  bookmarks,
  coverColor = '#8B4513', // Default to a leather brown
  onPageChange,
  onSettingsChange,
  onAddBookmark,
  onRemoveBookmark,
  onClose,
}: FlipBookReaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [localFontSize, setLocalFontSize] = useState(settings.fontSize);
  const [bookSize, setBookSize] = useState({ width: 550, height: 700 });
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const styles = modeStyles[settings.mode];
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const isBookmarked = bookmarks.some((b) => b.page === currentPage);

  // Calculate book size based on container - height first, then width from book ratio
  // Debounced to prevent excessive re-renders on resize
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const updateSize = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const containerWidth = containerRef.current.clientWidth;

        // Standard book page ratio is roughly 6:9 (width:height) or 2:3
        const bookRatio = 6 / 9; // width = height * 0.667

        // Use 92% of container height
        let pageHeight = containerHeight * 0.92;
        let pageWidth = pageHeight * bookRatio;

        // Make sure two pages fit in the width
        if (pageWidth * 2 > containerWidth * 0.95) {
          pageWidth = (containerWidth * 0.95) / 2;
          pageHeight = pageWidth / bookRatio;
        }

        setBookSize({
          width: Math.floor(pageWidth),
          height: Math.floor(pageHeight)
        });
      }
    };

    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSize, 200);
    };

    updateSize(); // Initial size calculation
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
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        bookRef.current?.pageFlip()?.flipNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        bookRef.current?.pageFlip()?.flipPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle page flip events
  const onFlip = (e: any) => {
    const newPage = e.data + 1; // react-pageflip uses 0-indexed
    onPageChange(newPage);
  };

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
    <div className={`fixed inset-0 z-50 ${styles.bg} flex flex-col ${settings.mode}-mode`}>
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

      {/* Book Container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden relative"
      >
        {/* Outer hardcover - simple book cover */}
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
          />
        )}
        {/* Page edges - cream colored page stack visible around pages */}
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
          />
        )}
        {/* Solid page background - prevents transparency during flip */}
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
          />
        )}
        {/* Center spine - crease shadow + highlight where pages curve up */}
        {pages.length > 0 && bookSize.width > 0 && (
          <>
            {/* Spine crease - the valley where pages meet */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 8,
                height: bookSize.height,
                background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.3) 60%, transparent)',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 15,
              }}
            />
            {/* Left page highlight - catches light as it curves up from spine */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 25,
                height: bookSize.height,
                background: 'linear-gradient(to left, transparent 0%, rgba(255,255,255,0.18) 60%, transparent 100%)',
                right: 'calc(50% + 4px)',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 15,
              }}
            />
            {/* Right page highlight - slightly dimmer (less direct light) */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 25,
                height: bookSize.height,
                background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.1) 60%, transparent 100%)',
                left: 'calc(50% + 4px)',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 15,
              }}
            />
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
            {pages.map((page) => {
              // Only render full content for pages within buffer range
              const isInBuffer = Math.abs(page.pageNumber - currentPage) <= PAGE_BUFFER;

              if (isInBuffer) {
                return (
                  <Page
                    key={page.pageNumber}
                    page={page}
                    styles={styles}
                    contentStyle={contentStyle}
                  />
                );
              }

              // Render lightweight placeholder for distant pages
              return (
                <PlaceholderPage
                  key={page.pageNumber}
                  pageNumber={page.pageNumber}
                  styles={styles}
                />
              );
            })}
          </HTMLFlipBook>
        )}
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
                    bookRef.current?.pageFlip()?.flip(bookmark.page - 1);
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
