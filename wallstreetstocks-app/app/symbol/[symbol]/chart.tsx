// app/symbol/[symbol]/chart.tsx - Stock Chart (Rebuilt for proper premarket/after-hours)
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
import { priceStore, usePrice } from '../../../stores/priceStore';
import { useWebSocket } from '../../../context/WebSocketContext';
import TechnicalIndicators from '../../../components/TechnicalIndicators';

// ============================================================================
// CONSTANTS
// ============================================================================
const API_BASE_URL = "https://www.wallstreetstocks.ai/api";
const TWELVE_DATA_API_KEY = '604ed688209443c89250510872616f41';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHART_HEIGHT = SCREEN_HEIGHT * 0.38;

type Timeframe = '1D' | '5D' | '1M' | '3M' | '1Y' | 'ALL';

const CACHE_TTL: Record<Timeframe, number> = {
  '1D': 60 * 1000,      // 1 minute for intraday
  '5D': 5 * 60 * 1000,  // 5 minutes
  '1M': 15 * 60 * 1000, // 15 minutes
  '3M': 30 * 60 * 1000, // 30 minutes
  '1Y': 60 * 60 * 1000, // 1 hour
  'ALL': 60 * 60 * 1000 // 1 hour
};

// ============================================================================
// TYPES
// ============================================================================
interface ChartDataPoint {
  value: number;
  label: string;
  date: Date;
}

type MarketStatus = 'pre-market' | 'open' | 'after-hours' | 'closed';

// ============================================================================
// TIMEZONE UTILITIES
// ============================================================================

/**
 * Get the current time in Eastern timezone
 * Returns { hour, minute, day, month, year, dayOfWeek }
 */
function getEasternTime(): {
  hour: number;
  minute: number;
  day: number;
  month: number;
  year: number;
  dayOfWeek: string;
  totalMinutes: number;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
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
    day: parseInt(get('day')) || 1,
    month: parseInt(get('month')) || 1,
    year: parseInt(get('year')) || 2025,
    dayOfWeek: get('weekday'),
    totalMinutes: hour * 60 + minute,
  };
}

/**
 * Get today's trading session start (4 AM ET) as a Date object
 */
function getTodaySessionStart(): Date {
  const et = getEasternTime();

  let { year, month, day } = et;

  // If before 4 AM ET, use yesterday's date
  if (et.hour < 4) {
    const yesterday = new Date(year, month - 1, day - 1);
    year = yesterday.getFullYear();
    month = yesterday.getMonth() + 1;
    day = yesterday.getDate();
  }

  // Create 4:00 AM ET as ISO string
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T04:00:00`;

  // Determine DST (rough approximation: March-November)
  const isDST = month >= 3 && month <= 10;
  const offset = isDST ? '-04:00' : '-05:00';

  return new Date(dateStr + offset);
}

/**
 * Get current market status
 */
function getMarketStatus(): MarketStatus {
  const et = getEasternTime();
  const { totalMinutes, dayOfWeek } = et;

  // Weekend = closed
  if (dayOfWeek === 'Sat' || dayOfWeek === 'Sun') return 'closed';

  const preMarketStart = 4 * 60;      // 4:00 AM
  const marketOpen = 9 * 60 + 30;     // 9:30 AM
  const marketClose = 16 * 60;        // 4:00 PM
  const afterHoursEnd = 20 * 60;      // 8:00 PM

  if (totalMinutes >= preMarketStart && totalMinutes < marketOpen) return 'pre-market';
  if (totalMinutes >= marketOpen && totalMinutes < marketClose) return 'open';
  if (totalMinutes >= marketClose && totalMinutes < afterHoursEnd) return 'after-hours';

  return 'closed';
}

/**
 * Check if currently in extended hours (premarket or after-hours)
 */
function isExtendedHours(): boolean {
  const status = getMarketStatus();
  return status === 'pre-market' || status === 'after-hours';
}

/**
 * Parse a Twelve Data datetime string to a Date object
 * Twelve Data returns times in exchange timezone (Eastern for US stocks)
 */
function parseTwelveDataTime(datetime: string, isCrypto: boolean = false): Date {
  if (isCrypto) {
    // Crypto times are in UTC
    return new Date(datetime + 'Z');
  }

  // US stocks - time is in Eastern Time
  const tempDate = new Date(datetime.replace(' ', 'T'));
  const month = tempDate.getMonth(); // 0-11

  // DST check: April-October is definitely DST
  const isDST = month > 2 && month < 10;
  const offset = isDST ? '-04:00' : '-05:00';

  return new Date(datetime.replace(' ', 'T') + offset);
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
  } catch (e) {
    // Cache miss
  }
  return null;
}

async function setAsyncCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    // Ignore cache write errors
  }
}

async function clearChartCache(symbol: string): Promise<void> {
  try {
    const timeframes: Timeframe[] = ['1D', '5D', '1M', '3M', '1Y', 'ALL'];
    const keys = timeframes.map(tf => `chart_cache_${symbol}_${tf}`);
    await AsyncStorage.multiRemove(keys);
    timeframes.forEach(tf => clearFromMemory(CACHE_KEYS.chart(symbol, tf)));
  } catch (e) {
    // Ignore errors
  }
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

/**
 * Filter chart data to only include points from today's session (4 AM ET onwards)
 * For 1D timeframe only
 */
function filterToTodaySession(
  data: ChartDataPoint[],
  sessionStart: Date
): ChartDataPoint[] {
  const sessionStartTime = sessionStart.getTime();

  return data.filter(point => {
    const pointTime = point.date instanceof Date
      ? point.date.getTime()
      : new Date(point.date).getTime();
    return pointTime >= sessionStartTime;
  });
}

/**
 * Ensure chart data has enough points for a visible line
 * Pads with session start and current time if needed
 */
function ensureMinimumPoints(
  data: ChartDataPoint[],
  sessionStart: Date,
  currentPrice: number | null,
  fallbackPrice: number | null,
  allData: ChartDataPoint[] = []
): ChartDataPoint[] {
  const now = new Date();
  const priceToUse = currentPrice ?? fallbackPrice;

  // If we have no data and no price, return empty
  if (data.length === 0 && !priceToUse) {
    return [];
  }

  // If we have enough points, return as is
  if (data.length >= 10) {
    return data;
  }

  // During early premarket with sparse data, include yesterday's last 2 hours as context
  // This gives users visual context of where the price was
  if (data.length < 10 && allData.length > 0 && isExtendedHours()) {
    const sessionStartTime = sessionStart.getTime();

    // Get points from the last 2-3 hours of yesterday's session as context
    const contextStart = sessionStartTime - (3 * 60 * 60 * 1000); // 3 hours before session start
    const contextPoints = allData.filter(point => {
      const pointTime = point.date.getTime();
      return pointTime >= contextStart && pointTime < sessionStartTime;
    });

    // Combine context points with today's data
    if (contextPoints.length > 0) {
      const combined = [...contextPoints, ...data];

      // Add current price if we have it
      if (priceToUse && data.length === 0) {
        combined.push({
          value: priceToUse,
          label: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          date: now,
        });
      }

      return combined;
    }
  }

  // We need to pad the data
  const result = [...data];

  if (result.length === 0 && priceToUse) {
    // No data at all - create flat line from session start to now
    result.push({
      value: priceToUse,
      label: sessionStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      date: sessionStart,
    });
    result.push({
      value: priceToUse,
      label: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      date: now,
    });
  } else if (result.length > 0) {
    // Add session start point if not present
    const firstPointTime = result[0].date.getTime();
    const sessionStartTime = sessionStart.getTime();

    if (firstPointTime > sessionStartTime + 60000) {
      result.unshift({
        value: result[0].value,
        label: sessionStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        date: sessionStart,
      });
    }

    // Add current time point if needed
    const lastPointTime = result[result.length - 1].date.getTime();
    const priceForEnd = currentPrice ?? result[result.length - 1].value;

    if (now.getTime() - lastPointTime > 60000) {
      result.push({
        value: priceForEnd,
        label: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        date: now,
      });
    }

    // Ensure at least 2 points
    if (result.length === 1) {
      result.push({
        value: result[0].value,
        label: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        date: now,
      });
    }
  }

  return result;
}

/**
 * Format a date for display in the chart tooltip
 */
function formatTooltipDate(date: Date, timeframe: Timeframe): string {
  if (timeframe === '1D') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } else if (timeframe === '5D') {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

const TIMEFRAME_CONFIG: Record<Timeframe, { interval: string; outputsize: number }> = {
  '1D': { interval: '5min', outputsize: 200 },
  '5D': { interval: '30min', outputsize: 160 },
  '1M': { interval: '1h', outputsize: 160 },
  '3M': { interval: '4h', outputsize: 130 },
  '1Y': { interval: '1day', outputsize: 252 },
  'ALL': { interval: '1week', outputsize: 500 },
};

/**
 * Convert symbol to Twelve Data format (e.g., BTCUSD -> BTC/USD for crypto)
 */
function formatSymbolForApi(symbol: string): string {
  const etfs = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'XLF', 'XLE', 'XLK', 'ARKK'];

  if (symbol.endsWith('USD') && symbol.length <= 10 && !symbol.includes('/') && !etfs.includes(symbol)) {
    return symbol.slice(0, -3) + '/USD';
  }

  return symbol;
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
  const rawChartDataRef = useRef<ChartDataPoint[]>([]); // Ref to avoid infinite loops in callbacks
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [previousClose, setPreviousClose] = useState<number | null>(null);
  const [dayHigh, setDayHigh] = useState<number | null>(null);
  const [dayLow, setDayLow] = useState<number | null>(null);
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

  // Technical Indicators State
  const [showIndicators, setShowIndicators] = useState(false);

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ============================================================================
  // WEBSOCKET & REAL-TIME PRICE
  // ============================================================================
  const { subscribe, isConnected } = useWebSocket();

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (cleanSymbol && isConnected) {
      const symbolsToSubscribe = [cleanSymbol];
      if (apiSymbol && apiSymbol !== cleanSymbol) {
        symbolsToSubscribe.push(apiSymbol);
      }
      subscribe(symbolsToSubscribe);
    }
  }, [cleanSymbol, apiSymbol, isConnected, subscribe]);

  // Get real-time price from store - these hooks trigger re-renders instantly when WebSocket updates
  const realtimePriceMain = usePrice(cleanSymbol || '');
  const realtimePriceAlt = usePrice(apiSymbol || '');

  // Live price is directly derived from reactive hooks - updates instantly when WebSocket sends new data
  const livePrice = realtimePriceMain ?? realtimePriceAlt;

  // Update currentPrice state and trigger animation when WebSocket sends new data
  useEffect(() => {
    if (livePrice && livePrice !== currentPrice) {
      setCurrentPrice(livePrice);
      setLastUpdated(new Date());

      // Pulse animation for price update visual feedback
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [livePrice]);

  // ============================================================================
  // PROCESSED CHART DATA
  // ============================================================================
  const chartData = useMemo(() => {
    if (rawChartData.length === 0) return [];

    // For non-1D timeframes, return raw data as-is
    if (timeframe !== '1D') {
      return rawChartData;
    }

    const extendedHours = isExtendedHours();
    console.log(`📊 [${cleanSymbol}] Processing chart data:`, {
      rawDataLength: rawChartData.length,
      isExtendedHours: extendedHours,
      firstDate: rawChartData[0]?.date?.toISOString(),
      lastDate: rawChartData[rawChartData.length - 1]?.date?.toISOString(),
    });

    // For 1D during extended hours: show all available data (yesterday + any premarket)
    // This gives users context of where the price was and where it is now
    if (extendedHours) {
      let result = [...rawChartData];
      const displayPrice = livePrice ?? currentPrice;
      const now = new Date();

      // If we have a live price that's different from the last data point, add it
      if (displayPrice && result.length > 0) {
        const lastPoint = result[result.length - 1];
        const timeDiff = now.getTime() - lastPoint.date.getTime();

        // Add current price point if it's been more than 1 minute since last data point
        if (timeDiff > 60000) {
          result.push({
            value: displayPrice,
            label: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            date: now,
          });
        }
      }

      // Sample data if too many points (keeps chart smooth and prevents rendering issues)
      const MAX_POINTS = 120;
      if (result.length > MAX_POINTS) {
        const sampleRate = Math.ceil(result.length / MAX_POINTS);
        const sampled = result.filter((_, i) => i % sampleRate === 0);
        // Always include the last point (most recent)
        if (sampled[sampled.length - 1] !== result[result.length - 1]) {
          sampled.push(result[result.length - 1]);
        }
        result = sampled;
      }

      console.log(`📊 [${cleanSymbol}] Extended hours - returning ${result.length} points`);
      return result;
    }

    // During regular hours, filter to today's session only
    const sessionStart = getTodaySessionStart();
    let filtered = filterToTodaySession(rawChartData, sessionStart);

    // Get fallback price from raw data if needed
    const fallbackPrice = rawChartData.length > 0
      ? rawChartData[rawChartData.length - 1].value
      : null;

    // Ensure minimum points for visible chart
    const displayPrice = livePrice ?? currentPrice;
    filtered = ensureMinimumPoints(filtered, sessionStart, displayPrice, fallbackPrice, rawChartData);

    return filtered;
  }, [rawChartData, timeframe, livePrice, currentPrice]);

  // Append live price to chart during extended hours
  const liveChartData = useMemo(() => {
    if (chartData.length === 0) return chartData;
    if (timeframe !== '1D') return chartData;

    const currentLivePrice = livePrice ?? currentPrice;
    if (!currentLivePrice) return chartData;

    const now = new Date();
    const lastPoint = chartData[chartData.length - 1];
    const timeDiff = now.getTime() - lastPoint.date.getTime();

    // If last point is more than 10 minutes old in extended hours, append live price
    if (timeDiff > 10 * 60 * 1000 && isExtendedHours()) {
      return [
        ...chartData,
        {
          value: currentLivePrice,
          label: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          date: now,
        }
      ];
    }

    // If price changed significantly, update last point
    if (isExtendedHours() && Math.abs(currentLivePrice - lastPoint.value) > 0.01) {
      const updatedData = [...chartData];
      updatedData[updatedData.length - 1] = {
        ...lastPoint,
        value: currentLivePrice,
        date: now,
        label: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      };
      return updatedData;
    }

    return chartData;
  }, [chartData, livePrice, currentPrice, timeframe, marketStatus]);

  // ============================================================================
  // PRICE CHANGE CALCULATION
  // ============================================================================
  const priceChange = useMemo(() => {
    const price = livePrice ?? currentPrice;
    if (!liveChartData.length || price === null) return { amount: 0, percent: 0 };

    const startPrice = liveChartData[0]?.value || price;
    const amount = price - startPrice;
    const percent = startPrice > 0 ? (amount / startPrice) * 100 : 0;

    return { amount, percent };
  }, [liveChartData, livePrice, currentPrice]);

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

    const bounds = {
      min: Math.max(0, min - padding),
      max: max + padding,
    };

    console.log(`📊 [${cleanSymbol}] Y-Axis bounds:`, { min, max, range, bounds });

    return bounds;
  }, [liveChartData, cleanSymbol]);

  // Chart spacing
  const chartSpacing = useMemo(() => {
    if (liveChartData.length <= 1) return 10;
    return Math.max(2, (SCREEN_WIDTH - 20) / liveChartData.length);
  }, [liveChartData.length]);

  // ============================================================================
  // API FETCHING
  // ============================================================================

  const fetchQuote = useCallback(async () => {
    if (!cleanSymbol || !apiSymbol) return;

    try {
      // Use single /price endpoint call to save API credits
      // Extended hours data comes from the chart data which is fetched separately
      const res = await fetch(`${TWELVE_DATA_URL}/price?symbol=${encodeURIComponent(apiSymbol)}&apikey=${TWELVE_DATA_API_KEY}`);
      const data = await res.json();

      let price = parseFloat(data?.price) || 0;

      // If /price returns 0 during extended hours, try to get from latest chart data
      if (price === 0 && rawChartDataRef.current.length > 0) {
        price = rawChartDataRef.current[rawChartDataRef.current.length - 1]?.value || 0;
      }

      if (price > 0) {
        // Use existing previousClose or calculate from price
        const prevClose = previousClose || price;
        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

        setCurrentPrice(price);
        setError(null);

        // Update price store with real-time price
        priceStore.setQuote({
          symbol: cleanSymbol,
          price,
          change,
          changePercent,
          previousClose: prevClose,
        });
      }
    } catch (err) {
      console.error('Quote fetch error:', err);
    }
  }, [cleanSymbol, apiSymbol, previousClose]);

  const fetchChartData = useCallback(async (showLoading = true) => {
    if (!cleanSymbol || !apiSymbol) return;

    const cacheKey = `chart_cache_${cleanSymbol}_${timeframe}`;
    const memCacheKey = CACHE_KEYS.chart(cleanSymbol, timeframe);
    const ttl = CACHE_TTL[timeframe];

    // Skip cache during extended hours for 1D to ensure fresh data
    const skipCache = timeframe === '1D' && isExtendedHours();

    // Try memory cache first
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
      let config = TIMEFRAME_CONFIG[timeframe];

      // During extended hours for 1D, use 1min interval to get more premarket/after-hours data points
      if (timeframe === '1D' && isExtendedHours()) {
        config = { interval: '1min', outputsize: 300 }; // 300 x 1min = 5 hours of data
      }

      const prepostParam = (timeframe === '1D' || timeframe === '5D') ? '&prepost=true' : '';
      const url = `${TWELVE_DATA_URL}/time_series?symbol=${encodeURIComponent(apiSymbol)}&interval=${config.interval}&outputsize=${config.outputsize}${prepostParam}&apikey=${TWELVE_DATA_API_KEY}`;

      console.log(`📊 [${cleanSymbol}] Fetching: ${url}`);
      const res = await fetch(url);
      const data = await res.json();

      // Debug: Log API response
      console.log(`📊 [${cleanSymbol}] API Response:`, {
        status: data?.status,
        code: data?.code,
        message: data?.message,
        valuesCount: data?.values?.length || 0,
        firstValue: data?.values?.[0],
        lastValue: data?.values?.[data?.values?.length - 1],
      });

      if (data?.values && Array.isArray(data.values) && data.values.length > 0) {
        // Twelve Data returns newest first, we need oldest first
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
          } else if (timeframe === '1Y') {
            label = date.toLocaleDateString('en-US', { month: 'short' });
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

        // Cache the data
        setToMemory(memCacheKey, finalData);
        await setAsyncCache(cacheKey, finalData);
      } else if (rawChartDataRef.current.length === 0) {
        setError('No data available');
      }
    } catch (err) {
      console.error('Chart data error:', err);
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

  // Clear cache on mount during extended hours
  useEffect(() => {
    if (cleanSymbol && isExtendedHours()) {
      clearChartCache(cleanSymbol);
    }
  }, [cleanSymbol]);

  // Keep ref in sync with state (to avoid infinite loops in callbacks)
  useEffect(() => {
    rawChartDataRef.current = rawChartData;
  }, [rawChartData]);

  // Refs for intervals
  const quoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial load and polling
  useEffect(() => {
    if (!cleanSymbol) {
      setLoading(false);
      setError('No symbol provided');
      return;
    }

    // Start pulse animation
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

    // Clear existing intervals
    if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
    if (chartIntervalRef.current) clearInterval(chartIntervalRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Price quote refresh every 3 seconds
    quoteIntervalRef.current = setInterval(() => {
      fetchQuote();
      setMarketStatus(getMarketStatus());
    }, 3000);

    // Chart data refresh every 30 seconds for 1D, 60 seconds for others
    const chartPollInterval = timeframe === '1D' ? 30000 : 60000;
    chartIntervalRef.current = setInterval(() => {
      fetchChartData(false);
    }, chartPollInterval);

    return () => {
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
      if (chartIntervalRef.current) clearInterval(chartIntervalRef.current);
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
      console.error('Error creating alert:', error);
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
    ? (liveChartData[0]?.value ? (pointerData.change / liveChartData[0].value) * 100 : 0)
    : priceChange.percent;
  const displayColor = displayChange >= 0 ? '#00C853' : '#FF3B30';

  // ============================================================================
  // RENDER
  // ============================================================================

  // Loading skeleton
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
                  marketStatus === 'closed' && { color: '#8E8E93' },
                ]}>
                  {marketStatus === 'open' ? 'Market Open' :
                   marketStatus === 'pre-market' ? 'Pre-Market' :
                   marketStatus === 'after-hours' ? 'After Hours' : 'Market Closed'}
                </Text>
              </View>
              <Text style={styles.lastUpdated}>
                {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                {' | '}{liveChartData.length} pts
              </Text>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
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
              {/* Baseline */}
              {liveChartData.length > 0 && (
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
              )}

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
                endSpacing={20}
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

                    let matchedPoint: ChartDataPoint | null = null;
                    if (pointerIndex !== undefined && pointerIndex >= 0 && pointerIndex < liveChartData.length) {
                      matchedPoint = liveChartData[pointerIndex];
                    } else {
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

                    const displayValue = currentValue;
                    const startPrice = liveChartData[0]?.value || 0;
                    const changeFromStart = displayValue - startPrice;
                    const percentFromStart = startPrice > 0 ? ((changeFromStart / startPrice) * 100) : 0;
                    const isUp = changeFromStart >= 0;
                    const changeColor = isUp ? '#00C853' : '#FF3B30';

                    setTimeout(() => {
                      setPointerData({
                        price: displayValue,
                        date: matchedPoint?.date ? formatTooltipDate(matchedPoint.date, timeframe) : '',
                        change: changeFromStart,
                      });
                    }, 0);

                    return (
                      <View style={styles.tooltip}>
                        {matchedPoint?.date && (
                          <Text style={styles.tooltipDate}>{formatTooltipDate(matchedPoint.date, timeframe)}</Text>
                        )}
                        <Text style={styles.tooltipPriceValue}>${displayValue.toFixed(2)}</Text>
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

        {/* Timeframe Pills - Hidden when indicators are shown */}
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
          <Ionicons
            name={showIndicators ? 'analytics' : 'analytics-outline'}
            size={18}
            color={showIndicators ? priceColor : '#8E8E93'}
          />
          <Text style={[styles.indicatorToggleText, showIndicators && { color: priceColor }]}>
            Technical Indicators
          </Text>
          <Ionicons
            name={showIndicators ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={showIndicators ? priceColor : '#8E8E93'}
          />
        </TouchableOpacity>

        {/* Technical Indicators Panel */}
        {showIndicators && apiSymbol && (
          <TechnicalIndicators
            symbol={apiSymbol}
            timeframe={timeframe}
            priceColor={priceColor}
          />
        )}

        {/* Price Alert Button - Hidden when indicators are shown */}
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
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  price: { fontSize: 44, fontWeight: '700', color: '#FFF', letterSpacing: -1 },
  livePriceIndicator: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  livePriceInnerDot: { width: 10, height: 10, borderRadius: 5 },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  changePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4 },
  changeText: { fontSize: 15, fontWeight: '600' },
  pointerDate: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  updateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  lastUpdated: { fontSize: 13, color: '#636366' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00C853' },

  // Chart
  chartContainer: { flex: 1, justifyContent: 'center', marginVertical: 8 },
  chartInner: { position: 'relative' },
  baselineLine: { position: 'absolute', left: 5, right: 5, flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  dottedLineContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 1 },
  dot: { width: 4, height: 1, backgroundColor: '#636366', marginRight: 4 },
  baselineLabel: { backgroundColor: '#1C1C1E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  baselineLabelText: { fontSize: 10, color: '#8E8E93', fontWeight: '500' },

  // Live dot at end of chart
  liveChartDot: { position: 'absolute', width: 12, height: 12, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  liveChartDotOuter: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2, opacity: 0.5 },
  liveChartDotInner: { width: 6, height: 6, borderRadius: 3 },

  errorContainer: { alignItems: 'center', padding: 40 },
  errorText: { color: '#8E8E93', fontSize: 15, marginTop: 12, marginBottom: 16 },
  retryButton: { backgroundColor: '#1C1C1E', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  noDataContainer: { alignItems: 'center', padding: 40 },
  noDataText: { color: '#8E8E93', fontSize: 15 },

  // Tooltip
  tooltip: { backgroundColor: '#1C1C1EF5', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#3C3C3E', alignItems: 'center', minWidth: 130, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  tooltipDate: { fontSize: 11, fontWeight: '600', color: '#A0A0A5', textAlign: 'center', marginBottom: 6, letterSpacing: 0.3 },
  tooltipPriceValue: { fontSize: 16, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  tooltipPercent: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 2 },

  // Stats Row
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#1C1C1E', marginBottom: 8 },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: '#636366', marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 15, color: '#FFF', fontWeight: '600' },
  statDivider: { width: 1, height: 30, backgroundColor: '#2C2C2E' },

  // Timeframe Pills
  timeframeContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 32 : 16, backgroundColor: '#000' },
  timeframePill: { flex: 1, paddingVertical: 10, marginHorizontal: 3, borderRadius: 20, alignItems: 'center', backgroundColor: '#1C1C1E' },
  timeframePillActive: { shadowColor: '#00C853', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
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
