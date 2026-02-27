// app/symbol/[symbol]/chart.tsx - Stock Chart with WebSocket Real-Time Prices
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useGlobalSearchParams, useSegments } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFromMemory, setToMemory, clearFromMemory, CACHE_KEYS } from '../../../utils/memoryCache';
import { priceStore, useQuote } from '../../../stores/priceStore';
import { useWebSocket } from '../../../context/WebSocketContext';
import TechnicalIndicators from '../../../components/TechnicalIndicators';

// ============================================================================
// CONSTANTS
// ============================================================================
const API_BASE_URL = "https://www.wallstreetstocks.ai/api";
const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHART_HEIGHT = SCREEN_HEIGHT * 0.38;

type Timeframe = '1D' | '5D' | '1M' | '3M' | '1Y' | 'ALL';
type MarketStatus = 'pre-market' | 'open' | 'after-hours' | 'closed';

// WebSocket covers: 4:00 AM - 8:00 PM ET (16 hours)
// Chart intervals sized to show full trading day
const TIMEFRAME_CONFIG: Record<Timeframe, { interval: string; outputsize: number }> = {
  '1D': { interval: '1min', outputsize: 960 },   // 16 hours * 60 = 960 points
  '5D': { interval: '5min', outputsize: 480 },   // 5 days of trading
  '1M': { interval: '15min', outputsize: 640 },  // ~22 trading days
  '3M': { interval: '1h', outputsize: 520 },     // ~65 trading days
  '1Y': { interval: '1day', outputsize: 252 },   // 252 trading days
  'ALL': { interval: '1week', outputsize: 500 }, // ~10 years
};

const CACHE_TTL: Record<Timeframe, number> = {
  '1D': 60 * 1000,
  '5D': 5 * 60 * 1000,
  '1M': 15 * 60 * 1000,
  '3M': 30 * 60 * 1000,
  '1Y': 60 * 60 * 1000,
  'ALL': 60 * 60 * 1000
};

// ============================================================================
// TYPES
// ============================================================================
interface ChartDataPoint {
  value: number;
  label: string;
  date: Date;
}

// ============================================================================
// TIME UTILITIES
// ============================================================================

/**
 * Get current Eastern Time info
 */
function getEasternTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';

  const hour = parseInt(get('hour')) || 0;
  const minute = parseInt(get('minute')) || 0;

  return {
    hour,
    minute,
    dayOfWeek: get('weekday'),
    totalMinutes: hour * 60 + minute,
  };
}

/**
 * Get market status based on Eastern Time
 */
function getMarketStatus(): MarketStatus {
  const { totalMinutes, dayOfWeek } = getEasternTime();

  if (dayOfWeek === 'Sat' || dayOfWeek === 'Sun') return 'closed';

  const PRE_MARKET_START = 4 * 60;    // 4:00 AM
  const MARKET_OPEN = 9 * 60 + 30;    // 9:30 AM
  const MARKET_CLOSE = 16 * 60;       // 4:00 PM
  const AFTER_HOURS_END = 20 * 60;    // 8:00 PM

  if (totalMinutes >= PRE_MARKET_START && totalMinutes < MARKET_OPEN) return 'pre-market';
  if (totalMinutes >= MARKET_OPEN && totalMinutes < MARKET_CLOSE) return 'open';
  if (totalMinutes >= MARKET_CLOSE && totalMinutes < AFTER_HOURS_END) return 'after-hours';

  return 'closed';
}

/**
 * Check if in extended hours
 */
function isExtendedHours(): boolean {
  const status = getMarketStatus();
  return status === 'pre-market' || status === 'after-hours';
}

/**
 * Parse Twelve Data datetime string to Date
 * Twelve Data returns times in exchange timezone (ET for US stocks)
 */
function parseTwelveDataTime(datetime: string, isCrypto: boolean = false): Date {
  if (isCrypto) {
    return new Date(datetime + 'Z');
  }

  // US stocks - time is in Eastern Time
  // Format: "2024-01-15 09:30:00" or "2024-01-15"
  const tempDate = new Date(datetime.replace(' ', 'T'));
  const month = tempDate.getMonth();

  // DST: roughly March-November
  const isDST = month >= 2 && month <= 10;
  const offset = isDST ? '-04:00' : '-05:00';

  return new Date(datetime.replace(' ', 'T') + offset);
}

/**
 * Format date for tooltip display
 */
function formatTooltipDate(date: Date, timeframe: Timeframe): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  if (timeframe === '1D') {
    // Show time in user's local timezone
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else if (timeframe === '5D') {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: timeframe === '1M' ? undefined : 'numeric',
    });
  }
}

/**
 * Convert symbol to Twelve Data format
 */
function formatSymbolForApi(symbol: string): string {
  const etfs = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'XLF', 'XLE', 'XLK', 'ARKK'];

  if (symbol.endsWith('USD') && symbol.length <= 10 && !symbol.includes('/') && !etfs.includes(symbol)) {
    return symbol.slice(0, -3) + '/USD';
  }

  return symbol;
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

async function getAsyncCache<T>(key: string, ttl: number): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttl) {
        return data;
      }
    }
  } catch (e) {}
  return null;
}

async function setAsyncCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {}
}

async function clearChartCache(symbol: string): Promise<void> {
  try {
    const timeframes: Timeframe[] = ['1D', '5D', '1M', '3M', '1Y', 'ALL'];
    const keys = timeframes.map(tf => `chart_cache_${symbol}_${tf}`);
    await AsyncStorage.multiRemove(keys);
    timeframes.forEach(tf => clearFromMemory(CACHE_KEYS.chart(symbol, tf)));
  } catch (e) {}
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChartTab() {
  // Extract symbol from route params
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const segments = useSegments();

  let symbol: string | null = null;
  if (localParams.symbol) {
    symbol = Array.isArray(localParams.symbol) ? localParams.symbol[0] : localParams.symbol;
  }
  if (!symbol && globalParams.symbol) {
    symbol = Array.isArray(globalParams.symbol) ? globalParams.symbol[0] : globalParams.symbol;
  }
  if (!symbol && segments.length >= 2) {
    const symbolIndex = segments.findIndex(seg => seg === 'symbol') + 1;
    if (symbolIndex > 0 && symbolIndex < segments.length) {
      symbol = segments[symbolIndex] as string;
    }
  }

  const cleanSymbol = symbol
    ? decodeURIComponent(String(symbol)).trim().replace(/^\[|\]$/g, '').toUpperCase()
    : null;

  const apiSymbol = cleanSymbol ? formatSymbolForApi(cleanSymbol) : null;
  const isCrypto = apiSymbol?.includes('/') ?? false;

  // ============================================================================
  // STATE
  // ============================================================================
  const [rawChartData, setRawChartData] = useState<ChartDataPoint[]>([]);
  const rawChartDataRef = useRef<ChartDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [previousClose, setPreviousClose] = useState<number | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(getMarketStatus());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pointerData, setPointerData] = useState<{ price: number; date: string; change: number } | null>(null);

  // Price Alert State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');
  const [creatingAlert, setCreatingAlert] = useState(false);

  // Technical Indicators
  const [showIndicators, setShowIndicators] = useState(false);

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ============================================================================
  // WEBSOCKET INTEGRATION
  // ============================================================================
  const { subscribe, isConnected } = useWebSocket();
  const [priceUpdateTrigger, setPriceUpdateTrigger] = useState(0);
  const priceRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to WebSocket
  useEffect(() => {
    if (cleanSymbol && isConnected) {
      const symbolsToSubscribe = [cleanSymbol];
      if (apiSymbol && apiSymbol !== cleanSymbol) {
        symbolsToSubscribe.push(apiSymbol);
      }
      subscribe(symbolsToSubscribe);
    }
  }, [cleanSymbol, apiSymbol, isConnected, subscribe]);

  // Fast re-render for WebSocket price updates
  useEffect(() => {
    priceRefreshIntervalRef.current = setInterval(() => {
      setPriceUpdateTrigger(prev => prev + 1);
    }, 100);

    return () => {
      if (priceRefreshIntervalRef.current) {
        clearInterval(priceRefreshIntervalRef.current);
      }
    };
  }, []);

  // Get quote from WebSocket store
  const realtimeQuoteMain = useQuote(cleanSymbol || '');
  const realtimeQuoteAlt = useQuote(apiSymbol || '');
  const liveQuote = realtimeQuoteMain ?? realtimeQuoteAlt;
  const livePrice = liveQuote?.price;
  const wsChange = liveQuote?.change;
  const wsChangePercent = liveQuote?.changePercent;

  // Update price when WebSocket sends new data
  useEffect(() => {
    if (livePrice && livePrice !== currentPrice) {
      setCurrentPrice(livePrice);
      setLastUpdated(new Date());

      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [livePrice, priceUpdateTrigger]);

  // ============================================================================
  // CHART DATA PROCESSING
  // ============================================================================

  const liveChartData = useMemo(() => {
    if (rawChartData.length === 0) return [];

    let result = [...rawChartData];

    // For 1D, append live price if available
    if (timeframe === '1D') {
      const currentLivePrice = livePrice ?? currentPrice;

      if (currentLivePrice && result.length > 0) {
        const now = new Date();
        const lastPoint = result[result.length - 1];
        const timeDiff = now.getTime() - lastPoint.date.getTime();

        // If last point is more than 1 minute old, append live price
        if (timeDiff > 60000) {
          result.push({
            value: currentLivePrice,
            label: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            date: now,
          });
        } else {
          // Update last point with live price
          result[result.length - 1] = {
            ...lastPoint,
            value: currentLivePrice,
          };
        }
      }
    }

    // Sample if too many points
    const MAX_POINTS = 150;
    if (result.length > MAX_POINTS) {
      const sampleRate = Math.ceil(result.length / MAX_POINTS);
      const sampled = result.filter((_, i) => i % sampleRate === 0);
      if (sampled[sampled.length - 1] !== result[result.length - 1]) {
        sampled.push(result[result.length - 1]);
      }
      result = sampled;
    }

    return result;
  }, [rawChartData, timeframe, livePrice, currentPrice, priceUpdateTrigger]);

  // ============================================================================
  // PRICE CHANGE CALCULATION
  // ============================================================================

  const priceChange = useMemo(() => {
    // Prefer WebSocket values
    if (wsChange !== undefined && wsChangePercent !== undefined) {
      return { amount: wsChange, percent: wsChangePercent };
    }

    // Fallback: calculate from previousClose (accurate) or chart first point
    const price = livePrice ?? currentPrice;
    if (price === null) return { amount: 0, percent: 0 };

    const refPrice = previousClose || (liveChartData.length > 0 ? liveChartData[0]?.value : null) || price;
    const amount = price - refPrice;
    const percent = refPrice > 0 ? (amount / refPrice) * 100 : 0;

    return { amount, percent };
  }, [liveChartData, livePrice, currentPrice, wsChange, wsChangePercent, previousClose]);

  const isPositive = priceChange.amount >= 0;
  const priceColor = isPositive ? '#00C853' : '#FF3B30';

  // ============================================================================
  // Y-AXIS BOUNDS
  // ============================================================================

  const yAxisBounds = useMemo(() => {
    if (liveChartData.length === 0) return { min: 0, max: 100 };

    const values = liveChartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range * 0.1 || max * 0.05;

    return {
      min: Math.max(0, min - padding),
      max: max + padding,
    };
  }, [liveChartData]);

  const chartSpacing = useMemo(() => {
    if (liveChartData.length <= 1) return 10;
    return Math.max(2, (SCREEN_WIDTH - 25) / liveChartData.length);
  }, [liveChartData.length]);

  // ============================================================================
  // API FETCHING
  // ============================================================================

  const fetchQuote = useCallback(async () => {
    if (!cleanSymbol || !apiSymbol) return;

    try {
      const res = await fetch(`${TWELVE_DATA_URL}/quote?symbol=${encodeURIComponent(apiSymbol)}&apikey=${TWELVE_DATA_API_KEY}`);
      const data = await res.json();

      let price = parseFloat(data?.close) || 0;
      const prevClose = parseFloat(data?.previous_close) || 0;

      if (price === 0 && rawChartDataRef.current.length > 0) {
        price = rawChartDataRef.current[rawChartDataRef.current.length - 1]?.value || 0;
      }

      if (price > 0) {
        const refPrice = prevClose > 0 ? prevClose : price;
        const change = price - refPrice;
        const changePercent = refPrice > 0 ? (change / refPrice) * 100 : 0;

        setCurrentPrice(price);
        if (prevClose > 0) setPreviousClose(prevClose);
        setError(null);

        priceStore.setQuote({
          symbol: cleanSymbol,
          price,
          change,
          changePercent,
          previousClose: refPrice,
        });
      }
    } catch (err) {}
  }, [cleanSymbol, apiSymbol]);

  const fetchChartData = useCallback(async (showLoading = true) => {
    if (!cleanSymbol || !apiSymbol) return;

    const cacheKey = `chart_cache_${cleanSymbol}_${timeframe}`;
    const memCacheKey = CACHE_KEYS.chart(cleanSymbol, timeframe);
    const ttl = CACHE_TTL[timeframe];
    const skipCache = timeframe === '1D' && isExtendedHours();

    // Try memory cache
    if (!skipCache) {
      const memCached = getFromMemory<ChartDataPoint[]>(memCacheKey, ttl);
      if (memCached && memCached.length > 0) {
        setRawChartData(memCached.map(d => ({ ...d, date: new Date(d.date) })));
        setLoading(false);
      }
    }

    // Try async cache
    if (!skipCache && rawChartDataRef.current.length === 0) {
      const asyncCached = await getAsyncCache<ChartDataPoint[]>(cacheKey, ttl);
      if (asyncCached && asyncCached.length > 0) {
        const restored = asyncCached.map(d => ({ ...d, date: new Date(d.date) }));
        setRawChartData(restored);
        setToMemory(memCacheKey, restored);
        setLoading(false);
      }
    }

    if (showLoading && rawChartDataRef.current.length === 0) {
      setLoading(true);
    }

    try {
      const config = TIMEFRAME_CONFIG[timeframe];
      const prepostParam = (timeframe === '1D' || timeframe === '5D') ? '&prepost=true' : '';
      const url = `${TWELVE_DATA_URL}/time_series?symbol=${encodeURIComponent(apiSymbol)}&interval=${config.interval}&outputsize=${config.outputsize}${prepostParam}&apikey=${TWELVE_DATA_API_KEY}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data?.values && Array.isArray(data.values) && data.values.length > 0) {
        // Reverse: Twelve Data returns newest first
        const values = [...data.values].reverse();

        const formatted: ChartDataPoint[] = values.map((d: any) => {
          const date = parseTwelveDataTime(d.datetime, isCrypto);

          let label = '';
          if (timeframe === '1D') {
            label = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          } else if (timeframe === '5D') {
            label = date.toLocaleDateString('en-US', { weekday: 'short' });
          } else if (timeframe === '1M' || timeframe === '3M') {
            label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else {
            label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          }

          return { value: parseFloat(d.close), label, date };
        });

        // Sample for ALL timeframe
        let finalData = formatted;
        if (timeframe === 'ALL' && formatted.length > 200) {
          const sampleRate = Math.ceil(formatted.length / 200);
          finalData = formatted.filter((_, i) => i % sampleRate === 0);
        }

        setRawChartData(finalData);
        setError(null);

        // Cache
        setToMemory(memCacheKey, finalData);
        await setAsyncCache(cacheKey, finalData);
      } else if (rawChartDataRef.current.length === 0) {
        setError('No data available');
      }
    } catch (err) {
      if (rawChartDataRef.current.length === 0) {
        setError('Unable to load chart');
      }
    } finally {
      setLoading(false);
    }
  }, [cleanSymbol, apiSymbol, timeframe, isCrypto]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (cleanSymbol && isExtendedHours()) {
      clearChartCache(cleanSymbol);
    }
  }, [cleanSymbol]);

  useEffect(() => {
    rawChartDataRef.current = rawChartData;
  }, [rawChartData]);

  useEffect(() => {
    if (!cleanSymbol) {
      setLoading(false);
      setError('No symbol provided');
      return;
    }

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Initial fetch
    fetchQuote();
    fetchChartData(true);
    setMarketStatus(getMarketStatus());

    // Market status update
    intervalRef.current = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cleanSymbol, timeframe, fetchQuote, fetchChartData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTimeframeChange = (tf: Timeframe) => {
    if (tf !== timeframe) {
      setPointerData(null);
      setRawChartData([]);
      setLoading(true);
      setTimeframe(tf);
    }
  };

  const createPriceAlert = async () => {
    if (!alertPrice.trim() || !cleanSymbol) {
      Alert.alert('Error', 'Please enter a target price');
      return;
    }

    const price = parseFloat(alertPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setCreatingAlert(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'Please log in to create price alerts');
        setCreatingAlert(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/price-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          symbol: cleanSymbol,
          targetPrice: price,
          direction: alertDirection,
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: 'Server returned invalid response' };
      }

      if (res.ok) {
        setShowAlertModal(false);
        setAlertPrice('');
        Alert.alert('Alert Created', `You'll be notified when ${cleanSymbol} goes ${alertDirection} $${price.toFixed(2)}`);
      } else {
        Alert.alert('Error', data.error || `Failed to create alert (${res.status})`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create alert');
    } finally {
      setCreatingAlert(false);
    }
  };

  const openAlertModal = () => {
    if (currentPrice) {
      setAlertPrice(currentPrice.toFixed(2));
    }
    setShowAlertModal(true);
  };

  // ============================================================================
  // DISPLAY VALUES
  // ============================================================================

  const formatPrice = (price: number | null) => {
    if (price === null) return '—';
    if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  const latestChartPrice = liveChartData.length > 0 ? liveChartData[liveChartData.length - 1]?.value : null;
  const displayPrice = pointerData?.price ?? livePrice ?? currentPrice ?? latestChartPrice;
  const displayChange = pointerData ? pointerData.change : priceChange.amount;
  const displayPercent = pointerData
    ? ((previousClose || liveChartData[0]?.value) ? (pointerData.change / (previousClose || liveChartData[0]?.value)) * 100 : 0)
    : priceChange.percent;
  const displayColor = displayChange >= 0 ? '#00C853' : '#FF3B30';

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && liveChartData.length === 0 && currentPrice === null) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonContainer}>
          <View style={styles.priceSkeleton}>
            <View style={[styles.skeletonBox, { width: 140, height: 44 }]} />
            <View style={[styles.skeletonBox, { width: 100, height: 28, marginTop: 8, borderRadius: 14 }]} />
          </View>
          <View style={[styles.skeletonBox, { width: '100%', height: 200, marginTop: 20 }]} />
          <View style={styles.timeframeSkeleton}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <View key={i} style={[styles.skeletonBox, { width: 48, height: 36, borderRadius: 18 }]} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Price Header */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>{formatPrice(displayPrice)}</Text>

          <View style={styles.changeRow}>
            <View style={[styles.changePill, { backgroundColor: displayColor + '15' }]}>
              <Ionicons name={displayChange >= 0 ? 'arrow-up' : 'arrow-down'} size={14} color={displayColor} />
              <Text style={[styles.changeText, { color: displayColor }]}>
                {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)} ({displayPercent >= 0 ? '+' : ''}{displayPercent.toFixed(2)}%)
              </Text>
            </View>
            {pointerData && <Text style={styles.pointerDate}>{pointerData.date}</Text>}
          </View>

          {!pointerData && (
            <View style={styles.updateRow}>
              <View style={[
                styles.marketStatusBadge,
                marketStatus === 'open' && styles.marketStatusOpen,
                marketStatus === 'pre-market' && styles.marketStatusPreMarket,
                marketStatus === 'after-hours' && styles.marketStatusAfterHours,
                marketStatus === 'closed' && styles.marketStatusClosed,
              ]}>
                <View style={[
                  styles.marketStatusDot,
                  marketStatus === 'open' && { backgroundColor: '#00C853' },
                  marketStatus === 'pre-market' && { backgroundColor: '#FF9500' },
                  marketStatus === 'after-hours' && { backgroundColor: '#AF52DE' },
                  marketStatus === 'closed' && { backgroundColor: '#8E8E93' },
                ]} />
                <Text style={[
                  styles.marketStatusText,
                  marketStatus === 'open' && { color: '#00C853' },
                  marketStatus === 'pre-market' && { color: '#FF9500' },
                  marketStatus === 'after-hours' && { color: '#AF52DE' },
                ]}>
                  {marketStatus === 'open' ? 'Market Open' :
                   marketStatus === 'pre-market' ? 'Pre-Market' :
                   marketStatus === 'after-hours' ? 'After Hours' : 'Closed'}
                </Text>
              </View>
              <Text style={styles.lastUpdated}>
                {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
              <Animated.View style={[styles.liveDot, { backgroundColor: priceColor, transform: [{ scale: pulseAnim }] }]} />
            </View>
          )}
        </View>

        {/* Chart */}
        <View style={styles.chartContainer} onTouchEnd={() => setTimeout(() => setPointerData(null), 150)}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#8E8E93" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchChartData(true)}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : loading && liveChartData.length <= 1 ? (
            <View style={styles.noDataContainer}>
              <ActivityIndicator size="small" color="#8E8E93" />
            </View>
          ) : liveChartData.length > 1 ? (
            <View style={styles.chartInner}>
              {/* Baseline - First price of the period */}
              <View style={[
                styles.baselineLine,
                { top: CHART_HEIGHT * (1 - (liveChartData[0].value - yAxisBounds.min) / (yAxisBounds.max - yAxisBounds.min)) },
              ]}>
                <View style={styles.dottedLineContainer}>
                  {Array.from({ length: Math.floor((SCREEN_WIDTH - 60) / 8) }).map((_, i) => (
                    <View key={i} style={styles.dot} />
                  ))}
                </View>
                <View style={styles.baselineLabel}>
                  <Text style={styles.baselineLabelText}>${liveChartData[0].value.toFixed(2)}</Text>
                </View>
              </View>

              <LineChart
                data={liveChartData.map((d, idx) => ({ value: d.value, label: '', dataPointIndex: idx }))}
                height={CHART_HEIGHT}
                width={SCREEN_WIDTH - 10}
                areaChart
                curved
                curvature={0.15}
                color={priceColor}
                thickness={2}
                startFillColor={priceColor}
                endFillColor={priceColor}
                startOpacity={0.3}
                endOpacity={0.02}
                hideDataPoints
                hideAxesAndRules
                hideYAxisText
                backgroundColor="transparent"
                spacing={chartSpacing}
                initialSpacing={5}
                endSpacing={15}
                yAxisOffset={yAxisBounds.min}
                maxValue={yAxisBounds.max - yAxisBounds.min}
                adjustToWidth
                pointerConfig={{
                  pointerStripHeight: CHART_HEIGHT,
                  pointerStripColor: priceColor + '60',
                  pointerStripWidth: 1.5,
                  pointerColor: priceColor,
                  radius: 7,
                  pointerLabelWidth: 140,
                  pointerLabelHeight: 80,
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  shiftPointerLabelX: -70,
                  shiftPointerLabelY: -85,
                  pointerLabelComponent: (items: any) => {
                    if (!items || items.length === 0) return null;

                    const item = items[0];
                    const pointerIndex = item?.index ?? item?.dataPointIndex ?? item?.pointerIndex;
                    const currentValue = item?.value;

                    if (currentValue === undefined || currentValue === null) return null;

                    // Find matched point by index
                    let matchedPoint: ChartDataPoint | null = null;
                    if (pointerIndex !== undefined && pointerIndex >= 0 && pointerIndex < liveChartData.length) {
                      matchedPoint = liveChartData[pointerIndex];
                    } else {
                      // Fallback: find by closest value
                      let closestDiff = Infinity;
                      let closestIdx = 0;
                      for (let i = 0; i < liveChartData.length; i++) {
                        const diff = Math.abs(liveChartData[i].value - currentValue);
                        if (diff < closestDiff) {
                          closestDiff = diff;
                          closestIdx = i;
                        }
                      }
                      matchedPoint = liveChartData[closestIdx];
                    }

                    const startPrice = liveChartData[0]?.value || 0;
                    const changeFromStart = currentValue - startPrice;
                    const percentFromStart = startPrice > 0 ? ((changeFromStart / startPrice) * 100) : 0;
                    const isUp = changeFromStart >= 0;
                    const changeColor = isUp ? '#00C853' : '#FF3B30';

                    // Update header display
                    setTimeout(() => {
                      setPointerData({
                        price: currentValue,
                        date: matchedPoint?.date ? formatTooltipDate(matchedPoint.date, timeframe) : '',
                        change: changeFromStart,
                      });
                    }, 0);

                    return (
                      <View style={styles.tooltip}>
                        {matchedPoint?.date && (
                          <Text style={styles.tooltipDate}>
                            {formatTooltipDate(matchedPoint.date, timeframe)}
                          </Text>
                        )}
                        <Text style={styles.tooltipPriceValue}>${currentValue.toFixed(2)}</Text>
                        <Text style={[styles.tooltipPercent, { color: changeColor }]}>
                          {isUp ? '+' : ''}{percentFromStart.toFixed(2)}%
                        </Text>
                      </View>
                    );
                  },
                }}
              />
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No chart data available</Text>
            </View>
          )}
        </View>

        {/* Timeframe Pills */}
        {!showIndicators && (
          <View style={styles.timeframeContainer}>
            {(['1D', '5D', '1M', '3M', '1Y', 'ALL'] as Timeframe[]).map((tf) => (
              <TouchableOpacity
                key={tf}
                onPress={() => handleTimeframeChange(tf)}
                style={[
                  styles.timeframePill,
                  timeframe === tf && [styles.timeframePillActive, { backgroundColor: priceColor }],
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.timeframeText, timeframe === tf && styles.timeframeTextActive]}>{tf}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Technical Indicators Toggle */}
        <TouchableOpacity
          style={[styles.indicatorToggle, showIndicators && styles.indicatorToggleActive]}
          onPress={() => setShowIndicators(!showIndicators)}
          activeOpacity={0.7}
        >
          <Ionicons name={showIndicators ? 'analytics' : 'analytics-outline'} size={18} color={showIndicators ? priceColor : '#8E8E93'} />
          <Text style={[styles.indicatorToggleText, showIndicators && { color: priceColor }]}>Technical Indicators</Text>
          <Ionicons name={showIndicators ? 'chevron-up' : 'chevron-down'} size={16} color={showIndicators ? priceColor : '#8E8E93'} />
        </TouchableOpacity>

        {/* Technical Indicators Panel */}
        {showIndicators && apiSymbol && (
          <TechnicalIndicators symbol={apiSymbol} timeframe={timeframe} priceColor={priceColor} />
        )}

        {/* Price Alert Button */}
        {!showIndicators && (
          <TouchableOpacity style={styles.alertButton} onPress={openAlertModal} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={18} color="#FFD700" />
            <Text style={styles.alertButtonText}>Set Price Alert</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Price Alert Modal */}
      <Modal visible={showAlertModal} animationType="slide" transparent onRequestClose={() => setShowAlertModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Price Alert</Text>
              <TouchableOpacity onPress={() => setShowAlertModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSymbol}>{cleanSymbol}</Text>
            {currentPrice && <Text style={styles.modalCurrentPrice}>Current: ${currentPrice.toFixed(2)}</Text>}

            <Text style={styles.inputLabel}>Alert when price goes</Text>
            <View style={styles.directionContainer}>
              <TouchableOpacity
                style={[styles.directionButton, alertDirection === 'above' && styles.selectedDirectionAbove]}
                onPress={() => setAlertDirection('above')}
              >
                <Ionicons name="trending-up" size={20} color={alertDirection === 'above' ? '#000' : '#34C759'} />
                <Text style={[styles.directionText, alertDirection === 'above' && styles.selectedDirectionText]}>Above</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.directionButton, alertDirection === 'below' && styles.selectedDirectionBelow]}
                onPress={() => setAlertDirection('below')}
              >
                <Ionicons name="trending-down" size={20} color={alertDirection === 'below' ? '#FFF' : '#FF3B30'} />
                <Text style={[styles.directionText, alertDirection === 'below' && styles.selectedDirectionTextBelow]}>Below</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Target Price</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="0.00"
              placeholderTextColor="#666"
              value={alertPrice}
              onChangeText={setAlertPrice}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={[styles.createAlertButton, creatingAlert && styles.disabledButton]}
              onPress={createPriceAlert}
              disabled={creatingAlert}
            >
              {creatingAlert ? <ActivityIndicator color="#000" /> : <Text style={styles.createAlertButtonText}>Create Alert</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },

  // Skeleton
  skeletonContainer: { flex: 1, padding: 20 },
  priceSkeleton: { marginBottom: 10 },
  skeletonBox: { backgroundColor: '#1C1C1E', borderRadius: 8 },
  timeframeSkeleton: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingHorizontal: 4 },

  // Price Section
  priceSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  price: { fontSize: 44, fontWeight: '700', color: '#FFF', letterSpacing: -1 },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  changePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4 },
  changeText: { fontSize: 15, fontWeight: '600' },
  pointerDate: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  updateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  lastUpdated: { fontSize: 13, color: '#636366' },
  liveDot: { width: 6, height: 6, borderRadius: 3 },

  // Chart
  chartContainer: { flex: 1, justifyContent: 'center', marginVertical: 8 },
  chartInner: { position: 'relative' },
  baselineLine: { position: 'absolute', left: 5, right: 5, flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  dottedLineContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 1 },
  dot: { width: 4, height: 1, backgroundColor: '#636366', marginRight: 4 },
  baselineLabel: { backgroundColor: '#1C1C1E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  baselineLabelText: { fontSize: 10, color: '#8E8E93', fontWeight: '500' },

  errorContainer: { alignItems: 'center', padding: 40 },
  errorText: { color: '#8E8E93', fontSize: 15, marginTop: 12, marginBottom: 16 },
  retryButton: { backgroundColor: '#1C1C1E', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  noDataContainer: { alignItems: 'center', padding: 40 },
  noDataText: { color: '#8E8E93', fontSize: 15 },

  // Tooltip
  tooltip: { backgroundColor: '#1C1C1EF5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#3C3C3E', alignItems: 'center', minWidth: 130 },
  tooltipDate: { fontSize: 12, fontWeight: '600', color: '#A0A0A5', textAlign: 'center', marginBottom: 4 },
  tooltipPriceValue: { fontSize: 16, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  tooltipPercent: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  // Timeframe Pills
  timeframeContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  timeframePill: { flex: 1, paddingVertical: 10, marginHorizontal: 3, borderRadius: 20, alignItems: 'center', backgroundColor: '#1C1C1E' },
  timeframePillActive: { shadowColor: '#00C853', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 },
  timeframeText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  timeframeTextActive: { color: '#000', fontWeight: '700' },

  // Indicator Toggle
  indicatorToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E', marginHorizontal: 16, marginTop: 8, paddingVertical: 12, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#3C3C3E' },
  indicatorToggleActive: { borderColor: '#00C85340' },
  indicatorToggleText: { color: '#8E8E93', fontSize: 14, fontWeight: '600' },

  // Alert Button
  alertButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E', marginHorizontal: 16, marginTop: 8, marginBottom: Platform.OS === 'ios' ? 32 : 16, paddingVertical: 12, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#FFD70040' },
  alertButtonText: { color: '#FFD700', fontSize: 15, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  modalSymbol: { fontSize: 32, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  modalCurrentPrice: { fontSize: 16, color: '#8E8E93', textAlign: 'center', marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginBottom: 12 },
  directionContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  directionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 1, borderColor: '#3C3C3E', borderRadius: 12, gap: 8, backgroundColor: '#2C2C2E' },
  selectedDirectionAbove: { backgroundColor: '#34C759', borderColor: '#34C759' },
  selectedDirectionBelow: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  directionText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  selectedDirectionText: { color: '#000' },
  selectedDirectionTextBelow: { color: '#FFF' },
  priceInput: { borderWidth: 1, borderColor: '#3C3C3E', borderRadius: 12, padding: 16, fontSize: 24, fontWeight: '600', color: '#FFF', backgroundColor: '#2C2C2E', textAlign: 'center', marginBottom: 24 },
  createAlertButton: { backgroundColor: '#FFD700', padding: 16, borderRadius: 12, alignItems: 'center' },
  disabledButton: { opacity: 0.6 },
  createAlertButtonText: { color: '#000', fontSize: 17, fontWeight: '700' },

  // Market Status
  marketStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#1C1C1E', marginRight: 8 },
  marketStatusOpen: { backgroundColor: '#00C85315' },
  marketStatusPreMarket: { backgroundColor: '#FF950015' },
  marketStatusAfterHours: { backgroundColor: '#AF52DE15' },
  marketStatusClosed: { backgroundColor: '#8E8E9315' },
  marketStatusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6, backgroundColor: '#8E8E93' },
  marketStatusText: { fontSize: 11, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
});
