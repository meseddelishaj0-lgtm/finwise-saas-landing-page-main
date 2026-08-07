// app/portfolio/index.tsx
// Portfolio Tracker Screen
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAuth } from '@/lib/auth';
import { parseLocaleNumber } from '@/lib/parseNumber';

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';

// Same quote source PortfolioContext uses for pricing holdings
const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

interface Holding {
  id: number;
  symbol: string;
  shares: number;
  avgCost: number;
  name?: string;
  currentPrice?: number;
  marketValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  dayChange?: number;
  dayChangePercent?: number;
}

interface Portfolio {
  id: number;
  name: string;
  holdings: Holding[];
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export default function PortfolioScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { user: authUser } = useAuth();
  // Single source of truth — the same PortfolioContext the home tab uses, so
  // the two views can never diverge and edits here can't be wiped by the
  // context's replace-all sync.
  const {
    currentPortfolio: ctxPortfolio,
    loading,
    addHolding: ctxAddHolding,
    removeHolding: ctxRemoveHolding,
    refreshPrices,
  } = usePortfolio();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingHolding, setAddingHolding] = useState(false);
  const [newHolding, setNewHolding] = useState({ symbol: '', shares: '', avgCost: '' });
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  // True once the user types their own cost basis — auto-fill then backs off
  const costEditedRef = useRef(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshPrices(); } finally { setRefreshing(false); }
  }, [refreshPrices]);

  // Fresh modal → fresh auto-fill state
  useEffect(() => {
    if (showAddModal) {
      costEditedRef.current = false;
      setLivePrice(null);
      setPriceLoading(false);
    }
  }, [showAddModal]);

  // Fetch the live price as the symbol is typed (debounced) and pre-fill
  // Avg Cost with it unless the user has entered their own number.
  useEffect(() => {
    if (!showAddModal) return;
    const sym = newHolding.symbol.trim().toUpperCase();
    setLivePrice(null);
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(sym)) {
      setPriceLoading(false);
      return;
    }
    let alive = true;
    setPriceLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${TWELVE_DATA_URL}/quote?symbol=${encodeURIComponent(sym)}&apikey=${TWELVE_DATA_API_KEY}`
        );
        const data = await res.json();
        const price = parseFloat(data?.close);
        if (!alive) return;
        if (Number.isFinite(price) && price > 0) {
          setLivePrice(price);
          if (!costEditedRef.current) {
            setNewHolding((prev) =>
              prev.symbol.trim().toUpperCase() === sym
                ? { ...prev, avgCost: price.toFixed(2) }
                : prev
            );
          }
        }
      } catch {
        // quiet — the field simply stays manual
      } finally {
        if (alive) setPriceLoading(false);
      }
    }, 600);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newHolding.symbol, showAddModal]);

  const addHolding = async () => {
    if (!newHolding.symbol || !newHolding.shares || !newHolding.avgCost) {
      Alert.alert(t('Error'), t('Please fill in all fields'));
      return;
    }
    const shares = parseLocaleNumber(newHolding.shares);
    const avgCost = parseLocaleNumber(newHolding.avgCost);
    if (!Number.isFinite(shares) || shares <= 0 || !Number.isFinite(avgCost) || avgCost < 0) {
      Alert.alert(t('Error'), t('Please enter valid numbers'));
      return;
    }

    setAddingHolding(true);
    try {
      await ctxAddHolding(newHolding.symbol.toUpperCase().trim(), shares, avgCost);
      setShowAddModal(false);
      setNewHolding({ symbol: '', shares: '', avgCost: '' });
      setLivePrice(null);
      costEditedRef.current = false;
    } catch (error) {
      Alert.alert(t('Error'), t('Failed to add holding'));
    } finally {
      setAddingHolding(false);
    }
  };

  const deleteHolding = (symbol: string) => {
    Alert.alert(
      t('Delete Holding'),
      t('Are you sure you want to remove this stock from your portfolio?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ctxRemoveHolding(symbol);
            } catch (error) {
              Alert.alert(t('Error'), t('Failed to delete holding'));
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (!authUser?.id) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#B8860B" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Portfolio')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('Sign in Required')}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('Please sign in to track your portfolio')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#B8860B" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Portfolio')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Adapt the context's priced portfolio to this screen's display shape.
  const portfolio = ctxPortfolio
    ? {
        totalValue: ctxPortfolio.totalValue,
        totalGainLoss: ctxPortfolio.totalGain,
        totalGainLossPercent: ctxPortfolio.totalGainPercent,
        dayChange: ctxPortfolio.dayChange,
        dayChangePercent: ctxPortfolio.dayChangePercent,
        holdings: ctxPortfolio.holdings.map((h) => {
          const changePerShare = h.shares > 0 ? h.dayChange / h.shares : 0;
          const prevClose = h.currentPrice - changePerShare;
          return {
            symbol: h.symbol,
            name: h.symbol,
            shares: h.shares,
            avgCost: h.avgCost,
            currentPrice: h.currentPrice,
            marketValue: h.currentValue,
            gainLoss: h.gain,
            gainLossPercent: h.gainPercent,
            dayChange: h.dayChange,
            dayChangePercent: prevClose > 0 ? (changePerShare / prevClose) * 100 : 0,
          };
        }),
      }
    : null;
  const hasHoldings = portfolio && portfolio.holdings.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#B8860B" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Portfolio')}</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#B8860B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
      >
        {/* Portfolio Summary */}
        {hasHoldings && (
          <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.summaryLabel}>{t('Total Value')}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(portfolio.totalValue)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>{t('Total P&L')}</Text>
                <Text
                  style={[
                    styles.summaryItemValue,
                    { color: portfolio.totalGainLoss >= 0 ? '#34C759' : '#FF3B30' },
                  ]}
                >
                  {formatCurrency(portfolio.totalGainLoss)} ({formatPercent(portfolio.totalGainLossPercent)})
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>{t('Today')}</Text>
                <Text
                  style={[
                    styles.summaryItemValue,
                    { color: portfolio.dayChange >= 0 ? '#34C759' : '#FF3B30' },
                  ]}
                >
                  {formatCurrency(portfolio.dayChange)} ({formatPercent(portfolio.dayChangePercent)})
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Holdings List */}
        {hasHoldings ? (
          <View style={styles.holdingsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Holdings')} ({portfolio.holdings.length})</Text>
            {portfolio.holdings.map((holding) => (
              <TouchableOpacity
                key={holding.symbol}
                style={[styles.holdingCard, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/symbol/${holding.symbol}/chart` as any)}
                onLongPress={() => deleteHolding(holding.symbol)}
              >
                <View style={styles.holdingHeader}>
                  <View>
                    <Text style={[styles.holdingSymbol, { color: colors.text }]}>{holding.symbol}</Text>
                    <Text style={[styles.holdingName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {holding.name || holding.symbol}
                    </Text>
                  </View>
                  <View style={styles.holdingValue}>
                    <Text style={[styles.holdingPrice, { color: colors.text }]}>
                      {formatCurrency(holding.marketValue || 0)}
                    </Text>
                    <Text
                      style={[
                        styles.holdingChange,
                        { color: (holding.gainLoss || 0) >= 0 ? '#34C759' : '#FF3B30' },
                      ]}
                    >
                      {formatCurrency(holding.gainLoss || 0)} ({formatPercent(holding.gainLossPercent || 0)})
                    </Text>
                  </View>
                </View>
                <View style={[styles.holdingDetails, { borderTopColor: colors.border }]}>
                  <View style={styles.holdingDetail}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('Shares')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{holding.shares.toFixed(2)}</Text>
                  </View>
                  <View style={styles.holdingDetail}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('Avg Cost')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(holding.avgCost)}</Text>
                  </View>
                  <View style={styles.holdingDetail}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('Current')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {formatCurrency(holding.currentPrice || 0)}
                    </Text>
                  </View>
                  <View style={styles.holdingDetail}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('Today')}</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: (holding.dayChange || 0) >= 0 ? '#34C759' : '#FF3B30' },
                      ]}
                    >
                      {formatPercent(holding.dayChangePercent || 0)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            <Text style={[styles.hintText, { color: colors.textTertiary }]}>{t('Long press a holding to delete')}</Text>
          </View>
        ) : (
          <View style={styles.emptyHoldings}>
            <Ionicons name="pie-chart-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('No Holdings Yet')}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {t('Add stocks to track your portfolio performance')}
            </Text>
            <TouchableOpacity
              style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addFirstText}>{t('Add Your First Stock')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Holding Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Add Stock')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('Symbol')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="AAPL"
                placeholderTextColor={colors.textTertiary}
                value={newHolding.symbol}
                onChangeText={(text) => setNewHolding({ ...newHolding, symbol: text.toUpperCase() })}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('Number of Shares')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="10"
                placeholderTextColor={colors.textTertiary}
                value={newHolding.shares}
                onChangeText={(text) => setNewHolding({ ...newHolding, shares: text })}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('Average Cost per Share')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="150.00"
                placeholderTextColor={colors.textTertiary}
                value={newHolding.avgCost}
                onChangeText={(text) => {
                  // User typing their own cost basis pauses auto-fill;
                  // clearing the field hands control back to it.
                  costEditedRef.current = text.trim().length > 0;
                  setNewHolding({ ...newHolding, avgCost: text });
                }}
                keyboardType="decimal-pad"
              />
              {(priceLoading || livePrice != null) && (
                <TouchableOpacity
                  style={styles.livePriceRow}
                  disabled={priceLoading || livePrice == null}
                  onPress={() => {
                    if (livePrice != null) {
                      costEditedRef.current = false;
                      setNewHolding((prev) => ({ ...prev, avgCost: livePrice.toFixed(2) }));
                    }
                  }}
                >
                  {priceLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="flash" size={12} color={colors.primary} />
                      <Text style={[styles.livePriceText, { color: colors.primary }]}>
                        {t('Current Price')}: ${livePrice!.toFixed(2)}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }, addingHolding && styles.submitButtonDisabled]}
              onPress={addHolding}
              disabled={addingHolding}
            >
              {addingHolding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{t('Add to Portfolio')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#B8860B',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {},
  summaryItemLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  summaryItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  holdingsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  holdingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  holdingSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  holdingName: {
    fontSize: 13,
    color: '#8E8E93',
    maxWidth: 150,
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  holdingPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  holdingChange: {
    fontSize: 13,
    fontWeight: '500',
  },
  holdingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  holdingDetail: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  hintText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyHoldings: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B8860B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
    gap: 8,
  },
  addFirstText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  livePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  livePriceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#B8860B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
