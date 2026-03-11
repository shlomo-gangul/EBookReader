import { z } from 'zod';

// Highlight
export const HighlightSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  pageNumber: z.number(),
  startChar: z.number(),
  endChar: z.number(),
  color: z.string(),
  note: z.string().optional(),
  createdAt: z.string(),
});
export const HighlightArraySchema = z.object({
  highlights: z.array(HighlightSchema),
});

// Auth
export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
  createdAt: z.string(),
});
export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});

// Reading progress
export const ReadingProgressSchema = z.object({
  bookId: z.string(),
  currentPage: z.number(),
  totalPages: z.number(),
  percentage: z.number(),
  lastRead: z.string(),
});

// Book (server search result)
const BookSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.object({ name: z.string(), key: z.string().optional() })),
  coverUrl: z.string().optional(),
  description: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  publishDate: z.string().optional(),
  publisher: z.string().optional(),
  language: z.string().optional(),
  pageCount: z.number().optional(),
  source: z.enum(['openlibrary', 'gutenberg', 'pdf', 'internetarchive', 'epub']),
  downloadUrl: z.string().optional(),
  formats: z.object({
    epub: z.string().optional(),
    html: z.string().optional(),
    text: z.string().optional(),
    pdf: z.string().optional(),
  }).optional(),
});
export const SearchResultSchema = z.object({
  books: z.array(BookSchema),
  total: z.number(),
  page: z.number(),
  hasMore: z.boolean(),
});

// Dictionary (dictionaryapi.dev)
export const DictionaryEntrySchema = z.object({
  word: z.string(),
  phonetic: z.string().optional(),
  meanings: z.array(z.object({
    partOfSpeech: z.string(),
    definitions: z.array(z.object({
      definition: z.string(),
    })),
  })),
});

export type DictionaryEntry = z.infer<typeof DictionaryEntrySchema>;
