import { Router } from 'express';
import jwt from 'jsonwebtoken';
import * as database from '../services/database.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function getUserId(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// GET /api/highlights/:bookId
router.get('/:bookId', (req, res) => {
  const userId = getUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const rows = database.getHighlights(userId, req.params.bookId);
  const highlights = rows.map((r) => ({
    id: r.id,
    bookId: r.book_id,
    pageNumber: r.page_number,
    startChar: r.start_char,
    endChar: r.end_char,
    color: r.color,
    note: r.note ?? undefined,
    createdAt: r.created_at,
  }));
  return res.json({ highlights });
});

// POST /api/highlights
router.post('/', (req, res) => {
  const userId = getUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id, bookId, pageNumber, startChar, endChar, color, note, createdAt } = req.body;

  if (!id || !bookId || pageNumber == null || startChar == null || endChar == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  database.saveHighlight(
    id,
    userId,
    bookId,
    pageNumber,
    startChar,
    endChar,
    color ?? '#fef08a',
    note ?? null,
    createdAt ?? new Date().toISOString()
  );

  return res.json({ success: true });
});

// DELETE /api/highlights/:id
router.delete('/:id', (req, res) => {
  const userId = getUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  database.deleteHighlight(req.params.id, userId);
  return res.json({ success: true });
});

export default router;
