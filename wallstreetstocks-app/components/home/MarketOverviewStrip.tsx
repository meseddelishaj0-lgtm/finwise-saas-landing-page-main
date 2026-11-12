// components/home/MarketOverviewStrip.tsx
// Home tab: the horizontal "Market Overview" strip.
// It refreshes itself from the price store, so a price tick re-renders this
// strip only instead of the whole Home tab. Markup and maths are unchanged
// from index.tsx.
import React, { useMemo } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { priceStore } from '@/stores/priceStore';
import { useQuoteTick } from '@/hooks/useQuoteTick';
import { AnimatedPrice, AnimatedChange, LiveUpdated, CryptoLiveIndicator } from '@/components/AnimatedPrice';
import StockLogo from '@/components/StockLogo';
import FadeSlideIn from '@/components/FadeSlideIn';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { styles } from './homeStyles';
import { ScalePress, HomeIndicesSkeleton, MarketIndex } from './shared';

interface Props {
  majorIndices: MarketIndex[];
  indicesLoading: boolean;
  /** False while the Home tab is not on display: pauses live updates. */
  live: boolean;
}

function MarketOverviewStrip({ majorIndices, indicesLoading, live }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  // Re-render only when one of these symbols moved (max 4x/sec, focused only)
  const symbols = useMemo(() => majorIndices.map(index => index.symbol), [majorIndices]);
  const tick = useQuoteTick(symbols, { intervalMs: 250, enabled: live });

  // Live market overview - updates every 2s from price store for real-time display
  // Includes both indices and crypto for 24/7 live updates
  // Uses same model as explore page - tries both symbol formats and picks most recent
  const liveMarketIndices = useMemo(() => {
    const nameMap: { [key: string]: string } = {
      'BTC/USD': 'Bitcoin', 'ETH/USD': 'Ethereum', 'SOL/USD': 'Solana',
      'SPY': 'S&P 500', 'QQQ': 'Nasdaq 100',
      'BNB/USD': 'Binance Coin', 'XRP/USD': 'Ripple', 'ADA/USD': 'Cardano',
      'DOGE/USD': 'Dogecoin', 'AVAX/USD': 'Avalanche', 'DOT/USD': 'Polkadot',
      'MATIC/USD': 'Polygon', 'LINK/USD': 'Chainlink', 'LTC/USD': 'Litecoin',
    };

    return majorIndices.map(index => {
      let quote = priceStore.getQuote(index.symbol);

      // For crypto, try both formats and use the most recent one
      // WebSocket may store as "BTC/USD" or "BTCUSD"
      if (index.symbol?.includes('/')) {
        // Symbol has slash (BTC/USD) - also try without slash (BTCUSD)
        const noSlashSymbol = index.symbol.replace('/', '');
        const noSlashQuote = priceStore.getQuote(noSlashSymbol);
        if (noSlashQuote && noSlashQuote.price > 0) {
          if (!quote || (noSlashQuote.updatedAt > (quote.updatedAt || 0))) {
            quote = noSlashQuote;
          }
        }
      } else if (index.symbol?.endsWith('USD') && index.symbol.length <= 10) {
        // Symbol has no slash (BTCUSD) - also try with slash (BTC/USD)
        const slashSymbol = index.symbol.slice(0, -3) + '/USD';
        const slashQuote = priceStore.getQuote(slashSymbol);
        if (slashQuote && slashQuote.price > 0) {
          if (!quote || (slashQuote.updatedAt > (quote.updatedAt || 0))) {
            quote = slashQuote;
          }
        }
      }

      if (quote && quote.price > 0) {
        // Always calculate from previousClose for accuracy
        const previousClose = quote.previousClose;
        let change: number;
        let changePercent: number;

        if (previousClose && previousClose > 0) {
          change = quote.price - previousClose;
          changePercent = (change / previousClose) * 100;
        } else {
          change = quote.change || 0;
          changePercent = quote.changePercent || 0;
        }

        return {
          ...index,
          name: nameMap[index.symbol] || index.symbol,
          price: quote.price,
          change,
          changePercent,
          color: changePercent >= 0 ? '#34C759' : '#FF3B30',
        };
      }
      return index;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [majorIndices, tick]);

  return (
    <View style={styles.indicesSection}>
      <FadeSlideIn distance={10}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Market Overview')}</Text>
            <CryptoLiveIndicator />
          </View>
          <LiveUpdated prefix="" style={{ marginTop: 4 }} />
        </View>
      </FadeSlideIn>

      {indicesLoading ? (
        <HomeIndicesSkeleton isDark={isDark} cardColor={isDark ? colors.card : '#F5F5F7'} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.indicesScrollContent}
        >
          {liveMarketIndices.filter((index) => index.price > 0).map((index) => (
            <ScalePress
              key={index.symbol}
              style={[styles.indexCard, { backgroundColor: isDark ? colors.card : '#F5F5F7' }]}
              activeScale={0.94}
              onPress={() => router.push(`/symbol/${encodeURIComponent(index.symbol)}/chart`)}
            >
              <View style={styles.indexCardHeader}>
                <StockLogo
                  symbol={index.symbol}
                  size={Platform.OS === 'android' ? 20 : 24}
                  style={{ marginRight: Platform.OS === 'android' ? 5 : 6 }}
                />
                <Text style={[styles.indexSymbol, { color: colors.text }]}>{index.symbol.replace('/USD', '')}</Text>
              </View>
              <Text style={[styles.indexName, { color: colors.textTertiary }]} numberOfLines={1}>{index.name}</Text>
              <AnimatedPrice
                value={index.price}
                prefix="$"
                decimals={index.price >= 1000 ? 0 : index.price >= 100 ? 1 : 2}
                style={{ ...styles.indexPrice, color: colors.text }}
                flashOnChange={true}
              />
              <View style={[styles.indexChangePill, { backgroundColor: index.color + '15' }]}>
                <Ionicons
                  name={index.changePercent >= 0 ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={index.color}
                />
                <AnimatedChange
                  value={index.changePercent}
                  style={{ ...styles.indexChange, color: index.color }}
                  showArrow={false}
                  flashOnChange={true}
                />
              </View>
            </ScalePress>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default React.memo(MarketOverviewStrip);
