// app/symbol/[symbol]/_layout.tsx
import { useEffect } from "react";
import { Tabs, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SymbolHeader from "./header";
import { setToMemory, CACHE_KEYS } from "../../../utils/memoryCache";

const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';
const QUOTE_CACHE_PREFIX = 'quote_cache_';

// Pre-fetch quote data for faster tab loading (chart.tsx fetches its own chart data)
async function prefetchSymbolData(symbol: string) {
  const cleanSymbol = symbol.toUpperCase().trim();

  try {
    // Fetch quote from Twelve Data
    const res = await fetch(`${TWELVE_DATA_URL}/quote?symbol=${encodeURIComponent(cleanSymbol)}&apikey=${TWELVE_DATA_API_KEY}`);
    const data = await res.json();

    if (data && data.symbol && !data.code) {
      const price = parseFloat(data.close) || 0;
      const previousClose = parseFloat(data.previous_close) || price;
      const change = previousClose > 0 ? price - previousClose : 0;
      const changesPercentage = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const quoteData = {
        symbol: data.symbol,
        name: data.name,
        price,
        change,
        changesPercentage,
        previousClose,
      };

      // Memory cache for instant access
      setToMemory(CACHE_KEYS.quote(cleanSymbol), quoteData);
      // AsyncStorage for persistence
      await AsyncStorage.setItem(
        `${QUOTE_CACHE_PREFIX}${cleanSymbol}`,
        JSON.stringify({ data: { ...quoteData, timestamp: Date.now() }, timestamp: Date.now() })
      );

      // Correct previousClose with /eod for accurate change% (non-blocking)
      const { correctPreviousCloses } = await import('../../../services/dailyCloseService');
      correctPreviousCloses([cleanSymbol]).catch(() => {});
    }
  } catch (err) {
    // Silent fail - prefetch is best effort
  }
}

export default function SymbolLayout() {
  const { symbol } = useLocalSearchParams();
  const cleanSymbol = symbol ? (Array.isArray(symbol) ? symbol[0] : symbol) : null;

  // Pre-fetch data when layout mounts
  useEffect(() => {
    if (cleanSymbol) {
      prefetchSymbolData(cleanSymbol);
    }
  }, [cleanSymbol]);
  return (
    <Tabs
      screenOptions={{
        header: () => <SymbolHeader />,
        tabBarActiveTintColor: "#0dd977",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: { backgroundColor: "#000", borderTopWidth: 0 },
        tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="chart"
        options={{ title: "Chart", tabBarIcon: ({ color }) => <Ionicons name="trending-up" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="news"
        options={{ title: "News", tabBarIcon: ({ color }) => <Ionicons name="newspaper" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="sentiment"
        options={{ title: "Sentiment", tabBarIcon: ({ color }) => <Ionicons name="heart" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ title: "Earnings", tabBarIcon: ({ color }) => <Ionicons name="cash" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="fundamentals"
        options={{ title: "Fundamentals", tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="info"
        options={{ title: "Info", tabBarIcon: ({ color }) => <Ionicons name="information-circle" size={22} color={color} /> }}
      />
      {/* Hide the header file from tabs */}
      <Tabs.Screen
        name="header"
        options={{ 
          href: null, // This prevents it from appearing in tabs
        }}
      />
    </Tabs>
  );
}
