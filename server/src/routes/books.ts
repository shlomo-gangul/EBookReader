import { Router } from 'express';
import * as openLibrary from '../services/openLibrary.js';
import * as gutenberg from '../services/gutenberg.js';
import * as cache from '../services/cacheManager.js';

const router = Router();

// Search books from both sources
router.get('/search', async (req, res) => {
  try {
    const { q, page = '1', source } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const pageNum = parseInt(page as string, 10) || 1;

    // Check cache first
    const cacheKey = `${q}-${pageNum}-${source || 'all'}`;
    const cached = await cache.getSearchCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    type BookType = ReturnType<typeof openLibrary.transformToBook> | ReturnType<typeof gutenberg.transformToBook>;
    let allBooks: BookType[] = [];
    let total = 0;
    let hasMore = false;

    if (!source || source === 'all' || source === 'gutenberg') {
      try {
        const gutenbergResult = await gutenberg.searchBooks(q, pageNum);
        const gutenbergBooks = gutenbergResult.books.map(gutenberg.transformToBook);
        allBooks = [...allBooks, ...gutenbergBooks];
        total += gutenbergResult.total;
        hasMore = hasMore || gutenbergResult.hasMore;
      } catch (error) {
        console.error('Gutenberg search error:', error);
      }
    }

    if (!source || source === 'all' || source === 'openlibrary') {
      try {
        const olResult = await openLibrary.searchBooks(q, pageNum);
        const olBooks = olResult.books.map(openLibrary.transformToBook);
        allBooks = [...allBooks, ...olBooks];
        total += olResult.total;
        hasMore = hasMore || olResult.hasMore;
      } catch (error) {
        console.error('Open Library search error:', error);
      }
    }

    const result = {
      books: allBooks,
      total,
      page: pageNum,
      hasMore,
    };

    // Cache the result
    await cache.setSearchCache(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get book details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { source } = req.query;

    // Check cache first
    const cached = await cache.getBookCache(`${source}-${id}`);
    if (cached) {
      return res.json(cached);
    }

    let book;

    if (source === 'gutenberg') {
      const gutenbergBook = await gutenberg.getBook(id);
      if (gutenbergBook) {
        book = gutenberg.transformToBook(gutenbergBook);
      }
    } else if (source === 'openlibrary') {
      const work = await openLibrary.getWork(id);
      if (work) {
        book = {
          id,
          title: work.title,
          description: typeof work.description === 'string'
            ? work.description
            : work.description?.value,
          subjects: work.subjects,
          coverUrl: work.covers?.[0]
            ? openLibrary.getCoverUrl(work.covers[0], 'L')
            : undefined,
          source: 'openlibrary',
        };
      }
    }

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Cache the book
    await cache.setBookCache(`${source}-${id}`, book);

    res.json(book);
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Failed to get book' });
  }
});

// Get Gutenberg book text content
router.get('/gutenberg/:id/text', async (req, res) => {
  try {
    const { id } = req.params;

    // Check cache first
    const cached = await cache.get<string>(`gutenberg-text-${id}`);
    if (cached) {
      return res.json({ content: cached });
    }

    const text = await gutenberg.getBookText(id);

    if (!text) {
      return res.status(404).json({ error: 'Book text not found' });
    }

    // Cache the text
    await cache.set(`gutenberg-text-${id}`, text, 60 * 60 * 24); // 24 hours

    res.json({ content: text });
  } catch (error) {
    console.error('Get book text error:', error);
    res.status(500).json({ error: 'Failed to get book text' });
  }
});

// Get book content by chapter
router.get('/:id/content/:chapter', async (req, res) => {
  try {
    const { id, chapter } = req.params;
    const { source } = req.query;

    // For now, return the full text since we don't have chapter info
    // In a full implementation, you'd parse the book and split by chapters

    if (source === 'gutenberg') {
      const text = await gutenberg.getBookText(id);
      if (!text) {
        return res.status(404).json({ error: 'Content not found' });
      }
      res.json({ content: text });
    } else {
      res.status(400).json({ error: 'Content not available for this source' });
    }
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

export default router;
