// app/premium/price-alerts.tsx
// Platinum Feature - Real-time Price Alerts
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePremiumFeature, FEATURE_TIERS } from '@/hooks/usePremiumFeature';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  enabled: boolean;
  createdAt: string;
  triggered: boolean;
  currentPrice?: number;
}

const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';

export default function PriceAlertsScreen() {
  const { canAccess } = usePremiumFeature();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCondition, setNewCondition] = useState<'above' | 'below'>('above');
  const [loading, setLoading] = useState(true);

  // Redirect to paywall if user doesn't have access
  useEffect(() => {
    if (!canAccess(FEATURE_TIERS.REALTIME_ALERTS)) {
      router.replace('/(modals)/paywall');
    }
  }, [canAccess]);

  // Load alerts from storage
  useEffect(() => {
    loadAlerts();
  }, []);

  // Periodically check prices
  useEffect(() => {
    const interval = setInterval(() => {
      updatePrices();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [alerts]);

  const loadAlerts = async () => {
    try {
      const stored = await AsyncStorage.getItem('priceAlerts');
      if (stored) {
        setAlerts(JSON.parse(stored));
      }
      setLoading(false);
      updatePrices();
    } catch (err) {
      console.error('Error loading alerts:', err);
      setLoading(false);
    }
  };

  const saveAlerts = async (newAlerts: PriceAlert[]) => {
    try {
      await AsyncStorage.setItem('priceAlerts', JSON.stringify(newAlerts));
      setAlerts(newAlerts);
    } catch (err) {
      console.error('Error saving alerts:', err);
    }
  };

  const updatePrices = async () => {
    if (alerts.length === 0) return;

    const symbols = [...new Set(alerts.map(a => a.symbol))];

    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbols.join(',')}?apikey=${FMP_API_KEY}`
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        const priceMap: Record<string, number> = {};
        data.forEach((quote: any) => {
          priceMap[quote.symbol] = quote.price;
        });

        const updatedAlerts = alerts.map(alert => {
          const currentPrice = priceMap[alert.symbol];
          if (currentPrice) {
            const wasTriggered = alert.triggered;
            const isNowTriggered = alert.condition === 'above'
              ? currentPrice >= alert.targetPrice
              : currentPrice <= alert.targetPrice;

            // Notify if newly triggered
            if (!wasTriggered && isNowTriggered && alert.enabled) {
              Alert.alert(
                'Price Alert Triggered!',
                `${alert.symbol} is now ${alert.condition === 'above' ? 'above' : 'below'} $${alert.targetPrice.toFixed(2)}\nCurrent price: $${currentPrice.toFixed(2)}`
              );
            }

            return {
              ...alert,
              currentPrice,
              triggered: isNowTriggered,
            };
          }
          return alert;
        });

        saveAlerts(updatedAlerts);
      }
    } catch (err) {
      console.error('Error updating prices:', err);
    }
  };

  const createAlert = async () => {
    if (!newSymbol.trim() || !newPrice.trim()) {
      Alert.alert('Error', 'Please enter a symbol and target price');
      return;
    }

    const targetPrice = parseFloat(newPrice);
    if (isNaN(targetPrice) || targetPrice <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    // Fetch current price
    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${newSymbol.toUpperCase()}?apikey=${FMP_API_KEY}`
      );
      const data = await response.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        Alert.alert('Error', `Symbol ${newSymbol.toUpperCase()} not found`);
        return;
      }

      const currentPrice = data[0].price;

      const newAlert: PriceAlert = {
        id: Date.now().toString(),
        symbol: newSymbol.toUpperCase(),
        targetPrice,
        condition: newCondition,
        enabled: true,
        createdAt: new Date().toISOString(),
        triggered: false,
        currentPrice,
      };

      saveAlerts([newAlert, ...alerts]);
      setShowCreateModal(false);
      setNewSymbol('');
      setNewPrice('');
      setNewCondition('above');
    } catch (err) {
      Alert.alert('Error', 'Failed to create alert. Please try again.');
    }
  };

  const toggleAlert = (id: string) => {
    const updated = alerts.map(alert =>
      alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
    );
    saveAlerts(updated);
  };

  const deleteAlert = (id: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = alerts.filter(a => a.id !== id);
            saveAlerts(updated);
          },
        },
      ]
    );
  };

  const getAlertStatus = (alert: PriceAlert) => {
    if (!alert.enabled) return { text: 'Paused', color: '#8E8E93' };
    if (alert.triggered) return { text: 'Triggered', color: '#34C759' };
    return { text: 'Active', color: '#007AFF' };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.platinumBadge}>
            <Ionicons name="diamond" size={14} color="#000" />
            <Text style={styles.platinumBadgeText}>Platinum</Text>
          </View>
          <Text style={styles.headerTitle}>Price Alerts</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="notifications" size={24} color="#E5E4E2" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Real-time Price Alerts</Text>
            <Text style={styles.infoText}>
              Get notified instantly when stocks hit your target prices. Set unlimited alerts.
            </Text>
          </View>
        </View>

        {/* Active Alerts Count */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alerts.filter(a => a.enabled).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alerts.filter(a => a.triggered).length}</Text>
            <Text style={styles.statLabel}>Triggered</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Alerts Yet</Text>
            <Text style={styles.emptyText}>
              Create your first price alert to get notified when stocks hit your targets.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Create Alert</Text>
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
                <View key={alert.id} style={[styles.alertCard, !alert.enabled && styles.alertCardDisabled]}>
                  <View style={styles.alertHeader}>
                    <View style={styles.alertSymbol}>
                      <Text style={styles.alertSymbolText}>{alert.symbol}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                      </View>
                    </View>
                    <Switch
                      value={alert.enabled}
                      onValueChange={() => toggleAlert(alert.id)}
                      trackColor={{ false: '#E5E5EA', true: '#E5E4E2' }}
                      thumbColor={alert.enabled ? '#FFF' : '#FFF'}
                    />
                  </View>

                  <View style={styles.alertBody}>
                    <View style={styles.alertPrices}>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Current</Text>
                        <Text style={styles.priceValue}>
                          ${alert.currentPrice?.toFixed(2) || '--'}
                        </Text>
                      </View>
                      <View style={styles.alertArrow}>
                        <Ionicons
                          name={alert.condition === 'above' ? 'arrow-up' : 'arrow-down'}
                          size={24}
                          color={alert.condition === 'above' ? '#34C759' : '#FF3B30'}
                        />
                      </View>
                      <View style={styles.priceItem}>
                        <Text style={styles.priceLabel}>Target</Text>
                        <Text style={[styles.priceValue, styles.targetPrice]}>
                          ${alert.targetPrice.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {priceDistance && (
                      <View style={styles.distanceContainer}>
                        <Text style={styles.distanceText}>
                          {parseFloat(priceDistance) > 0 ? '+' : ''}{priceDistance}% to target
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.alertFooter}>
                    <Text style={styles.alertCondition}>
                      Alert when price goes {alert.condition} ${alert.targetPrice.toFixed(2)}
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Price Alert</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Stock Symbol</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="search" size={20} color="#8E8E93" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., AAPL"
                  placeholderTextColor="#8E8E93"
                  value={newSymbol}
                  onChangeText={setNewSymbol}
                  autoCapitalize="characters"
                />
              </View>

              <Text style={styles.inputLabel}>Target Price</Text>
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

              <Text style={styles.inputLabel}>Alert Condition</Text>
              <View style={styles.conditionRow}>
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
                    Price goes above
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
                    Price goes below
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.createAlertButton} onPress={createAlert}>
                <Ionicons name="notifications" size={20} color="#000" />
                <Text style={styles.createAlertButtonText}>Create Alert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    color: '#007AFF',
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
    gap: 12,
    marginBottom: 24,
  },
  conditionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  conditionButtonActive: {
    backgroundColor: '#34C759',
  },
  conditionButtonActiveRed: {
    backgroundColor: '#FF3B30',
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
