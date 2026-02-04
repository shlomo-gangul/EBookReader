import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/bookreader-uploads';
const CONVERTED_DIR = path.join(UPLOAD_DIR, 'converted');

export interface ConversionSession {
  sessionId: string;
  originalPath: string;
  convertedPath: string;
  originalName: string;
  format: 'mobi' | 'azw3' | 'azw';
  title: string;
  createdAt: number;
}

export type SupportedFormat = 'mobi' | 'azw3' | 'azw';

const SUPPORTED_EXTENSIONS: Record<string, SupportedFormat> = {
  '.mobi': 'mobi',
  '.azw3': 'azw3',
  '.azw': 'azw',
};

/**
 * Check if calibre's ebook-convert is available
 */
export async function checkCalibreAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('ebook-convert', ['--version']);
    process.on('error', () => resolve(false));
    process.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Ensure required directories exist
 */
export async function ensureDirectories(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  try {
    await fs.access(CONVERTED_DIR);
  } catch {
    await fs.mkdir(CONVERTED_DIR, { recursive: true });
  }
}

/**
 * Check if a file extension is a supported ebook format
 */
export function isSupportedFormat(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ext in SUPPORTED_EXTENSIONS;
}

/**
 * Get the format type from a filename
 */
export function getFormatFromFilename(filename: string): SupportedFormat | null {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS[ext] || null;
}

/**
 * Save uploaded ebook file and convert to EPUB
 */
export async function convertEbook(
  buffer: Buffer,
  originalName: string
): Promise<ConversionSession> {
  await ensureDirectories();

  const format = getFormatFromFilename(originalName);
  if (!format) {
    throw new Error(`Unsupported format: ${path.extname(originalName)}`);
  }

  const sessionId = uuidv4();
  const safeFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const ext = path.extname(originalName).toLowerCase();

  const originalPath = path.join(UPLOAD_DIR, `${sessionId}-${safeFileName}`);
  const convertedFileName = safeFileName.replace(new RegExp(`${ext}$`, 'i'), '.epub');
  const convertedPath = path.join(CONVERTED_DIR, `${sessionId}-${convertedFileName}`);

  // Save the original file
  await fs.writeFile(originalPath, buffer);

  // Convert using calibre's ebook-convert
  await convertWithCalibre(originalPath, convertedPath);

  const session: ConversionSession = {
    sessionId,
    originalPath,
    convertedPath,
    originalName,
    format,
    title: originalName.replace(new RegExp(`${ext}$`, 'i'), ''),
    createdAt: Date.now(),
  };

  return session;
}

/**
 * Convert ebook using calibre's ebook-convert CLI
 */
function convertWithCalibre(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn('ebook-convert', [inputPath, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('error', (error) => {
      reject(new Error(`Failed to start ebook-convert: ${error.message}. Is calibre installed?`));
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ebook-convert failed with code ${code}: ${stderr}`));
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      process.kill();
      reject(new Error('Conversion timed out after 60 seconds'));
    }, 60000);
  });
}

/**
 * Get the converted EPUB file as a buffer
 */
export async function getConvertedEpub(session: ConversionSession): Promise<Buffer> {
  return fs.readFile(session.convertedPath);
}

/**
 * Delete conversion session files
 */
export async function deleteSession(session: ConversionSession): Promise<void> {
  try {
    await fs.unlink(session.originalPath);
  } catch (error) {
    console.error('Error deleting original file:', error);
  }

  try {
    await fs.unlink(session.convertedPath);
  } catch (error) {
    console.error('Error deleting converted file:', error);
  }
}

/**
 * Cleanup old conversion files
 */
export async function cleanupOldFiles(maxAge = 24 * 60 * 60 * 1000): Promise<void> {
  const dirs = [UPLOAD_DIR, CONVERTED_DIR];
  const now = Date.now();

  for (const dir of dirs) {
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        // Skip subdirectories
        if (file === 'converted') continue;

        const filePath = path.join(dir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile() && now - stats.mtimeMs > maxAge) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old conversion file: ${file}`);
          }
        } catch {
          // Skip files that can't be accessed
        }
      }
    } catch (error) {
      console.error(`Error during cleanup in ${dir}:`, error);
    }
  }
}

// Run cleanup periodically
setInterval(() => {
  cleanupOldFiles();
}, 60 * 60 * 1000); // Every hour
