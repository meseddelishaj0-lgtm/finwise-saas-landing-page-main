// services/dailyCloseService.ts
// Centralized service to fetch correct regular session close prices
// Fixes Twelve Data's /quote previous_close which includes after-hours

import AsyncStorage from '@react-native-async-storage/async-storage';
import { priceStore } from '../stores/priceStore';

const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';
const STORAGE_KEY = '@daily_close_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const REQUEST_DELAY = 150; // ms between /eod requests

// In-memory cache: symbol -> { close, date, timestamp }
const cache = new Map<string, { close: number; date: string; timestamp: number }>();

// Get today's trading date string for cache invalidation
function getTradingDate(): string {
  const now = new Date();
  const eastern = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return eastern; // "MM/DD/YYYY"
}

// Check if a symbol is crypto (skip /eod for these)
function isCrypto(symbol: string): boolean {
  return symbol.includes('/') || (symbol.endsWith('USD') && symbol.length <= 10 && !symbol.includes('.'));
}

/**
 * Load persisted daily close cache from AsyncStorage
 * Call this early on app startup for instant corrections on warm start
 */
export async function initDailyCloseCache(): Promise<void> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return;

    const stored = JSON.parse(json);
    const today = getTradingDate();

    // Only restore entries from today
    for (const [symbol, entry] of Object.entries(stored)) {
      const e = entry as { close: number; date: string; timestamp: number };
      if (e.date === today && e.close > 0) {
        cache.set(symbol, e);
      }
    }

    // Apply cached corrections to priceStore immediately
    if (cache.size > 0) {
      applyCacheToStore();
    }
  } catch {
    // Ignore cache errors
  }
}

/**
 * Apply all cached daily close values to priceStore
 */
function applyCacheToStore(): void {
  for (const [symbol, entry] of cache) {
    const quote = priceStore.getQuote(symbol);
    if (quote && quote.price > 0 && entry.close > 0) {
      const change = quote.price - entry.close;
      const changePercent = (change / entry.close) * 100;
      priceStore.setQuote({
        symbol,
        price: quote.price,
        change,
        changePercent,
        previousClose: entry.close,
        previousCloseSource: 'eod',
      });
    }
  }
}

/**
 * Save cache to AsyncStorage for persistence
 */
async function persistCache(): Promise<void> {
  try {
    const obj: Record<string, { close: number; date: string; timestamp: number }> = {};
    for (const [symbol, entry] of cache) {
      obj[symbol] = entry;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore
  }
}

/**
 * Fetch correct regular session close for symbols and update priceStore
 * Uses /eod endpoint which returns the official close (not after-hours)
 * Skips crypto symbols automatically
 */
export async function correctPreviousCloses(
  symbols: string[]
): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};

  const today = getTradingDate();
  const result: Record<string, number> = {};
  const toFetch: string[] = [];

  // Check cache and filter crypto
  for (const sym of symbols) {
    if (isCrypto(sym)) continue;

    const cached = cache.get(sym);
    if (cached && cached.date === today && Date.now() - cached.timestamp < CACHE_TTL) {
      result[sym] = cached.close;
      continue;
    }
    toFetch.push(sym);
  }

  // Apply already-cached results to priceStore
  for (const [sym, close] of Object.entries(result)) {
    const quote = priceStore.getQuote(sym);
    if (quote && quote.price > 0 && close > 0 && quote.previousCloseSource !== 'eod') {
      const change = quote.price - close;
      const changePercent = (change / close) * 100;
      priceStore.setQuote({
        symbol: sym,
        price: quote.price,
        change,
        changePercent,
        previousClose: close,
        previousCloseSource: 'eod',
      });
    }
  }

  // Fetch uncached symbols from /eod
  for (let i = 0; i < toFetch.length; i++) {
    const sym = toFetch[i];
    try {
      const url = `${TWELVE_DATA_URL}/eod?symbol=${encodeURIComponent(sym)}&apikey=${TWELVE_DATA_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const json = await res.json();

      if (json?.close) {
        const close = parseFloat(json.close);
        if (close > 0) {
          result[sym] = close;
          cache.set(sym, { close, date: today, timestamp: Date.now() });

          // Update priceStore immediately
          const quote = priceStore.getQuote(sym);
          if (quote && quote.price > 0) {
            const change = quote.price - close;
            const changePercent = (change / close) * 100;
            priceStore.setQuote({
              symbol: sym,
              price: quote.price,
              change,
              changePercent,
              previousClose: close,
              previousCloseSource: 'eod',
            });
          }
        }
      }
    } catch {
      // Skip symbol on error
    }

    // Delay between requests
    if (i < toFetch.length - 1) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  // Persist cache in background
  if (toFetch.length > 0) {
    persistCache().catch(() => {});
  }

  return result;
}
