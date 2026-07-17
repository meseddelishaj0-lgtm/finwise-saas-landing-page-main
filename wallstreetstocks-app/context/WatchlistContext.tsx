// context/WatchlistContext.tsx - Unified Watchlist Management with Optimizations
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth';

const WATCHLIST_KEY = 'user_watchlist';
const API_URL = 'https://www.wallstreetstocks.ai';
const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

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
  const scopedKeyRef = useRef<string>('');

  // Watchlist is stored PER USER — a shared device-wide key let a new
  // registration inherit the previous account's watchlist.
  const authUserId = useAuth((state: any) => (state.user?.id ? String(state.user.id) : null));
  const scopedKey = authUserId ? `${WATCHLIST_KEY}:${authUserId}` : `${WATCHLIST_KEY}:anon`;
  scopedKeyRef.current = scopedKey;

  // Load watchlist whenever the signed-in user changes
  const loadWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    setInitialized(false);
    setWatchlist([]);
    try {
      let saved = await AsyncStorage.getItem(scopedKey);

      // One-time adoption of the old shared key by the device's current user
      if (!saved && authUserId) {
        const legacy = await AsyncStorage.getItem(WATCHLIST_KEY);
        const claimed = await AsyncStorage.getItem('user_watchlist_claimed');
        if (legacy && !claimed) {
          await AsyncStorage.setItem(scopedKey, legacy);
          await AsyncStorage.setItem('user_watchlist_claimed', authUserId);
          await AsyncStorage.removeItem(WATCHLIST_KEY);
          saved = legacy;
        }
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        setWatchlist(parsed);
      } else {
        // Default watchlist for new users (onboarding replaces/extends it)
        const defaultWatchlist = ['NVDA', 'GOOGL', 'AMZN', 'META'];
        setWatchlist(defaultWatchlist);
        await AsyncStorage.setItem(scopedKey, JSON.stringify(defaultWatchlist));
      }
    } catch (err) {
      setWatchlist(['NVDA', 'GOOGL', 'AMZN', 'META']);
    } finally {
      setWatchlistLoading(false);
      setInitialized(true);
    }
  }, [scopedKey, authUserId]);

  // Load on mount and on account switch
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
        await AsyncStorage.setItem(scopedKey, JSON.stringify(pendingWatchlistRef.current));
      } catch (err) {
      }
    }, SAVE_DEBOUNCE_MS);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchlist, initialized, scopedKey]);

  // Ensure save happens on unmount if pending
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Force immediate save on unmount
        if (scopedKeyRef.current) {
          AsyncStorage.setItem(scopedKeyRef.current, JSON.stringify(pendingWatchlistRef.current)).catch(() => {});
        }
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
      // Validate stock exists using Twelve Data API
      const res = await fetch(`${TWELVE_DATA_URL}/quote?symbol=${upperSymbol}&apikey=${TWELVE_DATA_API_KEY}`);
      const data = await res.json();

      if (!data || data.code || !data.symbol) {
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
        } catch (apiErr) {
        }
      }

      Alert.alert('Success', `${upperSymbol} added to your watchlist!`);
      return true;
    } catch (err) {
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
      } catch (apiErr) {
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
