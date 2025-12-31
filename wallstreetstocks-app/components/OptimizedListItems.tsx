// components/OptimizedListItems.tsx
// Memoized list item components for FlatList performance optimization

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ===== ITEM HEIGHTS (for getItemLayout) =====
export const ITEM_HEIGHTS = {
  STOCK_ROW: 72,
  TRENDING_ITEM: 76,
  WATCHLIST_ITEM: 68,
  MESSAGE_ITEM: 80,
  NOTIFICATION_ITEM: 88,
  POST_ITEM: 180,
} as const;

// ===== GET ITEM LAYOUT HELPERS =====
export const createGetItemLayout = (itemHeight: number) =>
  (_data: any, index: number) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  });

// Pre-built getItemLayout functions
export const getStockRowLayout = createGetItemLayout(ITEM_HEIGHTS.STOCK_ROW);
export const getTrendingItemLayout = createGetItemLayout(ITEM_HEIGHTS.TRENDING_ITEM);
export const getWatchlistItemLayout = createGetItemLayout(ITEM_HEIGHTS.WATCHLIST_ITEM);
export const getMessageItemLayout = createGetItemLayout(ITEM_HEIGHTS.MESSAGE_ITEM);

// ===== FLATLIST PERFORMANCE PROPS =====
export const FLATLIST_PERFORMANCE_PROPS = {
  initialNumToRender: 15,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  windowSize: 11,
  removeClippedSubviews: true,
  scrollEventThrottle: 16,
} as const;

// ===== MEMOIZED STOCK ROW ITEM =====
interface StockRowProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  onPress?: () => void;
}

export const StockRowItem = memo(function StockRowItem({
  symbol,
  name,
  price,
  change,
  changePercent,
  onPress,
}: StockRowProps) {
  const isPositive = changePercent >= 0;
  const color = isPositive ? '#34C759' : '#FF3B30';

  return (
    <TouchableOpacity
      style={styles.stockRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.stockInfo}>
        <Text style={styles.stockSymbol}>{symbol}</Text>
        <Text style={styles.stockName} numberOfLines={1}>{name}</Text>
      </View>
      <View style={styles.stockPriceContainer}>
        <Text style={styles.stockPrice}>${price.toFixed(2)}</Text>
        <View style={[styles.changeContainer, { backgroundColor: isPositive ? '#E8F5E9' : '#FFEBEE' }]}>
          <Ionicons
            name={isPositive ? 'caret-up' : 'caret-down'}
            size={12}
            color={color}
          />
          <Text style={[styles.changeText, { color }]}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these props change
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.price === nextProps.price &&
    prevProps.changePercent === nextProps.changePercent
  );
});

// ===== MEMOIZED TRENDING ITEM =====
interface TrendingItemProps {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  onPress?: () => void;
}

export const TrendingItem = memo(function TrendingItem({
  rank,
  symbol,
  name,
  price,
  changePercent,
  onPress,
}: TrendingItemProps) {
  const isPositive = changePercent >= 0;
  const color = isPositive ? '#34C759' : '#FF3B30';

  return (
    <TouchableOpacity
      style={styles.trendingItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      <View style={styles.trendingInfo}>
        <Text style={styles.trendingSymbol}>{symbol}</Text>
        <Text style={styles.trendingName} numberOfLines={1}>{name}</Text>
      </View>
      <View style={styles.trendingPriceContainer}>
        <Text style={styles.trendingPrice}>${price.toFixed(2)}</Text>
        <Text style={[styles.trendingChange, { color }]}>
          {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.price === nextProps.price &&
    prevProps.changePercent === nextProps.changePercent &&
    prevProps.rank === nextProps.rank
  );
});

// ===== MEMOIZED WATCHLIST ITEM =====
interface WatchlistItemProps {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const WatchlistItem = memo(function WatchlistItem({
  symbol,
  name,
  price,
  changePercent,
  onPress,
  onLongPress,
}: WatchlistItemProps) {
  const isPositive = changePercent >= 0;
  const color = isPositive ? '#34C759' : '#FF3B30';
  const bgColor = isPositive ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)';

  return (
    <TouchableOpacity
      style={styles.watchlistItem}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.watchlistInfo}>
        <Text style={styles.watchlistSymbol}>{symbol}</Text>
        <Text style={styles.watchlistName} numberOfLines={1}>{name}</Text>
      </View>
      <View style={styles.watchlistPriceContainer}>
        <Text style={styles.watchlistPrice}>${price.toFixed(2)}</Text>
        <View style={[styles.watchlistChangeContainer, { backgroundColor: bgColor }]}>
          <Text style={[styles.watchlistChange, { color }]}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.price === nextProps.price &&
    prevProps.changePercent === nextProps.changePercent
  );
});

// ===== MEMOIZED MESSAGE ITEM =====
interface MessageItemProps {
  id: string;
  userName: string;
  userImage?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  onPress?: () => void;
}

export const MessageItem = memo(function MessageItem({
  userName,
  userImage,
  lastMessage,
  timestamp,
  unreadCount = 0,
  onPress,
}: MessageItemProps) {
  return (
    <TouchableOpacity
      style={styles.messageItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {userImage ? (
        <Image
          source={{ uri: userImage }}
          style={styles.messageAvatar}
          cachePolicy="memory-disk"
          contentFit="cover"
        />
      ) : (
        <View style={styles.messageAvatarPlaceholder}>
          <Text style={styles.messageAvatarText}>
            {userName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageUserName} numberOfLines={1}>{userName}</Text>
          <Text style={styles.messageTimestamp}>{timestamp}</Text>
        </View>
        <Text style={styles.messagePreview} numberOfLines={1}>{lastMessage}</Text>
      </View>
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.lastMessage === nextProps.lastMessage &&
    prevProps.unreadCount === nextProps.unreadCount &&
    prevProps.timestamp === nextProps.timestamp
  );
});

// ===== STYLES =====
const styles = StyleSheet.create({
  // Stock Row
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    height: ITEM_HEIGHTS.STOCK_ROW,
  },
  stockInfo: {
    flex: 1,
    marginRight: 12,
  },
  stockSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  stockName: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  stockPriceContainer: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },

  // Trending Item
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    height: ITEM_HEIGHTS.TRENDING_ITEM,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  trendingInfo: {
    flex: 1,
    marginRight: 12,
  },
  trendingSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  trendingName: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  trendingPriceContainer: {
    alignItems: 'flex-end',
  },
  trendingPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  trendingChange: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },

  // Watchlist Item
  watchlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    height: ITEM_HEIGHTS.WATCHLIST_ITEM,
  },
  watchlistInfo: {
    flex: 1,
    marginRight: 12,
  },
  watchlistSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  watchlistName: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  watchlistPriceContainer: {
    alignItems: 'flex-end',
  },
  watchlistPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  watchlistChangeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  watchlistChange: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Message Item
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    height: ITEM_HEIGHTS.MESSAGE_ITEM,
  },
  messageAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  messageAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  messageTimestamp: {
    fontSize: 13,
    color: '#8E8E93',
  },
  messagePreview: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
