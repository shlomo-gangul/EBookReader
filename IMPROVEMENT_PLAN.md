# BookReader - Improvement Plan

> **Goal**: Make it possible for people to read free ebooks on the web from laptop or mobile/tablet

## Current State Summary

Your project is a solid full-stack PWA using React + Vite + TypeScript (client) and Express + Redis (server). It supports Gutenberg/OpenLibrary text + PDF uploads with a 3D page-flip reader.

---

# PHASE 1: CRITICAL (Must Have)

## 1.1 EBOOK FORMAT SUPPORT

**Current**: Only plain text (Gutenberg) + PDFs
**Problem**: Most free ebooks are EPUB format, which you don't support

| # | Improvement | Technology | Benefit |
|---|-------------|------------|---------|
| 1 | **Add EPUB support** | `epub.js` or `foliate-js` | 90%+ of free ebooks are EPUB; this is critical |
| 2 | **Add MOBI/AZW3 support** | Convert with `calibre` CLI on server | Kindle formats widely available |
| 3 | **Better PDF rendering** | `react-pdf` instead of raw `pdfjs-dist` | Better API, easier text selection |

---

## 1.2 BOOK SOURCES

**Current**: Project Gutenberg + Open Library (metadata only)
**Problem**: Limited free content available

| # | New Source | What It Offers | Integration |
|---|------------|----------------|-------------|
| 4 | **Internet Archive** | Millions of public domain books | Free API with full content |
| 5 | **Standard Ebooks** | High-quality, reformatted public domain | Free EPUB API |
| 6 | **Feedbooks Public Domain** | Curated free ebooks | Free OPDS feed |
| 7 | **ManyBooks** | 50k+ free ebooks | Free downloads |

---

## 1.3 SCROLL READING MODE

**Current**: Only page-flip mode
**Problem**: Many mobile users prefer scrolling

| # | Improvement | Technology | Benefit |
|---|-------------|------------|---------|
| 8 | **Add scroll reader** | New `ScrollReader.tsx` component | Alternative to flip for mobile users |
| 9 | **Reader mode toggle** | UI switch between flip/scroll | User preference |

---

# PHASE 2: HIGH IMPACT - Performance Fixes

## 2.1 CRITICAL PERFORMANCE FIXES (Found in Code)

| # | Issue | File | Line | Fix |
|---|-------|------|------|-----|
| 10 | **No resize debounce** | `FlipBookReader.tsx` | 148-177 | Add 200ms debounce to prevent re-renders on phone rotation |
| 11 | **saveProgress on every page turn** | `store/index.ts` | 77 | Throttle to once per 5 seconds |
| 12 | **All pages rendered at once** | `FlipBookReader.tsx` | 391-398 | Only render current ± 2 pages (virtualization) |
| 13 | **HTMLFlipBook remounts on resize** | `FlipBookReader.tsx` | 363 | Use CSS transform for sizing, not width/height props |
| 14 | **splitTextIntoPages blocks thread** | `useBookReader.ts` | 43-71 | Move to Web Worker for large texts |
| 15 | **No image loading="lazy"** | Book cover images | - | Add native lazy loading to all cover images |

---

## 2.2 DEBOUNCE / THROTTLE IMPROVEMENTS

| # | Event Type | Current Behavior | Fix |
|---|------------|------------------|-----|
| 16 | Window resize | Immediate setState | Debounce 200ms |
| 17 | Page turn save | Immediate save | Throttle 5 seconds |
| 18 | Search input | Submit only | Debounce 300ms for as-you-type |
| 19 | Scroll events | N/A | Add for scroll reader mode |
| 20 | Settings changes | Some debounced | Ensure all settings debounced |

---

## 2.3 RENDERING OPTIMIZATIONS

| # | Improvement | Technology | Benefit |
|---|-------------|------------|---------|
| 21 | **Virtualize pages** | Only render visible + buffer | 90% memory reduction for long books |
| 22 | **Memoize Page component** | `React.memo` with proper deps | Prevent re-renders on parent state change |
| 23 | **Use CSS containment** | `contain: content` on pages | Browser paint optimization |
| 24 | **Preload adjacent pages** | Prefetch ±2 pages in background | Smoother page turns |
| 25 | **requestAnimationFrame** | For resize calculations | Sync with browser paint cycle |

---

## 2.4 LOADING OPTIMIZATIONS

| # | Improvement | Technology | Benefit |
|---|-------------|------------|---------|
| 26 | **Code splitting** | `React.lazy` + `Suspense` | Smaller initial bundle |
| 27 | **Route-based splitting** | Split Reader, Library, BookDetails | Load only what's needed |
| 28 | **Image optimization** | Sharp on server → WebP/AVIF | 50-80% smaller cover images |
| 29 | **Progressive image loading** | Blur placeholder → full image | Perceived performance |
| 30 | **Worker-based text processing** | Web Worker for splitTextIntoPages | Don't block main thread |

---

## 2.5 CACHING OPTIMIZATIONS

| # | Improvement | Current | Recommended |
|---|-------------|---------|-------------|
| 31 | **Book content cache** | None | IndexedDB for full book text |
| 32 | **Rendered page cache** | None | Cache rendered Page components |
| 33 | **API response cache** | Server Redis only | Add client-side React Query |
| 34 | **Cover image cache** | Browser default | Service Worker with longer TTL |

---

## 2.6 MOBILE-SPECIFIC PERFORMANCE

| # | Issue | Fix |
|---|-------|-----|
| 35 | **Touch event handling** | Use `passive: true` for scroll listeners |
| 36 | **Animation jank** | Use `will-change: transform` on flip elements |
| 37 | **Memory on low-end devices** | Limit page buffer, aggressive cleanup |
| 38 | **Battery drain** | Reduce animation frames, pause when hidden |

---

# PHASE 3: HIGH IMPACT - Features

## 3.1 MOBILE EXPERIENCE

| # | Improvement | Technology | Benefit |
|---|-------------|------------|---------|
| 39 | **Better swipe gestures** | `@use-gesture/react` | Better swipe detection, pinch-to-zoom |
| 40 | **Reading view mode** | Fullscreen API + orientation lock | Immersive mobile reading |
| 41 | **Haptic feedback** | Vibration API on page turn | Tactile experience |
| 42 | **Touch-optimized UI** | Larger tap targets, bottom nav | Easier one-hand use |

---

## 3.2 OFFLINE & SYNC

| # | Improvement | Technology | Benefit |
|---|-------------|------------|---------|
| 43 | **Download books for offline** | IndexedDB via `Dexie.js` | Store full books locally |
| 44 | **Connect existing auth** | Your JWT routes exist but unused | Enable cross-device sync |
| 45 | **Background sync** | Workbox Background Sync | Queue progress updates when offline |
| 46 | **Storage management UI** | Show usage, allow clearing books | User control over storage |

---

# PHASE 4: MEDIUM IMPACT - Features

## 4.1 USER EXPERIENCE FEATURES

| # | Feature | Technology | Benefit |
|---|---------|------------|---------|
| 47 | **Text-to-Speech (TTS)** | Web Speech API | Accessibility + hands-free reading |
| 48 | **Highlighting & annotations** | IndexedDB persistence | Select text, add notes |
| 49 | **Search within book** | Full-text search | Find content quickly |
| 50 | **Dictionary lookup** | Free Dictionary API | Tap word for definition |
| 51 | **Night mode auto-switch** | `prefers-color-scheme` | Match system dark mode |
| 52 | **Collections/shelves** | Local storage / DB | Organize books (Reading, Finished, etc.) |
| 53 | **Reading statistics** | Track in store | Time spent, pages/day, streaks |
| 54 | **Reading timer** | setTimeout + notification | Sleep timer, reminders |

---

## 4.2 BACKEND IMPROVEMENTS

| # | Improvement | Technology | Benefit |
|---|-------------|------------|---------|
| 55 | **Add database** | SQLite or PostgreSQL | Persist user data, annotations |
| 56 | **Image optimization endpoint** | Sharp middleware | Serve WebP/AVIF covers |
| 57 | **Replace Express** | Fastify or Hono | 2-4x faster, better TypeScript |
| 58 | **Add tRPC** | `@trpc/server` + `@trpc/react-query` | Type-safe API, no boilerplate |

---

## 4.3 ACCESSIBILITY

| # | Improvement | Benefit |
|---|-------------|---------|
| 59 | **ARIA labels throughout** | Screen reader support |
| 60 | **Focus management** | Proper focus trap in modals |
| 61 | **Skip navigation links** | Quick access for keyboard users |
| 62 | **High contrast mode** | Vision accessibility |
| 63 | **Dyslexia-friendly font** | OpenDyslexic font option |

---

# PHASE 5: NICE TO HAVE

## 5.1 CODE ARCHITECTURE

| # | Improvement | Technology | Benefit |
|---|-------------|------------|---------|
| 64 | **React Query** | `@tanstack/react-query` | Caching, deduping, refetch |
| 65 | **Zod validation** | `zod` | Runtime type safety for API |
| 66 | **Component library** | Radix UI or Headless UI | Accessible primitives |
| 67 | **E2E testing** | Playwright | Test real user flows |
| 68 | **Storybook** | Component docs | Develop UI in isolation |

---

## 5.2 DEPLOYMENT & INFRASTRUCTURE

| # | Improvement | Technology | Benefit |
|---|-------------|------------|---------|
| 69 | **Edge deployment** | Cloudflare Workers or Vercel | Faster globally |
| 70 | **CDN for assets** | Cloudflare R2 or S3 | Fast image/book delivery |
| 71 | **Monitoring** | Sentry or LogRocket | Error tracking |

---

## 5.3 MONETIZATION / SUSTAINABILITY (Optional)

| # | Approach | How |
|---|----------|-----|
| 72 | **Donations** | Ko-fi, GitHub Sponsors |
| 73 | **Self-hosted option** | Let users deploy own instance |
| 74 | **Premium features** | Cloud sync, advanced annotations (freemium) |

---

# PRIORITY CHECKLIST

## PHASE 1: CRITICAL
- [x] 1. EPUB support (`epub.js`) ✅
- [x] 2. MOBI/AZW3 support (calibre CLI) ✅
- [x] 4. Internet Archive integration ✅
- [x] 5. Standard Ebooks - ⚠️ BLOCKED (requires auth/Patrons Circle membership)
- [x] 6. Feedbooks - ❌ DISCONTINUED (shut down, replaced by Cantook)
- [x] 7. ManyBooks - ⚠️ BLOCKED (403 on API access)
- [x] 8. Scroll reading mode ✅
- [x] 9. Reader mode toggle ✅

## PHASE 2: HIGH IMPACT - Performance
- [x] 10. Debounce resize handler ✅
- [x] 11. Throttle saveProgress (5s) ✅
- [x] 12. Virtualize page rendering ✅
- [x] 15. Add `loading="lazy"` to images ✅
- [x] 21. Virtualize pages (only render visible) ✅
- [x] 22. Memoize Page component ✅
- [ ] 26. Code splitting with React.lazy
- [ ] 30. Web Worker for text processing
- [x] 35. Passive touch event listeners ✅
- [x] 36. `will-change: transform` for animations ✅

## PHASE 3: HIGH IMPACT - Features
- [ ] 39. Better touch gestures (`@use-gesture/react`)
- [ ] 43. Offline book downloads (IndexedDB)
- [ ] 44. Connect existing auth system

## PHASE 4: MEDIUM IMPACT
- [ ] 47. Text-to-Speech
- [ ] 48. Highlighting & annotations
- [ ] 49. Search within book
- [ ] 55. Add SQLite database
- [ ] 59-63. Accessibility improvements

## PHASE 5: NICE TO HAVE
- [ ] 64. React Query
- [ ] 52. Collections/shelves
- [ ] 53. Reading statistics
- [ ] 67. Playwright tests

---

# IMPLEMENTATION GUIDE

## Performance Fixes (Quick Wins)

### 1. Debounce resize handler (`FlipBookReader.tsx`)
```typescript
useEffect(() => {
  let timeoutId: NodeJS.Timeout;

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
        height: Math.floor(pageHeight)
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
```

### 2. Throttle saveProgress (`store/index.ts`)
```typescript
let lastSaveTime = 0;
const SAVE_THROTTLE = 5000; // 5 seconds

setCurrentPage: (page) => {
  set({ currentPage: page });
  const now = Date.now();
  if (now - lastSaveTime > SAVE_THROTTLE) {
    lastSaveTime = now;
    get().saveProgress();
  }
},
```

### 3. Memoize Page component (`FlipBookReader.tsx`)
```typescript
import { memo } from 'react';

const Page = memo(forwardRef<HTMLDivElement, PageProps>(({ page, styles, contentStyle }, ref) => {
  // ... existing implementation
}), (prevProps, nextProps) => {
  return prevProps.page.pageNumber === nextProps.page.pageNumber &&
         prevProps.styles === nextProps.styles &&
         prevProps.contentStyle.fontSize === nextProps.contentStyle.fontSize;
});
```

### 4. Add lazy loading to images
```tsx
<img
  src={book.coverUrl}
  loading="lazy"
  decoding="async"
  alt={book.title}
/>
```

### 5. Add passive event listeners
```typescript
window.addEventListener('touchstart', handler, { passive: true });
window.addEventListener('scroll', handler, { passive: true });
```

### 6. Add will-change for animations
```css
.page-flip-element {
  will-change: transform;
}
```

---

## Utility Hooks to Add

### `hooks/useDebounce.ts`
```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

### `hooks/useThrottle.ts`
```typescript
import { useState, useEffect, useRef } from 'react';

export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdated.current >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timeoutId = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));
      return () => clearTimeout(timeoutId);
    }
  }, [value, interval]);

  return throttledValue;
}
```

### `hooks/useWindowSize.ts` (with debounce)
```typescript
import { useState, useEffect } from 'react';

export function useWindowSize(debounceMs = 200) {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      }, debounceMs);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [debounceMs]);

  return size;
}
```

---

## Feature Implementation Notes

1. **EPUB Support**: Use `epub.js` - handles parsing, rendering, CFI navigation
2. **Internet Archive**: API docs at `archive.org/developers`, search + download endpoints
3. **Scroll Mode**: Create `ScrollReader.tsx` as alternative to `FlipBookReader.tsx`
4. **IndexedDB**: Use `Dexie.js` for cleaner API than raw IndexedDB
5. **Touch Gestures**: `@use-gesture/react` for swipe, pinch, drag
6. **Web Worker**: Use `comlink` library for easy worker communication
7. **TTS**: Web Speech API `speechSynthesis.speak(new SpeechSynthesisUtterance(text))`

---

*Plan created: February 2026*
*Total items: 74*
