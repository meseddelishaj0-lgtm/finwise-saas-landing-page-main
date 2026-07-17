// context/PortfolioContext.tsx
// Shared portfolio state across the app
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth';

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
          // Use Twelve Data's pre-calculated change value
          const change = parseFloat(item.change) || (previousClose > 0 ? price - previousClose : 0);
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

  // Portfolios are stored PER USER — a shared device-wide key let a new
  // registration inherit the previous account's holdings.
  const authUserId = useAuth((state: any) => (state.user?.id ? String(state.user.id) : null));
  const storageKey = authUserId ? `user_portfolios_v2:${authUserId}` : 'user_portfolios_v2:anon';
  const dirtyKey = `portfolio_dirty:${authUserId ?? 'anon'}`;
  const serverSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push the full local portfolio set to the server (fire-and-forget;
  // the dirty flag stays set until a push succeeds, so offline edits are
  // retried on the next change or app launch).
  const pushToServer = useCallback(async (list: Portfolio[]) => {
    if (!authUserId) return;
    try {
      const res = await fetch('https://www.wallstreetstocks.ai/api/portfolio/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': authUserId },
        body: JSON.stringify({
          portfolios: list.map((pf) => ({ name: pf.name, holdings: pf.holdings })),
        }),
      });
      if (res.ok) await AsyncStorage.removeItem(dirtyKey);
    } catch {}
  }, [authUserId, dirtyKey]);

  // Reconcile local cache with the account's server copy after load:
  // unsynced local edits win (push), otherwise the server copy wins
  // (adopt) — so portfolios survive reinstalls and follow the account.
  const reconcileWithServer = useCallback(async (localList: Portfolio[]) => {
    if (!authUserId) return;
    try {
      const dirty = await AsyncStorage.getItem(dirtyKey);
      const localHasHoldings = localList.some((pf) => pf.holdings.length > 0);
      if (dirty && localHasHoldings) {
        await pushToServer(localList);
        return;
      }
      const res = await fetch('https://www.wallstreetstocks.ai/api/portfolio/sync', {
        headers: { 'x-user-id': authUserId },
      });
      if (!res.ok) return;
      const data = await res.json();
      const serverList: Portfolio[] = (Array.isArray(data?.portfolios) ? data.portfolios : [])
        .map((pf: any) => ({
          id: generateId(),
          name: pf.name || 'Main Portfolio',
          holdings: Array.isArray(pf.holdings) ? pf.holdings : [],
        }));
      const serverHasHoldings = serverList.some((pf) => pf.holdings.length > 0);

      if (serverHasHoldings) {
        // Adopt the account's server copy
        setPortfolios(serverList);
        portfoliosRef.current = serverList;
        const firstId = serverList[0].id;
        setSelectedPortfolioId(firstId);
        selectedPortfolioIdRef.current = firstId;
        const withPrices = await fetchPricesForPortfolio(serverList[0]);
        setCurrentPortfolio(withPrices);
        setLastUpdated(new Date());
        await AsyncStorage.setItem(storageKey, JSON.stringify({
          portfolios: serverList,
          selectedPortfolioId: firstId,
        }));
      } else if (localHasHoldings) {
        // First sync for this account: rescue the phone-only portfolio
        await pushToServer(localList);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, dirtyKey, pushToServer, fetchPricesForPortfolio, storageKey]);

  // Load portfolios whenever the signed-in user changes
  useEffect(() => {
    const loadPortfolios = async () => {
      setLoading(true);
      // Clear any previous account's data immediately so it never flashes
      setPortfolios([]);
      setCurrentPortfolio(null);
      portfoliosRef.current = [];
      try {
        let saved = await AsyncStorage.getItem(storageKey);

        // One-time adoption of the old shared key by the device's current
        // user (the historical owner of that data), then retire it.
        if (!saved && authUserId) {
          const legacy = await AsyncStorage.getItem('user_portfolios_v2');
          const claimed = await AsyncStorage.getItem('user_portfolios_claimed');
          if (legacy && !claimed) {
            await AsyncStorage.setItem(storageKey, legacy);
            await AsyncStorage.setItem('user_portfolios_claimed', authUserId);
            await AsyncStorage.removeItem('user_portfolios_v2');
            await AsyncStorage.removeItem('user_portfolio_holdings');
            saved = legacy;
          }
        }

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
          // Fresh account: start with an empty portfolio — holdings come
          // from onboarding or manual adds, never demo data.
          const defaultPortfolio: Portfolio = {
            id: generateId(),
            name: 'Main Portfolio',
            holdings: [],
          };

          setPortfolios([defaultPortfolio]);
          setSelectedPortfolioId(defaultPortfolio.id);

          // Update refs
          portfoliosRef.current = [defaultPortfolio];
          selectedPortfolioIdRef.current = defaultPortfolio.id;

          await AsyncStorage.setItem(storageKey, JSON.stringify({
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
      // Background: reconcile with the account's server copy
      reconcileWithServer(portfoliosRef.current);
    };

    loadPortfolios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Save to AsyncStorage (per-user key) whenever portfolios change, and
  // mirror to the server shortly after (debounced, last write wins)
  useEffect(() => {
    if (!loading && portfolios.length > 0) {
      AsyncStorage.setItem(storageKey, JSON.stringify({
        portfolios,
        selectedPortfolioId,
      }));
      AsyncStorage.setItem(dirtyKey, '1').catch(() => {});
      if (serverSyncTimer.current) clearTimeout(serverSyncTimer.current);
      serverSyncTimer.current = setTimeout(() => {
        pushToServer(portfolios);
      }, 2500);
    }
    return () => {
      if (serverSyncTimer.current) clearTimeout(serverSyncTimer.current);
    };
  }, [portfolios, selectedPortfolioId, loading, storageKey, dirtyKey, pushToServer]);

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
