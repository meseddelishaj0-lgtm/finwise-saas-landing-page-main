// components/home/PicksCarousel.tsx
// Home tab: the Stock Picks / Momentum / Growth carousel.
// It refreshes itself from the price store, so a price tick re-renders this
// carousel only instead of the whole Home tab. Markup and maths are
// unchanged from index.tsx.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { priceStore } from '@/stores/priceStore';
import { useQuoteTick } from '@/hooks/useQuoteTick';
import { marketDataService, ALL_STOCKS } from '@/services/marketDataService';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { styles } from './homeStyles';
import { ScalePress, STOCK_PICKS_PREVIEW, GROWTH_STOCKS_PREVIEW } from './shared';

interface Props {
  stockPicksData: any[];
  serverMomentum: any[];
  serverGrowth: any[];
  isPremium: boolean;
  currentTier: any;
  pickCardWidth: number;
  pickCardSnap: number;
  /** False while the Home tab is not on display: pauses live updates. */
  live: boolean;
}

function PicksCarousel({
  stockPicksData,
  serverMomentum,
  serverGrowth,
  isPremium,
  currentTier,
  pickCardWidth,
  pickCardSnap,
  live,
}: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [picksPage, setPicksPage] = useState(0);

  // Re-render only when one of these symbols moved (max 4x/sec, focused only)
  const symbols = useMemo(() => {
    const out: string[] = stockPicksData.map((pick: any) => pick.symbol);
    if (serverMomentum.length > 0) {
      out.push(...serverMomentum.map((pick: any) => pick.symbol));
    } else {
      // The fallback momentum card ranks today's movers across the core list
      out.push(...ALL_STOCKS);
    }
    (serverGrowth.length > 0 ? serverGrowth : GROWTH_STOCKS_PREVIEW).forEach((pick: any) => out.push(pick.symbol));
    return out;
  }, [stockPicksData, serverMomentum, serverGrowth]);
  const tick = useQuoteTick(symbols, { intervalMs: 250, enabled: live });

  // Live stock picks - updates every 3 seconds from price store
  const liveStockPicks = useMemo(() => {
    return stockPicksData.map(pick => {
      const quote = priceStore.getQuote(pick.symbol);
      if (quote && quote.price > 0) {
        // Always calculate from previousClose for accuracy
        const previousClose = quote.previousClose;
        let change: number;
        let changePercent: number;

        if (previousClose && previousClose > 0) {
          change = quote.price - previousClose;
          changePercent = (change / previousClose) * 100;
        } else {
          change = quote.change ?? pick.change ?? 0;
          changePercent = quote.changePercent ?? pick.changePercent ?? 0;
        }

        return {
          ...pick,
          price: quote.price,
          change,
          changePercent,
        };
      }
      return pick;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockPicksData, tick]);

  // Momentum card: the manually curated server list (live-price overlaid);
  // falls back to today's top 3 movers if the server list isn't loaded
  const liveMomentumStocks = useMemo(() => {
    if (serverMomentum.length > 0) {
      return serverMomentum.map(p => {
        const q = priceStore.getQuote(p.symbol);
        return {
          ...p,
          price: q?.price || p.price,
          changePercent: q?.changePercent ?? p.changePercent,
        };
      });
    }
    const merged = marketDataService.getLiveData('stock')
      .map(item => {
        const q = priceStore.getQuote(item.symbol);
        return {
          symbol: item.symbol,
          category: item.name || item.symbol,
          price: q?.price || item.price,
          changePercent: q?.changePercent ?? item.changePercent ?? 0,
        };
      })
      .filter(s => s.price > 0);
    merged.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    return merged.slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, serverMomentum]);

  // Growth card: the manually curated server list (live-price overlaid);
  // falls back to the hardcoded teaser names
  const liveGrowthStocks = useMemo(() => {
    if (serverGrowth.length > 0) {
      return serverGrowth.map(p => {
        const q = priceStore.getQuote(p.symbol);
        return {
          ...p,
          price: q?.price || p.price,
          changePercent: q?.changePercent ?? p.changePercent,
        };
      });
    }
    return GROWTH_STOCKS_PREVIEW.map(p => {
      const q = priceStore.getQuote(p.symbol);
      return { ...p, price: q?.price || 0, changePercent: q?.changePercent || 0 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, serverGrowth]);

  return (
    <View style={styles.stockPicksSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToOffsets={[0, pickCardSnap, pickCardSnap * 2]}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={(e) =>
          setPicksPage(Math.min(2, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / pickCardSnap))))
        }
        style={styles.picksCarousel}
        contentContainerStyle={styles.picksCarouselContent}
      >
      <ScalePress
        style={[styles.stockPicksCard, { width: pickCardWidth, marginRight: 12, backgroundColor: isDark ? colors.surface : '#F5F5F7', borderColor: isDark ? colors.border : '#FFD70030', shadowOpacity: isDark ? 0 : 0.08, elevation: isDark ? 0 : 3 }]}
        activeScale={0.98}
        onPress={() => router.push('/premium/stock-picks')}
      >
        {/* Header */}
        <View style={styles.stockPicksHeader}>
          <View style={styles.stockPicksHeaderLeft}>
            <View style={[styles.stockPicksIconBg, { backgroundColor: isDark ? "rgba(255,215,0,0.15)" : "#FFF8E1" }]}>
              <Ionicons name="trophy" size={20} color="#FFD700" />
            </View>
            <View>
              <Text style={[styles.stockPicksTitle, { color: colors.text }]}>{t('Stock Picks')}</Text>
              <Text style={[styles.stockPicksSubtitle, { color: colors.textTertiary }]}>
                {isPremium
                  ? `${currentTier === 'gold' ? '5' : currentTier === 'platinum' ? '8' : '15'} expert picks`
                  : t('Expert curated selections')}
              </Text>
            </View>
          </View>
          <View style={styles.stockPicksBadge}>
            {isPremium ? (
              <View style={[styles.tierBadge, {
                backgroundColor: currentTier === 'diamond' ? '#B9F2FF' : currentTier === 'platinum' ? '#E5E4E2' : '#FFD700'
              }]}>
                <Ionicons name={currentTier === 'gold' ? 'star' : 'diamond'} size={12} color="#000" />
                <Text style={styles.tierBadgeText}>
                  {currentTier?.charAt(0).toUpperCase()}{currentTier?.slice(1)}
                </Text>
              </View>
            ) : (
              <View style={styles.premiumBadge}>
                <Ionicons name="lock-closed" size={12} color="#FFD700" />
                <Text style={styles.premiumBadgeText}>{t('Premium')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Preview Cards */}
        <View style={styles.stockPicksPreview}>
          {(liveStockPicks.length > 0 ? liveStockPicks : STOCK_PICKS_PREVIEW).map((pick, idx) => (
            <View key={idx} style={[styles.pickPreviewCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EDEDF0' }]}>
              <View style={styles.pickPreviewLeft}>
                <View style={[styles.pickRankBadge, {
                  backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32'
                }]}>
                  <Text style={styles.pickRankText}>#{idx + 1}</Text>
                </View>
                <View>
                  {isPremium ? (
                    <>
                      <Text style={[styles.pickSymbol, { color: colors.text }]}>{pick.symbol}</Text>
                      <Text style={[styles.pickCategory, { color: colors.textSecondary }]}>{t(pick.category)}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.pickSymbol, { color: colors.textTertiary, letterSpacing: 2 }]}>•••••</Text>
                      <Text style={[styles.pickCategory, { color: colors.textTertiary }]}>{t('Unlock to reveal')}</Text>
                    </>
                  )}
                </View>
              </View>
              <View style={styles.pickPreviewRight}>
                {isPremium && liveStockPicks.length > 0 ? (
                  <>
                    <Text style={[styles.pickPrice, { color: colors.text }]}>${pick.price?.toFixed(2)}</Text>
                    <View style={[styles.pickChangeContainer, {
                      backgroundColor: (pick.changePercent || 0) >= 0 ? '#34C75915' : '#FF3B3015'
                    }]}>
                      <Ionicons
                        name={(pick.changePercent || 0) >= 0 ? 'arrow-up' : 'arrow-down'}
                        size={10}
                        color={(pick.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30'}
                      />
                      <Text style={[styles.pickChange, {
                        color: (pick.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30'
                      }]}>
                        {Math.abs(pick.changePercent || 0).toFixed(2)}%
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.pickLockedOverlay}>
                    <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={[styles.stockPicksCTA, { borderTopColor: isDark ? colors.border : "#F2F2F7" }]}>
          <Text style={[styles.stockPicksCTAText, { color: colors.primary }]}>
            {isPremium ? t('View All Picks') : t('Unlock Stock Picks')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </ScalePress>

      {/* Momentum + Growth cards (same layout; ungated for now) */}
      {([
        {
          key: 'momentum',
          title: 'Momentum Stocks',
          subtitle: "Today's strongest movers",
          icon: 'flash' as const,
          iconColor: '#FF9500',
          iconBg: isDark ? 'rgba(255,149,0,0.15)' : '#FFF3E0',
          badgeLabel: 'Live',
          badgeColor: '#00C853',
          data: liveMomentumStocks,
          cta: 'View All Momentum',
          route: '/premium/stock-picks?list=momentum',
        },
        {
          key: 'growth',
          title: 'Growth Stocks',
          subtitle: 'High-growth compounders',
          icon: 'rocket' as const,
          iconColor: '#00C853',
          iconBg: isDark ? 'rgba(0,200,83,0.15)' : '#E8F5E9',
          badgeLabel: 'Curated',
          badgeColor: isDark ? '#FFD60A' : '#B8860B',
          data: liveGrowthStocks,
          cta: 'View All Growth',
          route: '/premium/stock-picks?list=growth',
        },
      ]).map((card, cardIdx) => (
        <ScalePress
          key={card.key}
          style={[styles.stockPicksCard, {
            width: pickCardWidth,
            marginRight: cardIdx === 0 ? 12 : 0,
            backgroundColor: isDark ? colors.surface : '#F5F5F7',
            borderColor: isDark ? colors.border : '#FFD70030',
            shadowOpacity: isDark ? 0 : 0.08,
            elevation: isDark ? 0 : 3,
          }]}
          activeScale={0.98}
          onPress={() => router.push((isPremium ? card.route : '/(modals)/paywall') as any)}
        >
          {/* Header */}
          <View style={styles.stockPicksHeader}>
            <View style={styles.stockPicksHeaderLeft}>
              <View style={[styles.stockPicksIconBg, { backgroundColor: card.iconBg }]}>
                <Ionicons name={card.icon} size={20} color={card.iconColor} />
              </View>
              <View>
                <Text style={[styles.stockPicksTitle, { color: colors.text }]}>{t(card.title)}</Text>
                <Text style={[styles.stockPicksSubtitle, { color: colors.textTertiary }]}>{t(card.subtitle)}</Text>
              </View>
            </View>
            {isPremium ? (
              <View style={[styles.picksLiveBadge, { backgroundColor: `${card.badgeColor}1A` }]}>
                {card.key === 'momentum' && <View style={[styles.picksLiveDot, { backgroundColor: card.badgeColor }]} />}
                <Text style={[styles.picksLiveBadgeText, { color: card.badgeColor }]}>{t(card.badgeLabel)}</Text>
              </View>
            ) : (
              <View style={styles.premiumBadge}>
                <Ionicons name="lock-closed" size={12} color="#FFD700" />
                <Text style={styles.premiumBadgeText}>{t('Premium')}</Text>
              </View>
            )}
          </View>

          {/* Preview Rows */}
          <View style={styles.stockPicksPreview}>
            {card.data.map((pick, idx) => (
              <View key={`${card.key}-${pick.symbol}-${idx}`} style={[styles.pickPreviewCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EDEDF0' }]}>
                <View style={[styles.pickPreviewLeft, { flex: 1, marginRight: 8 }]}>
                  <View style={[styles.pickRankBadge, {
                    backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32'
                  }]}>
                    <Text style={styles.pickRankText}>#{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {isPremium ? (
                      <>
                        <Text style={[styles.pickSymbol, { color: colors.text }]}>{pick.symbol}</Text>
                        <Text style={[styles.pickCategory, { color: colors.textSecondary }]} numberOfLines={1}>
                          {t(pick.category)}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.pickSymbol, { color: colors.textTertiary, letterSpacing: 2 }]}>•••••</Text>
                        <Text style={[styles.pickCategory, { color: colors.textTertiary }]}>{t('Unlock to reveal')}</Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={[styles.pickPreviewRight, { flexShrink: 0 }]}>
                  {isPremium ? (
                    <>
                      <Text style={[styles.pickPrice, { color: colors.text }]}>
                        ${(pick.price || 0).toFixed(2)}
                      </Text>
                      <View style={[styles.pickChangeContainer, {
                        backgroundColor: (pick.changePercent || 0) >= 0 ? '#34C75915' : '#FF3B3015'
                      }]}>
                        <Ionicons
                          name={(pick.changePercent || 0) >= 0 ? 'arrow-up' : 'arrow-down'}
                          size={10}
                          color={(pick.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30'}
                        />
                        <Text style={[styles.pickChange, {
                          color: (pick.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30'
                        }]}>
                          {Math.abs(pick.changePercent || 0).toFixed(2)}%
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.pickLockedOverlay}>
                      <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={[styles.stockPicksCTA, { borderTopColor: isDark ? colors.border : "#F2F2F7" }]}>
            <Text style={[styles.stockPicksCTAText, { color: colors.primary }]}>
              {isPremium ? t(card.cta) : `Unlock ${card.title}`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </ScalePress>
      ))}
      </ScrollView>

      {/* Page dots */}
      <View style={styles.picksPageDots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.picksPageDot,
              { backgroundColor: picksPage === i ? colors.primary : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)') },
              picksPage === i && styles.picksPageDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default React.memo(PicksCarousel);
