// app/(tabs)/screener.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePremiumFeature, FEATURE_TIERS } from '@/hooks/usePremiumFeature';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import StockLogo from '@/components/StockLogo';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { FLATLIST_PERFORMANCE_PROPS } from '@/components/OptimizedListItems';

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';

// Enable layout animations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const smoothLayout = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));

// Fade + slide-up entrance wrapper (opacity/transform only — never affects layout)
const FadeSlideIn = ({
  children,
  delay = 0,
  distance = 14,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: any;
}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Touchable with a springy scale-down press response
const ScalePress = ({
  children,
  onPress,
  style,
  activeScale = 0.96,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  activeScale?: number;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 9 }).start();

  return (
    <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// Theme-aware pulsing placeholder block
const SkeletonPulse = ({ style, color }: { style?: any; color: string }) => {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return <Animated.View style={[style, { backgroundColor: color, opacity: pulse }]} />;
};

// Placeholder mirroring the stock row layout, shown while results load
const StockRowSkeleton = ({ color, borderColor }: { color: string; borderColor: string }) => (
  <View style={[styles.stockItem, { borderBottomColor: borderColor }]}>
    <View style={styles.stockLeft}>
      <SkeletonPulse color={color} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
      <View style={styles.stockInfo}>
        <SkeletonPulse color={color} style={{ width: 70, height: 14, borderRadius: 7 }} />
        <SkeletonPulse color={color} style={{ width: 110, height: 10, borderRadius: 5, marginTop: 8 }} />
      </View>
    </View>
    <View style={styles.stockMiddle}>
      <SkeletonPulse color={color} style={{ width: 42, height: 12, borderRadius: 6 }} />
    </View>
    <View style={styles.stockMiddle}>
      <SkeletonPulse color={color} style={{ width: 34, height: 12, borderRadius: 6 }} />
    </View>
    <View style={styles.stockRight}>
      <SkeletonPulse color={color} style={{ width: 60, height: 14, borderRadius: 7 }} />
      <SkeletonPulse color={color} style={{ width: 48, height: 12, borderRadius: 6, marginTop: 8 }} />
    </View>
  </View>
);

// Stock row height for getItemLayout optimization
const STOCK_ROW_HEIGHT = 72;
const getStockItemLayout = (_data: any, index: number) => ({
  length: STOCK_ROW_HEIGHT,
  offset: STOCK_ROW_HEIGHT * index,
  index,
});

interface SavedPreset {
  id: string;
  name: string;
  filters: Record<string, string>;
  createdAt: string;
}

// FMP API Key
const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// ---- Client-side screening ---------------------------------------------------
// FMP's /stock-screener only honors marketCap/price/beta/volume/dividend +
// sector/exchange/country/isEtf. Everything else (P/E, margins, ROE, valuation
// ratios, growth) is filtered here on the client after enriching results with
// /quote (P/E) and the TTM ratios/key-metrics endpoints — otherwise those
// filters were silently ignored and returned unfiltered results.
const num = (v: any): number | undefined => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};

// Filters needing per-symbol TTM fundamentals (ratios-ttm + key-metrics-ttm)
const FUNDAMENTAL_FILTER_IDS = new Set([
  'roe', 'roa', 'priceToBook', 'priceToSales', 'evToEbitda',
  'grossMargin', 'operatingMargin', 'netMargin', 'debtToEquity', 'currentRatio',
]);
const GROWTH_FILTER_IDS = new Set(['revenueGrowth', 'epsGrowth']);

const fundamentalsCache = new Map<string, Partial<Stock>>();

async function enrichFundamentals(symbols: string[], needGrowth: boolean): Promise<Map<string, Partial<Stock>>> {
  const out = new Map<string, Partial<Stock>>();
  const toFetch: string[] = [];
  for (const s of symbols) {
    const cached = fundamentalsCache.get(s);
    if (cached && (!needGrowth || cached.revenueGrowth !== undefined)) out.set(s, cached);
    else toFetch.push(s);
  }
  const CONCURRENCY = 6;
  const pct = (x: any) => { const n = num(x); return n === undefined ? undefined : n * 100; };
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (sym) => {
      try {
        const reqs: Promise<Response>[] = [
          fetch(`${FMP_BASE_URL}/ratios-ttm/${sym}?apikey=${FMP_API_KEY}`),
          fetch(`${FMP_BASE_URL}/key-metrics-ttm/${sym}?apikey=${FMP_API_KEY}`),
        ];
        if (needGrowth) reqs.push(fetch(`${FMP_BASE_URL}/financial-growth/${sym}?period=annual&limit=1&apikey=${FMP_API_KEY}`));
        const jsonArr = await Promise.all((await Promise.all(reqs)).map(r => r.json()));
        const r = Array.isArray(jsonArr[0]) ? jsonArr[0][0] : jsonArr[0];
        const k = Array.isArray(jsonArr[1]) ? jsonArr[1][0] : jsonArr[1];
        const g = needGrowth ? (Array.isArray(jsonArr[2]) ? jsonArr[2][0] : jsonArr[2]) : null;
        // ratios-ttm returns margins/ROE as fractions → convert to percent
        const f: Partial<Stock> = {
          roe: pct(r?.returnOnEquityTTM),
          roa: pct(r?.returnOnAssetsTTM),
          grossMargin: pct(r?.grossProfitMarginTTM),
          operatingMargin: pct(r?.operatingProfitMarginTTM),
          netMargin: pct(r?.netProfitMarginTTM),
          priceToBook: num(r?.priceToBookRatioTTM),
          priceToSales: num(r?.priceToSalesRatioTTM),
          debtToEquity: num(r?.debtEquityRatioTTM),
          currentRatio: num(r?.currentRatioTTM),
          evToEbitda: num(k?.enterpriseValueOverEBITDATTM),
        };
        if (needGrowth && g) {
          f.revenueGrowth = pct(g?.revenueGrowth);
          f.epsGrowth = pct(g?.epsgrowth ?? g?.epsGrowth);
        }
        const merged = { ...(fundamentalsCache.get(sym) || {}), ...f };
        fundamentalsCache.set(sym, merged);
        out.set(sym, merged);
      } catch {}
    }));
  }
  return out;
}

type Range = [number | undefined, number | undefined]; // [min, max]; inclusive
const CLIENT_FILTER_RANGES: Record<string, { field: keyof Stock; opts: Record<string, Range> }> = {
  pe: { field: 'pe', opts: {
    'Under 10': [0, 10], '10 - 15': [10, 15], '15 - 20': [15, 20], '20 - 30': [20, 30],
    '30 - 50': [30, 50], 'Over 50': [50, undefined], 'Negative (Loss)': [undefined, 0],
  }},
  dividend: { field: 'dividendYield', opts: {
    'Over 5%': [5, undefined], '3% - 5%': [3, 5], '1% - 3%': [1, 3], 'Under 1%': [0, 1], 'None': [undefined, 0.0001],
  }},
  roe: { field: 'roe', opts: {
    'Over 30%': [30, undefined], '20% - 30%': [20, 30], '15% - 20%': [15, 20], '10% - 15%': [10, 15],
    '5% - 10%': [5, 10], 'Under 5%': [0, 5], 'Negative': [undefined, 0],
  }},
  roa: { field: 'roa', opts: {
    'Over 15%': [15, undefined], '10% - 15%': [10, 15], '5% - 10%': [5, 10], '0% - 5%': [0, 5], 'Negative': [undefined, 0],
  }},
  priceToBook: { field: 'priceToBook', opts: {
    'Under 1': [undefined, 1], '1 - 2': [1, 2], '2 - 3': [2, 3], '3 - 5': [3, 5], 'Over 5': [5, undefined],
  }},
  priceToSales: { field: 'priceToSales', opts: {
    'Under 1': [undefined, 1], '1 - 2': [1, 2], '2 - 5': [2, 5], '5 - 10': [5, 10], 'Over 10': [10, undefined],
  }},
  evToEbitda: { field: 'evToEbitda', opts: {
    'Under 5': [undefined, 5], '5 - 10': [5, 10], '10 - 15': [10, 15], '15 - 20': [15, 20], 'Over 20': [20, undefined],
  }},
  grossMargin: { field: 'grossMargin', opts: {
    'Over 70%': [70, undefined], '50% - 70%': [50, 70], '30% - 50%': [30, 50], '15% - 30%': [15, 30], 'Under 15%': [undefined, 15],
  }},
  operatingMargin: { field: 'operatingMargin', opts: {
    'Over 30%': [30, undefined], '20% - 30%': [20, 30], '10% - 20%': [10, 20], '0% - 10%': [0, 10], 'Negative': [undefined, 0],
  }},
  netMargin: { field: 'netMargin', opts: {
    'Over 25%': [25, undefined], '15% - 25%': [15, 25], '10% - 15%': [10, 15], '5% - 10%': [5, 10], '0% - 5%': [0, 5], 'Negative': [undefined, 0],
  }},
  debtToEquity: { field: 'debtToEquity', opts: {
    'No Debt': [undefined, 0.01], 'Under 0.5': [undefined, 0.5], '0.5 - 1': [0.5, 1], '1 - 2': [1, 2], 'Over 2': [2, undefined],
  }},
  currentRatio: { field: 'currentRatio', opts: {
    'Over 3': [3, undefined], '2 - 3': [2, 3], '1.5 - 2': [1.5, 2], '1 - 1.5': [1, 1.5], 'Under 1': [undefined, 1],
  }},
  revenueGrowth: { field: 'revenueGrowth', opts: {
    'Over 50%': [50, undefined], '25% - 50%': [25, 50], '15% - 25%': [15, 25], '5% - 15%': [5, 15], '0% - 5%': [0, 5], 'Negative': [undefined, 0],
  }},
  epsGrowth: { field: 'epsGrowth', opts: {
    'Over 50%': [50, undefined], '25% - 50%': [25, 50], '15% - 25%': [15, 25], '5% - 15%': [5, 15], '0% - 5%': [0, 5], 'Negative': [undefined, 0],
  }},
};

function passesClientFilters(stock: Stock, filters: Record<string, string>, ids: string[]): boolean {
  for (const id of ids) {
    const value = filters[id];
    if (!value || value === 'Any') continue;
    const cfg = CLIENT_FILTER_RANGES[id];
    if (!cfg) continue; // server-side filter (marketCap/price/volume/beta/sector)
    const range = cfg.opts[value];
    if (!range) continue;
    const v = stock[cfg.field] as number | null | undefined;
    if (v === null || v === undefined || Number.isNaN(v)) return false; // can't confirm → exclude
    const [min, max] = range;
    if (min !== undefined && v < min) return false;
    if (max !== undefined && v > max) return false;
  }
  return true;
}

// Preset strategies. The fundamentals-based ones (undervalued/dividend/quality/
// growth/cashcow/aipicks) now genuinely screen instead of silently returning the
// "Most Active" list. momentum/breakout/shortSqueeze are best-effort proxies from
// the movers lists (true short-interest/insider feeds aren't in FMP's screener).
interface PresetDef {
  source: 'screener' | 'gainers' | 'losers' | 'actives';
  server?: ScreenerParams;
  needFund?: boolean;
  needGrowth?: boolean;
  predicate?: (s: Stock) => boolean;
  sort?: (a: Stock, b: Stock) => number;
}
const byChangeDesc = (a: Stock, b: Stock) => (b.changePercent ?? 0) - (a.changePercent ?? 0);
const PRESET_DEFS: Record<string, PresetDef> = {
  undervalued: { source: 'screener', server: { marketCapMoreThan: 1e9 }, predicate: s => s.pe != null && s.pe > 0 && s.pe < 15 },
  dividend: { source: 'screener', server: { marketCapMoreThan: 1e9 }, predicate: s => (s.dividendYield ?? 0) >= 4, sort: (a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0) },
  quality: { source: 'screener', server: { marketCapMoreThan: 5e9 }, needFund: true, predicate: s => (s.roe ?? -1) >= 20 && (s.netMargin ?? -1) >= 15 },
  growth: { source: 'screener', server: { marketCapMoreThan: 1e9 }, needFund: true, needGrowth: true, predicate: s => (s.revenueGrowth ?? -1e9) >= 25 && (s.epsGrowth ?? -1e9) >= 20 },
  cashcow: { source: 'screener', server: { marketCapMoreThan: 1e9 }, needFund: true, predicate: s => (s.netMargin ?? -1) >= 10 },
  aipicks: { source: 'screener', server: { marketCapMoreThan: 2e9 }, needFund: true, needGrowth: true, predicate: s => (s.roe ?? -1) >= 15 && (s.revenueGrowth ?? -1e9) >= 15 },
  momentum: { source: 'gainers', predicate: s => (s.changePercent ?? 0) > 2, sort: byChangeDesc },
  breakout: { source: 'gainers', predicate: s => (s.changePercent ?? 0) > 3 && (s.volume ?? 0) > 1e6, sort: byChangeDesc },
  shortSqueeze: { source: 'gainers', predicate: s => (s.changePercent ?? 0) > 5 && (s.volume ?? 0) > 5e6, sort: byChangeDesc },
  insider: { source: 'actives', sort: byChangeDesc },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FILTER_ITEM_WIDTH = (SCREEN_WIDTH - 60) / 2; // 20px padding on each side + 20px gap

// Types
interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  pe: number | null;
  sector: string;
  roe?: number;
  roa?: number;
  netIncome?: number;
  freeCashFlow?: number;
  debtToEquity?: number;
  currentRatio?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  revenueGrowth?: number;
  epsGrowth?: number;
  dividendYield?: number;
  priceToBook?: number;
  priceToSales?: number;
  evToEbitda?: number;
}

interface HeatMapStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  marketCap: number;
  sector?: string;
}

interface FilterOption {
  id: string;
  label: string;
  icon: string;
  options: string[];
  category: 'basic' | 'valuation' | 'profitability' | 'financial' | 'growth' | 'premium';
  isPremium?: boolean;
}

interface Preset {
  id: string;
  name: string;
  icon: string;
  gradient: string[];
  description: string;
  isPremium?: boolean;
}

interface ScreenerParams {
  marketCapMoreThan?: number;
  marketCapLowerThan?: number;
  priceMoreThan?: number;
  priceLowerThan?: number;
  betaMoreThan?: number;
  betaLowerThan?: number;
  volumeMoreThan?: number;
  volumeLowerThan?: number;
  dividendMoreThan?: number;
  dividendLowerThan?: number;
  sector?: string;
  industry?: string;
  exchange?: string;
  country?: string;
  limit?: number;
  peMoreThan?: number;
  peLessThan?: number;
  priceToBookMoreThan?: number;
  priceToBookLessThan?: number;
  priceToSalesMoreThan?: number;
  priceToSalesLessThan?: number;
  evToEbitdaMoreThan?: number;
  evToEbitdaLessThan?: number;
  returnOnEquityMoreThan?: number;
  returnOnEquityLessThan?: number;
  returnOnAssetsMoreThan?: number;
  returnOnAssetsLessThan?: number;
  grossMarginMoreThan?: number;
  grossMarginLessThan?: number;
  operatingMarginMoreThan?: number;
  operatingMarginLessThan?: number;
  netMarginMoreThan?: number;
  netMarginLessThan?: number;
  debtToEquityMoreThan?: number;
  debtToEquityLessThan?: number;
  currentRatioMoreThan?: number;
  currentRatioLessThan?: number;
  revenueGrowthMoreThan?: number;
  revenueGrowthLessThan?: number;
  epsGrowthMoreThan?: number;
  epsGrowthLessThan?: number;
  freeCashFlowMoreThan?: number;
  freeCashFlowLessThan?: number;
  netIncomeMoreThan?: number;
  netIncomeLessThan?: number;
}

// Preset Screens
const presets: Preset[] = [
  { id: 'trending', name: 'Trending', icon: 'flame', gradient: ['#FF6B6B', '#FF8E53'], description: 'Most traded right now' },
  { id: 'gainers', name: 'Top Gainers', icon: 'trending-up', gradient: ['#00C853', '#69F0AE'], description: "Today's top climbers" },
  { id: 'losers', name: 'Top Losers', icon: 'trending-down', gradient: ['#FF5252', '#FF1744'], description: "Today's steepest drops" },
  { id: 'heatmap', name: 'Heat Map', icon: 'grid', gradient: ['#8B5CF6', '#EC4899'], description: 'The market at a glance' },
  { id: 'undervalued', name: 'Undervalued', icon: 'diamond', gradient: ['#7C4DFF', '#B388FF'], description: 'Bargains under 15x P/E' },
  { id: 'dividend', name: 'High Dividend', icon: 'cash', gradient: ['#00BCD4', '#4DD0E1'], description: 'Yields of 4% and up' },
  { id: 'quality', name: 'Quality', icon: 'shield-checkmark', gradient: ['#5C6BC0', '#7986CB'], description: 'Elite ROE & margins' },
  { id: 'growth', name: 'Growth', icon: 'rocket', gradient: ['#FF9800', '#FFB74D'], description: 'Revenue compounding fast' },
  { id: 'cashcow', name: 'Cash Cows', icon: 'wallet', gradient: ['#26A69A', '#80CBC4'], description: 'Rich free cash flow' },
  // Premium Presets
  { id: 'insider', name: 'Insider Buying', icon: 'people', gradient: ['#FFD700', '#FFA000'], description: 'Executives are buying', isPremium: true },
  { id: 'momentum', name: 'Momentum', icon: 'flash', gradient: ['#E91E63', '#F06292'], description: 'Strength begets strength', isPremium: true },
  { id: 'aipicks', name: 'AI Picks', icon: 'sparkles', gradient: ['#00BFA5', '#1DE9B6'], description: 'Handpicked by our AI', isPremium: true },
  { id: 'shortSqueeze', name: 'Short Squeeze', icon: 'arrow-up', gradient: ['#FF6F00', '#FFAB00'], description: 'Heavily shorted setups', isPremium: true },
  { id: 'breakout', name: 'Breakout', icon: 'pulse', gradient: ['#D500F9', '#E040FB'], description: 'Pushing 52-week highs', isPremium: true },
];

// Filter Categories
const filterCategories: FilterOption[] = [
  { id: 'marketCap', label: 'Market Cap', icon: 'pie-chart', category: 'basic', options: ['Any', 'Mega (>$200B)', 'Large ($10B-$200B)', 'Mid ($2B-$10B)', 'Small ($300M-$2B)', 'Micro (<$300M)'] },
  { id: 'sector', label: 'Sector', icon: 'business', category: 'basic', options: ['Any', 'Technology', 'Healthcare', 'Financial Services', 'Energy', 'Consumer Cyclical', 'Consumer Defensive', 'Industrials', 'Real Estate', 'Utilities', 'Basic Materials', 'Communication Services'] },
  { id: 'price', label: 'Price', icon: 'pricetag', category: 'basic', options: ['Any', 'Under $10', '$10 - $50', '$50 - $100', '$100 - $500', 'Over $500'] },
  { id: 'volume', label: 'Volume', icon: 'bar-chart', category: 'basic', options: ['Any', 'Over 10M', 'Over 5M', 'Over 1M', 'Over 500K', 'Under 500K'] },
  { id: 'exchange', label: 'Exchange', icon: 'globe', category: 'basic', options: ['Any', 'NYSE', 'NASDAQ', 'AMEX'] },
  { id: 'country', label: 'Country', icon: 'flag', category: 'basic', options: ['Any', 'US', 'China', 'UK', 'Canada', 'Germany', 'Japan', 'India', 'France'] },
  { id: 'pe', label: 'P/E Ratio', icon: 'calculator', category: 'valuation', options: ['Any', 'Under 10', '10 - 15', '15 - 20', '20 - 30', '30 - 50', 'Over 50', 'Negative (Loss)'] },
  { id: 'priceToBook', label: 'Price/Book', icon: 'book', category: 'valuation', options: ['Any', 'Under 1', '1 - 2', '2 - 3', '3 - 5', 'Over 5'] },
  { id: 'priceToSales', label: 'Price/Sales', icon: 'cart', category: 'valuation', options: ['Any', 'Under 1', '1 - 2', '2 - 5', '5 - 10', 'Over 10'] },
  { id: 'evToEbitda', label: 'EV/EBITDA', icon: 'analytics', category: 'valuation', options: ['Any', 'Under 5', '5 - 10', '10 - 15', '15 - 20', 'Over 20'] },
  { id: 'dividend', label: 'Dividend Yield', icon: 'cash', category: 'valuation', options: ['Any', 'Over 5%', '3% - 5%', '1% - 3%', 'Under 1%', 'None'] },
  { id: 'roe', label: 'ROE', icon: 'trending-up', category: 'profitability', options: ['Any', 'Over 30%', '20% - 30%', '15% - 20%', '10% - 15%', '5% - 10%', 'Under 5%', 'Negative'] },
  { id: 'roa', label: 'ROA', icon: 'layers', category: 'profitability', options: ['Any', 'Over 15%', '10% - 15%', '5% - 10%', '0% - 5%', 'Negative'] },
  { id: 'grossMargin', label: 'Gross Margin', icon: 'stats-chart', category: 'profitability', options: ['Any', 'Over 70%', '50% - 70%', '30% - 50%', '15% - 30%', 'Under 15%'] },
  { id: 'operatingMargin', label: 'Operating Margin', icon: 'speedometer', category: 'profitability', options: ['Any', 'Over 30%', '20% - 30%', '10% - 20%', '0% - 10%', 'Negative'] },
  { id: 'netMargin', label: 'Net Margin', icon: 'checkmark-circle', category: 'profitability', options: ['Any', 'Over 25%', '15% - 25%', '10% - 15%', '5% - 10%', '0% - 5%', 'Negative'] },
  { id: 'debtToEquity', label: 'Debt/Equity', icon: 'scale', category: 'financial', options: ['Any', 'No Debt', 'Under 0.5', '0.5 - 1', '1 - 2', 'Over 2'] },
  { id: 'currentRatio', label: 'Current Ratio', icon: 'water', category: 'financial', options: ['Any', 'Over 3', '2 - 3', '1.5 - 2', '1 - 1.5', 'Under 1'] },
  { id: 'netIncome', label: 'Net Income', icon: 'cash', category: 'financial', options: ['Any', 'Over $10B', '$1B - $10B', '$100M - $1B', '$0 - $100M', 'Negative'] },
  { id: 'freeCashFlow', label: 'Free Cash Flow', icon: 'wallet', category: 'financial', options: ['Any', 'Over $10B', '$1B - $10B', '$100M - $1B', '$0 - $100M', 'Negative'] },
  { id: 'revenueGrowth', label: 'Revenue Growth', icon: 'arrow-up-circle', category: 'growth', options: ['Any', 'Over 50%', '25% - 50%', '15% - 25%', '5% - 15%', '0% - 5%', 'Negative'] },
  { id: 'epsGrowth', label: 'EPS Growth', icon: 'trending-up', category: 'growth', options: ['Any', 'Over 50%', '25% - 50%', '15% - 25%', '5% - 15%', '0% - 5%', 'Negative'] },
  { id: 'beta', label: 'Beta', icon: 'pulse', category: 'growth', options: ['Any', 'Low (<0.8)', 'Medium (0.8-1.2)', 'High (1.2-1.5)', 'Very High (>1.5)'] },
  // Premium Filters
  { id: 'fiftyTwoWeek', label: '52-Week Range', icon: 'analytics', category: 'premium', options: ['Any', 'Near 52W High (>90%)', 'Upper Half (50-90%)', 'Lower Half (10-50%)', 'Near 52W Low (<10%)'], isPremium: true },
  { id: 'shortInterest', label: 'Short Interest', icon: 'warning', category: 'premium', options: ['Any', 'Over 30%', '20% - 30%', '10% - 20%', '5% - 10%', 'Under 5%'], isPremium: true },
  { id: 'institutionalOwnership', label: 'Institutional %', icon: 'business', category: 'premium', options: ['Any', 'Over 90%', '70% - 90%', '50% - 70%', '30% - 50%', 'Under 30%'], isPremium: true },
  { id: 'analystRating', label: 'Analyst Rating', icon: 'star', category: 'premium', options: ['Any', 'Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'], isPremium: true },
  { id: 'rsi', label: 'RSI (14)', icon: 'speedometer', category: 'premium', options: ['Any', 'Oversold (<30)', 'Neutral (30-70)', 'Overbought (>70)'], isPremium: true },
  { id: 'movingAvg', label: 'Moving Average', icon: 'git-compare', category: 'premium', options: ['Any', 'Above 50 & 200 MA', 'Above 50 MA', 'Below 50 MA', 'Below 50 & 200 MA'], isPremium: true },
  { id: 'earningsDate', label: 'Earnings Date', icon: 'calendar', category: 'premium', options: ['Any', 'Next 7 days', 'Next 30 days', 'Last 7 days', 'Last 30 days'], isPremium: true },
  { id: 'insiderActivity', label: 'Insider Activity', icon: 'people', category: 'premium', options: ['Any', 'Heavy Buying', 'Net Buying', 'No Activity', 'Net Selling', 'Heavy Selling'], isPremium: true },
];

const categoryLabels: Record<string, string> = {
  basic: '📊 Basic',
  valuation: '💰 Valuation',
  profitability: '📈 Profitability',
  financial: '🏦 Financial Health',
  growth: '🚀 Growth',
  premium: '👑 Premium',
};

// Helper Functions
const formatMarketCap = (value: number): string => {
  if (!value) return 'N/A';
  if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  return value.toLocaleString();
};

// Heat Map Color Functions
const getHeatMapColor = (change: number): string => {
  if (change >= 5) return '#00C853';
  if (change >= 3) return '#2E7D32';
  if (change >= 2) return '#43A047';
  if (change >= 1) return '#66BB6A';
  if (change >= 0.5) return '#81C784';
  if (change >= 0) return '#A5D6A7';
  if (change >= -0.5) return '#FFCDD2';
  if (change >= -1) return '#EF9A9A';
  if (change >= -2) return '#E57373';
  if (change >= -3) return '#EF5350';
  if (change >= -5) return '#F44336';
  return '#B71C1C';
};

const getHeatMapTextColor = (change: number): string => {
  if (Math.abs(change) >= 2) return '#FFFFFF';
  return '#000000';
};

const getTileSize = (marketCap: number, maxCap: number, minSize = 55, maxSize = 100): number => {
  if (!maxCap || maxCap === 0) return minSize;
  const ratio = Math.sqrt(marketCap / maxCap);
  return Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * ratio));
};

// Build screener params from filters
const buildScreenerParams = (filters: Record<string, string>): ScreenerParams => {
  const params: ScreenerParams = { limit: 50 };

  if (filters.marketCap) {
    switch (filters.marketCap) {
      case 'Mega (>$200B)': params.marketCapMoreThan = 200000000000; break;
      case 'Large ($10B-$200B)': params.marketCapMoreThan = 10000000000; params.marketCapLowerThan = 200000000000; break;
      case 'Mid ($2B-$10B)': params.marketCapMoreThan = 2000000000; params.marketCapLowerThan = 10000000000; break;
      case 'Small ($300M-$2B)': params.marketCapMoreThan = 300000000; params.marketCapLowerThan = 2000000000; break;
      case 'Micro (<$300M)': params.marketCapLowerThan = 300000000; break;
    }
  }

  if (filters.price) {
    switch (filters.price) {
      case 'Under $10': params.priceLowerThan = 10; break;
      case '$10 - $50': params.priceMoreThan = 10; params.priceLowerThan = 50; break;
      case '$50 - $100': params.priceMoreThan = 50; params.priceLowerThan = 100; break;
      case '$100 - $500': params.priceMoreThan = 100; params.priceLowerThan = 500; break;
      case 'Over $500': params.priceMoreThan = 500; break;
    }
  }

  if (filters.volume) {
    switch (filters.volume) {
      case 'Over 10M': params.volumeMoreThan = 10000000; break;
      case 'Over 5M': params.volumeMoreThan = 5000000; break;
      case 'Over 1M': params.volumeMoreThan = 1000000; break;
      case 'Over 500K': params.volumeMoreThan = 500000; break;
      case 'Under 500K': params.volumeLowerThan = 500000; break;
    }
  }

  if (filters.sector) params.sector = filters.sector;
  if (filters.exchange && filters.exchange !== 'Any') params.exchange = filters.exchange;
  if (filters.country && filters.country !== 'Any') params.country = filters.country;

  if (filters.beta) {
    switch (filters.beta) {
      case 'Low (<0.8)': params.betaLowerThan = 0.8; break;
      case 'Medium (0.8-1.2)': params.betaMoreThan = 0.8; params.betaLowerThan = 1.2; break;
      case 'High (1.2-1.5)': params.betaMoreThan = 1.2; params.betaLowerThan = 1.5; break;
      case 'Very High (>1.5)': params.betaMoreThan = 1.5; break;
    }
  }

  // NOTE: P/E, dividend-yield, margins, ROE/ROA, valuation ratios and growth are
  // NOT supported by FMP's /stock-screener and are filtered client-side after
  // enrichment (see passesClientFilters). Only the server-honored params above
  // are sent. A larger limit gives the client filters a pool to work with.
  params.limit = 150;

  return params;
};

// Heat Map Components
const ColorLegend = () => {
  const { t } = useLanguage();
  return (
    <View style={styles.legendContainer}>
      <Text style={styles.legendLabel}>{t('-5%')}</Text>
      <LinearGradient
        colors={['#B71C1C', '#F44336', '#FFCDD2', '#A5D6A7', '#43A047', '#00C853']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.legendGradient}
      />
      <Text style={styles.legendLabel}>{t('+5%')}</Text>
    </View>
  );
};

const HeatMapTile = ({ 
  stock, 
  size, 
  onPress 
}: { 
  stock: HeatMapStock; 
  size: number; 
  onPress: () => void;
}) => {
  const bgColor = getHeatMapColor(stock.changesPercentage);
  const textColor = getHeatMapTextColor(stock.changesPercentage);
  const isLarge = size > 70;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.heatMapTile,
        {
          width: size,
          height: size,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text
        style={[
          styles.heatMapSymbol,
          { color: textColor, fontSize: isLarge ? 12 : 10 },
        ]}
        numberOfLines={1}
      >
        {stock.symbol}
      </Text>
      <Text
        style={[
          styles.heatMapChange,
          { color: textColor, fontSize: isLarge ? 10 : 8 },
        ]}
      >
        {stock.changesPercentage >= 0 ? '+' : ''}
        {stock.changesPercentage.toFixed(2)}%
      </Text>
      {isLarge && (
        <Text
          style={[styles.heatMapPrice, { color: textColor }]}
          numberOfLines={1}
        >
          ${stock.price.toFixed(2)}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default function Screener() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { canAccess } = usePremiumFeature();
  const hasPlatinumAccess = canAccess(FEATURE_TIERS.SCREENER_FILTERS);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeFilterModal, setActiveFilterModal] = useState<FilterOption | null>(null);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [heatMapStocks, setHeatMapStocks] = useState<HeatMapStock[]>([]);
  const [heatMapLoading, setHeatMapLoading] = useState(false);
  const [heatMapError, setHeatMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; exchangeShortName: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'marketCap' | 'price' | 'changePercent' | 'volume' | 'pe' | 'roe'>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Saved Presets State
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [showSavedPresetsModal, setShowSavedPresetsModal] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'Any').length;

  const getFiltersByCategory = (category: string) => {
    if (category === 'all') return filterCategories;
    return filterCategories.filter(f => f.category === category);
  };

  // Fetch saved presets from API
  const fetchSavedPresets = useCallback(async () => {
    setLoadingPresets(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        setSavedPresets([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/screener-presets?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSavedPresets(data.presets || []);
      }
    } catch (err) {
    } finally {
      setLoadingPresets(false);
    }
  }, []);

  // Save new preset to API
  const savePreset = async () => {
    if (!newPresetName.trim()) {
      Alert.alert(t('Error'), t('Please enter a name for your preset'));
      return;
    }

    if (activeFilterCount === 0) {
      Alert.alert(t('Error'), t('Please select at least one filter to save'));
      return;
    }

    setSavingPreset(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert(t('Login Required'), t('Please log in to save presets'));
        setSavingPreset(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/screener-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: newPresetName.trim(),
          filters,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedPresets(prev => [data.preset, ...prev]);
        setShowSavePresetModal(false);
        setNewPresetName('');
        Alert.alert(t('Success'), t('Preset saved successfully!'));
      } else {
        const errorData = await response.json();
        Alert.alert(t('Error'), errorData.error || t('Failed to save preset'));
      }
    } catch (err) {
      Alert.alert(t('Error'), t('Failed to save preset. Please try again.'));
    } finally {
      setSavingPreset(false);
    }
  };

  // Delete preset from API
  const deletePreset = async (presetId: string) => {
    setDeletingPresetId(presetId);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`${API_BASE_URL}/screener-presets/${presetId}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSavedPresets(prev => prev.filter(p => p.id !== presetId));
      } else {
        Alert.alert(t('Error'), t('Failed to delete preset'));
      }
    } catch (err) {
      Alert.alert(t('Error'), t('Failed to delete preset'));
    } finally {
      setDeletingPresetId(null);
    }
  };

  // Load preset filters
  const loadPreset = (preset: SavedPreset) => {
    setFilters(preset.filters);
    setActivePreset(null);
    setShowSavedPresetsModal(false);
    fetchData(null, preset.filters);
  };

  // Handle bookmark button press
  const handleBookmarkPress = () => {
    fetchSavedPresets();
    setShowSavedPresetsModal(true);
  };

  // Fetch Heat Map Data
  const fetchHeatMapData = async () => {
    setHeatMapLoading(true);
    setHeatMapError(null);
    try {
      const [activesRes, gainersRes, losersRes] = await Promise.all([
        fetch(`${FMP_BASE_URL}/stock_market/actives?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/stock_market/gainers?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/stock_market/losers?apikey=${FMP_API_KEY}`),
      ]);

      const [activesData, gainersData, losersData] = await Promise.all([
        activesRes.json(),
        gainersRes.json(),
        losersRes.json(),
      ]);

      // FMP may return a non-array error object; coerce so the spread can't throw
      const actives = Array.isArray(activesData) ? activesData : [];
      const gainers = Array.isArray(gainersData) ? gainersData : [];
      const losers = Array.isArray(losersData) ? losersData : [];

      const allStocks = [...actives, ...gainers, ...losers];
      const uniqueStocks = allStocks.reduce((acc: HeatMapStock[], stock: any) => {
        if (!acc.find(s => s.symbol === stock.symbol)) {
          acc.push({
            symbol: stock.symbol,
            name: stock.name || stock.companyName || stock.symbol,
            price: stock.price || 0,
            change: stock.change || 0,
            changesPercentage: stock.changesPercentage || 0,
            marketCap: stock.marketCap || 0,
            sector: stock.sector || 'Other',
          });
        }
        return acc;
      }, []);

      // Fetch sector info for stocks without it
      const stocksWithoutSector = uniqueStocks.filter(s => !s.sector || s.sector === 'Other');
      if (stocksWithoutSector.length > 0) {
        const symbols = stocksWithoutSector.slice(0, 50).map(s => s.symbol).join(',');
        try {
          const profileRes = await fetch(`${FMP_BASE_URL}/profile/${symbols}?apikey=${FMP_API_KEY}`);
          const profiles = await profileRes.json();
          if (Array.isArray(profiles)) {
            profiles.forEach((profile: any) => {
              const stock = uniqueStocks.find(s => s.symbol === profile.symbol);
              if (stock && profile.sector) {
                stock.sector = profile.sector;
              }
            });
          }
        } catch (err) {
        }
      }

      setHeatMapStocks(uniqueStocks);
      if (uniqueStocks.length === 0) {
        setHeatMapError(t('Heat map data is unavailable right now'));
      }
    } catch (err) {
      setHeatMapStocks([]);
      setHeatMapError(t('Heat map data is unavailable right now'));
    } finally {
      setHeatMapLoading(false);
    }
  };

  // API Fetch Functions
  const fetchGainers = async (): Promise<Stock[]> => {
    const response = await fetch(FMP_BASE_URL + '/stock_market/gainers?apikey=' + FMP_API_KEY);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(data.message || t('Failed to fetch gainers'));
    return data.slice(0, 50).map((item: any) => ({
      symbol: item.symbol,
      name: item.name || item.symbol,
      price: item.price || 0,
      change: item.change || 0,
      changePercent: item.changesPercentage || 0,
      marketCap: item.marketCap || 0,
      volume: item.volume || 0,
      pe: item.pe || null,
      sector: item.sector || '',
    }));
  };

  const fetchLosers = async (): Promise<Stock[]> => {
    const response = await fetch(FMP_BASE_URL + '/stock_market/losers?apikey=' + FMP_API_KEY);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(data.message || t('Failed to fetch losers'));
    return data.slice(0, 50).map((item: any) => ({
      symbol: item.symbol,
      name: item.name || item.symbol,
      price: item.price || 0,
      change: item.change || 0,
      changePercent: item.changesPercentage || 0,
      marketCap: item.marketCap || 0,
      volume: item.volume || 0,
      pe: item.pe || null,
      sector: item.sector || '',
    }));
  };

  const fetchMostActive = async (): Promise<Stock[]> => {
    const response = await fetch(FMP_BASE_URL + '/stock_market/actives?apikey=' + FMP_API_KEY);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(data.message || t('Failed to fetch active stocks'));
    return data.slice(0, 50).map((item: any) => ({
      symbol: item.symbol,
      name: item.name || item.symbol,
      price: item.price || 0,
      change: item.change || 0,
      changePercent: item.changesPercentage || 0,
      marketCap: item.marketCap || 0,
      volume: item.volume || 0,
      pe: item.pe || null,
      sector: item.sector || '',
    }));
  };

  const fetchScreenerResults = async (params: ScreenerParams): Promise<Stock[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('apikey', FMP_API_KEY);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    if (!params.exchange) queryParams.append('exchange', 'NYSE,NASDAQ,AMEX');
    queryParams.append('isActivelyTrading', 'true');

    const response = await fetch(FMP_BASE_URL + '/stock-screener?' + queryParams.toString());
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(data.message || t('Invalid screener response'));

    return data.map((item: any) => {
      const price = item.price || 0;
      const annualDiv = num(item.lastAnnualDividend) ?? 0;
      return {
        symbol: item.symbol,
        name: item.companyName || item.symbol,
        price,
        change: 0,
        changePercent: 0,
        marketCap: item.marketCap || 0,
        volume: item.volume || 0,
        pe: item.pe ?? null,
        sector: item.sector || '',
        // Dividend YIELD (%) — FMP's dividendMoreThan filters $/share, not yield,
        // so we compute and filter yield here instead.
        dividendYield: price > 0 ? (annualDiv / price) * 100 : 0,
      };
    });
  };

  const fetchQuotes = async (symbols: string[]): Promise<Record<string, any>> => {
    if (symbols.length === 0) return {};
    const quoteMap: Record<string, any> = {};
    // /quote batches comma-separated symbols; chunk to keep URLs sane.
    const capped = symbols.slice(0, 150);
    for (let i = 0; i < capped.length; i += 50) {
      const chunk = capped.slice(i, i + 50).join(',');
      try {
        const response = await fetch(FMP_BASE_URL + '/quote/' + chunk + '?apikey=' + FMP_API_KEY);
        const data = await response.json();
        if (Array.isArray(data)) data.forEach((quote: any) => { quoteMap[quote.symbol] = quote; });
      } catch {}
    }
    return quoteMap;
  };

  // Search stocks using FMP API
  const searchStocks = async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);
    try {
      const response = await fetch(
        `${FMP_BASE_URL}/search?query=${encodeURIComponent(query)}&limit=10&exchange=NYSE,NASDAQ,AMEX&apikey=${FMP_API_KEY}`
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setSearchResults(data.map((item: any) => ({
          symbol: item.symbol,
          name: item.name || item.symbol,
          exchangeShortName: item.exchangeShortName || '',
        })));
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search handler
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // If empty, clear results immediately
    if (!text) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Debounce the API call
    searchTimeout.current = setTimeout(() => {
      searchStocks(text);
    }, 300);
  };

  // Handle selecting a search result
  const handleSearchResultSelect = (symbol: string) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    router.push(`/symbol/${symbol}/chart` as any);
  };

  const enrichStocksWithQuotes = async (stocks: Stock[]): Promise<Stock[]> => {
    try {
      // Check if any stock is missing key data (change, marketCap, or pe)
      const needsQuotes = stocks.some(s => 
        (s.change === 0 && s.changePercent === 0) || 
        !s.marketCap || s.marketCap === 0 || 
        s.pe === null
      );
      if (!needsQuotes) return stocks;
      const quotes = await fetchQuotes(stocks.map(s => s.symbol));
      return stocks.map(stock => {
        const quote = quotes[stock.symbol];
        if (quote) {
          return {
            ...stock,
            price: quote.price || stock.price,
            change: quote.change ?? stock.change,
            changePercent: quote.changesPercentage ?? stock.changePercent,
            marketCap: quote.marketCap || stock.marketCap,
            pe: quote.pe ?? stock.pe,
            volume: quote.volume || stock.volume,
          };
        }
        return stock;
      });
    } catch (err) {
      return stocks;
    }
  };

  const sortStocks = (stocks: Stock[]): Stock[] => {
    return [...stocks].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case 'price': aVal = a.price || 0; bVal = b.price || 0; break;
        case 'changePercent': aVal = a.changePercent || 0; bVal = b.changePercent || 0; break;
        case 'volume': aVal = a.volume || 0; bVal = b.volume || 0; break;
        case 'pe': aVal = a.pe || 0; bVal = b.pe || 0; break;
        case 'roe': aVal = a.roe || 0; bVal = b.roe || 0; break;
        default: aVal = a.marketCap || 0; bVal = b.marketCap || 0;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
  };

  // Enrich a screener result set with fundamentals as needed and apply the
  // client-side filters FMP's screener can't. Fundamentals filters degrade to
  // "not applied" (rather than an empty screen) if the data doesn't come back.
  const enrichAndFilter = async (base: Stock[], filtersToUse: Record<string, string>): Promise<Stock[]> => {
    let stocks = await enrichStocksWithQuotes(base);
    const activeIds = Object.keys(filtersToUse).filter(k => filtersToUse[k] && filtersToUse[k] !== 'Any' && CLIENT_FILTER_RANGES[k]);
    if (activeIds.length === 0) return stocks;

    const cheapIds = activeIds.filter(id => !FUNDAMENTAL_FILTER_IDS.has(id) && !GROWTH_FILTER_IDS.has(id));
    let candidates = stocks.filter(s => passesClientFilters(s, filtersToUse, cheapIds));

    const fundIds = activeIds.filter(id => FUNDAMENTAL_FILTER_IDS.has(id) || GROWTH_FILTER_IDS.has(id));
    if (fundIds.length === 0) return candidates;

    const needGrowth = fundIds.some(id => GROWTH_FILTER_IDS.has(id));
    candidates = candidates.slice(0, 60);
    const fmap = await enrichFundamentals(candidates.map(s => s.symbol), needGrowth);
    candidates = candidates.map(s => ({ ...s, ...(fmap.get(s.symbol) || {}) }));

    // Only apply a fundamentals filter if the data actually populated for the set
    const usableFundIds = fundIds.filter(id => {
      const field = CLIENT_FILTER_RANGES[id].field;
      return candidates.some(s => (s[field] as any) != null && !Number.isNaN(s[field] as any));
    });
    return candidates.filter(s => passesClientFilters(s, filtersToUse, [...cheapIds, ...usableFundIds]));
  };

  const runPreset = async (def: PresetDef): Promise<Stock[]> => {
    let stocks: Stock[];
    if (def.source === 'gainers') stocks = await fetchGainers();
    else if (def.source === 'losers') stocks = await fetchLosers();
    else if (def.source === 'actives') stocks = await fetchMostActive();
    else stocks = await fetchScreenerResults({ limit: 150, ...(def.server || {}) });

    stocks = await enrichStocksWithQuotes(stocks);

    if (def.needFund || def.needGrowth) {
      stocks = stocks.slice(0, 60);
      const fmap = await enrichFundamentals(stocks.map(s => s.symbol), !!def.needGrowth);
      stocks = stocks.map(s => ({ ...s, ...(fmap.get(s.symbol) || {}) }));
    }

    let filtered = def.predicate ? stocks.filter(def.predicate) : stocks;
    // If a fundamentals preset wiped everything because the data never came back,
    // fall back to the enriched list rather than showing an empty screen.
    if (filtered.length === 0 && (def.needFund || def.needGrowth)) {
      const anyFund = stocks.some(s => s.roe != null || s.netMargin != null || s.revenueGrowth != null);
      if (!anyFund) filtered = stocks;
    }
    if (def.sort) filtered = [...filtered].sort(def.sort);
    return filtered;
  };

  const fetchData = useCallback(async (preset?: string | null, customFilters?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      let stocks: Stock[] = [];
      const filtersToUse = customFilters || filters;

      if (preset) {
        if (preset === 'trending') stocks = await enrichStocksWithQuotes(await fetchMostActive());
        else if (preset === 'gainers') stocks = await enrichStocksWithQuotes(await fetchGainers());
        else if (preset === 'losers') stocks = await enrichStocksWithQuotes(await fetchLosers());
        else if (PRESET_DEFS[preset]) stocks = await runPreset(PRESET_DEFS[preset]);
        else stocks = await enrichStocksWithQuotes(await fetchMostActive());
      } else if (Object.keys(filtersToUse).some(k => filtersToUse[k] && filtersToUse[k] !== 'Any')) {
        stocks = await fetchScreenerResults(buildScreenerParams(filtersToUse));
        stocks = await enrichAndFilter(stocks, filtersToUse);
      } else {
        stocks = await enrichStocksWithQuotes(await fetchMostActive());
      }

      smoothLayout();
      setResults(sortStocks(stocks));
    } catch (err: any) {
      setError(err.message || t('Failed to fetch stocks'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (results.length > 0) setResults(sortStocks(results));
  }, [sortBy, sortOrder]);

  const handlePresetPress = (preset: Preset) => {
    if (preset.id === 'heatmap') {
      setShowHeatMap(true);
      fetchHeatMapData();
      return;
    }

    if (activePreset === preset.id) {
      setActivePreset(null);
      setFilters({});
      fetchData(null, {});
    } else {
      setActivePreset(preset.id);
      setFilters({});
      fetchData(preset.id, {});
    }
  };

  const handleFilterSelect = (filterId: string, value: string) => {
    smoothLayout();
    setFilters(prev => ({ ...prev, [filterId]: value === 'Any' ? '' : value }));
    setActiveFilterModal(null);
    setActivePreset(null);
  };

  const handleSort = (newSortBy: typeof sortBy) => {
    smoothLayout();
    if (sortBy === newSortBy) setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    else { setSortBy(newSortBy); setSortOrder('desc'); }
  };

  const handleStockPress = (symbol: string) => router.push(`/symbol/${symbol}/chart` as any);

  const filteredResults = results.filter(stock => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q);
  });

  // Group heat map stocks by sector
  const groupedHeatMapStocks = heatMapStocks.reduce((acc: Record<string, HeatMapStock[]>, stock) => {
    const sector = stock.sector || 'Other';
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(stock);
    return acc;
  }, {});

  const sortedSectors = Object.entries(groupedHeatMapStocks).sort((a, b) => {
    const capA = a[1].reduce((sum, s) => sum + s.marketCap, 0);
    const capB = b[1].reduce((sum, s) => sum + s.marketCap, 0);
    return capB - capA;
  });

  const maxMarketCap = Math.max(...heatMapStocks.map(s => s.marketCap), 1);

  const handlePremiumPress = () => {
    router.push('/(modals)/paywall' as any);
  };

  // Apply a preset passed via route param (e.g. home-page strategy cards
  // navigate to /screener?preset=momentum). Same gating as tapping the card.
  const { preset: presetParam } = useLocalSearchParams<{ preset?: string }>();
  useEffect(() => {
    if (!presetParam) return;
    const preset = presets.find(p => p.id === presetParam);
    if (!preset || preset.id === 'heatmap') return;
    if (preset.isPremium && !hasPlatinumAccess) {
      handlePremiumPress();
      return;
    }
    if (activePreset !== preset.id) {
      setActivePreset(preset.id);
      setFilters({});
      fetchData(preset.id, {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetParam]);

  const renderPreset = ({ item, index }: { item: Preset; index: number }) => {
    const isLocked = item.isPremium && !hasPlatinumAccess;
    return (
      <FadeSlideIn delay={Math.min(index, 8) * 55}>
        <ScalePress
          style={[styles.presetCard, activePreset === item.id && styles.presetCardActive]}
          onPress={() => isLocked ? handlePremiumPress() : handlePresetPress(item)}
          activeScale={0.93}
        >
          <LinearGradient colors={item.gradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.presetGradient}>
            <View style={styles.presetIconContainer}>
              <Ionicons name={item.icon as any} size={22} color="#fff" />
            </View>
            <Text style={styles.presetName}>{t(item.name)}</Text>
            <Text style={styles.presetDescription}>{t(item.description)}</Text>
          </LinearGradient>
          {item.isPremium && (
            <View style={[styles.premiumBadge, !isLocked && styles.premiumBadgeUnlocked]}>
              <Ionicons name={isLocked ? "lock-closed" : "diamond"} size={12} color={isLocked ? "#FFD700" : "#E5E4E2"} />
            </View>
          )}
          {activePreset === item.id && !isLocked && (
            <View style={styles.presetCheckmark}><Ionicons name="checkmark-circle" size={20} color="#fff" /></View>
          )}
        </ScalePress>
      </FadeSlideIn>
    );
  };

  const renderFilterChip = (filter: FilterOption) => {
    const isActive = filters[filter.id] && filters[filter.id] !== 'Any';
    const isLocked = filter.isPremium && !hasPlatinumAccess;
    return (
      <TouchableOpacity
        key={filter.id}
        style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }, isActive && styles.filterChipActive, isLocked && styles.filterChipPremium]}
        onPress={() => isLocked ? handlePremiumPress() : setActiveFilterModal(filter)}
      >
        <Ionicons name={filter.icon as any} size={16} color={isActive ? '#fff' : isLocked ? '#E5E4E2' : colors.textSecondary} />
        <Text style={[styles.filterChipText, { color: colors.text }, isActive && styles.filterChipTextActive, isLocked && styles.filterChipTextPremium]} numberOfLines={1}>
          {isActive ? t(filters[filter.id]) : t(filter.label)}
        </Text>
        {isLocked ? (
          <Ionicons name="lock-closed" size={12} color="#E5E4E2" />
        ) : (
          <Ionicons name="chevron-down" size={14} color={isActive ? '#fff' : colors.textTertiary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderStockItem = useCallback(({ item, index }: { item: Stock; index: number }) => {
    const isPositive = item.change >= 0;
    return (
      <FadeSlideIn delay={Math.min(index, 10) * 40} distance={10}>
      <TouchableOpacity
        style={[
          styles.stockItem,
          { borderBottomColor: colors.borderLight },
          { backgroundColor: colors.background }
        ]}
        activeOpacity={0.7}
        onPress={() => handleStockPress(item.symbol)}
      >
        <View style={styles.stockLeft}>
          <StockLogo
            symbol={item.symbol}
            size={Platform.OS === 'android' ? 36 : 40}
            style={{ marginRight: Platform.OS === 'android' ? 10 : 12 }}
          />
          <View style={styles.stockInfo}>
            <View style={styles.stockSymbolRow}>
              <Text style={[styles.stockSymbol, { color: colors.text }]}>{item.symbol}</Text>
              {item.sector ? <View style={[styles.sectorBadge, { backgroundColor: colors.borderLight }]}><Text style={[styles.sectorText, { color: colors.textSecondary }]} numberOfLines={1}>{item.sector.length > 10 ? item.sector.substring(0, 10) + '..' : item.sector}</Text></View> : null}
            </View>
            <Text style={[styles.stockName, { color: colors.textSecondary }]} numberOfLines={1}>{item.name}</Text>
          </View>
        </View>
        <View style={styles.stockMiddle}>
          <Text style={[styles.stockMetricLabel, { color: colors.textTertiary }]}>{t('Mkt Cap')}</Text>
          <Text style={[styles.stockMetricValue, { color: colors.text }]}>{formatMarketCap(item.marketCap)}</Text>
        </View>
        <View style={styles.stockMiddle}>
          <Text style={[styles.stockMetricLabel, { color: colors.textTertiary }]}>{t('P/E')}</Text>
          <Text style={[styles.stockMetricValue, { color: colors.text }]}>{item.pe ? item.pe.toFixed(1) : t('N/A')}</Text>
        </View>
        <View style={styles.stockRight}>
          <Text style={[styles.stockPrice, { color: colors.text }]}>${item.price ? item.price.toFixed(2) : '0.00'}</Text>
          <View style={[styles.changeContainer, isPositive ? styles.changePositive : styles.changeNegative]}>
            <Ionicons name={isPositive ? 'caret-up' : 'caret-down'} size={12} color={isPositive ? '#00C853' : '#FF5252'} />
            <Text style={[styles.changeText, isPositive ? styles.changeTextPositive : styles.changeTextNegative]}>{Math.abs(item.changePercent || 0).toFixed(2)}%</Text>
          </View>
        </View>
      </TouchableOpacity>
      </FadeSlideIn>
    );
  }, [handleStockPress, colors, t]);

  const sortOptions = [
    { key: 'marketCap', label: 'Mkt Cap' },
    { key: 'price', label: 'Price' },
    { key: 'changePercent', label: 'Change' },
    { key: 'volume', label: 'Volume' },
    { key: 'pe', label: 'P/E' },
    { key: 'roe', label: 'ROE' },
  ] as const;

  const categoryTabs = [
    { key: 'all', label: '🔍 All' },
    { key: 'basic', label: '📊 Basic' },
    { key: 'valuation', label: '💰 Valuation' },
    { key: 'profitability', label: '📈 Profit' },
    { key: 'financial', label: '🏦 Financial' },
    { key: 'growth', label: '🚀 Growth' },
    { key: 'premium', label: '👑 Premium' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
        <FadeSlideIn distance={8}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Screener')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('Scan the entire market in seconds')}</Text>
        </FadeSlideIn>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowAllFilters(true)}>
            <Ionicons name="options" size={24} color={colors.text} />
            {activeFilterCount > 0 && <View style={[styles.headerBadge, { backgroundColor: colors.primary }]}><Text style={styles.headerBadgeText}>{activeFilterCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleBookmarkPress}>
            <Ionicons name={savedPresets.length > 0 ? "bookmark" : "bookmark-outline"} size={24} color={savedPresets.length > 0 ? colors.primary : colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('Search any ticker or company…')}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          {searchLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
          {searchQuery.length > 0 && !searchLoading && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <View style={[styles.searchResultsDropdown, { backgroundColor: colors.card }]}>
            {searchResults.map((item, index) => (
              <TouchableOpacity
                key={`${item.symbol}-${index}`}
                style={[styles.searchResultItem, { borderBottomColor: colors.borderLight }]}
                onPress={() => handleSearchResultSelect(item.symbol)}
              >
                <View style={styles.searchResultLeft}>
                  <Text style={[styles.searchResultSymbol, { color: colors.text }]}>{item.symbol}</Text>
                  <Text style={[styles.searchResultName, { color: colors.textSecondary }]} numberOfLines={1}>{item.name}</Text>
                </View>
                <Text style={[styles.searchResultExchange, { color: colors.textTertiary, backgroundColor: colors.surface }]}>{item.exchangeShortName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Results Message */}
        {showSearchResults && searchQuery.length > 0 && searchResults.length === 0 && !searchLoading && (
          <View style={styles.searchResultsDropdown}>
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={24} color="#999" />
              <Text style={styles.noResultsText}>{t('No stocks found for')} &quot;{searchQuery}&quot;</Text>
            </View>
          </View>
        )}
      </View>

      {/* Backdrop to close search results */}
      {showSearchResults && (
        <TouchableOpacity
          style={styles.searchBackdrop}
          activeOpacity={1}
          onPress={() => setShowSearchResults(false)}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} colors={[colors.primary]} onRefresh={() => { setRefreshing(true); fetchData(activePreset, filters); }} />}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Quick Screens')}</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>{t('One tap, instant results')}</Text>
            </View>
          </View>
          <FlatList data={presets} renderItem={renderPreset} keyExtractor={item => item.id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetList} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.filterTitleRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Filters')}</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>{t('Stack filters to narrow the field')}</Text>
              </View>
              {activeFilterCount > 0 && <View style={styles.filterCountBadge}><Text style={styles.filterCountText}>{activeFilterCount}</Text></View>}
            </View>
            {activeFilterCount > 0 && <TouchableOpacity onPress={() => { smoothLayout(); setFilters({}); setActivePreset(null); fetchData(null, {}); }}><Text style={styles.clearText}>{t('Clear All')}</Text></TouchableOpacity>}
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs} contentContainerStyle={styles.categoryTabsContent}>
            {categoryTabs.map(tab => (
              <TouchableOpacity key={tab.key} style={[styles.categoryTab, { backgroundColor: colors.card, borderColor: colors.border }, selectedCategory === tab.key && styles.categoryTabActive]} onPress={() => { smoothLayout(); setSelectedCategory(tab.key); }}>
                <Text style={[styles.categoryTabText, { color: colors.textSecondary }, selectedCategory === tab.key && styles.categoryTabTextActive]}>{t(tab.label)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsContainer}>
            {getFiltersByCategory(selectedCategory).map(renderFilterChip)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Results')}</Text>
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>{filteredResults.length} {t(filteredResults.length === 1 ? 'match' : 'matches')}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortContainer} contentContainerStyle={styles.sortContent}>
            {sortOptions.map(sort => (
              <TouchableOpacity key={sort.key} style={[styles.sortButton, { backgroundColor: colors.card }, sortBy === sort.key && { backgroundColor: isDark ? 'rgba(255, 214, 10,0.15)' : '#F6EEDA' }]} onPress={() => handleSort(sort.key)}>
                <Text style={[styles.sortButtonText, { color: colors.textSecondary }, sortBy === sort.key && { color: colors.primary }]}>{t(sort.label)}</Text>
                {sortBy === sort.key && <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={14} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading && !refreshing && (
            <FadeSlideIn distance={6}>
              {Array.from({ length: 8 }).map((_, i) => (
                <StockRowSkeleton key={i} color={colors.borderLight} borderColor={colors.borderLight} />
              ))}
            </FadeSlideIn>
          )}
          
          {error && !loading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#FF5252" />
              <Text style={styles.errorText}>{t(error)}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(activePreset, filters)}><Text style={styles.retryButtonText}>{t('Try Again')}</Text></TouchableOpacity>
            </View>
          )}

          {!loading && !error && (
            filteredResults.length > 0 ? (
              <FlatList
                data={filteredResults}
                renderItem={renderStockItem}
                keyExtractor={(item) => item.symbol}
                getItemLayout={getStockItemLayout}
                {...FLATLIST_PERFORMANCE_PROPS}
                scrollEnabled={false}
                nestedScrollEnabled
                ListFooterComponent={<View style={{ height: 20 }} />}
              />
            ) : (
              <FadeSlideIn distance={6}>
                <View style={styles.emptyContainer}>
                  <Ionicons name="search" size={48} color={colors.borderLight} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('No matches found')}</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{t('Try loosening a filter or two')}</Text>
                </View>
              </FadeSlideIn>
            )
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Filter Selection Modal */}
      <Modal visible={activeFilterModal !== null} transparent animationType="slide" onRequestClose={() => setActiveFilterModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveFilterModal(null)}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{activeFilterModal ? t(activeFilterModal.label) : ''}</Text>
            <ScrollView style={styles.modalOptions}>
              {activeFilterModal?.options.map(option => {
                const isSelected = filters[activeFilterModal.id] === option || (option === 'Any' && !filters[activeFilterModal.id]);
                return (
                  <TouchableOpacity key={option} style={[styles.modalOption, { borderBottomColor: colors.borderLight }, isSelected && { backgroundColor: isDark ? 'rgba(255, 214, 10,0.1)' : '#FBF7EC' }]} onPress={() => handleFilterSelect(activeFilterModal.id, option)}>
                    <Text style={[styles.modalOptionText, { color: colors.text }, isSelected && { color: colors.primary, fontWeight: '600' }]}>{t(option)}</Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* All Filters Modal */}
      <Modal visible={showAllFilters} animationType="slide" onRequestClose={() => setShowAllFilters(false)}>
        <SafeAreaView style={[styles.fullModalContainer, { backgroundColor: colors.background }]} edges={['bottom']}>
          <View style={[styles.fullModalHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowAllFilters(false)} style={styles.fullModalCloseBtn}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.fullModalTitle, { color: colors.text }]}>{t('All Filters')}</Text>
            <TouchableOpacity onPress={() => { setFilters({}); }} style={styles.fullModalResetBtn}>
              <Text style={styles.resetText}>{t('Reset')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.fullModalContent}
            contentContainerStyle={styles.fullModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(categoryLabels).map(([category, label]) => (
              <View key={category} style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{t(label)}</Text>
                <View style={styles.filterGrid}>
                  {filterCategories.filter(f => f.category === category).map(filter => {
                    const isActive = filters[filter.id] && filters[filter.id] !== 'Any';
                    const isLocked = filter.isPremium && !hasPlatinumAccess;
                    return (
                      <TouchableOpacity
                        key={filter.id}
                        style={[
                          styles.filterGridItem,
                          { width: FILTER_ITEM_WIDTH, backgroundColor: colors.card, borderColor: colors.border },
                          isActive && styles.filterGridItemActive,
                          isLocked && styles.filterGridItemPremium
                        ]}
                        onPress={() => isLocked ? handlePremiumPress() : setActiveFilterModal(filter)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.filterGridIconRow}>
                          <View style={[
                            styles.filterGridIconBg,
                            { backgroundColor: colors.surface },
                            isActive && styles.filterGridIconBgActive,
                            isLocked && styles.filterGridIconBgPremium
                          ]}>
                            <Ionicons
                              name={filter.icon as any}
                              size={20}
                              color={isActive ? colors.primary : isLocked ? '#FFD700' : colors.textSecondary}
                            />
                          </View>
                          {isLocked && (
                            <View style={styles.filterLockBadge}>
                              <Ionicons name="lock-closed" size={10} color="#FFD700" />
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.filterGridLabel,
                            { color: colors.text },
                            isActive && styles.filterGridLabelActive,
                            isLocked && styles.filterGridLabelPremium
                          ]}
                          numberOfLines={1}
                        >
                          {t(filter.label)}
                        </Text>
                        {isActive ? (
                          <View style={styles.filterActiveValue}>
                            <Text style={styles.filterGridValue} numberOfLines={1}>
                              {t(filters[filter.id])}
                            </Text>
                            <Ionicons name="checkmark-circle" size={14} color="#B8860B" />
                          </View>
                        ) : (
                          <Text style={[styles.filterGridHint, { color: colors.textTertiary }]}>{t('Tap to select')}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
          <View style={[styles.fullModalFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }, activeFilterCount === 0 && styles.applyButtonDisabled]}
              onPress={() => { setShowAllFilters(false); fetchData(null, filters); }}
            >
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>{t('See Results')} ({activeFilterCount})</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Heat Map Modal */}
      <Modal visible={showHeatMap} animationType="slide" onRequestClose={() => setShowHeatMap(false)}>
        <SafeAreaView style={styles.heatMapContainer} edges={[]}>
          <View style={styles.heatMapHeader}>
            <TouchableOpacity onPress={() => setShowHeatMap(false)} style={styles.heatMapCloseBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heatMapTitle}>{t('Market Heat Map')}</Text>
            <TouchableOpacity onPress={fetchHeatMapData} style={styles.heatMapRefreshBtn}>
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ColorLegend />

          {heatMapLoading ? (
            <View style={styles.heatMapLoading}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.heatMapLoadingText}>{t('Mapping the market…')}</Text>
            </View>
          ) : heatMapError || sortedSectors.length === 0 ? (
            <View style={styles.heatMapLoading}>
              <Ionicons name="alert-circle" size={48} color="#FF5252" />
              <Text style={styles.heatMapLoadingText}>{heatMapError || t('Heat map data is unavailable right now')}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchHeatMapData}>
                <Text style={styles.retryButtonText}>{t('Try Again')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.heatMapScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {sortedSectors.map(([sector, stocks]) => (
                <View key={sector}>
                  <View style={styles.heatMapSectorHeader}>
                    <Text style={styles.heatMapSectorTitle}>{sector}</Text>
                    <Text style={styles.heatMapSectorCount}>{stocks.length} {t('stocks')}</Text>
                  </View>
                  <View style={styles.heatMapTilesContainer}>
                    {stocks
                      .sort((a, b) => b.marketCap - a.marketCap)
                      .map(stock => (
                        <HeatMapTile
                          key={stock.symbol}
                          stock={stock}
                          size={getTileSize(stock.marketCap, maxMarketCap)}
                          onPress={() => {
                            setShowHeatMap(false);
                            handleStockPress(stock.symbol);
                          }}
                        />
                      ))}
                  </View>
                </View>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Saved Presets Modal */}
      <Modal visible={showSavedPresetsModal} animationType="slide" transparent onRequestClose={() => setShowSavedPresetsModal(false)}>
        <View style={styles.savedPresetsOverlay}>
          <View style={[styles.savedPresetsContainer, { backgroundColor: colors.background }]}>
            <View style={styles.savedPresetsHeader}>
              <Text style={[styles.savedPresetsTitle, { color: colors.text }]}>{t('Saved Presets')}</Text>
              <TouchableOpacity onPress={() => setShowSavedPresetsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Save Current Filters Button */}
            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={styles.saveCurrentBtn}
                onPress={() => {
                  setShowSavedPresetsModal(false);
                  setShowSavePresetModal(true);
                }}
              >
                <LinearGradient
                  colors={['#DAA520', '#B8860B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveCurrentGradient}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.saveCurrentText}>{t('Save Current Filters')} ({activeFilterCount})</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {loadingPresets ? (
              <View style={styles.presetsLoading}>
                <ActivityIndicator size="large" color="#B8860B" />
                <Text style={styles.presetsLoadingText}>{t('Loading presets...')}</Text>
              </View>
            ) : savedPresets.length === 0 ? (
              <View style={styles.noPresetsContainer}>
                <Ionicons name="bookmark-outline" size={64} color="#CCC" />
                <Text style={styles.noPresetsTitle}>{t('No Saved Presets')}</Text>
                <Text style={styles.noPresetsText}>
                  {activeFilterCount > 0
                    ? t('Tap "Save Current Filters" to save your first preset')
                    : t('Select some filters and save them for quick access later')}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.presetsList} showsVerticalScrollIndicator={false}>
                {savedPresets.map((preset) => {
                  const filterCount = Object.values(preset.filters).filter(v => v && v !== 'Any').length;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={styles.presetItem}
                      onPress={() => loadPreset(preset)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.presetItemLeft}>
                        <View style={styles.presetIconBg}>
                          <Ionicons name="funnel" size={20} color="#B8860B" />
                        </View>
                        <View style={styles.presetItemInfo}>
                          <Text style={styles.presetItemName}>{preset.name}</Text>
                          <Text style={styles.presetItemFilters}>{filterCount} {t(filterCount !== 1 ? 'filters' : 'filter')}</Text>
                        </View>
                      </View>
                      <View style={styles.presetItemRight}>
                        <TouchableOpacity
                          style={styles.presetDeleteBtn}
                          onPress={() => {
                            Alert.alert(
                              t('Delete Preset'),
                              `${t('Are you sure you want to delete')} "${preset.name}"?`,
                              [
                                { text: t('Cancel'), style: 'cancel' },
                                { text: t('Delete'), style: 'destructive', onPress: () => deletePreset(preset.id) },
                              ]
                            );
                          }}
                        >
                          {deletingPresetId === preset.id ? (
                            <ActivityIndicator size="small" color="#FF3B30" />
                          ) : (
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                          )}
                        </TouchableOpacity>
                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Save Preset Modal */}
      <Modal visible={showSavePresetModal} animationType="fade" transparent onRequestClose={() => setShowSavePresetModal(false)}>
        <View style={styles.savePresetOverlay}>
          <View style={[styles.savePresetContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.savePresetTitle, { color: colors.text }]}>{t('Save Filter Preset')}</Text>
            <Text style={[styles.savePresetSubtitle, { color: colors.textSecondary }]}>{t('Give your')} {activeFilterCount} {t(activeFilterCount !== 1 ? 'filters' : 'filter')} {t('a name')}</Text>

            <TextInput
              style={[styles.presetNameInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              placeholder={t('e.g., High Growth Tech Stocks')}
              placeholderTextColor={colors.textTertiary}
              value={newPresetName}
              onChangeText={setNewPresetName}
              autoFocus
              maxLength={50}
            />

            <View style={styles.savePresetActions}>
              <TouchableOpacity
                style={styles.savePresetCancelBtn}
                onPress={() => {
                  setShowSavePresetModal(false);
                  setNewPresetName('');
                }}
              >
                <Text style={styles.savePresetCancelText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savePresetSaveBtn, savingPreset && styles.savePresetSaveBtnDisabled]}
                onPress={savePreset}
                disabled={savingPreset}
              >
                {savingPreset ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.savePresetSaveText}>{t('Save Preset')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {activeFilterCount > 0 && !activePreset && (
        <FadeSlideIn distance={24} style={styles.fab}>
          <ScalePress onPress={() => fetchData(null, filters)} activeScale={0.97}>
            <LinearGradient colors={['#DAA520', '#B8860B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGradient}>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.fabText}>
                {t('Run Screen')} · {activeFilterCount} {t(activeFilterCount === 1 ? 'filter' : 'filters')}
              </Text>
            </LinearGradient>
          </ScalePress>
        </FadeSlideIn>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Platform.OS === 'android' ? 16 : 20, paddingVertical: Platform.OS === 'android' ? 12 : 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: Platform.OS === 'android' ? 22 : 28, fontWeight: '700', color: '#000' },
  headerSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  sectionSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { padding: 8, position: 'relative' },
  headerBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#B8860B', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', zIndex: 1001, position: 'relative' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 10, color: '#000' },
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  filterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterCountBadge: { backgroundColor: '#B8860B', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  filterCountText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  clearText: { fontSize: 14, color: '#FF3B30', fontWeight: '600' },
  presetList: { paddingHorizontal: 20 },
  presetCard: { width: 120, height: 110, borderRadius: 16, overflow: 'hidden', marginRight: 12 },
  presetCardActive: { transform: [{ scale: 0.98 }] },
  presetGradient: { flex: 1, padding: 12, justifyContent: 'space-between' },
  presetIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  presetName: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 6 },
  presetDescription: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  presetCheckmark: { position: 'absolute', top: 8, right: 8 },
  premiumBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 4 },
  premiumBadgeUnlocked: { backgroundColor: 'rgba(229, 228, 226, 0.3)' },
  categoryTabs: { marginBottom: 12 },
  categoryTabsContent: { paddingHorizontal: 20 },
  categoryTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  categoryTabActive: { backgroundColor: '#B8860B', borderColor: '#B8860B' },
  categoryTabText: { fontSize: 13, color: '#666', fontWeight: '500' },
  categoryTabTextActive: { color: '#fff' },
  filterChipsContainer: { paddingHorizontal: 20, paddingBottom: 4 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E5E5E5', gap: 6, maxWidth: 160 },
  filterChipActive: { backgroundColor: '#B8860B', borderColor: '#B8860B' },
  filterChipPremium: { borderColor: '#E5E4E2', backgroundColor: '#F8F8F8' },
  filterChipText: { fontSize: 13, color: '#333', fontWeight: '500', flexShrink: 1 },
  filterChipTextActive: { color: '#fff' },
  filterChipTextPremium: { color: '#A0A0A0' },
  resultCount: { fontSize: 14, color: '#666' },
  sortContainer: { marginBottom: 12 },
  sortContent: { paddingHorizontal: 20 },
  sortButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', marginRight: 8, gap: 4 },
  sortButtonActive: { backgroundColor: '#F6EEDA' },
  sortButtonText: { fontSize: 13, color: '#666', fontWeight: '500' },
  sortButtonTextActive: { color: '#B8860B' },
  stockList: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  stockItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
  stockItemEven: { backgroundColor: '#FFFFFF' },
  stockItemOdd: { backgroundColor: '#FAFBFC' },
  stockLeft: { flex: 1.2, flexDirection: 'row', alignItems: 'center' },
  stockInfo: { flex: 1 },
  stockSymbolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockSymbol: { fontSize: 16, fontWeight: '700', color: '#000' },
  sectorBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, maxWidth: 80 },
  sectorText: { fontSize: 9, color: '#666', fontWeight: '600' },
  stockName: { fontSize: 12, color: '#666', marginTop: 4 },
  stockMiddle: { flex: 0.55, alignItems: 'center' },
  stockMetricLabel: { fontSize: 10, color: '#999', marginBottom: 2 },
  stockMetricValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  stockRight: { flex: 0.85, alignItems: 'flex-end' },
  stockPrice: { fontSize: 15, fontWeight: '700', color: '#000' },
  changeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 2 },
  changePositive: { backgroundColor: 'rgba(0, 200, 83, 0.1)' },
  changeNegative: { backgroundColor: 'rgba(255, 82, 82, 0.1)' },
  changeText: { fontSize: 12, fontWeight: '600' },
  changeTextPositive: { color: '#00C853' },
  changeTextNegative: { color: '#FF5252' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  errorContainer: { padding: 40, alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16 },
  errorText: { marginTop: 12, fontSize: 14, color: '#666', textAlign: 'center' },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#B8860B', borderRadius: 20 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: '600', color: '#666' },
  emptySubtext: { marginTop: 4, fontSize: 14, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 40, maxHeight: '70%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20, color: '#000' },
  modalOptions: { paddingHorizontal: 20 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalOptionSelected: { backgroundColor: '#FBF7EC', marginHorizontal: -20, paddingHorizontal: 20 },
  modalOptionText: { fontSize: 16, color: '#333' },
  modalOptionTextSelected: { color: '#B8860B', fontWeight: '600' },
  fullModalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  fullModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  fullModalCloseBtn: { padding: 4 },
  fullModalResetBtn: { padding: 4 },
  fullModalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  resetText: { fontSize: 16, color: '#FF3B30', fontWeight: '600' },
  fullModalContent: { flex: 1 },
  fullModalScrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  filterSection: { marginTop: 20 },
  filterSectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  filterGridItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    minHeight: 100,
  },
  filterGridItemActive: { borderColor: '#B8860B', backgroundColor: '#FBF6E8' },
  filterGridItemPremium: { borderColor: '#FFD700', backgroundColor: '#FFFEF5' },
  filterGridIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  filterGridIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterGridIconBgActive: { backgroundColor: '#F6EEDA' },
  filterGridIconBgPremium: { backgroundColor: '#FFF9E6' },
  filterLockBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 2,
  },
  filterGridLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  filterGridLabelActive: { color: '#B8860B' },
  filterGridLabelPremium: { color: '#B8860B' },
  filterActiveValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterGridValue: { fontSize: 12, color: '#B8860B', fontWeight: '500', flex: 1 },
  filterGridHint: { fontSize: 11, color: '#999' },
  fullModalFooter: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  applyButton: {
    backgroundColor: '#B8860B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  applyButtonDisabled: { backgroundColor: '#B0B0B0' },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // bottom 135 clears the floating glass tab-bar pill (100 sat behind it)
  fab: { position: 'absolute', bottom: 135, left: 20, right: 20, borderRadius: 16, overflow: 'hidden', shadowColor: '#B8860B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Heat Map Styles
  heatMapContainer: { flex: 1, backgroundColor: '#0D0D0D' },
  heatMapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  heatMapCloseBtn: { padding: 4 },
  heatMapTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  heatMapRefreshBtn: { padding: 4 },
  legendContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  legendGradient: { flex: 1, height: 12, borderRadius: 6, maxWidth: 200 },
  legendLabel: { color: '#888', fontSize: 11, fontWeight: '500' },
  heatMapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heatMapLoadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  heatMapScrollContent: { padding: 12 },
  heatMapSectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, marginTop: 8 },
  heatMapSectorTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  heatMapSectorCount: { color: '#666', fontSize: 11 },
  heatMapTilesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatMapTile: { borderRadius: 4, padding: 4, justifyContent: 'center', alignItems: 'center' },
  heatMapSymbol: { fontWeight: '700' },
  heatMapChange: { marginTop: 1 },
  heatMapPrice: { fontSize: 8, marginTop: 1, opacity: 0.8 },
  // Search Results Dropdown Styles
  searchResultsDropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    maxHeight: 350,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  searchResultSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  searchResultName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  searchResultExchange: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  searchBackdrop: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 999,
  },
  // Saved Presets Modal Styles
  savedPresetsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  savedPresetsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  savedPresetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  savedPresetsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  saveCurrentBtn: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveCurrentGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  saveCurrentText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  presetsLoading: {
    padding: 60,
    alignItems: 'center',
  },
  presetsLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  noPresetsContainer: {
    padding: 60,
    alignItems: 'center',
  },
  noPresetsTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  noPresetsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  presetsList: {
    paddingHorizontal: 20,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  presetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  presetIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F6EEDA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  presetItemInfo: {
    flex: 1,
  },
  presetItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  presetItemFilters: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  presetItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetDeleteBtn: {
    padding: 8,
  },
  // Save Preset Modal Styles
  savePresetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  savePresetContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  savePresetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  savePresetSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  presetNameInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F8F9FA',
    marginBottom: 20,
  },
  savePresetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  savePresetCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  savePresetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  savePresetSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#B8860B',
    alignItems: 'center',
  },
  savePresetSaveBtnDisabled: {
    opacity: 0.6,
  },
  savePresetSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
