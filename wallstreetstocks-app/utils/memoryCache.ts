// utils/memoryCache.ts
// In-memory cache for instant data access (no async delay)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Simple in-memory storage
const cache: Map<string, CacheEntry<any>> = new Map();

// Default TTL: 2 minutes for memory cache
const DEFAULT_TTL = 2 * 60 * 1000;

// Get from memory cache (synchronous - instant!)
export function getFromMemory<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

// Set to memory cache
export function setToMemory<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Clear specific key
export function clearFromMemory(key: string): void {
  cache.delete(key);
}

// Clear all cache
export function clearAllMemory(): void {
  cache.clear();
}

// Pre-defined cache keys
export const CACHE_KEYS = {
  quote: (symbol: string) => `mem_quote_${symbol}`,
  chart: (symbol: string, period: string) => `mem_chart_${symbol}_${period}`,
  news: (symbol: string) => `mem_news_${symbol}`,
  sentiment: (symbol: string) => `mem_sentiment_${symbol}`,
};

// Bulk set for list pre-fetching
export function setQuotes(quotes: Array<{ symbol: string; [key: string]: any }>): void {
  quotes.forEach(quote => {
    if (quote.symbol) {
      setToMemory(CACHE_KEYS.quote(quote.symbol), quote);
    }
  });
}
