// stores/priceStore.ts
// Centralized price store using Zustand
// Single source of truth for all stock/crypto prices across the app

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

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

  // Get a quote by symbol
  getQuote: (symbol) => {
    return get().quotes[symbol];
  },

  // Get just the price for a symbol
  getPrice: (symbol) => {
    return get().quotes[symbol]?.price;
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
  return usePriceStore(
    useShallow((state) => {
      const result: Record<string, Quote> = {};
      for (const symbol of symbols) {
        if (state.quotes[symbol]) {
          result[symbol] = state.quotes[symbol];
        }
      }
      return result;
    })
  );
};

// Hook to get all quotes (reactive)
export const useAllQuotes = (): Record<string, Quote> => {
  return usePriceStore(useShallow((state) => state.quotes));
};

// Non-hook access for use in async functions
export const priceStore = {
  getQuote: (symbol: string) => usePriceStore.getState().quotes[symbol],
  getPrice: (symbol: string) => usePriceStore.getState().quotes[symbol]?.price,
  setQuote: usePriceStore.getState().setQuote,
  setQuotes: usePriceStore.getState().setQuotes,
  getAll: () => usePriceStore.getState().quotes,
};
