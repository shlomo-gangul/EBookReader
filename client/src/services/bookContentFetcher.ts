import { getBookContent, getGutenbergText, getInternetArchiveText, getInternetArchiveFormats } from './api';
import { loadEpub, getEpubContent, type EpubDocument } from './epubService';
import type { Book } from '../types';

/**
 * Fetches book text content from the appropriate source.
 * Returns the full text content and optionally an EpubDocument ref for cleanup.
 */
export async function fetchBookContent(
  book: Book
): Promise<{ content: string; epubDoc?: EpubDocument }> {
  let content: string;
  let epubDoc: EpubDocument | undefined;

  if (book.source === 'gutenberg') {
    if (book.formats?.epub) {
      try {
        const epub = await loadEpub(`/api/books/gutenberg/${book.id}/epub`);
        epubDoc = epub;
        const chapters = await getEpubContent(epub);
        content = chapters.join('\n\n');
      } catch {
        content = await getGutenbergText(book.id);
      }
    } else {
      content = await getGutenbergText(book.id);
    }
  } else if (book.source === 'openlibrary') {
    content = await getBookContent(book.id, 1, book.source);
  } else if (book.source === 'internetarchive') {
    const formats = await getInternetArchiveFormats(book.id);
    if (formats.epub) {
      try {
        const epub = await loadEpub(formats.epub);
        epubDoc = epub;
        const chapters = await getEpubContent(epub);
        content = chapters.join('\n\n');
      } catch {
        content = await getInternetArchiveText(book.id);
      }
    } else {
      content = await getInternetArchiveText(book.id);
    }
  } else {
    throw new Error('Unsupported book source');
  }

  return { content, epubDoc };
}
