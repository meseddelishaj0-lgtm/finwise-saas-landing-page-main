// app/(tabs)/trending.tsx - FINAL VERSION (No Menu, Centered Title, Touchable Chips)
import React, { useState, useEffect, useCallback } from "react";
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
import { useRouter } from "expo-router";

type TabType = "trending" | "gainers" | "losers" | "indices" | "forex" | "commodities";

interface StockItem {
  symbol: string;
  companyName: string;
  name?: string;
  changesPercentage: string | number;
  price?: number;
  change?: number;
}

export default function Trending() {
  const [activeTab, setActiveTab] = useState<TabType>("trending");
  const [data, setData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';
  const BASE = "https://financialmodelingprep.com/api/v3";

  const endpoints: Record<TabType, string> = {
    trending: `${BASE}/stock_market/actives?limit=50&apikey=${FMP_API_KEY}`,
    gainers: `${BASE}/stock_market/gainers?limit=50&apikey=${FMP_API_KEY}`,
    losers: `${BASE}/stock_market/losers?limit=50&apikey=${FMP_API_KEY}`,
    indices: `${BASE}/quote/%5EGSPC,%5EDJI,%5EIXIC,%5ERUT,%5EVIX?apikey=${FMP_API_KEY}`,
    forex: `${BASE}/fx?apikey=${FMP_API_KEY}`,
    commodities: `${BASE}/quote/GCUSD,SIUSD,CLUSD,NGUSD,HGUSD?apikey=${FMP_API_KEY}`,
  };

  const fetchLiveData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(endpoints[activeTab]);
      const json = await res.json();

      if (json.Error || json.error) {
        throw new Error(json.Error || json.error);
      }

      let cleaned: StockItem[] = [];

      if (Array.isArray(json)) {
        if (activeTab === "indices") {
          cleaned = json.map(item => ({
            symbol: item.symbol || "N/A",
            companyName: item.name || item.symbol || "Unknown",
            changesPercentage: item.changesPercentage || 0,
            price: item.price,
            change: item.change,
          }));
        } else if (activeTab === "forex") {
          cleaned = json
            .slice(0, 30)
            .map(item => {
              // Normalize forex symbols: remove slashes for routing
              // EUR/USD -> EURUSD for the symbol navigation
              const rawSymbol = item.ticker || item.symbol || "N/A";
              const normalizedSymbol = rawSymbol.replace(/\//g, '');
              
              return {
                symbol: normalizedSymbol,
                companyName: rawSymbol, // Keep the original with slash for display
                changesPercentage: item.changes || item.changesPercentage || 0,
                price: item.bid,
              };
            });
        } else if (activeTab === "commodities") {
          cleaned = json.map(item => ({
            symbol: item.symbol || "N/A",
            companyName: item.name || item.symbol || "Unknown",
            changesPercentage: item.changesPercentage || 0,
            price: item.price,
            change: item.change,
          }));
        } else {
          cleaned = json
            .filter(item => item?.symbol && item.changesPercentage !== undefined)
            .map(item => ({
              symbol: item.symbol,
              companyName: item.companyName || item.name || "Unknown",
              changesPercentage: item.changesPercentage,
              price: item.price,
            }))
            .slice(0, 30);
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
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  const renderItem = useCallback(({ item, index }: { item: StockItem; index: number }) => {
    const numChange = typeof item.changesPercentage === 'string' 
      ? parseFloat(item.changesPercentage) 
      : (item.changesPercentage || 0);
    const positive = numChange >= 0;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          // URL encode the symbol to handle special characters like ^
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
            <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          )}
          <View style={[styles.changeBadge, positive ? styles.changeBadgePositive : styles.changeBadgeNegative]}>
            <Ionicons
              name={positive ? "arrow-up" : "arrow-down"}
              size={14}
              color={positive ? "#00C853" : "#FF1744"}
            />
            <Text style={[styles.changeText, { color: positive ? "#00C853" : "#FF1744" }]}>
              {Math.abs(numChange).toFixed(2)}%
            </Text>
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
          <Text style={styles.titleCentered}>Trending</Text>
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
        {/* Centered Title Only */}
        <Text style={styles.titleCentered}>Trending</Text>

        {/* Touchable Major Indices Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {[
            { symbol: "DIA", change: -0.92 },
            { symbol: "SPY", change: -0.86 },
            { symbol: "QQQ", change: -0.87 },
          ].map((item) => (
            <TouchableOpacity
              key={item.symbol}
              onPress={() => {
                const encodedSymbol = encodeURIComponent(item.symbol);
                router.push(`/symbol/${encodedSymbol}/chart`);
              }}
              style={styles.chip}
              activeOpacity={0.7}
            >
              <Text style={styles.chipSymbol}>{item.symbol}</Text>
              <Text style={styles.chipDown}>{item.change}%</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.subtitle}>
          Live market movers • Updates every 5 minutes
        </Text>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {(["trending", "gainers", "losers", "indices", "forex", "commodities"] as TabType[]).map((tab) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={styles.tabButton}
            >
              <Text style={activeTab === tab ? styles.tabActive : styles.tabInactive}>
                {tab === "trending" ? "Trending" :
                 tab === "gainers" ? "Gainers" :
                 tab === "losers" ? "Losers" :
                 tab === "indices" ? "Indices" :
                 tab === "forex" ? "Forex" : "Commodities"}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
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
        initialNumToRender={20}
        windowSize={10}
        removeClippedSubviews={true}
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  titleCentered: { 
    fontSize: 34, 
    fontWeight: "800", 
    color: "#000",
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 16,
  },
  chipsRow: { 
    marginBottom: 12,
  },
  chipsContent: {
    paddingRight: 20,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipSymbol: { 
    fontSize: 14, 
    fontWeight: "700", 
    color: "#111827",
    marginRight: 6,
  },
  chipDown: { 
    fontSize: 13, 
    color: "#FF1744", 
    fontWeight: "600",
  },
  subtitle: { 
    fontSize: 13, 
    color: "#6b7280", 
    marginBottom: 16,
    textAlign: "center",
  },
  tabsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  tabsContent: {
    paddingRight: 20,
  },
  tabButton: {
    marginRight: 28,
    paddingBottom: 12,
  },
  tabActive: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  tabInactive: { 
    fontSize: 15, 
    color: "#9ca3af", 
    fontWeight: "600",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#00C853",
    borderRadius: 2,
  },
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
  listContent: {
    paddingBottom: 100,
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
