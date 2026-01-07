// utils/performance.ts - Performance optimization utilities
import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// ===== API CACHING =====

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  // Get cached data if still valid
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // Set cache with TTL (default 60 seconds)
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  // Deduplicate in-flight requests
  async dedupedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs: number = 60000
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already in-flight
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    // Make new request
    const promise = fetchFn()
      .then((data) => {
        this.set(key, data, ttlMs);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  // Clear specific cache entry
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Clear cache entries matching a pattern
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const apiCache = new APICache();

// ===== FETCH WITH TIMEOUT =====

/**
 * Fetch with automatic timeout to prevent hanging requests.
 * This is critical for App Store approval - apps should not hang.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 15000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch JSON with timeout, automatic parsing, and error handling.
 */
export async function fetchJSON<T = any>(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Batch fetch with concurrency limit to prevent overwhelming the network.
 * Returns results in the same order as input URLs.
 */
export async function batchFetch<T>(
  urls: string[],
  options: {
    timeout?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<(T | null)[]> {
  const { timeout = 15000, concurrency = 5, onProgress } = options;
  const results: (T | null)[] = new Array(urls.length).fill(null);
  let completed = 0;

  // Process in chunks
  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (url, chunkIndex) => {
      try {
        const data = await fetchJSON<T>(url, { timeout });
        results[i + chunkIndex] = data;
      } catch (e) {
        
        results[i + chunkIndex] = null;
      }
      completed++;
      onProgress?.(completed, urls.length);
    });

    await Promise.all(chunkPromises);
  }

  return results;
}

// ===== DEBOUNCING =====

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, waitMs);
  };
}

// Debounce hook for React
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef<T>(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}

// ===== APP STATE MANAGEMENT (for smart polling) =====

type AppStateCallback = (isActive: boolean) => void;

class AppStateManager {
  private listeners: Set<AppStateCallback> = new Set();
  private currentState: AppStateStatus = AppState.currentState;
  private subscription: any = null;

  constructor() {
    this.subscription = AppState.addEventListener('change', this.handleChange);
  }

  private handleChange = (nextState: AppStateStatus) => {
    const wasActive = this.currentState === 'active';
    const isActive = nextState === 'active';
    this.currentState = nextState;

    // Only notify if active state changed
    if (wasActive !== isActive) {
      this.listeners.forEach((callback) => callback(isActive));
    }
  };

  subscribe(callback: AppStateCallback): () => void {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.currentState === 'active');

    return () => {
      this.listeners.delete(callback);
    };
  }

  isActive(): boolean {
    return this.currentState === 'active';
  }

  destroy() {
    if (this.subscription) {
      this.subscription.remove();
    }
    this.listeners.clear();
  }
}

// Global app state manager
export const appStateManager = new AppStateManager();

// Hook for app state awareness
export function useAppState(): boolean {
  const [isActive, setIsActive] = useState(appStateManager.isActive());

  useEffect(() => {
    return appStateManager.subscribe(setIsActive);
  }, []);

  return isActive;
}

// ===== SMART POLLING HOOK =====

interface UseSmartPollingOptions {
  interval: number; // polling interval in ms
  enabled?: boolean; // whether polling is enabled
  pauseWhenInactive?: boolean; // pause when app is backgrounded
}

export function useSmartPolling(
  callback: () => void | Promise<void>,
  options: UseSmartPollingOptions
): void {
  const { interval, enabled = true, pauseWhenInactive = true } = options;
  const isActive = useAppState();
  const callbackRef = useRef<() => void | Promise<void>>(callback);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Don't poll if disabled
    if (!enabled) return;

    // Don't poll if app is inactive and pauseWhenInactive is true
    if (pauseWhenInactive && !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling
    intervalRef.current = setInterval(() => {
      callbackRef.current();
    }, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval, enabled, pauseWhenInactive, isActive]);
}

// ===== ABORT CONTROLLER HOOK =====

export function useAbortController(): AbortController {
  const controllerRef = useRef<AbortController>(new AbortController());

  useEffect(() => {
    // Create new controller on mount
    controllerRef.current = new AbortController();

    // Abort on unmount
    return () => {
      controllerRef.current.abort();
    };
  }, []);

  return controllerRef.current;
}

// ===== MEMOIZED AUTH TOKEN =====

let cachedAuthToken: { value: string | null; timestamp: number } | null = null;
const AUTH_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedAuthToken(
  getToken: () => Promise<string | null>
): Promise<string | null> {
  const now = Date.now();

  if (cachedAuthToken && now - cachedAuthToken.timestamp < AUTH_TOKEN_TTL) {
    return cachedAuthToken.value;
  }

  const token = await getToken();
  cachedAuthToken = { value: token, timestamp: now };
  return token;
}

export function invalidateAuthTokenCache(): void {
  cachedAuthToken = null;
}

// ===== FLATLIST OPTIMIZATIONS =====

// Standard item heights for getItemLayout
export const ITEM_HEIGHTS = {
  STOCK_ROW: 72,
  POST_ITEM: 180,
  COMMENT_ITEM: 100,
  TRENDING_CARD: 140,
  WATCHLIST_ROW: 68,
} as const;

// Create getItemLayout function for FlatList
export function createGetItemLayout(itemHeight: number) {
  return (_data: any, index: number) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  });
}

// ===== BATCH REQUEST HELPER =====

export async function batchRequests<T>(
  items: string[],
  batchSize: number,
  fetchBatch: (batch: string[]) => Promise<T[]>
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await fetchBatch(batch);
    results.push(...batchResults);
  }

  return results;
}
