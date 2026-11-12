// components/home/shared.tsx
// Pieces shared by the Home tab (app/(tabs)/index.tsx) and its sections.
// Everything here was moved out of index.tsx unchanged.
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Platform, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { priceStore } from '@/stores/priceStore';

export type WatchlistFilter = 'All' | 'Gainers' | 'Losers';
export type WatchlistSort = 'My Sort' | 'Name' | 'Price' | 'Change %' | 'Change $';

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  color: string;
}

export interface ChartPoint {
  value: number;
  label: string;
  dataPointText?: string;
}

// Stock picks preview data
// Growth card teaser symbols — all in marketDataService's pre-loaded core
// list so prices are instant (ungated for now; paywall to be added later)
export const GROWTH_STOCKS_PREVIEW = [
  { symbol: 'TSLA', category: 'EV & Energy' },
  { symbol: 'AMD', category: 'Semiconductors' },
  { symbol: 'LLY', category: 'Healthcare' },
];


export const STOCK_PICKS_PREVIEW = [
  { symbol: 'NVDA', category: 'AI & Tech', reason: 'AI chip leader' },
  { symbol: 'AAPL', category: 'Tech Giant', reason: 'Services growth' },
  { symbol: 'MSFT', category: 'Cloud & AI', reason: 'Azure expansion' },
];

// Interpolate data to create more points for smoother curves
export const interpolateData = (data: { value: number; label: string; dataPointText?: string }[], targetPoints: number = 60): { value: number; label: string; dataPointText?: string }[] => {
  if (data.length <= 2 || data.length >= targetPoints) return data;

  const result: { value: number; label: string; dataPointText?: string }[] = [];
  const step = (data.length - 1) / (targetPoints - 1);

  for (let i = 0; i < targetPoints; i++) {
    const pos = i * step;
    const lower = Math.floor(pos);
    const upper = Math.min(Math.ceil(pos), data.length - 1);
    const fraction = pos - lower;

    const interpolatedValue = data[lower].value + fraction * (data[upper].value - data[lower].value);

    // Only keep labels from original data points at intervals
    const isOriginalPoint = i === 0 || i === targetPoints - 1 || Math.abs(pos - Math.round(pos)) < 0.01;

    result.push({
      value: interpolatedValue,
      label: '',
      dataPointText: isOriginalPoint && data[Math.round(pos)] ? data[Math.round(pos)].dataPointText : ''
    });
  }

  return result;
};

// Live portfolio totals: every holding re-priced from the price store.
// Returns null when there are no holdings.
export function computeLivePortfolio(portfolioHoldings: any[] | null | undefined) {
  if (!portfolioHoldings?.length) return null;

  let totalValue = 0;
  let totalCost = 0;

  const holdings = portfolioHoldings.map((holding: any) => {
    // For crypto, try both formats and use the most recent one (explore page model)
    let quote = priceStore.getQuote(holding.symbol);

    if (holding.symbol?.includes('/')) {
      // Symbol has slash (BTC/USD) - also try without slash (BTCUSD)
      const noSlashSymbol = holding.symbol.replace('/', '');
      const noSlashQuote = priceStore.getQuote(noSlashSymbol);
      if (noSlashQuote && noSlashQuote.price > 0) {
        if (!quote || (noSlashQuote.updatedAt > (quote.updatedAt || 0))) {
          quote = noSlashQuote;
        }
      }
    } else if (holding.symbol?.endsWith('USD') && holding.symbol.length <= 10) {
      // Symbol has no slash (BTCUSD) - also try with slash (BTC/USD)
      const slashSymbol = holding.symbol.slice(0, -3) + '/USD';
      const slashQuote = priceStore.getQuote(slashSymbol);
      if (slashQuote && slashQuote.price > 0) {
        if (!quote || (slashQuote.updatedAt > (quote.updatedAt || 0))) {
          quote = slashQuote;
        }
      }
    }

    const currentPrice = (quote && quote.price > 0) ? quote.price : holding.currentPrice || holding.avgCost;
    const currentValue = currentPrice * holding.shares;
    const costBasis = holding.avgCost * holding.shares;
    const gain = currentValue - costBasis;
    const gainPercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
    const color = gainPercent >= 0 ? '#34C759' : '#FF3B30';

    totalValue += currentValue;
    totalCost += costBasis;

    return { ...holding, currentPrice, currentValue, gain, gainPercent, color };
  });

  const totalGainPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return {
    holdings,
    totalValue,
    totalGain: totalValue - totalCost,
    totalGainPercent,
    totalColor: totalGainPercent >= 0 ? '#34C759' : '#FF3B30',
  };
}

// Springy press wrapper with haptic feedback (UI only — same onPress behavior)
export const ScalePress = ({
  children,
  onPress,
  onLongPress,
  style,
  activeScale = 0.96,
  accessibilityRole,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  style?: any;
  activeScale?: number;
  accessibilityRole?: "button";
  accessibilityLabel?: string;
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
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// Theme-aware skeleton shimmer (opacity pulse, native driver)
export const SkeletonPulse = ({ style, isDark }: { style?: any; isDark: boolean }) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 8 },
        style,
        { opacity },
      ]}
    />
  );
};

// Market overview loading placeholder (theme-aware, matches indexCard size)
export const HomeIndicesSkeleton = ({ isDark, cardColor }: { isDark: boolean; cardColor: string }) => (
  <View style={{ flexDirection: 'row' }}>
    {[0, 1, 2, 3].map((i) => (
      <View key={i} style={{ width: 112, borderRadius: 14, backgroundColor: cardColor, padding: 11, marginRight: 10 }}>
        <SkeletonPulse isDark={isDark} style={{ width: 60, height: 12, marginBottom: 8 }} />
        <SkeletonPulse isDark={isDark} style={{ width: 44, height: 9, marginBottom: 8 }} />
        <SkeletonPulse isDark={isDark} style={{ width: 70, height: 14, marginBottom: 8 }} />
        <SkeletonPulse isDark={isDark} style={{ width: 52, height: 18, borderRadius: 9 }} />
      </View>
    ))}
  </View>
);

// Watchlist loading placeholder (theme-aware, mirrors row layout)
export const HomeWatchlistSkeleton = ({ isDark }: { isDark: boolean }) => (
  <View>
    {[0, 1, 2, 3].map((i) => (
      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <SkeletonPulse isDark={isDark} style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }} />
          <SkeletonPulse isDark={isDark} style={{ width: 64, height: 13 }} />
        </View>
        <SkeletonPulse isDark={isDark} style={{ width: 85, height: 28, borderRadius: 6 }} />
        <View style={{ alignItems: 'flex-end', width: 90 }}>
          <SkeletonPulse isDark={isDark} style={{ width: 64, height: 13, marginBottom: 6 }} />
          <SkeletonPulse isDark={isDark} style={{ width: 76, height: 10 }} />
        </View>
      </View>
    ))}
  </View>
);
