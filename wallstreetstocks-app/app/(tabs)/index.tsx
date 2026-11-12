// app/(tabs)/index.tsx - REDESIGNED CLEAN WHITE VERSION WITH WATCHLIST
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cachedJson } from '@/lib/cachedFetch';
import { parseLocaleNumber } from '@/lib/parseNumber';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  AppState,
  AppStateStatus,
  BackHandler,
  ToastAndroid,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';
import { useContentWidth } from '@/hooks/useContentWidth';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { useWatchlist } from '@/context/WatchlistContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { useWebSocket } from '@/context/WebSocketContext';
import { useUserProfile } from '@/context/UserProfileContext';
import { useAuth } from '@/lib/auth';
import { getPersonalInfo } from '@/lib/personalInfoStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchQuotesWithCache } from '@/services/quoteService';
import { priceStore } from '@/stores/priceStore';
import { displaySymbol } from '@/lib/symbolDisplay';
import { dateLocale } from '@/lib/dateLocale';
import { MarketStatusIndicator, MarketTimeLabel } from '@/components/AnimatedPrice';
import { InlineAdBanner } from '@/components/AdBanner';
import { marketDataService } from '@/services/marketDataService';
// Home uses theme-aware local skeletons (shared SkeletonLoader is light-only)
import StockLogo from '@/components/StockLogo';
import { useAppReview } from '@/hooks/useAppReview';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import FadeSlideIn from '@/components/FadeSlideIn';
import { LinearGradient } from 'expo-linear-gradient';
import { useScreenFocused } from '@/hooks/useScreenFocused';
import { buildAuthHeaders } from '@/lib/authHeaders';
import { styles } from '@/components/home/homeStyles';
import { ScalePress, STOCK_PICKS_PREVIEW, computeLivePortfolio } from '@/components/home/shared';
import PortfolioSection from '@/components/home/PortfolioSection';
import MarketOverviewStrip from '@/components/home/MarketOverviewStrip';
import WatchlistSection from '@/components/home/WatchlistSection';
import PicksCarousel from '@/components/home/PicksCarousel';

const chartWidth = 110;

// Fetch with timeout - fail fast if API is slow
const fetchWithTimeout = async (url: string, timeout: number = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

// Generate instant placeholder chart based on price trend
const generatePlaceholderChart = (price: number, changePercent: number, symbol?: string): number[] => {
  const points = 20;
  const data: number[] = [];

  // Calculate direction based on change
  const changeAmount = price * (changePercent / 100);
  const startPrice = price - changeAmount;

  // Create deterministic seed from symbol
  const seed = symbol ? symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10 : 0;
  const curveStrength = 0.1 + (seed * 0.02);

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const eased = progress < 0.5
      ? 2 * progress * progress * (1 + curveStrength)
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const clampedProgress = Math.max(0, Math.min(1, eased));
    const value = startPrice + (price - startPrice) * clampedProgress;
    data.push(Math.max(value, 0.01));
  }

  data[0] = Math.max(startPrice, 0.01);
  data[data.length - 1] = price;
  
  return data;
};

// Clean and validate chart data - fill gaps and remove invalid values
const cleanChartData = (data: number[]): number[] => {
  if (!data || data.length === 0) return [1, 1];

  // Filter out null, undefined, NaN, non-finite, and zero/negative values
  const cleaned: number[] = [];
  let lastValidValue = 1; // Default to 1 to avoid zero issues

  // Find first valid value
  for (const val of data) {
    if (typeof val === 'number' && isFinite(val) && !isNaN(val) && val > 0) {
      lastValidValue = val;
      break;
    }
  }

  // Fill array, replacing invalid values with last known good value
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (typeof val === 'number' && isFinite(val) && !isNaN(val) && val > 0) {
      cleaned.push(val);
      lastValidValue = val;
    } else {
      // Fill gap with last valid value
      cleaned.push(lastValidValue);
    }
  }

  // Ensure we have at least 4 points for a smooth line
  if (cleaned.length === 0) return [1, 1, 1, 1];
  if (cleaned.length === 1) return [cleaned[0], cleaned[0], cleaned[0], cleaned[0]];
  if (cleaned.length === 2) return [cleaned[0], cleaned[0], cleaned[1], cleaned[1]];
  if (cleaned.length === 3) return [cleaned[0], cleaned[1], cleaned[1], cleaned[2]];

  return cleaned;
};

// Interpolate sparkline data to create smooth continuous lines
const interpolateSparkline = (data: number[], targetPoints: number = 20): number[] => {
  const cleaned = cleanChartData(data);
  if (cleaned.length < 2) return [50, 50];

  // Linear interpolation to create more points
  const result: number[] = [];
  const step = (cleaned.length - 1) / (targetPoints - 1);

  for (let i = 0; i < targetPoints; i++) {
    const pos = i * step;
    const lower = Math.floor(pos);
    const upper = Math.min(lower + 1, cleaned.length - 1);
    const fraction = pos - lower;

    // Linear interpolation between points
    const value = cleaned[lower] + (cleaned[upper] - cleaned[lower]) * fraction;
    result.push(value);
  }

  // Normalize to a range that shows variation (0-100 scale)
  const min = Math.min(...result);
  const max = Math.max(...result);
  const range = max - min;

  if (range < 0.01) {
    // If range is too small, create artificial variation to show flat line
    return result.map(() => 50);
  }

  // Scale to 0-100 range to show proper variation
  return result.map(val => ((val - min) / range) * 100);
};

const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

// Format news date to relative time
const formatNewsDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

// Real-time prices handled by WebSocket (pre-market + after-hours included)
// No API polling needed - WebSocket provides instant updates via Twelve Data WebSocket

// Batch quotes helper - uses shared quote service with cache support
// Prices sync with chart data for consistent display across screens
async function fetchBatchQuotes(symbols: string[]): Promise<any[]> {
  return fetchQuotesWithCache(symbols, { timeout: 15000 });
}

// Time-of-day greeting for the header
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Market Calendar cards (upcoming earnings / IPOs / dividends).
// Well-known large caps get priority so the earnings/dividends cards
// aren't dominated by tiny tickers from the raw FMP calendars.
const CAL_PRIORITY = new Set([
  'AAPL','MSFT','NVDA','GOOGL','GOOG','AMZN','META','TSLA','AVGO','JPM','LLY','V','MA','UNH',
  'XOM','WMT','HD','PG','COST','ORCL','NFLX','AMD','CRM','BAC','KO','PEP','DIS','CSCO','INTC',
  'PLTR','UBER','MU','TSM','ANET','VRT','SHOP','CRWD','NOW','SNOW','DDOG','ISRG','TTD','ABBV',
  'MRK','PFE','TMO','ABT','NKE','MCD','SBUX','CAT','GE','BA','GS','MS','C','WFC','T','VZ','IBM',
]);
const isUsSymbol = (sym: string) => /^[A-Z]{1,5}$/.test(sym || '');
const calDate = (d: string) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mon = months[parseInt((d || '').slice(5, 7), 10) - 1] || '';
  return `${mon} ${parseInt((d || '').slice(8, 10), 10) || ''}`;
};
// Priority names first, then remaining US symbols, both date-ordered
const pickCalRows = (rows: any[], take: number) => {
  const dated = rows.filter((r) => r?.symbol && isUsSymbol(r.symbol));
  dated.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const prio = dated.filter((r) => CAL_PRIORITY.has(r.symbol));
  const rest = dated.filter((r) => !CAL_PRIORITY.has(r.symbol));
  return [...prio, ...rest].slice(0, take);
};

// Market Overview symbols - crypto (24/7 movement for Apple review) + major index ETFs
const MARKET_OVERVIEW_SYMBOLS = [
  'BTC/USD',   // Bitcoin
  'SPY',       // S&P 500 ETF
  'ETH/USD',   // Ethereum
  'QQQ',       // Nasdaq 100 ETF
  'SOL/USD',   // Solana
  'BNB/USD',   // Binance Coin
  'XRP/USD',   // Ripple
  'ADA/USD',   // Cardano
  'DOGE/USD',  // Dogecoin
  'AVAX/USD',  // Avalanche
  'DOT/USD',   // Polkadot
  'MATIC/USD', // Polygon
  'LINK/USD',  // Chainlink
  'LTC/USD',   // Litecoin
];

// WebSocket subscriptions for popular stocks are now handled centrally
// by marketDataService (subscribes all 117 core symbols)
// The home page only needs to subscribe the user's watchlist symbols

export default function Dashboard() {
  const { colors, isDark } = useTheme();
  // Live content width (tablet column / foldable aware)
  const width = useContentWidth();
  // Full-bleed chart width: spans the hero card edge-to-edge (card margins only)
  const portfolioChartBleedWidth = width - 32;
  // Picks carousel geometry: full-width cards, 12px gap, snap per card
  const pickCardWidth = width - 32;
  const pickCardSnap = pickCardWidth + 12;
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { isPremium, currentTier } = useSubscription();
  const { subscribe: wsSubscribe, isConnected: wsConnected } = useWebSocket();
  const {
    portfolios: contextPortfolios,
    selectedPortfolioId: contextSelectedId,
    currentPortfolio: contextCurrentPortfolio,
    loading: portfolioLoading,
    setSelectedPortfolioId: setContextSelectedId,
    createPortfolio: contextCreatePortfolio,
    deletePortfolio: contextDeletePortfolio,
    renamePortfolio: contextRenamePortfolio,
    addHolding: contextAddHolding,
    updateHolding: contextUpdateHolding,
    removeHolding: contextRemoveHolding,
    refreshPrices,
  } = usePortfolio();
  
  // App review prompt - shows after user has engaged with the app
  const { trackAction, checkAndPromptReview } = useAppReview();
  
  const [refreshing, setRefreshing] = useState(false);
  const [stockPicksData, setStockPicksData] = useState<any[]>([]);
  const [serverMomentum, setServerMomentum] = useState<any[]>([]);
  const [serverGrowth, setServerGrowth] = useState<any[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  // Monotonic id so a slow earlier search can't overwrite a newer one's results.
  const searchSeqRef = useRef(0);

  // Add Stock Modal
  const [addStockModal, setAddStockModal] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockShares, setNewStockShares] = useState('');
  const [newStockAvgCost, setNewStockAvgCost] = useState('');
  const [addingStock, setAddingStock] = useState(false);
  const [stockSearchResults, setStockSearchResults] = useState<any[]>([]);
  const [showStockSearchDropdown, setShowStockSearchDropdown] = useState(false);
  const [addStockLivePrice, setAddStockLivePrice] = useState<number | null>(null);
  const [addStockPriceLoading, setAddStockPriceLoading] = useState(false);
  // True once the user types their own avg cost — auto-fill then backs off
  const addStockCostEditedRef = useRef(false);

  // Edit Holding Modal
  const [editHoldingModal, setEditHoldingModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<{symbol: string; shares: number; avgCost: number} | null>(null);
  const [editShares, setEditShares] = useState('');
  const [editAvgCost, setEditAvgCost] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Holding Options Modal (when tapping a holding)
  const [holdingOptionsModal, setHoldingOptionsModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<any>(null);

  // Watchlist Modal
  const [watchlistModal, setWatchlistModal] = useState(false);
  const [watchlistSymbol, setWatchlistSymbol] = useState('');
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [watchlistSearchResults, setWatchlistSearchResults] = useState<any[]>([]);
  const [showWatchlistSearchDropdown, setShowWatchlistSearchDropdown] = useState(false);

  // Watchlist Filter & Sort
  const [watchlistFilter, setWatchlistFilter] = useState<'All' | 'Gainers' | 'Losers'>('All');
  const [watchlistSort, setWatchlistSort] = useState<'My Sort' | 'Name' | 'Price' | 'Change %' | 'Change $'>('My Sort');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Portfolio graph time range
  const [portfolioTimeRange, setPortfolioTimeRange] = useState('1Y');

  // Live Market Overview - alternating indices and crypto for 24/7 updates
  const INDICES_CACHE_KEY = 'cached_market_indices';
  const [majorIndices, setMajorIndices] = useState([
    { symbol: 'BTC/USD', name: 'Bitcoin', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'SPY', name: 'S&P 500', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'ETH/USD', name: 'Ethereum', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'QQQ', name: 'Nasdaq 100', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'SOL/USD', name: 'Solana', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'BNB/USD', name: 'Binance Coin', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'XRP/USD', name: 'Ripple', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'ADA/USD', name: 'Cardano', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'DOGE/USD', name: 'Dogecoin', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'AVAX/USD', name: 'Avalanche', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'DOT/USD', name: 'Polkadot', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'MATIC/USD', name: 'Polygon', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'LINK/USD', name: 'Chainlink', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'LTC/USD', name: 'Litecoin', price: 0, change: 0, changePercent: 0, color: '#34C759' },
  ]);
  const [indicesLoading, setIndicesLoading] = useState(true);
  const [indicesCacheLoaded, setIndicesCacheLoaded] = useState(false);

  // Market News
  const NEWS_CACHE_KEY = 'cached_market_news';
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsCacheLoaded, setNewsCacheLoaded] = useState(false);

  // Unread messages count
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Portfolio data
  const [portfolio, setPortfolio] = useState({
    totalValue: 0,
    dayChange: 0,
    dayChangePercent: 0,
    yearChange: 0,
    yearChangePercent: 0,
    holdings: [] as any[],
    chartData: [] as Array<{ value: number; label: string; dataPointText?: string }>,
    chartLabels: [] as string[]
  });

  // Multiple portfolios support - using context
  // Create aliases for context values to minimize code changes
  const userPortfolios = contextPortfolios;
  const selectedPortfolioId = contextSelectedId;
  const setSelectedPortfolioId = setContextSelectedId;
  const holdingsInitialized = !portfolioLoading;

  const [showPortfolioDropdown, setShowPortfolioDropdown] = useState(false);
  const [showCreatePortfolioModal, setShowCreatePortfolioModal] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [showPortfolioOptionsModal, setShowPortfolioOptionsModal] = useState(false);
  const [editingPortfolioName, setEditingPortfolioName] = useState('');

  // Get current portfolio's holdings from context
  const currentPortfolio = userPortfolios.find(p => p.id === selectedPortfolioId);
  const userHoldings = currentPortfolio?.holdings || [];

  // Header avatar: the profile context first, then the auth user, then the
  // local profile cache — picking a photo on My Profile saves there without
  // uploading. Reloaded on focus so a newly chosen picture shows immediately.
  const { profile: userProfile } = useUserProfile();
  const authUserId = useAuth((s: any) => s.user?.id);
  const authProfileImage = useAuth((s: any) => s.user?.profileImage);
  const [cachedAvatar, setCachedAvatar] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getPersonalInfo(authUserId)
        .then((info: any) => {
          if (alive) setCachedAvatar(info?.avatar || null);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [authUserId])
  );

  const headerAvatar: string | null =
    userProfile?.profileImage || authProfileImage || cachedAvatar || null;

  // Track back press for "press again to exit" behavior
  const backPressedOnce = useRef(false);

  // Handle Android back button - prevent accidental exit
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const onBackPress = () => {
        if (backPressedOnce.current) {
          // Second press - exit app
          BackHandler.exitApp();
          return true;
        }

        // First press - show toast and wait for second press
        backPressedOnce.current = true;
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);

        // Reset after 2 seconds
        setTimeout(() => {
          backPressedOnce.current = false;
        }, 2000);

        return true; // Prevent default back behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // Refresh prices when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshPrices();
    }, [refreshPrices])
  );

  // Create new portfolio using context
  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    await contextCreatePortfolio(newPortfolioName.trim());
    setNewPortfolioName('');
    setShowCreatePortfolioModal(false);
  };

  // Delete current portfolio using context
  const deleteCurrentPortfolio = () => {
    if (userPortfolios.length <= 1) {
      Alert.alert(t('Cannot Delete'), t('You must have at least one portfolio.'));
      return;
    }
    Alert.alert(
      t('Delete Portfolio'),
      `Are you sure you want to delete "${currentPortfolio?.name}"? This cannot be undone.`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            await contextDeletePortfolio(selectedPortfolioId);
            setShowPortfolioOptionsModal(false);
          },
        },
      ]
    );
  };

  // Rename current portfolio using context
  const renameCurrentPortfolio = async () => {
    if (!editingPortfolioName.trim()) return;
    await contextRenamePortfolio(selectedPortfolioId, editingPortfolioName.trim());
    setShowPortfolioOptionsModal(false);
  };

  // Watchlist from context (single source of truth)
  const { watchlist, watchlistLoading: contextWatchlistLoading, addToWatchlist, removeFromWatchlist, refreshWatchlist } = useWatchlist();
  const [watchlistData, setWatchlistData] = useState<any[]>([]);
  const [watchlistDataLoading, setWatchlistDataLoading] = useState(true);

  // Note: Watchlist data is kept live via WebSocket - no need to refresh on focus
  // Removing refreshWatchlist() call here prevents the flash/glitch when navigating back
  // The watchlist context auto-loads on mount and WebSocket keeps prices updated

  // Fetch unread notifications count (bell badge in the header)
  const fetchUnreadMessagesCount = useCallback(async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) return;

      const data = await cachedJson(
        `https://www.wallstreetstocks.ai/api/notifications?userId=${storedUserId}`,
        30 * 1000,
        {
          cacheKey: `notif-count:${storedUserId}`,
          // Signed login token (the server still accepts the request without one)
          init: { headers: await buildAuthHeaders(storedUserId) },
        }
      );

      const items = Array.isArray(data) ? data : [];
      const totalUnread = items.filter((n: any) => !n.isRead).length;
      setUnreadMessagesCount(totalUnread);
    } catch {
    }
  }, []);

  // Refresh unread notifications count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUnreadMessagesCount();
    }, [fetchUnreadMessagesCount])
  );

  // Refresh market data when screen is focused
  // Uses cached data from priceStore so it's instant - no API calls needed
  // WebSocket handles real-time streaming, this just triggers UI refresh
  useFocusEffect(
    useCallback(() => {
      // Check if we should show app review prompt after user has browsed for a bit
      checkAndPromptReview();
    }, [checkAndPromptReview])
  );

  // Subscribe to WebSocket for real-time streaming
  useEffect(() => {
    if (wsConnected) {
      // Subscribe to market indices
      wsSubscribe(MARKET_OVERVIEW_SYMBOLS);
    }
  }, [wsConnected, wsSubscribe]);

  // Load cached market indices on mount (show last prices instantly)
  useEffect(() => {
    const loadCachedIndices = async () => {
      try {
        const cached = await AsyncStorage.getItem(INDICES_CACHE_KEY);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (parsedCache && Array.isArray(parsedCache) && parsedCache.length > 0) {
            // Merge cached prices into the current symbol list instead of
            // replacing it — caches from older versions may be missing
            // symbols (e.g. SPY/QQQ) and must not remove them
            setMajorIndices(prev => prev.map(item => {
              const cachedItem = parsedCache.find((c: any) => c?.symbol === item.symbol);
              return cachedItem && cachedItem.price > 0 ? { ...item, ...cachedItem } : item;
            }));
            setIndicesLoading(false);
          }
        }
      } catch {
        // Ignore cache errors
      } finally {
        setIndicesCacheLoaded(true);
      }
    };
    loadCachedIndices();
  }, []);

  // Save market indices to cache when they update (for next app open)
  useEffect(() => {
    if (indicesCacheLoaded && majorIndices.some(i => i.price > 0)) {
      AsyncStorage.setItem(INDICES_CACHE_KEY, JSON.stringify(majorIndices)).catch(() => {});
    }
  }, [majorIndices, indicesCacheLoaded]);

  // Load cached news on mount
  useEffect(() => {
    const loadCachedNews = async () => {
      try {
        const cached = await AsyncStorage.getItem(NEWS_CACHE_KEY);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (parsedCache && Array.isArray(parsedCache) && parsedCache.length > 0) {
            setNews(parsedCache);
            setNewsLoading(false);
          }
        }
      } catch {
        // Ignore cache errors
      } finally {
        setNewsCacheLoaded(true);
      }
    };
    loadCachedNews();
  }, []);

  // Save news to cache when they update
  useEffect(() => {
    if (newsCacheLoaded && news.length > 0) {
      AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(news)).catch(() => {});
    }
  }, [news, newsCacheLoaded]);

  // Subscribe portfolio holdings to WebSocket
  // Normalize crypto symbols (BTCUSD -> BTC/USD) for Twelve Data format
  useEffect(() => {
    if (wsConnected && contextCurrentPortfolio && contextCurrentPortfolio.holdings && contextCurrentPortfolio.holdings.length > 0) {
      const portfolioSymbols = contextCurrentPortfolio.holdings.map(h => {
        const symbol = h.symbol;
        // Convert crypto symbols like BTCUSD to BTC/USD for Twelve Data
        if (symbol.endsWith('USD') && !symbol.includes('/') && symbol.length >= 6 && symbol.length <= 10) {
          return symbol.slice(0, -3) + '/USD';
        }
        return symbol;
      });
      wsSubscribe(portfolioSymbols);
    }
  }, [wsConnected, contextCurrentPortfolio?.holdings, wsSubscribe]);

  // Subscribe watchlist to WebSocket
  // Normalize crypto symbols (BTCUSD -> BTC/USD) for Twelve Data format
  useEffect(() => {
    if (wsConnected && watchlist?.length > 0) {
      const normalizedSymbols = watchlist.map(symbol => {
        // Convert crypto symbols like BTCUSD to BTC/USD for Twelve Data
        if (symbol.endsWith('USD') && !symbol.includes('/') && symbol.length >= 6 && symbol.length <= 10) {
          return symbol.slice(0, -3) + '/USD';
        }
        return symbol;
      });
      wsSubscribe(normalizedSymbols);
    }
  }, [wsConnected, watchlist, wsSubscribe]);

  // Subscribe stock picks to WebSocket
  useEffect(() => {
    if (wsConnected) {
      const stockPicksSymbols = STOCK_PICKS_PREVIEW.map(p => p.symbol);
      wsSubscribe(stockPicksSymbols);
    }
  }, [wsConnected, wsSubscribe]);

  // Subscribe watchlist symbols to WebSocket for real-time prices
  // Core 117 symbols are subscribed by marketDataService centrally
  useEffect(() => {
    if (wsConnected && watchlist.length > 0) {
      wsSubscribe(watchlist);
    }
  }, [wsConnected, wsSubscribe, watchlist]);

  // ============= REAL-TIME PRICES =============
  // The portfolio card, market overview, watchlist and picks carousel each
  // refresh themselves from the price store (components/home/*), so a tick
  // re-renders only the section it belongs to. This screen used to re-render
  // in full 4 times a second on a timer, even on another tab.
  // The sections pause while this tab is not on display.
  const isFocused = useScreenFocused();

  // Re-subscribe to WebSocket when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (wsConnected) {
        wsSubscribe(MARKET_OVERVIEW_SYMBOLS);
        if (watchlist.length > 0) {
          wsSubscribe(watchlist);
        }
      }
    }, [wsConnected, wsSubscribe, watchlist])
  );

  // Extended hours price updates - WEBSOCKET ONLY
  // WebSocket handles ALL real-time prices including pre-market and after-hours
  // NO API POLLING - saves 700+ API credits/minute

  // Fetch live market overview data - INSTANT from pre-loaded crypto + ETF data
  const fetchMarketChips = async () => {
    const symbols = MARKET_OVERVIEW_SYMBOLS;
    const nameMap: { [key: string]: string } = {
      'BTC/USD': 'Bitcoin',
      'SPY': 'S&P 500',
      'ETH/USD': 'Ethereum',
      'QQQ': 'Nasdaq 100',
      'SOL/USD': 'Solana',
      'BNB/USD': 'Binance Coin',
      'XRP/USD': 'Ripple',
      'ADA/USD': 'Cardano',
      'DOGE/USD': 'Dogecoin',
      'AVAX/USD': 'Avalanche',
      'DOT/USD': 'Polkadot',
      'MATIC/USD': 'Polygon',
      'LINK/USD': 'Chainlink',
      'LTC/USD': 'Litecoin',
    };

    // INSTANT: Try to use pre-loaded crypto + ETF data from marketDataService
    const localCrypto = marketDataService.getLiveData('crypto');
    const localETFs = marketDataService.getLiveData('etf');
    const allLocalData = [...localCrypto, ...localETFs];
    const symbolSet = new Set(symbols);

    // Also check for crypto symbols without slash (e.g., BTCUSD for BTC/USD)
    const matchedData = allLocalData.filter(item => {
      const normalizedSymbol = item.symbol.replace('/', '');
      return symbolSet.has(item.symbol) || symbols.some(s => s.replace('/', '') === normalizedSymbol);
    });

    if (matchedData.length > 0) {
      // Instant - data already in memory
      const results = symbols.map(symbol => {
        const normalizedSymbol = symbol.replace('/', '');
        const item = matchedData.find(e => e.symbol === symbol || e.symbol.replace('/', '') === normalizedSymbol);
        if (item) {
          return {
            symbol,
            name: nameMap[symbol] || item.name || symbol,
            price: item.price,
            change: item.change,
            changePercent: item.changePercent,
            color: item.changePercent >= 0 ? '#34C759' : '#FF3B30',
          };
        }
        // Check price store as fallback (try both with and without slash)
        const storeQuote = priceStore.getQuote(symbol) || priceStore.getQuote(normalizedSymbol);
        if (storeQuote && storeQuote.price > 0) {
          return {
            symbol,
            name: nameMap[symbol] || storeQuote.name || symbol,
            price: storeQuote.price,
            change: storeQuote.change || 0,
            changePercent: storeQuote.changePercent || 0,
            color: (storeQuote.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30',
          };
        }
        // Keep symbols without a price yet as placeholders — they are
        // hidden at render time and fill in live from the price store
        return {
          symbol,
          name: nameMap[symbol] || symbol,
          price: 0,
          change: 0,
          changePercent: 0,
          color: '#34C759',
        };
      });

      if (results.some(item => item.price > 0)) {
        setMajorIndices(results);
        setIndicesLoading(false);
        return;
      }
    }

    // No API fallback - WebSocket handles all real-time prices (including pre-market/after-hours)
    // Just use priceStore data which is updated by WebSocket
    const storeResults = symbols.map(symbol => {
      const normalizedSymbol = symbol.replace('/', '');
      const storeQuote = priceStore.getQuote(symbol) || priceStore.getQuote(normalizedSymbol);
      return {
        symbol,
        name: nameMap[symbol] || storeQuote?.name || symbol,
        price: storeQuote?.price || 0,
        change: storeQuote?.change || 0,
        changePercent: storeQuote?.changePercent || 0,
        color: (storeQuote?.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30',
      };
    });

    if (storeResults.some(item => item.price > 0)) {
      setMajorIndices(storeResults);
    }
    setIndicesLoading(false);
  };

  // Fetch market news from FMP API
  const [calendars, setCalendars] = useState<{
    earnings: any[];
    ipos: any[];
    dividends: any[];
  }>({ earnings: [], ipos: [], dividends: [] });

  const fetchCalendars = async () => {
    try {
      const today = new Date();
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const plus = (days: number) => new Date(today.getTime() + days * 86400000);
      const [earnings, ipos, dividends] = await Promise.all([
        cachedJson(
          `${BASE_URL}/earning_calendar?from=${iso(today)}&to=${iso(plus(14))}&apikey=${FMP_API_KEY}`,
          6 * 60 * 60 * 1000,
          { cacheKey: 'cal-earnings' }
        ).catch(() => []),
        cachedJson(
          `${BASE_URL}/ipo_calendar?from=${iso(today)}&to=${iso(plus(30))}&apikey=${FMP_API_KEY}`,
          6 * 60 * 60 * 1000,
          { cacheKey: 'cal-ipos' }
        ).catch(() => []),
        cachedJson(
          `${BASE_URL}/stock_dividend_calendar?from=${iso(today)}&to=${iso(plus(14))}&apikey=${FMP_API_KEY}`,
          6 * 60 * 60 * 1000,
          { cacheKey: 'cal-dividends' }
        ).catch(() => []),
      ]);
      setCalendars({
        earnings: pickCalRows(Array.isArray(earnings) ? earnings.filter((r: any) => r.epsEstimated != null) : [], 3),
        ipos: (Array.isArray(ipos) ? ipos : [])
          .filter((r: any) => r.symbol)
          .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
          .slice(0, 3),
        dividends: pickCalRows(Array.isArray(dividends) ? dividends.filter((r: any) => (r.dividend || 0) > 0) : [], 3),
      });
    } catch {}
  };

  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const data = await cachedJson(
        `${BASE_URL}/stock_news?limit=10&apikey=${FMP_API_KEY}`,
        3 * 60 * 1000,
        { cacheKey: 'home-news' }
      );

      if (data && Array.isArray(data)) {
        setNews(data);
      }
    } catch {
      // Ignore errors, keep cached data
    } finally {
      setNewsLoading(false);
    }
  };

  // Fetch watchlist data - INSTANT with placeholders, then real charts in background
  const fetchWatchlist = async () => {
    if (watchlist.length === 0) {
      setWatchlistData([]);
      setWatchlistDataLoading(false);
      return;
    }

    // STEP 1: Try instant data from local cache with placeholder charts
    const localStocks = marketDataService.getLiveData('stock');
    const localCrypto = marketDataService.getLiveData('crypto');
    const localETFs = marketDataService.getLiveData('etf');
    const allLocalData = [...localStocks, ...localCrypto, ...localETFs];

    if (allLocalData.length > 0) {
      // Show instant data with placeholder charts
      const instantData = watchlist.map(symbol => {
        const localItem = allLocalData.find(item =>
          item.symbol === symbol ||
          item.symbol === symbol.replace('/', '') ||
          item.symbol + '/USD' === symbol
        );

        if (localItem) {
          const price = localItem.price || 0;
          const previousClose = localItem.previousClose || price;
          const change = localItem.change || 0;
          const changePercent = localItem.changePercent || 0;
          
          // Ensure priceStore has previousClose for WebSocket updates
          priceStore.setQuote({
            symbol: localItem.symbol,
            price,
            change,
            changePercent,
            previousClose,
            name: localItem.name || localItem.symbol,
          });
          
          return {
            symbol: localItem.symbol,
            name: localItem.name || localItem.symbol,
            price,
            change,
            changePercent,
            previousClose,
            color: changePercent >= 0 ? '#34C759' : '#FF3B30',
            data: generatePlaceholderChart(price, changePercent, localItem.symbol),
          };
        }

        // Unknown symbol - show placeholder
        return {
          symbol,
          name: symbol,
          price: 0,
          change: 0,
          changePercent: 0,
          color: '#8E8E93',
          data: [1, 1, 1, 1],
        };
      });

      setWatchlistData(instantData);
      setWatchlistDataLoading(false);

      // STEP 2: Fetch real chart data in background (don't block UI)
      fetchWatchlistCharts();
      return;
    }

    // Fallback: fetch from API
    await fetchWatchlistFromAPI();
  };

  // Fetch real chart data for watchlist sparklines
  const fetchWatchlistCharts = async () => {
    try {
      const { fetchSparklines } = await import('@/services/sparklineService');

      // Build change percents map for sparkline direction
      const changePercents: Record<string, number> = {};
      watchlistData.forEach(s => {
        if (s.symbol) changePercents[s.symbol] = s.changePercent || 0;
      });

      // Fetch sparklines
      const sparklineMap = await fetchSparklines(watchlist, changePercents);

      // Update sparklines
      setWatchlistData(prev => prev.map(item => {
        const sparkline = sparklineMap[item.symbol];
        if (sparkline && sparkline.length > 0) {
          return { ...item, data: sparkline };
        }
        return item;
      }));
    } catch {
    }
  };

  // Helper to fetch watchlist from API with placeholder charts first
  const fetchWatchlistFromAPI = async () => {
    setWatchlistDataLoading(true);
    try {
      const data = await fetchBatchQuotes(watchlist);

      if (data && Array.isArray(data)) {
        // Show data immediately with placeholder charts
        const watchlistWithPlaceholders = data.map((stock: any) => {
          const price = stock.price || 0;
          const previousClose = stock.previousClose || price;
          const change = stock.change || (price - previousClose);
          const changePercent = stock.changesPercentage || (previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0);
          
          // Store in priceStore with previousClose for WebSocket updates
          priceStore.setQuote({
            symbol: stock.symbol,
            price,
            change,
            changePercent,
            previousClose,
            name: stock.name || stock.symbol,
          });
          
          return {
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            price,
            change,
            changePercent,
            previousClose,
            color: changePercent >= 0 ? '#34C759' : '#FF3B30',
            data: generatePlaceholderChart(price || 100, changePercent, stock.symbol),
          };
        });

        setWatchlistData(watchlistWithPlaceholders);
        setWatchlistDataLoading(false);

        // Fetch real charts in background
        fetchWatchlistCharts();
      }
    } catch {
      setWatchlistDataLoading(false);
    }
  };

  // Fetch stock picks preview data. Premium users get the REAL top 3 from
  // the server (the manually curated list); free users keep the hardcoded
  // teaser symbols, which are masked in the UI anyway.
  const fetchStockPicks = async () => {
    try {
      if (isPremium) {
        try {
          const userId = (await AsyncStorage.getItem('userId'))
            || JSON.parse((await AsyncStorage.getItem('userData')) || 'null')?.id?.toString()
            || null;
          if (userId) {
            const fetchList = async (list: string) => {
              const data = await cachedJson(
                `https://www.wallstreetstocks.ai/api/stock-picks?list=${list}`,
                3 * 60 * 1000,
                {
                  init: { headers: { 'x-user-id': userId } },
                  cacheKey: `stock-picks:${list}:${userId}`,
                }
              ).catch(() => null);
              return Array.isArray(data?.picks) && data.picks.length > 0 ? data.picks : null;
            };
            const top3 = (arr: any[]) => arr.slice(0, 3).map((p: any) => ({
              symbol: p.symbol,
              category: p.category,
              price: p.price || 0,
              change: p.change || 0,
              changePercent: p.changePercent || 0,
            }));

            const [picks, momentum, growth] = await Promise.all([
              fetchList('picks'), fetchList('momentum'), fetchList('growth'),
            ]);

            const liveSymbols: string[] = [];
            if (momentum) {
              const t = top3(momentum);
              setServerMomentum(t);
              liveSymbols.push(...t.map((p: any) => p.symbol));
            }
            if (growth) {
              const t = top3(growth);
              setServerGrowth(t);
              liveSymbols.push(...t.map((p: any) => p.symbol));
            }
            if (picks) {
              const t = top3(picks);
              setStockPicksData(t);
              liveSymbols.push(...t.map((p: any) => p.symbol));
            }
            if (wsConnected && liveSymbols.length > 0) wsSubscribe(liveSymbols);
            if (picks) return;
          }
        } catch {
          // Fall through to the teaser fallback below
        }
      }

      const symbols = STOCK_PICKS_PREVIEW.map(p => p.symbol);
      // Use batch quotes endpoint with KV caching
      const data = await fetchBatchQuotes(symbols);

      if (data && Array.isArray(data)) {
        const enrichedPicks = STOCK_PICKS_PREVIEW.map(pick => {
          const quote = data.find((q: any) => q.symbol === pick.symbol);
          return {
            ...pick,
            price: quote?.price || 0,
            change: quote?.change || 0,
            changePercent: quote?.changesPercentage || 0,
          };
        });
        setStockPicksData(enrichedPicks);
      }
    } catch {
    }
  };

  // Fetch portfolio data with historical chart
  const fetchPortfolio = async () => {
    try {
      if (userHoldings.length === 0) {
        setPortfolio({
          totalValue: 0,
          dayChange: 0,
          dayChangePercent: 0,
          yearChange: 0,
          yearChangePercent: 0,
          holdings: [],
          chartData: [{ value: 0, label: '' }],
          chartLabels: ['']
        });
        return;
      }

      const symbols = userHoldings.map(h => h.symbol);
      // Use batch quotes endpoint with KV caching
      const quotes = await fetchBatchQuotes(symbols);

      if (quotes && Array.isArray(quotes)) {
        const holdings = userHoldings.map((holding) => {
          const quote = quotes.find(q => q.symbol === holding.symbol);
          if (!quote) return null;

          const currentValue = holding.shares * quote.price;
          const costBasis = holding.shares * holding.avgCost;
          const gain = currentValue - costBasis;
          const gainPercent = (gain / costBasis) * 100;

          return {
            ...holding,
            currentPrice: quote.price,
            currentValue,
            gain,
            gainPercent,
            dayChange: quote.change * holding.shares,
          };
        }).filter(h => h !== null);

        const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
        const totalDayChange = holdings.reduce((sum, h) => sum + h.dayChange, 0);
        const totalDayChangePercent = totalValue > 0 ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;

        // Fetch historical data for portfolio chart
        await fetchPortfolioChart(totalValue, holdings);

        setPortfolio(prev => ({
          ...prev,
          totalValue,
          dayChange: totalDayChange,
          dayChangePercent: totalDayChangePercent,
          holdings,
        }));
      }
    } catch {
    }
  };

  // Per-range chart cache so switching time ranges is instant
  const portfolioChartCacheRef = useRef<Record<string, { data: any[]; ts: number }>>({});

  // Fetch portfolio historical chart data — a true dollar-value series
  // built from EVERY holding's price history (top 10 by value), not just
  // the first holding scaled off cost basis. 1D uses intraday 15min bars.
  const fetchPortfolioChart = async (currentValue: number, holdings: any[]) => {
    try {
      if (!holdings || holdings.length === 0) return;

      const cacheKey = `${selectedPortfolioId ?? 'default'}-${portfolioTimeRange}-${holdings.length}`;
      const cached = portfolioChartCacheRef.current[cacheKey];
      if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
        setPortfolio(prev => ({ ...prev, chartData: cached.data }));
        return;
      }

      // Twelve Data interval + bar count per range (all holdings in ONE
      // batched time_series call — same provider as the WebSocket/charts)
      let interval = '1day';
      let outputsize = 365;
      switch (portfolioTimeRange) {
        case '1D': interval = '15min'; outputsize = 30; break;
        case '5D': interval = '1h'; outputsize = 40; break;
        case '1M': interval = '1day'; outputsize = 23; break;
        case '6M': interval = '1day'; outputsize = 130; break;
        case 'YTD': {
          const yearStart = new Date(new Date().getFullYear(), 0, 1);
          const calendarDays = Math.floor((Date.now() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
          interval = '1day';
          outputsize = Math.max(5, Math.ceil(calendarDays * 0.72));
          break;
        }
        case '1Y': interval = '1day'; outputsize = 252; break;
        case '5Y': interval = '1week'; outputsize = 260; break;
        case 'ALL': interval = '1week'; outputsize = 520; break;
      }

      // Cover the biggest positions; anything beyond rides along as a constant
      const holdingValue = (h: any) => h.currentValue || h.shares * (h.currentPrice || h.avgCost);
      const ranked = [...holdings].sort((a, b) => holdingValue(b) - holdingValue(a));
      const covered = ranked.slice(0, 10);
      const residual = ranked.slice(covered.length).reduce((sum, h) => sum + holdingValue(h), 0);

      // Twelve Data symbol format (BTCUSD -> BTC/USD), same rule as the
      // WebSocket subscriptions above
      const toTwelveSymbol = (symbol: string) =>
        symbol.endsWith('USD') && !symbol.includes('/') && symbol.length >= 6 && symbol.length <= 10
          ? symbol.slice(0, -3) + '/USD'
          : symbol;

      const twelveSymbols = covered.map(h => toTwelveSymbol(h.symbol));
      const res = await fetch(
        `${TWELVE_DATA_URL}/time_series?symbol=${twelveSymbols.map(encodeURIComponent).join(',')}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_API_KEY}`
      );
      const json = await res.json();

      // Batch responses are keyed by symbol; a single-symbol request
      // returns the series object directly
      const getSeries = (twelveSym: string): any[] | null => {
        const node = json?.values ? json : json?.[twelveSym];
        if (!node || node.status === 'error' || !Array.isArray(node.values)) return null;
        return node.values;
      };

      // Per-symbol time series, oldest → newest
      const seriesBySymbol: Record<string, { t: string; close: number }[]> = {};
      for (const h of covered) {
        let values = getSeries(toTwelveSymbol(h.symbol));
        if (!values || values.length === 0) continue;
        if (portfolioTimeRange === '1D') {
          // Latest session only (values arrive newest-first)
          const latestDay = String(values[0].datetime).split(' ')[0];
          values = values.filter((v: any) => String(v.datetime).startsWith(latestDay));
        }
        seriesBySymbol[h.symbol] = values
          .slice()
          .reverse()
          .map((v: any) => ({ t: String(v.datetime), close: parseFloat(v.close) }))
          .filter((p) => isFinite(p.close) && p.close > 0);
      }

      // Timeline = covered symbol with the most data points
      const timelineSym = covered
        .map(h => h.symbol)
        .filter(s => seriesBySymbol[s]?.length)
        .sort((a, b) => seriesBySymbol[b].length - seriesBySymbol[a].length)[0];
      if (!timelineSym) throw new Error('no history');

      const timeline = seriesBySymbol[timelineSym].map(p => p.t);

      // Sum shares * close across holdings, forward-filling missing bars
      const cursor: Record<string, number> = {};
      const lastClose: Record<string, number> = {};
      const values = timeline.map((t) => {
        let total = residual;
        for (const h of covered) {
          const series = seriesBySymbol[h.symbol];
          if (!series || series.length === 0) {
            total += holdingValue(h);
            continue;
          }
          let i = cursor[h.symbol] ?? 0;
          while (i < series.length && series[i].t <= t) {
            lastClose[h.symbol] = series[i].close;
            i++;
          }
          cursor[h.symbol] = i;
          total += h.shares * (lastClose[h.symbol] ?? series[0].close);
        }
        return { t, total };
      });

      const step = Math.max(1, Math.floor(values.length / 100));
      const sampled = values.filter((_, i) => i % step === 0 || i === values.length - 1);

      const historicalData = sampled.map(({ t, total }) => {
        const hasTime = t.includes(' ');
        const date = new Date(hasTime ? t.replace(' ', 'T') : t);
        const fullLabel = portfolioTimeRange === '1D'
          ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : hasTime
            ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } as any)
            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return { value: total, label: '', dataPointText: fullLabel };
      });

      if (historicalData.length < 2) throw new Error('not enough points');

      const startValue = historicalData[0].value;
      const endValue = historicalData[historicalData.length - 1].value;

      portfolioChartCacheRef.current[cacheKey] = { data: historicalData, ts: Date.now() };

      setPortfolio(prev => ({
        ...prev,
        chartData: historicalData,
        chartLabels: [],
        yearChange: endValue - startValue,
        yearChangePercent: startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0,
      }));
    } catch {
      setPortfolio(prev => ({
        ...prev,
        chartData: [
          { value: currentValue * 0.7, label: 'Start' },
          { value: currentValue * 0.8, label: '' },
          { value: currentValue * 0.9, label: '' },
          { value: currentValue, label: 'Now' }
        ],
        chartLabels: ['Start', '', '', 'Now']
      }));
    }
  };

  // Add stock to portfolio
  const handleAddStock = async () => {
    if (!newStockSymbol.trim() || !newStockShares.trim() || !newStockAvgCost.trim()) {
      Alert.alert(t('Error'), t('Please fill in all fields'));
      return;
    }

    setAddingStock(true);

    try {
      const symbol = newStockSymbol.toUpperCase().trim();

      // Use batch quotes endpoint with KV caching
      const quoteData = await fetchBatchQuotes([symbol]);

      if (!quoteData || !Array.isArray(quoteData) || quoteData.length === 0) {
        Alert.alert(t('Error'), `Stock ${symbol} not found`);
        setAddingStock(false);
        return;
      }

      const shares = parseLocaleNumber(newStockShares);
      const avgCost = parseLocaleNumber(newStockAvgCost);

      // Add holding using context
      await contextAddHolding(symbol, shares, avgCost);

      setNewStockSymbol('');
      setNewStockShares('');
      setNewStockAvgCost('');
      setStockSearchResults([]);
      setShowStockSearchDropdown(false);
      setAddStockModal(false);

      setTimeout(() => {
        fetchPortfolio();
      }, 500);

      Alert.alert(t('Success'), `${symbol} added to your portfolio!`);
    } catch {
      Alert.alert(t('Error'), t('Failed to add stock. Please try again.'));
    } finally {
      setAddingStock(false);
    }
  };

  // Remove stock from portfolio using context
  const handleRemoveStock = (symbol: string) => {
    Alert.alert(
      t('Remove Stock'),
      `Are you sure you want to remove ${symbol} from your portfolio?`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Remove'),
          style: 'destructive',
          onPress: async () => {
            await contextRemoveHolding(symbol);
            setHoldingOptionsModal(false);
            setSelectedHolding(null);
            setTimeout(() => {
              fetchPortfolio();
            }, 500);
          }
        }
      ]
    );
  };

  // Open holding options modal
  const handleHoldingPress = (holding: any) => {
    setSelectedHolding(holding);
    setHoldingOptionsModal(true);
  };

  // Open edit modal for a holding
  const handleOpenEditModal = () => {
    if (!selectedHolding) return;

    // Find the original holding data from userHoldings
    const originalHolding = userHoldings.find(h => h.symbol === selectedHolding.symbol);
    if (originalHolding) {
      setEditingHolding(originalHolding);
      setEditShares(originalHolding.shares.toString());
      setEditAvgCost(originalHolding.avgCost.toString());
      setHoldingOptionsModal(false);
      setEditHoldingModal(true);
    }
  };

  // Save edited holding
  const handleSaveEdit = async () => {
    if (!editingHolding || !editShares.trim() || !editAvgCost.trim()) {
      Alert.alert(t('Error'), t('Please fill in all fields'));
      return;
    }

    const newShares = parseLocaleNumber(editShares);
    const newAvgCost = parseLocaleNumber(editAvgCost);

    if (isNaN(newShares) || newShares <= 0) {
      Alert.alert(t('Error'), t('Please enter a valid number of shares'));
      return;
    }

    if (isNaN(newAvgCost) || newAvgCost <= 0) {
      Alert.alert(t('Error'), t('Please enter a valid average cost'));
      return;
    }

    setSavingEdit(true);

    try {
      // Update holding using context
      await contextUpdateHolding(editingHolding.symbol, newShares, newAvgCost);

      setEditHoldingModal(false);
      setEditingHolding(null);
      setEditShares('');
      setEditAvgCost('');

      setTimeout(() => {
        fetchPortfolio();
      }, 500);

      Alert.alert(t('Success'), `${editingHolding.symbol} updated successfully!`);
    } catch {
      Alert.alert(t('Error'), t('Failed to update holding. Please try again.'));
    } finally {
      setSavingEdit(false);
    }
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setEditHoldingModal(false);
    setEditingHolding(null);
    setEditShares('');
    setEditAvgCost('');
  };

  // Add to watchlist (uses context)
  const handleAddToWatchlist = async (symbol?: string) => {
    const symbolToAdd = symbol || watchlistSymbol.toUpperCase().trim();

    if (!symbolToAdd) {
      Alert.alert(t('Error'), t('Please enter a stock symbol'));
      return;
    }

    setAddingToWatchlist(true);
    setWatchlistSymbol('');
    setShowWatchlistSearchDropdown(false);
    setWatchlistModal(false);

    // Use context's addToWatchlist (handles validation, storage, and alerts)
    await addToWatchlist(symbolToAdd);
    
    // Track action for app review prompt
    trackAction();

    setAddingToWatchlist(false);
  };

  // Remove from watchlist (uses context)
  const handleRemoveFromWatchlist = (symbol: string) => {
    Alert.alert(
      t('Remove from Watchlist'),
      `Remove ${symbol} from your watchlist?`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Remove'),
          style: 'destructive',
          onPress: async () => {
            await removeFromWatchlist(symbol);
            setWatchlistData(prev => prev.filter(s => s.symbol !== symbol));
          }
        }
      ]
    );
  };

  // Search for tickers
  const searchTickers = async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const seq = ++searchSeqRef.current;
    try {
      const res = await fetch(
        `${BASE_URL}/search?query=${query}&limit=10&apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

      // A newer search started after this one — discard stale results.
      if (seq !== searchSeqRef.current) return;

      if (data && Array.isArray(data)) {
        setSearchResults(data);
        setShowSearchDropdown(true);
      }
    } catch {
    }
  };

  // Search for watchlist tickers
  const searchWatchlistTickers = async (query: string) => {
    if (!query || query.length < 1) {
      setWatchlistSearchResults([]);
      setShowWatchlistSearchDropdown(false);
      return;
    }

    try {
      const res = await fetch(
        `${BASE_URL}/search?query=${query}&limit=8&apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

      if (data && Array.isArray(data)) {
        setWatchlistSearchResults(data);
        setShowWatchlistSearchDropdown(true);
      }
    } catch {
    }
  };

  // Debounce search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery) {
        searchTickers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Debounce watchlist search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (watchlistSymbol) {
        searchWatchlistTickers(watchlistSymbol);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [watchlistSymbol]);

  // Search for Add Stock modal
  const searchStockTickers = async (query: string) => {
    if (!query || query.length < 1) {
      setStockSearchResults([]);
      setShowStockSearchDropdown(false);
      return;
    }

    try {
      const res = await fetch(
        `${BASE_URL}/search?query=${query}&limit=8&apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

      if (data && Array.isArray(data)) {
        setStockSearchResults(data);
        setShowStockSearchDropdown(true);
      }
    } catch {
    }
  };

  // Debounce Add Stock search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (newStockSymbol) {
        searchStockTickers(newStockSymbol);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [newStockSymbol]);

  // Fresh Add Stock modal → fresh auto-fill state
  useEffect(() => {
    if (addStockModal) {
      addStockCostEditedRef.current = false;
      setAddStockLivePrice(null);
      setAddStockPriceLoading(false);
    }
  }, [addStockModal]);

  // Fetch the live price for the typed/picked symbol (debounced) and
  // pre-fill Avg Cost with it unless the user entered their own number.
  useEffect(() => {
    if (!addStockModal) return;
    const sym = newStockSymbol.trim().toUpperCase();
    setAddStockLivePrice(null);
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(sym)) {
      setAddStockPriceLoading(false);
      return;
    }
    let alive = true;
    setAddStockPriceLoading(true);
    const timer = setTimeout(async () => {
      try {
        const quotes = await fetchBatchQuotes([sym]);
        const price = Number(quotes?.[0]?.price);
        if (!alive) return;
        if (Number.isFinite(price) && price > 0) {
          setAddStockLivePrice(price);
          if (!addStockCostEditedRef.current) {
            setNewStockAvgCost(price.toFixed(2));
          }
        }
      } catch {
        // quiet — the field simply stays manual
      } finally {
        if (alive) setAddStockPriceLoading(false);
      }
    }, 500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [newStockSymbol, addStockModal]);

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchMarketChips(),
      fetchNews(),
      fetchPortfolio(),
      fetchWatchlist(),
      fetchStockPicks()
    ]);
    setRefreshing(false);
  };

  // Refetch the picks preview once premium status resolves — RevenueCat
  // initializes async, so the initial staggered fetch can run while
  // isPremium is still false and miss the real server picks
  useEffect(() => {
    if (isPremium && holdingsInitialized) {
      fetchStockPicks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  // App state tracking for refreshing data when app comes to foreground
  const appState = useRef(AppState.currentState);

  // Handle app state changes - refresh data when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasInBackground = appState.current.match(/inactive|background/);
      appState.current = nextAppState;

      // When app returns to foreground, refresh prices from context
      // WebSocket handles real-time streaming, but refresh ensures UI is in sync
      if (nextAppState === 'active' && wasInBackground && holdingsInitialized) {
        refreshPrices();
      }
    });

    return () => subscription.remove();
  }, [holdingsInitialized, refreshPrices]);

  // Initial fetch - staggered loading for better responsiveness
  // Load visible content first, then secondary content
  useEffect(() => {
    if (!holdingsInitialized || contextWatchlistLoading) return;

    // PHASE 1: Load most visible content IMMEDIATELY
    // Market chips and trending use cached data so they're instant
    fetchMarketChips();
    fetchNews();
    fetchCalendars();

    // PHASE 2: Load secondary content after a brief delay (50ms)
    // This prevents UI from freezing by spreading out the work
    const secondaryTimer = setTimeout(() => {
      fetchWatchlist();
      fetchPortfolio();
    }, 50);

    // PHASE 3: Load tertiary content last (100ms delay)
    const tertiaryTimer = setTimeout(() => {
      fetchStockPicks();
    }, 100);

    return () => {
      clearTimeout(secondaryTimer);
      clearTimeout(tertiaryTimer);
    };
  }, [holdingsInitialized, contextWatchlistLoading]);

  // Refetch ONLY the chart when the time range changes — refetching the whole
  // portfolio (quotes + chart) on every range tap is what made it laggy
  useEffect(() => {
    // Priced from the store at this moment (the live totals now live in
    // PortfolioSection, so this screen no longer recomputes them per tick)
    const livePortfolioData = computeLivePortfolio(contextCurrentPortfolio?.holdings);
    const holdings = livePortfolioData?.holdings ?? contextCurrentPortfolio?.holdings;
    if (holdings && holdings.length > 0) {
      fetchPortfolioChart(
        livePortfolioData?.totalValue ?? contextCurrentPortfolio?.totalValue ?? 0,
        holdings
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioTimeRange, contextCurrentPortfolio?.holdings?.length]);

  // Refetch portfolio when selected portfolio changes
  useEffect(() => {
    if (holdingsInitialized && selectedPortfolioId) {
      fetchPortfolio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPortfolioId, holdingsInitialized]);

  // Track if initial watchlist data was loaded to prevent duplicate fetches
  const watchlistInitialLoadDone = useRef(false);

  // Refetch watchlist data when watchlist array changes (but not on initial load)
  useEffect(() => {
    // Skip the very first render - initial useEffect handles the first fetch
    if (!watchlistInitialLoadDone.current) {
      watchlistInitialLoadDone.current = true;
      return;
    }
    
    if (!contextWatchlistLoading && watchlist.length > 0) {
      fetchWatchlist();
    } else if (!contextWatchlistLoading && watchlist.length === 0) {
      setWatchlistData([]);
      setWatchlistDataLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist, contextWatchlistLoading]);

  // Format crypto symbols with slash for display (BTCUSD -> BTC/USD)
  // Crypto pairs display as their base asset (BTCUSD/BTC/USD -> BTC).
  // Display-only — underlying symbols stay full pairs for data/navigation.
  const formatSymbolDisplay = (symbol: string): string => displaySymbol(symbol);

  // Get icon for index type
  const getIndexIcon = (symbol: string): string => {
    switch (symbol) {
      case 'GLD':
      case 'SLV':
        return 'flash';
      case 'USO':
        return 'water';
      case 'TLT':
        return 'document-text';
      case 'VXX':
        return 'pulse';
      case 'EFA':
      case 'EEM':
        return 'globe';
      default:
        return 'stats-chart';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gold ambient glow behind the header */}
      <LinearGradient
        colors={isDark
          ? ['rgba(255,214,10,0.14)', 'rgba(255,214,10,0)']
          : ['rgba(184,134,11,0.10)', 'rgba(184,134,11,0)']}
        style={styles.headerGlow}
        pointerEvents="none"
      />

      {/* Floating + Button */}
      <View style={styles.fabWrapper} pointerEvents="box-none">
        <ScalePress
          style={styles.fab}
          activeScale={0.88}
          onPress={() => setAddStockModal(true)}
          accessibilityRole="button"
          accessibilityLabel={t('Add Stock')}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </ScalePress>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        onScrollBeginDrag={() => {
          setShowFilterDropdown(false);
          setShowSortDropdown(false);
        }}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <ScalePress
            style={[styles.avatarButton, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,214,10,0.35)' : 'rgba(184,134,11,0.3)' }]}
            activeScale={0.9}
            onPress={() => router.push('/menu')}
            accessibilityRole="button"
            accessibilityLabel={t('Menu')}
          >
            {headerAvatar ? (
              <ExpoImage
                source={{ uri: headerAvatar }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <Ionicons name="person" size={19} color={colors.primary} />
            )}
          </ScalePress>

          <View style={styles.searchWrapper}>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIconHeader} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('Search stocks, ETFs, bonds...')}
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (text.length === 0) {
                    setShowSearchDropdown(false);
                  }
                }}
                onFocus={() => {
                  if (searchQuery && searchResults.length > 0) {
                    setShowSearchDropdown(true);
                  }
                }}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchDropdown(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('Clear search')}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <View style={[styles.searchDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView 
                  style={styles.searchScrollView}
                  keyboardShouldPersistTaps="handled"
                >
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.searchResultItem, { borderBottomColor: colors.borderLight }]}
                      onPress={() => {
                        setSearchQuery('');
                        setShowSearchDropdown(false);
                        router.push(`/symbol/${encodeURIComponent(result.symbol)}/chart`);
                      }}
                    >
                      <View style={styles.searchResultLeft}>
                        <Text style={[styles.searchResultSymbol, { color: colors.text }]}>{result.symbol}</Text>
                        <Text style={[styles.searchResultName, { color: colors.textTertiary }]} numberOfLines={1}>
                          {result.name}
                        </Text>
                      </View>
                      <View style={styles.searchResultRight}>
                        <Text style={[styles.searchResultExchange, { color: colors.textSecondary }]}>{result.exchangeShortName}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => router.push('/notifications' as any)}
            style={styles.messagesIconContainer}
            accessibilityRole="button"
            accessibilityLabel={t('Notifications')}
          >
            <Ionicons name="notifications-outline" size={26} color={colors.primary} />
            {unreadMessagesCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Greeting + market status */}
        <FadeSlideIn distance={8}>
          <View style={styles.greetingRow}>
            <View>
              <Text style={[styles.greetingText, { color: colors.text }]}>{t(getGreeting())} 👋</Text>
              <Text style={[styles.greetingDate, { color: colors.textTertiary }]}>
                {new Date().toLocaleDateString(dateLocale(lang), { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
            <MarketStatusIndicator />
          </View>
        </FadeSlideIn>

        {/* Connection Status Banner - Shows during initial connection */}
        {!wsConnected && (
          <View style={styles.connectionBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.connectionText}>{t('Connecting to live markets...')}</Text>
          </View>
        )}

        {/* Enhanced Portfolio Section (hero — leads the page) */}
        <PortfolioSection
          live={isFocused}
          currentPortfolio={currentPortfolio}
          contextCurrentPortfolio={contextCurrentPortfolio}
          userPortfolios={userPortfolios}
          selectedPortfolioId={selectedPortfolioId}
          setSelectedPortfolioId={setSelectedPortfolioId}
          showPortfolioDropdown={showPortfolioDropdown}
          setShowPortfolioDropdown={setShowPortfolioDropdown}
          setShowCreatePortfolioModal={setShowCreatePortfolioModal}
          setEditingPortfolioName={setEditingPortfolioName}
          setShowPortfolioOptionsModal={setShowPortfolioOptionsModal}
          setAddStockModal={setAddStockModal}
          chartData={portfolio.chartData}
          portfolioChartBleedWidth={portfolioChartBleedWidth}
          portfolioTimeRange={portfolioTimeRange}
          setPortfolioTimeRange={setPortfolioTimeRange}
          handleHoldingPress={handleHoldingPress}
        />

        {/* Live Major Indices - Horizontal Scrollable */}
        <MarketOverviewStrip
          live={isFocused}
          majorIndices={majorIndices}
          indicesLoading={indicesLoading}
        />

        {/* Watchlist Section */}
        <WatchlistSection
          live={isFocused}
          watchlistData={watchlistData}
          watchlistDataLoading={watchlistDataLoading}
          watchlistFilter={watchlistFilter}
          setWatchlistFilter={setWatchlistFilter}
          watchlistSort={watchlistSort}
          setWatchlistSort={setWatchlistSort}
          showFilterDropdown={showFilterDropdown}
          setShowFilterDropdown={setShowFilterDropdown}
          showSortDropdown={showSortDropdown}
          setShowSortDropdown={setShowSortDropdown}
          setWatchlistModal={setWatchlistModal}
          handleRemoveFromWatchlist={handleRemoveFromWatchlist}
          trackAction={trackAction}
        />

        {/* Picks Carousel: Stock Picks / Momentum / Growth */}
        <PicksCarousel
          live={isFocused}
          stockPicksData={stockPicksData}
          serverMomentum={serverMomentum}
          serverGrowth={serverGrowth}
          isPremium={isPremium}
          currentTier={currentTier}
          pickCardWidth={pickCardWidth}
          pickCardSnap={pickCardSnap}
        />

        {/* Market Calendar: upcoming earnings / IPOs / dividends */}
        <View style={styles.strategiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Market Calendar')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('View All')}
              onPress={() => router.push('/market-calendar' as any)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>{t('View All')}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strategiesScrollContent}
            snapToInterval={width * 0.78 + 12}
            decelerationRate="fast"
          >
            {([
              {
                key: 'earnings',
                title: t('Upcoming Earnings'),
                sub: t('Next 14 days'),
                icon: 'bar-chart',
                tint: '#FFD60A',
                rows: calendars.earnings.map((r: any) => ({
                  symbol: r.symbol,
                  detail: t('Est. EPS') + ' $' + Number(r.epsEstimated).toFixed(2),
                  date: calDate(r.date),
                  nav: true,
                })),
              },
              {
                key: 'ipos',
                title: t('Upcoming IPOs'),
                sub: t('Next 30 days'),
                icon: 'rocket',
                tint: '#34C759',
                rows: calendars.ipos.map((r: any) => ({
                  symbol: r.symbol,
                  detail: (r.company || '').slice(0, 26),
                  date: calDate(r.date),
                  nav: false,
                })),
              },
              {
                key: 'dividends',
                title: t('Upcoming Dividends'),
                sub: t('Next 14 days'),
                icon: 'cash',
                tint: '#0A84FF',
                rows: calendars.dividends.map((r: any) => ({
                  symbol: r.symbol,
                  detail: '$' + Number(r.dividend).toFixed(2) + ' ' + t('per share'),
                  date: calDate(r.date),
                  nav: true,
                })),
              },
            ] as any[]).map((card, idx) => (
              <FadeSlideIn key={card.key} delay={Math.min(idx, 4) * 60} distance={10}>
                <View
                  style={[
                    styles.calendarCard,
                    {
                      width: width * 0.78,
                      backgroundColor: isDark ? colors.surface : '#FFFFFF',
                      borderColor: isDark ? card.tint + '30' : colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.calendarHeader}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    onPress={() => router.push(`/market-calendar?tab=${card.key}` as any)}
                  >
                    <View style={[styles.calendarIconBubble, { backgroundColor: card.tint + '1C' }]}>
                      <Ionicons name={card.icon} size={17} color={card.tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.calendarTitle, { color: colors.text }]}>{card.title}</Text>
                      <Text style={[styles.calendarSub, { color: colors.textTertiary }]}>{card.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                  {card.rows.length === 0 ? (
                    <Text style={[styles.calendarEmpty, { color: colors.textTertiary }]}>{t('No upcoming events')}</Text>
                  ) : (
                    card.rows.map((row: any, i: number) => (
                      <ScalePress
                        key={row.symbol + i}
                        activeScale={0.97}
                        onPress={() => {
                          if (row.nav) router.push(`/symbol/${row.symbol}` as any);
                        }}
                        style={[
                          styles.calendarRow,
                          i < card.rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? colors.borderLight : '#EEE' },
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.calendarSymbol, { color: colors.text }]}>{row.symbol}</Text>
                          <Text style={[styles.calendarDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                            {row.detail}
                          </Text>
                        </View>
                        <View style={[styles.calendarDateChip, { backgroundColor: card.tint + '16' }]}>
                          <Text style={[styles.calendarDateText, { color: card.tint }]}>{row.date}</Text>
                        </View>
                      </ScalePress>
                    ))
                  )}
                </View>
              </FadeSlideIn>
            ))}
          </ScrollView>
        </View>

        {/* News Section */}
        <View style={styles.newsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Market News')}</Text>
          </View>

          {newsLoading ? (
            <View style={styles.newsLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : news.length > 0 ? (
            <View style={styles.newsContainer}>
              {news.slice(0, 5).map((item, i) => (
                <FadeSlideIn key={i} delay={Math.min(i, 5) * 45} distance={8}>
                <ScalePress
                  style={[styles.newsCard, { backgroundColor: isDark ? colors.card : '#F5F5F7' }]}
                  activeScale={0.97}
                  onPress={async () => {
                    trackAction();
                    await WebBrowser.openBrowserAsync(item.url);
                  }}
                >
                  <View style={styles.newsContent}>
                    <View style={styles.newsHeader}>
                      {item.symbol && (
                        <View style={styles.newsSymbolBadge}>
                          <Text style={styles.newsSymbolText}>{item.symbol}</Text>
                        </View>
                      )}
                      <View style={[styles.newsSourceChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.newsSource, { color: colors.textSecondary }]} numberOfLines={1}>{item.site}</Text>
                      </View>
                      <Text style={[styles.newsTime, { color: colors.textTertiary }]}>{formatNewsDate(item.publishedDate)}</Text>
                    </View>
                    <Text style={[styles.newsTitle, { color: colors.text }]} numberOfLines={3}>{item.title}</Text>
                  </View>
                  {item.image ? (
                    <ExpoImage
                      source={{ uri: item.image }}
                      style={styles.newsThumb}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  )}
                </ScalePress>
                </FadeSlideIn>
              ))}
            </View>
          ) : (
            <View style={styles.newsEmptyContainer}>
              <Text style={styles.newsEmptyText}>{t('No news available')}</Text>
            </View>
          )}
        </View>

        {/* Ad Banner - shown to non-premium users */}
        <InlineAdBanner />

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Add Stock Modal */}
      <Modal
        visible={addStockModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setAddStockModal(false);
          setStockSearchResults([]);
          setShowStockSearchDropdown(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Add Stock')}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>{t('Add to your portfolio')}</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
                onPress={() => {
                setAddStockModal(false);
                setStockSearchResults([]);
                setShowStockSearchDropdown(false);
              }}>
                <Ionicons name="close-circle" size={32} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Stock Symbol')}</Text>
                <View style={[styles.watchlistSearchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="search" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.watchlistSearchInput, { color: colors.text }]}
                    placeholder={t('Search by symbol or company name')}
                    placeholderTextColor={colors.textTertiary}
                    value={newStockSymbol}
                    onChangeText={(text) => {
                      setNewStockSymbol(text);
                      if (text.length === 0) {
                        setShowStockSearchDropdown(false);
                      }
                    }}
                    autoCapitalize="characters"
                    editable={!addingStock}
                  />
                  {newStockSymbol.length > 0 && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t('Clear search')}
                      onPress={() => {
                      setNewStockSymbol('');
                      setShowStockSearchDropdown(false);
                    }}>
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Stock Search Dropdown */}
                {showStockSearchDropdown && stockSearchResults.length > 0 && (
                  <View style={styles.watchlistSearchDropdown}>
                    <ScrollView
                      style={styles.watchlistSearchScrollView}
                      keyboardShouldPersistTaps="handled"
                    >
                      {stockSearchResults.map((result, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.watchlistSearchResultItem}
                          onPress={() => {
                            setNewStockSymbol(result.symbol);
                            setShowStockSearchDropdown(false);
                            setStockSearchResults([]);
                          }}
                        >
                          <View style={styles.watchlistSearchResultLeft}>
                            <Text style={styles.watchlistSearchResultSymbol}>{result.symbol}</Text>
                            <Text style={styles.watchlistSearchResultName} numberOfLines={1}>
                              {result.name}
                            </Text>
                          </View>
                          <View style={styles.watchlistSearchResultRight}>
                            <View style={styles.addBadge}>
                              <Ionicons name="add" size={16} color={colors.primary} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Shares')}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="10"
                    placeholderTextColor="#999"
                    value={newStockShares}
                    onChangeText={setNewStockShares}
                    keyboardType="decimal-pad"
                    editable={!addingStock}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Avg Cost ($)')}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="150.00"
                    placeholderTextColor="#999"
                    value={newStockAvgCost}
                    onChangeText={(text) => {
                      // Typing your own cost basis pauses auto-fill;
                      // clearing the field hands control back to it.
                      addStockCostEditedRef.current = text.trim().length > 0;
                      setNewStockAvgCost(text);
                    }}
                    keyboardType="decimal-pad"
                    editable={!addingStock}
                  />
                </View>
              </View>

              {(addStockPriceLoading || addStockLivePrice != null) && (
                <TouchableOpacity
                  style={styles.livePriceRow}
                  disabled={addStockPriceLoading || addStockLivePrice == null}
                  onPress={() => {
                    if (addStockLivePrice != null) {
                      addStockCostEditedRef.current = false;
                      setNewStockAvgCost(addStockLivePrice.toFixed(2));
                    }
                  }}
                >
                  {addStockPriceLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="flash" size={12} color={colors.primary} />
                      <Text style={[styles.livePriceText, { color: colors.primary }]}>
                        {t('Current Price')}: ${addStockLivePrice!.toFixed(2)}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalButton, addingStock && styles.modalButtonDisabled]}
                onPress={handleAddStock}
                disabled={addingStock}
              >
                {addingStock ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>{t('Add to Portfolio')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Watchlist Modal */}
      <Modal
        visible={watchlistModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setWatchlistModal(false);
          setWatchlistSymbol('');
          setShowWatchlistSearchDropdown(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Add to Watchlist')}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>{t("Track stocks you're interested in")}</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
                onPress={() => {
                setWatchlistModal(false);
                setWatchlistSymbol('');
                setShowWatchlistSearchDropdown(false);
              }}>
                <Ionicons name="close-circle" size={32} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Search Stock')}</Text>
                <View style={[styles.watchlistSearchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="search" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.watchlistSearchInput, { color: colors.text }]}
                    placeholder={t('Search by symbol or company name')}
                    placeholderTextColor={colors.textTertiary}
                    value={watchlistSymbol}
                    onChangeText={(text) => {
                      setWatchlistSymbol(text);
                      if (text.length === 0) {
                        setShowWatchlistSearchDropdown(false);
                      }
                    }}
                    autoCapitalize="characters"
                    editable={!addingToWatchlist}
                  />
                  {watchlistSymbol.length > 0 && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t('Clear search')}
                      onPress={() => {
                      setWatchlistSymbol('');
                      setShowWatchlistSearchDropdown(false);
                    }}>
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Watchlist Search Dropdown */}
                {showWatchlistSearchDropdown && watchlistSearchResults.length > 0 && (
                  <View style={styles.watchlistSearchDropdown}>
                    <ScrollView 
                      style={styles.watchlistSearchScrollView}
                      keyboardShouldPersistTaps="handled"
                    >
                      {watchlistSearchResults.map((result, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.watchlistSearchResultItem}
                          onPress={() => handleAddToWatchlist(result.symbol)}
                        >
                          <View style={styles.watchlistSearchResultLeft}>
                            <Text style={styles.watchlistSearchResultSymbol}>{result.symbol}</Text>
                            <Text style={styles.watchlistSearchResultName} numberOfLines={1}>
                              {result.name}
                            </Text>
                          </View>
                          <View style={styles.watchlistSearchResultRight}>
                            {watchlist.includes(result.symbol) ? (
                              <View style={styles.alreadyAddedBadge}>
                                <Ionicons name="checkmark" size={14} color="#34C759" />
                                <Text style={styles.alreadyAddedText}>{t('Added')}</Text>
                              </View>
                            ) : (
                              <View style={styles.addBadge}>
                                <Ionicons name="add" size={16} color={colors.primary} />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Popular Stocks Quick Add */}
              <View style={styles.quickAddSection}>
                <Text style={[styles.quickAddTitle, { color: colors.textTertiary }]}>{t('Popular Stocks')}</Text>
                <View style={styles.quickAddGrid}>
                  {['AAPL', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META'].map((symbol) => (
                    <TouchableOpacity
                      key={symbol}
                      style={[
                        styles.quickAddChip,
                        watchlist.includes(symbol) && styles.quickAddChipAdded
                      ]}
                      onPress={() => !watchlist.includes(symbol) && handleAddToWatchlist(symbol)}
                      disabled={watchlist.includes(symbol)}
                    >
                      {watchlist.includes(symbol) && (
                        <Ionicons name="checkmark" size={14} color="#34C759" style={{ marginRight: 4 }} />
                      )}
                      <Text style={[
                        styles.quickAddChipText,
                        watchlist.includes(symbol) && styles.quickAddChipTextAdded
                      ]}>
                        {symbol}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, (!watchlistSymbol.trim() || addingToWatchlist) && styles.modalButtonDisabled]}
                onPress={() => handleAddToWatchlist()}
                disabled={!watchlistSymbol.trim() || addingToWatchlist}
              >
                {addingToWatchlist ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="eye" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>{t('Add to Watchlist')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Holding Options Modal */}
      <Modal
        visible={holdingOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setHoldingOptionsModal(false);
          setSelectedHolding(null);
        }}
      >
        <TouchableOpacity
          style={styles.holdingOptionsOverlay}
          activeOpacity={1}
          onPress={() => {
            setHoldingOptionsModal(false);
            setSelectedHolding(null);
          }}
        >
          <View style={[styles.holdingOptionsContent, { backgroundColor: colors.card }]}>
            {selectedHolding && (
              <>
                <View style={styles.holdingOptionsHeader}>
                  <StockLogo 
                    symbol={selectedHolding.symbol} 
                    size={50} 
                    style={{ marginRight: 14 }}
                  />
                  <View>
                    <Text style={[styles.holdingOptionsSymbol, { color: colors.text }]}>{formatSymbolDisplay(selectedHolding.symbol)}</Text>
                    <Text style={[styles.holdingOptionsShares, { color: colors.textTertiary }]}>
                      {selectedHolding.shares} shares • ${(selectedHolding.avgCost || 0).toFixed(2)} avg
                    </Text>
                  </View>
                </View>

                <View style={styles.holdingOptionsStats}>
                  <View style={[styles.holdingOptionsStat, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.holdingOptionsStatLabel, { color: colors.textTertiary }]}>Current Value</Text>
                    <Text style={[styles.holdingOptionsStatValue, { color: colors.text }]}>
                      ${selectedHolding.currentValue?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                  <View style={[styles.holdingOptionsStat, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.holdingOptionsStatLabel, { color: colors.textTertiary }]}>Total Gain/Loss</Text>
                    <Text style={[
                      styles.holdingOptionsStatValue,
                      { color: (selectedHolding.gain || 0) >= 0 ? '#34C759' : '#FF3B30' }
                    ]}>
                      {(selectedHolding.gain || 0) >= 0 ? '+' : ''}${Math.abs(selectedHolding.gain || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.holdingOptionsButtons}>
                  <TouchableOpacity
                    style={[styles.holdingOptionButton, { backgroundColor: colors.surface }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setHoldingOptionsModal(false);
                      router.push(`/symbol/${encodeURIComponent(selectedHolding.symbol)}/chart`);
                    }}
                  >
                    <View style={[styles.holdingOptionIconBubble, { backgroundColor: isDark ? 'rgba(255,214,10,0.16)' : 'rgba(184,134,11,0.12)' }]}>
                      <Ionicons name="stats-chart" size={22} color={colors.primary} />
                    </View>
                    <Text style={[styles.holdingOptionButtonText, { color: colors.text }]}>View Chart</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.holdingOptionButton, { backgroundColor: colors.surface }]}
                    activeOpacity={0.7}
                    onPress={handleOpenEditModal}
                  >
                    <View style={[styles.holdingOptionIconBubble, { backgroundColor: 'rgba(255,149,0,0.16)' }]}>
                      <Ionicons name="create-outline" size={22} color="#FF9500" />
                    </View>
                    <Text style={[styles.holdingOptionButtonText, { color: colors.text }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.holdingOptionButton, { backgroundColor: 'rgba(255,59,48,0.10)' }]}
                    activeOpacity={0.7}
                    onPress={() => handleRemoveStock(selectedHolding.symbol)}
                  >
                    <View style={[styles.holdingOptionIconBubble, { backgroundColor: 'rgba(255,59,48,0.16)' }]}>
                      <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                    </View>
                    <Text style={[styles.holdingOptionButtonText, { color: '#FF3B30' }]}>Remove</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.holdingOptionsCancelButton, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setHoldingOptionsModal(false);
                    setSelectedHolding(null);
                  }}
                >
                  <Text style={[styles.holdingOptionsCancelText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Holding Modal */}
      <Modal
        visible={editHoldingModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Holding</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>
                  {editingHolding ? `Update ${editingHolding.symbol} position` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseEditModal}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Ionicons name="close-circle" size={32} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              {editingHolding && (
                <View style={styles.editHoldingSymbolRow}>
                  <StockLogo 
                    symbol={editingHolding.symbol} 
                    size={50} 
                    style={{ marginRight: 14 }}
                  />
                  <Text style={[styles.editHoldingSymbol, { color: colors.text }]}>{formatSymbolDisplay(editingHolding.symbol)}</Text>
                </View>
              )}

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Shares</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="10"
                    placeholderTextColor="#999"
                    value={editShares}
                    onChangeText={setEditShares}
                    keyboardType="decimal-pad"
                    editable={!savingEdit}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Avg Cost ($)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="150.00"
                    placeholderTextColor="#999"
                    value={editAvgCost}
                    onChangeText={setEditAvgCost}
                    keyboardType="decimal-pad"
                    editable={!savingEdit}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, savingEdit && styles.modalButtonDisabled]}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Portfolio Modal */}
      <Modal
        visible={showCreatePortfolioModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCreatePortfolioModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreatePortfolioModal(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.createPortfolioModalContent, { backgroundColor: colors.card }]}>
                <Text style={[styles.createPortfolioTitle, { color: colors.text }]}>Create New Portfolio</Text>
                <TextInput
                  style={[styles.createPortfolioInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder={t('Portfolio name')}
                  placeholderTextColor={colors.textTertiary}
                  value={newPortfolioName}
                  onChangeText={setNewPortfolioName}
                  autoFocus
                />
                <View style={styles.createPortfolioButtons}>
                  <TouchableOpacity
                    style={styles.createPortfolioCancelBtn}
                    onPress={() => {
                      setNewPortfolioName('');
                      setShowCreatePortfolioModal(false);
                    }}
                  >
                    <Text style={styles.createPortfolioCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createPortfolioCreateBtn, !newPortfolioName.trim() && styles.createPortfolioCreateBtnDisabled]}
                    onPress={createPortfolio}
                    disabled={!newPortfolioName.trim()}
                  >
                    <Text style={styles.createPortfolioCreateText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Portfolio Options Modal */}
      <Modal
        visible={showPortfolioOptionsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPortfolioOptionsModal(false)}
      >
        <View style={styles.portfolioOptionsOverlay}>
          <View style={[styles.portfolioOptionsContent, { backgroundColor: colors.card }]}>
            <View style={styles.portfolioOptionsHeader}>
              <Text style={[styles.portfolioOptionsTitle, { color: colors.text }]}>Portfolio Settings</Text>
              <TouchableOpacity
                onPress={() => setShowPortfolioOptionsModal(false)}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.portfolioOptionsSection}>
              <Text style={[styles.portfolioOptionsLabel, { color: colors.textTertiary }]}>Portfolio Name</Text>
              <TextInput
                style={[styles.portfolioOptionsInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={editingPortfolioName}
                onChangeText={setEditingPortfolioName}
                placeholder={t('Enter name')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <TouchableOpacity
              style={styles.portfolioOptionsSaveBtn}
              onPress={renameCurrentPortfolio}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.portfolioOptionsSaveText}>Save Name</Text>
            </TouchableOpacity>

            <View style={styles.portfolioOptionsDivider} />

            <TouchableOpacity
              style={styles.portfolioOptionsDeleteBtn}
              onPress={deleteCurrentPortfolio}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={styles.portfolioOptionsDeleteText}>Delete Portfolio</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
