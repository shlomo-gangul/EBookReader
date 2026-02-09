import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as database from '../services/database.js';
import { strictRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  lastRead: string;
}

// Register
router.post('/register', strictRateLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = database.getUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    database.createUser(id, email.toLowerCase(), passwordHash, name, createdAt);

    const token = jwt.sign({ userId: id, email: email.toLowerCase() }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    res.json({
      token,
      user: {
        id,
        email: email.toLowerCase(),
        name,
        createdAt,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', strictRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = database.getUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout (optional - just for clearing server-side sessions if needed)
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

// Get current user
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      const user = database.getUserById(decoded.userId);

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get all reading progress for authenticated user
router.get('/progress', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const rows = database.getAllProgress(decoded.userId);

      const progress = rows.map((r) => ({
        bookId: r.book_id,
        currentPage: r.current_page,
        totalPages: r.total_pages,
        percentage: r.percentage,
        lastRead: r.last_read,
      }));

      res.json({ progress });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Sync reading progress from client
router.post('/sync', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const { progress } = req.body as { progress: ReadingProgress[] };

      if (!Array.isArray(progress)) {
        return res.status(400).json({ error: 'Progress must be an array' });
      }

      database.saveProgressBatch(decoded.userId, progress);

      res.json({ success: true, synced: progress.length });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

export default router;
