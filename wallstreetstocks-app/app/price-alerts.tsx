// app/price-alerts.tsx
// Screen for managing price alerts
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';

const API_BASE_URL = "https://www.wallstreetstocks.ai/api";

interface PriceAlert {
  id: number;
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

export default function PriceAlerts() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [symbol, setSymbol] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');

  const fetchAlerts = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/price-alerts?userId=${userId}`);

      if (res.ok) {
        const data = await res.json();
        setAlerts(Array.isArray(data) ? data : []);
      } else {
        
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, []);

  const createAlert = async () => {
    if (!symbol.trim() || !targetPrice.trim()) {
      Alert.alert('Error', 'Please enter a symbol and target price');
      return;
    }

    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setCreating(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      const res = await fetch(`${API_BASE_URL}/price-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          symbol: symbol.toUpperCase().trim(),
          targetPrice: price,
          direction,
        }),
      });

      // Handle empty or non-JSON responses
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        
        data = { error: 'Server returned invalid response' };
      }

      if (res.ok) {
        if (data.alert) {
          setAlerts(prev => [data.alert, ...prev]);
        }
        setShowCreateModal(false);
        setSymbol('');
        setTargetPrice('');
        setDirection('above');
        Alert.alert('Success', `Price alert created for ${symbol.toUpperCase()}`);
      } else {
        Alert.alert('Error', data.error || `Failed to create alert (${res.status})`);
      }
    } catch (error) {
      
      Alert.alert('Error', 'Failed to create alert');
    } finally {
      setCreating(false);
    }
  };

  const deleteAlert = async (alertId: number) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this price alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = await AsyncStorage.getItem('userId');
              const res = await fetch(
                `${API_BASE_URL}/price-alerts?alertId=${alertId}&userId=${userId}`,
                { method: 'DELETE' }
              );

              if (res.ok) {
                setAlerts(prev => prev.filter(a => a.id !== alertId));
              } else {
                Alert.alert('Error', 'Failed to delete alert');
              }
            } catch (error) {
              
              Alert.alert('Error', 'Failed to delete alert');
            }
          },
        },
      ]
    );
  };

  const toggleAlert = async (alert: PriceAlert) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const res = await fetch(`${API_BASE_URL}/price-alerts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.id,
          userId,
          isActive: !alert.isActive,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAlerts(prev =>
          prev.map(a => (a.id === alert.id ? data.alert : a))
        );
      } else {
        Alert.alert('Error', 'Failed to update alert');
      }
    } catch (error) {
      
      Alert.alert('Error', 'Failed to update alert');
    }
  };

  const renderAlert = ({ item }: { item: PriceAlert }) => {
    const isTriggered = item.isTriggered;
    const isActive = item.isActive && !isTriggered;

    return (
      <View style={[styles.alertItem, { backgroundColor: colors.card, borderBottomColor: isDark ? colors.border : '#F0F0F0' }, isTriggered && (isDark ? { backgroundColor: '#2C2A1A' } : styles.triggeredAlert)]}>
        <TouchableOpacity
          style={styles.alertContent}
          onPress={() => router.push(`/symbol/${item.symbol}/chart` as any)}
        >
          <View style={styles.symbolContainer}>
            <Text style={[styles.symbol, { color: colors.text }]}>{item.symbol}</Text>
            {isTriggered && (
              <View style={styles.triggeredBadge}>
                <Text style={styles.triggeredText}>Triggered</Text>
              </View>
            )}
          </View>
          <Text style={[styles.alertCondition, { color: colors.textSecondary }]}>
            {item.direction === 'above' ? 'Above' : 'Below'} ${item.targetPrice.toFixed(2)}
          </Text>
          <Text style={[styles.alertDate, { color: colors.textTertiary }]}>
            Created {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        <View style={styles.alertActions}>
          {!isTriggered && (
            <TouchableOpacity
              style={[styles.toggleButton, isActive && (isDark ? { backgroundColor: '#2C2A1A', borderRadius: 8 } : styles.activeToggle)]}
              onPress={() => toggleAlert(item)}
            >
              <Ionicons
                name={isActive ? 'notifications' : 'notifications-off'}
                size={20}
                color={isActive ? '#FFD700' : colors.textTertiary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteAlert(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const activeAlerts = alerts.filter(a => a.isActive && !a.isTriggered);
  const triggeredAlerts = alerts.filter(a => a.isTriggered);
  const inactiveAlerts = alerts.filter(a => !a.isActive && !a.isTriggered);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDark ? colors.border : '#E5E5E5' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Price Alerts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No price alerts yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Create an alert to get notified when a stock reaches your target price
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.createButtonText}>Create Alert</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[...activeAlerts, ...triggeredAlerts, ...inactiveAlerts]}
          renderItem={renderAlert}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            activeAlerts.length > 0 ? (
              <View style={[styles.sectionHeader, { backgroundColor: isDark ? colors.surface : '#F8F8F8' }]}>
                <Ionicons name="notifications" size={16} color="#FFD700" />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Create Alert Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Price Alert</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Stock Symbol</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#E5E5E5', color: colors.text }]}
              placeholder="e.g., AAPL, TSLA, NVDA"
              placeholderTextColor={colors.textTertiary}
              value={symbol}
              onChangeText={setSymbol}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target Price</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#E5E5E5', color: colors.text }]}
              placeholder="e.g., 150.00"
              placeholderTextColor={colors.textTertiary}
              value={targetPrice}
              onChangeText={setTargetPrice}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Alert When Price Goes</Text>
            <View style={styles.directionContainer}>
              <TouchableOpacity
                style={[
                  styles.directionButton,
                  { borderColor: isDark ? colors.border : '#E5E5E5' },
                  direction === 'above' && styles.selectedDirection,
                ]}
                onPress={() => setDirection('above')}
              >
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={direction === 'above' ? '#FFF' : '#34C759'}
                />
                <Text
                  style={[
                    styles.directionText,
                    { color: colors.text },
                    direction === 'above' && styles.selectedDirectionText,
                  ]}
                >
                  Above
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.directionButton,
                  { borderColor: isDark ? colors.border : '#E5E5E5' },
                  direction === 'below' && styles.selectedDirectionBelow,
                ]}
                onPress={() => setDirection('below')}
              >
                <Ionicons
                  name="trending-down"
                  size={20}
                  color={direction === 'below' ? '#FFF' : '#FF3B30'}
                />
                <Text
                  style={[
                    styles.directionText,
                    { color: colors.text },
                    direction === 'below' && styles.selectedDirectionText,
                  ]}
                >
                  Below
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, creating && styles.disabledButton]}
              onPress={createAlert}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Alert</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  addButton: {
    padding: 4,
  },
  list: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  triggeredAlert: {
    backgroundColor: '#FFF9E6',
  },
  alertContent: {
    flex: 1,
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  triggeredBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  triggeredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  alertCondition: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  alertDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    padding: 8,
    marginRight: 4,
  },
  activeToggle: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  directionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  directionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    gap: 8,
  },
  selectedDirection: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  selectedDirectionBelow: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  directionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectedDirectionText: {
    color: '#FFF',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
