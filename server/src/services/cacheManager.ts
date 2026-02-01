import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let isConnected = false;

// In-memory fallback cache for when Redis is not available
const memoryCache = new Map<string, { data: string; expiry: number }>();

const CACHE_DEFAULTS = {
  BOOK_TTL: 60 * 60 * 24, // 24 hours
  SESSION_TTL: 60 * 60 * 24, // 24 hours
  SEARCH_TTL: 60 * 60, // 1 hour
  PDF_TTL: 60 * 60 * 24, // 24 hours
  INACTIVE_TTL: 60 * 10, // 10 minutes
};

export async function initRedis(): Promise<void> {
  if (client) return;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    client = createClient({ url: redisUrl });

    client.on('error', (err) => {
      console.warn('Redis client error:', err.message);
      isConnected = false;
    });

    client.on('connect', () => {
      console.log('Connected to Redis');
      isConnected = true;
    });

    await client.connect();
  } catch (error) {
    console.warn('Could not connect to Redis, using in-memory cache');
    isConnected = false;
  }
}

export async function get<T>(key: string): Promise<T | null> {
  if (isConnected && client) {
    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      // Fallback to memory cache
    }
  }

  const cached = memoryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return JSON.parse(cached.data);
  }
  memoryCache.delete(key);
  return null;
}

export async function set(key: string, value: unknown, ttl = CACHE_DEFAULTS.BOOK_TTL): Promise<void> {
  const data = JSON.stringify(value);

  if (isConnected && client) {
    try {
      await client.setEx(key, ttl, data);
      return;
    } catch {
      // Fallback to memory cache
    }
  }

  memoryCache.set(key, {
    data,
    expiry: Date.now() + ttl * 1000,
  });
}

export async function del(key: string): Promise<void> {
  if (isConnected && client) {
    try {
      await client.del(key);
    } catch {
      // Ignore
    }
  }
  memoryCache.delete(key);
}

export async function setBookCache(bookId: string, data: unknown): Promise<void> {
  await set(`book:${bookId}`, data, CACHE_DEFAULTS.BOOK_TTL);
}

export async function getBookCache<T>(bookId: string): Promise<T | null> {
  return get<T>(`book:${bookId}`);
}

export async function setSearchCache(query: string, data: unknown): Promise<void> {
  const key = `search:${query.toLowerCase().trim()}`;
  await set(key, data, CACHE_DEFAULTS.SEARCH_TTL);
}

export async function getSearchCache<T>(query: string): Promise<T | null> {
  const key = `search:${query.toLowerCase().trim()}`;
  return get<T>(key);
}

export async function setSessionData(sessionId: string, data: unknown): Promise<void> {
  await set(`session:${sessionId}`, data, CACHE_DEFAULTS.SESSION_TTL);
}

export async function getSessionData<T>(sessionId: string): Promise<T | null> {
  return get<T>(`session:${sessionId}`);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await del(`session:${sessionId}`);
}

export async function setPdfPage(sessionId: string, pageNum: number, data: string): Promise<void> {
  await set(`pdf:${sessionId}:${pageNum}`, data, CACHE_DEFAULTS.PDF_TTL);
}

export async function getPdfPage(sessionId: string, pageNum: number): Promise<string | null> {
  return get<string>(`pdf:${sessionId}:${pageNum}`);
}

export async function updateActivityTimestamp(sessionId: string): Promise<void> {
  const data = await getSessionData(sessionId);
  if (data) {
    await setSessionData(sessionId, { ...data as object, lastActivity: Date.now() });
  }
}

export async function markInactive(sessionId: string): Promise<void> {
  const data = await getSessionData(sessionId);
  if (data) {
    await set(`session:${sessionId}`, data, CACHE_DEFAULTS.INACTIVE_TTL);
  }
}

// Cleanup expired memory cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (value.expiry < now) {
      memoryCache.delete(key);
    }
  }
}, 60 * 1000); // Every minute

export const CACHE_KEYS = {
  BOOK: (id: string) => `book:${id}`,
  SEARCH: (query: string) => `search:${query.toLowerCase().trim()}`,
  SESSION: (id: string) => `session:${id}`,
  PDF_PAGE: (sessionId: string, page: number) => `pdf:${sessionId}:${page}`,
};
