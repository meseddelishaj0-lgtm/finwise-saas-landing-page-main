// services/marketDataService.ts
// Global market data service - Robinhood-style architecture
// Pre-loads ALL symbols on app start for instant tab switching

import AsyncStorage from '@react-native-async-storage/async-storage';
import { priceStore } from '../stores/priceStore';
import { websocketService } from './websocketService';

const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

// Storage keys
const STORAGE_KEYS = {
  STOCKS_DATA: '@market_stocks_data',
  CRYPTO_DATA: '@market_crypto_data',
  ETF_DATA: '@market_etf_data',
  LAST_UPDATE: '@market_last_update',
};

// ============================================================================
// ALL SYMBOLS - Pre-defined lists for instant loading
// ============================================================================

export const ALL_STOCKS = [
  // Top 50 US Stocks
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "UNH", "JNJ",
  "V", "XOM", "WMT", "JPM", "MA", "PG", "HD", "CVX", "MRK", "ABBV",
  "LLY", "PEP", "KO", "COST", "AVGO", "TMO", "MCD", "CSCO", "ACN", "ABT",
  "DHR", "NEE", "WFC", "LIN", "ADBE", "TXN", "CRM", "AMD", "PM", "ORCL",
  "BMY", "UPS", "RTX", "QCOM", "HON", "UNP", "INTC", "IBM", "CAT", "BA",
];

export const ALL_CRYPTO = [
  "BTC/USD", "ETH/USD", "BNB/USD", "XRP/USD", "ADA/USD", "SOL/USD", "DOGE/USD", "DOT/USD",
  "MATIC/USD", "LTC/USD", "SHIB/USD", "TRX/USD", "AVAX/USD", "LINK/USD", "ATOM/USD",
  "UNI/USD", "XLM/USD", "XMR/USD", "ETC/USD", "BCH/USD", "ALGO/USD", "VET/USD",
  "FIL/USD", "ICP/USD", "HBAR/USD", "MANA/USD", "SAND/USD", "AXS/USD", "THETA/USD",
  "XTZ/USD",
];

export const ALL_ETFS = [
  "SPY", "VOO", "VTI", "QQQ", "IVV", "VEA", "IEFA", "VWO", "VTV", "IEMG",
  "BND", "AGG", "VUG", "IJR", "IWM", "VIG", "SCHD", "VYM", "VGT", "XLF",
  "XLK", "XLE", "XLV", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC",
  "ARKK", "DIA", "GLD", "SLV", "TLT", "LQD", "HYG",
];

// ============================================================================
// DATA TYPES
// ============================================================================

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: 'stock' | 'crypto' | 'etf';
  previousClose?: number;
}

interface MarketDataState {
  stocks: MarketItem[];
  crypto: MarketItem[];
  etfs: MarketItem[];
  isLoaded: boolean;
  lastUpdate: number;
}

// ============================================================================
// GLOBAL STATE
// ============================================================================

let marketData: MarketDataState = {
  stocks: [],
  crypto: [],
  etfs: [],
  isLoaded: false,
  lastUpdate: 0,
};

let isInitializing = false;
let initPromise: Promise<void> | null = null;
const listeners: Set<() => void> = new Set();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const fetchBatchQuotes = async (symbols: string[]): Promise<any[]> => {
  if (symbols.length === 0) return [];

  try {
    const batchSize = 8;
    const allResults: any[] = [];

    // Fetch batches SEQUENTIALLY to avoid overwhelming the device
    // This prevents the app from becoming unresponsive
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const url = `${TWELVE_DATA_URL}/quote?symbol=${batch.join(",")}&apikey=${TWELVE_DATA_API_KEY}`;

      try {
        const res = await fetch(url);
        const json = await res.json();
        const results = batch.length === 1 ? [json] : Object.values(json);
        allResults.push(...(results as any[]));

        // Small delay between batches to prevent overwhelming the device
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch {
        // Continue with next batch on error
      }
    }

    return allResults.filter(item => item && item.symbol && !item.code);
  } catch (err) {
    return [];
  }
};

const processQuoteData = (item: any, type: 'stock' | 'crypto' | 'etf'): MarketItem => {
  const symbol = type === 'crypto' ? item.symbol.replace('/', '') : item.symbol;
  const price = parseFloat(item.close) || 0;
  const previousClose = parseFloat(item.previous_close) || price;

  // Always calculate change from previousClose for accuracy
  // Twelve Data REST change/percent_change may use different reference
  const change = previousClose > 0 ? price - previousClose : 0;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    symbol,
    name: item.name || symbol,
    price,
    change,
    changePercent,
    type,
    previousClose,
  };
};

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

const saveToStorage = async () => {
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.STOCKS_DATA, JSON.stringify(marketData.stocks)),
      AsyncStorage.setItem(STORAGE_KEYS.CRYPTO_DATA, JSON.stringify(marketData.crypto)),
      AsyncStorage.setItem(STORAGE_KEYS.ETF_DATA, JSON.stringify(marketData.etfs)),
      AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, Date.now().toString()),
    ]);
  } catch (err) {
  }
};

const loadFromStorage = async (): Promise<boolean> => {
  try {
    const [stocksJson, cryptoJson, etfsJson, lastUpdateStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.STOCKS_DATA),
      AsyncStorage.getItem(STORAGE_KEYS.CRYPTO_DATA),
      AsyncStorage.getItem(STORAGE_KEYS.ETF_DATA),
      AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE),
    ]);

    const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr, 10) : 0;
    const cacheAge = Date.now() - lastUpdate;
    const MAX_CACHE_AGE = 30 * 60 * 1000; // 30 minutes

    if (cacheAge > MAX_CACHE_AGE) {
      return false;
    }

    if (stocksJson) marketData.stocks = JSON.parse(stocksJson);
    if (cryptoJson) marketData.crypto = JSON.parse(cryptoJson);
    if (etfsJson) marketData.etfs = JSON.parse(etfsJson);
    marketData.lastUpdate = lastUpdate;

    // Update price store with cached data
    const allItems = [...marketData.stocks, ...marketData.crypto, ...marketData.etfs];
    for (const item of allItems) {
      priceStore.setQuote({
        symbol: item.symbol,
        price: item.price,
        change: item.change,
        changePercent: item.changePercent,
        previousClose: item.previousClose,
        name: item.name,
      });
    }

    return allItems.length > 0;
  } catch (err) {
    return false;
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

const fetchAllData = async () => {
  // Fetch data SEQUENTIALLY to prevent overwhelming the device
  // This is critical for iPad performance on startup
  const stockQuotes = await fetchBatchQuotes(ALL_STOCKS);
  await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause

  const cryptoQuotes = await fetchBatchQuotes(ALL_CRYPTO);
  await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause

  const etfQuotes = await fetchBatchQuotes(ALL_ETFS);

  // Process and store
  marketData.stocks = stockQuotes.map(q => processQuoteData(q, 'stock'));
  marketData.crypto = cryptoQuotes.map(q => processQuoteData(q, 'crypto'));
  marketData.etfs = etfQuotes.map(q => processQuoteData(q, 'etf'));
  marketData.lastUpdate = Date.now();
  marketData.isLoaded = true;

  // Update price store
  const allItems = [...marketData.stocks, ...marketData.crypto, ...marketData.etfs];
  for (const item of allItems) {
    priceStore.setQuote({
      symbol: item.symbol,
      price: item.price,
      change: item.change,
      changePercent: item.changePercent,
      previousClose: item.previousClose,
      name: item.name,
    });

    // Also store with slash for crypto
    if (item.type === 'crypto') {
      const symbolWithSlash = item.symbol.slice(0, -3) + '/' + item.symbol.slice(-3);
      priceStore.setQuote({
        symbol: symbolWithSlash,
        price: item.price,
        change: item.change,
        changePercent: item.changePercent,
        previousClose: item.previousClose,
        name: item.name,
      });
    }
  }


  // Save to storage for persistence
  await saveToStorage();

  // Notify listeners
  notifyListeners();
};

const subscribeToWebSocket = () => {
  // Delay WebSocket subscription to prevent overwhelming the device at startup
  setTimeout(() => {
    // Get symbols for WebSocket subscription - reduced count for better performance
    const stockSymbols = ALL_STOCKS.slice(0, 10); // Top 10 stocks (reduced from 20)
    const cryptoSymbols = ALL_CRYPTO.slice(0, 5); // Top 5 crypto (reduced from 10)
    const etfSymbols = ALL_ETFS.slice(0, 5); // Top 5 ETFs (reduced from 10)

    const allSymbols = [...stockSymbols, ...cryptoSymbols, ...etfSymbols];

    websocketService.subscribe(allSymbols);
  }, 3000); // 3 second delay
};

// ============================================================================
// PUBLIC API
// ============================================================================

export const marketDataService = {
  /**
   * Initialize the market data service
   * Loads from cache first, then fetches fresh data
   * Call this on app startup
   */
  async initialize(): Promise<void> {
    if (marketData.isLoaded) {
      return;
    }

    if (isInitializing && initPromise) {
      return initPromise;
    }

    isInitializing = true;

    initPromise = (async () => {
      try {
        // Try to load from cache first (instant)
        const cacheLoaded = await loadFromStorage();

        if (cacheLoaded) {
          marketData.isLoaded = true;
          notifyListeners();
        }

        // Fetch fresh data in background
        await fetchAllData();

        // Subscribe to WebSocket for real-time updates
        subscribeToWebSocket();

      } catch (err) {
      } finally {
        isInitializing = false;
      }
    })();

    return initPromise;
  },

  /**
   * Get stocks data (instant - from memory)
   */
  getStocks(): MarketItem[] {
    return marketData.stocks;
  },

  /**
   * Get crypto data (instant - from memory)
   */
  getCrypto(): MarketItem[] {
    return marketData.crypto;
  },

  /**
   * Get ETF data (instant - from memory)
   */
  getETFs(): MarketItem[] {
    return marketData.etfs;
  },

  /**
   * Get all data for a specific type
   */
  getData(type: 'stock' | 'crypto' | 'etf'): MarketItem[] {
    switch (type) {
      case 'stock': return marketData.stocks;
      case 'crypto': return marketData.crypto;
      case 'etf': return marketData.etfs;
      default: return [];
    }
  },

  /**
   * Get live data with prices from price store
   */
  getLiveData(type: 'stock' | 'crypto' | 'etf'): MarketItem[] {
    const baseData = this.getData(type);

    return baseData.map(item => {
      const quote = priceStore.getQuote(item.symbol);
      if (quote && quote.price > 0) {
        return {
          ...item,
          price: quote.price,
          change: quote.change ?? item.change,
          changePercent: quote.changePercent ?? item.changePercent,
        };
      }
      return item;
    });
  },

  /**
   * Check if data is loaded
   */
  isLoaded(): boolean {
    return marketData.isLoaded;
  },

  /**
   * Subscribe to data changes
   */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Force refresh all data
   */
  async refresh(): Promise<void> {
    await fetchAllData();
  },

  /**
   * Get last update timestamp
   */
  getLastUpdate(): number {
    return marketData.lastUpdate;
  },
};

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export default marketDataService;
