// services/quoteService.ts
// Centralized quote fetching service using Twelve Data API
// FMP is NOT used for stock quotes - only for AI tools and market news

import { getFromMemory, setToMemory, CACHE_KEYS } from '../utils/memoryCache';

const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

// Cache TTL: 5 minutes for chart-synced prices
const CACHE_TTL = 300000;
const BATCH_SIZE = 8; // Twelve Data batch limit

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
 * Fetch quotes from Twelve Data with memory cache support
 * Prioritizes chart-synced prices over API data
 */
export async function fetchQuotesWithCache(
  symbols: string[],
  options: { timeout?: number } = {}
): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  const { timeout = 15000 } = options;

  try {
    const allResults: any[] = [];

    // Fetch in batches of 8 (Twelve Data limit)
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const url = `${TWELVE_DATA_URL}/quote?symbol=${batch.join(',')}&apikey=${TWELVE_DATA_API_KEY}`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) continue;

        const json = await res.json();
        // Single symbol returns object directly, multiple returns keyed object
        const results = batch.length === 1 ? [json] : Object.values(json);
        allResults.push(...(results as any[]));

        // Small delay between batches
        if (i + BATCH_SIZE < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch {
        // Continue with next batch on error
      }
    }

    // Filter out errors and map to Quote interface
    const quotes: Quote[] = allResults
      .filter(item => item && item.symbol && !item.code)
      .map(item => {
        const price = parseFloat(item.close) || 0;
        const previousClose = parseFloat(item.previous_close) || price;
        // Use Twelve Data's pre-calculated values, fall back to manual calc
        const change = parseFloat(item.change) || (previousClose > 0 ? price - previousClose : 0);
        const changesPercentage = parseFloat(item.percent_change) || (previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0);

        return {
          symbol: item.symbol,
          name: item.name || item.symbol,
          price,
          change,
          changesPercentage,
          previousClose,
          dayHigh: parseFloat(item.high) || undefined,
          dayLow: parseFloat(item.low) || undefined,
          volume: parseInt(item.volume) || undefined,
        };
      });

    // Merge with memory cache - prioritize chart-synced prices
    const mergedQuotes = quotes.map((quote: Quote) => {
      // First check for chart-synced quote cache
      const cachedQuote = getFromMemory<any>(CACHE_KEYS.quote(quote.symbol), CACHE_TTL);
      if (cachedQuote?.price && cachedQuote?._chartSynced) {
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
  }
}
