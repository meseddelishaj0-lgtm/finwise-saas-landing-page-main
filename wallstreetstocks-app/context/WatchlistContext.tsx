// context/WatchlistContext.tsx - Unified Watchlist Management with Optimizations
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WATCHLIST_KEY = 'user_watchlist';
const API_URL = 'https://www.wallstreetstocks.ai';
const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Debounce delay for AsyncStorage saves (500ms)
const SAVE_DEBOUNCE_MS = 500;

interface WatchlistContextType {
  watchlist: string[];
  watchlistLoading: boolean;
  addToWatchlist: (symbol: string, userId?: number) => Promise<boolean>;
  removeFromWatchlist: (symbol: string, userId?: number) => Promise<boolean>;
  isInWatchlist: (symbol: string) => boolean;
  refreshWatchlist: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Debounce timer ref for optimized saves
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWatchlistRef = useRef<string[]>([]);

  // Load watchlist from AsyncStorage on mount
  const loadWatchlist = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(WATCHLIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setWatchlist(parsed);
      } else {
        // Default watchlist for new users
        const defaultWatchlist = ['NVDA', 'GOOGL', 'AMZN', 'META'];
        setWatchlist(defaultWatchlist);
        await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(defaultWatchlist));
      }
    } catch (err) {
      console.error('Error loading watchlist:', err);
      setWatchlist(['NVDA', 'GOOGL', 'AMZN', 'META']);
    } finally {
      setWatchlistLoading(false);
      setInitialized(true);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  // Debounced save to AsyncStorage - batches rapid changes together
  useEffect(() => {
    if (!initialized) return;

    // Store pending watchlist
    pendingWatchlistRef.current = watchlist;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(pendingWatchlistRef.current));
        console.log('💾 Watchlist saved (debounced)');
      } catch (err) {
        console.error('Error saving watchlist:', err);
      }
    }, SAVE_DEBOUNCE_MS);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchlist, initialized]);

  // Ensure save happens on unmount if pending
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Force immediate save on unmount
        AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(pendingWatchlistRef.current)).catch(console.error);
      }
    };
  }, []);

  // Check if symbol is in watchlist
  const isInWatchlist = useCallback((symbol: string): boolean => {
    return watchlist.includes(symbol.toUpperCase());
  }, [watchlist]);

  // Add to watchlist
  const addToWatchlist = useCallback(async (symbol: string, userId?: number): Promise<boolean> => {
    const upperSymbol = symbol.toUpperCase().trim();

    // Check if already in watchlist
    if (isInWatchlist(upperSymbol)) {
      Alert.alert('Already Added', `${upperSymbol} is already in your watchlist`);
      return false;
    }

    try {
      // Validate stock exists using FMP API
      const res = await fetch(`${FMP_BASE_URL}/quote/${upperSymbol}?apikey=${FMP_API_KEY}`);
      const data = await res.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        Alert.alert('Error', `Stock ${upperSymbol} not found`);
        return false;
      }

      // Add to local state (this triggers AsyncStorage save via useEffect)
      setWatchlist(prev => [...prev, upperSymbol]);

      // Sync to backend API if userId provided
      if (userId) {
        try {
          await fetch(`${API_URL}/api/watchlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, ticker: upperSymbol }),
          });
          console.log(`✅ Synced ${upperSymbol} to backend watchlist`);
        } catch (apiErr) {
          console.warn('Backend sync failed (offline mode):', apiErr);
        }
      }

      Alert.alert('Success', `${upperSymbol} added to your watchlist!`);
      return true;
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      Alert.alert('Error', 'Failed to add stock. Please try again.');
      return false;
    }
  }, [isInWatchlist]);

  // Remove from watchlist
  const removeFromWatchlist = useCallback(async (symbol: string, userId?: number): Promise<boolean> => {
    const upperSymbol = symbol.toUpperCase().trim();

    // Check if in watchlist
    if (!isInWatchlist(upperSymbol)) {
      return false;
    }

    // Remove from local state (this triggers AsyncStorage save via useEffect)
    setWatchlist(prev => prev.filter(s => s !== upperSymbol));

    // Sync to backend API if userId provided
    if (userId) {
      try {
        await fetch(`${API_URL}/api/watchlist?userId=${userId}&ticker=${upperSymbol}`, {
          method: 'DELETE',
        });
        console.log(`✅ Removed ${upperSymbol} from backend watchlist`);
      } catch (apiErr) {
        console.warn('Backend sync failed (offline mode):', apiErr);
      }
    }

    Alert.alert('Removed', `${upperSymbol} removed from your watchlist`);
    return true;
  }, [isInWatchlist]);

  // Refresh watchlist (reload from storage)
  const refreshWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    await loadWatchlist();
  }, [loadWatchlist]);

  return (
    <WatchlistContext.Provider value={{
      watchlist,
      watchlistLoading,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
      refreshWatchlist,
    }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
}
