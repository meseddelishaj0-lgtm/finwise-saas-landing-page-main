// screens/Trending.tsx  (or components/Trending.tsx)
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from '@/context/ThemeContext';

interface TrendingItem {
  symbol: string;
  companyName: string;        // FMP uses companyName
  changesPercentage: string;  // FMP returns string like "+5.43%"
  price?: number;
}

export default function Trending() {
  const { colors, isDark } = useTheme();
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Your FMP API key (set in app.json or .env)
  const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || "";
  const API_URL = `https://financialmodelingprep.com/api/v3/stock_market/actives?limit=50&apikey=${FMP_API_KEY}`;

  useEffect(() => {
    let isMounted = true;

    const fetchTrending = async () => {
      try {
        setLoading(true);
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Network response was not ok");

        const data: TrendingItem[] = await res.json();

        if (isMounted) {
          // Sort by absolute change (most movement = most "trending" feel)
          const sorted = data.sort(
            (a, b) =>
              Math.abs(parseFloat(b.changesPercentage)) -
              Math.abs(parseFloat(a.changesPercentage))
          );
          setTrending(sorted.slice(0, 30)); // top 30
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError("Failed to load trending stocks");
        
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTrending();
    // NO POLLING - fetch once on mount only
    // Pull-to-refresh can be added if needed

    return () => {
      isMounted = false;
    };
  }, [FMP_API_KEY]);

  const formatChange = (changeStr: string) => {
    const num = parseFloat(changeStr);
    const isPositive = num >= 0;
    return (
      <View style={styles.changeContainer}>
        <Ionicons
          name={isPositive ? "trending-up" : "trending-down"}
          size={16}
          color={isPositive ? "#16A34A" : "#DC2626"}
        />
        <Text
          style={[
            styles.changeText,
            { color: isPositive ? "#16A34A" : "#DC2626" },
          ]}
        >
          {Math.abs(num).toFixed(2)}%
        </Text>
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: TrendingItem; index: number }) => (
    <View style={[styles.row, { backgroundColor: colors.card, borderBottomColor: isDark ? colors.border : '#eef2f7' }]}>
      <View style={styles.left}>
        <Text style={[styles.rank, { color: colors.textTertiary }]}>{index + 1}</Text>
        <View>
          <Text style={[styles.symbol, { color: colors.text }]}>{item.symbol}</Text>
          <Text style={[styles.name, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.companyName}
          </Text>
        </View>
      </View>
      {formatChange(item.changesPercentage)}
    </View>
  );

  if (loading && trending.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: isDark ? colors.border : '#e5e7eb' }]}>
          <Text style={[styles.title, { color: colors.text }]}>Trending</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: isDark ? colors.border : '#e5e7eb' }]}>
          <Text style={[styles.title, { color: colors.text }]}>Trending</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.card} />

      {/* Fixed Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: isDark ? colors.border : '#e5e7eb' }]}>
        <Text style={[styles.title, { color: colors.text }]}>Trending</Text>

        {/* Market Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
        >
          <View style={[styles.chip, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chipText, { color: colors.text }]}>DIA</Text>
            <Text style={styles.chipChange}>↓ 0.92%</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chipText, { color: colors.text }]}>SPY</Text>
            <Text style={styles.chipChange}>↓ 0.86%</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chipText, { color: colors.text }]}>QQQ</Text>
            <Text style={styles.chipChange}>↓ 0.87%</Text>
          </View>
        </ScrollView>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          View the top symbols with the most trending streams right now. Refreshes every 5 minutes.
        </Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Text style={styles.tabActive}>Trending</Text>
          <Text style={[styles.tabInactive, { color: colors.textSecondary }]}>Most Active</Text>
          <Text style={[styles.tabInactive, { color: colors.textSecondary }]}>Watchers</Text>
          <Text style={[styles.tabInactive, { color: colors.textSecondary }]}>Most Bullish</Text>
          <Text style={[styles.tabInactive, { color: colors.textSecondary }]}>Most Bearish</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={trending}
        keyExtractor={(item) => item.symbol}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: {
    backgroundColor: "#ffffff",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#111827" },
  chipsRow: { marginTop: 12, marginBottom: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipChange: { fontSize: 13, color: "#dc2626", marginLeft: 4 },
  subtitle: { fontSize: 12.5, color: "#6b7280", marginTop: 4 },
  tabs: { flexDirection: "row", marginTop: 16, gap: 20 },
  tabActive: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563eb",
    paddingBottom: 8,
    borderBottomWidth: 2.5,
    borderBottomColor: "#2563eb",
  },
  tabInactive: { fontSize: 15, color: "#6b7280", fontWeight: "500" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#dc2626", fontSize: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  left: { flexDirection: "row", alignItems: "center" },
  rank: {
    width: 32,
    textAlign: "right",
    fontSize: 17,
    fontWeight: "600",
    color: "#9ca3af",
    marginRight: 12,
  },
  symbol: { fontSize: 17, fontWeight: "700", color: "#111827" },
  name: { fontSize: 13.5, color: "#6b7280", marginTop: 2 },
  changeContainer: { flexDirection: "row", alignItems: "center" },
  changeText: { fontSize: 15, fontWeight: "700", marginLeft: 5 },
});

