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
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  bid?: number;      // Bid price (from WebSocket)
  ask?: number;      // Ask price (from WebSocket)
  updatedAt: number; // timestamp
}

export type QuoteTable = Record<string, Quote>;
export type QuoteInput = Partial<Quote> & { symbol: string; price: number };

interface PriceState {
  // All quotes indexed by symbol
  quotes: QuoteTable;

  // Actions
  setQuote: (quote: QuoteInput) => void;
  setQuotes: (quotes: QuoteInput[]) => void;
  getQuote: (symbol: string) => Quote | undefined;
  getPrice: (symbol: string) => number | undefined;

  // Clear all quotes (useful for logout/refresh)
  clearAll: () => void;
}

// Look a symbol up in a quote table, also trying the other crypto spelling
// (BTCUSD <-> BTC/USD). Shared by the store and by code holding a snapshot.
export function findQuote(quotes: QuoteTable, symbol: string): Quote | undefined {
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
}

// When the store last received any price (0 until the first one). Read by
// "updated Xs ago" labels on their own timer, so it is deliberately not state.
let lastUpdateAt = 0;
export const getLastPriceUpdateAt = (): number => lastUpdateAt;

export const usePriceStore = create<PriceState>((set, get) => ({
  quotes: {},

  // Update a single quote
  setQuote: (quote) => {
    lastUpdateAt = Date.now();
    set((state) => ({
      quotes: {
        ...state.quotes,
        [quote.symbol]: {
          ...state.quotes[quote.symbol],
          ...quote,
          updatedAt: lastUpdateAt,
        },
      },
    }));
  },

  // Batch update multiple quotes (more efficient)
  setQuotes: (quotes) => {
    if (quotes.length === 0) return;
    const now = Date.now();
    lastUpdateAt = now;
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
  getQuote: (symbol) => findQuote(get().quotes, symbol),

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
