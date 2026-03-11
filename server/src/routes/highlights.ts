import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import * as database from '../services/database.js';
import { CreateHighlightSchema } from '../schemas/highlights.js';

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

  let parsed;
  try {
    parsed = CreateHighlightSchema.parse(req.body);
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid input' });
    }
    throw err;
  }

  const { id, bookId, pageNumber, startChar, endChar, color, note, createdAt } = parsed;

  database.saveHighlight(
    id,
    userId,
    bookId,
    pageNumber,
    startChar,
    endChar,
    color,
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
