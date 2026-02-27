// utils/preload.ts
// Pre-load popular stocks data on app startup for instant loading
// Uses Twelve Data API (not FMP) for stock quotes

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setToMemory, CACHE_KEYS } from './memoryCache';
import { priceStore } from '../stores/priceStore';

const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';
const QUOTE_CACHE_PREFIX = 'quote_cache_';
const PRELOAD_KEY = 'last_preload_time';
const PRELOAD_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 8;

// Popular stocks to pre-load
const POPULAR_SYMBOLS = [
  // Major ETFs
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI',
  // Mega caps
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  // Popular tech
  'AMD', 'NFLX', 'CRM', 'COIN',
];

interface Quote {
  symbol: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  name: string;
}

// Check if we should preload (avoid too frequent preloads)
async function shouldPreload(): Promise<boolean> {
  try {
    const lastPreload = await AsyncStorage.getItem(PRELOAD_KEY);
    if (!lastPreload) return true;

    const lastTime = parseInt(lastPreload, 10);
    return Date.now() - lastTime > PRELOAD_INTERVAL;
  } catch {
    return true;
  }
}

// Pre-load popular stock quotes using Twelve Data
export async function preloadPopularStocks(): Promise<void> {
  try {
    // Check if we should preload
    const shouldRun = await shouldPreload();
    if (!shouldRun) {
      return;
    }

    const allResults: any[] = [];

    // Fetch in batches of 8
    for (let i = 0; i < POPULAR_SYMBOLS.length; i += BATCH_SIZE) {
      const batch = POPULAR_SYMBOLS.slice(i, i + BATCH_SIZE);
      const url = `${TWELVE_DATA_URL}/quote?symbol=${batch.join(',')}&apikey=${TWELVE_DATA_API_KEY}`;

      try {
        const res = await fetch(url);
        if (!res.ok) continue;

        const json = await res.json();
        const results = batch.length === 1 ? [json] : Object.values(json);
        allResults.push(...(results as any[]));

        if (i + BATCH_SIZE < POPULAR_SYMBOLS.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch {
        // Continue with next batch
      }
    }

    const quotes: Quote[] = allResults
      .filter(item => item && item.symbol && !item.code)
      .map(item => {
        const price = parseFloat(item.close) || 0;
        const previousClose = parseFloat(item.previous_close) || price;
        const change = previousClose > 0 ? price - previousClose : 0;
        const changesPercentage = previousClose > 0 ? (change / previousClose) * 100 : 0;

        return {
          symbol: item.symbol,
          name: item.name || item.symbol,
          price,
          change,
          changesPercentage,
          previousClose,
          dayHigh: parseFloat(item.high) || 0,
          dayLow: parseFloat(item.low) || 0,
        };
      });

    if (quotes.length === 0) return;

    // Cache each quote and store in priceStore
    quotes.forEach(quote => {
      // Memory cache for instant access
      setToMemory(CACHE_KEYS.quote(quote.symbol), quote);

      // Also seed priceStore with previousClose for accurate WebSocket updates
      priceStore.setQuote({
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changesPercentage,
        previousClose: quote.previousClose,
        name: quote.name,
      });
    });

    // Also save to AsyncStorage for persistence
    const cachePromises = quotes.map(quote =>
      AsyncStorage.setItem(
        `${QUOTE_CACHE_PREFIX}${quote.symbol}`,
        JSON.stringify({
          data: { ...quote, timestamp: Date.now() },
          timestamp: Date.now()
        })
      )
    );

    await Promise.all(cachePromises);

    // Update last preload time
    await AsyncStorage.setItem(PRELOAD_KEY, Date.now().toString());
  } catch (err) {
    // Silently handle preload errors
  }
}

// Main preload function - call this on app startup
// IMPORTANT: This function now runs in the background without blocking
export async function preloadAppData(): Promise<void> {
  // Delay heavy loading to let the UI render first
  // This prevents the app from becoming unresponsive on startup
  setTimeout(async () => {
    try {
      // Import market data service dynamically to avoid circular deps
      const { marketDataService } = await import('../services/marketDataService');

      // Initialize market data service (Robinhood-style pre-loading)
      // This loads stocks, crypto, ETFs for instant tab switching
      marketDataService.initialize();

      // Pre-load popular stock quotes with Twelve Data
      // This seeds priceStore with previousClose for accurate change calculations
      await preloadPopularStocks();
    } catch (err) {
      // Silently handle errors - preload is non-critical
    }
  }, 2000); // 2 second delay after app start
}
