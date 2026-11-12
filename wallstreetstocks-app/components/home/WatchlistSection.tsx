// components/home/WatchlistSection.tsx
// Home tab: the watchlist card (filter/sort menus and the rows).
// It refreshes itself from the price store, so a price tick re-renders this
// card only instead of the whole Home tab. Markup and maths are unchanged
// from index.tsx.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { priceStore } from '@/stores/priceStore';
import { useQuoteTick } from '@/hooks/useQuoteTick';
import { displaySymbol } from '@/lib/symbolDisplay';
import { AnimatedPrice, LiveUpdated } from '@/components/AnimatedPrice';
import StockLogo from '@/components/StockLogo';
import FadeSlideIn from '@/components/FadeSlideIn';
import Sparkline from '@/components/Sparkline';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { styles } from './homeStyles';
import { ScalePress, HomeWatchlistSkeleton, WatchlistFilter, WatchlistSort } from './shared';

interface Props {
  watchlistData: any[];
  watchlistDataLoading: boolean;
  watchlistFilter: WatchlistFilter;
  setWatchlistFilter: (value: WatchlistFilter) => void;
  watchlistSort: WatchlistSort;
  setWatchlistSort: (value: WatchlistSort) => void;
  showFilterDropdown: boolean;
  setShowFilterDropdown: (value: boolean) => void;
  showSortDropdown: boolean;
  setShowSortDropdown: (value: boolean) => void;
  setWatchlistModal: (value: boolean) => void;
  handleRemoveFromWatchlist: (symbol: string) => void;
  trackAction: () => void;
  /** False while the Home tab is not on display: pauses live updates. */
  live: boolean;
}

function WatchlistSection({
  watchlistData,
  watchlistDataLoading,
  watchlistFilter,
  setWatchlistFilter,
  watchlistSort,
  setWatchlistSort,
  showFilterDropdown,
  setShowFilterDropdown,
  showSortDropdown,
  setShowSortDropdown,
  setWatchlistModal,
  handleRemoveFromWatchlist,
  trackAction,
  live,
}: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  // Crypto pairs display as their base asset (BTCUSD/BTC/USD -> BTC).
  const formatSymbolDisplay = (symbol: string): string => displaySymbol(symbol);

  // Re-render only when one of these symbols moved (max 4x/sec, focused only)
  const symbols = useMemo(() => watchlistData.map((stock: any) => stock.symbol), [watchlistData]);
  const tick = useQuoteTick(symbols, { intervalMs: 250, enabled: live });

  // Live watchlist - updates from price store with WebSocket real-time prices
  // Uses same model as explore page - tries both symbol formats and picks most recent
  const liveWatchlistData = useMemo(() => {
    return watchlistData.map(stock => {
      // For crypto, try both formats and use the most recent one
      // WebSocket stores as "BTC/USD", local data stores as "BTCUSD"
      let quote = priceStore.getQuote(stock.symbol);

      if (stock.symbol?.endsWith('USD') && !stock.symbol.includes('/') && stock.symbol.length <= 10) {
        // Try slash format for crypto: BTCUSD -> BTC/USD
        const slashSymbol = stock.symbol.slice(0, -3) + '/USD';
        const slashQuote = priceStore.getQuote(slashSymbol);

        // Use the more recent quote (WebSocket updates have later timestamps)
        if (slashQuote && slashQuote.price > 0) {
          if (!quote || (slashQuote.updatedAt > (quote.updatedAt || 0))) {
            quote = slashQuote;
          }
        }
      }

      if (quote && quote.price > 0) {
        // Always calculate from previousClose for accuracy
        // WebSocket day_change can use open price as reference, giving wrong values
        const previousClose = quote.previousClose || stock.previousClose;
        let newChange: number;
        let newChangePercent: number;

        if (previousClose && previousClose > 0) {
          newChange = quote.price - previousClose;
          newChangePercent = (newChange / previousClose) * 100;
        } else {
          newChange = quote.change ?? stock.change ?? 0;
          newChangePercent = quote.changePercent ?? stock.changePercent ?? 0;
        }
        
        // Update sparkline data with live price as the last point
        let updatedData = stock.data || [];
        if (updatedData.length > 0) {
          updatedData = [...updatedData];
          updatedData[updatedData.length - 1] = quote.price;
        }
        
        return {
          ...stock,
          price: quote.price,
          change: newChange,
          changePercent: newChangePercent,
          color: (newChangePercent || 0) >= 0 ? '#34C759' : '#FF3B30',
          data: updatedData,
        };
      }
      return stock;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistData, tick]);

  // Memoized filtered and sorted watchlist - uses live prices from WebSocket
  const filteredWatchlist = useMemo(() => {
    let filtered = [...liveWatchlistData];

    // Apply filter
    if (watchlistFilter === 'Gainers') {
      filtered = filtered.filter(stock => (stock.changePercent || 0) >= 0);
    } else if (watchlistFilter === 'Losers') {
      filtered = filtered.filter(stock => (stock.changePercent || 0) < 0);
    }

    // Apply sort
    switch (watchlistSort) {
      case 'Name':
        filtered.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
        break;
      case 'Price':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'Change %':
        filtered.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
        break;
      case 'Change $':
        filtered.sort((a, b) => (b.change || 0) - (a.change || 0));
        break;
      case 'My Sort':
      default:
        // Keep original order (order added)
        break;
    }

    return filtered;
  }, [liveWatchlistData, watchlistFilter, watchlistSort]);

  return (
    <View style={[styles.watchlistSection, { backgroundColor: isDark ? colors.card : '#F5F5F7' }]}>
      <View style={styles.watchlistHeader}>
        <View style={styles.watchlistHeaderLeft}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Watchlist')}</Text>
            <TouchableOpacity
              style={styles.addWatchlistButtonHeader}
              onPress={() => setWatchlistModal(true)}
              accessibilityRole="button"
              accessibilityLabel={t('Add to Watchlist')}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <LiveUpdated prefix="" style={{ marginTop: 2 }} />
        </View>
        <View style={styles.watchlistHeaderRight}>
          {/* Filter Dropdown */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={[styles.filterButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                setShowFilterDropdown(!showFilterDropdown);
                setShowSortDropdown(false);
              }}
            >
              <Text style={[styles.filterButtonText, { color: colors.text }]}>{t(watchlistFilter)}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            {showFilterDropdown && (
              <View style={styles.dropdownMenu}>
                {(['All', 'Gainers', 'Losers'] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownItem,
                      watchlistFilter === option && styles.dropdownItemActive
                    ]}
                    onPress={() => {
                      setWatchlistFilter(option);
                      setShowFilterDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      watchlistFilter === option && styles.dropdownItemTextActive
                    ]}>
                      {t(option)}
                    </Text>
                    {watchlistFilter === option && (
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Sort Dropdown */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={[styles.filterButton, { backgroundColor: colors.surface }]}
              onPress={() => {
                setShowSortDropdown(!showSortDropdown);
                setShowFilterDropdown(false);
              }}
            >
              <Text style={[styles.filterButtonText, { color: colors.text }]}>{t(watchlistSort)}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            {showSortDropdown && (
              <View style={[styles.dropdownMenu, styles.dropdownMenuRight]}>
                {(['My Sort', 'Name', 'Price', 'Change %', 'Change $'] as const).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.dropdownItem,
                      watchlistSort === option && styles.dropdownItemActive
                    ]}
                    onPress={() => {
                      setWatchlistSort(option);
                      setShowSortDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      watchlistSort === option && styles.dropdownItemTextActive
                    ]}>
                      {t(option)}
                    </Text>
                    {watchlistSort === option && (
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {watchlistDataLoading ? (
        <HomeWatchlistSkeleton isDark={isDark} />
      ) : liveWatchlistData.length === 0 ? (
        <View style={styles.emptyWatchlist}>
          <View style={styles.emptyWatchlistIconContainer}>
            <Ionicons name="star-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyWatchlistText, { color: colors.text }]}>{t('Your watchlist is empty')}</Text>
          <Text style={[styles.emptyWatchlistSubtext, { color: colors.textTertiary }]}>{t('Add stocks to track their performance')}</Text>
          <TouchableOpacity
            style={styles.addFirstButton}
            onPress={() => setWatchlistModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addFirstButtonText}>{t('Add Stock')}</Text>
          </TouchableOpacity>
        </View>
      ) : filteredWatchlist.length === 0 ? (
        <View style={styles.emptyWatchlist}>
          <Text style={[styles.emptyWatchlistText, { color: colors.text }]}>No {watchlistFilter.toLowerCase()} found</Text>
          <Text style={[styles.emptyWatchlistSubtext, { color: colors.textTertiary }]}>{t('Try changing your filter')}</Text>
        </View>
      ) : (
        <View style={styles.watchlistList}>
          {filteredWatchlist.map((stock, idx) => {
            // Real intraday data drawn in true proportion; a flat line
            // (not a fabricated wiggle) when no data is available yet
            const chartData = stock.data?.length > 1
              ? stock.data
              : [stock.price || 1, stock.price || 1];

            return (
            <FadeSlideIn key={stock.symbol} delay={Math.min(idx, 8) * 40} distance={8}>
            <Swipeable
              overshootRight={false}
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.watchlistDeleteAction}
                  onPress={() => handleRemoveFromWatchlist(stock.symbol)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.watchlistDeleteText}>{t('Remove')}</Text>
                </TouchableOpacity>
              )}
            >
            <ScalePress
              style={[styles.watchlistRow, { borderBottomColor: colors.borderLight, backgroundColor: isDark ? colors.card : '#F5F5F7' }]}
              activeScale={0.98}
              onPress={() => {
                trackAction(); // Track stock view for app review
                router.push(`/symbol/${encodeURIComponent(stock.symbol)}/chart`);
              }}
              onLongPress={() => handleRemoveFromWatchlist(stock.symbol)}
            >
              <View style={styles.watchlistRowLeft}>
                <StockLogo 
                  symbol={stock.symbol} 
                  size={Platform.OS === 'android' ? 26 : 34} 
                  style={styles.watchlistLogo}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.watchlistRowSymbol, { color: colors.text }]} numberOfLines={1}>{formatSymbolDisplay(stock.symbol)}</Text>
                </View>
              </View>
              
              <View style={styles.watchlistRowCenter}>
                <Sparkline
                  data={chartData}
                  color={stock.color}
                  width={Platform.OS === 'android' ? 55 : 85}
                  height={Platform.OS === 'android' ? 28 : 36}
                  strokeWidth={1.5}
                  fillOpacity={0.2}
                />
              </View>
              
              <View style={styles.watchlistRowRight}>
                <AnimatedPrice
                  value={stock.price}
                  style={{ ...styles.watchlistRowPrice, color: colors.text }}
                  flashOnChange={true}
                  decimals={2}
                />
                <View style={styles.watchlistRowChangeContainer}>
                  <Ionicons
                    name={(stock.changePercent || 0) >= 0 ? 'arrow-up' : 'arrow-down'} 
                    size={12} 
                    color={stock.color} 
                  />
                  <Text style={[styles.watchlistRowChange, { color: stock.color }]}>
                    ${Math.abs(stock.change || 0).toFixed(2)} ({Math.abs(stock.changePercent || 0).toFixed(2)}%)
                  </Text>
                </View>
              </View>
            </ScalePress>
            </Swipeable>
            </FadeSlideIn>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default React.memo(WatchlistSection);
