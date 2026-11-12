// components/home/PortfolioSection.tsx
// Home tab: the portfolio hero card (selector, value, chart, holdings and
// the analytics preview).
// It refreshes itself from the price store, so a price tick re-renders this
// card only instead of the whole Home tab. Markup and maths are unchanged
// from index.tsx.
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart as GiftedLineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuoteTick } from '@/hooks/useQuoteTick';
import { displaySymbol } from '@/lib/symbolDisplay';
import { LiveUpdated } from '@/components/AnimatedPrice';
import StockLogo from '@/components/StockLogo';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { styles } from './homeStyles';
import { ChartPoint, computeLivePortfolio, interpolateData } from './shared';

interface Props {
  /** Portfolio picked in the selector (name shown in the dropdown). */
  currentPortfolio: any;
  /** Same portfolio as the context exposes it, with totals and holdings. */
  contextCurrentPortfolio: any;
  userPortfolios: any[];
  selectedPortfolioId: any;
  setSelectedPortfolioId: (id: any) => void;
  showPortfolioDropdown: boolean;
  setShowPortfolioDropdown: (value: boolean) => void;
  setShowCreatePortfolioModal: (value: boolean) => void;
  setEditingPortfolioName: (value: string) => void;
  setShowPortfolioOptionsModal: (value: boolean) => void;
  setAddStockModal: (value: boolean) => void;
  chartData: ChartPoint[];
  portfolioChartBleedWidth: number;
  portfolioTimeRange: string;
  setPortfolioTimeRange: (range: string) => void;
  handleHoldingPress: (holding: any) => void;
  /** False while the Home tab is not on display: pauses live updates. */
  live: boolean;
}

function PortfolioSection({
  currentPortfolio,
  contextCurrentPortfolio,
  userPortfolios,
  selectedPortfolioId,
  setSelectedPortfolioId,
  showPortfolioDropdown,
  setShowPortfolioDropdown,
  setShowCreatePortfolioModal,
  setEditingPortfolioName,
  setShowPortfolioOptionsModal,
  setAddStockModal,
  chartData,
  portfolioChartBleedWidth,
  portfolioTimeRange,
  setPortfolioTimeRange,
  handleHoldingPress,
  live,
}: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  // Crypto pairs display as their base asset (BTCUSD/BTC/USD -> BTC).
  const formatSymbolDisplay = (symbol: string): string => displaySymbol(symbol);

  // Re-render only when one of the holdings moved (max 4x/sec, focused only)
  const symbols = useMemo(
    () => (contextCurrentPortfolio?.holdings ?? []).map((holding: any) => holding.symbol),
    [contextCurrentPortfolio?.holdings]
  );
  const tick = useQuoteTick(symbols, { intervalMs: 250, enabled: live });

  // Live portfolio data - updates from price store with WebSocket real-time prices
  const livePortfolioData = useMemo(
    () => computeLivePortfolio(contextCurrentPortfolio?.holdings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contextCurrentPortfolio?.holdings, tick]
  );

  // Live portfolio chart data - appends current live portfolio value to historical chart
  // This makes the chart follow real-time price changes
  const livePortfolioChartData = useMemo(() => {
    if (!chartData || chartData.length < 2) return chartData;
    
    const currentLiveValue = livePortfolioData?.totalValue;
    if (!currentLiveValue || currentLiveValue <= 0) return chartData;
    
    // Create a copy of the chart data
    const result = [...chartData];
    const lastPoint = result[result.length - 1];
    
    // Update the last point with the current live portfolio value
    // This ensures the chart endpoint matches the displayed total value
    result[result.length - 1] = {
      ...lastPoint,
      value: currentLiveValue,
    };
    
    return result;
    // NOTE: deliberately NOT keyed on the price tick — recomputing (and
    // re-rendering the chart) on every tick made range switching laggy.
    // totalValue only changes identity when the number actually moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, livePortfolioData?.totalValue]);

  // Smooth once per data change, not on every render
  const smoothedPortfolioChartData = useMemo(
    () => (livePortfolioChartData && livePortfolioChartData.length > 1
      ? interpolateData(livePortfolioChartData, 80)
      : []),
    [livePortfolioChartData]
  );

  return (
    <View style={[styles.portfolioSection, { backgroundColor: isDark ? colors.card : '#F5F5F7' }]}>
      <LinearGradient
        colors={isDark
          ? ['rgba(255,214,10,0.10)', 'rgba(255,214,10,0)']
          : ['rgba(184,134,11,0.08)', 'rgba(184,134,11,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.9 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
        pointerEvents="none"
      />
      <View style={styles.portfolioTopRow}>
        <View style={styles.portfolioSelectorContainer}>
          <TouchableOpacity
            style={[styles.portfolioDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowPortfolioDropdown(!showPortfolioDropdown)}
          >
            <Text style={styles.portfolioDropdownText} numberOfLines={1}>
              {currentPortfolio?.name || t('Select Portfolio')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>
          <LiveUpdated prefix="" style={{ marginTop: 4 }} />

          {/* Portfolio Dropdown Menu */}
          {showPortfolioDropdown && (
            <View style={[styles.portfolioDropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {userPortfolios.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.portfolioDropdownItem,
                    p.id === selectedPortfolioId && styles.portfolioDropdownItemActive
                  ]}
                  onPress={() => {
                    setSelectedPortfolioId(p.id);
                    setShowPortfolioDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.portfolioDropdownItemText,
                    p.id === selectedPortfolioId && styles.portfolioDropdownItemTextActive
                  ]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {p.id === selectedPortfolioId && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              <View style={[styles.portfolioDropdownDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={styles.portfolioDropdownItem}
                onPress={() => {
                  setShowPortfolioDropdown(false);
                  setShowCreatePortfolioModal(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.portfolioDropdownAddText}>{t('Create New Portfolio')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.portfolioActions}>
          <TouchableOpacity
            style={[styles.portfolioOptionsButton, { backgroundColor: colors.surface }]}
            onPress={() => {
              setEditingPortfolioName(currentPortfolio?.name || '');
              setShowPortfolioOptionsModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('More options')}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addIconButton}
            onPress={() => setAddStockModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Add Stock')}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.portfolioValueSection}>
        <Text style={[styles.portfolioValue, { color: colors.text }]}>
          ${(livePortfolioData?.totalValue || contextCurrentPortfolio?.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        {(() => {
          const gain = livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0;
          const gainPct = livePortfolioData?.totalGainPercent ?? contextCurrentPortfolio?.totalGainPercent ?? 0;
          const up = gain >= 0;
          const tone = up ? '#00C853' : '#FF3B30';
          return (
            <View style={[styles.portfolioChangePill, { backgroundColor: up ? 'rgba(0,200,83,0.12)' : 'rgba(255,59,48,0.12)' }]}>
              <Ionicons name={up ? 'trending-up' : 'trending-down'} size={16} color={tone} />
              <Text style={[styles.portfolioChange, { color: tone }]}>
                {up ? '+' : ''}${Math.abs(gain).toFixed(2)} ({up ? '+' : ''}{gainPct.toFixed(2)}%)
              </Text>
            </View>
          );
        })()}
      </View>

      {/* Portfolio Chart */}
      {smoothedPortfolioChartData.length > 1 && (() => {
        const smoothedChartData = smoothedPortfolioChartData;
        const chartSpacing = Math.max(2, portfolioChartBleedWidth / smoothedChartData.length);

        return (
        <View style={styles.portfolioChartContainer}>
          <View style={styles.portfolioChartBleed}>
          <GiftedLineChart
            areaChart
            data={smoothedChartData}
            height={220}
            width={portfolioChartBleedWidth}
            curved
            curvature={0.2}
            curveType={1}
            startFillColor={(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444'}
            startOpacity={isDark ? 0.35 : 0.25}
            endFillColor={(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B98100' : '#EF444400'}
            endOpacity={0}
            color={(livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444'}
            thickness={2.5}
            hideDataPoints
            hideAxesAndRules
            hideYAxisText
            yAxisLabelWidth={0}
            xAxisLabelsHeight={0}
            yAxisLabelPrefix="$"
            backgroundColor="transparent"
            spacing={chartSpacing}
            initialSpacing={0}
            endSpacing={0}
            adjustToWidth
            disableScroll
            pointerConfig={{
              pointerStripHeight: 220,
              pointerStripColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(142, 142, 147, 0.3)',
              pointerStripWidth: 1,
              strokeDashArray: [4, 4],
              pointerColor: (livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444',
              radius: 5,
              pointerLabelWidth: 120,
              pointerLabelHeight: 50,
              activatePointersOnLongPress: false,
              autoAdjustPointerLabelPosition: true,
              pointerLabelComponent: (items: any) => {
                if (!items?.[0]) return null;
                const value = items[0].value;
                return (
                  <View style={[styles.portfolioTooltip, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#E5E5EA' }]}>
                    <Text style={[styles.portfolioTooltipValue, { color: colors.text }]}>
                      ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                );
              },
            }}
            animateOnDataChange={false}
          />
          </View>

          {/* Time Range Selector */}
          <View style={[styles.timeRangeSelectorContainer, { marginTop: 16 }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeRangeScrollContent}
            >
              {['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'ALL'].map((range) => {
                const isActive = portfolioTimeRange === range;
                const gainColor = (livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0) >= 0 ? '#10B981' : '#EF4444';
                return (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.timeRangeButton,
                    isActive && { backgroundColor: isDark ? `${gainColor}22` : `${gainColor}18` }
                  ]}
                  onPress={() => setPortfolioTimeRange(range)}
                >
                  <Text style={[
                    styles.timeRangeText,
                    { color: isDark ? '#8E8E93' : '#666' },
                    isActive && { color: gainColor, fontWeight: '800' }
                  ]}>
                    {range}
                  </Text>
                </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.expandButton}>
              <Ionicons name="expand-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
        );
      })()}

      {/* Holdings List */}
      {(livePortfolioData?.holdings || contextCurrentPortfolio?.holdings || []).length > 0 && (
        <View style={[styles.holdingsList, { borderTopColor: colors.borderLight }]}>
          <View style={styles.holdingsTitleRow}>
            <Text style={[styles.holdingsTitle, { color: '#B8860B' }]}>{t('Holdings')}</Text>
            <TouchableOpacity
              style={styles.addHoldingButton}
              onPress={() => setAddStockModal(true)}
              accessibilityRole="button"
              accessibilityLabel={t('Add Stock')}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {(livePortfolioData?.holdings || contextCurrentPortfolio?.holdings || []).map((holding: any, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={[styles.holdingRow, { borderBottomColor: colors.borderLight }]}
              onPress={() => handleHoldingPress(holding)}
            >
              <View style={styles.holdingLeft}>
                <StockLogo 
                  symbol={holding.symbol} 
                  size={Platform.OS === 'android' ? 32 : 40} 
                  style={styles.holdingLogo}
                />
                <View>
                  <Text style={[styles.holdingSymbol, { color: colors.text }]}>{formatSymbolDisplay(holding.symbol)}</Text>
                  <Text style={[styles.holdingShares, { color: colors.textTertiary }]}>
                    {holding.shares} shares • ${(holding.avgCost || 0).toFixed(2)} avg
                  </Text>
                </View>
              </View>
              <View style={styles.holdingRight}>
                <Text style={[styles.holdingValue, { color: colors.text }]}>
                  ${(holding.currentValue || 0).toFixed(2)}
                </Text>
                <Text style={[styles.holdingGain, { color: (holding.gain || 0) >= 0 ? "#34C759" : "#FF3B30" }]}>
                  {(holding.gain || 0) >= 0 ? '+' : ''}${Math.abs(holding.gain || 0).toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(!contextCurrentPortfolio || contextCurrentPortfolio.holdings.length === 0) && (
        <View style={styles.emptyPortfolio}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="pie-chart-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.text }]}>{t('Start Building Your Portfolio')}</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{t('Tap the + button to add your first stock')}</Text>
        </View>
      )}

      {/* Portfolio Analytics Card */}
      {(livePortfolioData?.holdings || contextCurrentPortfolio?.holdings || []).length > 0 && (() => {
        // Use live data with fallback to context values
        const holdings = livePortfolioData?.holdings || contextCurrentPortfolio?.holdings || [];
        const totalValue = livePortfolioData?.totalValue || contextCurrentPortfolio?.totalValue || 0;
        const totalGain = livePortfolioData?.totalGain ?? contextCurrentPortfolio?.totalGain ?? 0;
        const totalGainPercent = livePortfolioData?.totalGainPercent ?? contextCurrentPortfolio?.totalGainPercent ?? 0;
        const holdingWeights = holdings.map((h: any) => h.currentValue / (totalValue || 1));
        const herfindahlIndex = holdingWeights.reduce((sum: number, w: number) => sum + (w * w), 0);
        const diversificationScore = Math.round((1 - herfindahlIndex) * 100);

        return (
          <TouchableOpacity
            style={[styles.analyticsPreviewCard, { backgroundColor: isDark ? colors.card : '#F5F5F7', borderWidth: isDark ? 1 : 0, borderColor: isDark ? '#333' : 'transparent' }]}
            onPress={() => router.push('/portfolio/analytics')}
            activeOpacity={0.7}
          >
            <View style={styles.analyticsPreviewHeader}>
              <View style={styles.analyticsPreviewIconContainer}>
                <Ionicons name="analytics" size={24} color={colors.primary} />
              </View>
              <View style={styles.analyticsPreviewTitleContainer}>
                <Text style={[styles.analyticsPreviewTitle, { color: colors.text }]}>{t('Portfolio Analytics')}</Text>
                <Text style={[styles.analyticsPreviewSubtitle, { color: colors.textTertiary }]}>{t('View detailed insights')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </View>
            <View style={[styles.analyticsPreviewStats, { backgroundColor: isDark ? colors.surface : '#EDEDF0' }]}>
              <View style={styles.analyticsPreviewStat}>
                <Text style={[styles.analyticsPreviewStatLabel, { color: colors.textTertiary }]}>{t('Total P&L')}</Text>
                <Text style={[styles.analyticsPreviewStatValue, { color: totalGain >= 0 ? '#34C759' : '#FF3B30' }]}>
                  {totalGain >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.analyticsPreviewDivider} />
              <View style={styles.analyticsPreviewStat}>
                <Text style={[styles.analyticsPreviewStatLabel, { color: colors.textTertiary }]}>{t('Diversification')}</Text>
                <Text style={[styles.analyticsPreviewStatValue, {
                  color: diversificationScore >= 70 ? '#34C759' : diversificationScore >= 40 ? '#FF9500' : '#FF3B30'
                }]}>
                  {diversificationScore}/100
                </Text>
              </View>
              <View style={styles.analyticsPreviewDivider} />
              <View style={styles.analyticsPreviewStat}>
                <Text style={[styles.analyticsPreviewStatLabel, { color: colors.textTertiary }]}>{t('Holdings')}</Text>
                <Text style={styles.analyticsPreviewStatValue}>{holdings.length}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })()}
    </View>
  );
}

export default React.memo(PortfolioSection);
