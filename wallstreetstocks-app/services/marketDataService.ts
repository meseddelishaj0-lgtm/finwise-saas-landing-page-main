// services/marketDataService.ts
// Global market data service - Robinhood-style architecture
// Pre-loads ALL symbols on app start for instant tab switching

import AsyncStorage from '@react-native-async-storage/async-storage';
import { priceStore } from '../stores/priceStore';
import { websocketService } from './websocketService';

const TWELVE_DATA_API_KEY = '604ed688209443c89250510872616f41';
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

    // Fetch in parallel batches
    const batchPromises: Promise<any[]>[] = [];
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const url = `${TWELVE_DATA_URL}/quote?symbol=${batch.join(",")}&apikey=${TWELVE_DATA_API_KEY}`;

      batchPromises.push(
        fetch(url)
          .then(res => res.json())
          .then(json => batch.length === 1 ? [json] : Object.values(json))
          .catch(() => [])
      );
    }

    const batchResults = await Promise.all(batchPromises);
    for (const results of batchResults) {
      allResults.push(...(results as any[]));
    }

    return allResults.filter(item => item && item.symbol && !item.code);
  } catch (err) {
    console.error('Batch quote fetch error:', err);
    return [];
  }
};

const processQuoteData = (item: any, type: 'stock' | 'crypto' | 'etf'): MarketItem => {
  const symbol = type === 'crypto' ? item.symbol.replace('/', '') : item.symbol;
  const price = parseFloat(item.close) || 0;
  const previousClose = parseFloat(item.previous_close) || price;

  return {
    symbol,
    name: item.name || symbol,
    price,
    change: parseFloat(item.change) || 0,
    changePercent: parseFloat(item.percent_change) || 0,
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
    console.log('💾 Market data saved to storage');
  } catch (err) {
    console.error('Failed to save market data:', err);
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
      console.log('📦 Cache too old, will fetch fresh data');
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

    console.log(`📦 Loaded from cache: ${marketData.stocks.length} stocks, ${marketData.crypto.length} crypto, ${marketData.etfs.length} ETFs`);
    return allItems.length > 0;
  } catch (err) {
    console.error('Failed to load from storage:', err);
    return false;
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

const fetchAllData = async () => {
  console.log('🚀 Fetching all market data...');

  // Fetch all in parallel
  const [stockQuotes, cryptoQuotes, etfQuotes] = await Promise.all([
    fetchBatchQuotes(ALL_STOCKS),
    fetchBatchQuotes(ALL_CRYPTO),
    fetchBatchQuotes(ALL_ETFS),
  ]);

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

  console.log(`✅ Loaded: ${marketData.stocks.length} stocks, ${marketData.crypto.length} crypto, ${marketData.etfs.length} ETFs`);

  // Save to storage for persistence
  await saveToStorage();

  // Notify listeners
  notifyListeners();
};

const subscribeToWebSocket = () => {
  // Get all symbols for WebSocket subscription
  const stockSymbols = ALL_STOCKS.slice(0, 20); // Top 20 stocks
  const cryptoSymbols = ALL_CRYPTO.slice(0, 10).map(s => s.replace('/', '')); // Top 10 crypto
  const etfSymbols = ALL_ETFS.slice(0, 10); // Top 10 ETFs

  const allSymbols = [...stockSymbols, ...cryptoSymbols, ...etfSymbols];

  console.log(`📡 Subscribing ${allSymbols.length} symbols to WebSocket...`);
  websocketService.subscribe(allSymbols);
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
      console.log('📊 Market data already loaded');
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
        console.error('Market data initialization error:', err);
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
