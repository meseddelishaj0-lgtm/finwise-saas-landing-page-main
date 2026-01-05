// app/symbol/[symbol]/chart.tsx - Premium Stock Chart (Optimized)
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
import { getFromMemory, setToMemory, CACHE_KEYS } from '../../../utils/memoryCache';
import { priceStore, usePrice } from '../../../stores/priceStore';
import { useWebSocket } from '../../../context/WebSocketContext';

const API_BASE_URL = "https://www.wallstreetstocks.ai/api";

// Cache settings
const CHART_CACHE_PREFIX = 'chart_cache_';
const QUOTE_CACHE_PREFIX = 'quote_cache_';
const CACHE_TTL = {
  '1D': 60 * 1000,      // 1 minute for intraday
  '5D': 5 * 60 * 1000,  // 5 minutes
  '1M': 15 * 60 * 1000, // 15 minutes
  '3M': 30 * 60 * 1000, // 30 minutes
  '1Y': 60 * 60 * 1000, // 1 hour
  'ALL': 60 * 60 * 1000 // 1 hour
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHART_HEIGHT = SCREEN_HEIGHT * 0.38;

type Timeframe = '1D' | '5D' | '1M' | '3M' | '1Y' | 'ALL';

const TWELVE_DATA_API_KEY = '604ed688209443c89250510872616f41';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

interface ChartDataPoint {
  value: number;
  label: string;
  date: Date;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

// Cache helpers
async function getCachedData<T>(key: string, ttl: number): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const { data, timestamp }: CachedData<T> = JSON.parse(cached);
      if (Date.now() - timestamp < ttl) {
        return data;
      }
    }
  } catch (e) {
    // Cache miss or error
  }
  return null;
}

async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    // Ignore cache write errors
  }
}

export default function ChartTab() {
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const segments = useSegments();

  // Extract symbol
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
    ? decodeURIComponent(String(symbol))
        .trim()
        .replace(/^\[|\]$/g, '')
        .toUpperCase()
    : null;

  // Use useMemo to safely access memory cache during render
  const initialData = useMemo(() => {
    if (!cleanSymbol) return { quote: null, chart: null };
    try {
      const quote = getFromMemory<any>(CACHE_KEYS.quote(cleanSymbol));
      const chart = getFromMemory<ChartDataPoint[]>(CACHE_KEYS.chart(cleanSymbol, '1D'));
      return { quote, chart };
    } catch (e) {
      console.warn('Memory cache access error:', e);
      return { quote: null, chart: null };
    }
  }, [cleanSymbol]);

  // Subscribe to real-time WebSocket updates for this symbol
  const { subscribe, isConnected } = useWebSocket();
  useEffect(() => {
    if (cleanSymbol && isConnected) {
      // Subscribe to both symbol formats for crypto (BTCUSD and BTC/USD)
      const symbolsToSubscribe = [cleanSymbol];
      if (cleanSymbol.endsWith('USD') && cleanSymbol.length <= 10 && !cleanSymbol.includes('/')) {
        // Also subscribe to BTC/USD format
        symbolsToSubscribe.push(cleanSymbol.slice(0, -3) + '/USD');
      } else if (cleanSymbol.includes('/')) {
        // Also subscribe to BTCUSD format (no slash)
        symbolsToSubscribe.push(cleanSymbol.replace('/', ''));
      }
      subscribe(symbolsToSubscribe);
      console.log(`📡 Subscribed to real-time updates for ${symbolsToSubscribe.join(', ')}`);
    }
  }, [cleanSymbol, isConnected, subscribe]);

  // Get real-time price from store (updates automatically via WebSocket)
  // Check both symbol formats for crypto
  const realtimePriceMain = usePrice(cleanSymbol || '');
  const altSymbol = cleanSymbol?.endsWith('USD') && !cleanSymbol?.includes('/')
    ? cleanSymbol.slice(0, -3) + '/USD'
    : cleanSymbol?.includes('/')
      ? cleanSymbol.replace('/', '')
      : '';
  const realtimePriceAlt = usePrice(altSymbol);

  // Use whichever price is available (prefer main symbol)
  const realtimePrice = realtimePriceMain ?? realtimePriceAlt;

  // Trigger re-render every second to sync with WebSocket price updates
  const [priceUpdateTrigger, setPriceUpdateTrigger] = useState(0);
  const priceRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    priceRefreshIntervalRef.current = setInterval(() => {
      setPriceUpdateTrigger(prev => prev + 1);
    }, 1000);
    return () => {
      if (priceRefreshIntervalRef.current) clearInterval(priceRefreshIntervalRef.current);
    };
  }, []);

  // Get the most up-to-date price from the store on each tick
  const livePrice = useMemo(() => {
    // Check both symbol formats
    const mainQuote = priceStore.getQuote(cleanSymbol || '');
    const altQuote = altSymbol ? priceStore.getQuote(altSymbol) : undefined;

    // Use the quote with the most recent timestamp
    if (mainQuote && altQuote) {
      return (mainQuote.updatedAt || 0) >= (altQuote.updatedAt || 0)
        ? mainQuote.price
        : altQuote.price;
    }
    return mainQuote?.price ?? altQuote?.price ?? realtimePrice;
  }, [cleanSymbol, altSymbol, realtimePrice, priceUpdateTrigger]);

  const [chartData, setChartData] = useState<ChartDataPoint[]>(initialData.chart || []);
  // Initialize price from chart data's last point if available (more recent than cached quote)
  const initialPrice = initialData.chart?.length
    ? initialData.chart[initialData.chart.length - 1]?.value
    : initialData.quote?.price ?? null;
  const [currentPrice, setCurrentPrice] = useState<number | null>(initialPrice);
  const [previousClose, setPreviousClose] = useState<number | null>(initialData.quote?.previousClose ?? null);
  const [dayHigh, setDayHigh] = useState<number | null>(initialData.quote?.dayHigh ?? null);
  const [dayLow, setDayLow] = useState<number | null>(initialData.quote?.dayLow ?? null);
  // Market status state
  const [marketStatus, setMarketStatus] = useState<'pre-market' | 'open' | 'after-hours' | 'closed'>('closed');
  // Only show loading if we don't have cached data
  const [loading, setLoading] = useState(!initialData.quote && !initialData.chart);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pointerData, setPointerData] = useState<{ price: number; date: string; change: number } | null>(null);

  // Price Alert Modal State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');
  const [creatingAlert, setCreatingAlert] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Start at 1 (visible) to prevent black screen - skeleton handles loading state
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Update displayed price when WebSocket sends new data
  useEffect(() => {
    const priceToUse = livePrice ?? realtimePrice;
    if (priceToUse && priceToUse !== currentPrice) {
      setCurrentPrice(priceToUse);
      setLastUpdated(new Date());
      // Pulse animation on price update
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [livePrice, realtimePrice]);

  // Calculate price change based on timeframe
  const priceChange = useMemo(() => {
    const price = livePrice ?? currentPrice;
    if (!chartData.length || price === null) return { amount: 0, percent: 0 };
    const startPrice = chartData[0]?.value || price;
    const amount = price - startPrice;
    const percent = startPrice > 0 ? (amount / startPrice) * 100 : 0;
    return { amount, percent };
  }, [chartData, livePrice, currentPrice]);

  const isPositive = priceChange.amount >= 0;
  const priceColor = isPositive ? '#00C853' : '#FF3B30';

  // Determine market status based on current time (US Eastern)
  const getMarketStatus = useCallback((): 'pre-market' | 'open' | 'after-hours' | 'closed' => {
    const now = new Date();
    // Convert to Eastern Time
    const options: Intl.DateTimeFormatOptions = { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const totalMinutes = hour * 60 + minute;

    const day = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' });

    // Weekend = closed
    if (day === 'Sat' || day === 'Sun') return 'closed';

    // Pre-market: 4:00 AM - 9:30 AM ET
    if (totalMinutes >= 4 * 60 && totalMinutes < 9 * 60 + 30) return 'pre-market';
    // Market open: 9:30 AM - 4:00 PM ET
    if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 16 * 60) return 'open';
    // After-hours: 4:00 PM - 8:00 PM ET
    if (totalMinutes >= 16 * 60 && totalMinutes < 20 * 60) return 'after-hours';

    return 'closed';
  }, []);

  // Fetch quote data with caching - using Twelve Data API
  const fetchQuote = useCallback(async (useCache = true) => {
    if (!cleanSymbol) return;

    const cacheKey = `${QUOTE_CACHE_PREFIX}${cleanSymbol}`;

    // Try cache first for instant display
    if (useCache) {
      const cached = await getCachedData<any>(cacheKey, 30 * 1000); // 30 sec cache
      if (cached) {
        setCurrentPrice(cached.price);
        setPreviousClose(cached.previousClose);
        setDayHigh(cached.dayHigh);
        setDayLow(cached.dayLow);
        setLastUpdated(new Date(cached.timestamp || Date.now()));
      }
    }

    // Fetch fresh data from Twelve Data
    try {
      // Handle crypto symbols: BTCUSD -> BTC/USD for Twelve Data
      let apiSymbol = cleanSymbol;
      if (cleanSymbol.endsWith('USD') && cleanSymbol.length <= 10 && !cleanSymbol.includes('/')) {
        apiSymbol = cleanSymbol.slice(0, -3) + '/USD';
      }

      const res = await fetch(
        `${TWELVE_DATA_URL}/quote?symbol=${encodeURIComponent(apiSymbol)}&apikey=${TWELVE_DATA_API_KEY}`
      );
      const data = await res.json();

      if (data && !data.code && data.symbol) {
        const price = parseFloat(data.close) || 0;
        const previousClose = parseFloat(data.previous_close) || price;
        const dayHigh = parseFloat(data.high) || price;
        const dayLow = parseFloat(data.low) || price;
        const change = parseFloat(data.change) || 0;
        const changePercent = parseFloat(data.percent_change) || 0;

        setCurrentPrice(price);
        setPreviousClose(previousClose);
        setDayHigh(dayHigh);
        setDayLow(dayLow);
        setLastUpdated(new Date());
        setError(null);

        // Check if we have a chart-synced price in the global store
        const storeQuote = priceStore.getQuote(cleanSymbol);
        const priceToUse = storeQuote?.price || price;

        // Update global price store with BOTH symbol formats for crypto
        const quoteData = {
          price: priceToUse,
          change: change,
          changePercent: changePercent,
          name: data.name || cleanSymbol,
          previousClose: previousClose,
          open: parseFloat(data.open) || price,
          high: dayHigh,
          low: dayLow,
          volume: parseFloat(data.volume) || 0,
        };

        priceStore.setQuote({ symbol: cleanSymbol, ...quoteData });
        if (apiSymbol !== cleanSymbol) {
          priceStore.setQuote({ symbol: apiSymbol, ...quoteData });
        }

        // Also update memory cache for backward compatibility
        const cacheData = {
          price: priceToUse,
          previousClose,
          dayHigh,
          dayLow,
          change,
          changesPercentage: changePercent,
          name: data.name,
          open: parseFloat(data.open),
          volume: parseFloat(data.volume),
        };

        const existingCache = getFromMemory<any>(CACHE_KEYS.quote(cleanSymbol));
        if (existingCache?._chartSynced) {
          setToMemory(CACHE_KEYS.quote(cleanSymbol), {
            ...cacheData,
            price: existingCache.price,
            _chartSynced: true,
          });
        } else {
          setToMemory(CACHE_KEYS.quote(cleanSymbol), cacheData);
        }
        await setCachedData(cacheKey, { ...cacheData, timestamp: Date.now() });
      }
    } catch (err) {
      console.error('Quote fetch error:', err);
    }
  }, [cleanSymbol]);

  // Update market status
  const updateMarketStatus = useCallback(() => {
    const status = getMarketStatus();
    setMarketStatus(status);
  }, [getMarketStatus]);

  // Fetch chart data based on timeframe with caching
  const fetchChartData = useCallback(async (showLoadingSpinner = true) => {
    if (!cleanSymbol) return;

    const cacheKey = `${CHART_CACHE_PREFIX}${cleanSymbol}_${timeframe}`;
    const cacheTTL = CACHE_TTL[timeframe];

    // Helper to update quote cache with latest chart price (for home screen sync)
    const syncQuoteFromChartData = (chartData: ChartDataPoint[]) => {
      if (timeframe === '1D' && chartData.length > 0) {
        const latestPrice = chartData[chartData.length - 1]?.value;
        if (latestPrice) {
          const existingQuote = getFromMemory<any>(CACHE_KEYS.quote(cleanSymbol)) || {};
          setToMemory(CACHE_KEYS.quote(cleanSymbol), {
            ...existingQuote,
            price: latestPrice,
            symbol: cleanSymbol,
            _chartSynced: true,
          });
          // Update global price store (single source of truth)
          priceStore.setQuote({
            symbol: cleanSymbol,
            price: latestPrice,
            change: existingQuote.change,
            changePercent: existingQuote.changesPercentage || existingQuote.changePercent,
            name: existingQuote.name,
          });
          console.log(`📊 Chart synced price for ${cleanSymbol}: $${latestPrice}`);
        }
      }
    };

    // Try MEMORY cache first (synchronous - instant!)
    let memCached: ChartDataPoint[] | null = null;
    try {
      memCached = getFromMemory<ChartDataPoint[]>(CACHE_KEYS.chart(cleanSymbol, timeframe), cacheTTL);
      if (memCached && memCached.length > 0) {
        setChartData(memCached);
        setLoading(false);
        // Sync quote cache immediately so home screen has latest price
        syncQuoteFromChartData(memCached);
        // Continue to fetch fresh data in background
      }
    } catch (e) {
      console.warn('Memory cache error:', e);
    }

    // Try AsyncStorage cache if no memory cache
    if (!memCached || memCached.length === 0) {
      const cachedChart = await getCachedData<ChartDataPoint[]>(cacheKey, cacheTTL);
      if (cachedChart && cachedChart.length > 0) {
        // Restore Date objects from cached data
        const restoredData = cachedChart.map(d => ({
          ...d,
          date: new Date(d.date)
        }));
        setChartData(restoredData);
        setToMemory(CACHE_KEYS.chart(cleanSymbol, timeframe), restoredData); // Populate memory cache
        // Sync quote cache so home screen has latest price
        syncQuoteFromChartData(restoredData);
        setLoading(false);
      } else if (showLoadingSpinner) {
        setLoading(true);
      }
    }

    setError(null);

    try {
      // Handle symbol format for Twelve Data API
      // For crypto: BTCUSD -> BTC/USD
      let symbolForApi = cleanSymbol;
      if (cleanSymbol.endsWith('USD') && cleanSymbol.length <= 10 && !cleanSymbol.includes('/')) {
        // Check if it's likely a crypto symbol (not an ETF like SPY)
        const etfs = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'XLF', 'XLE', 'XLK', 'ARKK'];
        if (!etfs.includes(cleanSymbol)) {
          symbolForApi = cleanSymbol.slice(0, -3) + '/USD';
        }
      }

      let formatted: ChartDataPoint[] = [];

      // Twelve Data time series intervals and output sizes for each timeframe
      const timeframeConfig: Record<Timeframe, { interval: string; outputsize: number }> = {
        '1D': { interval: '5min', outputsize: 78 },      // ~6.5 hours of trading
        '5D': { interval: '30min', outputsize: 65 },     // 5 days * 13 per day
        '1M': { interval: '1h', outputsize: 160 },       // ~22 trading days * 7 hours
        '3M': { interval: '4h', outputsize: 130 },       // ~65 trading days * 2
        '1Y': { interval: '1day', outputsize: 252 },     // ~252 trading days
        'ALL': { interval: '1week', outputsize: 500 },   // Years of weekly data
      };

      const config = timeframeConfig[timeframe];
      const url = `${TWELVE_DATA_URL}/time_series?symbol=${encodeURIComponent(symbolForApi)}&interval=${config.interval}&outputsize=${config.outputsize}&apikey=${TWELVE_DATA_API_KEY}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data?.values && Array.isArray(data.values) && data.values.length > 0) {
        // Twelve Data returns newest first, we need oldest first for chart
        const values = [...data.values].reverse();

        // Format labels based on timeframe
        // Twelve Data returns datetime in exchange timezone (Eastern for US stocks)
        // We need to display in user's local time
        formatted = values.map((d: any) => {
          // Twelve Data format: "2024-01-04 14:15:00" (exchange local time)
          // Append timezone to parse correctly - assume Eastern Time for stocks
          const isCryptoSymbol = symbolForApi.includes('/');
          const dateStr = d.datetime;

          // For stocks, the time is in Eastern Time
          // For crypto, it's typically in UTC or exchange time
          let date: Date;
          if (isCryptoSymbol) {
            // Crypto - treat as UTC
            date = new Date(dateStr + 'Z');
          } else {
            // US stocks - time is Eastern Time, convert to local
            // Check if date is in Daylight Saving Time (EDT = -04:00) or Standard Time (EST = -05:00)
            // DST in US: 2nd Sunday of March to 1st Sunday of November
            const tempDate = new Date(dateStr.replace(' ', 'T'));
            const month = tempDate.getMonth(); // 0-11

            // Rough DST check: April-October is definitely DST
            const isDST = month > 2 && month < 10;
            const offset = isDST ? '-04:00' : '-05:00';

            date = new Date(dateStr.replace(' ', 'T') + offset);
          }

          let label = '';

          if (timeframe === '1D') {
            // Show time in user's local timezone
            label = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          } else if (timeframe === '5D') {
            label = date.toLocaleDateString('en-US', { weekday: 'short' });
          } else if (timeframe === '1M' || timeframe === '3M') {
            label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (timeframe === '1Y') {
            label = date.toLocaleDateString('en-US', { month: 'short' });
          } else {
            label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          }

          return {
            value: parseFloat(d.close),
            label,
            date,
          };
        });

        // Sample for ALL timeframe to keep chart smooth
        if (timeframe === 'ALL' && formatted.length > 200) {
          const sampleRate = Math.ceil(formatted.length / 200);
          formatted = formatted.filter((_, i) => i % sampleRate === 0);
        }
      } else if (data?.code || data?.message) {
        console.warn(`Twelve Data chart error for ${symbolForApi}:`, data.message || data.code);
      }

      if (formatted.length > 0) {
        setChartData(formatted);
        setError(null);
        // Save to MEMORY cache (instant access next time)
        setToMemory(CACHE_KEYS.chart(cleanSymbol, timeframe), formatted);
        // Also save to AsyncStorage for persistence
        await setCachedData(cacheKey, formatted);
        // Sync quote cache so home screen picks up same price
        syncQuoteFromChartData(formatted);
      } else if (!memCached) {
        // Only show error if we don't have any cached data
        setError('No data available');
      }
    } catch (err: any) {
      console.error('Chart data error:', err);
      // Only show error if we don't have cached data to display
      if (!memCached) {
        setError('Unable to load chart');
      }
    } finally {
      setLoading(false);
    }
  }, [cleanSymbol, timeframe]);

  // Calculate Y-axis bounds
  const yAxisBounds = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 100 };

    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range * 0.1 || max * 0.05;

    return {
      min: Math.max(0, min - padding),
      max: max + padding,
    };
  }, [chartData]);

  // Chart spacing calculation
  const chartSpacing = useMemo(() => {
    if (chartData.length <= 1) return 10;
    return Math.max(2, (SCREEN_WIDTH - 20) / chartData.length);
  }, [chartData.length]);

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

    // Load data in parallel for faster initial load
    Promise.all([
      fetchQuote(true),
      fetchChartData(true)
    ]);

    // Update market status
    updateMarketStatus();

    // Set up polling - 15 seconds for 1D live data, 60 seconds for other timeframes
    if (intervalRef.current) clearInterval(intervalRef.current);
    const pollInterval = timeframe === '1D' ? 15000 : 60000;
    intervalRef.current = setInterval(() => {
      fetchQuote(false); // Don't use cache for polling
      if (timeframe === '1D') fetchChartData(false);
      updateMarketStatus(); // Refresh market status
    }, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cleanSymbol, timeframe, fetchQuote, fetchChartData, updateMarketStatus]);

  const handleTimeframeChange = (tf: Timeframe) => {
    if (tf !== timeframe) {
      // Clear old data immediately for clean transition
      setPointerData(null);
      setChartData([]);
      setLoading(true);
      setTimeframe(tf);
    }
  };

  // Create price alert
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

      // Handle empty or non-JSON responses
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('Failed to parse response:', text);
        data = { error: 'Server returned invalid response' };
      }

      if (res.ok) {
        setShowAlertModal(false);
        setAlertPrice('');
        Alert.alert(
          'Alert Created',
          `You'll be notified when ${cleanSymbol} goes ${alertDirection} $${price.toFixed(2)}`
        );
      } else {
        Alert.alert('Error', data.error || `Failed to create alert (${res.status})`);
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      Alert.alert('Error', 'Failed to create alert');
    } finally {
      setCreatingAlert(false);
    }
  };

  // Open alert modal with current price pre-filled
  const openAlertModal = () => {
    if (currentPrice) {
      setAlertPrice(currentPrice.toFixed(2));
    }
    setShowAlertModal(true);
  };

  // Format price display
  const formatPrice = (price: number | null) => {
    if (price === null) return '—';
    if (price >= 1000) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  // Display values (use pointer data when available, then real-time price, then chart point)
  const latestChartPrice = chartData.length > 0 ? chartData[chartData.length - 1]?.value : null;
  // Prioritize live WebSocket price over state/chart data for instant sync when lifting finger
  const displayPrice = pointerData?.price ?? livePrice ?? currentPrice ?? latestChartPrice;
  const displayChange = pointerData ? pointerData.change : priceChange.amount;
  const displayPercent = pointerData
    ? (chartData[0]?.value ? (pointerData.change / chartData[0].value) * 100 : 0)
    : priceChange.percent;
  const displayColor = displayChange >= 0 ? '#00C853' : '#FF3B30';

  // Show skeleton if loading OR no data yet (prevents black screen)
  if (loading || (chartData.length === 0 && currentPrice === null)) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonContainer}>
          {/* Price skeleton */}
          <View style={styles.priceSkeleton}>
            <View style={[styles.skeletonBox, { width: 140, height: 44 }]} />
            <View style={[styles.skeletonBox, { width: 100, height: 28, marginTop: 8, borderRadius: 14 }]} />
          </View>
          {/* Chart skeleton */}
          <View style={[styles.skeletonBox, { width: '100%', height: 200, marginTop: 20 }]} />
          {/* Timeframe pills skeleton */}
          <View style={styles.timeframeSkeleton}>
            {[1,2,3,4,5,6].map(i => (
              <View key={i} style={[styles.skeletonBox, { width: 48, height: 36, borderRadius: 18 }]} />
            ))}
          </View>
          {/* Show error message if there's an error */}
          {error && (
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ color: '#FF3B30', fontSize: 14 }}>{error}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Price Header */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>{formatPrice(displayPrice)}</Text>

          <View style={styles.changeRow}>
            <View style={[styles.changePill, { backgroundColor: displayColor + '15' }]}>
              <Ionicons
                name={displayChange >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={displayColor}
              />
              <Text style={[styles.changeText, { color: displayColor }]}>
                {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)} ({displayPercent >= 0 ? '+' : ''}{displayPercent.toFixed(2)}%)
              </Text>
            </View>

            {pointerData && (
              <Text style={styles.pointerDate}>{pointerData.date}</Text>
            )}
          </View>

          {!pointerData && (
            <View style={styles.updateRow}>
              {/* Market Status Badge */}
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
                  marketStatus === 'closed' && { color: '#8E8E93' },
                ]}>
                  {marketStatus === 'open' ? 'Market Open' :
                   marketStatus === 'pre-market' ? 'Pre-Market' :
                   marketStatus === 'after-hours' ? 'After Hours' : 'Market Closed'}
                </Text>
              </View>
              <Text style={styles.lastUpdated}>
                {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            </View>
          )}

        </View>

        {/* Chart */}
        <View
          style={styles.chartContainer}
          onTouchEnd={() => setTimeout(() => setPointerData(null), 150)}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#8E8E93" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchChartData(true)}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : chartData.length > 1 ? (
            <View style={styles.chartInner}>
              {/* Horizontal dotted baseline */}
              {chartData.length > 0 && (
                <View
                  style={[
                    styles.baselineLine,
                    {
                      top: CHART_HEIGHT * (1 - (chartData[0].value - yAxisBounds.min) / (yAxisBounds.max - yAxisBounds.min)),
                    },
                  ]}
                >
                  <View style={styles.dottedLineContainer}>
                    {Array.from({ length: Math.floor((SCREEN_WIDTH - 60) / 8) }).map((_, i) => (
                      <View key={i} style={styles.dot} />
                    ))}
                  </View>
                  <View style={styles.baselineLabel}>
                    <Text style={styles.baselineLabelText}>
                      ${chartData[0].value.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
              <LineChart
              data={chartData.map((d, idx) => ({ value: d.value, label: '', dataPointIndex: idx }))}
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
              endSpacing={5}
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

                  // Get the index from the pointer - try multiple ways to get it
                  const item = items[0];
                  const pointerIndex = item?.index ?? item?.dataPointIndex ?? item?.pointerIndex;
                  const currentValue = item?.value;

                  if (currentValue === undefined || currentValue === null) return null;

                  // Use the index to get the exact data point with correct time
                  let matchedPoint: ChartDataPoint | null = null;

                  if (pointerIndex !== undefined && pointerIndex >= 0 && pointerIndex < chartData.length) {
                    matchedPoint = chartData[pointerIndex];
                  } else {
                    // Fallback: find closest match by value if index not available
                    let closestDiff = Infinity;
                    let closestIdx = 0;
                    for (let i = 0; i < chartData.length; i++) {
                      const diff = Math.abs(chartData[i].value - currentValue);
                      if (diff < closestDiff) {
                        closestDiff = diff;
                        closestIdx = i;
                      }
                    }
                    matchedPoint = chartData[closestIdx];
                  }

                  const displayValue = currentValue;
                  const startPrice = chartData[0]?.value || 0;
                  const changeFromStart = displayValue - startPrice;
                  const percentFromStart = startPrice > 0 ? ((changeFromStart / startPrice) * 100) : 0;
                  const isUp = changeFromStart >= 0;
                  const changeColor = isUp ? '#00C853' : '#FF3B30';

                  // Format date based on timeframe
                  const formatPointerDate = (date: Date) => {
                    if (timeframe === '1D') {
                      return date.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });
                    } else if (timeframe === '5D') {
                      return date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      });
                    } else if (timeframe === '1M' || timeframe === '3M') {
                      return date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    } else {
                      return date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    }
                  };

                  // Update header with current pointer position
                  setTimeout(() => {
                    setPointerData({
                      price: displayValue,
                      date: matchedPoint?.date ? formatPointerDate(matchedPoint.date) : '',
                      change: changeFromStart,
                    });
                  }, 0);

                  return (
                    <View style={styles.tooltip}>
                      {matchedPoint?.date && (
                        <Text style={styles.tooltipDate}>
                          {formatPointerDate(matchedPoint.date)}
                        </Text>
                      )}
                      <Text style={styles.tooltipPriceValue}>
                        ${displayValue.toFixed(2)}
                      </Text>
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

        {/* Stats Row */}
        {dayHigh && dayLow && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Open</Text>
              <Text style={styles.statValue}>{formatPrice(previousClose)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>High</Text>
              <Text style={[styles.statValue, { color: '#00C853' }]}>{formatPrice(dayHigh)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Low</Text>
              <Text style={[styles.statValue, { color: '#FF3B30' }]}>{formatPrice(dayLow)}</Text>
            </View>
          </View>
        )}

        {/* Timeframe Pills */}
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
              <Text style={[
                styles.timeframeText,
                timeframe === tf && styles.timeframeTextActive,
              ]}>
                {tf}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Alert Button */}
        <TouchableOpacity
          style={styles.alertButton}
          onPress={openAlertModal}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={18} color="#FFD700" />
          <Text style={styles.alertButtonText}>Set Price Alert</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Price Alert Modal */}
      <Modal
        visible={showAlertModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAlertModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Price Alert</Text>
              <TouchableOpacity onPress={() => setShowAlertModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSymbol}>{cleanSymbol}</Text>
            {currentPrice && (
              <Text style={styles.modalCurrentPrice}>
                Current: ${currentPrice.toFixed(2)}
              </Text>
            )}

            <Text style={styles.inputLabel}>Alert when price goes</Text>
            <View style={styles.directionContainer}>
              <TouchableOpacity
                style={[
                  styles.directionButton,
                  alertDirection === 'above' && styles.selectedDirectionAbove,
                ]}
                onPress={() => setAlertDirection('above')}
              >
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={alertDirection === 'above' ? '#000' : '#34C759'}
                />
                <Text
                  style={[
                    styles.directionText,
                    alertDirection === 'above' && styles.selectedDirectionText,
                  ]}
                >
                  Above
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.directionButton,
                  alertDirection === 'below' && styles.selectedDirectionBelow,
                ]}
                onPress={() => setAlertDirection('below')}
              >
                <Ionicons
                  name="trending-down"
                  size={20}
                  color={alertDirection === 'below' ? '#FFF' : '#FF3B30'}
                />
                <Text
                  style={[
                    styles.directionText,
                    alertDirection === 'below' && styles.selectedDirectionTextBelow,
                  ]}
                >
                  Below
                </Text>
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
              {creatingAlert ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.createAlertButtonText}>Create Alert</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    marginTop: 12,
    fontSize: 15,
  },
  // Skeleton styles
  skeletonContainer: {
    flex: 1,
    padding: 20,
  },
  priceSkeleton: {
    marginBottom: 10,
  },
  skeletonBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
  },
  timeframeSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 4,
  },
  // Price Section
  priceSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  price: {
    fontSize: 44,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -1,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  changeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pointerDate: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#636366',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00C853',
  },
  // Chart
  chartContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 8,
  },
  chartInner: {
    position: 'relative',
  },
  baselineLine: {
    position: 'absolute',
    left: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  dottedLineContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 1,
  },
  dot: {
    width: 4,
    height: 1,
    backgroundColor: '#636366',
    marginRight: 4,
  },
  baselineLabel: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  baselineLabelText: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#8E8E93',
    fontSize: 15,
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    color: '#8E8E93',
    fontSize: 15,
  },
  tooltip: {
    backgroundColor: '#1C1C1EF5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3C3C3E',
    alignItems: 'center',
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A0A0A5',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  tooltipPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  tooltipPercent: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#636366',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2C2C2E',
  },
  // Timeframe Pills
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#000',
  },
  timeframePill: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  timeframePillActive: {
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  timeframeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  timeframeTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  // Price Alert Button
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFD70040',
  },
  alertButtonText: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: '600',
  },
  // Price Alert Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  modalSymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  modalCurrentPrice: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#3C3C3E',
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#2C2C2E',
  },
  selectedDirectionAbove: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  selectedDirectionBelow: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  directionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  selectedDirectionText: {
    color: '#000',
  },
  selectedDirectionTextBelow: {
    color: '#FFF',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#3C3C3E',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
    backgroundColor: '#2C2C2E',
    textAlign: 'center',
    marginBottom: 24,
  },
  createAlertButton: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  createAlertButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
  },
  // Market Status Styles
  marketStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    marginRight: 8,
  },
  marketStatusOpen: {
    backgroundColor: '#00C85315',
  },
  marketStatusPreMarket: {
    backgroundColor: '#FF950015',
  },
  marketStatusAfterHours: {
    backgroundColor: '#AF52DE15',
  },
  marketStatusClosed: {
    backgroundColor: '#8E8E9315',
  },
  marketStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    backgroundColor: '#8E8E93',
  },
  marketStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
