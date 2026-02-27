// app/(tabs)/trending.tsx - WITH AUTO-SCROLLING HEADER CARDS + TAB ICONS
import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { FLATLIST_PERFORMANCE_PROPS } from "@/components/OptimizedListItems";
import { fetchWithTimeout } from "@/utils/performance";
import { AnimatedPrice, AnimatedChange, MarketTimeLabel } from "@/components/AnimatedPrice";
import { fetchSparklines } from "@/services/sparklineService";
import { priceStore } from "@/stores/priceStore";
import { InlineAdBanner } from "@/components/AdBanner";
import { useWebSocket } from "@/context/WebSocketContext";
import { marketDataService } from "@/services/marketDataService";
import StockLogo from "@/components/StockLogo";
import { useTheme } from "@/context/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2.2;
const STOCK_ROW_HEIGHT = 76; // Fixed row height for getItemLayout optimization

// ============================================================================
// CONSTANTS - Moved outside component for performance
// ============================================================================

// Map tab to WebSocket symbols for INSTANT subscription
const TAB_WS_SYMBOLS: Record<string, string[]> = {};

// WebSocket handles all real-time prices - no API polling needed

// getItemLayout for FlatList optimization (enables instant scroll-to-index)
const getStockRowLayout = (_data: any, index: number) => ({
  length: STOCK_ROW_HEIGHT,
  offset: STOCK_ROW_HEIGHT * index,
  index,
});

type TabType = "trending" | "gainers" | "losers" | "indices" | "forex";

interface StockItem {
  symbol: string;
  companyName: string;
  name?: string;
  changesPercentage: string | number;
  price?: number;
  change?: number;
}

interface ChipData {
  name: string;
  symbol: string;
  value: string;
  change: string;
  isPositive: boolean;
  sparklineData: number[];
}

// Tab configuration with icons
const TAB_CONFIG: { id: TabType; label: string; icon: string }[] = [
  { id: "trending", label: "Hot", icon: "flame" },
  { id: "gainers", label: "Gainers", icon: "trending-up" },
  { id: "losers", label: "Losers", icon: "trending-down" },
  { id: "indices", label: "Indices", icon: "stats-chart" },
  { id: "forex", label: "Forex", icon: "swap-horizontal" },
];

// Mini Sparkline Component - Memoized for performance
const MiniSparkline = memo(({
  data,
  isPositive,
  width = 60,
  height = 30
}: {
  data: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
}) => {
  if (!data || data.length < 2) {
    data = isPositive 
      ? [40, 42, 38, 45, 43, 48, 46, 52, 50, 55]
      : [55, 52, 54, 48, 50, 45, 47, 42, 44, 40];
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    pathD += ` Q ${prev.x + (midX - prev.x) * 0.5} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
    pathD += ` Q ${midX + (curr.x - midX) * 0.5} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaPath = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const color = isPositive ? "#00C853" : "#FF1744";
  const gradientId = `gradient-${isPositive ? 'green' : 'red'}-${Math.random().toString(36).slice(2, 11)}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#${gradientId})`} />
      <Path
        d={pathD}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
});

MiniSparkline.displayName = 'MiniSparkline';

// Header Card Component - Memoized for performance
const HeaderCard = memo(({
  item,
  onPress,
}: {
  item: ChipData;
  onPress: () => void;
}) => {
  const { colors, isDark } = useTheme();
  const priceValue = item.value !== "..." ? Number(item.value) : 0;
  const changeValue = parseFloat(item.change) || 0;

  return (
    <TouchableOpacity
      style={[
        styles.headerCard,
        { borderColor: item.isPositive ? (isDark ? 'rgba(0,200,83,0.3)' : '#bbf7d0') : (isDark ? 'rgba(255,23,68,0.3)' : '#fecaca'), backgroundColor: item.isPositive ? (isDark ? 'rgba(0,200,83,0.1)' : '#f0fdf4') : (isDark ? 'rgba(255,23,68,0.1)' : '#fef2f2') }
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.headerCardTop}>
        <View style={styles.headerCardInfo}>
          <Text style={[styles.headerCardSymbol, { color: colors.textSecondary }]}>{item.name}</Text>
          {item.value !== "..." ? (
            <AnimatedPrice
              value={priceValue}
              style={[styles.headerCardPrice, { color: colors.text }]}
              flashOnChange={true}
              decimals={2}
            />
          ) : (
            <Text style={[styles.headerCardPrice, { color: colors.text }]}>$...</Text>
          )}
        </View>
        <View style={styles.headerCardSparkline}>
          <MiniSparkline
            data={item.sparklineData}
            isPositive={item.isPositive}
            width={40}
            height={22}
          />
        </View>
      </View>
      <View style={[
        styles.headerCardChangeBadge,
        item.isPositive ? styles.headerCardChangeBadgePositive : styles.headerCardChangeBadgeNegative
      ]}>
        <Ionicons
          name={item.isPositive ? "trending-up" : "trending-down"}
          size={10}
          color={item.isPositive ? "#00C853" : "#FF1744"}
        />
        <AnimatedChange
          value={changeValue}
          style={{
            ...styles.headerCardChangeText,
            color: item.isPositive ? "#00C853" : "#FF1744"
          }}
          showArrow={false}
          flashOnChange={true}
        />
      </View>
    </TouchableOpacity>
  );
});

HeaderCard.displayName = 'HeaderCard';

export default function Trending() {
  const { colors, isDark } = useTheme();
  const { initialTab } = useLocalSearchParams<{ initialTab?: string }>();
  const [activeTab, setActiveTab] = useState<TabType>((initialTab as TabType) || "trending");
  const [data, setData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerCards, setHeaderCards] = useState<ChipData[]>([]);
  const router = useRouter();
  
  // Animation for smooth tab transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  
  // Cleanup animations on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, [fadeAnim, slideAnim]);
  
  // Handle tab change with smooth animation
  const handleTabChange = useCallback((newTab: TabType) => {
    if (newTab === activeTab) return;
    
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Check if still mounted before continuing
      if (!isMountedRef.current) return;
      
      // Change tab
      setActiveTab(newTab);
      
      // Reset position and animate in
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [activeTab, fadeAnim, slideAnim]);


  // Cache for tab data to avoid re-fetching on tab switch
  const tabDataCache = useRef<Record<string, { data: StockItem[]; timestamp: number }>>({})

  // WebSocket for real-time forex/commodities prices
  const { subscribe: wsSubscribe, unsubscribe: wsUnsubscribe, isConnected: wsConnected } = useWebSocket();
  const wsSubscribedRef = useRef<string[]>([]);

  // Price update trigger for real-time updates
  const [priceUpdateTrigger, setPriceUpdateTrigger] = useState(0);

  const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
  const TWELVE_DATA_URL = "https://api.twelvedata.com";

  // Top stocks for market movers (used for trending/gainers/losers)
  const TOP_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B",
    "JPM", "V", "JNJ", "WMT", "PG", "MA", "UNH", "HD", "DIS", "PYPL",
    "BAC", "ADBE", "CRM", "NFLX", "INTC", "AMD", "CSCO", "PEP", "KO",
    "NKE", "MRK", "ABT", "TMO", "COST", "AVGO", "TXN", "QCOM", "LOW",
    "ORCL", "UPS", "MS", "GS", "IBM", "CAT", "GE", "BA", "MMM", "CVX",
    "XOM", "PFE", "ABBV", "LLY",
  ];

  const HEADER_SYMBOLS = ["SPY", "QQQ", "DIA", "IWM", "AAPL", "MSFT", "GOOGL", "AMZN"];
  const HEADER_NAMES: Record<string, string> = {
    "SPY": "S&P 500",
    "QQQ": "Nasdaq 100",
    "DIA": "Dow Jones",
    "IWM": "Russell 2000",
    "AAPL": "Apple",
    "MSFT": "Microsoft",
    "GOOGL": "Google",
    "AMZN": "Amazon",
  };

  // Fetch header cards data using WebSocket priceStore
  const fetchHeaderCards = async () => {
    try {
      // Build change percents map for sparkline direction from priceStore
      const changePercents: Record<string, number> = {};
      HEADER_SYMBOLS.forEach((symbol) => {
        const quote = priceStore.getQuote(symbol);
        if (quote) changePercents[symbol] = quote.changePercent || 0;
      });

      // Use sparkline service with caching and batching
      const sparklineMap = await fetchSparklines(HEADER_SYMBOLS, changePercents);

      const cards: ChipData[] = HEADER_SYMBOLS.map((symbol) => {
        const quote = priceStore.getQuote(symbol);
        if (quote && quote.price > 0) {
          return {
            name: HEADER_NAMES[symbol] || symbol,
            symbol: symbol,
            value: quote.price.toFixed(2),
            change: (quote.changePercent || 0).toFixed(2),
            isPositive: (quote.changePercent || 0) >= 0,
            sparklineData: sparklineMap[symbol] || [],
          };
        }
        return {
          name: HEADER_NAMES[symbol] || symbol,
          symbol: symbol,
          value: "...",
          change: "0.00",
          isPositive: true,
          sparklineData: [],
        };
      });

      setHeaderCards(cards);
    } catch {
      // Error handled silently
    }
  };

  // Fetch market movers from Twelve Data (gainers/losers/most active)
  const fetchMarketMovers = async (direction: 'gainers' | 'losers' | 'most_active', market: string = 'stocks'): Promise<any[]> => {
    try {
      const countryParam = market === 'stocks' ? '&country=United States' : '';
      const url = `${TWELVE_DATA_URL}/market_movers/${market}?direction=${direction}&outputsize=50${countryParam}&apikey=${TWELVE_DATA_API_KEY}`;
      const res = await fetchWithTimeout(url, { timeout: 15000 });
      const json = await res.json();

      if (json?.values && Array.isArray(json.values)) {
        return json.values;
      }
      return [];
    } catch {
      return [];
    }
  };

  // Fetch quotes from Twelve Data API
  const fetchTwelveDataQuotes = async (symbols: string[]): Promise<any[]> => {
    try {
      if (symbols.length === 0) return [];

      // Batch symbols (max 8 per request for Twelve Data)
      const batchSize = 8;
      const allResults: any[] = [];

      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const url = `${TWELVE_DATA_URL}/quote?symbol=${batch.join(",")}&apikey=${TWELVE_DATA_API_KEY}`;
        const res = await fetchWithTimeout(url, { timeout: 15000 });
        const json = await res.json();

        if (Array.isArray(json)) {
          allResults.push(...json);
        } else if (json && typeof json === 'object' && !json.code) {
          // Multi-symbol response returns object with symbol keys like:
          // { "EUR/USD": {...}, "GBP/USD": {...} }
          // Single symbol returns object with data directly
          const values = Object.values(json);
          if (values.length > 0 && values[0] && typeof values[0] === 'object' && 'symbol' in (values[0] as object)) {
            // Multi-symbol response - extract all quote objects
            allResults.push(...values);
          } else if (json.symbol) {
            // Single symbol response
            allResults.push(json);
          }
        }
      }

      return allResults;
    } catch {
      return [];
    }
  };

  const fetchLiveData = useCallback(async () => {
    setError(null);

    try {
      let cleaned: StockItem[] = [];

      if (activeTab === "indices") {
        // INDICES: Use Twelve Data market_movers/etf endpoint
        setLoading(true);
        const moversData = await fetchMarketMovers('gainers', 'etf');

        if (moversData.length > 0) {
          cleaned = moversData.map((item: any) => ({
            symbol: item.symbol || "N/A",
            companyName: item.name || item.symbol || "Unknown",
            changesPercentage: parseFloat(item.percent_change) || 0,
            price: parseFloat(item.last) || parseFloat(item.close) || 0,
            change: parseFloat(item.change) || 0,
          }));
        }
      } else if (activeTab === "forex") {
        // FOREX: Use Twelve Data market_movers/forex endpoint
        setLoading(true);
        const moversData = await fetchMarketMovers('gainers', 'forex');

        if (moversData.length > 0) {
          cleaned = moversData.map((item: any) => ({
            symbol: item.symbol?.replace('/', '') || "N/A",
            companyName: item.name || item.symbol || "Unknown",
            changesPercentage: parseFloat(item.percent_change) || 0,
            price: parseFloat(item.last) || parseFloat(item.close) || 0,
            change: parseFloat(item.change) || 0,
          }));
        }
      } else if (activeTab === "gainers" || activeTab === "losers") {
        // GAINERS/LOSERS: Use Twelve Data market_movers API for real market data
        setLoading(true);

        const direction = activeTab === "gainers" ? "gainers" : "losers";
        const moversData = await fetchMarketMovers(direction);

        if (moversData.length > 0) {
          cleaned = moversData.map((item: any) => ({
            symbol: item.symbol || "N/A",
            companyName: item.name || item.symbol || "Unknown",
            changesPercentage: parseFloat(item.percent_change) || 0,
            price: parseFloat(item.last) || parseFloat(item.close) || 0,
            change: parseFloat(item.change) || 0,
          }));
        } else {
          // Fallback: fetch top stocks and sort manually
          const quotes = await fetchTwelveDataQuotes(TOP_STOCKS);

          let stocksWithChange = quotes
            .filter((item: any) => item && item.symbol && item.close)
            .map((item: any) => ({
              symbol: item.symbol,
              companyName: item.name || item.symbol || "Unknown",
              changesPercentage: parseFloat(item.percent_change) || 0,
              price: parseFloat(item.close) || 0,
              change: parseFloat(item.change) || 0,
            }));

          if (activeTab === "gainers") {
            stocksWithChange = stocksWithChange
              .filter(s => s.changesPercentage > 0)
              .sort((a, b) => b.changesPercentage - a.changesPercentage);
          } else {
            stocksWithChange = stocksWithChange
              .filter(s => s.changesPercentage < 0)
              .sort((a, b) => a.changesPercentage - b.changesPercentage);
          }

          cleaned = stocksWithChange.slice(0, 50);
        }
      } else {
        // TRENDING: Use pre-loaded stock data for instant display
        const localStocks = marketDataService.getLiveData('stock');

        if (localStocks.length > 0) {
          // Instant - sort by absolute change (most volatile)
          let stocksWithChange = localStocks.map(item => ({
            symbol: item.symbol,
            companyName: item.name || item.symbol,
            changesPercentage: item.changePercent,
            price: item.price,
            change: item.change,
          }));

          stocksWithChange = stocksWithChange
            .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage));

          cleaned = stocksWithChange.slice(0, 50);
          setData(cleaned);
          setLoading(false);
          return;
        }

        // Fallback: fetch from API if local data not ready
        setLoading(true);
        const moversData = await fetchMarketMovers('most_active');

        if (moversData.length > 0) {
          cleaned = moversData.map((item: any) => ({
            symbol: item.symbol || "N/A",
            companyName: item.name || item.symbol || "Unknown",
            changesPercentage: parseFloat(item.percent_change) || 0,
            price: parseFloat(item.last) || parseFloat(item.close) || 0,
            change: parseFloat(item.change) || 0,
          }));
        } else {
          const quotes = await fetchTwelveDataQuotes(TOP_STOCKS);

          let stocksWithChange = quotes
            .filter((item: any) => item && item.symbol && item.close)
            .map((item: any) => ({
              symbol: item.symbol,
              companyName: item.name || item.symbol || "Unknown",
              changesPercentage: parseFloat(item.percent_change) || 0,
              price: parseFloat(item.close) || 0,
              change: parseFloat(item.change) || 0,
            }));

          stocksWithChange = stocksWithChange
            .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage));

          cleaned = stocksWithChange.slice(0, 50);
        }
      }

      // Update global price store with fetched data
      priceStore.setQuotes(cleaned.map(item => ({
        symbol: item.symbol,
        price: typeof item.price === 'number' ? item.price : 0,
        changePercent: typeof item.changesPercentage === 'number' ? item.changesPercentage : parseFloat(String(item.changesPercentage)) || 0,
        name: item.companyName,
      })));

      setData(cleaned);
    } catch (err: any) {
      setError(err.message || "Network error. Check connection.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Update cache when data changes successfully
  useEffect(() => {
    if (data.length > 0 && !loading) {
      tabDataCache.current[activeTab] = {
        data: data,
        timestamp: Date.now(),
      };
    }
  }, [data, loading, activeTab]);

  // PRE-FETCH: Load gainers, losers, and indices data in background on mount for instant tab switching
  useEffect(() => {
    const prefetchTabs = async () => {
      // Wait for trending (default tab) to load first
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Prefetch gainers
      try {
        const gainersData = await fetchMarketMovers('gainers');
        if (gainersData.length > 0) {
          const cleaned = gainersData.map((item: any) => ({
            symbol: item.symbol || "N/A",
            companyName: item.name || item.symbol || "Unknown",
            changesPercentage: parseFloat(item.percent_change) || 0,
            price: parseFloat(item.last) || parseFloat(item.close) || 0,
            change: parseFloat(item.change) || 0,
          }));
          tabDataCache.current["gainers"] = { data: cleaned, timestamp: Date.now() };
        }
      } catch {
        // Non-critical prefetch failure
      }

      // Prefetch losers
      try {
        const losersData = await fetchMarketMovers('losers');
        if (losersData.length > 0) {
          const cleaned = losersData.map((item: any) => ({
            symbol: item.symbol || "N/A",
            companyName: item.name || item.symbol || "Unknown",
            changesPercentage: parseFloat(item.percent_change) || 0,
            price: parseFloat(item.last) || parseFloat(item.close) || 0,
            change: parseFloat(item.change) || 0,
          }));
          tabDataCache.current["losers"] = { data: cleaned, timestamp: Date.now() };
        }
      } catch {
        // Non-critical prefetch failure
      }

      // Prefetch indices (ETF movers)
      try {
        const indicesData = await fetchMarketMovers('gainers', 'etf');
        if (indicesData.length > 0) {
          const cleaned = indicesData.map((item: any) => ({
            symbol: item.symbol || "N/A",
            companyName: item.name || item.symbol || "Unknown",
            changesPercentage: parseFloat(item.percent_change) || 0,
            price: parseFloat(item.last) || parseFloat(item.close) || 0,
            change: parseFloat(item.change) || 0,
          }));
          tabDataCache.current["indices"] = { data: cleaned, timestamp: Date.now() };
        }
      } catch {
        // Non-critical prefetch failure
      }

      // Prefetch forex movers
      try {
        const forexData = await fetchMarketMovers('gainers', 'forex');
        if (forexData.length > 0) {
          const cleaned = forexData.map((item: any) => ({
            symbol: item.symbol?.replace('/', '') || "N/A",
            companyName: item.name || item.symbol || "Unknown",
            changesPercentage: parseFloat(item.percent_change) || 0,
            price: parseFloat(item.last) || parseFloat(item.close) || 0,
            change: parseFloat(item.change) || 0,
          }));
          tabDataCache.current["forex"] = { data: cleaned, timestamp: Date.now() };
        }
      } catch {
        // Non-critical prefetch failure
      }
    };

    prefetchTabs();
  }, []);

  // ============================================================================
  // OPTIMIZED TAB SWITCHING - Instant + Smooth
  // ============================================================================

  // Subscribe to WebSocket IMMEDIATELY on tab switch (don't wait for data)
  useEffect(() => {
    if (!wsConnected) return;

    // Get symbols for this tab - for known tabs use predefined list
    const predefinedSymbols = TAB_WS_SYMBOLS[activeTab];

    // Unsubscribe from previous symbols first
    if (wsSubscribedRef.current.length > 0) {
      wsUnsubscribe(wsSubscribedRef.current);
      wsSubscribedRef.current = [];
    }

    // Subscribe to predefined symbols immediately (forex, commodities, indices)
    if (predefinedSymbols && predefinedSymbols.length > 0) {
      wsSubscribe(predefinedSymbols);
      wsSubscribedRef.current = predefinedSymbols;
    }
  }, [activeTab, wsConnected, wsSubscribe, wsUnsubscribe]);

  // Subscribe to stock symbols when data loads (for trending/gainers/losers)
  useEffect(() => {
    if (!wsConnected) return;
    if (data.length === 0) return;

    // Only for stock tabs - predefined tabs already subscribed above
    if (TAB_WS_SYMBOLS[activeTab]) return;

    const stockSymbols = data.map(item => item.symbol).filter(Boolean).slice(0, 200);

    // Unsubscribe from old and subscribe to new
    if (wsSubscribedRef.current.length > 0) {
      wsUnsubscribe(wsSubscribedRef.current);
    }

    if (stockSymbols.length > 0) {
      wsSubscribe(stockSymbols);
      wsSubscribedRef.current = stockSymbols;
    }
  }, [data, activeTab, wsConnected, wsSubscribe, wsUnsubscribe]);

  // Main tab switching - ALWAYS fetch fresh data (gainers/losers change frequently)
  useEffect(() => {
    const cached = tabDataCache.current[activeTab];

    // CLEAR old data first to prevent showing wrong tab's data
    setData([]);

    // Show cached data temporarily while fetching (prevents empty screen)
    if (cached && cached.data.length > 0) {
      setData(cached.data);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // ALWAYS fetch fresh data - gainers/losers/trending change frequently
    fetchLiveData();
    fetchHeaderCards();
  }, [activeTab]);

  // Re-subscribe when returning to screen
  useFocusEffect(
    useCallback(() => {
      if (!wsConnected) return;

      // Re-subscribe to current tab's symbols
      const predefinedSymbols = TAB_WS_SYMBOLS[activeTab];
      if (predefinedSymbols && predefinedSymbols.length > 0) {
        wsSubscribe(predefinedSymbols);
        wsSubscribedRef.current = predefinedSymbols;
      } else if (data.length > 0) {
        const stockSymbols = data.map(item => item.symbol).filter(Boolean).slice(0, 200);
        if (stockSymbols.length > 0) {
          wsSubscribe(stockSymbols);
          wsSubscribedRef.current = stockSymbols;
        }
      }
    }, [activeTab, wsConnected, data, wsSubscribe])
  );

  // Real-time price update trigger - runs continuously for live prices
  const priceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (priceIntervalRef.current) {
      clearInterval(priceIntervalRef.current);
    }

    // Start price update interval after brief delay
    const startupDelay = setTimeout(() => {
      priceIntervalRef.current = setInterval(() => {
        setPriceUpdateTrigger(prev => prev + 1);
      }, 100); // 100ms = 10 updates/sec for ultra-fast prices
    }, 200); // 200ms initial delay

    return () => {
      clearTimeout(startupDelay);
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
        priceIntervalRef.current = null;
      }
    };
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsSubscribedRef.current.length > 0) {
        wsUnsubscribe(wsSubscribedRef.current);
        wsSubscribedRef.current = [];
      }
    };
  }, [wsUnsubscribe]);

  // ============================================================================
  // LIVE DATA - Real-time prices from WebSocket
  // ============================================================================
  const liveData = useMemo(() => {
    if (data.length === 0) return data;

    return data.map(item => {
      // Try multiple symbol formats for WebSocket data
      let quote = priceStore.getQuote(item.symbol);

      // For forex: try with slash (EUR/USD)
      if (!quote && item.symbol?.length === 6) {
        const symbolWithSlash = `${item.symbol.slice(0, 3)}/${item.symbol.slice(3)}`;
        quote = priceStore.getQuote(symbolWithSlash);
      }

      // For commodities stored with slash
      if (!quote && item.companyName) {
        // Try the companyName which might be the original symbol like "EUR/USD"
        quote = priceStore.getQuote(item.companyName);
      }

      if (quote && quote.price > 0) {
        return {
          ...item,
          price: quote.price,
          change: quote.change ?? item.change,
          changesPercentage: quote.changePercent ?? item.changesPercentage,
        };
      }
      return item;
    });
  }, [data, priceUpdateTrigger]);

  const renderItem = useCallback(({ item, index }: { item: StockItem; index: number }) => {
    const numChange = typeof item.changesPercentage === 'string'
      ? parseFloat(item.changesPercentage)
      : (item.changesPercentage || 0);
    const positive = numChange >= 0;

    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}
        onPress={() => {
          const encodedSymbol = encodeURIComponent(item.symbol);
          router.push(`/symbol/${encodedSymbol}/chart`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.left}>
          <View style={[styles.rankBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.rank, { color: colors.textSecondary }]}>{index + 1}</Text>
          </View>
          <StockLogo
            symbol={item.symbol}
            size={Platform.OS === 'android' ? 32 : 36}
            style={{ marginRight: Platform.OS === 'android' ? 8 : 10 }}
          />
          <View style={styles.info}>
            <Text style={[styles.symbol, { color: colors.text }]}>{item.symbol}</Text>
          </View>
        </View>
        <View style={styles.right}>
          {item.price != null && (
            <AnimatedPrice
              value={item.price}
              style={[styles.price, { color: colors.text }]}
              flashOnChange={true}
              decimals={2}
            />
          )}
          <View style={[styles.changeBadge, positive ? styles.changeBadgePositive : styles.changeBadgeNegative]}>
            <Ionicons
              name={positive ? "arrow-up" : "arrow-down"}
              size={14}
              color={positive ? "#00C853" : "#FF1744"}
            />
            <AnimatedChange
              value={numChange}
              style={{ ...styles.changeText, color: positive ? "#00C853" : "#FF1744" }}
              showArrow={false}
              flashOnChange={true}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [router, colors]);

  if (loading && data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.title, { color: colors.text }]}>Trending</Text>
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00C853" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading market data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
        {/* Header Top Row */}
        <View style={styles.headerTopRow}>
          <Text style={[styles.title, { color: colors.text }]}>Trending</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.surface }]} onPress={fetchLiveData}>
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Real-time market movers & top performers
        </Text>

        {/* Static Header Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.headerCardsContainer}
          contentContainerStyle={styles.headerCardsContent}
        >
          {headerCards.map((card) => (
            <HeaderCard
              key={card.symbol}
              item={card}
              onPress={() => {
                const encodedSymbol = encodeURIComponent(card.symbol);
                router.push(`/symbol/${encodedSymbol}/chart`);
              }}
            />
          ))}
        </ScrollView>

        {/* Tab Pills with Icons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabChange(tab.id)}
                style={[styles.tabPill, { backgroundColor: colors.surface }, isActive && { backgroundColor: isDark ? '#fff' : '#111827' }]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={isActive ? (isDark ? '#000' : '#fff') : colors.textSecondary}
                />
                <Text style={[styles.tabText, { color: colors.textSecondary }, isActive && { color: isDark ? '#000' : '#fff' }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchLiveData} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }]
        }}
      >
        <FlatList
          data={liveData}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.symbol}-${index}`}
          getItemLayout={getStockRowLayout}
          {...FLATLIST_PERFORMANCE_PROPS}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="trending-up" size={64} color={colors.borderLight} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data available</Text>
            </View>
          }
          ListFooterComponent={<InlineAdBanner />}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: Platform.OS === 'android' ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    marginBottom: 4,
  },
  title: {
    fontSize: Platform.OS === 'android' ? 22 : 32,
    fontWeight: "800",
    color: "#000",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00C853",
  },
  liveText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00C853",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: { 
    fontSize: 14, 
    color: "#6b7280", 
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  // Header Cards
  headerCardsContainer: {
    marginBottom: 16,
  },
  headerCardsContent: {
    paddingHorizontal: 20,
  },
  headerCard: {
    width: CARD_WIDTH,
    padding: 10,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerCardPositive: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  headerCardNegative: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  headerCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  headerCardInfo: {
    flex: 1,
  },
  headerCardSymbol: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 2,
  },
  headerCardPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  headerCardSparkline: {
    marginLeft: 4,
  },
  headerCardChangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  headerCardChangeBadgePositive: {
    backgroundColor: "#dcfce7",
  },
  headerCardChangeBadgeNegative: {
    backgroundColor: "#fee2e2",
  },
  headerCardChangeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  positive: { color: "#00C853" },
  negative: { color: "#FF1744" },
  // Tab Pills
  tabsScroll: {
    paddingHorizontal: 20,
  },
  tabsContent: {
    gap: 8,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: "#111827",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#fff",
  },
  // Loading & Error
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: "#FF1744",
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: { 
    color: "#fff", 
    fontSize: 14, 
    flex: 1 
  },
  retryBtn: { 
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retryText: { 
    color: "#FF1744", 
    fontWeight: "700", 
    fontSize: 14 
  },
  // List
  listContent: {
    paddingBottom: 120,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    height: STOCK_ROW_HEIGHT, // Fixed height for getItemLayout optimization
  },
  left: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  rank: { 
    fontSize: 14, 
    fontWeight: "700", 
    color: "#6b7280",
  },
  info: {
    flex: 1,
  },
  symbol: { 
    fontSize: 17, 
    fontWeight: "700", 
    color: "#111827",
    marginBottom: 2,
  },
  name: { 
    fontSize: 13, 
    color: "#6b7280",
  },
  right: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  changeBadgePositive: { 
    backgroundColor: "#00C85315" 
  },
  changeBadgeNegative: { 
    backgroundColor: "#FF174415" 
  },
  changeText: { 
    fontSize: 14, 
    fontWeight: "700", 
    marginLeft: 6 
  },
  emptyState: {
    padding: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
  },
});
