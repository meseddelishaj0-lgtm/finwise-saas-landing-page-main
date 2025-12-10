// context/StockContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from 'react-native';

const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

interface Holding {
  symbol: string;
  shares: number;
  avgCost: number;
}

interface StockContextType {
  watchlist: string[];
  userHoldings: Holding[];
  addToWatchlist: (symbol: string) => Promise<boolean>;
  removeFromWatchlist: (symbol: string) => void;
  addToPortfolio: (holding: Holding) => Promise<boolean>;
  removeFromPortfolio: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  isInPortfolio: (symbol: string) => boolean;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export function StockProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>(['NVDA', 'GOOGL', 'AMZN', 'META']);
  const [userHoldings, setUserHoldings] = useState<Holding[]>([
    { symbol: 'AAPL', shares: 10, avgCost: 150 },
    { symbol: 'TSLA', shares: 5, avgCost: 200 },
    { symbol: 'MSFT', shares: 8, avgCost: 300 },
  ]);

  const isInWatchlist = (symbol: string) => watchlist.includes(symbol.toUpperCase());
  const isInPortfolio = (symbol: string) => userHoldings.some(h => h.symbol === symbol.toUpperCase());

  const addToWatchlist = async (symbol: string): Promise<boolean> => {
    const upperSymbol = symbol.toUpperCase().trim();

    if (isInWatchlist(upperSymbol)) {
      Alert.alert('Already Added', `${upperSymbol} is already in your watchlist`);
      return false;
    }

    try {
      const res = await fetch(`${BASE_URL}/quote/${upperSymbol}?apikey=${FMP_API_KEY}`);
      const data = await res.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        Alert.alert('Error', `Stock ${upperSymbol} not found`);
        return false;
      }

      setWatchlist(prev => [...prev, upperSymbol]);
      Alert.alert('Success', `${upperSymbol} added to your watchlist!`);
      return true;
    } catch (err) {
      Alert.alert('Error', 'Failed to add stock. Please try again.');
      return false;
    }
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(s => s !== symbol.toUpperCase()));
  };

  const addToPortfolio = async (holding: Holding): Promise<boolean> => {
    const upperSymbol = holding.symbol.toUpperCase().trim();

    if (isInPortfolio(upperSymbol)) {
      Alert.alert('Already Added', `${upperSymbol} is already in your portfolio`);
      return false;
    }

    try {
      const res = await fetch(`${BASE_URL}/quote/${upperSymbol}?apikey=${FMP_API_KEY}`);
      const data = await res.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        Alert.alert('Error', `Stock ${upperSymbol} not found`);
        return false;
      }

      setUserHoldings(prev => [...prev, { ...holding, symbol: upperSymbol }]);
      Alert.alert('Success', `${upperSymbol} added to your portfolio!`);
      return true;
    } catch (err) {
      Alert.alert('Error', 'Failed to add stock. Please try again.');
      return false;
    }
  };

  const removeFromPortfolio = (symbol: string) => {
    setUserHoldings(prev => prev.filter(h => h.symbol !== symbol.toUpperCase()));
  };

  return (
    <StockContext.Provider value={{
      watchlist,
      userHoldings,
      addToWatchlist,
      removeFromWatchlist,
      addToPortfolio,
      removeFromPortfolio,
      isInWatchlist,
      isInPortfolio,
    }}>
      {children}
    </StockContext.Provider>
  );
}

export function useStocks() {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStocks must be used within a StockProvider');
  }
  return context;
}
