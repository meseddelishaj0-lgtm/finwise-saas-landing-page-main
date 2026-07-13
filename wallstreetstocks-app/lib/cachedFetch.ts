// lib/cachedFetch.ts
// Stale-while-revalidate JSON fetch cache: memory first, AsyncStorage second,
// network last. Fresh cache returns instantly; stale cache returns instantly
// AND revalidates in the background; network errors fall back to stale data.
// Keeps hot screens (home cards, news, notifications badge) instant on
// re-visits and app relaunch without touching callers' state logic.
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Entry {
  at: number;
  data: any;
}

const mem = new Map<string, Entry>();
const inflight = new Map<string, Promise<any>>();
const STORAGE_PREFIX = 'jsonCache:';
// Never let disk entries pile up forever
const MAX_DISK_AGE = 24 * 60 * 60 * 1000;

async function fetchAndStore(url: string, key: string, init?: RequestInit): Promise<any> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const entry: Entry = { at: Date.now(), data };
      mem.set(key, entry);
      AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry)).catch(() => {});
      return data;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

/**
 * Fetch JSON with a TTL cache.
 * - cache fresher than ttlMs → returned immediately, no network.
 * - stale cache → returned immediately, refreshed in the background.
 * - no cache → network (falls back to any disk copy on failure).
 *
 * `cacheKey` lets callers avoid baking API keys into storage keys.
 */
export async function cachedJson(
  url: string,
  ttlMs: number,
  options?: { init?: RequestInit; cacheKey?: string }
): Promise<any> {
  const key = options?.cacheKey ?? url;
  const now = Date.now();

  const hot = mem.get(key);
  if (hot) {
    if (now - hot.at < ttlMs) return hot.data;
    // stale: serve instantly, revalidate silently
    fetchAndStore(url, key, options?.init).catch(() => {});
    return hot.data;
  }

  // cold start: try disk
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + key);
    if (raw) {
      const entry: Entry = JSON.parse(raw);
      if (now - entry.at < MAX_DISK_AGE) {
        mem.set(key, entry);
        if (now - entry.at < ttlMs) return entry.data;
        fetchAndStore(url, key, options?.init).catch(() => {});
        return entry.data;
      }
    }
  } catch {}

  return fetchAndStore(url, key, options?.init);
}
