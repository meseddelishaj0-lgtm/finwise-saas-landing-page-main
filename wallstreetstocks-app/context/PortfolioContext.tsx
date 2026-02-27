// context/PortfolioContext.tsx
// Shared portfolio state across the app
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';
const BATCH_SIZE = 8;

interface HoldingBase {
  symbol: string;
  shares: number;
  avgCost: number;
}

interface HoldingWithPrices extends HoldingBase {
  currentPrice: number;
  currentValue: number;
  gain: number;
  gainPercent: number;
  dayChange: number;
}

interface Portfolio {
  id: string;
  name: string;
  holdings: HoldingBase[];
}

interface PortfolioWithPrices {
  id: string;
  name: string;
  holdings: HoldingWithPrices[];
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

interface PortfolioContextType {
  portfolios: Portfolio[];
  selectedPortfolioId: string;
  currentPortfolio: PortfolioWithPrices | null;
  loading: boolean;
  refreshing: boolean;
  setSelectedPortfolioId: (id: string) => void;
  createPortfolio: (name: string) => Promise<string>;
  deletePortfolio: (id: string) => Promise<void>;
  renamePortfolio: (id: string, name: string) => Promise<void>;
  addHolding: (symbol: string, shares: number, avgCost: number) => Promise<void>;
  updateHolding: (symbol: string, shares: number, avgCost: number) => Promise<void>;
  removeHolding: (symbol: string) => Promise<void>;
  refreshPrices: () => Promise<void>;
  lastUpdated: Date | null;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [currentPortfolio, setCurrentPortfolio] = useState<PortfolioWithPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Use refs to access latest state in callbacks
  const portfoliosRef = useRef(portfolios);
  const selectedPortfolioIdRef = useRef(selectedPortfolioId);

  // Keep refs in sync
  useEffect(() => {
    portfoliosRef.current = portfolios;
  }, [portfolios]);

  useEffect(() => {
    selectedPortfolioIdRef.current = selectedPortfolioId;
  }, [selectedPortfolioId]);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  // Fetch prices for a portfolio
  const fetchPricesForPortfolio = useCallback(async (portfolio: Portfolio): Promise<PortfolioWithPrices> => {
    if (!portfolio || portfolio.holdings.length === 0) {
      return {
        ...portfolio,
        holdings: [],
        totalValue: 0,
        totalCost: 0,
        totalGain: 0,
        totalGainPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
      };
    }

    try {
      const symbolList = portfolio.holdings.map(h => h.symbol.toUpperCase());

      // Fetch in batches of 8 from Twelve Data
      const allResults: any[] = [];
      for (let i = 0; i < symbolList.length; i += BATCH_SIZE) {
        const batch = symbolList.slice(i, i + BATCH_SIZE);
        try {
          const res = await fetch(`${TWELVE_DATA_URL}/quote?symbol=${batch.join(',')}&apikey=${TWELVE_DATA_API_KEY}`);
          const json = await res.json();
          const results = batch.length === 1 ? [json] : Object.values(json);
          allResults.push(...(results as any[]));
        } catch {
          // Continue with next batch
        }
      }

      // Map Twelve Data response to expected format
      const priceData = allResults
        .filter(item => item && item.symbol && !item.code)
        .map(item => {
          const price = parseFloat(item.close) || 0;
          const previousClose = parseFloat(item.previous_close) || price;
          const change = previousClose > 0 ? price - previousClose : 0;
          return { symbol: item.symbol, price, change, previousClose, name: item.name };
        });

      if (priceData.length === 0) {
        // Don't throw - gracefully fall back to avgCost
        const holdingsWithPrices: HoldingWithPrices[] = portfolio.holdings.map(h => ({
          symbol: h.symbol.toUpperCase(),
          shares: h.shares,
          avgCost: h.avgCost > 0 ? h.avgCost : 1,
          currentPrice: h.avgCost > 0 ? h.avgCost : 1,
          currentValue: h.shares * (h.avgCost > 0 ? h.avgCost : 1),
          gain: 0,
          gainPercent: 0,
          dayChange: 0,
        }));

        const totalCost = holdingsWithPrices.reduce((sum, h) => sum + h.currentValue, 0);

        return {
          ...portfolio,
          holdings: holdingsWithPrices,
          totalValue: totalCost,
          totalCost,
          totalGain: 0,
          totalGainPercent: 0,
          dayChange: 0,
          dayChangePercent: 0,
        };
      }

      const holdingsWithPrices: HoldingWithPrices[] = portfolio.holdings.map(h => {
        const quote = priceData.find((q: any) => q.symbol === h.symbol.toUpperCase());

        const avgCost = h.avgCost > 0 ? h.avgCost : 1;
        const currentPrice = quote?.price || avgCost;
        const currentValue = h.shares * currentPrice;
        const cost = h.shares * avgCost;
        const gain = currentValue - cost;
        const gainPercent = cost > 0 ? ((gain / cost) * 100) : 0;
        const dayChange = (quote?.change || 0) * h.shares;


        return {
          symbol: h.symbol.toUpperCase(),
          shares: h.shares,
          avgCost,
          currentPrice,
          currentValue,
          gain,
          gainPercent,
          dayChange,
        };
      });

      const totalValue = holdingsWithPrices.reduce((sum, h) => sum + h.currentValue, 0);
      const totalCost = holdingsWithPrices.reduce((sum, h) => sum + (h.shares * h.avgCost), 0);
      const totalGain = totalValue - totalCost;
      const totalGainPercent = totalCost > 0 ? ((totalGain / totalCost) * 100) : 0;
      const dayChange = holdingsWithPrices.reduce((sum, h) => sum + h.dayChange, 0);
      const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;


      return {
        ...portfolio,
        holdings: holdingsWithPrices,
        totalValue,
        totalCost,
        totalGain,
        totalGainPercent,
        dayChange,
        dayChangePercent,
      };
    } catch (error) {
      // Return portfolio with avgCost as current price
      const holdingsWithPrices: HoldingWithPrices[] = portfolio.holdings.map(h => ({
        symbol: h.symbol.toUpperCase(),
        shares: h.shares,
        avgCost: h.avgCost > 0 ? h.avgCost : 1,
        currentPrice: h.avgCost > 0 ? h.avgCost : 1,
        currentValue: h.shares * (h.avgCost > 0 ? h.avgCost : 1),
        gain: 0,
        gainPercent: 0,
        dayChange: 0,
      }));

      const totalCost = holdingsWithPrices.reduce((sum, h) => sum + h.currentValue, 0);

      return {
        ...portfolio,
        holdings: holdingsWithPrices,
        totalValue: totalCost,
        totalCost,
        totalGain: 0,
        totalGainPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
      };
    }
  }, []);

  // Refresh prices for current portfolio
  const refreshPrices = useCallback(async () => {
    const currentPortfolios = portfoliosRef.current;
    const currentSelectedId = selectedPortfolioIdRef.current;

    const portfolio = currentPortfolios.find(p => p.id === currentSelectedId);

    if (!portfolio) {
      return;
    }

    setRefreshing(true);

    try {
      const portfolioWithPrices = await fetchPricesForPortfolio(portfolio);
      setCurrentPortfolio(portfolioWithPrices);
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [fetchPricesForPortfolio]);

  // Load portfolios from AsyncStorage on mount
  useEffect(() => {
    const loadPortfolios = async () => {
      try {
        const saved = await AsyncStorage.getItem('user_portfolios_v2');
        if (saved) {
          const data = JSON.parse(saved);
          const loadedPortfolios = data.portfolios || [];
          const loadedSelectedId = data.selectedPortfolioId || loadedPortfolios[0]?.id || '';


          setPortfolios(loadedPortfolios);
          setSelectedPortfolioId(loadedSelectedId);

          // Update refs immediately
          portfoliosRef.current = loadedPortfolios;
          selectedPortfolioIdRef.current = loadedSelectedId;

          // Fetch prices for the selected portfolio
          const selectedPortfolio = loadedPortfolios.find((p: Portfolio) => p.id === loadedSelectedId);
          if (selectedPortfolio) {
            const portfolioWithPrices = await fetchPricesForPortfolio(selectedPortfolio);
            setCurrentPortfolio(portfolioWithPrices);
            setLastUpdated(new Date());
          }
        } else {
          // Migrate from old format or create default
          const oldSaved = await AsyncStorage.getItem('user_portfolio_holdings');
          const defaultHoldings = oldSaved ? JSON.parse(oldSaved) : [
            { symbol: 'AAPL', shares: 10, avgCost: 150 },
            { symbol: 'TSLA', shares: 5, avgCost: 200 },
            { symbol: 'MSFT', shares: 8, avgCost: 300 },
          ];
          const defaultPortfolio: Portfolio = {
            id: generateId(),
            name: 'Main Portfolio',
            holdings: defaultHoldings,
          };

          setPortfolios([defaultPortfolio]);
          setSelectedPortfolioId(defaultPortfolio.id);

          // Update refs
          portfoliosRef.current = [defaultPortfolio];
          selectedPortfolioIdRef.current = defaultPortfolio.id;

          await AsyncStorage.setItem('user_portfolios_v2', JSON.stringify({
            portfolios: [defaultPortfolio],
            selectedPortfolioId: defaultPortfolio.id,
          }));

          // Fetch prices
          const portfolioWithPrices = await fetchPricesForPortfolio(defaultPortfolio);
          setCurrentPortfolio(portfolioWithPrices);
          setLastUpdated(new Date());
        }
      } catch (err) {
        const defaultPortfolio: Portfolio = {
          id: generateId(),
          name: 'Main Portfolio',
          holdings: [],
        };
        setPortfolios([defaultPortfolio]);
        setSelectedPortfolioId(defaultPortfolio.id);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolios();
  }, [fetchPricesForPortfolio]);

  // Save to AsyncStorage whenever portfolios change
  useEffect(() => {
    if (!loading && portfolios.length > 0) {
      AsyncStorage.setItem('user_portfolios_v2', JSON.stringify({
        portfolios,
        selectedPortfolioId,
      }));
      // Also save current holdings in old format for backwards compatibility
      const current = portfolios.find(p => p.id === selectedPortfolioId);
      if (current) {
        AsyncStorage.setItem('user_portfolio_holdings', JSON.stringify(current.holdings));
      }
    }
  }, [portfolios, selectedPortfolioId, loading]);

  // Refresh prices when selected portfolio changes (but not on initial load)
  useEffect(() => {
    if (!loading && selectedPortfolioId && portfolios.length > 0) {
      const portfolio = portfolios.find(p => p.id === selectedPortfolioId);
      if (portfolio) {
        fetchPricesForPortfolio(portfolio).then(portfolioWithPrices => {
          setCurrentPortfolio(portfolioWithPrices);
          setLastUpdated(new Date());
        });
      }
    }
  }, [selectedPortfolioId, loading, fetchPricesForPortfolio]);

  const createPortfolio = async (name: string): Promise<string> => {
    const newPortfolio: Portfolio = {
      id: generateId(),
      name,
      holdings: [],
    };
    const newPortfolios = [...portfolios, newPortfolio];
    setPortfolios(newPortfolios);
    setSelectedPortfolioId(newPortfolio.id);
    portfoliosRef.current = newPortfolios;
    selectedPortfolioIdRef.current = newPortfolio.id;

    // Set empty portfolio with prices
    setCurrentPortfolio({
      ...newPortfolio,
      holdings: [],
      totalValue: 0,
      totalCost: 0,
      totalGain: 0,
      totalGainPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
    });

    return newPortfolio.id;
  };

  const deletePortfolio = async (id: string) => {
    if (portfolios.length <= 1) return;

    const remaining = portfolios.filter(p => p.id !== id);
    setPortfolios(remaining);
    portfoliosRef.current = remaining;

    if (selectedPortfolioId === id && remaining.length > 0) {
      setSelectedPortfolioId(remaining[0].id);
      selectedPortfolioIdRef.current = remaining[0].id;

      // Fetch prices for the new selected portfolio
      const portfolioWithPrices = await fetchPricesForPortfolio(remaining[0]);
      setCurrentPortfolio(portfolioWithPrices);
    }
  };

  const renamePortfolio = async (id: string, name: string) => {
    const updated = portfolios.map(p =>
      p.id === id ? { ...p, name } : p
    );
    setPortfolios(updated);
    portfoliosRef.current = updated;

    // Update current portfolio name if it's the selected one
    if (currentPortfolio && currentPortfolio.id === id) {
      setCurrentPortfolio({ ...currentPortfolio, name });
    }
  };

  const addHolding = async (symbol: string, shares: number, avgCost: number) => {
    const updated = portfolios.map(p => {
      if (p.id === selectedPortfolioId) {
        const existing = p.holdings.find(h => h.symbol.toUpperCase() === symbol.toUpperCase());
        if (existing) {
          // Update existing holding (average the cost)
          const totalShares = existing.shares + shares;
          const totalCost = (existing.shares * existing.avgCost) + (shares * avgCost);
          const newAvgCost = totalCost / totalShares;
          return {
            ...p,
            holdings: p.holdings.map(h =>
              h.symbol.toUpperCase() === symbol.toUpperCase()
                ? { ...h, shares: totalShares, avgCost: newAvgCost }
                : h
            ),
          };
        } else {
          // Add new holding
          return {
            ...p,
            holdings: [...p.holdings, { symbol: symbol.toUpperCase(), shares, avgCost }],
          };
        }
      }
      return p;
    });

    setPortfolios(updated);
    portfoliosRef.current = updated;

    // Refresh prices after adding
    const portfolio = updated.find(p => p.id === selectedPortfolioId);
    if (portfolio) {
      const portfolioWithPrices = await fetchPricesForPortfolio(portfolio);
      setCurrentPortfolio(portfolioWithPrices);
      setLastUpdated(new Date());
    }
  };

  const updateHolding = async (symbol: string, shares: number, avgCost: number) => {
    const updated = portfolios.map(p => {
      if (p.id === selectedPortfolioId) {
        return {
          ...p,
          holdings: p.holdings.map(h =>
            h.symbol.toUpperCase() === symbol.toUpperCase()
              ? { ...h, shares, avgCost }
              : h
          ),
        };
      }
      return p;
    });

    setPortfolios(updated);
    portfoliosRef.current = updated;

    // Refresh prices after updating
    const portfolio = updated.find(p => p.id === selectedPortfolioId);
    if (portfolio) {
      const portfolioWithPrices = await fetchPricesForPortfolio(portfolio);
      setCurrentPortfolio(portfolioWithPrices);
      setLastUpdated(new Date());
    }
  };

  const removeHolding = async (symbol: string) => {
    const updated = portfolios.map(p => {
      if (p.id === selectedPortfolioId) {
        return {
          ...p,
          holdings: p.holdings.filter(h => h.symbol.toUpperCase() !== symbol.toUpperCase()),
        };
      }
      return p;
    });

    setPortfolios(updated);
    portfoliosRef.current = updated;

    // Refresh prices after removing
    const portfolio = updated.find(p => p.id === selectedPortfolioId);
    if (portfolio) {
      const portfolioWithPrices = await fetchPricesForPortfolio(portfolio);
      setCurrentPortfolio(portfolioWithPrices);
      setLastUpdated(new Date());
    }
  };

  return (
    <PortfolioContext.Provider value={{
      portfolios,
      selectedPortfolioId,
      currentPortfolio,
      loading,
      refreshing,
      setSelectedPortfolioId: (id: string) => {
        setSelectedPortfolioId(id);
        selectedPortfolioIdRef.current = id;
      },
      createPortfolio,
      deletePortfolio,
      renamePortfolio,
      addHolding,
      updateHolding,
      removeHolding,
      refreshPrices,
      lastUpdated,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
