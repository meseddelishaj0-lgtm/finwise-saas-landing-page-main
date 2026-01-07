// app/portfolio/index.tsx
// Portfolio Tracker Screen
import React, { useState, useEffect, useCallback } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';

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
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingHolding, setAddingHolding] = useState(false);
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    shares: '',
    avgCost: '',
  });

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    const storedUserId = await AsyncStorage.getItem('userId');
    setUserId(storedUserId);
    if (storedUserId) {
      fetchPortfolios(storedUserId);
    } else {
      setLoading(false);
    }
  };

  const fetchPortfolios = async (uid: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio`, {
        headers: { 'x-user-id': uid },
      });
      const data = await response.json();
      if (data.portfolios) {
        setPortfolios(data.portfolios);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (userId) {
      fetchPortfolios(userId);
    }
  }, [userId]);

  const addHolding = async () => {
    if (!newHolding.symbol || !newHolding.shares || !newHolding.avgCost) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!userId || portfolios.length === 0) return;

    setAddingHolding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio/holdings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          portfolioId: portfolios[0].id,
          symbol: newHolding.symbol.toUpperCase(),
          shares: parseFloat(newHolding.shares),
          avgCost: parseFloat(newHolding.avgCost),
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewHolding({ symbol: '', shares: '', avgCost: '' });
        fetchPortfolios(userId);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to add holding');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add holding');
    } finally {
      setAddingHolding(false);
    }
  };

  const deleteHolding = (holdingId: number) => {
    Alert.alert(
      'Delete Holding',
      'Are you sure you want to remove this stock from your portfolio?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            try {
              await fetch(`${API_BASE_URL}/portfolio/holdings?id=${holdingId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': userId },
              });
              fetchPortfolios(userId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete holding');
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

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={64} color="#8E8E93" />
          <Text style={styles.emptyTitle}>Sign in Required</Text>
          <Text style={styles.emptySubtitle}>Please sign in to track your portfolio</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  const portfolio = portfolios[0];
  const hasHoldings = portfolio && portfolio.holdings.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portfolio</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Portfolio Summary */}
        {hasHoldings && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={styles.summaryValue}>{formatCurrency(portfolio.totalValue)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Total P&L</Text>
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
                <Text style={styles.summaryItemLabel}>Today</Text>
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
            <Text style={styles.sectionTitle}>Holdings ({portfolio.holdings.length})</Text>
            {portfolio.holdings.map((holding) => (
              <TouchableOpacity
                key={holding.id}
                style={styles.holdingCard}
                onPress={() => router.push(`/symbol/${holding.symbol}`)}
                onLongPress={() => deleteHolding(holding.id)}
              >
                <View style={styles.holdingHeader}>
                  <View>
                    <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                    <Text style={styles.holdingName} numberOfLines={1}>
                      {holding.name || holding.symbol}
                    </Text>
                  </View>
                  <View style={styles.holdingValue}>
                    <Text style={styles.holdingPrice}>
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
                <View style={styles.holdingDetails}>
                  <View style={styles.holdingDetail}>
                    <Text style={styles.detailLabel}>Shares</Text>
                    <Text style={styles.detailValue}>{holding.shares.toFixed(2)}</Text>
                  </View>
                  <View style={styles.holdingDetail}>
                    <Text style={styles.detailLabel}>Avg Cost</Text>
                    <Text style={styles.detailValue}>{formatCurrency(holding.avgCost)}</Text>
                  </View>
                  <View style={styles.holdingDetail}>
                    <Text style={styles.detailLabel}>Current</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(holding.currentPrice || 0)}
                    </Text>
                  </View>
                  <View style={styles.holdingDetail}>
                    <Text style={styles.detailLabel}>Today</Text>
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
            <Text style={styles.hintText}>Long press a holding to delete</Text>
          </View>
        ) : (
          <View style={styles.emptyHoldings}>
            <Ionicons name="pie-chart-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No Holdings Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add stocks to track your portfolio performance
            </Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addFirstText}>Add Your First Stock</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Holding Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Stock</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Symbol</Text>
              <TextInput
                style={styles.input}
                placeholder="AAPL"
                placeholderTextColor="#8E8E93"
                value={newHolding.symbol}
                onChangeText={(text) => setNewHolding({ ...newHolding, symbol: text.toUpperCase() })}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Number of Shares</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor="#8E8E93"
                value={newHolding.shares}
                onChangeText={(text) => setNewHolding({ ...newHolding, shares: text })}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Average Cost per Share</Text>
              <TextInput
                style={styles.input}
                placeholder="150.00"
                placeholderTextColor="#8E8E93"
                value={newHolding.avgCost}
                onChangeText={(text) => setNewHolding({ ...newHolding, avgCost: text })}
                keyboardType="decimal-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, addingHolding && styles.submitButtonDisabled]}
              onPress={addHolding}
              disabled={addingHolding}
            >
              {addingHolding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add to Portfolio</Text>
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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
  submitButton: {
    backgroundColor: '#007AFF',
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
