// hooks/useRemoteConfig.ts
// Hook to fetch and cache remote configuration from Edge Config
// Enables instant feature flag updates without app store updates

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';
const CONFIG_CACHE_KEY = 'remote_config';
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface RemoteConfig {
  features: {
    premiumEnabled: boolean;
    aiToolsEnabled: boolean;
    darkModeEnabled: boolean;
    pushNotificationsEnabled: boolean;
    socialFeedEnabled: boolean;
    priceAlertsEnabled: boolean;
    portfolioTrackingEnabled: boolean;
    watchlistSyncEnabled: boolean;
  };
  mobile: {
    minVersion: string;
    forceUpdate: boolean;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    refreshInterval: number;
    maxWatchlistItems: number;
    maxPortfolioItems: number;
  };
  api: {
    quoteCacheTTL: number;
    trendingCacheTTL: number;
    homeFeedCacheTTL: number;
    maxQuotesBatchSize: number;
  };
}

interface CachedConfig {
  config: RemoteConfig;
  timestamp: number;
}

// Default configuration (used as fallback)
const DEFAULT_CONFIG: RemoteConfig = {
  features: {
    premiumEnabled: true,
    aiToolsEnabled: true,
    darkModeEnabled: false,
    pushNotificationsEnabled: true,
    socialFeedEnabled: true,
    priceAlertsEnabled: true,
    portfolioTrackingEnabled: true,
    watchlistSyncEnabled: true,
  },
  mobile: {
    minVersion: '1.0.0',
    forceUpdate: false,
    maintenanceMode: false,
    maintenanceMessage: '',
    refreshInterval: 60000,
    maxWatchlistItems: 50,
    maxPortfolioItems: 100,
  },
  api: {
    quoteCacheTTL: 30,
    trendingCacheTTL: 60,
    homeFeedCacheTTL: 30,
    maxQuotesBatchSize: 50,
  },
};

// Singleton to share config across all hook instances
let sharedConfig: RemoteConfig | null = null;
let lastFetchTime = 0;
let fetchPromise: Promise<RemoteConfig> | null = null;

export function useRemoteConfig() {
  const [config, setConfig] = useState<RemoteConfig>(sharedConfig || DEFAULT_CONFIG);
  const [loading, setLoading] = useState(!sharedConfig);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchConfig = useCallback(async (force = false): Promise<RemoteConfig> => {
    const now = Date.now();

    // Use cached config if recent enough
    if (!force && sharedConfig && now - lastFetchTime < CONFIG_CACHE_TTL) {
      return sharedConfig;
    }

    // Reuse in-flight request to avoid duplicate fetches
    if (fetchPromise) {
      return fetchPromise;
    }

    fetchPromise = (async () => {
      try {
        // Try to load from AsyncStorage first (for offline support)
        if (!sharedConfig) {
          const cached = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
          if (cached) {
            const { config: cachedConfig, timestamp }: CachedConfig = JSON.parse(cached);
            // Use cache if less than 1 hour old
            if (now - timestamp < 60 * 60 * 1000) {
              sharedConfig = cachedConfig;
              lastFetchTime = timestamp;
            }
          }
        }

        // Fetch fresh config from API
        const res = await fetch(`${API_BASE_URL}/config`, {
          headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) {
          throw new Error(`Config fetch failed: ${res.status}`);
        }

        const data = await res.json();

        // Merge with defaults to ensure all keys exist
        const newConfig: RemoteConfig = {
          features: { ...DEFAULT_CONFIG.features, ...data.features },
          mobile: { ...DEFAULT_CONFIG.mobile, ...data.mobile },
          api: { ...DEFAULT_CONFIG.api, ...data.api },
        };

        // Update shared state
        sharedConfig = newConfig;
        lastFetchTime = now;

        // Cache to AsyncStorage for offline support
        await AsyncStorage.setItem(
          CONFIG_CACHE_KEY,
          JSON.stringify({ config: newConfig, timestamp: now })
        );

        return newConfig;
      } catch (err) {
        
        // Return cached or default config on error
        return sharedConfig || DEFAULT_CONFIG;
      } finally {
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const loadConfig = async () => {
      try {
        const newConfig = await fetchConfig();
        if (mountedRef.current) {
          setConfig(newConfig);
          setLoading(false);
          setError(null);
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadConfig();

    // Refresh config periodically in background
    const interval = setInterval(() => {
      fetchConfig();
    }, CONFIG_CACHE_TTL);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchConfig]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const newConfig = await fetchConfig(true);
      setConfig(newConfig);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    refresh,
    isFeatureEnabled: (feature: keyof RemoteConfig['features']) => config.features[feature],
    isMaintenanceMode: config.mobile.maintenanceMode,
    requiresForceUpdate: config.mobile.forceUpdate,
  };
}

// Utility to prefetch config (call on app start)
export async function prefetchRemoteConfig(): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
    if (cached) {
      const { config, timestamp }: CachedConfig = JSON.parse(cached);
      if (Date.now() - timestamp < CONFIG_CACHE_TTL) {
        sharedConfig = config;
        lastFetchTime = timestamp;
        return;
      }
    }

    // Fetch fresh config
    const res = await fetch(`${API_BASE_URL}/config`);
    if (res.ok) {
      const data = await res.json();
      sharedConfig = {
        features: { ...DEFAULT_CONFIG.features, ...data.features },
        mobile: { ...DEFAULT_CONFIG.mobile, ...data.mobile },
        api: { ...DEFAULT_CONFIG.api, ...data.api },
      };
      lastFetchTime = Date.now();

      await AsyncStorage.setItem(
        CONFIG_CACHE_KEY,
        JSON.stringify({ config: sharedConfig, timestamp: lastFetchTime })
      );
    }
  } catch (err) {
    
  }
}
