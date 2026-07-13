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
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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
// Home uses theme-aware local skeletons (shared SkeletonLoader is light-only)
import StockLogo from '@/components/StockLogo';
import { useAppReview } from '@/hooks/useAppReview';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import FadeSlideIn from '@/components/FadeSlideIn';
import Sparkline from '@/components/Sparkline';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const chartWidth = 110;
const portfolioChartWidth = width - 80;
// Full-bleed chart width: spans the hero card edge-to-edge (card margins only)
const portfolioChartBleedWidth = width - 32;

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

// Stock picks preview data
// Growth card teaser symbols — all in marketDataService's pre-loaded core
// list so prices are instant (ungated for now; paywall to be added later)
const GROWTH_STOCKS_PREVIEW = [
  { symbol: 'TSLA', category: 'EV & Energy' },
  { symbol: 'AMD', category: 'Semiconductors' },
  { symbol: 'LLY', category: 'Healthcare' },
];

// Picks carousel geometry: full-width cards, 12px gap, snap per card
const pickCardWidth = width - 32;
const pickCardSnap = pickCardWidth + 12;

const STOCK_PICKS_PREVIEW = [
  { symbol: 'NVDA', category: 'AI & Tech', reason: 'AI chip leader' },
  { symbol: 'AAPL', category: 'Tech Giant', reason: 'Services growth' },
  { symbol: 'MSFT', category: 'Cloud & AI', reason: 'Azure expansion' },
];

// Time-of-day greeting for the header
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Springy press wrapper with haptic feedback (UI only — same onPress behavior)
const ScalePress = ({
  children,
  onPress,
  onLongPress,
  style,
  activeScale = 0.96,
}: {
  children: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  style?: any;
  activeScale?: number;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 9 }).start();

  return (
    <TouchableOpacity activeOpacity={1} onPress={onPress} onLongPress={onLongPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// Theme-aware skeleton shimmer (opacity pulse, native driver)
const SkeletonPulse = ({ style, isDark }: { style?: any; isDark: boolean }) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 8 },
        style,
        { opacity },
      ]}
    />
  );
};

// Market overview loading placeholder (theme-aware, matches indexCard size)
const HomeIndicesSkeleton = ({ isDark, cardColor }: { isDark: boolean; cardColor: string }) => (
  <View style={{ flexDirection: 'row' }}>
    {[0, 1, 2, 3].map((i) => (
      <View key={i} style={{ width: 112, borderRadius: 14, backgroundColor: cardColor, padding: 11, marginRight: 10 }}>
        <SkeletonPulse isDark={isDark} style={{ width: 60, height: 12, marginBottom: 8 }} />
        <SkeletonPulse isDark={isDark} style={{ width: 44, height: 9, marginBottom: 8 }} />
        <SkeletonPulse isDark={isDark} style={{ width: 70, height: 14, marginBottom: 8 }} />
        <SkeletonPulse isDark={isDark} style={{ width: 52, height: 18, borderRadius: 9 }} />
      </View>
    ))}
  </View>
);

// Watchlist loading placeholder (theme-aware, mirrors row layout)
const HomeWatchlistSkeleton = ({ isDark }: { isDark: boolean }) => (
  <View>
    {[0, 1, 2, 3].map((i) => (
      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <SkeletonPulse isDark={isDark} style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }} />
          <SkeletonPulse isDark={isDark} style={{ width: 64, height: 13 }} />
        </View>
        <SkeletonPulse isDark={isDark} style={{ width: 85, height: 28, borderRadius: 6 }} />
        <View style={{ alignItems: 'flex-end', width: 90 }}>
          <SkeletonPulse isDark={isDark} style={{ width: 64, height: 13, marginBottom: 6 }} />
          <SkeletonPulse isDark={isDark} style={{ width: 76, height: 10 }} />
        </View>
      </View>
    ))}
  </View>
);

// Strategy discovery cards — deep-link into the screener with a preset
// applied (ids/gradients match the screener's own preset cards)
const STRATEGY_CARDS = [
  { id: 'momentum', name: 'Momentum', icon: 'flash', gradient: ['#E91E63', '#F06292'], description: 'Stocks in strong uptrends', isPremium: true },
  { id: 'breakout', name: 'Swing Trades', icon: 'pulse', gradient: ['#D500F9', '#E040FB'], description: 'Breakouts near 52W highs', isPremium: true },
  { id: 'quality', name: 'Fundamentals', icon: 'shield-checkmark', gradient: ['#5C6BC0', '#7986CB'], description: 'Elite ROE & margins', isPremium: false },
  { id: 'growth', name: 'High Growth', icon: 'rocket', gradient: ['#FF9800', '#FFB74D'], description: 'Revenue compounding fast', isPremium: false },
  { id: 'undervalued', name: 'Undervalued', icon: 'diamond', gradient: ['#7C4DFF', '#B388FF'], description: 'Bargains under 15x P/E', isPremium: false },
  { id: 'dividend', name: 'Dividends', icon: 'cash', gradient: ['#00BCD4', '#4DD0E1'], description: 'Yields of 4% and up', isPremium: false },
] as const;

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
  const { t } = useLanguage();
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
  const [picksPage, setPicksPage] = useState(0);

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

      const response = await fetch(
        `https://www.wallstreetstocks.ai/api/notifications?userId=${storedUserId}`
      );

      if (!response.ok) return;

      const data = await response.json();
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
      // Trigger a price update to refresh the UI with latest cached prices
      setPriceUpdateTrigger(prev => prev + 1);
      
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

  // ============= REAL-TIME PRICE REFRESH =============
  // Interval triggers re-render to show WebSocket price updates
  // Runs CONTINUOUSLY even when scrolled away - prices always update
  const [priceUpdateTrigger, setPriceUpdateTrigger] = useState(0);
  const priceRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Price update interval - runs continuously regardless of focus or scroll position
  // 250ms interval to reduce CPU usage on iPad compatibility mode
  useEffect(() => {
    priceRefreshIntervalRef.current = setInterval(() => {
      setPriceUpdateTrigger(prev => prev + 1);
    }, 250); // 250ms = 4 updates/sec - fast updates while reducing CPU load

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
        if (watchlist.length > 0) {
          wsSubscribe(watchlist);
        }
      }
    }, [wsConnected, wsSubscribe, watchlist])
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
      'SPY': 'S&P 500', 'QQQ': 'Nasdaq 100',
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
        // Always calculate from previousClose for accuracy
        const previousClose = quote.previousClose;
        let change: number;
        let changePercent: number;

        if (previousClose && previousClose > 0) {
          change = quote.price - previousClose;
          changePercent = (change / previousClose) * 100;
        } else {
          change = quote.change || 0;
          changePercent = quote.changePercent || 0;
        }

        return {
          ...index,
          name: nameMap[index.symbol] || index.symbol,
          price: quote.price,
          change,
          changePercent,
          color: changePercent >= 0 ? '#34C759' : '#FF3B30',
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
        // Always calculate from previousClose for accuracy
        // WebSocket day_change can use open price as reference, giving wrong values
        const previousClose = quote.previousClose || stock.previousClose;
        let newChange: number;
        let newChangePercent: number;

        if (previousClose && previousClose > 0) {
          newChange = quote.price - previousClose;
          newChangePercent = (newChange / previousClose) * 100;
        } else {
          newChange = quote.change ?? stock.change ?? 0;
          newChangePercent = quote.changePercent ?? stock.changePercent ?? 0;
        }
        
        // Update sparkline data with live price as the last point
        let updatedData = stock.data || [];
        if (updatedData.length > 0) {
          updatedData = [...updatedData];
          updatedData[updatedData.length - 1] = quote.price;
        }
        
        return {
          ...stock,
          price: quote.price,
          change: newChange,
          changePercent: newChangePercent,
          color: (newChangePercent || 0) >= 0 ? '#34C759' : '#FF3B30',
          data: updatedData,
        };
      }
      return stock;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistData, priceUpdateTrigger]);

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
        // Always calculate from previousClose for accuracy
        const previousClose = quote.previousClose;
        let change: number;
        let changePercent: number;

        if (previousClose && previousClose > 0) {
          change = quote.price - previousClose;
          changePercent = (change / previousClose) * 100;
        } else {
          change = quote.change ?? pick.change ?? 0;
          changePercent = quote.changePercent ?? pick.changePercent ?? 0;
        }

        return {
          ...pick,
          price: quote.price,
          change,
          changePercent,
        };
      }
      return pick;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockPicksData, priceUpdateTrigger]);

  // Momentum card: the manually curated server list (live-price overlaid);
  // falls back to today's top 3 movers if the server list isn't loaded
  const liveMomentumStocks = useMemo(() => {
    if (serverMomentum.length > 0) {
      return serverMomentum.map(p => {
        const q = priceStore.getQuote(p.symbol);
        return {
          ...p,
          price: q?.price || p.price,
          changePercent: q?.changePercent ?? p.changePercent,
        };
      });
    }
    const merged = marketDataService.getLiveData('stock')
      .map(item => {
        const q = priceStore.getQuote(item.symbol);
        return {
          symbol: item.symbol,
          category: item.name || item.symbol,
          price: q?.price || item.price,
          changePercent: q?.changePercent ?? item.changePercent ?? 0,
        };
      })
      .filter(s => s.price > 0);
    merged.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    return merged.slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceUpdateTrigger, serverMomentum]);

  // Growth card: the manually curated server list (live-price overlaid);
  // falls back to the hardcoded teaser names
  const liveGrowthStocks = useMemo(() => {
    if (serverGrowth.length > 0) {
      return serverGrowth.map(p => {
        const q = priceStore.getQuote(p.symbol);
        return {
          ...p,
          price: q?.price || p.price,
          changePercent: q?.changePercent ?? p.changePercent,
        };
      });
    }
    return GROWTH_STOCKS_PREVIEW.map(p => {
      const q = priceStore.getQuote(p.symbol);
      return { ...p, price: q?.price || 0, changePercent: q?.changePercent || 0 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceUpdateTrigger, serverGrowth]);

  // Live portfolio chart data - appends current live portfolio value to historical chart
  // This makes the chart follow real-time price changes
  const livePortfolioChartData = useMemo(() => {
    if (!portfolio.chartData || portfolio.chartData.length < 2) return portfolio.chartData;
    
    const currentLiveValue = livePortfolioData?.totalValue;
    if (!currentLiveValue || currentLiveValue <= 0) return portfolio.chartData;
    
    // Create a copy of the chart data
    const result = [...portfolio.chartData];
    const lastPoint = result[result.length - 1];
    
    // Update the last point with the current live portfolio value
    // This ensures the chart endpoint matches the displayed total value
    result[result.length - 1] = {
      ...lastPoint,
      value: currentLiveValue,
    };
    
    return result;
    // NOTE: deliberately NOT keyed on priceUpdateTrigger — recomputing (and
    // re-rendering the chart) every 100ms tick made range switching laggy.
    // totalValue only changes identity when the number actually moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio.chartData, livePortfolioData?.totalValue]);

  // Smooth once per data change, not on every render
  const smoothedPortfolioChartData = useMemo(
    () => (livePortfolioChartData && livePortfolioChartData.length > 1
      ? interpolateData(livePortfolioChartData, 80)
      : []),
    [livePortfolioChartData]
  );

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
  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/stock_news?limit=10&apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

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
              const res = await fetch(`https://www.wallstreetstocks.ai/api/stock-picks?list=${list}`, {
                headers: { 'x-user-id': userId, 'Cache-Control': 'no-cache' },
              });
              const data = await res.json().catch(() => null);
              return res.ok && Array.isArray(data?.picks) && data.picks.length > 0 ? data.picks : null;
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

    const newShares = parseFloat(editShares);
    const newAvgCost = parseFloat(editAvgCost);

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

  // Memoized filtered and sorted watchlist - uses live prices from WebSocket
  const filteredWatchlist = useMemo(() => {
    let filtered = [...liveWatchlistData];

    // Apply filter
    if (watchlistFilter === 'Gainers') {
      filtered = filtered.filter(stock => (stock.changePercent || 0) >= 0);
    } else if (watchlistFilter === 'Losers') {
      filtered = filtered.filter(stock => (stock.changePercent || 0) < 0);
    }

    // Apply sort
    switch (watchlistSort) {
      case 'Name':
        filtered.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
        break;
      case 'Price':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'Change %':
        filtered.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
        break;
      case 'Change $':
        filtered.sort((a, b) => (b.change || 0) - (a.change || 0));
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
        <ScalePress style={styles.fab} activeScale={0.88} onPress={() => setAddStockModal(true)}>
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
          >
            <Ionicons name="person" size={19} color={colors.primary} />
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

          <TouchableOpacity onPress={() => router.push('/notifications' as any)} style={styles.messagesIconContainer}>
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
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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
        <View style={[styles.portfolioSection, { backgroundColor: isDark ? colors.card : '#F5F5F7' }]}>
          <LinearGradient
            colors={isDark
              ? ['rgba(255,214,10,0.10)', 'rgba(255,214,10,0)']
              : ['rgba(184,134,11,0.08)', 'rgba(184,134,11,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 0.9 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
            pointerEvents="none"
          />
          <View style={styles.portfolioTopRow}>
            <View style={styles.portfolioSelectorContainer}>
              <TouchableOpacity
                style={[styles.portfolioDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowPortfolioDropdown(!showPortfolioDropdown)}
              >
                <Text style={styles.portfolioDropdownText} numberOfLines={1}>
                  {currentPortfolio?.name || t('Select Portfolio')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.primary} />
              </TouchableOpacity>
              <LastUpdated timestamp={Date.now() - (priceUpdateTrigger % 10) * 100} prefix="" style={{ marginTop: 4 }} />

              {/* Portfolio Dropdown Menu */}
              {showPortfolioDropdown && (
                <View style={[styles.portfolioDropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                  <View style={[styles.portfolioDropdownDivider, { backgroundColor: colors.border }]} />
                  <TouchableOpacity
                    style={styles.portfolioDropdownItem}
                    onPress={() => {
                      setShowPortfolioDropdown(false);
                      setShowCreatePortfolioModal(true);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    <Text style={styles.portfolioDropdownAddText}>{t('Create New Portfolio')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.portfolioActions}>
              <TouchableOpacity
                style={[styles.portfolioOptionsButton, { backgroundColor: colors.surface }]}
                onPress={() => {
                  setEditingPortfolioName(currentPortfolio?.name || '');
                  setShowPortfolioOptionsModal(true);
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addIconButton}
                onPress={() => setAddStockModal(true)}
              >
                <Ionicons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.portfolioValueSection}>
            <Text style={[styles.portfolioValue, { color: colors.text }]}>
              ${(livePortfolioData?.totalValue || contextCurrentPortfolio?.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            {(() => {
              const gain = livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0;
              const gainPct = livePortfolioData?.totalGainPercent ?? contextCurrentPortfolio?.totalGainPercent ?? 0;
              const up = gain >= 0;
              const tone = up ? '#00C853' : '#FF3B30';
              return (
                <View style={[styles.portfolioChangePill, { backgroundColor: up ? 'rgba(0,200,83,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                  <Ionicons name={up ? 'trending-up' : 'trending-down'} size={16} color={tone} />
                  <Text style={[styles.portfolioChange, { color: tone }]}>
                    {up ? '+' : ''}${Math.abs(gain).toFixed(2)} ({up ? '+' : ''}{gainPct.toFixed(2)}%)
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* Portfolio Chart */}
          {smoothedPortfolioChartData.length > 1 && (() => {
            const smoothedChartData = smoothedPortfolioChartData;
            const chartSpacing = Math.max(2, portfolioChartBleedWidth / smoothedChartData.length);

            return (
            <View style={styles.portfolioChartContainer}>
              <View style={styles.portfolioChartBleed}>
              <GiftedLineChart
                areaChart
                data={smoothedChartData}
                height={220}
                width={portfolioChartBleedWidth}
                curved
                curvature={0.2}
                curveType={1}
                startFillColor={(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444'}
                startOpacity={isDark ? 0.35 : 0.25}
                endFillColor={(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B98100' : '#EF444400'}
                endOpacity={0}
                color={(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444'}
                thickness={2.5}
                hideDataPoints
                hideAxesAndRules
                hideYAxisText
                yAxisLabelWidth={0}
                xAxisLabelsHeight={0}
                yAxisLabelPrefix="$"
                backgroundColor="transparent"
                spacing={chartSpacing}
                initialSpacing={0}
                endSpacing={0}
                adjustToWidth
                disableScroll
                pointerConfig={{
                  pointerStripHeight: 220,
                  pointerStripColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(142, 142, 147, 0.3)',
                  pointerStripWidth: 1,
                  strokeDashArray: [4, 4],
                  pointerColor: (livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444',
                  radius: 5,
                  pointerLabelWidth: 120,
                  pointerLabelHeight: 50,
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: (items: any) => {
                    if (!items?.[0]) return null;
                    const value = items[0].value;
                    return (
                      <View style={[styles.portfolioTooltip, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#E5E5EA' }]}>
                        <Text style={[styles.portfolioTooltipValue, { color: colors.text }]}>
                          ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                    );
                  },
                }}
                animateOnDataChange={false}
              />
              </View>

              {/* Time Range Selector */}
              <View style={[styles.timeRangeSelectorContainer, { marginTop: 16 }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timeRangeScrollContent}
                >
                  {['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'ALL'].map((range) => {
                    const isActive = portfolioTimeRange === range;
                    const gainColor = (livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444';
                    return (
                    <TouchableOpacity
                      key={range}
                      style={[
                        styles.timeRangeButton,
                        isActive && { backgroundColor: isDark ? `${gainColor}22` : `${gainColor}18` }
                      ]}
                      onPress={() => setPortfolioTimeRange(range)}
                    >
                      <Text style={[
                        styles.timeRangeText,
                        { color: isDark ? '#8E8E93' : '#666' },
                        isActive && { color: gainColor, fontWeight: '800' }
                      ]}>
                        {range}
                      </Text>
                    </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={styles.expandButton}>
                  <Ionicons name="expand-outline" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
            );
          })()}

          {/* Holdings List */}
          {(livePortfolioData?.holdings || contextCurrentPortfolio?.holdings || []).length > 0 && (
            <View style={[styles.holdingsList, { borderTopColor: colors.borderLight }]}>
              <View style={styles.holdingsTitleRow}>
                <Text style={[styles.holdingsTitle, { color: '#B8860B' }]}>{t('Holdings')}</Text>
                <TouchableOpacity
                  style={styles.addHoldingButton}
                  onPress={() => setAddStockModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {(livePortfolioData?.holdings || contextCurrentPortfolio?.holdings || []).map((holding: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.holdingRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => handleHoldingPress(holding)}
                >
                  <View style={styles.holdingLeft}>
                    <StockLogo 
                      symbol={holding.symbol} 
                      size={Platform.OS === 'android' ? 32 : 40} 
                      style={styles.holdingLogo}
                    />
                    <View>
                      <Text style={[styles.holdingSymbol, { color: colors.text }]}>{formatSymbolDisplay(holding.symbol)}</Text>
                      <Text style={[styles.holdingShares, { color: colors.textTertiary }]}>
                        {holding.shares} shares • ${(holding.avgCost || 0).toFixed(2)} avg
                      </Text>
                    </View>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={[styles.holdingValue, { color: colors.text }]}>
                      ${(holding.currentValue || 0).toFixed(2)}
                    </Text>
                    <Text style={[styles.holdingGain, { color: (holding.gain || 0) >= 0 ? "#34C759" : "#FF3B30" }]}>
                      {(holding.gain || 0) >= 0 ? '+' : ''}${Math.abs(holding.gain || 0).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {(!contextCurrentPortfolio || contextCurrentPortfolio.holdings.length === 0) && (
            <View style={styles.emptyPortfolio}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="pie-chart-outline" size={48} color={colors.primary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>{t('Start Building Your Portfolio')}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{t('Tap the + button to add your first stock')}</Text>
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
                style={[styles.analyticsPreviewCard, { backgroundColor: isDark ? colors.card : '#F5F5F7', borderWidth: isDark ? 1 : 0, borderColor: isDark ? '#333' : 'transparent' }]}
                onPress={() => router.push('/portfolio/analytics')}
                activeOpacity={0.7}
              >
                <View style={styles.analyticsPreviewHeader}>
                  <View style={styles.analyticsPreviewIconContainer}>
                    <Ionicons name="analytics" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.analyticsPreviewTitleContainer}>
                    <Text style={[styles.analyticsPreviewTitle, { color: colors.text }]}>{t('Portfolio Analytics')}</Text>
                    <Text style={[styles.analyticsPreviewSubtitle, { color: colors.textTertiary }]}>{t('View detailed insights')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </View>
                <View style={[styles.analyticsPreviewStats, { backgroundColor: isDark ? colors.surface : '#EDEDF0' }]}>
                  <View style={styles.analyticsPreviewStat}>
                    <Text style={[styles.analyticsPreviewStatLabel, { color: colors.textTertiary }]}>{t('Total P&L')}</Text>
                    <Text style={[styles.analyticsPreviewStatValue, { color: totalGain >= 0 ? '#34C759' : '#FF3B30' }]}>
                      {totalGain >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
                    </Text>
                  </View>
                  <View style={styles.analyticsPreviewDivider} />
                  <View style={styles.analyticsPreviewStat}>
                    <Text style={[styles.analyticsPreviewStatLabel, { color: colors.textTertiary }]}>{t('Diversification')}</Text>
                    <Text style={[styles.analyticsPreviewStatValue, {
                      color: diversificationScore >= 70 ? '#34C759' : diversificationScore >= 40 ? '#FF9500' : '#FF3B30'
                    }]}>
                      {diversificationScore}/100
                    </Text>
                  </View>
                  <View style={styles.analyticsPreviewDivider} />
                  <View style={styles.analyticsPreviewStat}>
                    <Text style={[styles.analyticsPreviewStatLabel, { color: colors.textTertiary }]}>{t('Holdings')}</Text>
                    <Text style={styles.analyticsPreviewStatValue}>{holdings.length}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* Live Major Indices - Horizontal Scrollable */}
        <View style={styles.indicesSection}>
          <FadeSlideIn distance={10}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Market Overview')}</Text>
                <CryptoLiveIndicator />
              </View>
              <LastUpdated timestamp={Date.now() - (priceUpdateTrigger % 10) * 100} prefix="" style={{ marginTop: 4 }} />
            </View>
          </FadeSlideIn>

          {indicesLoading ? (
            <HomeIndicesSkeleton isDark={isDark} cardColor={isDark ? colors.card : '#F5F5F7'} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.indicesScrollContent}
            >
              {liveMarketIndices.filter((index) => index.price > 0).map((index) => (
                <ScalePress
                  key={index.symbol}
                  style={[styles.indexCard, { backgroundColor: isDark ? colors.card : '#F5F5F7' }]}
                  activeScale={0.94}
                  onPress={() => router.push(`/symbol/${encodeURIComponent(index.symbol)}/chart`)}
                >
                  <View style={styles.indexCardHeader}>
                    <StockLogo
                      symbol={index.symbol}
                      size={Platform.OS === 'android' ? 20 : 24}
                      style={{ marginRight: Platform.OS === 'android' ? 5 : 6 }}
                    />
                    <Text style={[styles.indexSymbol, { color: colors.text }]}>{index.symbol.replace('/USD', '')}</Text>
                  </View>
                  <Text style={[styles.indexName, { color: colors.textTertiary }]} numberOfLines={1}>{index.name}</Text>
                  <AnimatedPrice
                    value={index.price}
                    prefix="$"
                    decimals={index.price >= 1000 ? 0 : index.price >= 100 ? 1 : 2}
                    style={{ ...styles.indexPrice, color: colors.text }}
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
                </ScalePress>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Watchlist Section */}
        <View style={[styles.watchlistSection, { backgroundColor: isDark ? colors.card : '#F5F5F7' }]}>
          <View style={styles.watchlistHeader}>
            <View style={styles.watchlistHeaderLeft}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Watchlist')}</Text>
                <TouchableOpacity
                  style={styles.addWatchlistButtonHeader}
                  onPress={() => setWatchlistModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <LastUpdated timestamp={Date.now() - (priceUpdateTrigger % 10) * 100} prefix="" style={{ marginTop: 2 }} />
            </View>
            <View style={styles.watchlistHeaderRight}>
              {/* Filter Dropdown */}
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={[styles.filterButton, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setShowFilterDropdown(!showFilterDropdown);
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={[styles.filterButtonText, { color: colors.text }]}>{t(watchlistFilter)}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
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
                          {t(option)}
                        </Text>
                        {watchlistFilter === option && (
                          <Ionicons name="checkmark" size={16} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Sort Dropdown */}
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={[styles.filterButton, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterDropdown(false);
                  }}
                >
                  <Text style={[styles.filterButtonText, { color: colors.text }]}>{t(watchlistSort)}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
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
                          {t(option)}
                        </Text>
                        {watchlistSort === option && (
                          <Ionicons name="checkmark" size={16} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {watchlistDataLoading ? (
            <HomeWatchlistSkeleton isDark={isDark} />
          ) : liveWatchlistData.length === 0 ? (
            <View style={styles.emptyWatchlist}>
              <View style={styles.emptyWatchlistIconContainer}>
                <Ionicons name="star-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyWatchlistText, { color: colors.text }]}>{t('Your watchlist is empty')}</Text>
              <Text style={[styles.emptyWatchlistSubtext, { color: colors.textTertiary }]}>{t('Add stocks to track their performance')}</Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => setWatchlistModal(true)}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addFirstButtonText}>{t('Add Stock')}</Text>
              </TouchableOpacity>
            </View>
          ) : filteredWatchlist.length === 0 ? (
            <View style={styles.emptyWatchlist}>
              <Text style={[styles.emptyWatchlistText, { color: colors.text }]}>No {watchlistFilter.toLowerCase()} found</Text>
              <Text style={[styles.emptyWatchlistSubtext, { color: colors.textTertiary }]}>{t('Try changing your filter')}</Text>
            </View>
          ) : (
            <View style={styles.watchlistList}>
              {filteredWatchlist.map((stock, idx) => {
                // Real intraday data drawn in true proportion; a flat line
                // (not a fabricated wiggle) when no data is available yet
                const chartData = stock.data?.length > 1
                  ? stock.data
                  : [stock.price || 1, stock.price || 1];

                return (
                <FadeSlideIn key={stock.symbol} delay={Math.min(idx, 8) * 40} distance={8}>
                <Swipeable
                  overshootRight={false}
                  renderRightActions={() => (
                    <TouchableOpacity
                      style={styles.watchlistDeleteAction}
                      onPress={() => handleRemoveFromWatchlist(stock.symbol)}
                    >
                      <Ionicons name="trash" size={18} color="#fff" />
                      <Text style={styles.watchlistDeleteText}>{t('Remove')}</Text>
                    </TouchableOpacity>
                  )}
                >
                <ScalePress
                  style={[styles.watchlistRow, { borderBottomColor: colors.borderLight, backgroundColor: isDark ? colors.card : '#F5F5F7' }]}
                  activeScale={0.98}
                  onPress={() => {
                    trackAction(); // Track stock view for app review
                    router.push(`/symbol/${encodeURIComponent(stock.symbol)}/chart`);
                  }}
                  onLongPress={() => handleRemoveFromWatchlist(stock.symbol)}
                >
                  <View style={styles.watchlistRowLeft}>
                    <StockLogo 
                      symbol={stock.symbol} 
                      size={Platform.OS === 'android' ? 26 : 34} 
                      style={styles.watchlistLogo}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.watchlistRowSymbol, { color: colors.text }]} numberOfLines={1}>{formatSymbolDisplay(stock.symbol)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.watchlistRowCenter}>
                    <Sparkline
                      data={chartData}
                      color={stock.color}
                      width={Platform.OS === 'android' ? 55 : 85}
                      height={Platform.OS === 'android' ? 28 : 36}
                      strokeWidth={1.5}
                      fillOpacity={0.2}
                    />
                  </View>
                  
                  <View style={styles.watchlistRowRight}>
                    <AnimatedPrice
                      value={stock.price}
                      style={{ ...styles.watchlistRowPrice, color: colors.text }}
                      flashOnChange={true}
                      decimals={2}
                    />
                    <View style={styles.watchlistRowChangeContainer}>
                      <Ionicons
                        name={(stock.changePercent || 0) >= 0 ? 'arrow-up' : 'arrow-down'} 
                        size={12} 
                        color={stock.color} 
                      />
                      <Text style={[styles.watchlistRowChange, { color: stock.color }]}>
                        ${Math.abs(stock.change || 0).toFixed(2)} ({Math.abs(stock.changePercent || 0).toFixed(2)}%)
                      </Text>
                    </View>
                  </View>
                </ScalePress>
                </Swipeable>
                </FadeSlideIn>
                );
              })}
            </View>
          )}
        </View>

        {/* Picks Carousel: Stock Picks / Momentum / Growth */}
        <View style={styles.stockPicksSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToOffsets={[0, pickCardSnap, pickCardSnap * 2]}
            decelerationRate="fast"
            disableIntervalMomentum
            onMomentumScrollEnd={(e) =>
              setPicksPage(Math.min(2, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / pickCardSnap))))
            }
            style={styles.picksCarousel}
            contentContainerStyle={styles.picksCarouselContent}
          >
          <ScalePress
            style={[styles.stockPicksCard, { width: pickCardWidth, marginRight: 12, backgroundColor: isDark ? colors.surface : '#F5F5F7', borderColor: isDark ? colors.border : '#FFD70030', shadowOpacity: isDark ? 0 : 0.08, elevation: isDark ? 0 : 3 }]}
            activeScale={0.98}
            onPress={() => router.push('/premium/stock-picks')}
          >
            {/* Header */}
            <View style={styles.stockPicksHeader}>
              <View style={styles.stockPicksHeaderLeft}>
                <View style={[styles.stockPicksIconBg, { backgroundColor: isDark ? "rgba(255,215,0,0.15)" : "#FFF8E1" }]}>
                  <Ionicons name="trophy" size={20} color="#FFD700" />
                </View>
                <View>
                  <Text style={[styles.stockPicksTitle, { color: colors.text }]}>{t('Stock Picks')}</Text>
                  <Text style={[styles.stockPicksSubtitle, { color: colors.textTertiary }]}>
                    {isPremium
                      ? `${currentTier === 'gold' ? '5' : currentTier === 'platinum' ? '8' : '15'} expert picks`
                      : t('Expert curated selections')}
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
                    <Text style={styles.premiumBadgeText}>{t('Premium')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Preview Cards */}
            <View style={styles.stockPicksPreview}>
              {(liveStockPicks.length > 0 ? liveStockPicks : STOCK_PICKS_PREVIEW).map((pick, idx) => (
                <View key={idx} style={[styles.pickPreviewCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EDEDF0' }]}>
                  <View style={styles.pickPreviewLeft}>
                    <View style={[styles.pickRankBadge, {
                      backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32'
                    }]}>
                      <Text style={styles.pickRankText}>#{idx + 1}</Text>
                    </View>
                    <View>
                      {isPremium ? (
                        <>
                          <Text style={[styles.pickSymbol, { color: colors.text }]}>{pick.symbol}</Text>
                          <Text style={[styles.pickCategory, { color: colors.textSecondary }]}>{t(pick.category)}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.pickSymbol, { color: colors.textTertiary, letterSpacing: 2 }]}>•••••</Text>
                          <Text style={[styles.pickCategory, { color: colors.textTertiary }]}>{t('Unlock to reveal')}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.pickPreviewRight}>
                    {isPremium && liveStockPicks.length > 0 ? (
                      <>
                        <Text style={[styles.pickPrice, { color: colors.text }]}>${pick.price?.toFixed(2)}</Text>
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
                        <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* CTA */}
            <View style={[styles.stockPicksCTA, { borderTopColor: isDark ? colors.border : "#F2F2F7" }]}>
              <Text style={[styles.stockPicksCTAText, { color: colors.primary }]}>
                {isPremium ? t('View All Picks') : t('Unlock Stock Picks')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </View>
          </ScalePress>

          {/* Momentum + Growth cards (same layout; ungated for now) */}
          {([
            {
              key: 'momentum',
              title: 'Momentum Stocks',
              subtitle: "Today's strongest movers",
              icon: 'flash' as const,
              iconColor: '#FF9500',
              iconBg: isDark ? 'rgba(255,149,0,0.15)' : '#FFF3E0',
              badgeLabel: 'Live',
              badgeColor: '#00C853',
              data: liveMomentumStocks,
              cta: 'View All Momentum',
              route: '/premium/stock-picks?list=momentum',
            },
            {
              key: 'growth',
              title: 'Growth Stocks',
              subtitle: 'High-growth compounders',
              icon: 'rocket' as const,
              iconColor: '#00C853',
              iconBg: isDark ? 'rgba(0,200,83,0.15)' : '#E8F5E9',
              badgeLabel: 'Curated',
              badgeColor: isDark ? '#FFD60A' : '#B8860B',
              data: liveGrowthStocks,
              cta: 'View All Growth',
              route: '/premium/stock-picks?list=growth',
            },
          ]).map((card, cardIdx) => (
            <ScalePress
              key={card.key}
              style={[styles.stockPicksCard, {
                width: pickCardWidth,
                marginRight: cardIdx === 0 ? 12 : 0,
                backgroundColor: isDark ? colors.surface : '#F5F5F7',
                borderColor: isDark ? colors.border : '#FFD70030',
                shadowOpacity: isDark ? 0 : 0.08,
                elevation: isDark ? 0 : 3,
              }]}
              activeScale={0.98}
              onPress={() => router.push((isPremium ? card.route : '/(modals)/paywall') as any)}
            >
              {/* Header */}
              <View style={styles.stockPicksHeader}>
                <View style={styles.stockPicksHeaderLeft}>
                  <View style={[styles.stockPicksIconBg, { backgroundColor: card.iconBg }]}>
                    <Ionicons name={card.icon} size={20} color={card.iconColor} />
                  </View>
                  <View>
                    <Text style={[styles.stockPicksTitle, { color: colors.text }]}>{t(card.title)}</Text>
                    <Text style={[styles.stockPicksSubtitle, { color: colors.textTertiary }]}>{t(card.subtitle)}</Text>
                  </View>
                </View>
                {isPremium ? (
                  <View style={[styles.picksLiveBadge, { backgroundColor: `${card.badgeColor}1A` }]}>
                    {card.key === 'momentum' && <View style={[styles.picksLiveDot, { backgroundColor: card.badgeColor }]} />}
                    <Text style={[styles.picksLiveBadgeText, { color: card.badgeColor }]}>{t(card.badgeLabel)}</Text>
                  </View>
                ) : (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="lock-closed" size={12} color="#FFD700" />
                    <Text style={styles.premiumBadgeText}>{t('Premium')}</Text>
                  </View>
                )}
              </View>

              {/* Preview Rows */}
              <View style={styles.stockPicksPreview}>
                {card.data.map((pick, idx) => (
                  <View key={`${card.key}-${pick.symbol}-${idx}`} style={[styles.pickPreviewCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EDEDF0' }]}>
                    <View style={[styles.pickPreviewLeft, { flex: 1, marginRight: 8 }]}>
                      <View style={[styles.pickRankBadge, {
                        backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32'
                      }]}>
                        <Text style={styles.pickRankText}>#{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        {isPremium ? (
                          <>
                            <Text style={[styles.pickSymbol, { color: colors.text }]}>{pick.symbol}</Text>
                            <Text style={[styles.pickCategory, { color: colors.textSecondary }]} numberOfLines={1}>
                              {t(pick.category)}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text style={[styles.pickSymbol, { color: colors.textTertiary, letterSpacing: 2 }]}>•••••</Text>
                            <Text style={[styles.pickCategory, { color: colors.textTertiary }]}>{t('Unlock to reveal')}</Text>
                          </>
                        )}
                      </View>
                    </View>
                    <View style={[styles.pickPreviewRight, { flexShrink: 0 }]}>
                      {isPremium ? (
                        <>
                          <Text style={[styles.pickPrice, { color: colors.text }]}>
                            ${(pick.price || 0).toFixed(2)}
                          </Text>
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
                          <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* CTA */}
              <View style={[styles.stockPicksCTA, { borderTopColor: isDark ? colors.border : "#F2F2F7" }]}>
                <Text style={[styles.stockPicksCTAText, { color: colors.primary }]}>
                  {isPremium ? t(card.cta) : `Unlock ${card.title}`}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </View>
            </ScalePress>
          ))}
          </ScrollView>

          {/* Page dots */}
          <View style={styles.picksPageDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.picksPageDot,
                  { backgroundColor: picksPage === i ? colors.primary : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)') },
                  picksPage === i && styles.picksPageDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Strategy Discovery Cards */}
        <View style={styles.strategiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Strategies')}</Text>
            <TouchableOpacity onPress={() => router.push('/screener' as any)}>
              <Text style={[styles.strategiesSeeAll, { color: colors.primary }]}>{t('Open Screener')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strategiesScrollContent}
          >
            {STRATEGY_CARDS.map((strategy, idx) => (
              <FadeSlideIn key={strategy.id} delay={Math.min(idx, 6) * 50} distance={10}>
                <ScalePress
                  activeScale={0.93}
                  onPress={() => router.push(`/screener?preset=${strategy.id}` as any)}
                >
                  <LinearGradient
                    colors={strategy.gradient as unknown as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.strategyCard}
                  >
                    {strategy.isPremium && (
                      <View style={styles.strategyProBadge}>
                        <Ionicons name="lock-closed" size={8} color="#fff" />
                        <Text style={styles.strategyProText}>{t('PRO')}</Text>
                      </View>
                    )}
                    <View style={styles.strategyIconCircle}>
                      <Ionicons name={strategy.icon as any} size={20} color="#fff" />
                    </View>
                    <Text style={styles.strategyName}>{t(strategy.name)}</Text>
                    <Text style={styles.strategyDesc} numberOfLines={2}>{t(strategy.description)}</Text>
                    <View style={styles.strategyExploreRow}>
                      <Text style={styles.strategyExploreText}>{t('Explore')}</Text>
                      <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.9)" />
                    </View>
                  </LinearGradient>
                </ScalePress>
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
              <TouchableOpacity onPress={() => {
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
                    <TouchableOpacity onPress={() => {
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
              <TouchableOpacity onPress={() => {
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
                    <TouchableOpacity onPress={() => {
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
              <TouchableOpacity onPress={handleCloseEditModal}>
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
                  placeholder="Portfolio name"
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
              <TouchableOpacity onPress={() => setShowPortfolioOptionsModal(false)}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.portfolioOptionsSection}>
              <Text style={[styles.portfolioOptionsLabel, { color: colors.textTertiary }]}>Portfolio Name</Text>
              <TextInput
                style={[styles.portfolioOptionsInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={editingPortfolioName}
                onChangeText={setEditingPortfolioName}
                placeholder="Enter name"
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

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F7' 
  },
  scrollView: { flex: 1 },
  content: { paddingBottom: 20 },
  
  // FAB
  fabWrapper: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 110 : 90,
    zIndex: 10,
  },
  fab: {
    backgroundColor: '#B8860B',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B8860B',
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
    backgroundColor: '#F6EEDA',
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: Platform.OS === 'android' ? 12 : 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F7'
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: Platform.OS === 'android' ? 12 : 16,
  },
  greetingText: {
    fontSize: Platform.OS === 'android' ? 20 : 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    includeFontPadding: false,
  },
  greetingDate: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
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
    color: '#B8860B',
    fontWeight: '600',
    backgroundColor: '#B8860B15',
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
    fontSize: Platform.OS === 'android' ? 17 : 18,
    fontWeight: '800',
    letterSpacing: -0.3,
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
    paddingLeft: 16,
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
    borderRadius: 16,
    padding: Platform.OS === 'android' ? 9 : 11,
    marginRight: Platform.OS === 'android' ? 8 : 10,
    width: Platform.OS === 'android' ? 108 : 124,
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
    fontSize: Platform.OS === 'android' ? 11 : 13,
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
    fontSize: Platform.OS === 'android' ? 13 : 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: Platform.OS === 'android' ? 5 : 6,
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
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'android' ? 16 : 24,
    borderRadius: 18,
    padding: 16,
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
    color: '#B8860B',
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
    backgroundColor: '#B8860B10',
  },
  portfolioDropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#B8860B',
    flex: 1,
    marginRight: 8,
  },
  portfolioDropdownItemTextActive: {
    color: '#B8860B',
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
    color: '#B8860B',
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
    backgroundColor: '#B8860B15',
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
    fontSize: Platform.OS === 'android' ? 14 : 17,
    fontWeight: '700',
    includeFontPadding: false,
  },
  portfolioChangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  
  // Chart
  portfolioChartContainer: {
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  // Chart escapes the card padding so the line runs edge-to-edge
  portfolioChartBleed: {
    marginHorizontal: -16,
  },
  portfolioTooltip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  portfolioTooltipLabel: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  portfolioTooltipValue: {
    fontSize: 15,
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
    marginTop: 16,
    justifyContent: 'space-between',
  },
  timeRangeScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  timeRangeButton: {
    paddingVertical: Platform.OS === 'android' ? 6 : 7,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 13,
    borderRadius: 14,
  },
  timeRangeButtonActive: {
  },
  timeRangeText: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: '600',
    includeFontPadding: false,
  },
  timeRangeTextActive: {
    fontWeight: '700',
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
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
    backgroundColor: '#B8860B15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'android' ? 8 : 12,
  },
  holdingIcon: {
    fontSize: Platform.OS === 'android' ? 12 : 16,
    fontWeight: '700',
    color: '#B8860B',
    includeFontPadding: false,
  },
  holdingLogo: {
    marginRight: Platform.OS === 'android' ? 8 : 12,
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
    backgroundColor: '#B8860B10',
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
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'android' ? 16 : 24,
    borderRadius: 18,
    padding: 16,
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
    backgroundColor: '#B8860B10',
  },
  dropdownItemText: {
    fontSize: Platform.OS === 'android' ? 11 : 14,
    color: '#000',
    fontWeight: '500',
    includeFontPadding: false,
  },
  dropdownItemTextActive: {
    color: '#B8860B',
    fontWeight: '600',
  },
  addWatchlistButton: {
    padding: 4,
  },
  watchlistList: {
    marginTop: 8,
  },
  watchlistDeleteAction: {
    width: 84,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    marginLeft: 8,
    gap: 3,
  },
  watchlistDeleteText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    width: Platform.OS === 'android' ? 100 : undefined,
    minWidth: Platform.OS === 'android' ? undefined : 140,
  },
  watchlistLogo: {
    marginRight: Platform.OS === 'android' ? 6 : 8,
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
    width: Platform.OS === 'android' ? 55 : 85,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginHorizontal: Platform.OS === 'android' ? 6 : 8,
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
    backgroundColor: '#B8860B10',
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
    backgroundColor: '#B8860B',
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
  
  // News
  newsSection: {
    paddingHorizontal: 16,
    marginBottom: Platform.OS === 'android' ? 16 : 24,
  },
  newsLoadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsContainer: {
    gap: Platform.OS === 'android' ? 8 : 10,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Platform.OS === 'android' ? 12 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  newsContent: {
    flex: 1,
    marginRight: 10,
  },
  newsThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.1)',
  },
  newsSourceChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    maxWidth: 140,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  newsSymbolBadge: {
    backgroundColor: '#B8860B15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  newsSymbolText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B8860B',
  },
  newsSource: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  newsDot: {
    fontSize: 12,
    color: '#C7C7CC',
    marginHorizontal: 4,
  },
  newsTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  newsTitle: {
    fontSize: Platform.OS === 'android' ? 14 : 15,
    fontWeight: '600',
    color: '#000',
    lineHeight: Platform.OS === 'android' ? 20 : 21,
  },
  newsEmptyContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsEmptyText: {
    fontSize: 14,
    color: '#8E8E93',
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
    backgroundColor: '#B8860B',
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
    backgroundColor: '#B8860B15',
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
    paddingHorizontal: 16,
    marginBottom: Platform.OS === 'android' ? 16 : 24,
  },
  // Picks carousel (Stock Picks / Momentum / Growth)
  picksCarousel: {
    marginHorizontal: -16,
  },
  picksCarouselContent: {
    paddingHorizontal: 16,
  },
  picksLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  picksLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  picksLiveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  picksPageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  picksPageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  picksPageDotActive: {
    width: 18,
  },
  // Strategy discovery cards
  strategiesSection: {
    paddingHorizontal: 16,
    marginBottom: Platform.OS === 'android' ? 16 : 24,
  },
  strategiesSeeAll: {
    fontSize: 14,
    fontWeight: '700',
  },
  strategiesScrollContent: {
    paddingRight: 20,
    paddingVertical: 4,
  },
  strategyCard: {
    width: 148,
    borderRadius: 18,
    padding: 14,
    marginRight: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  strategyProBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  strategyProText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  strategyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  strategyName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  strategyDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  strategyExploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  strategyExploreText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '700',
  },
  stockPicksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
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
    color: '#B8860B',
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
    backgroundColor: '#B8860B15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  holdingOptionsIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B8860B',
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
    gap: 10,
    marginBottom: 16,
  },
  holdingOptionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  holdingOptionIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  holdingOptionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  holdingOptionsCancelButton: {
    backgroundColor: '#F5F5F7',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  holdingOptionsCancelText: {
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: '#B8860B15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  editHoldingIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B8860B',
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
    backgroundColor: '#B8860B15',
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
    color: '#B8860B',
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
    backgroundColor: '#B8860B',
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
    backgroundColor: '#B8860B',
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
