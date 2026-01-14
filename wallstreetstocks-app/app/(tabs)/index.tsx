// app/(tabs)/index.tsx - REDESIGNED CLEAN WHITE VERSION WITH WATCHLIST
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart as GiftedLineChart } from 'react-native-gifted-charts';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { useWatchlist } from '@/context/WatchlistContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { useWebSocket } from '@/context/WebSocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchQuotesWithCache } from '@/services/quoteService';
import { priceStore } from '@/stores/priceStore';
import { AnimatedPrice, AnimatedChange, MarketStatusIndicator, LastUpdated, CryptoLiveIndicator, MarketTimeLabel } from '@/components/AnimatedPrice';
import { InlineAdBanner } from '@/components/AdBanner';
import { marketDataService } from '@/services/marketDataService';
import { IndicesSkeletonList, WatchlistSkeletonList, TrendingSkeletonList } from '@/components/SkeletonLoader';

const { width } = Dimensions.get('window');
const chartWidth = 110;
const portfolioChartWidth = width - 80;

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

// Interpolate data to create more points for smoother curves
const interpolateData = (data: { value: number; label: string; dataPointText?: string }[], targetPoints: number = 60): { value: number; label: string; dataPointText?: string }[] => {
  if (data.length <= 2 || data.length >= targetPoints) return data;

  const result: { value: number; label: string; dataPointText?: string }[] = [];
  const step = (data.length - 1) / (targetPoints - 1);

  for (let i = 0; i < targetPoints; i++) {
    const pos = i * step;
    const lower = Math.floor(pos);
    const upper = Math.min(Math.ceil(pos), data.length - 1);
    const fraction = pos - lower;

    const interpolatedValue = data[lower].value + fraction * (data[upper].value - data[lower].value);

    // Only keep labels from original data points at intervals
    const isOriginalPoint = i === 0 || i === targetPoints - 1 || Math.abs(pos - Math.round(pos)) < 0.01;

    result.push({
      value: interpolatedValue,
      label: '',
      dataPointText: isOriginalPoint && data[Math.round(pos)] ? data[Math.round(pos)].dataPointText : ''
    });
  }

  return result;
};

const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Real-time prices handled by WebSocket (pre-market + after-hours included)
// No API polling needed - WebSocket provides instant updates via Twelve Data WebSocket

// Batch quotes helper - uses shared quote service with cache support
// Prices sync with chart data for consistent display across screens
async function fetchBatchQuotes(symbols: string[]): Promise<any[]> {
  return fetchQuotesWithCache(symbols, { timeout: 15000 });
}

// Stock picks preview data
const STOCK_PICKS_PREVIEW = [
  { symbol: 'NVDA', category: 'AI & Tech', reason: 'AI chip leader' },
  { symbol: 'AAPL', category: 'Tech Giant', reason: 'Services growth' },
  { symbol: 'MSFT', category: 'Cloud & AI', reason: 'Azure expansion' },
];

// Market Overview symbols - ONLY 24/7 assets (crypto)
// Crypto trades 24/7 so Apple reviewers will ALWAYS see live price movement
const MARKET_OVERVIEW_SYMBOLS = [
  'BTC/USD',   // Bitcoin
  'ETH/USD',   // Ethereum
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

// Popular stocks to subscribe via WebSocket for real-time prices
// Pro plan has 1000 WS credits - MAXIMIZE usage for instant price updates
// Using ~300 stocks to leave room for watchlist/trending/chart symbols
const POPULAR_STOCKS_WS = [
  // ========== MEGA CAPS (Top 20) ==========
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.A', 'BRK.B',
  'LLY', 'V', 'UNH', 'TSM', 'WMT', 'JPM', 'XOM', 'MA', 'JNJ', 'PG',

  // ========== TECH (50 stocks) ==========
  'AVGO', 'ORCL', 'ADBE', 'CRM', 'AMD', 'CSCO', 'ACN', 'NFLX', 'INTC', 'IBM',
  'QCOM', 'TXN', 'NOW', 'INTU', 'AMAT', 'PANW', 'LRCX', 'ADI', 'MU', 'KLAC',
  'SNPS', 'CDNS', 'MRVL', 'CRWD', 'FTNT', 'WDAY', 'TEAM', 'DDOG', 'ZS', 'NET',
  'SNOW', 'SPLK', 'OKTA', 'MDB', 'HUBS', 'TWLO', 'PLTR', 'U', 'DOCN', 'PATH',
  'SHOP', 'SQ', 'PYPL', 'COIN', 'HOOD', 'AFRM', 'UPST', 'SOFI', 'RBLX', 'ROKU',

  // ========== FINANCE (40 stocks) ==========
  'BAC', 'WFC', 'GS', 'MS', 'C', 'SCHW', 'BLK', 'AXP', 'SPGI', 'CME',
  'ICE', 'MCO', 'CB', 'PGR', 'MMC', 'AON', 'MET', 'AIG', 'TRV', 'ALL',
  'AFL', 'PRU', 'HIG', 'TROW', 'BK', 'STT', 'NTRS', 'FRC', 'USB', 'PNC',
  'TFC', 'COF', 'DFS', 'SYF', 'AMP', 'RJF', 'ALLY', 'FITB', 'CFG', 'KEY',

  // ========== HEALTHCARE (40 stocks) ==========
  'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN', 'GILD', 'VRTX',
  'REGN', 'ISRG', 'SYK', 'BSX', 'MDT', 'ZTS', 'ELV', 'CI', 'HUM', 'CVS',
  'MCK', 'CAH', 'ABC', 'MRNA', 'BIIB', 'ILMN', 'DXCM', 'IDXX', 'IQV', 'A',
  'ALGN', 'HOLX', 'MTD', 'WAT', 'BIO', 'TECH', 'CRL', 'PKI', 'DGX', 'LH',

  // ========== CONSUMER (40 stocks) ==========
  'COST', 'HD', 'MCD', 'NKE', 'SBUX', 'DIS', 'LOW', 'TJX', 'TGT', 'BKNG',
  'MAR', 'HLT', 'ABNB', 'CMG', 'YUM', 'DPZ', 'DARDEN', 'QSR', 'WEN', 'JACK',
  'LULU', 'ULTA', 'ETSY', 'EBAY', 'W', 'CHWY', 'RVLV', 'GPS', 'ANF', 'AEO',
  'KMX', 'AAP', 'ORLY', 'AZO', 'BBY', 'DG', 'DLTR', 'FIVE', 'OLLI', 'ROSS',

  // ========== INDUSTRIALS (30 stocks) ==========
  'CAT', 'DE', 'UNP', 'UPS', 'HON', 'RTX', 'LMT', 'BA', 'GE', 'MMM',
  'EMR', 'ETN', 'ITW', 'PH', 'ROK', 'CMI', 'PCAR', 'FAST', 'GWW', 'IR',
  'FTV', 'DOV', 'AME', 'SWK', 'XYL', 'IEX', 'GGG', 'NDSN', 'ROP', 'IDEX',

  // ========== ENERGY (20 stocks) ==========
  'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'PSX', 'VLO', 'OXY', 'HES',
  'DVN', 'FANG', 'HAL', 'BKR', 'OKE', 'WMB', 'KMI', 'ET', 'MPLX', 'EPD',

  // ========== MATERIALS (15 stocks) ==========
  'LIN', 'APD', 'SHW', 'ECL', 'DD', 'NEM', 'FCX', 'NUE', 'VMC', 'MLM',
  'PPG', 'ALB', 'IFF', 'FMC', 'CE',

  // ========== REAL ESTATE (15 stocks) ==========
  'AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'O', 'SPG', 'WELL', 'DLR', 'AVB',
  'EQR', 'VTR', 'ARE', 'UDR', 'PEAK',

  // ========== COMMUNICATION (15 stocks) ==========
  'GOOG', 'T', 'VZ', 'TMUS', 'CMCSA', 'CHTR', 'NFLX', 'DIS', 'WBD', 'PARA',
  'FOX', 'FOXA', 'NWSA', 'OMC', 'IPG',

  // ========== UTILITIES (10 stocks) ==========
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'PEG', 'ED',

  // ========== POPULAR ETFs (30) ==========
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO', 'EEM', 'EFA',
  'ARKK', 'ARKG', 'ARKW', 'ARKF', 'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLY',
  'XLP', 'XLU', 'XLB', 'XLRE', 'GLD', 'SLV', 'USO', 'TLT', 'HYG', 'LQD',

  // ========== MEME/POPULAR (20) ==========
  'GME', 'AMC', 'BB', 'BBBY', 'WISH', 'CLOV', 'SPCE', 'LCID', 'RIVN', 'NIO',
  'XPEV', 'LI', 'FSR', 'NKLA', 'WKHS', 'GOEV', 'RIDE', 'MULN', 'FFIE', 'HYLN',

  // ========== CRYPTO-RELATED (10) ==========
  'MSTR', 'MARA', 'RIOT', 'CLSK', 'HUT', 'BITF', 'COIN', 'SI', 'GBTC', 'ETHE',
];

export default function Dashboard() {
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
  const [refreshing, setRefreshing] = useState(false);
  const [stockPicksData, setStockPicksData] = useState<any[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Add Stock Modal
  const [addStockModal, setAddStockModal] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockShares, setNewStockShares] = useState('');
  const [newStockAvgCost, setNewStockAvgCost] = useState('');
  const [addingStock, setAddingStock] = useState(false);
  const [stockSearchResults, setStockSearchResults] = useState<any[]>([]);
  const [showStockSearchDropdown, setShowStockSearchDropdown] = useState(false);

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
    { symbol: 'ETH/USD', name: 'Ethereum', price: 0, change: 0, changePercent: 0, color: '#34C759' },
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

  // Live Trending
  const TRENDING_CACHE_KEY = 'cached_trending_stocks';
  const [trending, setTrending] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingCacheLoaded, setTrendingCacheLoaded] = useState(false);

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
    }, [])
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
      Alert.alert('Cannot Delete', 'You must have at least one portfolio.');
      return;
    }
    Alert.alert(
      'Delete Portfolio',
      `Are you sure you want to delete "${currentPortfolio?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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

  // Reload watchlist when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshWatchlist();
    }, [refreshWatchlist])
  );

  // Fetch unread messages count
  const fetchUnreadMessagesCount = useCallback(async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) return;

      const response = await fetch('https://www.wallstreetstocks.ai/api/messages', {
        headers: { 'x-user-id': storedUserId },
      });

      if (!response.ok) return;

      const data = await response.json();
      const conversations = data.conversations || [];
      const totalUnread = conversations.reduce((sum: number, conv: any) => sum + (conv.unreadCount || 0), 0);
      setUnreadMessagesCount(totalUnread);
    } catch {
    }
  }, []);

  // Refresh unread messages count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUnreadMessagesCount();
    }, [fetchUnreadMessagesCount])
  );

  // Refresh market data when screen is focused (picks up prices from memory cache)
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure memory cache is populated from chart page
      setTimeout(() => {
        fetchMarketChips();
        fetchTrending();
      }, 100);
    }, [])
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
            setMajorIndices(parsedCache);
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

  // Load cached trending stocks on mount
  useEffect(() => {
    const loadCachedTrending = async () => {
      try {
        const cached = await AsyncStorage.getItem(TRENDING_CACHE_KEY);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (parsedCache && Array.isArray(parsedCache) && parsedCache.length > 0) {
            setTrending(parsedCache);
            setTrendingLoading(false);
          }
        }
      } catch {
        // Ignore cache errors
      } finally {
        setTrendingCacheLoaded(true);
      }
    };
    loadCachedTrending();
  }, []);

  // Save trending stocks to cache when they update
  useEffect(() => {
    if (trendingCacheLoaded && trending.length > 0 && trending.some(t => t.price > 0)) {
      AsyncStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify(trending)).catch(() => {});
    }
  }, [trending, trendingCacheLoaded]);

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

  // Subscribe trending stocks to WebSocket
  useEffect(() => {
    if (wsConnected && trending.length > 0) {
      const trendingSymbols = trending.map(s => s.symbol);
      wsSubscribe(trendingSymbols);
    }
  }, [wsConnected, trending.length, wsSubscribe]);

  // Subscribe stock picks to WebSocket
  useEffect(() => {
    if (wsConnected) {
      const stockPicksSymbols = STOCK_PICKS_PREVIEW.map(p => p.symbol);
      wsSubscribe(stockPicksSymbols);
    }
  }, [wsConnected, wsSubscribe]);

  // Subscribe popular stocks to WebSocket for instant real-time prices
  // Pro plan: 1000 WS credits - maximize usage for best UX
  useEffect(() => {
    if (wsConnected) {
      // Subscribe to 50 popular stocks via WebSocket
      wsSubscribe(POPULAR_STOCKS_WS);
    }
  }, [wsConnected, wsSubscribe]);

  // ============= REAL-TIME PRICE REFRESH =============
  // Interval triggers re-render to show WebSocket price updates
  // Runs CONTINUOUSLY even when scrolled away - prices always update
  const [priceUpdateTrigger, setPriceUpdateTrigger] = useState(0);
  const priceRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Price update interval - runs continuously regardless of focus or scroll position
  useEffect(() => {
    // Start instant price updates - MAXIMUM SPEED
    priceRefreshIntervalRef.current = setInterval(() => {
      setPriceUpdateTrigger(prev => prev + 1);
    }, 100); // 100ms = 10 updates/sec for ultra-fast WebSocket prices

    return () => {
      if (priceRefreshIntervalRef.current) {
        clearInterval(priceRefreshIntervalRef.current);
        priceRefreshIntervalRef.current = null;
      }
    };
  }, []);

  // Re-subscribe to WebSocket when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (wsConnected) {
        wsSubscribe(MARKET_OVERVIEW_SYMBOLS);
        wsSubscribe(POPULAR_STOCKS_WS);
      }
    }, [wsConnected, wsSubscribe])
  );

  // Extended hours price updates - WEBSOCKET ONLY
  // WebSocket handles ALL real-time prices including pre-market and after-hours
  // NO API POLLING - saves 700+ API credits/minute

  // Live market overview - updates every 2s from price store for real-time display
  // Includes both indices and crypto for 24/7 live updates
  // Uses same model as explore page - tries both symbol formats and picks most recent
  const liveMarketIndices = useMemo(() => {
    const nameMap: { [key: string]: string } = {
      'BTC/USD': 'Bitcoin', 'ETH/USD': 'Ethereum', 'SOL/USD': 'Solana',
      'BNB/USD': 'Binance Coin', 'XRP/USD': 'Ripple', 'ADA/USD': 'Cardano',
      'DOGE/USD': 'Dogecoin', 'AVAX/USD': 'Avalanche', 'DOT/USD': 'Polkadot',
      'MATIC/USD': 'Polygon', 'LINK/USD': 'Chainlink', 'LTC/USD': 'Litecoin',
    };

    return majorIndices.map(index => {
      let quote = priceStore.getQuote(index.symbol);

      // For crypto, try both formats and use the most recent one
      // WebSocket may store as "BTC/USD" or "BTCUSD"
      if (index.symbol?.includes('/')) {
        // Symbol has slash (BTC/USD) - also try without slash (BTCUSD)
        const noSlashSymbol = index.symbol.replace('/', '');
        const noSlashQuote = priceStore.getQuote(noSlashSymbol);
        if (noSlashQuote && noSlashQuote.price > 0) {
          if (!quote || (noSlashQuote.updatedAt > (quote.updatedAt || 0))) {
            quote = noSlashQuote;
          }
        }
      } else if (index.symbol?.endsWith('USD') && index.symbol.length <= 10) {
        // Symbol has no slash (BTCUSD) - also try with slash (BTC/USD)
        const slashSymbol = index.symbol.slice(0, -3) + '/USD';
        const slashQuote = priceStore.getQuote(slashSymbol);
        if (slashQuote && slashQuote.price > 0) {
          if (!quote || (slashQuote.updatedAt > (quote.updatedAt || 0))) {
            quote = slashQuote;
          }
        }
      }

      if (quote && quote.price > 0) {
        return {
          ...index,
          name: nameMap[index.symbol] || index.symbol,
          price: quote.price,
          change: quote.change || 0,
          changePercent: quote.changePercent || 0,
          color: (quote.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30',
        };
      }
      return index;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [majorIndices, priceUpdateTrigger]);

  // Live watchlist - updates from price store with WebSocket real-time prices
  // Uses same model as explore page - tries both symbol formats and picks most recent
  const liveWatchlistData = useMemo(() => {
    return watchlistData.map(stock => {
      // For crypto, try both formats and use the most recent one
      // WebSocket stores as "BTC/USD", local data stores as "BTCUSD"
      let quote = priceStore.getQuote(stock.symbol);

      if (stock.symbol?.endsWith('USD') && !stock.symbol.includes('/') && stock.symbol.length <= 10) {
        // Try slash format for crypto: BTCUSD -> BTC/USD
        const slashSymbol = stock.symbol.slice(0, -3) + '/USD';
        const slashQuote = priceStore.getQuote(slashSymbol);

        // Use the more recent quote (WebSocket updates have later timestamps)
        if (slashQuote && slashQuote.price > 0) {
          if (!quote || (slashQuote.updatedAt > (quote.updatedAt || 0))) {
            quote = slashQuote;
          }
        }
      }

      if (quote && quote.price > 0) {
        const newChangePercent = quote.changePercent ?? stock.changePercent;
        return {
          ...stock,
          price: quote.price,
          change: quote.change ?? stock.change,
          changePercent: newChangePercent,
          color: newChangePercent >= 0 ? '#34C759' : '#FF3B30',
        };
      }
      return stock;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistData, priceUpdateTrigger]);

  // Live trending stocks - updates every 3 seconds from price store
  const liveTrending = useMemo(() => {
    return trending.map(stock => {
      const quote = priceStore.getQuote(stock.symbol);
      if (quote && quote.price > 0) {
        return {
          ...stock,
          price: quote.price,
          change: quote.change ?? stock.change,
          changesPercentage: quote.changePercent ?? stock.changesPercentage,
        };
      }
      return stock;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trending, priceUpdateTrigger]);

  // Live portfolio data - updates from price store with WebSocket real-time prices
  // Uses same model as explore page - tries both symbol formats and picks most recent
  const livePortfolioData = useMemo(() => {
    if (!contextCurrentPortfolio?.holdings?.length) return null;

    let totalValue = 0;
    let totalCost = 0;

    const holdings = contextCurrentPortfolio.holdings.map((holding: any) => {
      // For crypto, try both formats and use the most recent one (explore page model)
      let quote = priceStore.getQuote(holding.symbol);

      if (holding.symbol?.includes('/')) {
        // Symbol has slash (BTC/USD) - also try without slash (BTCUSD)
        const noSlashSymbol = holding.symbol.replace('/', '');
        const noSlashQuote = priceStore.getQuote(noSlashSymbol);
        if (noSlashQuote && noSlashQuote.price > 0) {
          if (!quote || (noSlashQuote.updatedAt > (quote.updatedAt || 0))) {
            quote = noSlashQuote;
          }
        }
      } else if (holding.symbol?.endsWith('USD') && holding.symbol.length <= 10) {
        // Symbol has no slash (BTCUSD) - also try with slash (BTC/USD)
        const slashSymbol = holding.symbol.slice(0, -3) + '/USD';
        const slashQuote = priceStore.getQuote(slashSymbol);
        if (slashQuote && slashQuote.price > 0) {
          if (!quote || (slashQuote.updatedAt > (quote.updatedAt || 0))) {
            quote = slashQuote;
          }
        }
      }

      const currentPrice = (quote && quote.price > 0) ? quote.price : holding.currentPrice || holding.avgCost;
      const currentValue = currentPrice * holding.shares;
      const costBasis = holding.avgCost * holding.shares;
      const gain = currentValue - costBasis;
      const gainPercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
      const color = gainPercent >= 0 ? '#34C759' : '#FF3B30';

      totalValue += currentValue;
      totalCost += costBasis;

      return { ...holding, currentPrice, currentValue, gain, gainPercent, color };
    });

    const totalGainPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return {
      holdings,
      totalValue,
      totalGain: totalValue - totalCost,
      totalGainPercent,
      totalColor: totalGainPercent >= 0 ? '#34C759' : '#FF3B30',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextCurrentPortfolio?.holdings, priceUpdateTrigger]);

  // Live stock picks - updates every 3 seconds from price store
  const liveStockPicks = useMemo(() => {
    return stockPicksData.map(pick => {
      const quote = priceStore.getQuote(pick.symbol);
      if (quote && quote.price > 0) {
        return {
          ...pick,
          price: quote.price,
          change: quote.change ?? pick.change,
          changePercent: quote.changePercent ?? pick.changePercent,
        };
      }
      return pick;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockPicksData, priceUpdateTrigger]);

  // Fetch live market overview data - INSTANT from pre-loaded crypto data
  // Crypto only - trades 24/7 for Apple review
  const fetchMarketChips = async () => {
    const symbols = MARKET_OVERVIEW_SYMBOLS;
    const nameMap: { [key: string]: string } = {
      'BTC/USD': 'Bitcoin',
      'ETH/USD': 'Ethereum',
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

    // INSTANT: Try to use pre-loaded crypto data from marketDataService
    const localCrypto = marketDataService.getLiveData('crypto');
    const allLocalData = [...localCrypto];
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
        return {
          symbol,
          name: nameMap[symbol] || symbol,
          price: 0,
          change: 0,
          changePercent: 0,
          color: '#34C759',
        };
      }).filter(item => item.price > 0);

      if (results.length > 0) {
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
    }).filter(item => item.price > 0);

    if (storeResults.length > 0) {
      setMajorIndices(storeResults);
    }
    setIndicesLoading(false);
  };

  // Fetch trending stocks with live data - INSTANT from pre-loaded stock data
  const fetchTrending = async () => {
    // INSTANT: Try to use pre-loaded stock data from marketDataService
    const localStocks = marketDataService.getLiveData('stock');

    if (localStocks.length > 0) {
      // Sort by absolute change percent to get most active/trending
      const sortedStocks = [...localStocks]
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 6);

      const trendingData = sortedStocks.map((stock, idx) => ({
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        price: stock.price,
        change: stock.change,
        changePercent: stock.changePercent,
        color: stock.changePercent >= 0 ? '#34C759' : '#FF3B30',
        data: generatePlaceholderChart(stock.price, stock.changePercent, stock.symbol), // Instant placeholder
        rank: idx + 1
      }));

      setTrending(trendingData);
      setTrendingLoading(false);

      // Fetch real chart data in background (don't await)
      fetchTrendingCharts(sortedStocks.map(s => s.symbol));
      return;
    }

    // Fallback: fetch from API if local data not ready
    setTrendingLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/stock_market/actives?limit=6&apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

      if (data && Array.isArray(data)) {
        // Update global price store with trending data
        priceStore.setQuotes(data.slice(0, 6).map((stock: any) => ({
          symbol: stock.symbol,
          price: stock.price || 0,
          change: stock.change || 0,
          changePercent: stock.changesPercentage || 0,
          name: stock.name,
        })));

        const trendingData = await Promise.all(
          data.slice(0, 6).map(async (stock: any, idx: number) => {
            // Check global price store for chart-synced price
            const storeQuote = priceStore.getQuote(stock.symbol);
            const price = storeQuote?.price || stock.price || 0;

            try {
              // Use 1-minute intervals for more real-time data
              const chartRes = await fetch(
                `${BASE_URL}/historical-chart/1min/${stock.symbol}?apikey=${FMP_API_KEY}`
              );
              const chartData = await chartRes.json();

              // Get the most recent 40 data points for a smoother chart
              const chartValues = chartData && Array.isArray(chartData) && chartData.length > 0
                ? cleanChartData(chartData.slice(0, 40).reverse().map((d: any) => d.close))
                : [price, price * 0.995, price * 1.005, price];

              return {
                symbol: stock.symbol,
                name: stock.name || stock.symbol,
                price: price,
                change: stock.change || 0,
                changePercent: stock.changesPercentage || 0,
                color: (stock.changesPercentage || 0) >= 0 ? '#34C759' : '#FF3B30',
                data: chartValues,
                rank: idx + 1
              };
            } catch {
              return {
                symbol: stock.symbol,
                name: stock.name || stock.symbol,
                price: price,
                change: stock.change || 0,
                changePercent: stock.changesPercentage || 0,
                color: (stock.changesPercentage || 0) >= 0 ? '#34C759' : '#FF3B30',
                data: cleanChartData([price || 1, price || 1, price || 1, price || 1]),
                rank: idx + 1
              };
            }
          })
        );

        setTrending(trendingData);
      }
    } catch {
    } finally {
      setTrendingLoading(false);
    }
  };

  // Fetch real chart data for trending (runs in background)
  const fetchTrendingCharts = async (symbols: string[]) => {
    try {
      const chartsData = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const chartRes = await fetch(
              `${BASE_URL}/historical-chart/1min/${symbol}?apikey=${FMP_API_KEY}`
            );
            const chartData = await chartRes.json();

            if (chartData && Array.isArray(chartData) && chartData.length > 0) {
              return {
                symbol,
                data: cleanChartData(chartData.slice(0, 40).reverse().map((d: any) => d.close)),
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      // Update trending with real chart data
      setTrending(prev => prev.map(item => {
        const chartInfo = chartsData.find(c => c?.symbol === item.symbol);
        if (chartInfo) {
          return { ...item, data: chartInfo.data };
        }
        return item;
      }));
    } catch {
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
          return {
            symbol: localItem.symbol,
            name: localItem.name || localItem.symbol,
            price: localItem.price,
            change: localItem.change,
            changePercent: localItem.changePercent,
            color: localItem.changePercent >= 0 ? '#34C759' : '#FF3B30',
            data: generatePlaceholderChart(localItem.price, localItem.changePercent, localItem.symbol),
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

  // Fetch real chart data for watchlist in background
  const fetchWatchlistCharts = async () => {
    try {
      const chartsData = await Promise.all(
        watchlist.map(async (symbol) => {
          try {
            const chartRes = await fetchWithTimeout(
              `${BASE_URL}/historical-chart/1min/${symbol}?apikey=${FMP_API_KEY}`,
              5000 // 5 second timeout
            );
            const chartData = await chartRes.json();

            if (chartData && Array.isArray(chartData) && chartData.length > 0) {
              return {
                symbol,
                data: cleanChartData(chartData.slice(0, 40).reverse().map((d: any) => d.close)),
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      // Update watchlist with real chart data
      setWatchlistData(prev => prev.map(item => {
        const chartInfo = chartsData.find(c => c?.symbol === item.symbol);
        if (chartInfo) {
          return { ...item, data: chartInfo.data };
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
        const watchlistWithPlaceholders = data.map((stock: any) => ({
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          price: stock.price || 0,
          change: stock.change || 0,
          changePercent: stock.changesPercentage || 0,
          color: (stock.changesPercentage || 0) >= 0 ? '#34C759' : '#FF3B30',
          data: generatePlaceholderChart(stock.price || 100, stock.changesPercentage || 0, stock.symbol),
        }));

        setWatchlistData(watchlistWithPlaceholders);
        setWatchlistDataLoading(false);

        // Fetch real charts in background
        fetchWatchlistCharts();
      }
    } catch {
      setWatchlistDataLoading(false);
    }
  };

  // Fetch stock picks preview data
  const fetchStockPicks = async () => {
    try {
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

  // Fetch portfolio historical chart data
  const fetchPortfolioChart = async (currentValue: number, holdings: any[]) => {
    try {
      let historicalData: any[] = [];
      let labels: string[] = [];

      const today = new Date();
      let daysBack = 365;
      
      switch (portfolioTimeRange) {
        case '1D': daysBack = 1; break;
        case '5D': daysBack = 5; break;
        case '1M': daysBack = 30; break;
        case '6M': daysBack = 180; break;
        case 'YTD': 
          const yearStart = new Date(today.getFullYear(), 0, 1);
          daysBack = Math.floor((today.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
          break;
        case '1Y': daysBack = 365; break;
        case '5Y': daysBack = 1825; break;
        case 'ALL': daysBack = 3650; break;
      }

      const primarySymbol = holdings[0]?.symbol;
      if (!primarySymbol) return;

      const fromDate = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const histRes = await fetch(
        `${BASE_URL}/historical-price-full/${primarySymbol}?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`
      );
      const histData = await histRes.json();

      if (histData?.historical && Array.isArray(histData.historical)) {
        const dataPoints = histData.historical.reverse();
        
        const portfolioValues = dataPoints.map((point: any) => {
          const dayValue = point.close;
          const baseValue = dataPoints[0].close;
          const percentChange = (dayValue - baseValue) / baseValue;
          const costBasis = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
          return costBasis * (1 + percentChange);
        });

        const step = Math.max(1, Math.floor(portfolioValues.length / 100));
        const sampledValues = portfolioValues.filter((_: number, i: number) => i % step === 0);
        const sampledDates = dataPoints.filter((_: any, i: number) => i % step === 0);
        
        // Create data array with labels for each point
        historicalData = sampledValues.map((value: number, idx: number) => {
          const date = new Date(sampledDates[idx].date);

          // Full label for tooltip
          let fullLabel = '';
          if (portfolioTimeRange === '1D') {
            fullLabel = date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            });
          } else {
            fullLabel = date.toLocaleDateString('en-US', { 
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
          }
          
          return {
            value: value,
            label: '',
            dataPointText: fullLabel
          };
        });

        // Generate visible labels (fewer for x-axis)
        const labelStep = Math.ceil(historicalData.length / 6);
        labels = historicalData.map((d: any, i: number) => 
          i % labelStep === 0 ? d.label : ''
        );

        const startValue = sampledValues[0] || currentValue;
        const endValue = sampledValues[sampledValues.length - 1] || currentValue;
        const yearChange = endValue - startValue;
        const yearChangePercent = startValue > 0 ? (yearChange / startValue) * 100 : 0;

        setPortfolio(prev => ({
          ...prev,
          chartData: historicalData,
          chartLabels: labels,
          yearChange,
          yearChangePercent
        }));
      }
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
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setAddingStock(true);

    try {
      const symbol = newStockSymbol.toUpperCase().trim();

      // Use batch quotes endpoint with KV caching
      const quoteData = await fetchBatchQuotes([symbol]);

      if (!quoteData || !Array.isArray(quoteData) || quoteData.length === 0) {
        Alert.alert('Error', `Stock ${symbol} not found`);
        setAddingStock(false);
        return;
      }

      const shares = parseFloat(newStockShares);
      const avgCost = parseFloat(newStockAvgCost);

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

      Alert.alert('Success', `${symbol} added to your portfolio!`);
    } catch {
      Alert.alert('Error', 'Failed to add stock. Please try again.');
    } finally {
      setAddingStock(false);
    }
  };

  // Remove stock from portfolio using context
  const handleRemoveStock = (symbol: string) => {
    Alert.alert(
      'Remove Stock',
      `Are you sure you want to remove ${symbol} from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
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
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newShares = parseFloat(editShares);
    const newAvgCost = parseFloat(editAvgCost);

    if (isNaN(newShares) || newShares <= 0) {
      Alert.alert('Error', 'Please enter a valid number of shares');
      return;
    }

    if (isNaN(newAvgCost) || newAvgCost <= 0) {
      Alert.alert('Error', 'Please enter a valid average cost');
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

      Alert.alert('Success', `${editingHolding.symbol} updated successfully!`);
    } catch {
      Alert.alert('Error', 'Failed to update holding. Please try again.');
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
      Alert.alert('Error', 'Please enter a stock symbol');
      return;
    }

    setAddingToWatchlist(true);
    setWatchlistSymbol('');
    setShowWatchlistSearchDropdown(false);
    setWatchlistModal(false);

    // Use context's addToWatchlist (handles validation, storage, and alerts)
    await addToWatchlist(symbolToAdd);

    setAddingToWatchlist(false);
  };

  // Remove from watchlist (uses context)
  const handleRemoveFromWatchlist = (symbol: string) => {
    Alert.alert(
      'Remove from Watchlist',
      `Remove ${symbol} from your watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
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

    try {
      const res = await fetch(
        `${BASE_URL}/search?query=${query}&limit=10&apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

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

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchMarketChips(),
      fetchTrending(),
      fetchPortfolio(),
      fetchWatchlist(),
      fetchStockPicks()
    ]);
    setRefreshing(false);
  };

  // App state tracking for refreshing data when app comes to foreground
  const appState = useRef(AppState.currentState);

  // Handle app state changes - refresh data when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasActive = appState.current === 'active';
      const isActive = nextAppState === 'active';
      appState.current = nextAppState;

      // Refresh data immediately when app comes back to foreground
      if (!wasActive && isActive && holdingsInitialized && !contextWatchlistLoading) {
        // WebSocket handles real-time updates, no additional refresh needed
      }
    });

    return () => subscription.remove();
  }, [holdingsInitialized, contextWatchlistLoading]);

  // Initial fetch - staggered loading for better responsiveness
  // Load visible content first, then secondary content
  useEffect(() => {
    if (!holdingsInitialized || contextWatchlistLoading) return;

    // PHASE 1: Load most visible content IMMEDIATELY (no InteractionManager delay)
    // These use cached data so they're instant

    // PHASE 2: Load secondary content after a brief delay (50ms)
    // This prevents UI from freezing by spreading out the work
    const secondaryTimer = setTimeout(() => {
    }, 50);

    // PHASE 3: Load tertiary content last (100ms delay)
    const tertiaryTimer = setTimeout(() => {
    }, 100);

    return () => {
      clearTimeout(secondaryTimer);
      clearTimeout(tertiaryTimer);
    };
  }, [holdingsInitialized, contextWatchlistLoading]);

  // Refetch portfolio chart when time range changes
  useEffect(() => {
    if (contextCurrentPortfolio && contextCurrentPortfolio.holdings.length > 0) {
      fetchPortfolio();
    }
  }, [portfolioTimeRange]);

  // Refetch portfolio when selected portfolio changes
  useEffect(() => {
    if (holdingsInitialized && selectedPortfolioId) {
      fetchPortfolio();
    }
  }, [selectedPortfolioId]);

  // Track if initial watchlist data was loaded to prevent duplicate fetches
  const watchlistInitialLoadDone = React.useRef(false);

  // Refetch watchlist data when watchlist array changes (but not on initial load)
  useEffect(() => {
    if (!contextWatchlistLoading && watchlist.length > 0) {
      // Skip if this is the initial load (initial useEffect handles it)
      if (!watchlistInitialLoadDone.current) {
        watchlistInitialLoadDone.current = true;
        return;
      }
      fetchWatchlist();
    } else if (!contextWatchlistLoading && watchlist.length === 0) {
      setWatchlistData([]);
      setWatchlistDataLoading(false);
    }
  }, [watchlist, contextWatchlistLoading]);

  // Memoized filtered and sorted watchlist - uses live prices from WebSocket
  const filteredWatchlist = useMemo(() => {
    let filtered = [...liveWatchlistData];

    // Apply filter
    if (watchlistFilter === 'Gainers') {
      filtered = filtered.filter(stock => stock.changePercent >= 0);
    } else if (watchlistFilter === 'Losers') {
      filtered = filtered.filter(stock => stock.changePercent < 0);
    }

    // Apply sort
    switch (watchlistSort) {
      case 'Name':
        filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
      case 'Price':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'Change %':
        filtered.sort((a, b) => b.changePercent - a.changePercent);
        break;
      case 'Change $':
        filtered.sort((a, b) => b.change - a.change);
        break;
      case 'My Sort':
      default:
        // Keep original order (order added)
        break;
    }

    return filtered;
  }, [liveWatchlistData, watchlistFilter, watchlistSort]);

  // Format crypto symbols with slash for display (BTCUSD -> BTC/USD)
  const formatSymbolDisplay = (symbol: string): string => {
    if (symbol.endsWith('USD') && !symbol.includes('/') && symbol.length >= 6 && symbol.length <= 10) {
      return symbol.slice(0, -3) + '/USD';
    }
    return symbol;
  };

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
    <View style={styles.container}>
      {/* Floating + Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setAddStockModal(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#007AFF" />
        }
        onScrollBeginDrag={() => {
          setShowFilterDropdown(false);
          setShowSortDropdown(false);
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => router.push('/menu')}
          >
            <Text style={styles.menu}>Menu</Text>
          </TouchableOpacity>

          <View style={styles.searchWrapper}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIconHeader} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search stocks, ETFs, bonds..."
                placeholderTextColor="#8E8E93"
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
                >
                  <Ionicons name="close-circle" size={20} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <View style={styles.searchDropdown}>
                <ScrollView 
                  style={styles.searchScrollView}
                  keyboardShouldPersistTaps="handled"
                >
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setSearchQuery('');
                        setShowSearchDropdown(false);
                        router.push(`/symbol/${encodeURIComponent(result.symbol)}/chart`);
                      }}
                    >
                      <View style={styles.searchResultLeft}>
                        <Text style={styles.searchResultSymbol}>{result.symbol}</Text>
                        <Text style={styles.searchResultName} numberOfLines={1}>
                          {result.name}
                        </Text>
                      </View>
                      <View style={styles.searchResultRight}>
                        <Text style={styles.searchResultExchange}>{result.exchangeShortName}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={() => router.push('/messages')} style={styles.messagesIconContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={26} color="#007AFF" />
            {unreadMessagesCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Connection Status Banner - Shows during initial connection */}
        {!wsConnected && (
          <View style={styles.connectionBanner}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.connectionText}>Connecting to live markets...</Text>
          </View>
        )}

        {/* Live Major Indices - Horizontal Scrollable */}
        <View style={styles.indicesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Market Overview</Text>
              <CryptoLiveIndicator />
            </View>
            <LastUpdated timestamp={Date.now() - (priceUpdateTrigger % 10) * 100} prefix="" style={{ marginTop: 4 }} />
          </View>
          
          {indicesLoading ? (
            <IndicesSkeletonList count={5} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.indicesScrollContent}
            >
              {liveMarketIndices.map((index) => (
                <TouchableOpacity
                  key={index.symbol}
                  style={styles.indexCard}
                  onPress={() => router.push(`/symbol/${encodeURIComponent(index.symbol)}/chart`)}
                >
                  <View style={styles.indexCardHeader}>
                    <View style={[styles.indexIconContainer, { backgroundColor: index.color + '15' }]}>
                      <Ionicons
                        name={getIndexIcon(index.symbol) as any}
                        size={16}
                        color={index.color}
                      />
                    </View>
                    <Text style={styles.indexSymbol}>{index.symbol}</Text>
                  </View>
                  <MarketTimeLabel isCrypto={index.symbol.includes('/') || index.symbol.includes('USD')} />
                  <Text style={styles.indexName} numberOfLines={1}>{index.name}</Text>
                  <AnimatedPrice
                    value={index.price}
                    prefix="$"
                    decimals={index.price >= 1000 ? 0 : index.price >= 100 ? 1 : 2}
                    style={styles.indexPrice}
                    flashOnChange={true}
                  />
                  <View style={[styles.indexChangePill, { backgroundColor: index.color + '15' }]}>
                    <Ionicons
                      name={index.changePercent >= 0 ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={index.color}
                    />
                    <AnimatedChange
                      value={index.changePercent}
                      style={{ ...styles.indexChange, color: index.color }}
                      showArrow={false}
                      flashOnChange={true}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Enhanced Portfolio Section */}
        <View style={styles.portfolioSection}>
          <View style={styles.portfolioTopRow}>
            <View style={styles.portfolioSelectorContainer}>
              <TouchableOpacity
                style={styles.portfolioDropdown}
                onPress={() => setShowPortfolioDropdown(!showPortfolioDropdown)}
              >
                <Text style={styles.portfolioDropdownText} numberOfLines={1}>
                  {currentPortfolio?.name || 'Select Portfolio'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#007AFF" />
              </TouchableOpacity>
              <LastUpdated timestamp={Date.now() - (priceUpdateTrigger % 10) * 100} prefix="" style={{ marginTop: 4 }} />

              {/* Portfolio Dropdown Menu */}
              {showPortfolioDropdown && (
                <View style={styles.portfolioDropdownMenu}>
                  {userPortfolios.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.portfolioDropdownItem,
                        p.id === selectedPortfolioId && styles.portfolioDropdownItemActive
                      ]}
                      onPress={() => {
                        setSelectedPortfolioId(p.id);
                        setShowPortfolioDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.portfolioDropdownItemText,
                        p.id === selectedPortfolioId && styles.portfolioDropdownItemTextActive
                      ]} numberOfLines={1}>
                        {p.name}
                      </Text>
                      {p.id === selectedPortfolioId && (
                        <Ionicons name="checkmark" size={18} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                  <View style={styles.portfolioDropdownDivider} />
                  <TouchableOpacity
                    style={styles.portfolioDropdownItem}
                    onPress={() => {
                      setShowPortfolioDropdown(false);
                      setShowCreatePortfolioModal(true);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#007AFF" />
                    <Text style={styles.portfolioDropdownAddText}>Create New Portfolio</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.portfolioActions}>
              <TouchableOpacity
                style={styles.portfolioOptionsButton}
                onPress={() => {
                  setEditingPortfolioName(currentPortfolio?.name || '');
                  setShowPortfolioOptionsModal(true);
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addIconButton}
                onPress={() => setAddStockModal(true)}
              >
                <Ionicons name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.portfolioValueSection}>
            <Text style={styles.portfolioValue}>
              ${(livePortfolioData?.totalValue || contextCurrentPortfolio?.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.portfolioChange, { color: (livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? "#00C853" : "#FF3B30" }]}>
              {(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '+' : ''}${Math.abs(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0).toFixed(2)} ({(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '+' : ''}{(livePortfolioData?.totalGainPercent ?? contextCurrentPortfolio?.totalGainPercent ?? 0).toFixed(2)}%)
            </Text>
          </View>

          {/* Portfolio Chart */}
          {portfolio.chartData.length > 1 && (() => {
            // Smooth and interpolate data for cleaner curves
            const smoothedChartData = interpolateData(portfolio.chartData, 80);
            const chartSpacing = Math.max(2, (portfolioChartWidth - 40) / smoothedChartData.length);

            return (
            <View style={styles.portfolioChartContainer}>
              <GiftedLineChart
                areaChart
                data={smoothedChartData}
                height={200}
                width={portfolioChartWidth}
                curved
                curvature={0.15}
                curveType={1}
                startFillColor={(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444'}
                startOpacity={0.25}
                endOpacity={0.01}
                color={(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444'}
                thickness={2.5}
                hideDataPoints
                hideAxesAndRules
                hideYAxisText
                xAxisLabelsHeight={0}
                yAxisLabelPrefix="$"
                backgroundColor="transparent"
                spacing={chartSpacing}
                initialSpacing={5}
                endSpacing={5}
                adjustToWidth
                disableScroll
                pointerConfig={{
                  pointerStripHeight: 200,
                  pointerStripColor: 'rgba(142, 142, 147, 0.3)',
                  pointerStripWidth: 1,
                  strokeDashArray: [4, 4],
                  pointerColor: (livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444',
                  radius: 6,
                  pointerLabelWidth: 120,
                  pointerLabelHeight: 50,
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: (items: any) => {
                    if (!items?.[0]) return null;
                    const value = items[0].value;
                    return (
                      <View style={styles.portfolioTooltip}>
                        <Text style={styles.portfolioTooltipValue}>
                          ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                    );
                  },
                }}
              />
              
              {/* Time Range Selector */}
              <View style={styles.timeRangeSelectorContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timeRangeScrollContent}
                >
                  {['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'ALL'].map((range) => (
                    <TouchableOpacity
                      key={range}
                      style={[
                        styles.timeRangeButton,
                        portfolioTimeRange === range && styles.timeRangeButtonActive
                      ]}
                      onPress={() => setPortfolioTimeRange(range)}
                    >
                      <Text style={[
                        styles.timeRangeText,
                        portfolioTimeRange === range && styles.timeRangeTextActive
                      ]}>
                        {range}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.expandButton}>
                  <Ionicons name="expand-outline" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>
            );
          })()}

          {/* Holdings List */}
          {(livePortfolioData?.holdings || contextCurrentPortfolio?.holdings || []).length > 0 && (
            <View style={styles.holdingsList}>
              <View style={styles.holdingsTitleRow}>
                <Text style={styles.holdingsTitle}>Holdings</Text>
                <TouchableOpacity
                  style={styles.addHoldingButton}
                  onPress={() => setAddStockModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
              {(livePortfolioData?.holdings || contextCurrentPortfolio?.holdings || []).map((holding: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.holdingRow}
                  onPress={() => handleHoldingPress(holding)}
                >
                  <View style={styles.holdingLeft}>
                    <View style={styles.holdingIconContainer}>
                      <Text style={styles.holdingIcon}>{holding.symbol.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.holdingSymbol}>{formatSymbolDisplay(holding.symbol)}</Text>
                      <Text style={styles.holdingShares}>
                        {holding.shares} shares • ${holding.avgCost.toFixed(2)} avg
                      </Text>
                    </View>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={styles.holdingValue}>
                      ${holding.currentValue.toFixed(2)}
                    </Text>
                    <Text style={[styles.holdingGain, { color: holding.gain >= 0 ? "#34C759" : "#FF3B30" }]}>
                      {holding.gain >= 0 ? '+' : ''}${Math.abs(holding.gain).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {(!contextCurrentPortfolio || contextCurrentPortfolio.holdings.length === 0) && (
            <View style={styles.emptyPortfolio}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="pie-chart-outline" size={48} color="#007AFF" />
              </View>
              <Text style={styles.emptyText}>Start Building Your Portfolio</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add your first stock</Text>
            </View>
          )}

          {/* Portfolio Analytics Card */}
          {(livePortfolioData?.holdings || contextCurrentPortfolio?.holdings || []).length > 0 && (() => {
            // Use live data with fallback to context values
            const holdings = livePortfolioData?.holdings || contextCurrentPortfolio?.holdings || [];
            const totalValue = livePortfolioData?.totalValue || contextCurrentPortfolio?.totalValue || 0;
            const totalGain = livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0;
            const totalGainPercent = livePortfolioData?.totalGainPercent ?? contextCurrentPortfolio?.totalGainPercent ?? 0;
            const holdingWeights = holdings.map((h: any) => h.currentValue / (totalValue || 1));
            const herfindahlIndex = holdingWeights.reduce((sum: number, w: number) => sum + (w * w), 0);
            const diversificationScore = Math.round((1 - herfindahlIndex) * 100);

            return (
              <TouchableOpacity
                style={styles.analyticsPreviewCard}
                onPress={() => router.push('/portfolio/analytics')}
                activeOpacity={0.7}
              >
                <View style={styles.analyticsPreviewHeader}>
                  <View style={styles.analyticsPreviewIconContainer}>
                    <Ionicons name="analytics" size={24} color="#007AFF" />
                  </View>
                  <View style={styles.analyticsPreviewTitleContainer}>
                    <Text style={styles.analyticsPreviewTitle}>Portfolio Analytics</Text>
                    <Text style={styles.analyticsPreviewSubtitle}>View detailed insights</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                </View>
                <View style={styles.analyticsPreviewStats}>
                  <View style={styles.analyticsPreviewStat}>
                    <Text style={styles.analyticsPreviewStatLabel}>Total P&L</Text>
                    <Text style={[styles.analyticsPreviewStatValue, { color: totalGain >= 0 ? '#34C759' : '#FF3B30' }]}>
                      {totalGain >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
                    </Text>
                  </View>
                  <View style={styles.analyticsPreviewDivider} />
                  <View style={styles.analyticsPreviewStat}>
                    <Text style={styles.analyticsPreviewStatLabel}>Diversification</Text>
                    <Text style={[styles.analyticsPreviewStatValue, {
                      color: diversificationScore >= 70 ? '#34C759' : diversificationScore >= 40 ? '#FF9500' : '#FF3B30'
                    }]}>
                      {diversificationScore}/100
                    </Text>
                  </View>
                  <View style={styles.analyticsPreviewDivider} />
                  <View style={styles.analyticsPreviewStat}>
                    <Text style={styles.analyticsPreviewStatLabel}>Holdings</Text>
                    <Text style={styles.analyticsPreviewStatValue}>{holdings.length}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* Watchlist Section */}
        <View style={styles.watchlistSection}>
          <View style={styles.watchlistHeader}>
            <View style={styles.watchlistHeaderLeft}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Watchlist</Text>
                <TouchableOpacity
                  style={styles.addWatchlistButtonHeader}
                  onPress={() => setWatchlistModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              <LastUpdated timestamp={Date.now() - (priceUpdateTrigger % 10) * 100} prefix="" style={{ marginTop: 2 }} />
            </View>
            <View style={styles.watchlistHeaderRight}>
              {/* Filter Dropdown */}
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.filterButton}
                  onPress={() => {
                    setShowFilterDropdown(!showFilterDropdown);
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={styles.filterButtonText}>{watchlistFilter}</Text>
                  <Ionicons name="chevron-down" size={16} color="#8E8E93" />
                </TouchableOpacity>
                {showFilterDropdown && (
                  <View style={styles.dropdownMenu}>
                    {(['All', 'Gainers', 'Losers'] as const).map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          watchlistFilter === option && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setWatchlistFilter(option);
                          setShowFilterDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          watchlistFilter === option && styles.dropdownItemTextActive
                        ]}>
                          {option}
                        </Text>
                        {watchlistFilter === option && (
                          <Ionicons name="checkmark" size={16} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Sort Dropdown */}
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.filterButton}
                  onPress={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterDropdown(false);
                  }}
                >
                  <Text style={styles.filterButtonText}>{watchlistSort}</Text>
                  <Ionicons name="chevron-down" size={16} color="#8E8E93" />
                </TouchableOpacity>
                {showSortDropdown && (
                  <View style={[styles.dropdownMenu, styles.dropdownMenuRight]}>
                    {(['My Sort', 'Name', 'Price', 'Change %', 'Change $'] as const).map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          watchlistSort === option && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setWatchlistSort(option);
                          setShowSortDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          watchlistSort === option && styles.dropdownItemTextActive
                        ]}>
                          {option}
                        </Text>
                        {watchlistSort === option && (
                          <Ionicons name="checkmark" size={16} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {watchlistDataLoading ? (
            <WatchlistSkeletonList count={4} />
          ) : liveWatchlistData.length === 0 ? (
            <View style={styles.emptyWatchlist}>
              <View style={styles.emptyWatchlistIconContainer}>
                <Ionicons name="star-outline" size={40} color="#007AFF" />
              </View>
              <Text style={styles.emptyWatchlistText}>Your watchlist is empty</Text>
              <Text style={styles.emptyWatchlistSubtext}>Add stocks to track their performance</Text>
              <TouchableOpacity 
                style={styles.addFirstButton}
                onPress={() => setWatchlistModal(true)}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addFirstButtonText}>Add Stock</Text>
              </TouchableOpacity>
            </View>
          ) : filteredWatchlist.length === 0 ? (
            <View style={styles.emptyWatchlist}>
              <Text style={styles.emptyWatchlistText}>No {watchlistFilter.toLowerCase()} found</Text>
              <Text style={styles.emptyWatchlistSubtext}>Try changing your filter</Text>
            </View>
          ) : (
            <View style={styles.watchlistList}>
              {filteredWatchlist.map((stock, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.watchlistRow}
                  onPress={() => router.push(`/symbol/${encodeURIComponent(stock.symbol)}/chart`)}
                  onLongPress={() => handleRemoveFromWatchlist(stock.symbol)}
                >
                  <View style={styles.watchlistRowLeft}>
                    <Text style={styles.watchlistRowSymbol}>{formatSymbolDisplay(stock.symbol)}</Text>
                    <MarketTimeLabel isCrypto={stock.symbol.includes('/') || (stock.symbol.endsWith('USD') && stock.symbol.length <= 10)} style={{ marginTop: 2 }} />
                  </View>
                  
                  <View style={styles.watchlistRowCenter}>
                    <GiftedLineChart
                      data={interpolateSparkline(stock.data.length > 1 ? stock.data : [stock.price || 100, (stock.price || 100) * 0.98, (stock.price || 100) * 1.02, stock.price || 100], 18).map(value => ({ value }))}
                      width={Platform.OS === 'android' ? 55 : 85}
                      height={Platform.OS === 'android' ? 28 : 36}
                      curved
                      areaChart
                      hideDataPoints
                      hideRules
                      hideYAxisText
                      hideAxesAndRules
                      disableScroll
                      initialSpacing={0}
                      endSpacing={0}
                      spacing={(Platform.OS === 'android' ? 55 : 85) / 18}
                      thickness={1.5}
                      color={stock.color}
                      startFillColor={stock.color}
                      endFillColor={stock.color}
                      startOpacity={0.2}
                      endOpacity={0.02}
                      yAxisOffset={0}
                      maxValue={105}
                      mostNegativeValue={-5}
                    />
                  </View>
                  
                  <View style={styles.watchlistRowRight}>
                    <AnimatedPrice
                      value={stock.price}
                      style={styles.watchlistRowPrice}
                      flashOnChange={true}
                      decimals={2}
                    />
                    <View style={styles.watchlistRowChangeContainer}>
                      <Ionicons
                        name={stock.changePercent >= 0 ? 'arrow-up' : 'arrow-down'} 
                        size={12} 
                        color={stock.color} 
                      />
                      <Text style={[styles.watchlistRowChange, { color: stock.color }]}>
                        ${Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Stock Picks Section */}
        <View style={styles.stockPicksSection}>
          <TouchableOpacity
            style={styles.stockPicksCard}
            onPress={() => router.push('/premium/stock-picks')}
            activeOpacity={0.9}
          >
            {/* Header */}
            <View style={styles.stockPicksHeader}>
              <View style={styles.stockPicksHeaderLeft}>
                <View style={styles.stockPicksIconBg}>
                  <Ionicons name="trophy" size={20} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.stockPicksTitle}>Stock Picks</Text>
                  <Text style={styles.stockPicksSubtitle}>
                    {isPremium
                      ? `${currentTier === 'gold' ? '5' : currentTier === 'platinum' ? '8' : '15'} expert picks`
                      : 'Expert curated selections'}
                  </Text>
                </View>
              </View>
              <View style={styles.stockPicksBadge}>
                {isPremium ? (
                  <View style={[styles.tierBadge, {
                    backgroundColor: currentTier === 'diamond' ? '#B9F2FF' : currentTier === 'platinum' ? '#E5E4E2' : '#FFD700'
                  }]}>
                    <Ionicons name={currentTier === 'gold' ? 'star' : 'diamond'} size={12} color="#000" />
                    <Text style={styles.tierBadgeText}>
                      {currentTier?.charAt(0).toUpperCase()}{currentTier?.slice(1)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="lock-closed" size={12} color="#FFD700" />
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Preview Cards */}
            <View style={styles.stockPicksPreview}>
              {(liveStockPicks.length > 0 ? liveStockPicks : STOCK_PICKS_PREVIEW).map((pick, idx) => (
                <View key={idx} style={styles.pickPreviewCard}>
                  <View style={styles.pickPreviewLeft}>
                    <View style={[styles.pickRankBadge, {
                      backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32'
                    }]}>
                      <Text style={styles.pickRankText}>#{idx + 1}</Text>
                    </View>
                    <View>
                      <Text style={styles.pickSymbol}>{pick.symbol}</Text>
                      <Text style={styles.pickCategory}>{pick.category}</Text>
                    </View>
                  </View>
                  <View style={styles.pickPreviewRight}>
                    {isPremium && liveStockPicks.length > 0 ? (
                      <>
                        <Text style={styles.pickPrice}>${pick.price?.toFixed(2)}</Text>
                        <View style={[styles.pickChangeContainer, {
                          backgroundColor: (pick.changePercent || 0) >= 0 ? '#34C75915' : '#FF3B3015'
                        }]}>
                          <Ionicons
                            name={(pick.changePercent || 0) >= 0 ? 'arrow-up' : 'arrow-down'}
                            size={10}
                            color={(pick.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30'}
                          />
                          <Text style={[styles.pickChange, {
                            color: (pick.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30'
                          }]}>
                            {Math.abs(pick.changePercent || 0).toFixed(2)}%
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.pickLockedOverlay}>
                        <Ionicons name="lock-closed" size={14} color="#8E8E93" />
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* CTA */}
            <View style={styles.stockPicksCTA}>
              <Text style={styles.stockPicksCTAText}>
                {isPremium ? 'View All Picks' : 'Unlock Stock Picks'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#007AFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Trending Section */}
        <View style={styles.trendingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>

          {trendingLoading ? (
            <TrendingSkeletonList count={4} />
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.trendingScroll}
            >
              {liveTrending.map((stock, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.trendingCard}
                  onPress={() => router.push(`/symbol/${encodeURIComponent(stock.symbol)}/chart`)}
                >
                  <View style={styles.trendingHeader}>
                    <Text style={styles.trendingSymbol}>{stock.symbol}</Text>
                    <Ionicons
                      name={stock.changePercent >= 0 ? 'trending-up' : 'trending-down'}
                      size={16}
                      color={stock.color}
                    />
                  </View>
                  <MarketTimeLabel isCrypto={false} style={{ marginBottom: 4 }} />
                  
                  <AnimatedPrice
                    value={stock.price}
                    style={styles.trendingPrice}
                    flashOnChange={true}
                    decimals={2}
                  />

                  <GiftedLineChart
                    data={interpolateSparkline(stock.data.length > 1 ? stock.data : [stock.price || 100, (stock.price || 100) * 0.98, (stock.price || 100) * 1.02, stock.price || 100], 18).map(value => ({ value }))}
                    width={chartWidth - 10}
                    height={45}
                    curved
                    areaChart
                    hideDataPoints
                    hideRules
                    hideYAxisText
                    hideAxesAndRules
                    disableScroll
                    initialSpacing={0}
                    endSpacing={0}
                    spacing={(chartWidth - 10) / 18}
                    thickness={1.5}
                    color={stock.color}
                    startFillColor={stock.color}
                    endFillColor={stock.color}
                    startOpacity={0.15}
                    endOpacity={0.02}
                    yAxisOffset={0}
                    maxValue={105}
                    mostNegativeValue={-5}
                  />
                  
                  <AnimatedChange
                    value={stock.changePercent}
                    style={{ ...styles.trendingChange, color: stock.color }}
                    showArrow={false}
                    flashOnChange={true}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Stock</Text>
                <Text style={styles.modalSubtitle}>Add to your portfolio</Text>
              </View>
              <TouchableOpacity onPress={() => {
                setAddStockModal(false);
                setStockSearchResults([]);
                setShowStockSearchDropdown(false);
              }}>
                <Ionicons name="close-circle" size={32} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock Symbol</Text>
                <View style={styles.watchlistSearchContainer}>
                  <Ionicons name="search" size={20} color="#8E8E93" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.watchlistSearchInput}
                    placeholder="Search by symbol or company name"
                    placeholderTextColor="#999"
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
                    <TouchableOpacity onPress={() => {
                      setNewStockSymbol('');
                      setShowStockSearchDropdown(false);
                    }}>
                      <Ionicons name="close-circle" size={20} color="#8E8E93" />
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
                              <Ionicons name="add" size={16} color="#007AFF" />
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
                  <Text style={styles.inputLabel}>Shares</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="10"
                    placeholderTextColor="#999"
                    value={newStockShares}
                    onChangeText={setNewStockShares}
                    keyboardType="decimal-pad"
                    editable={!addingStock}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Avg Cost ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="150.00"
                    placeholderTextColor="#999"
                    value={newStockAvgCost}
                    onChangeText={setNewStockAvgCost}
                    keyboardType="decimal-pad"
                    editable={!addingStock}
                  />
                </View>
              </View>

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
                    <Text style={styles.modalButtonText}>Add to Portfolio</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add to Watchlist</Text>
                <Text style={styles.modalSubtitle}>Track stocks you&apos;re interested in</Text>
              </View>
              <TouchableOpacity onPress={() => {
                setWatchlistModal(false);
                setWatchlistSymbol('');
                setShowWatchlistSearchDropdown(false);
              }}>
                <Ionicons name="close-circle" size={32} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Search Stock</Text>
                <View style={styles.watchlistSearchContainer}>
                  <Ionicons name="search" size={20} color="#8E8E93" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.watchlistSearchInput}
                    placeholder="Search by symbol or company name"
                    placeholderTextColor="#999"
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
                    <TouchableOpacity onPress={() => {
                      setWatchlistSymbol('');
                      setShowWatchlistSearchDropdown(false);
                    }}>
                      <Ionicons name="close-circle" size={20} color="#8E8E93" />
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
                                <Text style={styles.alreadyAddedText}>Added</Text>
                              </View>
                            ) : (
                              <View style={styles.addBadge}>
                                <Ionicons name="add" size={16} color="#007AFF" />
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
                <Text style={styles.quickAddTitle}>Popular Stocks</Text>
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
                    <Text style={styles.modalButtonText}>Add to Watchlist</Text>
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
          <View style={styles.holdingOptionsContent}>
            {selectedHolding && (
              <>
                <View style={styles.holdingOptionsHeader}>
                  <View style={styles.holdingOptionsIconContainer}>
                    <Text style={styles.holdingOptionsIcon}>{selectedHolding.symbol.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.holdingOptionsSymbol}>{selectedHolding.symbol}</Text>
                    <Text style={styles.holdingOptionsShares}>
                      {selectedHolding.shares} shares • ${selectedHolding.avgCost.toFixed(2)} avg
                    </Text>
                  </View>
                </View>

                <View style={styles.holdingOptionsStats}>
                  <View style={styles.holdingOptionsStat}>
                    <Text style={styles.holdingOptionsStatLabel}>Current Value</Text>
                    <Text style={styles.holdingOptionsStatValue}>
                      ${selectedHolding.currentValue?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                  <View style={styles.holdingOptionsStat}>
                    <Text style={styles.holdingOptionsStatLabel}>Total Gain/Loss</Text>
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
                    style={styles.holdingOptionButton}
                    onPress={() => {
                      setHoldingOptionsModal(false);
                      router.push(`/symbol/${encodeURIComponent(selectedHolding.symbol)}/chart`);
                    }}
                  >
                    <Ionicons name="stats-chart" size={24} color="#007AFF" />
                    <Text style={styles.holdingOptionButtonText}>View Chart</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.holdingOptionButton}
                    onPress={handleOpenEditModal}
                  >
                    <Ionicons name="create-outline" size={24} color="#FF9500" />
                    <Text style={styles.holdingOptionButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.holdingOptionButton}
                    onPress={() => handleRemoveStock(selectedHolding.symbol)}
                  >
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                    <Text style={[styles.holdingOptionButtonText, { color: '#FF3B30' }]}>Remove</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.holdingOptionsCancelButton}
                  onPress={() => {
                    setHoldingOptionsModal(false);
                    setSelectedHolding(null);
                  }}
                >
                  <Text style={styles.holdingOptionsCancelText}>Cancel</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Holding</Text>
                <Text style={styles.modalSubtitle}>
                  {editingHolding ? `Update ${editingHolding.symbol} position` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCloseEditModal}>
                <Ionicons name="close-circle" size={32} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              {editingHolding && (
                <View style={styles.editHoldingSymbolRow}>
                  <View style={styles.editHoldingIconContainer}>
                    <Text style={styles.editHoldingIcon}>{editingHolding.symbol.charAt(0)}</Text>
                  </View>
                  <Text style={styles.editHoldingSymbol}>{editingHolding.symbol}</Text>
                </View>
              )}

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Shares</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="10"
                    placeholderTextColor="#999"
                    value={editShares}
                    onChangeText={setEditShares}
                    keyboardType="decimal-pad"
                    editable={!savingEdit}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Avg Cost ($)</Text>
                  <TextInput
                    style={styles.modalInput}
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
              <View style={styles.createPortfolioModalContent}>
                <Text style={styles.createPortfolioTitle}>Create New Portfolio</Text>
                <TextInput
                  style={styles.createPortfolioInput}
                  placeholder="Portfolio name"
                  placeholderTextColor="#8E8E93"
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
          <View style={styles.portfolioOptionsContent}>
            <View style={styles.portfolioOptionsHeader}>
              <Text style={styles.portfolioOptionsTitle}>Portfolio Settings</Text>
              <TouchableOpacity onPress={() => setShowPortfolioOptionsModal(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.portfolioOptionsSection}>
              <Text style={styles.portfolioOptionsLabel}>Portfolio Name</Text>
              <TextInput
                style={styles.portfolioOptionsInput}
                value={editingPortfolioName}
                onChangeText={setEditingPortfolioName}
                placeholder="Enter name"
                placeholderTextColor="#8E8E93"
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

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F7' 
  },
  scrollView: { flex: 1 },
  content: { paddingBottom: 20 },
  
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 110 : 90,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  // Connection Banner
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 10,
    gap: 10,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1976D2',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: Platform.OS === 'android' ? 12 : 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F7'
  },
  menuButton: {
    paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
    paddingVertical: Platform.OS === 'android' ? 6 : 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E5EA'
  },
  menu: {
    fontSize: Platform.OS === 'android' ? 12 : 15,
    fontWeight: '600',
    color: '#000',
    includeFontPadding: false,
  },
  searchWrapper: {
    flex: 1,
    marginHorizontal: 12,
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    height: Platform.OS === 'android' ? 38 : 44,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIconHeader: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: Platform.OS === 'android' ? 12 : 15,
    color: '#000',
    fontWeight: '500',
    includeFontPadding: false,
  },
  searchDropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
  },
  searchScrollView: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  searchResultSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  searchResultName: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  searchResultRight: {
    alignItems: 'flex-end',
  },
  searchResultExchange: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
    backgroundColor: '#007AFF15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  title: {
    fontSize: Platform.OS === 'android' ? 16 : 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 10 : 16,
  },
  liveStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastUpdatedText: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 16 : 22,
    fontWeight: '700',
    color: '#000',
    includeFontPadding: false,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B3015',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  liveText: { 
    color: '#FF3B30', 
    fontSize: 11, 
    fontWeight: '700',
    letterSpacing: 0.5
  },
  
  // Market Indices - Horizontal Scroll
  indicesSection: {
    paddingLeft: Platform.OS === 'android' ? 16 : 20,
    marginBottom: Platform.OS === 'android' ? 16 : 24,
  },
  indicesLoadingContainer: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicesScrollContent: {
    paddingRight: 20,
  },
  indexCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'android' ? 12 : 16,
    padding: Platform.OS === 'android' ? 10 : 14,
    marginRight: Platform.OS === 'android' ? 8 : 12,
    width: Platform.OS === 'android' ? 105 : 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  indexCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  indexIconContainer: {
    width: Platform.OS === 'android' ? 22 : 28,
    height: Platform.OS === 'android' ? 22 : 28,
    borderRadius: Platform.OS === 'android' ? 11 : 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'android' ? 6 : 8,
  },
  indexSymbol: {
    fontSize: Platform.OS === 'android' ? 11 : 14,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  indexName: {
    fontSize: Platform.OS === 'android' ? 9 : 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: Platform.OS === 'android' ? 4 : 6,
    includeFontPadding: false,
  },
  indexPrice: {
    fontSize: Platform.OS === 'android' ? 13 : 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: Platform.OS === 'android' ? 6 : 8,
    includeFontPadding: false,
  },
  indexChangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 6 : 8,
    paddingVertical: Platform.OS === 'android' ? 3 : 4,
    borderRadius: Platform.OS === 'android' ? 6 : 8,
    alignSelf: 'flex-start',
  },
  indexChange: {
    fontSize: Platform.OS === 'android' ? 9 : 12,
    fontWeight: '700',
    marginLeft: 4,
    includeFontPadding: false,
  },
  
  // Portfolio Section
  portfolioSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginBottom: Platform.OS === 'android' ? 16 : 24,
    borderRadius: Platform.OS === 'android' ? 16 : 20,
    padding: Platform.OS === 'android' ? 14 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  portfolioTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 12 : 20,
  },
  portfolioDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  portfolioDropdownText: {
    fontSize: Platform.OS === 'android' ? 12 : 16,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 6,
    includeFontPadding: false,
    maxWidth: 150,
  },
  portfolioSelectorContainer: {
    position: 'relative',
    zIndex: 100,
  },
  portfolioDropdownMenu: {
    position: 'absolute',
    top: 45,
    left: 0,
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 101,
  },
  portfolioDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  portfolioDropdownItemActive: {
    backgroundColor: '#007AFF10',
  },
  portfolioDropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  portfolioDropdownItemTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  portfolioDropdownDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 12,
  },
  portfolioDropdownAddText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
  },
  portfolioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portfolioOptionsButton: {
    width: Platform.OS === 'android' ? 34 : 40,
    height: Platform.OS === 'android' ? 34 : 40,
    borderRadius: Platform.OS === 'android' ? 17 : 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButton: {
    width: Platform.OS === 'android' ? 34 : 40,
    height: Platform.OS === 'android' ? 34 : 40,
    borderRadius: Platform.OS === 'android' ? 17 : 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconButton: {
    width: Platform.OS === 'android' ? 34 : 40,
    height: Platform.OS === 'android' ? 34 : 40,
    borderRadius: Platform.OS === 'android' ? 17 : 20,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioValueSection: {
    marginBottom: Platform.OS === 'android' ? 16 : 24,
  },
  portfolioValue: {
    fontSize: Platform.OS === 'android' ? 28 : 40,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -1,
    marginBottom: Platform.OS === 'android' ? 4 : 8,
    includeFontPadding: false,
  },
  portfolioChange: {
    fontSize: Platform.OS === 'android' ? 14 : 20,
    fontWeight: '700',
    includeFontPadding: false,
  },
  
  // Chart
  portfolioChartContainer: {
    marginVertical: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 0,
  },
  portfolioTooltip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  portfolioTooltipLabel: {
    color: '#000',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  portfolioTooltipValue: {
    color: '#000',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
  xAxisLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
  },
  timeRangeSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    justifyContent: 'space-between',
  },
  timeRangeScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  timeRangeButton: {
    paddingVertical: Platform.OS === 'android' ? 7 : 10,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 18,
    borderRadius: Platform.OS === 'android' ? 10 : 14,
    marginRight: Platform.OS === 'android' ? 6 : 8,
    backgroundColor: '#FFFFFF',
  },
  timeRangeButtonActive: {
    backgroundColor: '#D6F0FF',
  },
  timeRangeText: {
    fontSize: Platform.OS === 'android' ? 11 : 15,
    color: '#000',
    fontWeight: '600',
    includeFontPadding: false,
  },
  timeRangeTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  expandButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // Holdings
  holdingsList: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: Platform.OS === 'android' ? 14 : 20,
  },
  holdingsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 8 : 12,
  },
  holdingsTitle: {
    fontSize: Platform.OS === 'android' ? 12 : 15,
    fontWeight: '700',
    color: '#000',
    includeFontPadding: false,
  },
  addHoldingButton: {
    padding: 4,
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 10 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  holdingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  holdingIconContainer: {
    width: Platform.OS === 'android' ? 32 : 40,
    height: Platform.OS === 'android' ? 32 : 40,
    borderRadius: Platform.OS === 'android' ? 16 : 20,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'android' ? 8 : 12,
  },
  holdingIcon: {
    fontSize: Platform.OS === 'android' ? 12 : 16,
    fontWeight: '700',
    color: '#007AFF',
    includeFontPadding: false,
  },
  holdingSymbol: {
    fontSize: Platform.OS === 'android' ? 12 : 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  holdingShares: {
    fontSize: Platform.OS === 'android' ? 9 : 12,
    color: '#8E8E93',
    fontWeight: '500',
    includeFontPadding: false,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: Platform.OS === 'android' ? 12 : 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    includeFontPadding: false,
  },
  holdingGain: {
    fontSize: Platform.OS === 'android' ? 10 : 13,
    fontWeight: '600',
    includeFontPadding: false,
  },
  emptyPortfolio: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    color: '#000',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 6,
  },

  // Watchlist Section
  watchlistSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginBottom: Platform.OS === 'android' ? 16 : 24,
    borderRadius: Platform.OS === 'android' ? 16 : 20,
    padding: Platform.OS === 'android' ? 14 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  watchlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 10 : 16,
  },
  watchlistHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addWatchlistButtonHeader: {
    marginLeft: Platform.OS === 'android' ? 6 : 8,
  },
  watchlistHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 8 : 12,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 100,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 2 : 4,
    paddingVertical: Platform.OS === 'android' ? 4 : 6,
    paddingHorizontal: Platform.OS === 'android' ? 8 : 10,
    backgroundColor: '#F5F5F7',
    borderRadius: Platform.OS === 'android' ? 6 : 8,
  },
  filterButtonText: {
    fontSize: Platform.OS === 'android' ? 10 : 14,
    color: '#000',
    fontWeight: '500',
    includeFontPadding: false,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 36,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 120,
    zIndex: 1000,
  },
  dropdownMenuRight: {
    left: 'auto',
    right: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemActive: {
    backgroundColor: '#007AFF10',
  },
  dropdownItemText: {
    fontSize: Platform.OS === 'android' ? 11 : 14,
    color: '#000',
    fontWeight: '500',
    includeFontPadding: false,
  },
  dropdownItemTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  addWatchlistButton: {
    padding: 4,
  },
  watchlistList: {
    marginTop: 8,
  },
  watchlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'android' ? 12 : 16,
    paddingHorizontal: Platform.OS === 'android' ? 2 : 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  watchlistRowLeft: {
    flex: Platform.OS === 'android' ? 0 : 1,
    width: Platform.OS === 'android' ? 85 : undefined,
    minWidth: Platform.OS === 'android' ? undefined : 100,
  },
  watchlistRowSymbol: {
    fontSize: Platform.OS === 'android' ? 12 : 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    includeFontPadding: false,
  },
  watchlistRowName: {
    fontSize: Platform.OS === 'android' ? 9 : 13,
    color: '#8E8E93',
    fontWeight: '500',
    maxWidth: Platform.OS === 'android' ? 75 : undefined,
    includeFontPadding: false,
  },
  watchlistRowCenter: {
    width: Platform.OS === 'android' ? 60 : 90,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginHorizontal: Platform.OS === 'android' ? 4 : 0,
  },
  watchlistSparkline: {
    paddingRight: 0,
    marginRight: -10,
  },
  watchlistRowRight: {
    flex: Platform.OS === 'android' ? 1 : 0,
    alignItems: 'flex-end',
    minWidth: Platform.OS === 'android' ? 120 : 110,
    flexShrink: 0,
  },
  watchlistRowPrice: {
    fontSize: Platform.OS === 'android' ? 12 : 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    includeFontPadding: false,
  },
  watchlistRowChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  watchlistRowChange: {
    fontSize: Platform.OS === 'android' ? 9 : 13,
    fontWeight: '600',
    includeFontPadding: false,
  },
  emptyWatchlist: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyWatchlistIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyWatchlistText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
  },
  emptyWatchlistSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 16,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Trending
  trendingSection: {
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginBottom: Platform.OS === 'android' ? 16 : 24,
  },
  loadingContainer: {
    height: Platform.OS === 'android' ? 160 : 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingScroll: {
    paddingRight: Platform.OS === 'android' ? 16 : 20,
  },
  trendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'android' ? 12 : 16,
    padding: Platform.OS === 'android' ? 10 : 12,
    marginRight: Platform.OS === 'android' ? 8 : 12,
    width: Platform.OS === 'android' ? 100 : chartWidth + 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 4 : 6,
  },
  trendingSymbol: {
    fontWeight: '700',
    fontSize: Platform.OS === 'android' ? 11 : 15,
    color: '#000',
    includeFontPadding: false,
  },
  trendingPrice: {
    fontSize: Platform.OS === 'android' ? 13 : 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: Platform.OS === 'android' ? 4 : 8,
    includeFontPadding: false,
  },
  miniChart: {
    marginVertical: Platform.OS === 'android' ? 2 : 4,
    marginHorizontal: Platform.OS === 'android' ? -10 : -12,
  },
  trendingChange: {
    fontSize: Platform.OS === 'android' ? 10 : 13,
    fontWeight: '700',
    marginTop: Platform.OS === 'android' ? 2 : 4,
    includeFontPadding: false,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  modalForm: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    color: '#000',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Watchlist Modal Specific
  watchlistSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  watchlistSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  watchlistSearchDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  watchlistSearchScrollView: {
    maxHeight: 200,
  },
  watchlistSearchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  watchlistSearchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  watchlistSearchResultSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  watchlistSearchResultName: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  watchlistSearchResultRight: {
    alignItems: 'flex-end',
  },
  alreadyAddedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C75915',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  alreadyAddedText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
  },
  addBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddSection: {
    marginBottom: 20,
  },
  quickAddTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  quickAddChipAdded: {
    backgroundColor: '#34C75915',
    borderColor: '#34C75930',
  },
  quickAddChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  quickAddChipTextAdded: {
    color: '#34C759',
  },

  // Stock Picks Section
  stockPicksSection: {
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginBottom: Platform.OS === 'android' ? 16 : 24,
  },
  stockPicksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'android' ? 16 : 20,
    padding: Platform.OS === 'android' ? 14 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFD70030',
  },
  stockPicksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 10 : 16,
  },
  stockPicksHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 8 : 12,
  },
  stockPicksIconBg: {
    width: Platform.OS === 'android' ? 36 : 44,
    height: Platform.OS === 'android' ? 36 : 44,
    borderRadius: Platform.OS === 'android' ? 18 : 22,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockPicksTitle: {
    fontSize: Platform.OS === 'android' ? 14 : 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    includeFontPadding: false,
  },
  stockPicksSubtitle: {
    fontSize: Platform.OS === 'android' ? 10 : 13,
    color: '#8E8E93',
    fontWeight: '500',
    includeFontPadding: false,
  },
  stockPicksBadge: {},
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 8 : 10,
    paddingVertical: Platform.OS === 'android' ? 4 : 5,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    gap: 4,
  },
  tierBadgeText: {
    fontSize: Platform.OS === 'android' ? 10 : 12,
    fontWeight: '700',
    color: '#000',
    includeFontPadding: false,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: Platform.OS === 'android' ? 8 : 10,
    paddingVertical: Platform.OS === 'android' ? 4 : 5,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: Platform.OS === 'android' ? 10 : 12,
    fontWeight: '700',
    color: '#FFD700',
    includeFontPadding: false,
  },
  stockPicksPreview: {
    gap: Platform.OS === 'android' ? 8 : 10,
    marginBottom: Platform.OS === 'android' ? 10 : 16,
  },
  pickPreviewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9FB',
    padding: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
  },
  pickPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 8 : 10,
  },
  pickRankBadge: {
    paddingHorizontal: Platform.OS === 'android' ? 6 : 8,
    paddingVertical: Platform.OS === 'android' ? 3 : 4,
    borderRadius: Platform.OS === 'android' ? 6 : 8,
  },
  pickRankText: {
    fontSize: Platform.OS === 'android' ? 9 : 11,
    fontWeight: '700',
    color: '#000',
    includeFontPadding: false,
  },
  pickSymbol: {
    fontSize: Platform.OS === 'android' ? 12 : 15,
    fontWeight: '700',
    color: '#000',
    includeFontPadding: false,
  },
  pickCategory: {
    fontSize: Platform.OS === 'android' ? 9 : 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 1,
    includeFontPadding: false,
  },
  pickPreviewRight: {
    alignItems: 'flex-end',
  },
  pickPrice: {
    fontSize: Platform.OS === 'android' ? 12 : 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    includeFontPadding: false,
  },
  pickChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 5 : 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  pickChange: {
    fontSize: Platform.OS === 'android' ? 9 : 11,
    fontWeight: '600',
    includeFontPadding: false,
  },
  pickLockedOverlay: {
    width: Platform.OS === 'android' ? 28 : 32,
    height: Platform.OS === 'android' ? 28 : 32,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockPicksCTA: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingTop: Platform.OS === 'android' ? 10 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  stockPicksCTAText: {
    fontSize: Platform.OS === 'android' ? 12 : 15,
    fontWeight: '600',
    color: '#007AFF',
    includeFontPadding: false,
  },

  // Holding Options Modal
  holdingOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  holdingOptionsContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  holdingOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  holdingOptionsIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  holdingOptionsIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  holdingOptionsSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  holdingOptionsShares: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  holdingOptionsStats: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  holdingOptionsStat: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 14,
  },
  holdingOptionsStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  holdingOptionsStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  holdingOptionsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  holdingOptionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  holdingOptionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginTop: 6,
  },
  holdingOptionsCancelButton: {
    backgroundColor: '#F5F5F7',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  holdingOptionsCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },

  // Edit Holding Modal
  editHoldingSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  editHoldingIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  editHoldingIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  editHoldingSymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },

  // Messages icon with badge
  messagesIconContainer: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#F5F5F7',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Portfolio Analytics Preview Card
  analyticsPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  analyticsPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  analyticsPreviewIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  analyticsPreviewTitleContainer: {
    flex: 1,
  },
  analyticsPreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  analyticsPreviewSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  analyticsPreviewStats: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 12,
  },
  analyticsPreviewStat: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsPreviewStatLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  analyticsPreviewStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  analyticsPreviewDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 8,
  },

  // Create Portfolio Modal
  createPortfolioModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  createPortfolioTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  createPortfolioInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
  },
  createPortfolioButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  createPortfolioCancelBtn: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createPortfolioCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  createPortfolioCreateBtn: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createPortfolioCreateBtnDisabled: {
    opacity: 0.5,
  },
  createPortfolioCreateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Portfolio Options Modal
  portfolioOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  portfolioOptionsContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  portfolioOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  portfolioOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  portfolioOptionsSection: {
    marginBottom: 16,
  },
  portfolioOptionsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  portfolioOptionsInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  portfolioOptionsSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  portfolioOptionsSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  portfolioOptionsDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  portfolioOptionsDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B3015',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  portfolioOptionsDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
