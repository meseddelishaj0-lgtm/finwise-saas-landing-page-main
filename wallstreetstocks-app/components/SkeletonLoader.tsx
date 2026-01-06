// components/SkeletonLoader.tsx
// Skeleton loading components for instant UI feedback
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Animated shimmer effect
const ShimmerEffect = ({ style }: { style?: any }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={[styles.shimmerContainer, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }] },
        ]}
      />
    </View>
  );
};

// Skeleton for market index card
export const IndexCardSkeleton = () => (
  <View style={styles.indexCard}>
    <ShimmerEffect style={styles.indexIcon} />
    <ShimmerEffect style={styles.indexSymbol} />
    <ShimmerEffect style={styles.indexPrice} />
    <ShimmerEffect style={styles.indexChange} />
  </View>
);

// Skeleton for watchlist row
export const WatchlistRowSkeleton = () => (
  <View style={styles.watchlistRow}>
    <View style={styles.watchlistLeft}>
      <ShimmerEffect style={styles.watchlistSymbol} />
      <ShimmerEffect style={styles.watchlistName} />
    </View>
    <ShimmerEffect style={styles.watchlistChart} />
    <View style={styles.watchlistRight}>
      <ShimmerEffect style={styles.watchlistPrice} />
      <ShimmerEffect style={styles.watchlistChange} />
    </View>
  </View>
);

// Skeleton for trending stock card
export const TrendingCardSkeleton = () => (
  <View style={styles.trendingCard}>
    <ShimmerEffect style={styles.trendingRank} />
    <ShimmerEffect style={styles.trendingSymbol} />
    <ShimmerEffect style={styles.trendingPrice} />
    <ShimmerEffect style={styles.trendingChart} />
    <ShimmerEffect style={styles.trendingChange} />
  </View>
);

// Skeleton for portfolio summary
export const PortfolioSkeleton = () => (
  <View style={styles.portfolioContainer}>
    <ShimmerEffect style={styles.portfolioValue} />
    <ShimmerEffect style={styles.portfolioChange} />
    <ShimmerEffect style={styles.portfolioChart} />
  </View>
);

// Multiple index cards skeleton
export const IndicesSkeletonList = ({ count = 5 }: { count?: number }) => (
  <View style={styles.indicesRow}>
    {Array(count).fill(0).map((_, i) => (
      <IndexCardSkeleton key={i} />
    ))}
  </View>
);

// Multiple watchlist rows skeleton
export const WatchlistSkeletonList = ({ count = 4 }: { count?: number }) => (
  <View>
    {Array(count).fill(0).map((_, i) => (
      <WatchlistRowSkeleton key={i} />
    ))}
  </View>
);

// Multiple trending cards skeleton
export const TrendingSkeletonList = ({ count = 3 }: { count?: number }) => (
  <View style={styles.trendingRow}>
    {Array(count).fill(0).map((_, i) => (
      <TrendingCardSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  shimmerContainer: {
    backgroundColor: '#E8E8E8',
    overflow: 'hidden',
    borderRadius: 4,
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  // Index card skeleton
  indexCard: {
    width: 140,
    height: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
  },
  indexIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 8,
  },
  indexSymbol: {
    width: 60,
    height: 14,
    borderRadius: 4,
    marginBottom: 6,
  },
  indexPrice: {
    width: 80,
    height: 18,
    borderRadius: 4,
    marginBottom: 6,
  },
  indexChange: {
    width: 50,
    height: 14,
    borderRadius: 4,
  },
  // Watchlist row skeleton
  watchlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  watchlistLeft: {
    flex: 1,
  },
  watchlistSymbol: {
    width: 60,
    height: 16,
    borderRadius: 4,
    marginBottom: 4,
  },
  watchlistName: {
    width: 100,
    height: 12,
    borderRadius: 4,
  },
  watchlistChart: {
    width: 80,
    height: 32,
    borderRadius: 4,
    marginHorizontal: 12,
  },
  watchlistRight: {
    alignItems: 'flex-end',
  },
  watchlistPrice: {
    width: 70,
    height: 16,
    borderRadius: 4,
    marginBottom: 4,
  },
  watchlistChange: {
    width: 50,
    height: 14,
    borderRadius: 4,
  },
  // Trending card skeleton
  trendingCard: {
    width: 140,
    height: 160,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
  },
  trendingRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  trendingSymbol: {
    width: 50,
    height: 14,
    borderRadius: 4,
    marginBottom: 6,
  },
  trendingPrice: {
    width: 70,
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  trendingChart: {
    width: '100%',
    height: 40,
    borderRadius: 4,
    marginBottom: 8,
  },
  trendingChange: {
    width: 60,
    height: 14,
    borderRadius: 4,
  },
  // Portfolio skeleton
  portfolioContainer: {
    padding: 16,
  },
  portfolioValue: {
    width: 150,
    height: 32,
    borderRadius: 4,
    marginBottom: 8,
  },
  portfolioChange: {
    width: 100,
    height: 18,
    borderRadius: 4,
    marginBottom: 16,
  },
  portfolioChart: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  // List containers
  indicesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  trendingRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
});

export default {
  IndexCardSkeleton,
  WatchlistRowSkeleton,
  TrendingCardSkeleton,
  PortfolioSkeleton,
  IndicesSkeletonList,
  WatchlistSkeletonList,
  TrendingSkeletonList,
};
