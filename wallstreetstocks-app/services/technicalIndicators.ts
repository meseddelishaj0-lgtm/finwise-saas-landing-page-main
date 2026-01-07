// services/technicalIndicators.ts
// Technical indicators service using Twelve Data API

const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';

// Types
export interface RSIDataPoint {
  datetime: string;
  rsi: number;
}

export interface MACDDataPoint {
  datetime: string;
  macd: number;
  macd_signal: number;
  macd_hist: number;
}

export interface SMADataPoint {
  datetime: string;
  sma: number;
}

export interface EMADataPoint {
  datetime: string;
  ema: number;
}

export interface BollingerBandsDataPoint {
  datetime: string;
  upper_band: number;
  middle_band: number;
  lower_band: number;
}

export interface IndicatorConfig {
  interval: string;
  outputsize: number;
}

// Timeframe to interval mapping
export const INDICATOR_TIMEFRAME_CONFIG: Record<string, IndicatorConfig> = {
  '1D': { interval: '5min', outputsize: 100 },
  '5D': { interval: '30min', outputsize: 80 },
  '1M': { interval: '1h', outputsize: 100 },
  '3M': { interval: '4h', outputsize: 100 },
  '1Y': { interval: '1day', outputsize: 252 },
  'ALL': { interval: '1week', outputsize: 200 },
};

/**
 * Fetch RSI (Relative Strength Index)
 * RSI > 70 = Overbought, RSI < 30 = Oversold
 */
export async function fetchRSI(
  symbol: string,
  timeframe: string,
  period: number = 14
): Promise<RSIDataPoint[]> {
  const config = INDICATOR_TIMEFRAME_CONFIG[timeframe] || INDICATOR_TIMEFRAME_CONFIG['1D'];

  try {
    const url = `${TWELVE_DATA_URL}/rsi?symbol=${encodeURIComponent(symbol)}&interval=${config.interval}&time_period=${period}&outputsize=${config.outputsize}&apikey=${TWELVE_DATA_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data?.values && Array.isArray(data.values)) {
      return data.values.reverse().map((d: any) => ({
        datetime: d.datetime,
        rsi: parseFloat(d.rsi),
      }));
    }

    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetch MACD (Moving Average Convergence Divergence)
 * Buy signal: MACD crosses above signal line
 * Sell signal: MACD crosses below signal line
 */
export async function fetchMACD(
  symbol: string,
  timeframe: string,
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): Promise<MACDDataPoint[]> {
  const config = INDICATOR_TIMEFRAME_CONFIG[timeframe] || INDICATOR_TIMEFRAME_CONFIG['1D'];

  try {
    const url = `${TWELVE_DATA_URL}/macd?symbol=${encodeURIComponent(symbol)}&interval=${config.interval}&fast_period=${fastPeriod}&slow_period=${slowPeriod}&signal_period=${signalPeriod}&outputsize=${config.outputsize}&apikey=${TWELVE_DATA_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data?.values && Array.isArray(data.values)) {
      return data.values.reverse().map((d: any) => ({
        datetime: d.datetime,
        macd: parseFloat(d.macd),
        macd_signal: parseFloat(d.macd_signal),
        macd_hist: parseFloat(d.macd_hist),
      }));
    }

    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetch SMA (Simple Moving Average)
 * Common periods: 20 (short-term), 50 (medium-term), 200 (long-term)
 */
export async function fetchSMA(
  symbol: string,
  timeframe: string,
  period: number = 20
): Promise<SMADataPoint[]> {
  const config = INDICATOR_TIMEFRAME_CONFIG[timeframe] || INDICATOR_TIMEFRAME_CONFIG['1D'];

  try {
    const url = `${TWELVE_DATA_URL}/sma?symbol=${encodeURIComponent(symbol)}&interval=${config.interval}&time_period=${period}&outputsize=${config.outputsize}&apikey=${TWELVE_DATA_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data?.values && Array.isArray(data.values)) {
      return data.values.reverse().map((d: any) => ({
        datetime: d.datetime,
        sma: parseFloat(d.sma),
      }));
    }

    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetch EMA (Exponential Moving Average)
 * More responsive to recent price changes than SMA
 */
export async function fetchEMA(
  symbol: string,
  timeframe: string,
  period: number = 20
): Promise<EMADataPoint[]> {
  const config = INDICATOR_TIMEFRAME_CONFIG[timeframe] || INDICATOR_TIMEFRAME_CONFIG['1D'];

  try {
    const url = `${TWELVE_DATA_URL}/ema?symbol=${encodeURIComponent(symbol)}&interval=${config.interval}&time_period=${period}&outputsize=${config.outputsize}&apikey=${TWELVE_DATA_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data?.values && Array.isArray(data.values)) {
      return data.values.reverse().map((d: any) => ({
        datetime: d.datetime,
        ema: parseFloat(d.ema),
      }));
    }

    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetch Bollinger Bands
 * Price touching upper band = potentially overbought
 * Price touching lower band = potentially oversold
 */
export async function fetchBollingerBands(
  symbol: string,
  timeframe: string,
  period: number = 20,
  stdDev: number = 2
): Promise<BollingerBandsDataPoint[]> {
  const config = INDICATOR_TIMEFRAME_CONFIG[timeframe] || INDICATOR_TIMEFRAME_CONFIG['1D'];

  try {
    const url = `${TWELVE_DATA_URL}/bbands?symbol=${encodeURIComponent(symbol)}&interval=${config.interval}&time_period=${period}&sd=${stdDev}&outputsize=${config.outputsize}&apikey=${TWELVE_DATA_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data?.values && Array.isArray(data.values)) {
      return data.values.reverse().map((d: any) => ({
        datetime: d.datetime,
        upper_band: parseFloat(d.upper_band),
        middle_band: parseFloat(d.middle_band),
        lower_band: parseFloat(d.lower_band),
      }));
    }

    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetch multiple indicators at once
 * More efficient than calling each separately
 */
export async function fetchAllIndicators(
  symbol: string,
  timeframe: string
): Promise<{
  rsi: RSIDataPoint[];
  macd: MACDDataPoint[];
  sma20: SMADataPoint[];
  sma50: SMADataPoint[];
}> {
  const [rsi, macd, sma20, sma50] = await Promise.all([
    fetchRSI(symbol, timeframe),
    fetchMACD(symbol, timeframe),
    fetchSMA(symbol, timeframe, 20),
    fetchSMA(symbol, timeframe, 50),
  ]);

  return { rsi, macd, sma20, sma50 };
}

/**
 * Get RSI interpretation
 */
export function interpretRSI(rsi: number): { signal: 'overbought' | 'oversold' | 'neutral'; color: string } {
  if (rsi >= 70) return { signal: 'overbought', color: '#FF3B30' };
  if (rsi <= 30) return { signal: 'oversold', color: '#34C759' };
  return { signal: 'neutral', color: '#8E8E93' };
}

/**
 * Get MACD interpretation
 */
export function interpretMACD(macd: number, signal: number): { trend: 'bullish' | 'bearish'; color: string } {
  if (macd > signal) return { trend: 'bullish', color: '#34C759' };
  return { trend: 'bearish', color: '#FF3B30' };
}
