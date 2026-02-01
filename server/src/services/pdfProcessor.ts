import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/bookreader-uploads';

export interface PdfSession {
  sessionId: string;
  filePath: string;
  pageCount: number;
  title: string;
  createdAt: number;
  lastAccess: number;
}

// Ensure upload directory exists
export async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function savePdf(buffer: Buffer, originalName: string): Promise<PdfSession> {
  await ensureUploadDir();

  const sessionId = uuidv4();
  const safeFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = path.join(UPLOAD_DIR, `${sessionId}-${safeFileName}`);

  await fs.writeFile(filePath, buffer);

  // For now, we'll estimate page count based on file size
  // In production, you'd use a proper PDF library to get actual page count
  const pageCount = Math.max(1, Math.ceil(buffer.length / 50000));

  const session: PdfSession = {
    sessionId,
    filePath,
    pageCount,
    title: originalName.replace(/\.pdf$/i, ''),
    createdAt: Date.now(),
    lastAccess: Date.now(),
  };

  return session;
}

export async function deletePdf(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting PDF:', error);
  }
}

export async function cleanupOldFiles(maxAge = 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run cleanup periodically
setInterval(() => {
  cleanupOldFiles();
}, 60 * 60 * 1000); // Every hour
