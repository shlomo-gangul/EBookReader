import { Router } from 'express';
import multer from 'multer';
import * as pdfProcessor from '../services/pdfProcessor.js';
import * as cache from '../services/cacheManager.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Configure multer for PDF uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Upload PDF
router.post('/upload', uploadRateLimiter, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const session = await pdfProcessor.savePdf(req.file.buffer, req.file.originalname);

    // Store session data in cache
    await cache.setSessionData(session.sessionId, session);

    res.json({
      sessionId: session.sessionId,
      pageCount: session.pageCount,
      title: session.title,
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: 'Failed to upload PDF' });
  }
});

// Get PDF page
router.get('/:sessionId/page/:pageNum', async (req, res) => {
  try {
    const { sessionId, pageNum } = req.params;

    // Check if session exists
    const session = await cache.getSessionData<pdfProcessor.PdfSession>(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const page = parseInt(pageNum, 10);
    if (isNaN(page) || page < 1 || page > session.pageCount) {
      return res.status(400).json({ error: 'Invalid page number' });
    }

    // Update activity timestamp
    await cache.updateActivityTimestamp(sessionId);

    // Check cache for rendered page
    const cachedPage = await cache.getPdfPage(sessionId, page);
    if (cachedPage) {
      return res.json({ imageUrl: cachedPage });
    }

    // For now, return a placeholder response
    // In production, you'd render the PDF page to an image using pdf.js or similar
    res.json({
      imageUrl: null,
      message: 'PDF rendering should be done client-side',
      pageNumber: page,
      totalPages: session.pageCount,
    });
  } catch (error) {
    console.error('Get PDF page error:', error);
    res.status(500).json({ error: 'Failed to get PDF page' });
  }
});

// Get PDF session info
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await cache.getSessionData<pdfProcessor.PdfSession>(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.sessionId,
      pageCount: session.pageCount,
      title: session.title,
    });
  } catch (error) {
    console.error('Get PDF session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Delete PDF session
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await cache.getSessionData<pdfProcessor.PdfSession>(sessionId);
    if (session) {
      await pdfProcessor.deletePdf(session.filePath);
      await cache.deleteSession(sessionId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete PDF session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
