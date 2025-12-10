// app/(tabs)/explore.tsx - WITH LARGER SECTION HEADER CARDS
import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2.2; // Wider cards, ~2.2 visible

type Tab = "stocks" | "crypto" | "etf" | "bonds" | "ipo" | "ma" | "dividends";

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

// Mini Sparkline Component
const MiniSparkline = ({ 
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

// Large Header Card Component
const HeaderCard = ({ 
  item, 
  onPress,
  showSparkline = true,
}: { 
  item: ChipData; 
  onPress: () => void;
  showSparkline?: boolean;
}) => {
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
          <Text style={styles.headerCardPrice}>
            ${item.value !== "..." ? Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "..."}
          </Text>
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
        <Text style={[
          styles.headerCardChangeText,
          item.isPositive ? styles.positive : styles.negative
        ]}>
          {item.isPositive ? "+" : ""}{item.change}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function Explore() {
  const [activeTab, setActiveTab] = useState<Tab>("stocks");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [data, setData] = useState<MarketItem[]>([]);
  const [searchResults, setSearchResults] = useState<MarketItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [headerCards, setHeaderCards] = useState<ChipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const FMP_API_KEY = "bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU";
  const BASE_URL = "https://financialmodelingprep.com/api/v3";

  // Define header cards for each tab
  const TAB_HEADER_SYMBOLS: Record<Tab, string[]> = {
    stocks: ["SPY", "QQQ", "DIA", "IWM"],
    crypto: ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD"],
    etf: ["VOO", "VTI", "ARKK", "XLF"],
    bonds: ["TLT", "AGG", "BND", "LQD"],
    ipo: [],
    ma: [],
    dividends: ["VYM", "SCHD", "HDV", "DVY"],
  };

  const TAB_HEADER_NAMES: Record<string, string> = {
    "SPY": "S&P 500",
    "QQQ": "Nasdaq 100",
    "DIA": "Dow Jones",
    "IWM": "Russell 2000",
    "BTCUSD": "Bitcoin",
    "ETHUSD": "Ethereum",
    "SOLUSD": "Solana",
    "XRPUSD": "XRP",
    "VOO": "Vanguard S&P",
    "VTI": "Total Market",
    "ARKK": "ARK Innovation",
    "XLF": "Financials",
    "TLT": "20+ Year Treasury",
    "AGG": "US Aggregate",
    "BND": "Total Bond",
    "LQD": "Investment Grade",
    "VYM": "High Dividend",
    "SCHD": "Schwab Dividend",
    "HDV": "High Dividend",
    "DVY": "Dividend Select",
  };

  // Fetch historical data for sparklines
  const fetchSparklineData = async (symbol: string): Promise<number[]> => {
    try {
      const response = await fetch(
        `${BASE_URL}/historical-chart/1hour/${symbol}?apikey=${FMP_API_KEY}`
      );
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        return data.slice(0, 24).map((item: any) => item.close).reverse();
      }
      return [];
    } catch (err) {
      console.error(`Sparkline fetch failed for ${symbol}:`, err);
      return [];
    }
  };

  // Fetch header cards data based on active tab
  const fetchHeaderCards = async () => {
    const symbols = TAB_HEADER_SYMBOLS[activeTab];
    if (symbols.length === 0) {
      setHeaderCards([]);
      return;
    }

    try {
      const symbolsStr = symbols.join(",");
      const response = await fetch(
        `${BASE_URL}/quote/${symbolsStr}?apikey=${FMP_API_KEY}`
      );
      const data = await response.json();

      // Fetch sparkline data for each symbol
      const sparklinePromises = symbols.map(symbol => fetchSparklineData(symbol));
      const sparklines = await Promise.all(sparklinePromises);

      if (Array.isArray(data) && data.length > 0) {
        const cards: ChipData[] = symbols.map((symbol, index) => {
          const quote = data.find((item: any) => item.symbol === symbol);
          if (quote) {
            return {
              name: TAB_HEADER_NAMES[symbol] || symbol,
              symbol: symbol,
              value: quote.price?.toFixed(2) || "0.00",
              change: quote.changesPercentage?.toFixed(2) || "0.00",
              isPositive: (quote.changesPercentage || 0) >= 0,
              sparklineData: sparklines[index] || [],
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
    } catch (err) {
      console.error("Header cards fetch failed:", err);
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
      const searchRes = await fetch(
        `${BASE_URL}/search?query=${encodeURIComponent(query)}&limit=20&apikey=${FMP_API_KEY}`
      );
      const searchData = await searchRes.json();

      if (searchData && Array.isArray(searchData)) {
        const symbols = searchData.slice(0, 10).map((item: any) => item.symbol).join(',');
        
        if (symbols) {
          const quoteRes = await fetch(
            `${BASE_URL}/quote/${symbols}?apikey=${FMP_API_KEY}`
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
    } catch (err) {
      console.error("Search error:", err);
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
    setLoading(true);
    setError(null);
    
    try {
      let url = "";
      
      switch (activeTab) {
        case "stocks":
          url = `${BASE_URL}/stock_market/actives?apikey=${FMP_API_KEY}`;
          break;
        case "crypto":
          url = `${BASE_URL}/quote/BTCUSD,ETHUSD,SOLUSD,ADAUSD,XRPUSD,DOGEUSD,MATICUSD,DOTUSD,LINKUSD,UNIUSD,AVAXUSD,LTCUSD?apikey=${FMP_API_KEY}`;
          break;
        case "etf":
          url = `${BASE_URL}/etf/list?apikey=${FMP_API_KEY}`;
          break;
        case "bonds":
          url = `${BASE_URL}/quote/TLT,AGG,BND,VCIT,LQD,HYG,JNK,MUB,SHY,IEF,GOVT,TIP?apikey=${FMP_API_KEY}`;
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
            const res = await fetch(
              `https://financialmodelingprep.com/stable/dividends?symbol=${symbol}&apikey=${FMP_API_KEY}`
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
          } catch (err) {
            console.error(`Failed to fetch dividend for ${symbol}:`, err);
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

      const res = await fetch(url);
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
            .slice(0, 20);
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
            .slice(0, 20);
        } else {
          cleaned = json.map((item: any) => ({
            symbol: item.symbol || item.ticker || "N/A",
            name: item.companyName || item.name || item.symbol || "Unknown",
            price: item.price || item.closePrice || 0,
            change: item.changes || item.change || 0,
            changePercent: item.changesPercentage || 0,
            type: activeTab as any,
          })).slice(0, 20);
        }
      }

      setData(cleaned);
    } catch (err: any) {
      setError(err.message || "Network error. Check connection.");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    fetchHeaderCards();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      fetchLiveData();
      fetchHeaderCards();
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [activeTab]);

  const displayData = searchQuery ? searchResults : data;

  const renderItem = ({ item, index }: { item: MarketItem; index: number }) => {
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
          <View style={styles.itemInfo}>
            <Text style={styles.itemSymbol}>{item.symbol}</Text>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          </View>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
          <View style={[styles.changeBadge, isPositive ? styles.changeBadgePositive : styles.changeBadgeNegative]}>
            <Ionicons
              name={isPositive ? "arrow-up" : "arrow-down"}
              size={12}
              color={isPositive ? "#00C853" : "#FF1744"}
            />
            <Text style={[styles.changeText, isPositive ? styles.positive : styles.negative]}>
              {Math.abs(item.changePercent).toFixed(2)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Header Cards Section
  const renderHeaderCards = () => {
    if (headerCards.length === 0 || searchQuery) return null;

    return (
      <View style={styles.headerCardsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.headerCardsContent}
        >
          {headerCards.map((card, index) => (
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
        <Text style={styles.headerTitle}>Explore</Text>
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
          {(["stocks", "crypto", "etf", "bonds", "ipo", "ma", "dividends"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                setSearchQuery("");
                setSearchResults([]);
              }}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === "stocks" ? "Stocks" :
                 tab === "crypto" ? "Crypto" :
                 tab === "etf" ? "ETFs" :
                 tab === "bonds" ? "Bonds" : 
                 tab === "ipo" ? "IPOs" : 
                 tab === "ma" ? "M&A" : "Dividends"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
      <FlatList
        data={displayData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.symbol}-${index}`}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
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
                <Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
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
      />
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 34, fontWeight: "800", color: "#000", letterSpacing: -0.5 },
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
});
