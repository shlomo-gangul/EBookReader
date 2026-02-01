import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import booksRouter from './routes/books.js';
import pdfRouter from './routes/pdf.js';
import sessionRouter from './routes/session.js';
import authRouter from './routes/auth.js';
import { rateLimiter } from './middleware/rateLimit.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(rateLimiter);

// Routes
app.use('/api/books', booksRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/session', sessionRouter);
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
