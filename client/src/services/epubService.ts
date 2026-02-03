import ePub, { Book as EpubBook } from 'epubjs';

export interface EpubDocument {
  book: EpubBook;
  spine: SpineItem[];
  metadata: EpubMetadata;
  destroy: () => void;
}

export interface SpineItem {
  id: string;
  href: string;
  index: number;
}

export interface EpubMetadata {
  title: string;
  creator: string;
  description?: string;
  pubdate?: string;
  publisher?: string;
  identifier?: string;
  language?: string;
  cover?: string;
}

export interface EpubChapter {
  id: string;
  title: string;
  content: string;
}

/**
 * Load an EPUB from a URL
 */
export async function loadEpub(url: string): Promise<EpubDocument> {
  const book = ePub(url);
  await book.ready;

  const metadata = await extractMetadata(book);
  const spine = extractSpine(book);

  return {
    book,
    spine,
    metadata,
    destroy: () => book.destroy(),
  };
}

/**
 * Load an EPUB from a File object
 */
export async function loadEpubFromFile(file: File): Promise<EpubDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;

  const metadata = await extractMetadata(book);
  const spine = extractSpine(book);

  return {
    book,
    spine,
    metadata,
    destroy: () => book.destroy(),
  };
}

/**
 * Extract metadata from the EPUB
 */
async function extractMetadata(book: EpubBook): Promise<EpubMetadata> {
  const metadata = await book.loaded.metadata;

  let coverUrl: string | undefined;
  try {
    const cover = await book.coverUrl();
    if (cover) {
      coverUrl = cover;
    }
  } catch {
    // Cover not available
  }

  return {
    title: metadata.title || 'Unknown Title',
    creator: metadata.creator || 'Unknown Author',
    description: metadata.description,
    pubdate: metadata.pubdate,
    publisher: metadata.publisher,
    identifier: metadata.identifier,
    language: metadata.language,
    cover: coverUrl,
  };
}

/**
 * Extract spine items from the EPUB
 */
function extractSpine(book: EpubBook): SpineItem[] {
  const items: SpineItem[] = [];

  book.spine.each((item: any, index: number) => {
    items.push({
      id: item.idref || item.id || `spine-${index}`,
      href: item.href,
      index,
    });
  });

  return items;
}

/**
 * Get the content of all chapters as an array of strings
 */
export async function getEpubContent(doc: EpubDocument): Promise<string[]> {
  const contents: string[] = [];

  for (const item of doc.spine) {
    try {
      const section = doc.book.spine.get(item.href);
      if (section) {
        await section.load(doc.book.load.bind(doc.book));
        const document = section.document;

        if (document && document.body) {
          // Extract text content, preserving paragraph structure
          const text = extractTextFromElement(document.body);
          if (text.trim()) {
            contents.push(text);
          }
        }
      }
    } catch (error) {
      console.error(`Error loading spine item ${item.href}:`, error);
    }
  }

  return contents;
}

/**
 * Extract text from an HTML element, preserving paragraph structure
 */
function extractTextFromElement(element: Element): string {
  const blocks: string[] = [];
  const blockTags = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE']);

  function traverse(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push(text);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName;

      // Skip script and style tags
      if (tagName === 'SCRIPT' || tagName === 'STYLE') {
        return;
      }

      // Handle block-level elements
      if (blockTags.has(tagName)) {
        const children: string[] = [];
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim();
            if (text) children.push(text);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as Element;
            if (childEl.tagName !== 'SCRIPT' && childEl.tagName !== 'STYLE') {
              const text = childEl.textContent?.trim();
              if (text) children.push(text);
            }
          }
        });

        const blockText = children.join(' ').trim();
        if (blockText) {
          blocks.push(blockText);
        }
      } else {
        // For non-block elements, traverse children
        el.childNodes.forEach(child => traverse(child));
      }
    }
  }

  traverse(element);
  return blocks.join('\n\n');
}

/**
 * Get EPUB metadata
 */
export async function getEpubMetadata(doc: EpubDocument): Promise<EpubMetadata> {
  return doc.metadata;
}

/**
 * Get table of contents
 */
export async function getTableOfContents(doc: EpubDocument): Promise<{ title: string; href: string }[]> {
  const navigation = await doc.book.loaded.navigation;

  const toc: { title: string; href: string }[] = [];

  if (navigation.toc) {
    navigation.toc.forEach((item: any) => {
      toc.push({
        title: item.label || 'Untitled',
        href: item.href,
      });
    });
  }

  return toc;
}
