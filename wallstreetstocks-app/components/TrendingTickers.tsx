// components/TrendingTickers.tsx
// Trending tickers sidebar like StockTwits
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface TrendingTicker {
  ticker: string;
  mentionCount: number;
  bullish: number;
  bearish: number;
  sentiment: number;
  bullishPercent: number;
}

interface Props {
  onTickerPress: (ticker: string) => void;
}

export default function TrendingTickers({ onTickerPress }: Props) {
  const { colors, isDark } = useTheme();
  const [tickers, setTickers] = useState<TrendingTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h');

  useEffect(() => {
    fetchTrending();
  }, [timeframe]);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://www.wallstreetstocks.ai/api/trending?timeframe=${timeframe}&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        setTickers(data);
      }
    } catch (error) {
      // Silently handle trending fetch errors
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.2) return '#34C759';
    if (sentiment < -0.2) return '#FF3B30';
    return '#8E8E93';
  };

  const getSentimentIcon = (sentiment: number): 'trending-up' | 'trending-down' | 'remove' => {
    if (sentiment > 0.2) return 'trending-up';
    if (sentiment < -0.2) return 'trending-down';
    return 'remove';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: isDark ? 'transparent' : '#E5E5EA' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🔥 Trending</Text>
        <View style={styles.timeframeTabs}>
          {(['1h', '24h', '7d'] as const).map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[styles.tab, { backgroundColor: colors.surface }, timeframe === tf && styles.activeTab]}
              onPress={() => setTimeframe(tf)}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, timeframe === tf && styles.activeTabText]}>
                {tf}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
      ) : tickers.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No trending tickers yet</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tickers.map((ticker, index) => (
            <TouchableOpacity
              key={ticker.ticker}
              style={[styles.tickerCard, { backgroundColor: colors.surface }]}
              onPress={() => onTickerPress(ticker.ticker)}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <Text style={styles.tickerSymbol}>${ticker.ticker}</Text>
              <View style={styles.mentionRow}>
                <Ionicons name="chatbubble-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.mentionCount, { color: colors.textSecondary }]}>{ticker.mentionCount}</Text>
              </View>
              <View style={styles.sentimentRow}>
                <Ionicons
                  name={getSentimentIcon(ticker.sentiment)}
                  size={14}
                  color={getSentimentColor(ticker.sentiment)}
                />
                <Text style={[styles.sentimentText, { color: getSentimentColor(ticker.sentiment) }]}>
                  {ticker.bullishPercent}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  timeframeTabs: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#FFF',
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
    paddingVertical: 20,
  },
  tickerCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginLeft: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  tickerSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 4,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  mentionCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  sentimentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
