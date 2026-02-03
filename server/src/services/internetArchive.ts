import axios from 'axios';

const IA_API = 'https://archive.org';

export interface IASearchResult {
  responseHeader: {
    status: number;
    QTime: number;
  };
  response: {
    numFound: number;
    start: number;
    docs: IASearchDoc[];
  };
}

export interface IASearchDoc {
  identifier: string;
  title?: string;
  creator?: string | string[];
  date?: string;
  language?: string | string[];
  subject?: string | string[];
  description?: string | string[];
  mediatype?: string;
  downloads?: number;
}

export interface IAMetadata {
  created: number;
  d1: string;
  d2: string;
  dir: string;
  files: IAFile[];
  item_size: number;
  metadata: {
    identifier: string;
    title?: string;
    creator?: string | string[];
    date?: string;
    description?: string | string[];
    language?: string | string[];
    subject?: string | string[];
    mediatype?: string;
    publicdate?: string;
    uploader?: string;
  };
  server: string;
  uniq: number;
}

export interface IAFile {
  name: string;
  source: string;
  format: string;
  size?: string;
  mtime?: string;
  md5?: string;
  crc32?: string;
  sha1?: string;
}

export interface BookFormats {
  epub?: string;
  pdf?: string;
  text?: string;
  html?: string;
  mobi?: string;
}

export interface Book {
  id: string;
  title: string;
  authors: { name: string }[];
  coverUrl?: string;
  description?: string;
  subjects?: string[];
  publishDate?: string;
  publisher?: string;
  language?: string;
  pageCount?: number;
  source: 'internetarchive';
  downloadUrl?: string;
  formats?: BookFormats;
}

/**
 * Search for books on Internet Archive
 */
export async function searchBooks(
  query: string,
  page = 1,
  rows = 20
): Promise<{
  books: IASearchDoc[];
  total: number;
  hasMore: boolean;
}> {
  try {
    // Search for texts (books) with the query in title or creator
    const searchQuery = `mediatype:texts AND (title:"${query}" OR creator:"${query}" OR subject:"${query}")`;

    const response = await axios.get<IASearchResult>(
      `${IA_API}/advancedsearch.php`,
      {
        params: {
          q: searchQuery,
          fl: ['identifier', 'title', 'creator', 'date', 'language', 'subject', 'description', 'downloads'].join(','),
          rows,
          page,
          output: 'json',
          sort: 'downloads desc',
        },
      }
    );

    const total = response.data.response.numFound;
    const docs = response.data.response.docs;

    return {
      books: docs,
      total,
      hasMore: page * rows < total,
    };
  } catch (error) {
    console.error('Internet Archive search error:', error);
    return { books: [], total: 0, hasMore: false };
  }
}

/**
 * Get metadata for a specific item
 */
export async function getItem(identifier: string): Promise<IAMetadata | null> {
  try {
    const response = await axios.get<IAMetadata>(`${IA_API}/metadata/${identifier}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching IA item ${identifier}:`, error);
    return null;
  }
}

/**
 * Get available formats for a book
 */
export async function getAvailableFormats(identifier: string): Promise<BookFormats> {
  const item = await getItem(identifier);
  if (!item) return {};

  const formats: BookFormats = {};

  for (const file of item.files) {
    const name = file.name.toLowerCase();
    const format = file.format?.toLowerCase() || '';

    // Prefer specific formats
    if (format === 'epub' || name.endsWith('.epub')) {
      formats.epub = `${IA_API}/download/${identifier}/${file.name}`;
    } else if (format === 'text' || name.endsWith('.txt')) {
      formats.text = `${IA_API}/download/${identifier}/${file.name}`;
    } else if ((format === 'pdf' || name.endsWith('.pdf')) && !formats.pdf) {
      formats.pdf = `${IA_API}/download/${identifier}/${file.name}`;
    } else if ((format.includes('html') || name.endsWith('.html') || name.endsWith('.htm')) && !formats.html) {
      formats.html = `${IA_API}/download/${identifier}/${file.name}`;
    } else if ((format === 'mobi' || name.endsWith('.mobi')) && !formats.mobi) {
      formats.mobi = `${IA_API}/download/${identifier}/${file.name}`;
    }
  }

  return formats;
}

/**
 * Get cover URL for a book
 */
export function getCoverUrl(identifier: string): string {
  return `${IA_API}/services/img/${identifier}`;
}

/**
 * Get the text content of a book
 */
export async function getBookText(identifier: string): Promise<string | null> {
  const formats = await getAvailableFormats(identifier);

  // Try text format first
  if (formats.text) {
    try {
      const response = await axios.get(formats.text, { responseType: 'text' });
      return response.data;
    } catch (error) {
      console.error('Error fetching text format:', error);
    }
  }

  // Try HTML format as fallback
  if (formats.html) {
    try {
      const response = await axios.get(formats.html, { responseType: 'text' });
      // Strip HTML tags for basic text extraction
      return response.data
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      console.error('Error fetching HTML format:', error);
    }
  }

  return null;
}

/**
 * Transform IA search doc to Book type
 */
export function transformToBook(doc: IASearchDoc): Book {
  const creator = doc.creator;
  const authors = Array.isArray(creator)
    ? creator.map(name => ({ name }))
    : creator
      ? [{ name: creator }]
      : [{ name: 'Unknown' }];

  const description = doc.description;
  const descriptionText = Array.isArray(description)
    ? description.join('\n')
    : description;

  const subjects = doc.subject;
  const subjectList = Array.isArray(subjects)
    ? subjects.slice(0, 5)
    : subjects
      ? [subjects]
      : undefined;

  const language = doc.language;
  const lang = Array.isArray(language) ? language[0] : language;

  return {
    id: doc.identifier,
    title: doc.title || 'Unknown Title',
    authors,
    coverUrl: getCoverUrl(doc.identifier),
    description: descriptionText,
    subjects: subjectList,
    publishDate: doc.date,
    language: lang,
    source: 'internetarchive',
  };
}

/**
 * Transform full IA metadata to Book type
 */
export function transformMetadataToBook(metadata: IAMetadata): Book {
  const meta = metadata.metadata;

  const creator = meta.creator;
  const authors = Array.isArray(creator)
    ? creator.map(name => ({ name }))
    : creator
      ? [{ name: creator }]
      : [{ name: 'Unknown' }];

  const description = meta.description;
  const descriptionText = Array.isArray(description)
    ? description.join('\n')
    : description;

  const subjects = meta.subject;
  const subjectList = Array.isArray(subjects)
    ? subjects.slice(0, 5)
    : subjects
      ? [subjects]
      : undefined;

  const language = meta.language;
  const lang = Array.isArray(language) ? language[0] : language;

  return {
    id: meta.identifier,
    title: meta.title || 'Unknown Title',
    authors,
    coverUrl: getCoverUrl(meta.identifier),
    description: descriptionText,
    subjects: subjectList,
    publishDate: meta.date,
    language: lang,
    source: 'internetarchive',
  };
}
