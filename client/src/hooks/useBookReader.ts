import { useState, useCallback, useEffect, useRef } from 'react';
import { useBookStore } from '../store';
import { getBookContent, getGutenbergText } from '../services/api';
import { loadPdf, type PdfDocument } from '../services/pdfService';
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
}

export function useBookReader(): UseBookReaderReturn {
  const [pages, setPages] = useState<PageContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfDocRef = useRef<PdfDocument | null>(null);

  const {
    currentPage,
    totalPages,
    setCurrentBook,
    setCurrentPage,
    setTotalPages,
  } = useBookStore();

  // Cleanup PDF document on unmount
  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }
    };
  }, []);

  const splitTextIntoPages = useCallback((text: string, charsPerPage = 2000): PageContent[] => {
    // Normalize line endings and split by double newlines
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const paragraphs = normalizedText.split(/\n\n+/);
    const pageContents: PageContent[] = [];
    let currentContent = '';
    let pageNumber = 1;

    for (const paragraph of paragraphs) {
      if (currentContent.length + paragraph.length > charsPerPage && currentContent.length > 0) {
        pageContents.push({
          pageNumber: pageNumber++,
          content: currentContent.trim(),
        });
        currentContent = paragraph;
      } else {
        currentContent += (currentContent ? '\n\n' : '') + paragraph;
      }
    }

    if (currentContent.trim()) {
      pageContents.push({
        pageNumber: pageNumber,
        content: currentContent.trim(),
      });
    }

    return pageContents;
  }, []);

  const loadBook = useCallback(async (book: Book) => {
    setIsLoading(true);
    setError(null);
    setCurrentBook(book);

    try {
      let content: string;

      if (book.source === 'gutenberg') {
        content = await getGutenbergText(book.id);
      } else if (book.source === 'openlibrary') {
        content = await getBookContent(book.id, 1, book.source);
      } else {
        throw new Error('Unsupported book source');
      }

      const bookPages = splitTextIntoPages(content);
      setPages(bookPages);
      setTotalPages(bookPages.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load book';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentBook, setTotalPages, splitTextIntoPages]);

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
  };
}
