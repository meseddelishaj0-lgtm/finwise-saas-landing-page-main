// app/premium/stock-picks.tsx
// Premium Stock Picks - AI-Generated selections based on subscription tier
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Picks are generated and gated server-side. The client only renders what the
// API returns for the user's tier — no symbols or API keys ship in the bundle.
const API_URL = 'https://www.wallstreetstocks.ai';

// Stock picks limits by tier. Used only for the initial counter display before
// the server response arrives; the server is the authoritative source of truth.
const PICKS_BY_TIER = {
  free: 0,
  gold: 5,
  platinum: 8,
  diamond: 15,
};

interface StockPick {
  symbol: string;
  category: string;
  reason: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  marketCap?: number;
  pe?: number;
  weekHigh52?: number;
  weekLow52?: number;
}

export default function StockPicksScreen() {
  const { isPremium, currentTier } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stockPicks, setStockPicks] = useState<StockPick[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [picksLimit, setPicksLimit] = useState(0);
  const [totalPicks, setTotalPicks] = useState(15);

  // Get tier badge info
  const getTierInfo = () => {
    switch (currentTier) {
      case 'gold': return { name: 'Gold', color: '#FFD700', icon: 'star' };
      case 'platinum': return { name: 'Platinum', color: '#E5E4E2', icon: 'diamond' };
      case 'diamond': return { name: 'Diamond', color: '#B9F2FF', icon: 'diamond' };
      default: return { name: 'Free', color: '#8E8E93', icon: 'lock-closed' };
    }
  };

  const tierInfo = getTierInfo();

  // Fetch the tier-gated stock picks from the server. The backend verifies the
  // subscription and only returns the symbols this user has paid for, so no
  // pick names (or API keys) ever live in the client bundle.
  // Which curated list this screen shows (?list=momentum|growth; default picks)
  const { list } = useLocalSearchParams<{ list?: string }>();
  const listKey = list === 'momentum' || list === 'growth' ? list : 'picks';
  const listTitle =
    listKey === 'momentum' ? 'Momentum Stocks' : listKey === 'growth' ? 'Growth Stocks' : 'Stock Picks';

  const fetchStockData = useCallback(async () => {
    try {
      // Optimistic counter value until the server responds authoritatively.
      setPicksLimit(
        isPremium && currentTier
          ? PICKS_BY_TIER[currentTier as keyof typeof PICKS_BY_TIER] ?? 0
          : 0
      );

      // 'userId' is the key lib/auth actually writes; 'userData' is a legacy
      // blob from old app versions, kept only as a fallback
      const userId = (await AsyncStorage.getItem('userId'))
        || JSON.parse((await AsyncStorage.getItem('userData')) || 'null')?.id?.toString()
        || null;

      if (!userId) {
        setStockPicks([]);
        return;
      }

      const response = await fetch(`${API_URL}/api/stock-picks?list=${listKey}`, {
        headers: {
          'x-user-id': userId,
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data && Array.isArray(data.picks)) {
        setStockPicks(data.picks);
        if (typeof data.limit === 'number') setPicksLimit(data.limit);
        if (typeof data.total === 'number') setTotalPicks(data.total);
      } else {
        // Not entitled (403) or an error — show nothing rather than leak picks.
        setStockPicks([]);
      }
    } catch (error) {
      setStockPicks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isPremium, currentTier, listKey]);

  useEffect(() => {
    if (isPremium) {
      fetchStockData();
    } else {
      // Non-premium users see the paywall below; don't hit the API.
      setLoading(false);
    }
  }, [isPremium, fetchStockData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStockData();
  };

  const handleStockPress = (symbol: string) => {
    router.push(`/symbol/${symbol}/chart`);
  };

  const formatMarketCap = (value?: number) => {
    if (!value) return '—';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  // Redirect to paywall if not premium
  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{listTitle}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.lockedContainer}>
          <View style={styles.lockedIconContainer}>
            <Ionicons name="lock-closed" size={48} color="#FFD700" />
          </View>
          <Text style={styles.lockedTitle}>Premium Feature</Text>
          <Text style={styles.lockedDescription}>
            Get access to our expert-curated stock picks with a premium subscription.
          </Text>

          <View style={styles.tierCards}>
            <View style={[styles.tierPreviewCard, { borderColor: '#FFD700' }]}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.tierPreviewName}>Gold</Text>
              <Text style={styles.tierPreviewPicks}>5 Stock Picks</Text>
            </View>
            <View style={[styles.tierPreviewCard, { borderColor: '#E5E4E2' }]}>
              <Ionicons name="diamond" size={20} color="#E5E4E2" />
              <Text style={styles.tierPreviewName}>Platinum</Text>
              <Text style={styles.tierPreviewPicks}>8 Stock Picks</Text>
            </View>
            <View style={[styles.tierPreviewCard, { borderColor: '#B9F2FF' }]}>
              <Ionicons name="diamond" size={20} color="#B9F2FF" />
              <Text style={styles.tierPreviewName}>Diamond</Text>
              <Text style={styles.tierPreviewPicks}>15 Stock Picks</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/(modals)/paywall' as any)}
          >
            <Ionicons name="rocket" size={20} color="#000" />
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.tierBadge, { backgroundColor: tierInfo.color }]}>
            <Ionicons name={tierInfo.icon as any} size={12} color="#000" />
            <Text style={styles.tierBadgeText}>{tierInfo.name}</Text>
          </View>
          <Text style={styles.headerTitle}>{listTitle}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Picks Counter */}
      <View style={styles.counterContainer}>
        <View style={styles.counterCard}>
          <Text style={styles.counterLabel}>Your {listTitle}</Text>
          <View style={styles.counterRow}>
            <Text style={[styles.counterValue, { color: tierInfo.color }]}>{picksLimit}</Text>
            <Text style={styles.counterTotal}>/ {totalPicks}</Text>
          </View>
          {currentTier !== 'diamond' && (
            <TouchableOpacity
              style={styles.upgradeLink}
              onPress={() => router.push('/(modals)/paywall' as any)}
            >
              <Text style={styles.upgradeLinkText}>Upgrade for more picks</Text>
              <Ionicons name="arrow-forward" size={14} color="#B8860B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading stock picks...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
            />
          }
        >
          {/* Failed/empty fetch: visible retry instead of a silent void */}
          {stockPicks.length === 0 && (
            <View style={styles.emptyPicksContainer}>
              <Ionicons name="cloud-offline-outline" size={44} color="#8E8E93" />
              <Text style={styles.emptyPicksText}>Couldn&apos;t load your picks</Text>
              <Text style={styles.emptyPicksSubtext}>Check your connection and try again</Text>
              <TouchableOpacity style={styles.emptyPicksRetry} onPress={() => fetchStockData()}>
                <Ionicons name="refresh" size={16} color="#000" />
                <Text style={styles.emptyPicksRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {stockPicks.map((stock, index) => {
            const isLocked = index >= picksLimit;
            const isExpanded = expandedCard === stock.symbol;

            return (
              <TouchableOpacity
                key={stock.symbol}
                style={[
                  styles.stockCard,
                  isLocked && styles.stockCardLocked,
                  isExpanded && styles.stockCardExpanded,
                ]}
                onPress={() => {
                  if (isLocked) {
                    router.push('/(modals)/paywall' as any);
                  } else {
                    setExpandedCard(isExpanded ? null : stock.symbol);
                  }
                }}
                activeOpacity={0.7}
              >
                {/* Rank Badge */}
                <View style={[styles.rankBadge, { backgroundColor: getRankColor(index) }]}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>

                {isLocked ? (
                  // Locked State
                  <View style={styles.lockedContent}>
                    <View style={styles.lockedOverlay}>
                      <Ionicons name="lock-closed" size={24} color="#8E8E93" />
                    </View>
                    <View style={styles.lockedInfo}>
                      <Text style={styles.lockedStockText}>Stock #{index + 1}</Text>
                      <Text style={styles.lockedCategoryText}>{stock.category}</Text>
                      <Text style={styles.lockedUpgradeText}>
                        {index < 8 ? 'Upgrade to Platinum' : 'Upgrade to Diamond'} to unlock
                      </Text>
                    </View>
                  </View>
                ) : (
                  // Unlocked State
                  <>
                    <View style={styles.stockHeader}>
                      <View style={styles.stockInfo}>
                        <View style={styles.symbolRow}>
                          <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{stock.category}</Text>
                          </View>
                        </View>
                        <Text style={styles.stockName} numberOfLines={1}>{stock.name}</Text>
                      </View>
                      <View style={styles.priceInfo}>
                        <Text style={styles.stockPrice}>
                          ${stock.price?.toFixed(2) || '—'}
                        </Text>
                        <View style={[
                          styles.changeContainer,
                          { backgroundColor: (stock.change || 0) >= 0 ? '#00C85315' : '#FF3B3015' }
                        ]}>
                          <Ionicons
                            name={(stock.change || 0) >= 0 ? 'arrow-up' : 'arrow-down'}
                            size={12}
                            color={(stock.change || 0) >= 0 ? '#00C853' : '#FF3B30'}
                          />
                          <Text style={[
                            styles.changeText,
                            { color: (stock.change || 0) >= 0 ? '#00C853' : '#FF3B30' }
                          ]}>
                            {Math.abs(stock.changePercent || 0).toFixed(2)}%
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Reason */}
                    <View style={styles.reasonContainer}>
                      <Ionicons name="bulb" size={16} color="#FFD700" />
                      <Text style={styles.reasonText}>{stock.reason}</Text>
                    </View>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <View style={styles.metricsGrid}>
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Market Cap</Text>
                            <Text style={styles.metricValue}>{formatMarketCap(stock.marketCap)}</Text>
                          </View>
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>P/E Ratio</Text>
                            <Text style={styles.metricValue}>{stock.pe?.toFixed(2) || '—'}</Text>
                          </View>
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>52W High</Text>
                            <Text style={styles.metricValue}>${stock.weekHigh52?.toFixed(2) || '—'}</Text>
                          </View>
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>52W Low</Text>
                            <Text style={styles.metricValue}>${stock.weekLow52?.toFixed(2) || '—'}</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.viewChartButton}
                          onPress={() => handleStockPress(stock.symbol)}
                        >
                          <Ionicons name="stats-chart" size={18} color="#B8860B" />
                          <Text style={styles.viewChartText}>View Full Analysis</Text>
                          <Ionicons name="chevron-forward" size={18} color="#B8860B" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Expand Indicator */}
                    <View style={styles.expandIndicator}>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#8E8E93"
                      />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Upgrade CTA for non-Diamond users */}
          {currentTier !== 'diamond' && (
            <View style={styles.upgradeCTA}>
              <View style={styles.upgradeCTAContent}>
                <Ionicons name="trending-up" size={32} color="#FFD700" />
                <Text style={styles.upgradeCTATitle}>Want More Picks?</Text>
                <Text style={styles.upgradeCTADescription}>
                  Upgrade to {currentTier === 'gold' ? 'Platinum' : 'Diamond'} to unlock{' '}
                  {currentTier === 'gold' ? '3 more' : '7 more'} expert stock picks.
                </Text>
                <TouchableOpacity
                  style={styles.upgradeCTAButton}
                  onPress={() => router.push('/(modals)/paywall' as any)}
                >
                  <Text style={styles.upgradeCTAButtonText}>View Upgrade Options</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={16} color="#8E8E93" />
            <Text style={styles.disclaimerText}>
              Stock picks are for informational purposes only and do not constitute investment advice.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const getRankColor = (index: number) => {
  if (index === 0) return '#FFD700'; // Gold
  if (index === 1) return '#C0C0C0'; // Silver
  if (index === 2) return '#CD7F32'; // Bronze
  return '#2C2C2E';
};

const styles = StyleSheet.create({
  emptyPicksContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyPicksText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
  },
  emptyPicksSubtext: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyPicksRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFD700',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 18,
  },
  emptyPicksRetryText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  refreshButton: {
    padding: 8,
  },
  counterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  counterCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  counterLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  counterValue: {
    fontSize: 36,
    fontWeight: '800',
  },
  counterTotal: {
    fontSize: 20,
    fontWeight: '600',
    color: '#636366',
    marginLeft: 4,
  },
  upgradeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  upgradeLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8860B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  stockCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  stockCardLocked: {
    opacity: 0.7,
  },
  stockCardExpanded: {
    borderWidth: 1,
    borderColor: '#333',
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  stockInfo: {
    flex: 1,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockSymbol: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  categoryBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
  },
  stockName: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    maxWidth: 180,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    gap: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2C2C2E',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: '#AEAEB2',
    lineHeight: 18,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricItem: {
    width: (SCREEN_WIDTH - 64 - 12) / 2 - 6,
    backgroundColor: '#2C2C2E',
    padding: 12,
    borderRadius: 12,
  },
  metricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  viewChartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B8860B15',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewChartText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B8860B',
  },
  expandIndicator: {
    alignItems: 'center',
    marginTop: 8,
  },
  lockedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  lockedOverlay: {
    width: 60,
    height: 60,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedInfo: {
    flex: 1,
  },
  lockedStockText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8E8E93',
  },
  lockedCategoryText: {
    fontSize: 13,
    color: '#636366',
    marginTop: 2,
  },
  lockedUpgradeText: {
    fontSize: 12,
    color: '#B8860B',
    marginTop: 6,
  },
  upgradeCTA: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  upgradeCTAContent: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD70030',
  },
  upgradeCTATitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 12,
  },
  upgradeCTADescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  upgradeCTAButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  upgradeCTAButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#636366',
    lineHeight: 16,
  },
  // Locked State Styles
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockedIconContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#1C1C1E',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
  },
  lockedDescription: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  tierCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  tierPreviewCard: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: (SCREEN_WIDTH - 72) / 3,
    borderWidth: 2,
  },
  tierPreviewName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
  },
  tierPreviewPicks: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
});
