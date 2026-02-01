import { Router } from 'express';
import * as cache from '../services/cacheManager.js';

const router = Router();

interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  lastRead: string;
  bookmarks: Array<{
    id: string;
    page: number;
    note?: string;
    createdAt: string;
  }>;
}

// Save reading progress
router.post('/progress', async (req, res) => {
  try {
    const progress: ReadingProgress = req.body;

    if (!progress.bookId) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    await cache.set(`progress:${progress.bookId}`, progress, 60 * 60 * 24 * 30); // 30 days

    res.json({ success: true });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// Get reading progress
router.get('/progress/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;

    const progress = await cache.get<ReadingProgress>(`progress:${bookId}`);

    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    res.json(progress);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// End session and cleanup
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    await cache.deleteSession(sessionId);

    res.json({ success: true });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Mark session as inactive
router.post('/:sessionId/inactive', async (req, res) => {
  try {
    const { sessionId } = req.params;

    await cache.markInactive(sessionId);

    res.json({ success: true });
  } catch (error) {
    console.error('Mark inactive error:', error);
    res.status(500).json({ error: 'Failed to mark inactive' });
  }
});

export default router;
