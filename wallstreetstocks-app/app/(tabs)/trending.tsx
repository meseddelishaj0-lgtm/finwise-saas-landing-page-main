// app/(tabs)/trending.tsx - WITH AUTO-SCROLLING HEADER CARDS + TAB ICONS
import React, { useState, useEffect, useCallback, useRef, memo } from "react";
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
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { FLATLIST_PERFORMANCE_PROPS } from "@/components/OptimizedListItems";
import { fetchWithTimeout } from "@/utils/performance";
import { AnimatedPrice, AnimatedChange, LiveIndicator } from "@/components/AnimatedPrice";
import { fetchQuotesWithCache } from "@/services/quoteService";
import { fetchSparklines } from "@/services/sparklineService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2.2;
const STOCK_ROW_HEIGHT = 76; // Fixed row height for getItemLayout optimization

// getItemLayout for FlatList optimization (enables instant scroll-to-index)
const getStockRowLayout = (_data: any, index: number) => ({
  length: STOCK_ROW_HEIGHT,
  offset: STOCK_ROW_HEIGHT * index,
  index,
});

type TabType = "trending" | "gainers" | "losers" | "indices" | "forex" | "commodities";

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
  { id: "commodities", label: "Commodities", icon: "cube" },
];

// Mini Sparkline Component
const MiniSparkline = ({ 
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
  const gradientId = `gradient-${isPositive ? 'green' : 'red'}-${Math.random().toString(36).substr(2, 9)}`;

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
};

// Header Card Component
const HeaderCard = ({
  item,
  onPress,
}: {
  item: ChipData;
  onPress: () => void;
}) => {
  const priceValue = item.value !== "..." ? Number(item.value) : 0;
  const changeValue = parseFloat(item.change) || 0;

  return (
    <TouchableOpacity
      style={[
        styles.headerCard,
        item.isPositive ? styles.headerCardPositive : styles.headerCardNegative
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.headerCardTop}>
        <View style={styles.headerCardInfo}>
          <Text style={styles.headerCardSymbol}>{item.name}</Text>
          {item.value !== "..." ? (
            <AnimatedPrice
              value={priceValue}
              style={styles.headerCardPrice}
              flashOnChange={true}
              decimals={2}
            />
          ) : (
            <Text style={styles.headerCardPrice}>$...</Text>
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
};

export default function Trending() {
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [data, setData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerCards, setHeaderCards] = useState<ChipData[]>([]);
  const router = useRouter();
  
  // Auto-scroll refs
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPosition = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const isUserScrolling = useRef(false);
  const lastTimestamp = useRef<number>(0);
  const pauseTimeoutRef = useRef<number | null>(null);

  const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';
  const BASE = "https://financialmodelingprep.com/api/v3";

  // Extended Indices - Global Markets (50+)
  const INDICES_SYMBOLS = [
    // US Indices
    "%5EGSPC",    // S&P 500
    "%5EDJI",     // Dow Jones
    "%5EIXIC",    // Nasdaq Composite
    "%5ERUT",     // Russell 2000
    "%5EVIX",     // VIX
    "%5ENDX",     // Nasdaq 100
    "%5ESP400",   // S&P 400 Mid Cap
    "%5ESP600",   // S&P 600 Small Cap
    // Europe Indices
    "%5EGDAXI",   // DAX (Germany)
    "%5EFTSE",    // FTSE 100 (UK)
    "%5EFCHI",    // CAC 40 (France)
    "%5ESTOXX50E",// Euro Stoxx 50
    "%5EIBEX",    // IBEX 35 (Spain)
    "%5EFTSEMIB", // FTSE MIB (Italy)
    "%5EAEX",     // AEX (Netherlands)
    "%5ESSMI",    // SMI (Switzerland)
    // Asia-Pacific Indices
    "%5EN225",    // Nikkei 225 (Japan)
    "%5EHSI",     // Hang Seng (Hong Kong)
    "%5E000001.SS",// Shanghai Composite
    "%5EAXJO",    // ASX 200 (Australia)
    "%5EKS11",    // KOSPI (South Korea)
    "%5ETWII",    // Taiwan Weighted
    "%5EBSESN",   // BSE Sensex (India)
    "%5ESTI",     // Straits Times (Singapore)
    // Americas (Non-US)
    "%5EGSPTSE",  // TSX (Canada)
    "%5EBVSP",    // Bovespa (Brazil)
    "%5EMXX",     // IPC Mexico
  ];

  // Extended Forex Pairs (50+)
  const FOREX_PAIRS = [
    // Major Pairs
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
    // Cross Pairs - EUR
    "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURCAD", "EURNZD",
    // Cross Pairs - GBP
    "GBPJPY", "GBPCHF", "GBPAUD", "GBPCAD", "GBPNZD",
    // Cross Pairs - JPY
    "AUDJPY", "CADJPY", "NZDJPY", "CHFJPY",
    // Cross Pairs - Other
    "AUDCAD", "AUDCHF", "AUDNZD", "CADCHF", "NZDCAD", "NZDCHF",
    // Exotic Pairs
    "USDMXN", "USDZAR", "USDTRY", "USDSEK", "USDNOK", "USDDKK",
    "USDSGD", "USDHKD", "USDCNY", "USDINR", "USDKRW", "USDTHB",
    "EURPLN", "EURHUF", "EURCZK", "EURTRY", "EURMXN", "EURSEK",
    "GBPMXN", "GBPZAR", "GBPSGD",
  ];

  // Extended Commodities (40+)
  const COMMODITIES_SYMBOLS = [
    // Precious Metals
    "GCUSD",   // Gold
    "SIUSD",   // Silver
    "PLUSD",   // Platinum
    "PAUSD",   // Palladium
    // Energy
    "CLUSD",   // Crude Oil WTI
    "BZUSD",   // Brent Crude
    "NGUSD",   // Natural Gas
    "HGUSD",   // Copper (also industrial)
    "RBUSD",   // Gasoline RBOB
    "HOUSD",   // Heating Oil
    // Agriculture - Grains
    "ZCUSD",   // Corn
    "ZWUSD",   // Wheat
    "ZSUSD",   // Soybeans
    "ZMUSD",   // Soybean Meal
    "ZLUSD",   // Soybean Oil
    "ZOUSD",   // Oats
    "ZRUSD",   // Rice
    // Agriculture - Softs
    "KCUSD",   // Coffee
    "SBUSD",   // Sugar
    "CCUSD",   // Cocoa
    "CTUSD",   // Cotton
    "OJUSD",   // Orange Juice
    "LBUSD",   // Lumber
    // Livestock
    "LCUSD",   // Live Cattle
    "LHUSD",   // Lean Hogs
    "FCUSD",   // Feeder Cattle
    // Industrial Metals
    "ALUSD",   // Aluminum
    "ZNUSD",   // Zinc
    "NIUSD",   // Nickel
    "PBUSD",   // Lead
  ];

  const endpoints: Record<TabType, string> = {
    trending: `${BASE}/stock_market/actives?limit=50&apikey=${FMP_API_KEY}`,
    gainers: `${BASE}/stock_market/gainers?limit=50&apikey=${FMP_API_KEY}`,
    losers: `${BASE}/stock_market/losers?limit=50&apikey=${FMP_API_KEY}`,
    indices: `${BASE}/quote/${INDICES_SYMBOLS.join(",")}?apikey=${FMP_API_KEY}`,
    forex: `${BASE}/quotes/forex?apikey=${FMP_API_KEY}`,
    commodities: `${BASE}/quotes/commodity?apikey=${FMP_API_KEY}`,
  };

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

  // Fetch header cards data with cache support (syncs with chart prices)
  const fetchHeaderCards = async () => {
    try {
      // Use cache-aware quote service to get prices synced with chart
      const data = await fetchQuotesWithCache(HEADER_SYMBOLS, { timeout: 10000 });

      // Build change percents map for sparkline direction
      const changePercents: Record<string, number> = {};
      data.forEach((q: any) => {
        if (q.symbol) changePercents[q.symbol] = q.changesPercentage || 0;
      });

      // Use sparkline service with caching and batching
      const sparklineMap = await fetchSparklines(HEADER_SYMBOLS, changePercents);

      if (Array.isArray(data) && data.length > 0) {
        const cards: ChipData[] = HEADER_SYMBOLS.map((symbol) => {
          const quote = data.find((item: any) => item.symbol === symbol);
          if (quote) {
            return {
              name: HEADER_NAMES[symbol] || symbol,
              symbol: symbol,
              value: quote.price?.toFixed(2) || "0.00",
              change: quote.changesPercentage?.toFixed(2) || "0.00",
              isPositive: (quote.changesPercentage || 0) >= 0,
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
      }
    } catch (err) {
      console.error("Header cards fetch failed:", err);
    }
  };

  // Smooth auto-scroll
  const startAutoScroll = useCallback(() => {
    const cardTotalWidth = CARD_WIDTH + 8;
    const totalWidth = headerCards.length * cardTotalWidth;
    const visibleWidth = SCREEN_WIDTH - 40;
    const maxScroll = Math.max(0, totalWidth - visibleWidth + 20);

    if (maxScroll <= 0 || headerCards.length === 0) return;

    const scrollSpeed = 0.5;
    let direction = 1;

    const animate = (timestamp: number) => {
      if (isUserScrolling.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      if (!lastTimestamp.current) lastTimestamp.current = timestamp;
      const delta = timestamp - lastTimestamp.current;
      lastTimestamp.current = timestamp;

      scrollPosition.current += scrollSpeed * direction * (delta / 16.67);

      if (scrollPosition.current >= maxScroll) {
        scrollPosition.current = maxScroll;
        direction = -1;
      } else if (scrollPosition.current <= 0) {
        scrollPosition.current = 0;
        direction = 1;
      }

      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: scrollPosition.current,
          animated: false,
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [headerCards.length]);

  useEffect(() => {
    if (headerCards.length > 0) {
      const timer = setTimeout(() => {
        startAutoScroll();
      }, 1500);

      return () => {
        clearTimeout(timer);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [headerCards.length, startAutoScroll]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  const handleScrollBegin = () => {
    isUserScrolling.current = true;
  };

  const handleScrollEnd = (event: any) => {
    scrollPosition.current = event.nativeEvent.contentOffset.x;
    lastTimestamp.current = 0;
    
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    
    pauseTimeoutRef.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 4000);
  };

  const fetchLiveData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithTimeout(endpoints[activeTab], { timeout: 15000 });
      const json = await res.json();

      if (json.Error || json.error) {
        throw new Error(json.Error || json.error);
      }

      let cleaned: StockItem[] = [];

      if (Array.isArray(json)) {
        if (activeTab === "indices") {
          // Use cache-aware fetching for indices to sync with chart prices
          const cachedIndices = await fetchQuotesWithCache(
            json.map((item: any) => item.symbol).filter(Boolean),
            { timeout: 10000 }
          );
          cleaned = json.map(item => {
            const cached = cachedIndices.find((c: any) => c.symbol === item.symbol);
            return {
              symbol: item.symbol || "N/A",
              companyName: item.name || item.symbol || "Unknown",
              changesPercentage: cached?.changesPercentage ?? item.changesPercentage ?? 0,
              price: cached?.price ?? item.price,
              change: cached?.change ?? item.change,
            };
          });
        } else if (activeTab === "forex") {
          // Process forex data - show all pairs
          cleaned = json
            .filter(item => item?.symbol || item?.ticker)
            .map(item => {
              const rawSymbol = item.ticker || item.symbol || "N/A";
              const normalizedSymbol = rawSymbol.replace(/\//g, '');
              const name = rawSymbol.includes('/') ? rawSymbol : `${rawSymbol.slice(0,3)}/${rawSymbol.slice(3)}`;

              return {
                symbol: normalizedSymbol,
                companyName: name,
                changesPercentage: item.changesPercentage || item.changes || 0,
                price: item.price || item.bid || item.ask,
              };
            })
            .slice(0, 50); // Show up to 50 forex pairs
        } else if (activeTab === "commodities") {
          // Process commodities data - show all available
          cleaned = json
            .filter(item => item?.symbol)
            .map(item => ({
              symbol: item.symbol || "N/A",
              companyName: item.name || item.symbol || "Unknown",
              changesPercentage: item.changesPercentage || 0,
              price: item.price,
              change: item.change,
            }))
            .slice(0, 50); // Show up to 50 commodities
        } else {
          // Trending, gainers, losers - show up to 50 items with cache merge
          const symbols = json
            .filter((item: any) => item?.symbol)
            .map((item: any) => item.symbol)
            .slice(0, 50);

          // Fetch with cache to get chart-synced prices
          const cachedQuotes = await fetchQuotesWithCache(symbols, { timeout: 10000 });

          cleaned = json
            .filter((item: any) => item?.symbol && item.changesPercentage !== undefined)
            .map((item: any) => {
              const cached = cachedQuotes.find((c: any) => c.symbol === item.symbol);
              return {
                symbol: item.symbol,
                companyName: item.companyName || item.name || "Unknown",
                changesPercentage: cached?.changesPercentage ?? item.changesPercentage,
                price: cached?.price ?? item.price,
              };
            })
            .slice(0, 50);
        }
      }

      setData(cleaned);
    } catch (err: any) {
      console.error("Trending fetch error:", err);
      setError(err.message || "Network error. Check connection.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchLiveData();
    fetchHeaderCards();
    const interval = setInterval(() => {
      fetchLiveData();
      fetchHeaderCards();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  // Refresh header cards when screen comes into focus (picks up chart-synced prices)
  useFocusEffect(
    useCallback(() => {
      fetchHeaderCards();
    }, [])
  );

  const renderItem = useCallback(({ item, index }: { item: StockItem; index: number }) => {
    const numChange = typeof item.changesPercentage === 'string' 
      ? parseFloat(item.changesPercentage) 
      : (item.changesPercentage || 0);
    const positive = numChange >= 0;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          const encodedSymbol = encodeURIComponent(item.symbol);
          router.push(`/symbol/${encodedSymbol}/chart`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.left}>
          <View style={styles.rankBadge}>
            <Text style={styles.rank}>{index + 1}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.symbol}>{item.symbol}</Text>
            <Text style={styles.name} numberOfLines={1}>{item.companyName}</Text>
          </View>
        </View>
        <View style={styles.right}>
          {item.price && (
            <AnimatedPrice
              value={item.price}
              style={styles.price}
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
  }, [router]);

  if (loading && data.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.title}>Trending</Text>
            <LiveIndicator />
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00C853" />
          <Text style={styles.loadingText}>Loading market data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        {/* Header Top Row */}
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>Trending</Text>
          <View style={styles.headerRight}>
            <LiveIndicator />
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchLiveData}>
              <Ionicons name="refresh" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Real-time market movers & top performers
        </Text>

        {/* Auto-scrolling Header Cards */}
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.headerCardsContainer}
          contentContainerStyle={styles.headerCardsContent}
          onScrollBeginDrag={handleScrollBegin}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
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
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={isActive ? "#fff" : "#6b7280"}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
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

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.symbol}-${index}`}
        getItemLayout={getStockRowLayout}
        {...FLATLIST_PERFORMANCE_PROPS}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trending-up" size={64} color="#e5e7eb" />
            <Text style={styles.emptyText}>No data available</Text>
          </View>
        }
      />
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
