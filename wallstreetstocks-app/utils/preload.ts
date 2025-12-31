// utils/preload.ts
// Pre-load popular stocks data on app startup for instant loading

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setToMemory, CACHE_KEYS } from './memoryCache';

const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';
const QUOTE_CACHE_PREFIX = 'quote_cache_';
const PRELOAD_KEY = 'last_preload_time';
const PRELOAD_INTERVAL = 5 * 60 * 1000; // 5 minutes

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

// Pre-load popular stock quotes
export async function preloadPopularStocks(): Promise<void> {
  try {
    // Check if we should preload
    const shouldRun = await shouldPreload();
    if (!shouldRun) {
      console.log('Skipping preload - too recent');
      return;
    }

    console.log('Pre-loading popular stocks...');

    // Fetch all quotes in one batch call
    const symbolsParam = POPULAR_SYMBOLS.join(',');
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbolsParam}?apikey=${FMP_API_KEY}`
    );

    if (!res.ok) {
      console.warn('Preload fetch failed:', res.status);
      return;
    }

    const quotes: Quote[] = await res.json();

    if (!Array.isArray(quotes) || quotes.length === 0) {
      console.warn('No quotes received for preload');
      return;
    }

    // Cache each quote to BOTH memory (instant) and AsyncStorage (persistent)
    quotes.forEach(quote => {
      // Memory cache for instant access
      setToMemory(CACHE_KEYS.quote(quote.symbol), quote);
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

    console.log(`Pre-loaded ${quotes.length} popular stocks`);
  } catch (err) {
    console.warn('Preload error (non-critical):', err);
  }
}

// Pre-load trending stocks from API
export async function preloadTrendingStocks(): Promise<void> {
  try {
    // Fetch gainers, losers, actives
    const [gainersRes, losersRes, activesRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/stock_market/gainers?limit=10&apikey=${FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/stock_market/losers?limit=10&apikey=${FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/stock_market/actives?limit=10&apikey=${FMP_API_KEY}`),
    ]);

    const [gainers, losers, actives] = await Promise.all([
      gainersRes.json(),
      losersRes.json(),
      activesRes.json(),
    ]);

    // Cache the lists
    await Promise.all([
      AsyncStorage.setItem('trending_gainers', JSON.stringify({ data: gainers, timestamp: Date.now() })),
      AsyncStorage.setItem('trending_losers', JSON.stringify({ data: losers, timestamp: Date.now() })),
      AsyncStorage.setItem('trending_actives', JSON.stringify({ data: actives, timestamp: Date.now() })),
    ]);

    // Also cache individual quotes from these
    const allQuotes = [
      ...(Array.isArray(gainers) ? gainers : []),
      ...(Array.isArray(losers) ? losers : []),
      ...(Array.isArray(actives) ? actives : []),
    ];

    const uniqueSymbols = [...new Set(allQuotes.map((q: any) => q.symbol))];
    const deduped = allQuotes.filter((q: any, i: number) => uniqueSymbols.indexOf(q.symbol) === i);

    // Save to memory cache for instant access
    deduped.forEach((quote: any) => {
      setToMemory(CACHE_KEYS.quote(quote.symbol), quote);
    });

    // Also save to AsyncStorage for persistence
    const cachePromises = deduped.map((quote: any) =>
      AsyncStorage.setItem(
        `${QUOTE_CACHE_PREFIX}${quote.symbol}`,
        JSON.stringify({ data: { ...quote, timestamp: Date.now() }, timestamp: Date.now() })
      )
    );

    await Promise.all(cachePromises);
    console.log(`Pre-loaded ${uniqueSymbols.length} trending stocks`);
  } catch (err) {
    console.warn('Trending preload error (non-critical):', err);
  }
}

// Main preload function - call this on app startup
export async function preloadAppData(): Promise<void> {
  // Run preloads in parallel
  await Promise.all([
    preloadPopularStocks(),
    preloadTrendingStocks(),
  ]);
}
