const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  content: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCached(id: string): string | null {
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(id);
    return null;
  }
  return entry.content;
}

export function setCache(id: string, content: string): void {
  cache.set(id, { content, expiresAt: Date.now() + TTL_MS });
}

export function invalidateCache(id: string): void {
  cache.delete(id);
}
