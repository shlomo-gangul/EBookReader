import { Router } from 'express';
import multer from 'multer';
import * as ebookConverter from '../services/ebookConverter.js';
import * as cache from '../services/cacheManager.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Configure multer for ebook uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    if (ebookConverter.isSupportedFormat(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only MOBI, AZW, and AZW3 files are allowed'));
    }
  },
});

// Check if calibre is available
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await ebookConverter.checkCalibreAvailable();
    res.json({
      calibreAvailable: isAvailable,
      supportedFormats: ['mobi', 'azw', 'azw3'],
    });
  } catch (error) {
    console.error('Error checking calibre status:', error);
    res.status(500).json({ error: 'Failed to check calibre status' });
  }
});

// Upload and convert MOBI/AZW3 to EPUB
router.post('/convert', uploadRateLimiter, upload.single('ebook'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No ebook file provided' });
    }

    // Check if calibre is available
    const calibreAvailable = await ebookConverter.checkCalibreAvailable();
    if (!calibreAvailable) {
      return res.status(503).json({
        error: 'Calibre is not installed on the server. MOBI/AZW conversion is unavailable.',
        hint: 'Install calibre to enable MOBI/AZW3 conversion: sudo apt install calibre',
      });
    }

    // Convert the ebook
    const session = await ebookConverter.convertEbook(
      req.file.buffer,
      req.file.originalname
    );

    // Store session data in cache
    await cache.setSessionData(session.sessionId, session);

    res.json({
      sessionId: session.sessionId,
      title: session.title,
      format: session.format,
      message: 'Conversion successful',
    });
  } catch (error) {
    console.error('Ebook conversion error:', error);
    const message = error instanceof Error ? error.message : 'Failed to convert ebook';
    res.status(500).json({ error: message });
  }
});

// Get converted EPUB file
router.get('/:sessionId/epub', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await cache.getSessionData<ebookConverter.ConversionSession>(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    const epubBuffer = await ebookConverter.getConvertedEpub(session);

    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(session.title)}.epub"`
    );
    res.send(epubBuffer);
  } catch (error) {
    console.error('Get converted EPUB error:', error);
    res.status(500).json({ error: 'Failed to get converted EPUB' });
  }
});

// Get session info
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await cache.getSessionData<ebookConverter.ConversionSession>(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.sessionId,
      title: session.title,
      format: session.format,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Get ebook session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Delete conversion session
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await cache.getSessionData<ebookConverter.ConversionSession>(sessionId);
    if (session) {
      await ebookConverter.deleteSession(session);
      await cache.deleteSession(sessionId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete ebook session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
