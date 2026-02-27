// stores/priceStore.ts
// Centralized price store using Zustand
// Single source of truth for all stock/crypto prices across the app

import { create } from 'zustand';

export interface Quote {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  name?: string;
  previousClose?: number;
  previousCloseSource?: 'quote' | 'eod' | 'chart'; // Tracks where previousClose came from
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  bid?: number;      // Bid price (from WebSocket)
  ask?: number;      // Ask price (from WebSocket)
  updatedAt: number; // timestamp
}

interface PriceState {
  // All quotes indexed by symbol
  quotes: Record<string, Quote>;

  // Actions
  setQuote: (quote: Partial<Quote> & { symbol: string; price: number }) => void;
  setQuotes: (quotes: Array<Partial<Quote> & { symbol: string; price: number }>) => void;
  getQuote: (symbol: string) => Quote | undefined;
  getPrice: (symbol: string) => number | undefined;

  // Clear all quotes (useful for logout/refresh)
  clearAll: () => void;
}

export const usePriceStore = create<PriceState>((set, get) => ({
  quotes: {},

  // Update a single quote
  setQuote: (quote) => {
    set((state) => ({
      quotes: {
        ...state.quotes,
        [quote.symbol]: {
          ...state.quotes[quote.symbol],
          ...quote,
          updatedAt: Date.now(),
        },
      },
    }));
  },

  // Batch update multiple quotes (more efficient)
  setQuotes: (quotes) => {
    const now = Date.now();
    set((state) => {
      const newQuotes = { ...state.quotes };
      for (const quote of quotes) {
        if (quote.symbol && quote.price !== undefined) {
          newQuotes[quote.symbol] = {
            ...newQuotes[quote.symbol],
            ...quote,
            updatedAt: now,
          };
        }
      }
      return { quotes: newQuotes };
    });
  },

  // Get a quote by symbol (also checks normalized crypto symbols)
  getQuote: (symbol) => {
    const quotes = get().quotes;
    // Try exact match first
    if (quotes[symbol]) return quotes[symbol];
    // Try with slash for crypto (e.g., BTCUSD -> BTC/USD)
    if (!symbol.includes('/') && symbol.length >= 6) {
      const withSlash = symbol.slice(0, -3) + '/' + symbol.slice(-3);
      if (quotes[withSlash]) return quotes[withSlash];
    }
    // Try without slash for crypto (e.g., BTC/USD -> BTCUSD)
    const withoutSlash = symbol.replace('/', '');
    if (quotes[withoutSlash]) return quotes[withoutSlash];
    return undefined;
  },

  // Get just the price for a symbol
  getPrice: (symbol) => {
    const quotes = get().quotes;
    if (quotes[symbol]?.price) return quotes[symbol].price;
    // Try normalized versions
    const withoutSlash = symbol.replace('/', '');
    if (quotes[withoutSlash]?.price) return quotes[withoutSlash].price;
    if (!symbol.includes('/') && symbol.length >= 6) {
      const withSlash = symbol.slice(0, -3) + '/' + symbol.slice(-3);
      if (quotes[withSlash]?.price) return quotes[withSlash].price;
    }
    return undefined;
  },

  // Clear all quotes
  clearAll: () => {
    set({ quotes: {} });
  },
}));

// Selector hooks for optimized re-renders
// Only re-renders when the specific symbol's price changes
export const useQuote = (symbol: string): Quote | undefined => {
  return usePriceStore((state) => state.quotes[symbol]);
};

export const usePrice = (symbol: string): number | undefined => {
  return usePriceStore((state) => state.quotes[symbol]?.price);
};

export const useChangePercent = (symbol: string): number | undefined => {
  return usePriceStore((state) => state.quotes[symbol]?.changePercent);
};

// Hook to get multiple quotes at once (with shallow comparison for performance)
export const useQuotes = (symbols: string[]): Record<string, Quote> => {
  return usePriceStore((state) => {
    const result: Record<string, Quote> = {};
    for (const symbol of symbols) {
      if (state.quotes[symbol]) {
        result[symbol] = state.quotes[symbol];
      }
    }
    return result;
  });
};

// Hook to get all quotes (reactive) - returns the quotes object
// Note: This will re-render on ANY quote change, use sparingly
export const useAllQuotes = (): Record<string, Quote> => {
  return usePriceStore((state) => state.quotes);
};

// Non-hook access for use in async functions
export const priceStore = {
  getQuote: (symbol: string) => usePriceStore.getState().getQuote(symbol),
  getPrice: (symbol: string) => usePriceStore.getState().getPrice(symbol),
  setQuote: usePriceStore.getState().setQuote,
  setQuotes: usePriceStore.getState().setQuotes,
  getAll: () => usePriceStore.getState().quotes,
};
