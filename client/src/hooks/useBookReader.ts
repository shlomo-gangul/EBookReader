import { useState, useCallback, useEffect, useRef } from 'react';
import { useBookStore } from '../store';
import { getBookContent, getGutenbergText, getInternetArchiveText, getInternetArchiveFormats } from '../services/api';
import { loadPdf, type PdfDocument } from '../services/pdfService';
import { loadEpub, loadEpubFromFile, getEpubContent, type EpubDocument } from '../services/epubService';
import { splitTextIntoPages } from '../utils/textProcessorWorker';
import type { Book, PageContent } from '../types';

interface UseBookReaderReturn {
  pages: PageContent[];
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  loadBook: (book: Book) => Promise<void>;
  loadPdfFile: (file: File) => Promise<void>;
  loadEpubFile: (file: File) => Promise<void>;
  loadEpubFromUrl: (url: string, title: string) => Promise<void>;
}

export function useBookReader(): UseBookReaderReturn {
  const [pages, setPages] = useState<PageContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<PdfDocument | null>(null);
  const epubDocRef = useRef<EpubDocument | null>(null);

  const {
    currentPage,
    totalPages,
    setCurrentBook,
    setCurrentPage,
    setTotalPages,
  } = useBookStore();

  // Cleanup PDF and EPUB documents on unmount
  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }
      if (epubDocRef.current) {
        epubDocRef.current.destroy();
      }
    };
  }, []);

  const loadBook = useCallback(async (book: Book) => {
    setIsLoading(true);
    setError(null);
    setCurrentBook(book);

    try {
      let content: string;

      if (book.source === 'gutenberg') {
        // Check if EPUB is available and preferred
        if (book.formats?.epub) {
          try {
            // Use backend proxy to avoid CORS issues with gutenberg.org
            const epub = await loadEpub(`/api/books/gutenberg/${book.id}/epub`);
            epubDocRef.current = epub;
            const chapters = await getEpubContent(epub);
            content = chapters.join('\n\n');
          } catch {
            // Fall back to text if EPUB fails
            content = await getGutenbergText(book.id);
          }
        } else {
          content = await getGutenbergText(book.id);
        }
      } else if (book.source === 'openlibrary') {
        content = await getBookContent(book.id, 1, book.source);
      } else if (book.source === 'internetarchive') {
        // Check available formats, prefer EPUB > text > PDF
        const formats = await getInternetArchiveFormats(book.id);

        if (formats.epub) {
          try {
            const epub = await loadEpub(formats.epub);
            epubDocRef.current = epub;
            const chapters = await getEpubContent(epub);
            content = chapters.join('\n\n');
          } catch {
            // Fall back to text if EPUB fails
            content = await getInternetArchiveText(book.id);
          }
        } else {
          content = await getInternetArchiveText(book.id);
        }
      } else {
        throw new Error('Unsupported book source');
      }

      const bookPages = await splitTextIntoPages(content);
      setPages(bookPages);
      setTotalPages(bookPages.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load book';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentBook, setTotalPages]);

  const loadPdfFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // Cleanup previous PDF
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }

      const pdf = await loadPdf(file);
      pdfDocRef.current = pdf;

      const pdfBook: Book = {
        id: `pdf_${Date.now()}`,
        title: file.name.replace(/\.pdf$/i, ''),
        authors: [{ name: 'Unknown' }],
        source: 'pdf',
        pageCount: pdf.numPages,
      };

      setCurrentBook(pdfBook);
      setTotalPages(pdf.numPages);

      // Generate page placeholders
      const pdfPages: PageContent[] = Array.from({ length: pdf.numPages }, (_, i) => ({
        pageNumber: i + 1,
        content: '',
        isImage: true,
      }));

      setPages(pdfPages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load PDF';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentBook, setTotalPages]);

  const loadEpubFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // Cleanup previous EPUB
      if (epubDocRef.current) {
        epubDocRef.current.destroy();
      }

      const epub = await loadEpubFromFile(file);
      epubDocRef.current = epub;

      const epubBook: Book = {
        id: `epub_${Date.now()}`,
        title: epub.metadata.title || file.name.replace(/\.epub$/i, ''),
        authors: epub.metadata.creator ? [{ name: epub.metadata.creator }] : [{ name: 'Unknown' }],
        source: 'epub',
        coverUrl: epub.metadata.cover,
      };

      setCurrentBook(epubBook);

      // Get all chapter content
      const chapters = await getEpubContent(epub);
      const content = chapters.join('\n\n');
      const bookPages = await splitTextIntoPages(content);

      setPages(bookPages);
      setTotalPages(bookPages.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load EPUB';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentBook, setTotalPages]);

  const loadEpubFromUrl = useCallback(async (url: string, title: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Cleanup previous EPUB
      if (epubDocRef.current) {
        epubDocRef.current.destroy();
      }

      const epub = await loadEpub(url);
      epubDocRef.current = epub;

      const epubBook: Book = {
        id: `epub_${Date.now()}`,
        title: epub.metadata.title || title,
        authors: epub.metadata.creator ? [{ name: epub.metadata.creator }] : [{ name: 'Unknown' }],
        source: 'epub',
        coverUrl: epub.metadata.cover,
      };

      setCurrentBook(epubBook);

      // Get all chapter content
      const chapters = await getEpubContent(epub);
      const content = chapters.join('\n\n');
      const bookPages = await splitTextIntoPages(content);

      setPages(bookPages);
      setTotalPages(bookPages.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load EPUB';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentBook, setTotalPages]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages, setCurrentPage]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    pages,
    currentPage,
    totalPages,
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
    loadBook,
    loadPdfFile,
    loadEpubFile,
    loadEpubFromUrl,
  };
}
