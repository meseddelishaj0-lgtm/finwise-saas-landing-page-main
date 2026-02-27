// utils/preload.ts
// App startup preloader - initializes market data service
// Minimal API usage: relies on marketDataService + WebSocket

import AsyncStorage from '@react-native-async-storage/async-storage';

// Main preload function - call this on app startup
// IMPORTANT: This function runs in the background without blocking
export async function preloadAppData(): Promise<void> {
  // One-time migration: clear stale FMP-era cache data
  try {
    const migrationKey = '@cache_migration_v2';
    const migrated = await AsyncStorage.getItem(migrationKey);
    if (!migrated) {
      const allKeys = await AsyncStorage.getAllKeys();
      const staleKeys = allKeys.filter(key =>
        key.startsWith('quote_cache_') ||
        key === '@daily_close_cache' ||
        key === '@market_stocks_data' ||
        key === '@market_crypto_data' ||
        key === '@market_etf_data' ||
        key === '@market_last_update' ||
        key === 'last_preload_time'
      );
      if (staleKeys.length > 0) {
        await AsyncStorage.multiRemove(staleKeys);
      }
      await AsyncStorage.setItem(migrationKey, Date.now().toString());
    }
  } catch {
    // Ignore migration errors
  }

  // Delay heavy loading to let the UI render first
  // This prevents the app from becoming unresponsive on startup
  setTimeout(async () => {
    try {
      // Import market data service dynamically to avoid circular deps
      const { marketDataService } = await import('../services/marketDataService');

      // Initialize market data service (Robinhood-style pre-loading)
      // Loads stocks, crypto, ETFs for instant tab switching
      // WebSocket subscribes all 117 symbols for live updates
      marketDataService.initialize();
    } catch (err) {
      // Silently handle errors - preload is non-critical
    }
  }, 2000); // 2 second delay after app start
}
