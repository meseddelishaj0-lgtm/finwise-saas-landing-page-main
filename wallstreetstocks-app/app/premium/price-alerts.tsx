// app/premium/price-alerts.tsx
// Price Alerts — free feature (available to all tiers)
import React, { useState, useEffect } from 'react';
import { buildAuthHeaders } from '../../lib/authHeaders';
import { parseLocaleNumber } from '../../lib/parseNumber';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { priceStore } from '@/stores/priceStore';
import { useWebSocket } from '@/context/WebSocketContext';
import { useLanguage } from '@/context/LanguageContext';

interface PriceAlert {
  id: number;
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  isActive: boolean;
  isTriggered: boolean;
  createdAt: string;
  currentPrice?: number;
}

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';

// Ticker autocomplete (same source as the screener's search)
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';

interface SymbolSuggestion {
  symbol: string;
  name: string;
  exchangeShortName: string;
}

export default function PriceAlertsScreen() {
  const { subscribe: wsSubscribe } = useWebSocket();
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCondition, setNewCondition] = useState<'auto' | 'above' | 'below'>('auto');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [symbolResults, setSymbolResults] = useState<SymbolSuggestion[]>([]);
  const [showSymbolResults, setShowSymbolResults] = useState(false);
  const symbolSearchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced ticker search for the Stock Symbol field
  const searchSymbols = async (query: string) => {
    try {
      const res = await fetch(
        `${FMP_BASE_URL}/search?query=${encodeURIComponent(query)}&limit=6&exchange=NYSE,NASDAQ,AMEX&apikey=${FMP_API_KEY}`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setSymbolResults(
          data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name || item.symbol,
            exchangeShortName: item.exchangeShortName || '',
          }))
        );
        setShowSymbolResults(true);
      }
    } catch {
      // Keep whatever was showing — never break typing on a network error
    }
  };

  const handleSymbolChange = (text: string) => {
    const upper = text.toUpperCase();
    setNewSymbol(upper);
    if (symbolSearchTimeout.current) clearTimeout(symbolSearchTimeout.current);
    if (!upper.trim()) {
      setSymbolResults([]);
      setShowSymbolResults(false);
      return;
    }
    symbolSearchTimeout.current = setTimeout(() => searchSymbols(upper.trim()), 300);
  };

  const handleSymbolSelect = (symbol: string) => {
    setNewSymbol(symbol);
    setSymbolResults([]);
    setShowSymbolResults(false);
  };

  // Price alerts are a free feature — no paywall gate.

  useEffect(() => {
    loadAlerts();
  }, []);

  // Subscribe to WebSocket for alert symbols (live "current price" display)
  useEffect(() => {
    if (alerts.length === 0) return;
    const symbols = [...new Set(alerts.map(a => a.symbol))];
    wsSubscribe(symbols);
  }, [alerts, wsSubscribe]);

  // Enrich cards with live prices from the WebSocket store — display only;
  // triggering and push delivery happen server-side
  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(prev => {
        let changed = false;
        const next = prev.map(alert => {
          const price = priceStore.getQuote(alert.symbol)?.price;
          if (price && price > 0 && price !== alert.currentPrice) {
            changed = true;
            return { ...alert, currentPrice: price };
          }
          return alert;
        });
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // One-time: alerts created by the old local-only version of this screen
  // move into the account so they fire even when the app is closed
  const migrateLegacyAlerts = async (userId: string) => {
    try {
      const stored = await AsyncStorage.getItem('priceAlerts');
      if (!stored) return;
      const legacy = JSON.parse(stored);
      if (Array.isArray(legacy)) {
        for (const a of legacy) {
          if (!a?.symbol || !a?.targetPrice) continue;
          await fetch(`${API_BASE_URL}/price-alerts`, {
            method: 'POST',
            headers: await buildAuthHeaders(undefined, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              userId,
              symbol: String(a.symbol).toUpperCase(),
              targetPrice: Number(a.targetPrice),
              direction: a.condition === 'below' ? 'below' : 'above',
            }),
          }).catch(() => {});
        }
      }
      await AsyncStorage.removeItem('priceAlerts');
    } catch {}
  };

  const loadAlerts = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        setLoading(false);
        return;
      }
      await migrateLegacyAlerts(userId);
      const res = await fetch(`${API_BASE_URL}/price-alerts?userId=${userId}`, { headers: await buildAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAlerts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!newSymbol.trim() || !newPrice.trim()) {
      Alert.alert(t('Error'), t('Please enter a symbol and target price'));
      return;
    }

    const targetPrice = parseLocaleNumber(newPrice);
    if (isNaN(targetPrice) || targetPrice <= 0) {
      Alert.alert(t('Error'), t('Please enter a valid price'));
      return;
    }

    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      Alert.alert(t('Sign in Required'));
      return;
    }

    const symbol = newSymbol.toUpperCase().trim();
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/price-alerts`, {
        method: 'POST',
        headers: await buildAuthHeaders(undefined, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId, symbol, targetPrice, direction: newCondition }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (res.ok) {
        if (data.alert) setAlerts(prev => [data.alert, ...prev]);
        wsSubscribe([symbol]);
        setShowCreateModal(false);
        setNewSymbol('');
        setNewPrice('');
        setNewCondition('auto');
      } else {
        Alert.alert(t('Error'), data.error || t('Failed to create alert'));
      }
    } catch (err) {
      Alert.alert(t('Error'), t('Failed to create alert'));
    } finally {
      setCreating(false);
    }
  };

  const toggleAlert = async (alert: PriceAlert) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const res = await fetch(`${API_BASE_URL}/price-alerts`, {
        method: 'PATCH',
        headers: await buildAuthHeaders(undefined, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ alertId: alert.id, userId, isActive: !alert.isActive }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.alert) {
          setAlerts(prev =>
            prev.map(a => (a.id === alert.id ? { ...data.alert, currentPrice: a.currentPrice } : a))
          );
        } else {
          // No alert body returned — just flip the flag locally so we don't
          // blank out id/symbol/targetPrice (which would crash the row).
          setAlerts(prev =>
            prev.map(a => (a.id === alert.id ? { ...a, isActive: !a.isActive } : a))
          );
        }
      } else {
        Alert.alert(t('Error'), t('Failed to update alert'));
      }
    } catch (err) {
      Alert.alert(t('Error'), t('Failed to update alert'));
    }
  };

  const deleteAlert = (id: number) => {
    Alert.alert(
      t('Delete Alert'),
      t('Are you sure you want to delete this alert?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = await AsyncStorage.getItem('userId');
              const res = await fetch(
                `${API_BASE_URL}/price-alerts?alertId=${id}&userId=${userId}`,
                { method: 'DELETE' }
              );
              if (res.ok) {
                setAlerts(prev => prev.filter(a => a.id !== id));
              } else {
                Alert.alert(t('Error'), t('Failed to delete alert'));
              }
            } catch (err) {
              Alert.alert(t('Error'), t('Failed to delete alert'));
            }
          },
        },
      ]
    );
  };

  const getAlertStatus = (alert: PriceAlert) => {
    if (alert.isTriggered) return { text: t('Triggered'), color: '#34C759' };
    if (!alert.isActive) return { text: t('Paused'), color: '#8E8E93' };
    return { text: t('Active'), color: '#B8860B' };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('Price Alerts')}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#B8860B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="notifications" size={24} color="#E5E4E2" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{t('Real-time Price Alerts')}</Text>
            <Text style={styles.infoText}>
              {t('Get notified instantly when stocks hit your target prices. Set unlimited alerts.')}
            </Text>
          </View>
        </View>

        {/* Active Alerts Count */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alerts.filter(a => a.isActive && !a.isTriggered).length}</Text>
            <Text style={styles.statLabel}>{t('Active')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alerts.filter(a => a.isTriggered).length}</Text>
            <Text style={styles.statLabel}>{t('Triggered')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alerts.length}</Text>
            <Text style={styles.statLabel}>{t('Total')}</Text>
          </View>
        </View>

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>{t('No Alerts Yet')}</Text>
            <Text style={styles.emptyText}>
              {t('Create your first price alert to get notified when stocks hit your targets.')}
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>{t('Create Alert')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.alertsList}>
            {alerts.map((alert) => {
              const status = getAlertStatus(alert);
              const priceDistance = alert.currentPrice
                ? ((alert.targetPrice - alert.currentPrice) / alert.currentPrice * 100).toFixed(1)
                : null;

              return (
                <View key={alert.id} style={[styles.alertCard, !alert.isActive && styles.alertCardDisabled]}>
                  <View style={styles.alertHeader}>
                    <View style={styles.alertSymbol}>
                      <Text style={styles.alertSymbolText}>{alert.symbol}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                      </View>
                    </View>
                    <Switch
                      value={alert.isActive}
                      onValueChange={() => toggleAlert(alert)}
                      trackColor={{ false: '#E5E5EA', true: '#E5E4E2' }}
                      thumbColor="#FFF"
                    />
                  </View>

                  <View style={styles.alertBody}>
                    <View style={styles.alertPrices}>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>{t('Current')}</Text>
                        <Text style={styles.priceValue}>
                          ${alert.currentPrice?.toFixed(2) || '--'}
                        </Text>
                      </View>
                      <View style={styles.alertArrow}>
                        <Ionicons
                          name={alert.direction === 'above' ? 'arrow-up' : 'arrow-down'}
                          size={24}
                          color={alert.direction === 'above' ? '#34C759' : '#FF3B30'}
                        />
                      </View>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>{t('Target')}</Text>
                        <Text style={[styles.priceValue, styles.targetPrice]}>
                          ${alert.targetPrice.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {priceDistance && (
                      <View style={styles.distanceContainer}>
                        <Text style={styles.distanceText}>
                          {parseFloat(priceDistance) > 0 ? '+' : ''}{priceDistance}{t('% to target')}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.alertFooter}>
                    <Text style={styles.alertCondition}>
                      {t('Alert when price goes')} {t(alert.direction)} ${alert.targetPrice.toFixed(2)}
                    </Text>
                    <TouchableOpacity onPress={() => deleteAlert(alert.id)} style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Alert Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        {/* Lift the bottom sheet above the keyboard — without this the
            keyboard buried Target Price + the Create button. */}
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Create Price Alert')}</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>{t('Stock Symbol')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="search" size={20} color="#8E8E93" />
                <TextInput
                  style={styles.input}
                  placeholder={t('e.g., AAPL')}
                  placeholderTextColor="#8E8E93"
                  value={newSymbol}
                  onChangeText={handleSymbolChange}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              {/* Live ticker suggestions while typing */}
              {showSymbolResults && symbolResults.length > 0 && (
                <View style={styles.suggestionBox}>
                  <ScrollView
                    style={{ maxHeight: 150 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {symbolResults.map((item) => (
                      <TouchableOpacity
                        key={item.symbol}
                        style={styles.suggestionRow}
                        onPress={() => handleSymbolSelect(item.symbol)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionSymbol}>{item.symbol}</Text>
                          <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                        </View>
                        <Text style={styles.suggestionExchange}>{item.exchangeShortName}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>{t('Target Price')}</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#8E8E93"
                  value={newPrice}
                  onChangeText={setNewPrice}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={styles.inputLabel}>{t('Alert Condition')}</Text>
              <View style={styles.conditionRow}>
                <TouchableOpacity
                  style={[
                    styles.conditionButton,
                    newCondition === 'auto' && styles.conditionButtonActiveGold,
                  ]}
                  onPress={() => setNewCondition('auto')}
                >
                  <Ionicons
                    name="swap-vertical"
                    size={20}
                    color={newCondition === 'auto' ? '#FFF' : '#B8860B'}
                  />
                  <Text style={[
                    styles.conditionText,
                    newCondition === 'auto' && styles.conditionTextActive,
                  ]}>
                    {t('Auto')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.conditionButton,
                    newCondition === 'above' && styles.conditionButtonActive,
                  ]}
                  onPress={() => setNewCondition('above')}
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={newCondition === 'above' ? '#FFF' : '#34C759'}
                  />
                  <Text style={[
                    styles.conditionText,
                    newCondition === 'above' && styles.conditionTextActive,
                  ]}>
                    {t('Above')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.conditionButton,
                    newCondition === 'below' && styles.conditionButtonActiveRed,
                  ]}
                  onPress={() => setNewCondition('below')}
                >
                  <Ionicons
                    name="arrow-down"
                    size={20}
                    color={newCondition === 'below' ? '#FFF' : '#FF3B30'}
                  />
                  <Text style={[
                    styles.conditionText,
                    newCondition === 'below' && styles.conditionTextActive,
                  ]}>
                    {t('Below')}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.conditionHint}>
                {t('Auto picks above or below based on the current price.')}
              </Text>

              <TouchableOpacity style={[styles.createAlertButton, creating && { opacity: 0.6 }]} onPress={createAlert} disabled={creating}>
                <Ionicons name="notifications" size={20} color="#000" />
                <Text style={styles.createAlertButtonText}>{t('Create Alert')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  platinumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E4E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  platinumBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E4E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  alertsList: {
    paddingHorizontal: 16,
  },
  alertCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  alertCardDisabled: {
    opacity: 0.6,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertSymbol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertSymbolText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertBody: {
    marginBottom: 12,
  },
  alertPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  targetPrice: {
    color: '#B8860B',
  },
  alertArrow: {
    padding: 8,
  },
  distanceContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  alertCondition: {
    fontSize: 13,
    color: '#8E8E93',
  },
  deleteButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    gap: 8,
  },
  suggestionBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: -12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    gap: 8,
  },
  suggestionSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  suggestionName: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  suggestionExchange: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B8860B',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  conditionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 5,
  },
  conditionButtonActive: {
    backgroundColor: '#34C759',
  },
  conditionButtonActiveRed: {
    backgroundColor: '#FF3B30',
  },
  conditionButtonActiveGold: {
    backgroundColor: '#B8860B',
  },
  conditionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  conditionHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 20,
  },
  conditionTextActive: {
    color: '#FFF',
  },
  createAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E4E2',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createAlertButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
