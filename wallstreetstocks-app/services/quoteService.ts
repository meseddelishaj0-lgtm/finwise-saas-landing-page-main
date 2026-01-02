// services/quoteService.ts
// Centralized quote fetching service with memory cache support
// Ensures all tabs display prices synced with chart data

import { getFromMemory, setToMemory, CACHE_KEYS } from '../utils/memoryCache';

const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Cache TTL: 5 minutes for chart-synced prices
const CACHE_TTL = 300000;

export interface Quote {
  symbol: string;
  name?: string;
  price: number;
  change?: number;
  changesPercentage?: number;
  previousClose?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  marketCap?: number;
  [key: string]: any;
}

/**
 * Fetch quotes with memory cache support
 * Prioritizes chart-synced prices over FMP API data
 *
 * @param symbols - Array of stock symbols to fetch
 * @param options - Optional configuration
 * @returns Array of quotes with cached prices where available
 */
export async function fetchQuotesWithCache(
  symbols: string[],
  options: { timeout?: number } = {}
): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  const { timeout = 15000 } = options;

  try {
    const symbolsParam = symbols.join(',');

    // Fetch from FMP API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(
      `${BASE_URL}/quote/${symbolsParam}?apikey=${FMP_API_KEY}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`FMP API returned ${res.status}`);
    }

    const data = await res.json();
    const quotes: Quote[] = Array.isArray(data) ? data : [];

    // Merge with memory cache - prioritize chart-synced prices
    const mergedQuotes = quotes.map((quote: Quote) => {
      // First check for chart-synced quote cache
      const cachedQuote = getFromMemory<any>(CACHE_KEYS.quote(quote.symbol), CACHE_TTL);
      if (cachedQuote?.price && cachedQuote?._chartSynced) {
        // Use chart-synced price (most accurate)
        return {
          ...quote,
          price: cachedQuote.price,
          change: cachedQuote.change ?? quote.change,
          changesPercentage: cachedQuote.changesPercentage ?? quote.changesPercentage,
          _fromCache: true,
        };
      }

      // Check chart data cache as fallback
      const cachedChart = getFromMemory<any[]>(CACHE_KEYS.chart(quote.symbol, '1D'), CACHE_TTL);
      if (cachedChart && Array.isArray(cachedChart) && cachedChart.length > 0) {
        const lastPoint = cachedChart[cachedChart.length - 1];
        const lastPrice = lastPoint?.value;
        if (lastPrice && typeof lastPrice === 'number') {
          return {
            ...quote,
            price: lastPrice,
            _fromCache: true,
          };
        }
      }

      // Fall back to regular cached quote (without chart-sync flag)
      if (cachedQuote?.price) {
        return {
          ...quote,
          price: cachedQuote.price,
          change: cachedQuote.change ?? quote.change,
          changesPercentage: cachedQuote.changesPercentage ?? quote.changesPercentage,
          _fromCache: true,
        };
      }

      return quote;
    });

    return mergedQuotes;
  } catch (error) {
    console.error('Quote fetch error:', error);

    // On error, try to return cached data
    const cachedQuotes: Quote[] = [];
    for (const symbol of symbols) {
      const cached = getFromMemory<any>(CACHE_KEYS.quote(symbol), CACHE_TTL);
      if (cached) {
        cachedQuotes.push({ ...cached, _fromCache: true });
      }
    }
    return cachedQuotes;
  }
}

/**
 * Get a single quote with cache support
 */
export async function fetchQuoteWithCache(symbol: string): Promise<Quote | null> {
  const quotes = await fetchQuotesWithCache([symbol]);
  return quotes[0] || null;
}

/**
 * Check if we have a cached price for a symbol
 * Useful for instant display before fetch completes
 */
export function getCachedPrice(symbol: string): number | null {
  // Check chart-synced quote first
  const cachedQuote = getFromMemory<any>(CACHE_KEYS.quote(symbol), CACHE_TTL);
  if (cachedQuote?.price) {
    return cachedQuote.price;
  }

  // Check chart data
  const cachedChart = getFromMemory<any[]>(CACHE_KEYS.chart(symbol, '1D'), CACHE_TTL);
  if (cachedChart && cachedChart.length > 0) {
    const lastPoint = cachedChart[cachedChart.length - 1];
    if (lastPoint?.value && typeof lastPoint.value === 'number') {
      return lastPoint.value;
    }
  }

  return null;
}

/**
 * Prefetch quotes into memory cache (for preloading)
 */
export async function prefetchQuotes(symbols: string[]): Promise<void> {
  try {
    const quotes = await fetchQuotesWithCache(symbols);
    // Store in memory cache for future use
    quotes.forEach(quote => {
      if (!quote._fromCache) {
        // Only cache if it wasn't already from cache
        const existing = getFromMemory<any>(CACHE_KEYS.quote(quote.symbol));
        if (!existing?._chartSynced) {
          setToMemory(CACHE_KEYS.quote(quote.symbol), quote);
        }
      }
    });
  } catch (error) {
    console.warn('Prefetch error:', error);
  }
}
