import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
// @ts-expect-error - page-flip doesn't have type declarations
import { PageFlip as StPageFlip } from 'page-flip';
import type { PageContent, ReadingMode } from '../../types';

interface PageFlipProps {
  pages: PageContent[];
  currentPage: number;
  onPageChange: (page: number) => void;
  mode: ReadingMode;
  fontSize: number;
  fontFamily: 'serif' | 'sans';
  lineHeight: number;
}

export interface PageFlipHandle {
  flipNext: () => void;
  flipPrev: () => void;
  flipTo: (page: number) => void;
}

const modeStyles: Record<ReadingMode, { bg: string; text: string; pageBg: string }> = {
  day: {
    bg: 'bg-gray-100',
    text: 'text-gray-900',
    pageBg: '#ffffff',
  },
  night: {
    bg: 'bg-slate-900',
    text: 'text-slate-200',
    pageBg: '#1e293b',
  },
  sepia: {
    bg: 'bg-sepia-100',
    text: 'text-sepia-900',
    pageBg: '#f8eed8',
  },
};

export const PageFlipComponent = forwardRef<PageFlipHandle, PageFlipProps>(
  ({ pages, currentPage, onPageChange, mode, fontSize, fontFamily, lineHeight }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pageFlipRef = useRef<StPageFlip | null>(null);
    const pagesRef = useRef<HTMLDivElement>(null);

    const styles = modeStyles[mode];

    useImperativeHandle(ref, () => ({
      flipNext: () => {
        pageFlipRef.current?.flipNext();
      },
      flipPrev: () => {
        pageFlipRef.current?.flipPrev();
      },
      flipTo: (page: number) => {
        pageFlipRef.current?.flip(page - 1);
      },
    }));

    const handleFlip = useCallback(
      (e: { data: number }) => {
        // StPageFlip uses 0-indexed pages, we use 1-indexed
        onPageChange(e.data + 1);
      },
      [onPageChange]
    );

    useEffect(() => {
      if (!pagesRef.current || pages.length === 0) return;

      // Destroy existing instance
      if (pageFlipRef.current) {
        pageFlipRef.current.destroy();
      }

      // Create new PageFlip instance
      const pageFlip = new StPageFlip(pagesRef.current, {
        width: 400,
        height: 600,
        size: 'stretch',
        minWidth: 300,
        maxWidth: 600,
        minHeight: 400,
        maxHeight: 900,
        showCover: false,
        mobileScrollSupport: true,
        swipeDistance: 30,
        clickEventForward: true,
        useMouseEvents: true,
        flippingTime: 800,
        usePortrait: true,
        startPage: currentPage - 1,
        autoSize: true,
        maxShadowOpacity: 0.5,
        drawShadow: true,
      });

      // Load pages
      const pageElements = pagesRef.current.querySelectorAll('.page');
      pageFlip.loadFromHTML(pageElements as unknown as HTMLElement[]);

      // Listen for page flip events
      pageFlip.on('flip', handleFlip);

      pageFlipRef.current = pageFlip;

      return () => {
        pageFlip.destroy();
      };
    }, [pages, handleFlip]);

    // Navigate to page when currentPage changes externally
    useEffect(() => {
      if (pageFlipRef.current && currentPage > 0) {
        const currentFlipPage = pageFlipRef.current.getCurrentPageIndex();
        if (currentFlipPage !== currentPage - 1) {
          pageFlipRef.current.flip(currentPage - 1);
        }
      }
    }, [currentPage]);

    return (
      <div
        ref={containerRef}
        className={`w-full h-full flex items-center justify-center ${styles.bg} overflow-hidden`}
      >
        <div
          ref={pagesRef}
          className="page-flip-container"
          style={{ width: '100%', maxWidth: '900px', height: '100%' }}
        >
          {pages.map((page) => (
            <div
              key={page.pageNumber}
              className="page"
              data-density="soft"
              style={{ backgroundColor: styles.pageBg }}
            >
              <div
                className={`w-full h-full p-6 md:p-10 overflow-hidden ${styles.text}`}
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily === 'serif' ? 'Merriweather, Georgia, serif' : 'Inter, system-ui, sans-serif',
                  lineHeight: lineHeight,
                }}
              >
                {page.isImage ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-slate-500">Page {page.pageNumber}</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{page.content}</div>
                )}
                <div className="absolute bottom-4 left-0 right-0 text-center text-sm opacity-50">
                  {page.pageNumber}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

PageFlipComponent.displayName = 'PageFlipComponent';
