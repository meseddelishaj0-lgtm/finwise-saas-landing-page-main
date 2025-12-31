// components/Skeleton.tsx
// Reusable skeleton loading components for better perceived performance

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

// Base skeleton with shimmer animation
export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View style={[styles.skeleton, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

// Stock row skeleton
export function StockRowSkeleton() {
  return (
    <View style={styles.stockRow}>
      <View style={styles.stockLeft}>
        <Skeleton width={60} height={18} borderRadius={4} />
        <Skeleton width={120} height={14} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <View style={styles.stockRight}>
        <Skeleton width={70} height={18} borderRadius={4} />
        <Skeleton width={55} height={24} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

// Watchlist skeleton (multiple rows)
export function WatchlistSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <StockRowSkeleton key={i} />
      ))}
    </View>
  );
}

// Chart skeleton
export function ChartSkeleton() {
  return (
    <View style={styles.chartContainer}>
      {/* Price header */}
      <View style={styles.chartHeader}>
        <Skeleton width={140} height={44} borderRadius={8} />
        <Skeleton width={100} height={28} borderRadius={16} style={{ marginTop: 8 }} />
      </View>
      {/* Chart area */}
      <View style={styles.chartArea}>
        <Skeleton width="100%" height={200} borderRadius={12} />
      </View>
      {/* Timeframe pills */}
      <View style={styles.timeframePills}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width={50} height={36} borderRadius={18} />
        ))}
      </View>
    </View>
  );
}

// Post/Feed item skeleton
export function PostSkeleton() {
  return (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.postHeaderText}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>
      <Skeleton width="100%" height={14} borderRadius={4} style={{ marginTop: 12 }} />
      <Skeleton width="90%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
      <Skeleton width="70%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
      <View style={styles.postFooter}>
        <Skeleton width={60} height={24} borderRadius={12} />
        <Skeleton width={60} height={24} borderRadius={12} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

// Feed skeleton (multiple posts)
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </View>
  );
}

// News item skeleton
export function NewsItemSkeleton() {
  return (
    <View style={styles.newsItem}>
      <View style={styles.newsContent}>
        <Skeleton width="100%" height={16} borderRadius={4} />
        <Skeleton width="80%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
        <Skeleton width={80} height={12} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={80} height={60} borderRadius={8} />
    </View>
  );
}

// News list skeleton
export function NewsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <NewsItemSkeleton key={i} />
      ))}
    </View>
  );
}

// Trending card skeleton
export function TrendingCardSkeleton() {
  return (
    <View style={styles.trendingCard}>
      <Skeleton width={50} height={18} borderRadius={4} />
      <Skeleton width={70} height={24} borderRadius={4} style={{ marginTop: 8 }} />
      <Skeleton width={50} height={20} borderRadius={10} style={{ marginTop: 8 }} />
    </View>
  );
}

// Home screen header skeleton
export function HomeHeaderSkeleton() {
  return (
    <View style={styles.homeHeader}>
      <View style={styles.homeHeaderTop}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={150} height={20} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>
      {/* Trending cards */}
      <View style={styles.trendingRow}>
        <TrendingCardSkeleton />
        <TrendingCardSkeleton />
        <TrendingCardSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  // Stock row
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2E',
  },
  stockLeft: {
    flex: 1,
  },
  stockRight: {
    alignItems: 'flex-end',
  },
  // Chart
  chartContainer: {
    padding: 16,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartArea: {
    marginVertical: 16,
  },
  timeframePills: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  // Post
  postContainer: {
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2E',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  postFooter: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  // News
  newsItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2C2C2E',
  },
  newsContent: {
    flex: 1,
    marginRight: 12,
  },
  // Trending
  trendingCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    width: 110,
    marginRight: 10,
  },
  trendingRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  // Home header
  homeHeader: {
    padding: 16,
  },
  homeHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
