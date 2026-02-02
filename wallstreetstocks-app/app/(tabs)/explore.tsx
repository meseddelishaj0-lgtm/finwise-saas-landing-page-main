// app/(tabs)/explore.tsx - WITH LARGER SECTION HEADER CARDS
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  FlatList,
  Keyboard,
  ActivityIndicator,
  Dimensions,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { fetchWithTimeout } from "@/utils/performance";
import { AnimatedPrice, AnimatedChange, MarketTimeLabel } from "@/components/AnimatedPrice";
import { fetchQuotesWithCache } from "@/services/quoteService";
import { fetchSparklines } from "@/services/sparklineService";
import { priceStore } from "@/stores/priceStore";
import { useWebSocket } from "@/context/WebSocketContext";
import { InlineAdBanner } from "@/components/AdBanner";
import { marketDataService } from "@/services/marketDataService";
import StockLogo from "@/components/StockLogo";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2.2; // Wider cards, ~2.2 visible

// WebSocket handles all real-time prices - no API polling needed

type Tab = "stocks" | "crypto" | "etf" | "bonds" | "treasury" | "ipo" | "ma" | "dividends";
type StockRegion = "us" | "europe" | "asia";

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  type: "stock" | "crypto" | "etf";
  exchange?: string;
  ipoDate?: string;
  status?: string;
  priceRange?: string;
  targetCompany?: string;
  acquirerCompany?: string;
  dealDate?: string;
  dealValue?: string;
  dealType?: string;
  dividend?: number;
  dividendYield?: number;
  paymentDate?: string;
  recordDate?: string;
  declarationDate?: string;
  frequency?: string;
}

interface ChipData {
  name: string;
  symbol: string;
  value: string;
  change: string;
  isPositive: boolean;
  sparklineData: number[];
}

interface TreasuryRate {
  date: string;
  month1: number;
  month2: number;
  month3: number;
  month6: number;
  year1: number;
  year2: number;
  year3?: number;
  year5: number;
  year7: number;
  year10: number;
  year20: number;
  year30: number;
}

// Mini Sparkline Component - Memoized for performance
const MiniSparkline = memo(({
  data,
  isPositive,
  width = 70,
  height = 32
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
  const gradientId = `gradient-${isPositive ? 'green' : 'red'}-${Math.random().toString(36).substring(2, 11)}`;

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

// Yield Curve Chart Component
const YieldCurveChart = ({
  data,
  width = SCREEN_WIDTH - 40,
  height = 180,
}: {
  data: { label: string; value: number; months: number }[];
  width?: number;
  height?: number;
}) => {
  if (!data || data.length < 2) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values) - 0.2;
  const maxVal = Math.max(...values) + 0.2;
  const range = maxVal - minVal;

  // Create points with logarithmic x-scale for better distribution
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.value - minVal) / range) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  // Create smooth curve path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    pathD += ` Q ${prev.x + (midX - prev.x) * 0.5} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
    pathD += ` Q ${midX + (curr.x - midX) * 0.5} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Area fill path
  const areaPath = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Check if curve is inverted (short rates > long rates)
  const isInverted = data[0].value > data[data.length - 1].value;
  const curveColor = isInverted ? "#FF6B6B" : "#00C853";

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="yieldCurveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={curveColor} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={curveColor} stopOpacity={0.05} />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <Path
          key={`grid-${i}`}
          d={`M ${padding.left} ${padding.top + chartHeight * pct} L ${width - padding.right} ${padding.top + chartHeight * pct}`}
          stroke="#e5e7eb"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      ))}

      {/* Area fill */}
      <Path d={areaPath} fill="url(#yieldCurveGradient)" />

      {/* Curve line */}
      <Path
        d={pathD}
        stroke={curveColor}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((point, i) => (
        <React.Fragment key={`point-${i}`}>
          <Path
            d={`M ${point.x - 4} ${point.y} A 4 4 0 1 1 ${point.x + 4} ${point.y} A 4 4 0 1 1 ${point.x - 4} ${point.y}`}
            fill="#fff"
            stroke={curveColor}
            strokeWidth={2}
          />
        </React.Fragment>
      ))}
    </Svg>
  );
};

// Treasury Rate Card Component
const TreasuryRateCard = ({
  label,
  rate,
  change,
  isSelected,
  onPress,
}: {
  tenor?: string;
  label: string;
  rate: number;
  change: { change: number; isPositive: boolean } | null;
  isSelected: boolean;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.treasuryRateCard,
        isSelected && styles.treasuryRateCardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.treasuryRateCardTenor, isSelected && styles.treasuryRateCardTenorSelected]}>
        {label}
      </Text>
      <Text style={[styles.treasuryRateCardValue, isSelected && styles.treasuryRateCardValueSelected]}>
        {rate?.toFixed(2)}%
      </Text>
      {change && (
        <View style={[
          styles.treasuryRateCardChange,
          change.isPositive ? styles.treasuryRateCardChangeUp : styles.treasuryRateCardChangeDown
        ]}>
          <Ionicons
            name={change.isPositive ? "caret-up" : "caret-down"}
            size={10}
            color={change.isPositive ? "#00C853" : "#FF1744"}
          />
          <Text style={[
            styles.treasuryRateCardChangeText,
            change.isPositive ? styles.positive : styles.negative
          ]}>
            {Math.abs(change.change).toFixed(2)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Large Header Card Component - Memoized for performance
const HeaderCard = memo(({
  item,
  onPress,
  showSparkline = true,
}: {
  item: ChipData;
  onPress: () => void;
  showSparkline?: boolean;
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
        {showSparkline && (
          <View style={styles.headerCardSparkline}>
            <MiniSparkline
              data={item.sparklineData}
              isPositive={item.isPositive}
              width={40}
              height={22}
            />
          </View>
        )}
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

export default function Explore() {
  const [activeTab, setActiveTab] = useState<Tab>("stocks");
  const [stockRegion, setStockRegion] = useState<StockRegion>("us");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [data, setData] = useState<MarketItem[]>([]);
  const [searchResults, setSearchResults] = useState<MarketItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [headerCards, setHeaderCards] = useState<ChipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treasuryRates, setTreasuryRates] = useState<TreasuryRate | null>(null);
  const [treasuryHistory, setTreasuryHistory] = useState<TreasuryRate[]>([]);
  const [treasuryLoading, setTreasuryLoading] = useState(true);
  const [selectedTenor, setSelectedTenor] = useState<string>("year10");
  const router = useRouter();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  
  // Regional stock data cache - stores fetched data for instant switching
  const regionalDataCache = useRef<{
    europe: MarketItem[];
    asia: MarketItem[];
    europeLoaded: boolean;
    asiaLoaded: boolean;
  }>({
    europe: [],
    asia: [],
    europeLoaded: false,
    asiaLoaded: false,
  });
  
  // Handle tab change with smooth animation
  const handleTabChange = useCallback((newTab: Tab) => {
    if (newTab === activeTab) return;
    
    // Clear search when changing tabs
    setSearchQuery("");
    setSearchResults([]);
    
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
  const tabDataCache = useRef<Record<string, { data: MarketItem[]; headerCards: ChipData[]; timestamp: number }>>({})

  // WebSocket for real-time prices
  const { subscribe: wsSubscribe, unsubscribe: wsUnsubscribe, isConnected: wsConnected } = useWebSocket();
  const currentSubscribedSymbolsRef = useRef<string[]>([]);

  // Real-time price refresh - polls store every 500ms for near-instant updates
  const [priceUpdateTrigger, setPriceUpdateTrigger] = useState(0);
  const priceRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh prices - MAXIMUM SPEED for instant WebSocket updates
  useEffect(() => {
    const startupDelay = setTimeout(() => {
      priceRefreshIntervalRef.current = setInterval(() => {
        setPriceUpdateTrigger(prev => prev + 1);
      }, 100); // 100ms = 10 updates/sec for ultra-fast prices
    }, 300); // 300ms initial delay

    return () => {
      clearTimeout(startupDelay);
      if (priceRefreshIntervalRef.current) {
        clearInterval(priceRefreshIntervalRef.current);
      }
    };
  }, []);

  // NO API POLLING - WebSocket handles ALL real-time price updates
  // This saves 700+ API credits/minute and makes tab switching instant

  const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || "";
  const BASE_URL = "https://financialmodelingprep.com/api/v3";

  // Popular US stocks for Twelve Data (most active/popular)
  const US_STOCKS_TWELVE = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "UNH", "JNJ",
    "V", "XOM", "WMT", "JPM", "MA", "PG", "HD", "CVX", "MRK", "ABBV",
    "LLY", "PEP", "KO", "COST", "AVGO", "TMO", "MCD", "CSCO", "ACN", "ABT",
    "DHR", "NEE", "WFC", "LIN", "ADBE", "TXN", "CRM", "AMD", "PM", "ORCL",
    "BMY", "UPS", "RTX", "QCOM", "HON", "UNP", "INTC", "IBM", "CAT", "BA"
  ];

  // Extended crypto list for Twelve Data (format: BTC/USD)
  const CRYPTO_SYMBOLS_TWELVE = [
    "BTC/USD", "ETH/USD", "BNB/USD", "XRP/USD", "ADA/USD", "SOL/USD", "DOGE/USD", "DOT/USD",
    "MATIC/USD", "LTC/USD", "SHIB/USD", "TRX/USD", "AVAX/USD", "LINK/USD", "ATOM/USD",
    "UNI/USD", "XLM/USD", "XMR/USD", "ETC/USD", "BCH/USD", "ALGO/USD", "VET/USD",
    "FIL/USD", "ICP/USD", "HBAR/USD", "MANA/USD", "SAND/USD", "AXS/USD", "THETA/USD",
    "XTZ/USD", "EOS/USD", "MKR/USD", "NEO/USD", "FLOW/USD", "CHZ/USD", "ENJ/USD",
    "ZEC/USD", "BAT/USD", "DASH/USD", "COMP/USD", "YFI/USD", "SNX/USD", "SUSHI/USD",
    "CRV/USD", "1INCH/USD", "GRT/USD", "AAVE/USD", "APE/USD", "ARB/USD", "OP/USD"
  ];

  // Popular ETFs for Twelve Data
  const ETF_SYMBOLS_TWELVE = [
    "SPY", "VOO", "VTI", "QQQ", "IVV", "VEA", "IEFA", "VWO", "VTV", "IEMG",
    "BND", "AGG", "VUG", "IJR", "IWM", "VIG", "SCHD", "VYM", "VGT", "XLF",
    "XLK", "XLE", "XLV", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC",
    "ARKK", "ARKW", "ARKG", "ARKF", "ARKQ", "DIA", "IWF", "IWD", "EFA", "EEM",
    "GLD", "SLV", "USO", "TLT", "LQD", "HYG", "EMB", "TIP", "VCIT", "VCSH"
  ];

  // Extended bond ETFs list (30+ bonds)
  const BOND_SYMBOLS = [
    "TLT", "AGG", "BND", "VCIT", "LQD", "HYG", "JNK", "MUB", "SHY", "IEF",
    "GOVT", "TIP", "BNDX", "EMB", "VCSH", "VGSH", "VGIT", "VGLT", "BSV", "BIV",
    "BLV", "SCHZ", "SPAB", "IAGG", "IGIB", "USIG", "SPTL", "SPLB", "SPSB", "FLOT",
    "MINT", "NEAR", "JPST", "ICSH", "PULS", "VMBS", "MBB", "GNMA", "SCHO", "SCHR"
  ];

  // European stocks - Major European companies (ADRs and European stocks)
  const EUROPE_STOCKS = [
    // UK
    "BP", "SHEL", "HSBC", "RIO", "GSK", "AZN", "UL", "BTI", "NGG", "VOD",
    // Germany
    "SAP", "DB", "BASFY", "SIEGY", "DTEGY", "VWAGY", "BMWYY", "ADDYY",
    // France
    "TTE", "SNY", "LVMUY", "OR", "ORAN",
    // Netherlands
    "ASML", "NXP", "ING", "PHG",
    // Switzerland
    "NVS", "UBS", "CS",
    // Spain/Italy
    "TEF", "ENEL", "ENI",
    // Nordic
    "NVO", "ERIC", "SPOT", "NXPI"
  ];

  // Asian stocks - Major Asian companies (ADRs and Asian stocks)
  const ASIA_STOCKS = [
    // China (SSE/SZSE)
    "BABA", "JD", "PDD", "BIDU", "NIO", "XPEV", "LI", "BILI", "TME", "NTES",
    "ZTO", "VNET", "FUTU", "TIGR", "TAL", "EDU", "YUMC", "YUM", "QFIN", "FINV",
    // Japan (Nikkei 225)
    "TM", "SONY", "HMC", "MUFG", "SMFG", "NMR", "MFG", "IX", "CAJ", "SNE",
    // Hong Kong (HSI)
    "TCEHY", "BEKE", "HTHT", "MPNGY", "CIHKY", "HKXCY",
    // South Korea
    "005930.KS", "SSNLF",
    // Taiwan
    "TSM", "UMC", "ASX",
    // India
    "INFY", "WIT", "IBN", "HDB", "SIFY", "RDY", "TTM",
    // Australia (ASX 200)
    "BHP", "RIO", "WBK", "ANZBY", "NABZY", "CBAPY", "TLSYY",
    // Singapore
    "SE", "GRAB"
  ];

  // Asian Market ETFs for indices
  const ASIA_ETFS = [
    "FXI",   // China Large-Cap (SSE proxy)
    "MCHI",  // MSCI China
    "EWJ",   // Japan (Nikkei 225 proxy)
    "EWH",   // Hong Kong (HSI proxy)
    "EWA",   // Australia (ASX 200 proxy)
    "EWT",   // Taiwan
    "EWY",   // South Korea
    "INDA",  // India
    "EWS",   // Singapore
    "VWO",   // Emerging Markets
  ];

  // Define header cards for each tab (dynamic for stocks based on region)
  const getStockHeaderSymbols = (): string[] => {
    if (stockRegion === "europe") {
      return ["EZU", "VGK", "FEZ", "HEDJ"]; // Europe ETFs
    } else if (stockRegion === "asia") {
      return ["FXI", "EWJ", "EWH", "EWA"]; // Asia ETFs (China, Japan, HK, Australia)
    }
    return ["SPY", "QQQ", "DIA", "IWM"]; // US indices
  };

  const TAB_HEADER_SYMBOLS: Record<Tab, string[]> = {
    stocks: getStockHeaderSymbols(),
    crypto: ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD"],
    etf: ["VOO", "VTI", "ARKK", "XLF"],
    bonds: ["TLT", "AGG", "BND", "LQD"],
    treasury: [],
    ipo: [],
    ma: [],
    dividends: ["VYM", "SCHD", "HDV", "DVY"],
  };

  const TAB_HEADER_NAMES: Record<string, string> = {
    // US Indices
    "SPY": "S&P 500",
    "QQQ": "Nasdaq 100",
    "DIA": "Dow Jones",
    "IWM": "Russell 2000",
    // Europe ETFs
    "EZU": "Eurozone",
    "VGK": "FTSE Europe",
    "FEZ": "Euro STOXX 50",
    "HEDJ": "Europe Hedged",
    // Asia ETFs
    "FXI": "China (SSE)",
    "EWJ": "Japan (N225)",
    "EWH": "Hong Kong (HSI)",
    "EWA": "Australia (ASX)",
    "MCHI": "MSCI China",
    "EWT": "Taiwan",
    "EWY": "South Korea",
    "INDA": "India",
    // Crypto
    "BTCUSD": "Bitcoin",
    "ETHUSD": "Ethereum",
    "SOLUSD": "Solana",
    "XRPUSD": "XRP",
    // ETFs
    "VOO": "Vanguard S&P",
    "VTI": "Total Market",
    "ARKK": "ARK Innovation",
    "XLF": "Financials",
    // Bonds
    "TLT": "20+ Year Treasury",
    "AGG": "US Aggregate",
    "BND": "Total Bond",
    "LQD": "Investment Grade",
    // Dividends
    "VYM": "High Dividend",
    "SCHD": "Schwab Dividend",
    "HDV": "High Dividend",
    "DVY": "Dividend Select",
  };

  // Fetch Treasury Rates with timeout
  const fetchTreasuryRates = async () => {
    setTreasuryLoading(true);
    try {
      const response = await fetchWithTimeout(
        `https://financialmodelingprep.com/stable/treasury-rates?apikey=${FMP_API_KEY}`,
        { timeout: 10000 }
      );
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setTreasuryRates(data[0]);
        // Store last 30 days for historical comparison
        setTreasuryHistory(data.slice(0, 30));
      }
    } catch {
    } finally {
      setTreasuryLoading(false);
    }
  };

  // Get rate change from previous day
  const getRateChange = (tenor: keyof TreasuryRate): { change: number; isPositive: boolean } | null => {
    if (!treasuryRates || treasuryHistory.length < 2) return null;
    const current = treasuryRates[tenor] as number;
    const previous = treasuryHistory[1]?.[tenor] as number;
    if (typeof current !== 'number' || typeof previous !== 'number') return null;
    const change = current - previous;
    return { change, isPositive: change >= 0 };
  };

  // Calculate yield curve data points for visualization
  const getYieldCurveData = () => {
    if (!treasuryRates) return [];
    return [
      { label: "1M", value: treasuryRates.month1, months: 1 },
      { label: "2M", value: treasuryRates.month2, months: 2 },
      { label: "3M", value: treasuryRates.month3, months: 3 },
      { label: "6M", value: treasuryRates.month6, months: 6 },
      { label: "1Y", value: treasuryRates.year1, months: 12 },
      { label: "2Y", value: treasuryRates.year2, months: 24 },
      { label: "5Y", value: treasuryRates.year5, months: 60 },
      { label: "7Y", value: treasuryRates.year7, months: 84 },
      { label: "10Y", value: treasuryRates.year10, months: 120 },
      { label: "20Y", value: treasuryRates.year20, months: 240 },
      { label: "30Y", value: treasuryRates.year30, months: 360 },
    ];
  };

  // Get spread between 2Y and 10Y (important recession indicator)
  const getYieldSpread = () => {
    if (!treasuryRates) return null;
    const spread = treasuryRates.year10 - treasuryRates.year2;
    return { spread, isInverted: spread < 0 };
  };

  // Fetch header cards data based on active tab with cache support (syncs with chart prices)
  const fetchHeaderCards = async () => {
    // Use dynamic symbols for stocks tab based on region
    const symbols = activeTab === "stocks" ? getStockHeaderSymbols() : TAB_HEADER_SYMBOLS[activeTab];
    if (symbols.length === 0) {
      setHeaderCards([]);
      return;
    }

    try {
      // Use cache-aware quote service to get prices synced with chart
      const data = await fetchQuotesWithCache(symbols, { timeout: 10000 });

      // Build change percents map for sparkline direction
      const changePercents: Record<string, number> = {};
      data.forEach((q: any) => {
        if (q.symbol) changePercents[q.symbol] = q.changesPercentage || 0;
      });

      // Use sparkline service with caching and batching
      const sparklineMap = await fetchSparklines(symbols, changePercents);

      if (Array.isArray(data) && data.length > 0) {
        const cards: ChipData[] = symbols.map((symbol) => {
          const quote = data.find((item: any) => item.symbol === symbol);
          if (quote) {
            return {
              name: TAB_HEADER_NAMES[symbol] || symbol,
              symbol: symbol,
              value: quote.price?.toFixed(2) || "0.00",
              change: quote.changesPercentage?.toFixed(2) || "0.00",
              isPositive: (quote.changesPercentage || 0) >= 0,
              sparklineData: sparklineMap[symbol] || [],
            };
          }
          return {
            name: TAB_HEADER_NAMES[symbol] || symbol,
            symbol: symbol,
            value: "...",
            change: "0.00",
            isPositive: true,
            sparklineData: [],
          };
        });

        setHeaderCards(cards);
      }
    } catch {
    }
  };

  // Search for tickers
  const searchTickers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);

    try {
      const searchRes = await fetchWithTimeout(
        `${BASE_URL}/search?query=${encodeURIComponent(query)}&limit=20&apikey=${FMP_API_KEY}`,
        { timeout: 10000 }
      );
      const searchData = await searchRes.json();

      if (searchData && Array.isArray(searchData)) {
        const symbols = searchData.slice(0, 10).map((item: any) => item.symbol).join(',');

        if (symbols) {
          const quoteRes = await fetchWithTimeout(
            `${BASE_URL}/quote/${symbols}?apikey=${FMP_API_KEY}`,
            { timeout: 10000 }
          );
          const quoteData = await quoteRes.json();

          if (quoteData && Array.isArray(quoteData)) {
            const formatted: MarketItem[] = quoteData.map((item: any) => ({
              symbol: item.symbol || "N/A",
              name: item.name || searchData.find((s: any) => s.symbol === item.symbol)?.name || item.symbol,
              price: item.price || 0,
              change: item.change || 0,
              changePercent: item.changesPercentage || 0,
              type: "stock" as any,
            }));

            setSearchResults(formatted);
          }
        }
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchTickers(text);
    }, 500);
  };

  // Fetch live data based on tab
  const fetchLiveData = async () => {
    setError(null);

    try {
      let url = "";

      switch (activeTab) {
        case "stocks":
          // Region-aware stock data fetching - same pattern as US for all regions
          {
            // ============================================================
            // US STOCKS - Use pre-loaded data from marketDataService (instant)
            // ============================================================
            if (stockRegion === "us") {
              const localStocks = marketDataService.getLiveData('stock');
              if (localStocks.length > 0) {
                const stockData: MarketItem[] = localStocks.map(item => {
                  const wsQuote = priceStore.getQuote(item.symbol);
                  return {
                    symbol: item.symbol,
                    name: item.name,
                    price: wsQuote?.price || item.price,
                    change: wsQuote?.change || item.change,
                    changePercent: wsQuote?.changePercent || item.changePercent,
                    type: "stock" as any,
                    exchange: "NYSE",
                  };
                });
                stockData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
                setData(stockData);
                setLoading(false);
                return;
              }
            }
            
            // ============================================================
            // EUROPE STOCKS - Initial API fetch + WebSocket updates
            // ============================================================
            if (stockRegion === "europe") {
              const europeSymbols = EUROPE_STOCKS.slice(0, 40);
              
              // Check if we have prices in priceStore already
              let hasData = europeSymbols.some(s => {
                const q = priceStore.getQuote(s);
                return q && q.price > 0;
              });
              
              if (hasData) {
                // Show cached data from priceStore
                const stockData: MarketItem[] = europeSymbols.map(symbol => {
                  const quote = priceStore.getQuote(symbol);
                  return {
                    symbol,
                    name: quote?.name || symbol,
                    price: quote?.price || 0,
                    change: quote?.change || 0,
                    changePercent: quote?.changePercent || 0,
                    type: "stock" as const,
                    exchange: "EU",
                  };
                });
                stockData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
                setData(stockData);
                setLoading(false);
              } else {
                // Fetch initial prices from API (one-time)
                setLoading(true);
                try {
                  const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
                  const batchSize = 8;
                  const stockData: MarketItem[] = [];
                  
                  for (let i = 0; i < europeSymbols.length; i += batchSize) {
                    const batch = europeSymbols.slice(i, i + batchSize);
                    const response = await fetch(
                      `https://api.twelvedata.com/quote?symbol=${batch.join(',')}&apikey=${TWELVE_DATA_API_KEY}`
                    );
                    const result = await response.json();
                    const quotes = result.symbol ? [result] : Object.values(result);
                    
                    for (const quote of quotes as any[]) {
                      if (quote && quote.symbol && !quote.code) {
                        const price = parseFloat(quote.close) || parseFloat(quote.price) || 0;
                        const change = parseFloat(quote.change) || 0;
                        const changePercent = parseFloat(quote.percent_change) || 0;
                        const previousClose = parseFloat(quote.previous_close) || price;
                        
                        stockData.push({
                          symbol: quote.symbol,
                          name: quote.name || quote.symbol,
                          price,
                          change,
                          changePercent,
                          type: "stock" as const,
                          exchange: "EU",
                        });
                        
                        // Store in priceStore for WebSocket updates
                        priceStore.setQuote({
                          symbol: quote.symbol,
                          price,
                          change,
                          changePercent,
                          previousClose,
                          name: quote.name || quote.symbol,
                        });
                      }
                    }
                  }
                  
                  stockData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
                  setData(stockData);
                } catch (error) {
                  console.log('Error fetching Europe stocks:', error);
                }
                setLoading(false);
              }
              
              // Subscribe to WebSocket for real-time updates
              if (wsConnected) {
                wsSubscribe(europeSymbols);
              }
              return;
            }
            
            // ============================================================
            // ASIA STOCKS - Initial API fetch + WebSocket updates
            // ============================================================
            if (stockRegion === "asia") {
              const asiaSymbols = [...ASIA_STOCKS.filter(s => !s.includes(".")), ...ASIA_ETFS].slice(0, 40);
              
              // Check if we have prices in priceStore already
              let hasData = asiaSymbols.some(s => {
                const q = priceStore.getQuote(s);
                return q && q.price > 0;
              });
              
              if (hasData) {
                // Show cached data from priceStore
                const stockData: MarketItem[] = asiaSymbols.map(symbol => {
                  const quote = priceStore.getQuote(symbol);
                  return {
                    symbol,
                    name: quote?.name || symbol,
                    price: quote?.price || 0,
                    change: quote?.change || 0,
                    changePercent: quote?.changePercent || 0,
                    type: "stock" as const,
                    exchange: "APAC",
                  };
                });
                stockData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
                setData(stockData);
                setLoading(false);
              } else {
                // Fetch initial prices from API (one-time)
                setLoading(true);
                try {
                  const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
                  const batchSize = 8;
                  const stockData: MarketItem[] = [];
                  
                  for (let i = 0; i < asiaSymbols.length; i += batchSize) {
                    const batch = asiaSymbols.slice(i, i + batchSize);
                    const response = await fetch(
                      `https://api.twelvedata.com/quote?symbol=${batch.join(',')}&apikey=${TWELVE_DATA_API_KEY}`
                    );
                    const result = await response.json();
                    const quotes = result.symbol ? [result] : Object.values(result);
                    
                    for (const quote of quotes as any[]) {
                      if (quote && quote.symbol && !quote.code) {
                        const price = parseFloat(quote.close) || parseFloat(quote.price) || 0;
                        const change = parseFloat(quote.change) || 0;
                        const changePercent = parseFloat(quote.percent_change) || 0;
                        const previousClose = parseFloat(quote.previous_close) || price;
                        
                        stockData.push({
                          symbol: quote.symbol,
                          name: quote.name || quote.symbol,
                          price,
                          change,
                          changePercent,
                          type: "stock" as const,
                          exchange: "APAC",
                        });
                        
                        // Store in priceStore for WebSocket updates
                        priceStore.setQuote({
                          symbol: quote.symbol,
                          price,
                          change,
                          changePercent,
                          previousClose,
                          name: quote.name || quote.symbol,
                        });
                      }
                    }
                  }
                  
                  stockData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
                  setData(stockData);
                } catch (error) {
                  console.log('Error fetching Asia stocks:', error);
                }
                setLoading(false);
              }
              
              // Subscribe to WebSocket for real-time updates
              if (wsConnected) {
                wsSubscribe(asiaSymbols);
              }
              return;
            }
            
            return;
          }
        case "crypto":
          // INSTANT: Use pre-loaded data from marketDataService + WebSocket prices
          {
            const localCrypto = marketDataService.getLiveData('crypto');

            if (localCrypto.length > 0) {
              // Instant - data already in memory from app startup
              const cryptoData: MarketItem[] = localCrypto.map(item => {
                const wsQuote = priceStore.getQuote(item.symbol);
                return {
                  symbol: item.symbol,
                  name: item.name,
                  price: wsQuote?.price || item.price,
                  change: wsQuote?.change || item.change,
                  changePercent: wsQuote?.changePercent || item.changePercent,
                  type: "crypto" as any,
                  exchange: "Crypto",
                };
              });
              cryptoData.sort((a, b) => b.price - a.price);
              setData(cryptoData);
              setLoading(false);
              return;
            }

            // Fallback: Use priceStore data from WebSocket (no API calls)
            const cryptoData: MarketItem[] = CRYPTO_SYMBOLS_TWELVE.slice(0, 50)
              .map(symbol => {
                const symbolNoSlash = symbol.replace("/", "");
                const quote = priceStore.getQuote(symbol) || priceStore.getQuote(symbolNoSlash);
                if (quote && quote.price > 0) {
                  return {
                    symbol: symbolNoSlash,
                    name: quote.name || symbolNoSlash,
                    price: quote.price,
                    change: quote.change || 0,
                    changePercent: quote.changePercent || 0,
                    type: "crypto" as const,
                    exchange: "Crypto",
                  } as MarketItem;
                }
                return null;
              })
              .filter((item): item is MarketItem => item !== null);

            cryptoData.sort((a, b) => b.price - a.price);
            setData(cryptoData);
            setLoading(false);
            return;
          }
        case "etf":
          // INSTANT: Use pre-loaded data from marketDataService + WebSocket prices
          {
            const localETFs = marketDataService.getLiveData('etf');

            if (localETFs.length > 0) {
              // Instant - data already in memory from app startup
              const etfData: MarketItem[] = localETFs.map(item => {
                const wsQuote = priceStore.getQuote(item.symbol);
                return {
                  symbol: item.symbol,
                  name: item.name,
                  price: wsQuote?.price || item.price,
                  change: wsQuote?.change || item.change,
                  changePercent: wsQuote?.changePercent || item.changePercent,
                  type: "etf" as any,
                  exchange: "NYSE",
                };
              });
              setData(etfData);
              setLoading(false);
              return;
            }

            // Fallback: Use priceStore data from WebSocket (no API calls)
            const etfData: MarketItem[] = ETF_SYMBOLS_TWELVE.slice(0, 50)
              .map(symbol => {
                const quote = priceStore.getQuote(symbol);
                if (quote && quote.price > 0) {
                  return {
                    symbol,
                    name: quote.name || symbol,
                    price: quote.price,
                    change: quote.change || 0,
                    changePercent: quote.changePercent || 0,
                    type: "etf" as const,
                    exchange: "NYSE",
                  } as MarketItem;
                }
                return null;
              })
              .filter((item): item is MarketItem => item !== null);

            setData(etfData);
            setLoading(false);
            return;
          }
        case "bonds":
          // Fetch extended bond list
          url = `${BASE_URL}/quote/${BOND_SYMBOLS.join(",")}?apikey=${FMP_API_KEY}`;
          break;
        case "ipo":
          url = `https://financialmodelingprep.com/stable/ipos-calendar?apikey=${FMP_API_KEY}`;
          break;
        case "ma":
          url = `https://financialmodelingprep.com/stable/mergers-acquisitions-latest?page=0&limit=100&apikey=${FMP_API_KEY}`;
          break;
        case "dividends":
          break;
        default:
          url = `${BASE_URL}/stock_market/actives?apikey=${FMP_API_KEY}`;
      }

      // Special handling for dividends tab
      if (activeTab === "dividends") {
        const dividendStocks = ["AAPL", "MSFT", "JNJ", "PG", "KO", "PEP", "VZ", "T", "XOM", "CVX", "JPM", "BAC", "WMT", "HD", "MCD", "ABBV", "MRK", "PFE", "INTC", "IBM"];

        const dividendPromises = dividendStocks.map(async (symbol) => {
          try {
            const res = await fetchWithTimeout(
              `https://financialmodelingprep.com/stable/dividends?symbol=${symbol}&apikey=${FMP_API_KEY}`,
              { timeout: 10000 }
            );
            const divData = await res.json();
            if (Array.isArray(divData) && divData.length > 0) {
              const latest = divData[0];
              return {
                symbol: latest.symbol || symbol,
                name: symbol,
                price: 0,
                change: 0,
                changePercent: 0,
                type: "stock" as any,
                dividend: latest.dividend || latest.adjDividend || 0,
                dividendYield: (latest.yield || 0) * 100,
                paymentDate: latest.paymentDate || "N/A",
                recordDate: latest.recordDate || "N/A",
                declarationDate: latest.declarationDate || "N/A",
                frequency: latest.frequency || "Quarterly",
              };
            }
            return null;
          } catch {
            return null;
          }
        });

        const dividendResults = await Promise.all(dividendPromises);
        const validDividends = dividendResults.filter((d) => d !== null) as MarketItem[];
        validDividends.sort((a, b) => (b.dividendYield || 0) - (a.dividendYield || 0));
        
        setData(validDividends);
        setLoading(false);
        return;
      }

      const res = await fetchWithTimeout(url, { timeout: 15000 });
      const json = await res.json();

      if (json.Error || json.error) {
        throw new Error(json.Error || json.error);
      }

      let cleaned: MarketItem[] = [];

      if (Array.isArray(json)) {
        if (activeTab === "ipo") {
          cleaned = json
            .filter((item: any) => item.symbol)
            .map((item: any) => ({
              symbol: item.symbol || "N/A",
              name: item.company || item.name || item.symbol || "Unknown",
              price: parseFloat(item.price) || 0,
              priceRange: item.priceRange || (item.price ? `$${item.price}` : "N/A"),
              exchange: item.exchange || "N/A",
              ipoDate: item.date || "N/A",
              status: item.status || "Upcoming",
              change: 0,
              changePercent: 0,
              type: "stock" as any,
            }))
            .slice(0, 100); // Increased from 20 to 100
        } else if (activeTab === "ma") {
          cleaned = json
            .map((item: any) => ({
              symbol: item.targetedSymbol || item.symbol || "N/A",
              name: item.targetedCompanyName || "Unknown",
              targetCompany: item.targetedCompanyName || "Unknown Target",
              acquirerCompany: item.companyName || "Unknown Acquirer",
              dealDate: item.transactionDate || item.acceptedDate || "N/A",
              dealValue: "Undisclosed",
              dealType: "Acquisition",
              price: 0,
              change: 0,
              changePercent: 0,
              type: "stock" as any,
            }))
            .slice(0, 100); // Increased from 20 to 100
        } else {
          cleaned = json.map((item: any) => ({
            symbol: item.symbol || item.ticker || "N/A",
            name: item.companyName || item.name || item.symbol || "Unknown",
            price: item.price || item.closePrice || 0,
            change: item.changes || item.change || 0,
            changePercent: item.changesPercentage || 0,
            type: activeTab as any,
            exchange: item.exchange || item.exchangeShortName || "N/A",
          })).slice(0, 100); // Increased from 20 to 100
        }
      }

      // Merge with global price store (prioritizes chart-synced prices)
      const mergedData = cleaned.map(item => {
        const storeQuote = priceStore.getQuote(item.symbol);
        if (storeQuote?.price) {
          return { ...item, price: storeQuote.price };
        }
        return item;
      });

      // Update price store with fetched data
      priceStore.setQuotes(mergedData.map(item => ({
        symbol: item.symbol,
        price: item.price,
        change: item.change,
        changePercent: item.changePercent,
        name: item.name,
      })));

      setData(mergedData);
    } catch (err: any) {
      setError(err.message || "Network error. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch treasury rates on mount
  useEffect(() => {
    fetchTreasuryRates();
  }, []);

  // WebSocket handles all real-time prices - no prefetch API calls needed

  // Update cache when data changes successfully
  useEffect(() => {
    if (data.length > 0 && !loading) {
      const cacheKey = activeTab === "stocks" ? `${activeTab}-${stockRegion}` : activeTab;
      tabDataCache.current[cacheKey] = {
        data: data,
        headerCards: headerCards,
        timestamp: Date.now(),
      };
    }
  }, [data, headerCards, loading, activeTab, stockRegion]);

  useEffect(() => {
    // Generate cache key based on tab and region
    const cacheKey = activeTab === "stocks" ? `${activeTab}-${stockRegion}` : activeTab;
    const cached = tabDataCache.current[cacheKey];

    // Reset WebSocket subscription tracking
    lastSubscribedTabRef.current = '';

    // ================================================================
    // INSTANT REGION SWITCHING FOR STOCKS
    // ================================================================
    if (activeTab === "stocks") {
      // US - use marketDataService (pre-loaded)
      if (stockRegion === "us") {
        const localStocks = marketDataService.getLiveData('stock');
        if (localStocks.length > 0) {
          const stockData = localStocks.map(item => {
            const wsQuote = priceStore.getQuote(item.symbol);
            return {
              symbol: item.symbol,
              name: item.name,
              price: wsQuote?.price || item.price,
              change: wsQuote?.change || item.change,
              changePercent: wsQuote?.changePercent || item.changePercent,
              type: "stock" as const,
              exchange: "NYSE",
            };
          });
          stockData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
          setData(stockData);
          setLoading(false);
          fetchHeaderCards();
          return;
        }
      }
      
      // Europe - check priceStore first, fetch if needed
      if (stockRegion === "europe") {
        const europeSymbols = EUROPE_STOCKS.slice(0, 40);
        const hasData = europeSymbols.some(s => {
          const q = priceStore.getQuote(s);
          return q && q.price > 0;
        });
        
        if (hasData) {
          // Show cached data instantly
          const stockData: MarketItem[] = europeSymbols.map(symbol => {
            const quote = priceStore.getQuote(symbol);
            return {
              symbol,
              name: quote?.name || symbol,
              price: quote?.price || 0,
              change: quote?.change || 0,
              changePercent: quote?.changePercent || 0,
              type: "stock" as const,
              exchange: "EU",
            };
          });
          stockData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
          setData(stockData);
          setLoading(false);
          if (wsConnected) wsSubscribe(europeSymbols);
          fetchHeaderCards();
          return;
        }
        // No cached data - fetch via fetchLiveData
        setLoading(true);
        fetchLiveData();
        fetchHeaderCards();
        return;
      }
      
      // Asia - check priceStore first, fetch if needed
      if (stockRegion === "asia") {
        const asiaSymbols = [...ASIA_STOCKS.filter(s => !s.includes(".")), ...ASIA_ETFS].slice(0, 40);
        const hasData = asiaSymbols.some(s => {
          const q = priceStore.getQuote(s);
          return q && q.price > 0;
        });
        
        if (hasData) {
          // Show cached data instantly
          const stockData: MarketItem[] = asiaSymbols.map(symbol => {
            const quote = priceStore.getQuote(symbol);
            return {
              symbol,
              name: quote?.name || symbol,
              price: quote?.price || 0,
              change: quote?.change || 0,
              changePercent: quote?.changePercent || 0,
              type: "stock" as const,
              exchange: "APAC",
            };
          });
          stockData.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
          setData(stockData);
          setLoading(false);
          if (wsConnected) wsSubscribe(asiaSymbols);
          fetchHeaderCards();
          return;
        }
        // No cached data - fetch via fetchLiveData
        setLoading(true);
        fetchLiveData();
        fetchHeaderCards();
        return;
      }
    }

    // ================================================================
    // OTHER TABS - Use tabDataCache
    // ================================================================
    
    // Clear old data only for non-cached switches
    setData([]);
    setHeaderCards([]);

    // INSTANT TAB SWITCHING: Show cached data immediately if available
    if (cached && cached.data.length > 0) {
      // Validate cache matches current tab type
      const firstItem = cached.data[0];
      let isValidCache = true;

      if (activeTab === "crypto") {
        isValidCache = firstItem.symbol?.endsWith('USD') || firstItem.symbol?.includes('/') || firstItem.type === 'crypto';
      } else if (activeTab === "etf") {
        isValidCache = !firstItem.symbol?.endsWith('USD') || firstItem.symbol?.length > 7;
      }

      if (isValidCache) {
        setData(cached.data);
        setHeaderCards(cached.headerCards);
        setLoading(false);
        return;
      }
    }

    // Only fetch from API if no valid cache (first time visiting tab/region)
    setLoading(true);
    fetchLiveData();
    fetchHeaderCards();

    // NO POLLING INTERVAL - WebSocket handles all real-time updates
    // This saves 100+ API credits/minute and makes tab switching instant

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [activeTab, stockRegion]);

  // NO focus refresh needed - WebSocket provides real-time updates

  // Track the last subscribed tab to prevent duplicate subscriptions
  const lastSubscribedTabRef = useRef<string>('');

  // Subscribe to WebSocket for real-time updates
  // Unsubscribe from old symbols when switching tabs to prevent hitting 50 symbol limit
  useEffect(() => {
    if (!wsConnected || data.length === 0) return;

    // Validate that data matches the current tab before subscribing
    const firstItem = data[0];
    if (!firstItem) return;

    let newSymbols: string[] = [];

    if (activeTab === "crypto") {
      // Verify data is actually crypto (symbols end in USD)
      if (!firstItem.symbol?.endsWith('USD') && !firstItem.type?.includes('crypto')) {
        return;
      }
      // Convert crypto symbols to Twelve Data format (BTC/USD format for WebSocket)
      newSymbols = data
        .map(item => {
          const sym = item.symbol;
          if (sym && sym.endsWith('USD')) {
            return sym.slice(0, -3) + '/USD'; // BTCUSD -> BTC/USD
          }
          return sym;
        })
        .filter(Boolean)
        .slice(0, 100); // Pro plan: MAX_SYMBOLS=800, plenty of room for cryptos!
    } else if (activeTab === "etf" || activeTab === "stocks") {
      // Verify data matches tab type - reject crypto symbols
      if (firstItem.symbol?.endsWith('USD') && firstItem.symbol?.length <= 7) {
        return;
      }
      // Subscribe to ALL displayed symbols - Pro plan has 1000 WS credits!
      // MAX_SYMBOLS=800, plenty of room for real-time updates
      newSymbols = data
        .map(item => item.symbol)
        .filter(s => s && !s.includes('.WT') && !s.includes('.WS')) // Exclude warrants
        .slice(0, 200); // Subscribe to top 200 for real-time updates
    }

    // Skip if already subscribed to same symbols (include region for stocks)
    const tabKey = activeTab === "stocks" 
      ? `${activeTab}-${stockRegion}-${newSymbols.slice(0, 5).join(',')}`
      : `${activeTab}-${newSymbols.slice(0, 5).join(',')}`;
    if (lastSubscribedTabRef.current === tabKey) return;

    // Unsubscribe from old explore page symbols before subscribing to new ones
    if (currentSubscribedSymbolsRef.current.length > 0) {
      wsUnsubscribe(currentSubscribedSymbolsRef.current);
    }

    lastSubscribedTabRef.current = tabKey;
    currentSubscribedSymbolsRef.current = newSymbols;

    if (newSymbols.length > 0) {
      wsSubscribe(newSymbols);
    }
  }, [wsConnected, activeTab, stockRegion, data, wsSubscribe, wsUnsubscribe]);

  // Reactive live data - updates every 500ms for real-time price display
  const liveData = useMemo(() => {
    return data.map(item => {
      // For crypto, try both formats and use the most recent one
      // WebSocket stores as "BTC/USD", API fetch stores as "BTCUSD"
      let quote = priceStore.getQuote(item.symbol);

      if (item.symbol?.endsWith('USD') && item.symbol?.length <= 10) {
        // Try slash format for crypto: BTCUSD -> BTC/USD
        const slashSymbol = item.symbol.slice(0, -3) + '/USD';
        const slashQuote = priceStore.getQuote(slashSymbol);

        // Use the more recent quote (WebSocket updates have later timestamps)
        if (slashQuote && slashQuote.price > 0) {
          if (!quote || (slashQuote.updatedAt > (quote.updatedAt || 0))) {
            quote = slashQuote;
          }
        }
      }

      if (quote && quote.price > 0) {
        return {
          ...item,
          price: quote.price,
          change: quote.change ?? item.change,
          changePercent: quote.changePercent ?? item.changePercent,
        };
      }
      return item;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, priceUpdateTrigger]);

  const displayData = searchQuery ? searchResults : liveData;

  // Memoized renderItem for better FlatList performance
  const renderItem = useCallback(({ item, index }: { item: MarketItem; index: number }) => {
    const isPositive = item.changePercent >= 0;
    
    // M&A-specific layout
    if (activeTab === "ma") {
      return (
        <TouchableOpacity
          style={styles.maCard}
          activeOpacity={0.7}
          onPress={() => item.symbol !== "N/A" && router.push(`/symbol/${item.symbol}/chart`)}
        >
          <View style={styles.maTopSection}>
            <View style={styles.maCompanyBox}>
              <View style={[styles.maIconCircle, { backgroundColor: "#dbeafe" }]}>
                <Ionicons name="business" size={18} color="#3b82f6" />
              </View>
              <View style={styles.maCompanyInfo}>
                <Text style={styles.maCompanyLabel}>Acquirer</Text>
                <Text style={styles.maCompanyName} numberOfLines={2}>
                  {item.acquirerCompany || "Unknown Acquirer"}
                </Text>
              </View>
            </View>
            
            <View style={styles.maCenterArrow}>
              <View style={styles.arrowCircle}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </View>
            
            <View style={styles.maCompanyBox}>
              <View style={[styles.maIconCircle, { backgroundColor: "#fce7f3" }]}>
                <Ionicons name="business-outline" size={18} color="#ec4899" />
              </View>
              <View style={styles.maCompanyInfo}>
                <Text style={styles.maCompanyLabel}>Target</Text>
                <Text style={styles.maCompanyName} numberOfLines={2}>
                  {item.targetCompany || "Unknown Target"}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.maBottomSection}>
            <View style={styles.maBottomItem}>
              <Text style={styles.maBottomLabel}>Deal Date</Text>
              <Text style={styles.maBottomValue}>
                {item.dealDate && item.dealDate !== "N/A" 
                  ? new Date(item.dealDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.maBottomItem}>
              <Text style={styles.maBottomLabel}>Deal Value</Text>
              <Text style={styles.maBottomValue}>
                {item.dealValue && item.dealValue !== "N/A" && item.dealValue !== "Undisclosed"
                  ? (typeof item.dealValue === 'number' 
                    ? `$${(item.dealValue / 1e9).toFixed(2)}B` 
                    : item.dealValue)
                  : 'Undisclosed'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    
    // IPO-specific layout
    if (activeTab === "ipo") {
      const statusColor = item.status === "Priced" ? "#00C853" : "#2196F3";
      
      return (
        <TouchableOpacity
          style={styles.ipoCard}
          activeOpacity={0.7}
          onPress={() => router.push(`/symbol/${item.symbol}/chart`)}
        >
          <View style={styles.ipoHeader}>
            <StockLogo 
              symbol={item.symbol} 
              size={Platform.OS === 'android' ? 36 : 40} 
              style={{ marginRight: Platform.OS === 'android' ? 10 : 12 }}
            />
            <View style={styles.ipoLeft}>
              <Text style={styles.ipoCompany} numberOfLines={1}>{item.name}</Text>
              <View style={styles.ipoMetaRow}>
                <Text style={styles.ipoSymbol}>{item.symbol}</Text>
                <Text style={styles.ipoDot}>•</Text>
                <Text style={styles.ipoExchange}>{item.exchange}</Text>
              </View>
            </View>
            <View style={[styles.ipoStatusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.ipoStatus, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
          
          <View style={styles.ipoDetails}>
            <View style={styles.ipoDetailItem}>
              <Text style={styles.ipoDetailLabel}>IPO Date</Text>
              <Text style={styles.ipoDetailValue}>
                {item.ipoDate ? new Date(item.ipoDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                }) : 'N/A'}
              </Text>
            </View>
            <View style={styles.ipoDetailItem}>
              <Text style={styles.ipoDetailLabel}>Price</Text>
              <Text style={styles.ipoDetailValue}>{item.priceRange}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Dividends-specific layout
    if (activeTab === "dividends") {
      const yieldColor = (item.dividendYield || 0) >= 3 ? "#00C853" : "#2196F3";
      
      return (
        <TouchableOpacity
          style={styles.dividendCard}
          activeOpacity={0.7}
          onPress={() => router.push(`/symbol/${item.symbol}/chart`)}
        >
          <View style={styles.dividendHeader}>
            <StockLogo 
              symbol={item.symbol} 
              size={Platform.OS === 'android' ? 36 : 40} 
              style={{ marginRight: Platform.OS === 'android' ? 10 : 12 }}
            />
            <View style={styles.dividendLeft}>
              <View style={styles.dividendSymbolRow}>
                <Text style={styles.dividendSymbol}>{item.symbol}</Text>
                <View style={[styles.dividendFreqBadge]}>
                  <Text style={styles.dividendFreqText}>{item.frequency}</Text>
                </View>
              </View>
              <Text style={styles.dividendCompany} numberOfLines={1}>{item.name}</Text>
            </View>
            <View style={styles.dividendRight}>
              <View style={[styles.dividendYieldBadge, { backgroundColor: `${yieldColor}15` }]}>
                <Ionicons name="trending-up" size={14} color={yieldColor} />
                <Text style={[styles.dividendYieldText, { color: yieldColor }]}>
                  {(item.dividendYield || 0).toFixed(2)}%
                </Text>
              </View>
              <Text style={styles.dividendYieldLabel}>Yield</Text>
            </View>
          </View>
          
          <View style={styles.dividendDetails}>
            <View style={styles.dividendDetailItem}>
              <Text style={styles.dividendDetailLabel}>Dividend</Text>
              <Text style={styles.dividendDetailValue}>
                ${(item.dividend || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.dividendDetailItem}>
              <Text style={styles.dividendDetailLabel}>Payment</Text>
              <Text style={styles.dividendDetailValue}>
                {item.paymentDate && item.paymentDate !== "N/A" 
                  ? new Date(item.paymentDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric'
                    })
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.dividendDetailItem}>
              <Text style={styles.dividendDetailLabel}>Ex-Date</Text>
              <Text style={styles.dividendDetailValue}>
                {item.recordDate && item.recordDate !== "N/A" 
                  ? new Date(item.recordDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric'
                    })
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    
    // Regular layout for other tabs
    return (
      <TouchableOpacity
        style={styles.itemRow}
        activeOpacity={0.7}
        onPress={() => router.push(`/symbol/${item.symbol}/chart`)}
      >
        <View style={styles.itemLeft}>
          <View style={styles.rankBadge}>
            <Text style={styles.itemRank}>{index + 1}</Text>
          </View>
          <StockLogo 
            symbol={item.symbol} 
            size={Platform.OS === 'android' ? 32 : 36} 
            style={{ marginRight: Platform.OS === 'android' ? 8 : 10 }}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemSymbol}>{item.symbol}</Text>
          </View>
        </View>
        <View style={styles.itemRight}>
          <AnimatedPrice
            value={item.price}
            style={styles.itemPrice}
            flashOnChange={true}
            decimals={2}
          />
          <View style={[styles.changeBadge, isPositive ? styles.changeBadgePositive : styles.changeBadgeNegative]}>
            <Ionicons
              name={isPositive ? "arrow-up" : "arrow-down"}
              size={12}
              color={isPositive ? "#00C853" : "#FF1744"}
            />
            <AnimatedChange
              value={item.changePercent}
              style={{ ...styles.changeText, color: isPositive ? "#00C853" : "#FF1744" }}
              showArrow={false}
              flashOnChange={true}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [activeTab, router]);

  // Header Cards Section
  const renderHeaderCards = () => {
    // Don't show header cards for IPO, M&A, Treasury, and Dividends tabs
    if (['ipo', 'ma', 'treasury', 'dividends'].includes(activeTab)) return null;
    if (headerCards.length === 0 || searchQuery) return null;

    return (
      <View style={styles.headerCardsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.headerCardsContent}
        >
          {headerCards.map((card) => (
            <HeaderCard
              key={card.symbol}
              item={card}
              onPress={() => router.push(`/symbol/${card.symbol}/chart`)}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  if (loading && data.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00C853" />
          <Text style={styles.loadingText}>Loading markets...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header with Search */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Explore</Text>
        </View>
        <View style={styles.headerRight}>
          {showSearch ? (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search markets..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={() => Keyboard.dismiss()}
                onBlur={() => {
                  if (!searchQuery) setShowSearch(false);
                }}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowSearch(true)} style={styles.searchButton}>
              <Ionicons name="search" size={22} color="#111827" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sticky Tabs */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(["stocks", "crypto", "etf", "bonds", "treasury", "ipo", "ma", "dividends"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => handleTabChange(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === "stocks" ? "Stocks" :
                 tab === "crypto" ? "Crypto" :
                 tab === "etf" ? "ETFs" :
                 tab === "bonds" ? "Bonds" :
                 tab === "treasury" ? "Treasury" :
                 tab === "ipo" ? "IPOs" :
                 tab === "ma" ? "M&A" : "Dividends"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Region Selector for Stocks */}
      {activeTab === "stocks" && (
        <View style={styles.regionBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {([
              { key: "us", label: "US", subLabel: "S&P 500", icon: "flag" },
              { key: "europe", label: "Europe", subLabel: "STOXX", icon: "globe" },
              { key: "asia", label: "Asia", subLabel: "SSE・N225・HSI・ASX", icon: "earth" },
            ] as { key: StockRegion; label: string; subLabel: string; icon: string }[]).map((region) => (
              <TouchableOpacity
                key={region.key}
                onPress={() => setStockRegion(region.key)}
                style={[styles.regionChip, stockRegion === region.key && styles.regionChipActive]}
              >
                <Ionicons
                  name={region.icon as any}
                  size={14}
                  color={stockRegion === region.key ? "#fff" : "#666"}
                />
                <View>
                  <Text style={[styles.regionText, stockRegion === region.key && styles.regionTextActive]}>
                    {region.label}
                  </Text>
                  {stockRegion === region.key && (
                    <Text style={styles.regionSubText}>{region.subLabel}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.regionInfo}>
            <Text style={styles.regionInfoText}>
              {data.length} stocks
            </Text>
          </View>
        </View>
      )}

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchLiveData} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Live Results */}
      <Animated.View 
        style={{ 
          flex: 1, 
          opacity: fadeAnim, 
          transform: [{ translateX: slideAnim }] 
        }}
      >
        {activeTab === "treasury" ? (
        <ScrollView
          style={styles.treasuryScrollView}
          contentContainerStyle={styles.treasuryContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {treasuryLoading ? (
            <View style={styles.treasuryLoadingState}>
              <ActivityIndicator size="large" color="#00C853" />
              <Text style={styles.emptyText}>Loading treasury rates...</Text>
            </View>
          ) : treasuryRates ? (
            <>
              {/* Header Section */}
              <View style={styles.treasuryHeader}>
                <View>
                  <Text style={styles.treasuryMainTitle}>US Treasury Yields</Text>
                  <Text style={styles.treasuryDateText}>
                    {new Date(treasuryRates.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                <TouchableOpacity onPress={fetchTreasuryRates} style={styles.treasuryRefreshBtn}>
                  <Ionicons name="refresh" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {/* Key Rates Hero Cards */}
              <View style={styles.treasuryHeroSection}>
                <View style={[styles.treasuryHeroCard, styles.treasuryHeroCardPrimary]}>
                  <View style={styles.treasuryHeroTop}>
                    <Text style={styles.treasuryHeroLabel}>10-Year Treasury</Text>
                    <View style={styles.treasuryHeroBadge}>
                      <Text style={styles.treasuryHeroBadgeText}>Benchmark</Text>
                    </View>
                  </View>
                  <Text style={styles.treasuryHeroRate}>{treasuryRates.year10?.toFixed(2)}%</Text>
                  {getRateChange("year10") && (
                    <View style={styles.treasuryHeroChange}>
                      <Ionicons
                        name={getRateChange("year10")!.isPositive ? "arrow-up" : "arrow-down"}
                        size={14}
                        color={getRateChange("year10")!.isPositive ? "#4ade80" : "#f87171"}
                      />
                      <Text style={[
                        styles.treasuryHeroChangeText,
                        getRateChange("year10")!.isPositive ? styles.treasuryHeroChangeUp : styles.treasuryHeroChangeDown
                      ]}>
                        {Math.abs(getRateChange("year10")!.change).toFixed(2)} bps
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.treasuryHeroSmallCards}>
                  <View style={styles.treasuryHeroCardSmall}>
                    <Text style={styles.treasuryHeroSmallLabel}>2-Year</Text>
                    <Text style={styles.treasuryHeroSmallRate}>{treasuryRates.year2?.toFixed(2)}%</Text>
                    {getRateChange("year2") && (
                      <View style={[
                        styles.treasuryHeroSmallChange,
                        getRateChange("year2")!.isPositive ? styles.changeUp : styles.changeDown
                      ]}>
                        <Ionicons
                          name={getRateChange("year2")!.isPositive ? "caret-up" : "caret-down"}
                          size={10}
                          color={getRateChange("year2")!.isPositive ? "#00C853" : "#FF1744"}
                        />
                        <Text style={getRateChange("year2")!.isPositive ? styles.positive : styles.negative}>
                          {Math.abs(getRateChange("year2")!.change).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.treasuryHeroCardSmall}>
                    <Text style={styles.treasuryHeroSmallLabel}>30-Year</Text>
                    <Text style={styles.treasuryHeroSmallRate}>{treasuryRates.year30?.toFixed(2)}%</Text>
                    {getRateChange("year30") && (
                      <View style={[
                        styles.treasuryHeroSmallChange,
                        getRateChange("year30")!.isPositive ? styles.changeUp : styles.changeDown
                      ]}>
                        <Ionicons
                          name={getRateChange("year30")!.isPositive ? "caret-up" : "caret-down"}
                          size={10}
                          color={getRateChange("year30")!.isPositive ? "#00C853" : "#FF1744"}
                        />
                        <Text style={getRateChange("year30")!.isPositive ? styles.positive : styles.negative}>
                          {Math.abs(getRateChange("year30")!.change).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Yield Spread Indicator */}
              {getYieldSpread() && (
                <View style={[
                  styles.yieldSpreadCard,
                  getYieldSpread()!.isInverted ? styles.yieldSpreadInverted : styles.yieldSpreadNormal
                ]}>
                  <View style={styles.yieldSpreadLeft}>
                    <Ionicons
                      name={getYieldSpread()!.isInverted ? "warning" : "checkmark-circle"}
                      size={24}
                      color={getYieldSpread()!.isInverted ? "#FF6B6B" : "#00C853"}
                    />
                    <View>
                      <Text style={styles.yieldSpreadLabel}>2Y-10Y Spread</Text>
                      <Text style={styles.yieldSpreadSubLabel}>
                        {getYieldSpread()!.isInverted ? "Inverted Curve" : "Normal Curve"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.yieldSpreadValue,
                    getYieldSpread()!.isInverted ? styles.yieldSpreadValueInverted : styles.yieldSpreadValueNormal
                  ]}>
                    {getYieldSpread()!.spread >= 0 ? "+" : ""}{(getYieldSpread()!.spread * 100).toFixed(0)} bps
                  </Text>
                </View>
              )}

              {/* Yield Curve Chart */}
              <View style={styles.yieldCurveSection}>
                <View style={styles.yieldCurveTitleRow}>
                  <Text style={styles.yieldCurveTitle}>Yield Curve</Text>
                  <View style={styles.yieldCurveLegend}>
                    <View style={[styles.yieldCurveLegendDot, { backgroundColor: "#00C853" }]} />
                    <Text style={styles.yieldCurveLegendText}>Normal</Text>
                    <View style={[styles.yieldCurveLegendDot, { backgroundColor: "#FF6B6B", marginLeft: 12 }]} />
                    <Text style={styles.yieldCurveLegendText}>Inverted</Text>
                  </View>
                </View>
                <View style={styles.yieldCurveChartContainer}>
                  <YieldCurveChart data={getYieldCurveData()} />
                  {/* X-axis labels */}
                  <View style={styles.yieldCurveLabels}>
                    {["1M", "3M", "6M", "1Y", "2Y", "5Y", "10Y", "30Y"].map((label) => (
                      <Text key={label} style={styles.yieldCurveLabel}>{label}</Text>
                    ))}
                  </View>
                </View>
              </View>

              {/* All Rates Grid */}
              <Text style={styles.treasurySectionTitle}>All Maturities</Text>

              {/* Short-Term */}
              <View style={styles.treasuryRateSection}>
                <View style={styles.treasuryRateSectionHeader}>
                  <View style={[styles.treasuryRateSectionIcon, { backgroundColor: "#dbeafe" }]}>
                    <Ionicons name="time-outline" size={16} color="#3b82f6" />
                  </View>
                  <Text style={styles.treasuryRateSectionTitle}>Short-Term</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.treasuryRateCardsRow}>
                    <TreasuryRateCard tenor="month1" label="1M" rate={treasuryRates.month1} change={getRateChange("month1")} isSelected={selectedTenor === "month1"} onPress={() => setSelectedTenor("month1")} />
                    <TreasuryRateCard tenor="month2" label="2M" rate={treasuryRates.month2} change={getRateChange("month2")} isSelected={selectedTenor === "month2"} onPress={() => setSelectedTenor("month2")} />
                    <TreasuryRateCard tenor="month3" label="3M" rate={treasuryRates.month3} change={getRateChange("month3")} isSelected={selectedTenor === "month3"} onPress={() => setSelectedTenor("month3")} />
                    <TreasuryRateCard tenor="month6" label="6M" rate={treasuryRates.month6} change={getRateChange("month6")} isSelected={selectedTenor === "month6"} onPress={() => setSelectedTenor("month6")} />
                  </View>
                </ScrollView>
              </View>

              {/* Medium-Term */}
              <View style={styles.treasuryRateSection}>
                <View style={styles.treasuryRateSectionHeader}>
                  <View style={[styles.treasuryRateSectionIcon, { backgroundColor: "#dcfce7" }]}>
                    <Ionicons name="calendar-outline" size={16} color="#00C853" />
                  </View>
                  <Text style={styles.treasuryRateSectionTitle}>Medium-Term</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.treasuryRateCardsRow}>
                    <TreasuryRateCard tenor="year1" label="1Y" rate={treasuryRates.year1} change={getRateChange("year1")} isSelected={selectedTenor === "year1"} onPress={() => setSelectedTenor("year1")} />
                    <TreasuryRateCard tenor="year2" label="2Y" rate={treasuryRates.year2} change={getRateChange("year2")} isSelected={selectedTenor === "year2"} onPress={() => setSelectedTenor("year2")} />
                    <TreasuryRateCard tenor="year5" label="5Y" rate={treasuryRates.year5} change={getRateChange("year5")} isSelected={selectedTenor === "year5"} onPress={() => setSelectedTenor("year5")} />
                    <TreasuryRateCard tenor="year7" label="7Y" rate={treasuryRates.year7} change={getRateChange("year7")} isSelected={selectedTenor === "year7"} onPress={() => setSelectedTenor("year7")} />
                  </View>
                </ScrollView>
              </View>

              {/* Long-Term */}
              <View style={styles.treasuryRateSection}>
                <View style={styles.treasuryRateSectionHeader}>
                  <View style={[styles.treasuryRateSectionIcon, { backgroundColor: "#fef3c7" }]}>
                    <Ionicons name="trending-up" size={16} color="#f59e0b" />
                  </View>
                  <Text style={styles.treasuryRateSectionTitle}>Long-Term</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.treasuryRateCardsRow}>
                    <TreasuryRateCard tenor="year10" label="10Y" rate={treasuryRates.year10} change={getRateChange("year10")} isSelected={selectedTenor === "year10"} onPress={() => setSelectedTenor("year10")} />
                    <TreasuryRateCard tenor="year20" label="20Y" rate={treasuryRates.year20} change={getRateChange("year20")} isSelected={selectedTenor === "year20"} onPress={() => setSelectedTenor("year20")} />
                    <TreasuryRateCard tenor="year30" label="30Y" rate={treasuryRates.year30} change={getRateChange("year30")} isSelected={selectedTenor === "year30"} onPress={() => setSelectedTenor("year30")} />
                  </View>
                </ScrollView>
              </View>

              {/* Info Cards */}
              <View style={styles.treasuryInfoSection}>
                <View style={styles.treasuryInfoCardNew}>
                  <View style={styles.treasuryInfoIconBox}>
                    <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
                  </View>
                  <View style={styles.treasuryInfoContent}>
                    <Text style={styles.treasuryInfoTitle}>What is the Yield Curve?</Text>
                    <Text style={styles.treasuryInfoText}>
                      The yield curve shows interest rates across different maturities. A normal curve slopes upward (longer terms = higher rates). An inverted curve can signal recession concerns.
                    </Text>
                  </View>
                </View>

                <View style={styles.treasuryInfoCardNew}>
                  <View style={styles.treasuryInfoIconBox}>
                    <Ionicons name="stats-chart-outline" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.treasuryInfoContent}>
                    <Text style={styles.treasuryInfoTitle}>Key Benchmarks</Text>
                    <Text style={styles.treasuryInfoText}>
                      The 10-year yield influences mortgage rates and is a key economic indicator. The 2Y-10Y spread is watched closely for recession signals.
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle" size={64} color="#e5e7eb" />
              <Text style={styles.emptyText}>Unable to load treasury rates</Text>
              <TouchableOpacity onPress={fetchTreasuryRates} style={styles.treasuryRetryBtn}>
                <Text style={styles.treasuryRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.symbol}-${index}`}
          contentContainerStyle={styles.listContainer}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          // Performance optimizations
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          ListEmptyComponent={
            searchQuery ? (
              searchLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color="#00C853" />
                  <Text style={styles.emptyText}>Searching...</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="search" size={64} color="#e5e7eb" />
                  <Text style={styles.emptyText}>No results for &quot;{searchQuery}&quot;</Text>
                  <Text style={styles.emptySubtext}>Try another symbol or company name</Text>
                </View>
              )
            ) : (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#00C853" />
                <Text style={styles.emptyText}>No data available</Text>
              </View>
            )
          }
          ListHeaderComponent={
            <>
              {/* Header Cards */}
              {renderHeaderCards()}

              {/* Section Title */}
              {!searchQuery && data.length > 0 ? (
                <Text style={styles.sectionTitle}>
                  {activeTab === "stocks" ? "Most Active" :
                   activeTab === "crypto" ? "Top Cryptos" :
                   activeTab === "etf" ? "Popular ETFs" :
                   activeTab === "bonds" ? "Bond ETFs" :
                   activeTab === "ipo" ? "IPO Calendar" :
                   activeTab === "ma" ? "Latest M&A Deals" : "Top Dividend Stocks"}
                </Text>
              ) : searchQuery ? (
                <Text style={styles.sectionTitle}>
                  Search Results
                </Text>
              ) : null}
            </>
          }
          refreshing={loading && data.length > 0}
          onRefresh={fetchLiveData}
          ListFooterComponent={<InlineAdBanner />}
        />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 16, color: "#666", fontSize: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: Platform.OS === 'android' ? 12 : 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: Platform.OS === 'android' ? 22 : 34, fontWeight: "800", color: "#000", letterSpacing: -0.5 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center" },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    width: 240,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#000",
    paddingVertical: 8,
  },
  // Header Cards Styles
  headerCardsContainer: {
    marginBottom: 16,
  },
  headerCardsContent: {
    paddingRight: 20,
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
    marginLeft: 8,
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
  tabBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: { 
    marginRight: 8, 
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  tabActive: { 
    backgroundColor: "#111827",
  },
  tabText: { fontSize: 14, color: "#6b7280", fontWeight: "600" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
  regionBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  regionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
    gap: 4,
  },
  regionChipActive: {
    backgroundColor: "#007AFF",
  },
  regionText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  regionTextActive: {
    color: "#fff",
  },
  regionSubText: {
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  regionInfo: {
    marginLeft: 8,
  },
  regionInfoText: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
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
  errorText: { color: "#fff", fontSize: 14, flex: 1 },
  retryBtn: { 
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retryText: { color: "#FF1744", fontWeight: "700", fontSize: 14 },
  listContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100, backgroundColor: "#fff" },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#111827", 
    marginBottom: 16, 
    marginTop: 8 
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemRank: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
  },
  itemInfo: { flex: 1 },
  itemSymbol: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 2 },
  itemName: { fontSize: 13, color: "#6b7280" },
  itemRight: { alignItems: "flex-end" },
  itemPrice: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 6 },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeBadgePositive: { backgroundColor: "#00C85315" },
  changeBadgeNegative: { backgroundColor: "#FF174415" },
  changeText: { fontSize: 13, fontWeight: "700", marginLeft: 4 },
  emptyState: { padding: 60, alignItems: "center" },
  emptyText: { fontSize: 18, color: "#6b7280", marginTop: 16, fontWeight: "600" },
  emptySubtext: { fontSize: 14, color: "#9ca3af", marginTop: 8 },
  // IPO-specific styles
  ipoCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ipoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  ipoLeft: {
    flex: 1,
    marginRight: 12,
  },
  ipoCompany: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  ipoMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ipoSymbol: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00C853",
  },
  ipoDot: {
    fontSize: 14,
    color: "#9ca3af",
    marginHorizontal: 6,
  },
  ipoExchange: {
    fontSize: 14,
    color: "#6b7280",
  },
  ipoStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ipoStatus: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  ipoDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  ipoDetailItem: {
    flex: 1,
  },
  ipoDetailLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "600",
  },
  ipoDetailValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "700",
  },
  // M&A-specific styles
  maCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  maTopSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  maCompanyBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  maIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  maCompanyInfo: {
    flex: 1,
  },
  maCompanyLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  maCompanyName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 17,
  },
  maCenterArrow: {
    marginHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6b7280",
    justifyContent: "center",
    alignItems: "center",
  },
  maBottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  maBottomItem: {
    flex: 1,
  },
  maBottomLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "600",
  },
  maBottomValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  // Dividend-specific styles
  dividendCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dividendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dividendLeft: {
    flex: 1,
    marginRight: 12,
  },
  dividendSymbolRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dividendSymbol: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginRight: 8,
  },
  dividendFreqBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dividendFreqText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  dividendCompany: {
    fontSize: 14,
    color: "#6b7280",
  },
  dividendRight: {
    alignItems: "flex-end",
  },
  dividendYieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  dividendYieldText: {
    fontSize: 16,
    fontWeight: "800",
  },
  dividendYieldLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    fontWeight: "600",
  },
  dividendDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  dividendDetailItem: {
    flex: 1,
  },
  dividendDetailLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "600",
  },
  dividendDetailValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "700",
  },
  // Treasury Section Styles
  treasurySection: {
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  treasurySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  treasuryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  treasurySectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  treasuryDate: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  treasuryRatesContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  treasuryRateItem: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 60,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  treasuryRateItemHighlight: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  treasuryRateLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },
  treasuryRateLabelHighlight: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    marginBottom: 4,
  },
  treasuryRateValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "700",
  },
  treasuryRateValueHighlight: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },
  treasuryError: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    padding: 20,
  },
  // New Treasury Tab Styles
  treasuryScrollView: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  treasuryContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  treasuryLoadingState: {
    padding: 60,
    alignItems: "center",
  },
  treasuryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  treasuryMainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  treasuryDateText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  treasuryRefreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  // Hero Section
  treasuryHeroSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  treasuryHeroCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
  },
  treasuryHeroCardPrimary: {
    backgroundColor: "#1e293b",
    flex: 1.5,
  },
  treasuryHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  treasuryHeroLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  treasuryHeroBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  treasuryHeroBadgeText: {
    fontSize: 10,
    color: "#fbbf24",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  treasuryHeroRate: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  treasuryHeroChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  treasuryHeroChangeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  treasuryHeroChangeUp: {
    color: "#4ade80",
  },
  treasuryHeroChangeDown: {
    color: "#f87171",
  },
  treasuryHeroSmallCards: {
    gap: 12,
    flex: 1,
  },
  treasuryHeroCardSmall: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  treasuryHeroSmallLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },
  treasuryHeroSmallRate: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  treasuryHeroSmallChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  changeUp: {
    backgroundColor: "rgba(0,200,83,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  changeDown: {
    backgroundColor: "rgba(255,23,68,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Yield Spread Card
  yieldSpreadCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  yieldSpreadNormal: {
    backgroundColor: "rgba(0,200,83,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,200,83,0.2)",
  },
  yieldSpreadInverted: {
    backgroundColor: "rgba(255,107,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.2)",
  },
  yieldSpreadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  yieldSpreadLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  yieldSpreadSubLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  yieldSpreadValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  yieldSpreadValueNormal: {
    color: "#00C853",
  },
  yieldSpreadValueInverted: {
    color: "#FF6B6B",
  },
  // Yield Curve Section
  yieldCurveSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  yieldCurveTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  yieldCurveTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  yieldCurveLegend: {
    flexDirection: "row",
    alignItems: "center",
  },
  yieldCurveLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  yieldCurveLegendText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  yieldCurveChartContainer: {
    marginTop: 8,
  },
  yieldCurveLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 35,
    marginTop: 8,
  },
  yieldCurveLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
  },
  // Rate Section
  treasuryRateSection: {
    marginBottom: 20,
  },
  treasuryRateSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  treasuryRateSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  treasuryRateSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  treasuryRateCardsRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 20,
  },
  // Rate Card Styles
  treasuryRateCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    minWidth: 85,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  treasuryRateCardSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f9ff",
  },
  treasuryRateCardTenor: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 6,
  },
  treasuryRateCardTenorSelected: {
    color: "#007AFF",
  },
  treasuryRateCardValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  treasuryRateCardValueSelected: {
    color: "#007AFF",
  },
  treasuryRateCardChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  treasuryRateCardChangeUp: {
    backgroundColor: "rgba(0,200,83,0.1)",
  },
  treasuryRateCardChangeDown: {
    backgroundColor: "rgba(255,23,68,0.1)",
  },
  treasuryRateCardChangeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  // Info Section
  treasuryInfoSection: {
    gap: 12,
    marginTop: 8,
  },
  treasuryInfoCardNew: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  treasuryInfoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  treasuryInfoContent: {
    flex: 1,
  },
  treasuryInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  treasuryInfoText: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 19,
  },
  treasuryRetryBtn: {
    marginTop: 16,
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  treasuryRetryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  // Legacy styles kept for compatibility
  treasuryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  treasuryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  treasuryCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  treasuryRatesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  treasuryRateBox: {
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 75,
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  treasuryRateBoxHighlight: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  treasuryRateTenor: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 6,
  },
  treasuryRateTenorHighlight: {
    color: "rgba(255,255,255,0.8)",
  },
  treasuryRatePercent: {
    fontSize: 18,
    color: "#1e293b",
    fontWeight: "800",
  },
  treasuryRatePercentHighlight: {
    color: "#fff",
  },
  treasuryInfoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
});
