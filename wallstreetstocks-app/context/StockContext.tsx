// context/StockContext.tsx - Portfolio Management Only
// Watchlist is now managed by WatchlistContext
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from 'react-native';

const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

interface Holding {
  symbol: string;
  shares: number;
  avgCost: number;
}

interface StockContextType {
  userHoldings: Holding[];
  addToPortfolio: (holding: Holding) => Promise<boolean>;
  removeFromPortfolio: (symbol: string) => void;
  isInPortfolio: (symbol: string) => boolean;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export function StockProvider({ children }: { children: ReactNode }) {
  const [userHoldings, setUserHoldings] = useState<Holding[]>([
    { symbol: 'AAPL', shares: 10, avgCost: 150 },
    { symbol: 'TSLA', shares: 5, avgCost: 200 },
    { symbol: 'MSFT', shares: 8, avgCost: 300 },
  ]);

  const isInPortfolio = (symbol: string) => userHoldings.some(h => h.symbol === symbol.toUpperCase());

  const addToPortfolio = async (holding: Holding): Promise<boolean> => {
    const upperSymbol = holding.symbol.toUpperCase().trim();

    if (isInPortfolio(upperSymbol)) {
      Alert.alert('Already Added', `${upperSymbol} is already in your portfolio`);
      return false;
    }

    try {
      const res = await fetch(`${TWELVE_DATA_URL}/quote?symbol=${upperSymbol}&apikey=${TWELVE_DATA_API_KEY}`);
      const data = await res.json();

      if (!data || data.code || !data.symbol) {
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
      userHoldings,
      addToPortfolio,
      removeFromPortfolio,
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
