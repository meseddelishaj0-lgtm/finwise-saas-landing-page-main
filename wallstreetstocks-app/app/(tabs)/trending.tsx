// app/(tabs)/trending.tsx - WITH AUTO-SCROLLING HEADER CARDS + TAB ICONS
import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
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
import * as Haptics from "expo-haptics";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import FadeSlideIn from "@/components/FadeSlideIn";
import Sparkline from "@/components/Sparkline";
import { FLATLIST_PERFORMANCE_PROPS } from "@/components/OptimizedListItems";
import { AnimatedPrice, AnimatedChange, MarketTimeLabel } from "@/components/AnimatedPrice";
import { fetchSparklines } from "@/services/sparklineService";
import { priceStore } from "@/stores/priceStore";
import { InlineAdBanner } from "@/components/AdBanner";
import { useWebSocket } from "@/context/WebSocketContext";
import { marketDataService } from "@/services/marketDataService";
import StockLogo from "@/components/StockLogo";
import { useTheme } from "@/context/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Gold gradients from the app design system
const GOLD_GRADIENT_DARK = ["#FFD60A", "#DAA520"] as const;
const GOLD_GRADIENT_LIGHT = ["#B8860B", "#8B6914"] as const;

// Springy press wrapper with haptic feedback (UI only — same onPress behavior)
const ScalePress = ({
  children,
  onPress,
  style,
  activeScale = 0.96,
}: {
  children: React.ReactNode;
  onPress: () => void;
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
    <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// Theme-aware pulsing placeholder block
const SkeletonPulse = ({ style, color }: { style?: any; color: string }) => {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return <Animated.View style={[style, { backgroundColor: color, opacity: pulse }]} />;
};

// Placeholder mirroring the trending row layout, shown while data loads
const TrendingRowSkeleton = ({ color, borderColor, backgroundColor }: { color: string; borderColor: string; backgroundColor?: string }) => (
  <View style={[styles.row, { borderColor, backgroundColor }]}>
    <View style={styles.left}>
      <SkeletonPulse color={color} style={{ width: 26, height: 26, borderRadius: 13, marginRight: 10 }} />
      <SkeletonPulse color={color} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
      <SkeletonPulse color={color} style={{ width: 70, height: 14, borderRadius: 7 }} />
    </View>
    <View style={styles.right}>
      <SkeletonPulse color={color} style={{ width: 64, height: 14, borderRadius: 7 }} />
      <SkeletonPulse color={color} style={{ width: 52, height: 12, borderRadius: 6, marginTop: 8 }} />
    </View>
  </View>
);
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2.2;
const STOCK_ROW_HEIGHT = 76; // Fixed row height for getItemLayout optimization

// ============================================================================
// CONSTANTS - Moved outside component for performance
// ============================================================================

// Map tab to WebSocket symbols for INSTANT subscription
const TAB_WS_SYMBOLS: Record<string, string[]> = {};

// ETF symbols for indices tab filtering
const ETF_SYMBOLS = new Set([
  'SPY', 'VOO', 'VTI', 'QQQ', 'IVV', 'VEA', 'IEFA', 'VWO', 'VTV', 'IEMG',
  'BND', 'AGG', 'VUG', 'IJR', 'IWM', 'VIG', 'SCHD', 'VYM', 'VGT', 'XLF',
  'XLK', 'XLE', 'XLV', 'XLI', 'XLY', 'XLP', 'XLU', 'XLB', 'XLRE', 'XLC',
  'ARKK', 'ARKG', 'ARKW', 'ARKF', 'DIA', 'GLD', 'SLV', 'USO', 'TLT', 'LQD',
  'HYG', 'EEM', 'EFA',
]);

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

// Mini Sparkline — delegates to the shared true-scale Sparkline component
// (stable gradient ids; honest flat/empty rendering instead of fake curves)
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
}) => (
  <Sparkline
    data={data}
    color={isPositive ? "#00C853" : "#FF1744"}
    width={width}
    height={height}
    strokeWidth={2}
    fillOpacity={0.3}
  />
));

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

  const tint = item.isPositive ? "0,200,83" : "255,23,68";

  return (
    <ScalePress
      onPress={onPress}
      activeScale={0.95}
      style={[
        styles.headerCard,
        {
          backgroundColor: colors.card,
          borderColor: item.isPositive
            ? (isDark ? 'rgba(0,200,83,0.35)' : '#bbf7d0')
            : (isDark ? 'rgba(255,23,68,0.35)' : '#fecaca'),
        },
      ]}
    >
      <ExpoLinearGradient
        colors={[`rgba(${tint},${isDark ? 0.18 : 0.1})`, `rgba(${tint},0.02)`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.headerCardGradient}
      >
        <View style={styles.headerCardTop}>
          <View style={styles.headerCardInfo}>
            <Text style={[styles.headerCardSymbol, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.name}
            </Text>
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
              width={52}
              height={26}
            />
          </View>
        </View>
        <View style={[
          styles.headerCardChangeBadge,
          { backgroundColor: `rgba(${tint},${isDark ? 0.22 : 0.12})` },
        ]}>
          <Ionicons
            name={item.isPositive ? "trending-up" : "trending-down"}
            size={11}
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
      </ExpoLinearGradient>
    </ScalePress>
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

      // Clear the previous tab's list BEFORE switching so it can never be
      // shown (or cached) under the new tab while its data loads
      setData([]);
      setLoading(true);

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

  // Which tab the current `data` state belongs to — guards the cache-write
  // effect from writing the previous tab's rows under the new tab's key
  // when activeTab changes before the new data arrives
  const dataOwnerTabRef = useRef<string>("");

  // WebSocket for real-time forex/commodities prices
  const { subscribe: wsSubscribe, unsubscribe: wsUnsubscribe, isConnected: wsConnected } = useWebSocket();
  const wsSubscribedRef = useRef<string[]>([]);

  // Price update trigger for real-time updates
  const [priceUpdateTrigger, setPriceUpdateTrigger] = useState(0);

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

  // Derive market movers from in-memory priceStore (zero API calls)
  const getMoversFromStore = useCallback((
    filter: 'stocks' | 'etfs' | 'forex' | 'all',
    sort: 'gainers' | 'losers' | 'volatile',
    limit: number = 50,
  ): StockItem[] => {
    const allQuotes = priceStore.getAll();
    let items = Object.values(allQuotes).filter(q =>
      q.symbol && q.price > 0 && q.changePercent !== undefined && q.changePercent !== 0
    );

    // Filter by asset type
    if (filter === 'etfs') {
      items = items.filter(q => ETF_SYMBOLS.has(q.symbol));
    } else if (filter === 'forex') {
      items = items.filter(q => q.symbol.includes('/') && !q.symbol.includes('USD') ? true :
        (q.symbol.length === 7 && q.symbol.includes('/')) ||
        ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
         'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'CAD/JPY', 'EUR/AUD', 'EUR/CAD',
         'GBP/AUD', 'GBP/CHF', 'AUD/NZD', 'AUD/CAD', 'NZD/JPY', 'EUR/CHF'].includes(q.symbol)
      );
    } else if (filter === 'stocks') {
      items = items.filter(q => !ETF_SYMBOLS.has(q.symbol) && !q.symbol.includes('/'));
    }

    // Sort
    if (sort === 'gainers') {
      items = items.filter(q => (q.changePercent ?? 0) > 0)
        .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
    } else if (sort === 'losers') {
      items = items.filter(q => (q.changePercent ?? 0) < 0)
        .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0));
    } else {
      items = items.sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0));
    }

    return items.slice(0, limit).map(q => ({
      symbol: q.symbol.includes('/') ? q.symbol.replace('/', '') : q.symbol,
      companyName: q.name || q.symbol,
      changesPercentage: q.changePercent ?? 0,
      price: q.price,
      change: q.change ?? 0,
    }));
  }, []);

  const fetchLiveData = useCallback(async () => {
    setError(null);

    try {
      let cleaned: StockItem[] = [];

      if (activeTab === "indices") {
        // INDICES: Derive from ETF quotes in priceStore
        cleaned = getMoversFromStore('etfs', 'gainers');

        // Fallback: use marketDataService if priceStore is empty
        if (cleaned.length === 0) {
          const localETFs = marketDataService.getLiveData('etf');
          cleaned = localETFs.map(item => ({
            symbol: item.symbol,
            companyName: item.name || item.symbol,
            changesPercentage: item.changePercent,
            price: item.price,
            change: item.change,
          })).sort((a, b) => b.changesPercentage - a.changesPercentage).slice(0, 50);
        }
      } else if (activeTab === "forex") {
        // FOREX: Derive from forex quotes in priceStore
        cleaned = getMoversFromStore('forex', 'gainers');
      } else if (activeTab === "gainers") {
        // GAINERS: Top gaining stocks from priceStore
        cleaned = getMoversFromStore('stocks', 'gainers');

        // Fallback: use marketDataService
        if (cleaned.length === 0) {
          const localStocks = marketDataService.getLiveData('stock');
          cleaned = localStocks.filter(s => s.changePercent > 0)
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 50)
            .map(item => ({
              symbol: item.symbol,
              companyName: item.name || item.symbol,
              changesPercentage: item.changePercent,
              price: item.price,
              change: item.change,
            }));
        }
      } else if (activeTab === "losers") {
        // LOSERS: Top losing stocks from priceStore
        cleaned = getMoversFromStore('stocks', 'losers');

        // Fallback: use marketDataService
        if (cleaned.length === 0) {
          const localStocks = marketDataService.getLiveData('stock');
          cleaned = localStocks.filter(s => s.changePercent < 0)
            .sort((a, b) => a.changePercent - b.changePercent)
            .slice(0, 50)
            .map(item => ({
              symbol: item.symbol,
              companyName: item.name || item.symbol,
              changesPercentage: item.changePercent,
              price: item.price,
              change: item.change,
            }));
        }
      } else {
        // TRENDING: Most volatile stocks from priceStore
        cleaned = getMoversFromStore('stocks', 'volatile');

        // Fallback: use marketDataService
        if (cleaned.length === 0) {
          const localStocks = marketDataService.getLiveData('stock');
          cleaned = localStocks.map(item => ({
            symbol: item.symbol,
            companyName: item.name || item.symbol,
            changesPercentage: item.changePercent,
            price: item.price,
            change: item.change,
          })).sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage))
            .slice(0, 50);
        }
      }

      setData(cleaned);
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, getMoversFromStore]);

  // Update cache when data changes successfully
  useEffect(() => {
    if (data.length > 0 && !loading) {
      // Only cache data that was actually loaded for this tab
      if (dataOwnerTabRef.current !== activeTab) return;
      tabDataCache.current[activeTab] = {
        data: data,
        timestamp: Date.now(),
      };
    }
  }, [data, loading, activeTab]);

  // PRE-CACHE: Compute all tabs from priceStore after initial data loads
  useEffect(() => {
    const prefetchFromStore = () => {
      // Wait for WebSocket/marketDataService to populate priceStore
      setTimeout(() => {
        const tabs: { key: string; filter: 'stocks' | 'etfs' | 'forex'; sort: 'gainers' | 'losers' | 'volatile' }[] = [
          { key: 'gainers', filter: 'stocks', sort: 'gainers' },
          { key: 'losers', filter: 'stocks', sort: 'losers' },
          { key: 'indices', filter: 'etfs', sort: 'gainers' },
          { key: 'forex', filter: 'forex', sort: 'gainers' },
        ];
        tabs.forEach(({ key, filter, sort }) => {
          const items = getMoversFromStore(filter, sort);
          if (items.length > 0) {
            tabDataCache.current[key] = { data: items, timestamp: Date.now() };
          }
        });
      }, 3000);
    };

    prefetchFromStore();
  }, [getMoversFromStore]);

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

    // Everything set from here on (cache or fetch) belongs to this tab —
    // mark ownership for the cache-write effect
    dataOwnerTabRef.current = activeTab;

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

    const isTopRank = index < 3;
    const goldInk = isDark ? '#FFD60A' : '#B8860B';
    const displayName = item.companyName || item.name;

    return (
      <FadeSlideIn delay={Math.min(index, 12) * 30} distance={10}>
        <ScalePress
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
          activeScale={0.97}
          onPress={() => {
            const encodedSymbol = encodeURIComponent(item.symbol);
            router.push(`/symbol/${encodedSymbol}/chart`);
          }}
        >
          <View style={styles.left}>
            <View style={[
              styles.rankBadge,
              { backgroundColor: isTopRank ? (isDark ? 'rgba(255,214,10,0.14)' : 'rgba(184,134,11,0.12)') : colors.surface },
            ]}>
              <Text style={[styles.rank, { color: isTopRank ? goldInk : colors.textSecondary }]}>{index + 1}</Text>
            </View>
            <StockLogo
              symbol={item.symbol}
              size={Platform.OS === 'android' ? 32 : 36}
              style={{ marginRight: Platform.OS === 'android' ? 8 : 10 }}
            />
            <View style={styles.info}>
              <Text style={[styles.symbol, { color: colors.text }]}>{item.symbol}</Text>
              {!!displayName && displayName !== item.symbol && (
                <Text style={[styles.name, { color: colors.textTertiary }]} numberOfLines={1}>
                  {displayName}
                </Text>
              )}
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
        </ScalePress>
      </FadeSlideIn>
    );
  }, [router, colors, isDark]);

  // NOTE: no full-screen loading early-return here — unmounting the animated
  // content view mid tab-transition left its native fade value at 0 on
  // remount (black screen). Loading skeletons render via ListEmptyComponent
  // so the animated view stays mounted through every tab switch.

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
        {/* Header Top Row */}
        <View style={styles.headerTopRow}>
          <Text style={[styles.title, { color: colors.text }]}>Trending</Text>
          <View style={styles.headerRight}>
            <ScalePress style={[styles.refreshBtn, { backgroundColor: colors.surface }]} onPress={fetchLiveData} activeScale={0.88}>
              <Ionicons name="refresh" size={20} color={isDark ? '#FFD60A' : '#B8860B'} />
            </ScalePress>
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
            const activeInk = isDark ? '#000' : '#fff';
            return (
              <ScalePress
                key={tab.id}
                onPress={() => handleTabChange(tab.id)}
                activeScale={0.93}
              >
                {isActive ? (
                  <ExpoLinearGradient
                    colors={(isDark ? GOLD_GRADIENT_DARK : GOLD_GRADIENT_LIGHT) as unknown as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.tabPill, styles.tabPillActive]}
                  >
                    <Ionicons name={tab.icon as any} size={16} color={activeInk} />
                    <Text style={[styles.tabText, styles.tabTextActive, { color: activeInk }]}>{tab.label}</Text>
                  </ExpoLinearGradient>
                ) : (
                  <View style={[styles.tabPill, { backgroundColor: colors.surface }]}>
                    <Ionicons name={tab.icon as any} size={16} color={colors.textTertiary} />
                    <Text style={[styles.tabText, { color: colors.textSecondary }]}>{tab.label}</Text>
                  </View>
                )}
              </ScalePress>
            );
          })}
        </ScrollView>
      </View>

      {error && (
        <FadeSlideIn distance={8}>
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color="#FF1744" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchLiveData} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </FadeSlideIn>
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
            loading ? (
              <View>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TrendingRowSkeleton key={i} color={colors.borderLight} borderColor={colors.borderLight} backgroundColor={colors.card} />
                ))}
              </View>
            ) : (
              <FadeSlideIn distance={10}>
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
                    <Ionicons name="trending-up" size={30} color={colors.textTertiary} />
                  </View>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data available</Text>
                </View>
              </FadeSlideIn>
            )
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
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerCardGradient: {
    padding: 12,
  },
  headerCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerCardInfo: {
    flex: 1,
  },
  headerCardSymbol: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  headerCardPrice: {
    fontSize: 17,
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
    shadowColor: "#FFD60A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    fontWeight: "800",
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
    backgroundColor: "rgba(255,23,68,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,23,68,0.3)",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    color: "#FF1744",
    fontSize: 14,
    flex: 1,
    fontWeight: "600",
  },
  retryBtn: {
    backgroundColor: "#FF1744",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  // List
  listContent: {
    paddingBottom: 120,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    // 68 + 8 margin = STOCK_ROW_HEIGHT (76) so getItemLayout stays exact
    height: STOCK_ROW_HEIGHT - 8,
  },
  left: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  rank: {
    fontSize: 12,
    fontWeight: "800",
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
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
  },
});
