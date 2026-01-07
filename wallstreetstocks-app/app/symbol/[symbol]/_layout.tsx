// app/symbol/[symbol]/_layout.tsx
import { useEffect } from "react";
import { Tabs, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SymbolHeader from "./header";
import { setToMemory, CACHE_KEYS } from "../../../utils/memoryCache";

const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';
const CHART_CACHE_PREFIX = 'chart_cache_';
const QUOTE_CACHE_PREFIX = 'quote_cache_';

// Pre-fetch chart and quote data for faster tab loading
async function prefetchSymbolData(symbol: string) {
  const cleanSymbol = symbol.toUpperCase().trim();
  const encodedSymbol = encodeURIComponent(cleanSymbol.replace(/\//g, ''));

  try {
    // Fetch quote and 1D chart data in parallel
    const [quoteRes, chartRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/quote/${encodedSymbol}?apikey=${FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/historical-chart/1min/${encodedSymbol}?extended=true&apikey=${FMP_API_KEY}`)
    ]);

    const [quoteData, chartData] = await Promise.all([
      quoteRes.json(),
      chartRes.json()
    ]);

    // Cache quote data to BOTH memory (instant) and AsyncStorage (persistent)
    if (quoteData?.[0]) {
      // Memory cache for instant access
      setToMemory(CACHE_KEYS.quote(cleanSymbol), quoteData[0]);
      // AsyncStorage for persistence
      await AsyncStorage.setItem(
        `${QUOTE_CACHE_PREFIX}${cleanSymbol}`,
        JSON.stringify({ data: { ...quoteData[0], timestamp: Date.now() }, timestamp: Date.now() })
      );
    }

    // Cache chart data (1D)
    if (Array.isArray(chartData) && chartData.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const todayData = chartData.filter((d: any) => d.date.startsWith(today));
      const dataToUse = todayData.length > 10 ? todayData : chartData.slice(0, 960);
      const sampleRate = dataToUse.length > 300 ? 3 : dataToUse.length > 150 ? 2 : 1;

      const formatted = dataToUse
        .filter((_: any, i: number) => i % sampleRate === 0)
        .reverse()
        .map((d: any) => ({
          value: d.close,
          label: new Date(d.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          date: new Date(d.date),
        }));

      // Memory cache for instant access
      setToMemory(CACHE_KEYS.chart(cleanSymbol, '1D'), formatted);
      // AsyncStorage for persistence
      await AsyncStorage.setItem(
        `${CHART_CACHE_PREFIX}${cleanSymbol}_1D`,
        JSON.stringify({ data: formatted, timestamp: Date.now() })
      );
    }
  } catch (err) {
    // Silent fail - prefetch is best effort
    console.log('Prefetch error (non-critical):', err);
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
