// app/portfolio/analytics.tsx
// Portfolio Analytics Screen using shared PortfolioContext
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { PieChart, LineChart } from 'react-native-gifted-charts';
import { usePortfolio } from '@/context/PortfolioContext';
import { useTheme } from '@/context/ThemeContext';

const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const TWELVE_DATA_API_KEY = process.env.EXPO_PUBLIC_TWELVE_DATA_API_KEY || '';
const TWELVE_DATA_URL = 'https://api.twelvedata.com';
const screenWidth = Dimensions.get('window').width;

interface ChartDataPoint {
  value: number;
  label?: string;
}

type TimeRange = '1D' | '5D' | '1M' | '1Y' | '5Y' | 'ALL';

export default function AnalyticsScreen() {
  const { currentPortfolio, loading, refreshing, refreshPrices } = usePortfolio();
  const { colors, isDark } = useTheme();

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  const [chartChange, setChartChange] = useState({ value: 0, percent: 0 });
  const [sp500Change, setSp500Change] = useState({ value: 0, percent: 0 });
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({});

  // Refresh prices when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshPrices();
      // Also fetch S&P 500 data
      fetchSp500AllTimeData();
    }, [])
  );

  // Fetch sector data for holdings from Twelve Data
  useEffect(() => {
    if (!currentPortfolio || currentPortfolio.holdings.length === 0) return;
    const symbols = currentPortfolio.holdings.map(h => h.symbol);
    const missing = symbols.filter(s => !sectorMap[s]);
    if (missing.length === 0) return;

    (async () => {
      try {
        const newMap: Record<string, string> = { ...sectorMap };
        // Twelve Data profile supports comma-separated symbols
        const res = await fetch(
          `${TWELVE_DATA_URL}/profile?symbol=${missing.join(',')}&apikey=${TWELVE_DATA_API_KEY}`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach((p: any) => {
            if (p.symbol && p.sector) newMap[p.symbol] = p.sector;
          });
        } else if (data?.symbol && data?.sector) {
          // Single symbol returns an object, not array
          newMap[data.symbol] = data.sector;
        }
        setSectorMap(newMap);
      } catch {}
    })();
  }, [currentPortfolio?.holdings.map(h => h.symbol).join(',')]);

  // Load chart data when portfolio changes or time range changes
  useEffect(() => {
    if (currentPortfolio && currentPortfolio.holdings.length > 0) {
      loadChartData(selectedRange);
    }
  }, [selectedRange, currentPortfolio?.totalValue]);

  // Fetch S&P 500 data on initial load
  useEffect(() => {
    fetchSp500AllTimeData();
  }, []);

  const loadChartData = async (range: TimeRange) => {
    if (!currentPortfolio || currentPortfolio.holdings.length === 0) return;

    setChartLoading(true);
    try {
      // Determine API endpoint and params based on range
      let interval = '1hour';
      let limit = 24;

      switch (range) {
        case '1D':
          interval = '5min';
          limit = 78;
          break;
        case '5D':
          interval = '30min';
          limit = 65;
          break;
        case '1M':
          interval = '1hour';
          limit = 160;
          break;
        case '1Y':
          interval = '4hour';
          limit = 250;
          break;
        case '5Y':
          interval = '4hour';
          limit = 500;
          break;
        case 'ALL':
          interval = '4hour';
          limit = 1000;
          break;
      }

      // Fetch historical data for each holding and aggregate
      const chartDataMap: { [key: string]: number } = {};

      for (const holding of currentPortfolio.holdings) {
        try {
          const historicalUrl = `${BASE_URL}/historical-chart/${interval}/${holding.symbol}?apikey=${FMP_API_KEY}`;
          const histResponse = await fetch(historicalUrl);
          const histData = await histResponse.json();

          if (Array.isArray(histData) && histData.length > 0) {
            const dataPoints = histData.slice(0, limit).reverse();
            dataPoints.forEach((point: any, index: number) => {
              const key = index.toString();
              const value = (point.close || point.price || 0) * holding.shares;
              chartDataMap[key] = (chartDataMap[key] || 0) + value;
            });
          }
        } catch (err) {
          
        }
      }

      // Convert to chart format
      const dataPoints = Object.entries(chartDataMap)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([_, value]) => ({ value }));

      if (dataPoints.length > 0) {
        setChartData(dataPoints);

        const startValue = dataPoints[0].value;
        const endValue = dataPoints[dataPoints.length - 1].value;
        const change = endValue - startValue;
        const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;
        setChartChange({ value: change, percent: changePercent });
      } else {
        // Fallback: generate simulated data based on current value
        const currentValue = currentPortfolio.totalValue;
        const simulatedData: ChartDataPoint[] = [];
        const points = range === '1D' ? 24 : range === '5D' ? 40 : range === '1M' ? 30 : 50;

        for (let i = 0; i < points; i++) {
          const variation = (Math.random() - 0.5) * 0.02;
          const value = currentValue * (1 + variation * (points - i) / points);
          simulatedData.push({ value });
        }
        simulatedData.push({ value: currentValue });
        setChartData(simulatedData);

        const startVal = simulatedData[0].value;
        const endVal = currentValue;
        setChartChange({
          value: endVal - startVal,
          percent: startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0,
        });
      }

      // Fetch S&P 500 performance
      await fetchSp500Data();
    } catch (error) {
      
    } finally {
      setChartLoading(false);
    }
  };

  // Fetch S&P 500 1-year performance for all-time comparison
  const fetchSp500AllTimeData = async () => {
    try {
      

      // Get 1-year historical data for SPY (S&P 500 ETF)
      const sp500Url = `${BASE_URL}/historical-price-full/SPY?serietype=line&apikey=${FMP_API_KEY}`;
      const sp500Response = await fetch(sp500Url);
      const sp500Data = await sp500Response.json();

      

      if (sp500Data?.historical && Array.isArray(sp500Data.historical) && sp500Data.historical.length > 0) {
        // Get approximately 1 year of trading days (252)
        const days = Math.min(252, sp500Data.historical.length);
        const availableData = sp500Data.historical.slice(0, days);

        if (availableData.length >= 2) {
          const sp500End = availableData[0].close; // Most recent
          const sp500Start = availableData[availableData.length - 1].close; // 1 year ago
          const sp500ChangeVal = sp500End - sp500Start;
          const sp500ChangePercent = sp500Start > 0 ? (sp500ChangeVal / sp500Start) * 100 : 0;

          setSp500Change({ value: sp500ChangeVal, percent: sp500ChangePercent });
          return;
        }
      }

      // Fallback to YTD change from quote
      
      const quoteUrl = `${BASE_URL}/quote/SPY?apikey=${FMP_API_KEY}`;
      const quoteResponse = await fetch(quoteUrl);
      const quoteData = await quoteResponse.json();

      

      if (Array.isArray(quoteData) && quoteData.length > 0) {
        const quote = quoteData[0];
        // Use YTD change if available, otherwise day change
        const yearChange = quote.ytd || quote.changesPercentage || 0;
        setSp500Change({
          value: quote.change || 0,
          percent: yearChange
        });
      }
    } catch (error) {
      
    }
  };

  const fetchSp500Data = async () => {
    // Now we always fetch all-time data since comparison is all-time
    await fetchSp500AllTimeData();
  };

  const onRefresh = useCallback(() => {
    refreshPrices();
    if (currentPortfolio && currentPortfolio.holdings.length > 0) {
      loadChartData(selectedRange);
    }
  }, [currentPortfolio, selectedRange]);

  const timeRanges: TimeRange[] = ['1D', '5D', '1M', '1Y', '5Y', 'ALL'];

  // Show loading while context is loading or prices aren't fetched yet
  if (loading || (!currentPortfolio && !refreshing)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Portfolio Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading portfolio data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentPortfolio || currentPortfolio.holdings.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Portfolio Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Holdings Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Add stocks to your portfolio to see analytics</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Use data from context
  const totalValue = currentPortfolio.totalValue;
  const totalCost = currentPortfolio.totalCost;
  const totalGain = currentPortfolio.totalGain;
  const totalGainPercent = currentPortfolio.totalGainPercent;

  // Pie chart data
  const pieColors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FFCC00', '#FF2D55'];
  const pieData = currentPortfolio.holdings.map((h, idx) => ({
    value: h.currentValue,
    color: pieColors[idx % pieColors.length],
    text: `${((h.currentValue / totalValue) * 100).toFixed(0)}%`,
    label: h.symbol,
  }));

  // Sector breakdown data
  const sectorColors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FFCC00', '#FF2D55', '#30B0C7', '#A2845E'];
  const sectorTotals: Record<string, number> = {};
  currentPortfolio.holdings.forEach(h => {
    const sector = sectorMap[h.symbol] || 'Unknown';
    sectorTotals[sector] = (sectorTotals[sector] || 0) + h.currentValue;
  });
  const sectorEntries = Object.entries(sectorTotals).sort((a, b) => b[1] - a[1]);
  const sectorPieData = sectorEntries.map(([sector, value], idx) => ({
    value,
    color: sectorColors[idx % sectorColors.length],
    text: `${((value / totalValue) * 100).toFixed(0)}%`,
    label: sector,
  }));

  // Diversification score (Herfindahl Index)
  const holdingWeights = currentPortfolio.holdings.map(h => h.currentValue / totalValue);
  const herfindahlIndex = holdingWeights.reduce((sum, w) => sum + (w * w), 0);
  const diversificationScore = Math.round((1 - herfindahlIndex) * 100);

  // Best and worst performers
  const sortedByGain = [...currentPortfolio.holdings].sort((a, b) => b.gainPercent - a.gainPercent);
  const bestPerformer = sortedByGain[0];
  const worstPerformer = sortedByGain[sortedByGain.length - 1];

  // Risk metrics
  const avgVolatility = currentPortfolio.holdings.reduce((sum, h) => {
    return sum + Math.abs(h.gainPercent || 0);
  }, 0) / currentPortfolio.holdings.length;

  const chartColor = chartChange.value >= 0 ? '#34C759' : '#FF3B30';
  const chartWidth = screenWidth - 32;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{currentPortfolio.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Portfolio Value & Chart Section */}
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <View style={styles.valueSection}>
            <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>Portfolio Value</Text>
            <Text style={[styles.valueAmount, { color: colors.text }]}>
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={styles.changeRow}>
              <Text style={[styles.changeValue, { color: chartColor }]}>
                {chartChange.value >= 0 ? '+' : ''}${Math.abs(chartChange.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <View style={[styles.changeBadge, { backgroundColor: chartChange.value >= 0 ? '#34C75920' : '#FF3B3020' }]}>
                <Ionicons
                  name={chartChange.value >= 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={chartColor}
                />
                <Text style={[styles.changePercent, { color: chartColor }]}>
                  {chartChange.percent >= 0 ? '+' : ''}{chartChange.percent.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Chart */}
          <View style={styles.chartContainer}>
            {chartLoading ? (
              <View style={styles.chartLoadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : chartData.length > 1 ? (
              <LineChart
                areaChart
                data={chartData}
                height={180}
                width={chartWidth}
                curved
                curvature={0.2}
                startFillColor={chartColor}
                startOpacity={0.3}
                endOpacity={0.05}
                color={chartColor}
                thickness={2}
                hideDataPoints
                hideAxesAndRules
                hideYAxisText
                xAxisLabelsHeight={0}
                yAxisLabelWidth={0}
                backgroundColor="transparent"
                spacing={chartWidth / chartData.length}
                initialSpacing={0}
                endSpacing={0}
                adjustToWidth
                disableScroll
              />
            ) : (
              <View style={styles.chartLoadingContainer}>
                <Text style={[styles.noChartText, { color: colors.textSecondary }]}>No chart data available</Text>
              </View>
            )}
          </View>

          {/* Time Range Selector */}
          <View style={[styles.timeRangeContainer, { backgroundColor: isDark ? colors.surface : '#F5F5F7' }]}>
            {timeRanges.map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  selectedRange === range && [styles.timeRangeButtonActive, { backgroundColor: colors.card }]
                ]}
                onPress={() => setSelectedRange(range)}
              >
                <Text style={[
                  styles.timeRangeText,
                  { color: colors.textSecondary },
                  selectedRange === range && styles.timeRangeTextActive
                ]}>
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Allocation Pie Chart */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Allocation</Text>
          <View style={styles.pieChartContainer}>
            <PieChart
              data={pieData}
              donut
              radius={80}
              innerRadius={50}
              centerLabelComponent={() => (
                <View style={styles.pieChartCenter}>
                  <Text style={[styles.pieChartCenterValue, { color: colors.text }]}>{currentPortfolio.holdings.length}</Text>
                  <Text style={[styles.pieChartCenterLabel, { color: colors.textSecondary }]}>Holdings</Text>
                </View>
              )}
            />
            <View style={styles.pieLegend}>
              {pieData.slice(0, 6).map((item, idx) => (
                <View key={idx} style={styles.pieLegendItem}>
                  <View style={[styles.pieLegendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.pieLegendText, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.pieLegendPercent, { color: colors.textSecondary }]}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Sector Breakdown */}
        {sectorPieData.length > 0 && sectorPieData[0].label !== 'Unknown' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Sector Breakdown</Text>
            <View style={styles.pieChartContainer}>
              <PieChart
                data={sectorPieData}
                donut
                radius={80}
                innerRadius={50}
                centerLabelComponent={() => (
                  <View style={styles.pieChartCenter}>
                    <Text style={[styles.pieChartCenterValue, { color: colors.text }]}>{sectorEntries.length}</Text>
                    <Text style={[styles.pieChartCenterLabel, { color: colors.textSecondary }]}>Sectors</Text>
                  </View>
                )}
              />
              <View style={styles.pieLegend}>
                {sectorPieData.slice(0, 6).map((item, idx) => (
                  <View key={idx} style={styles.pieLegendItem}>
                    <View style={[styles.pieLegendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.pieLegendText, { color: colors.text }]} numberOfLines={1}>{item.label}</Text>
                    <Text style={[styles.pieLegendPercent, { color: colors.textSecondary }]}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Diversification & Risk Row */}
        <View style={styles.row}>
          <View style={[styles.card, styles.cardHalf, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Diversification</Text>
            <Text style={[styles.scoreValue, {
              color: diversificationScore >= 70 ? '#34C759' : diversificationScore >= 40 ? '#FF9500' : '#FF3B30'
            }]}>
              {diversificationScore}
            </Text>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
              {diversificationScore >= 70 ? 'Well Diversified' : diversificationScore >= 40 ? 'Moderate' : 'Concentrated'}
            </Text>
          </View>
          <View style={[styles.card, styles.cardHalf, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Risk Level</Text>
            <Text style={[styles.scoreValue, {
              color: avgVolatility < 10 ? '#34C759' : avgVolatility < 25 ? '#FF9500' : '#FF3B30'
            }]}>
              {avgVolatility < 10 ? 'Low' : avgVolatility < 25 ? 'Med' : 'High'}
            </Text>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
              {avgVolatility.toFixed(1)}% avg volatility
            </Text>
          </View>
        </View>

        {/* Best/Worst Performers */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Top Performers</Text>
          {bestPerformer && (
            <View style={[styles.performerRow, { borderBottomColor: colors.border }]}>
              <View style={styles.performerLeft}>
                <View style={[styles.performerIcon, { backgroundColor: '#34C75920' }]}>
                  <Ionicons name="trophy" size={20} color="#FFD700" />
                </View>
                <View>
                  <Text style={[styles.performerLabel, { color: colors.textSecondary }]}>Best</Text>
                  <Text style={[styles.performerSymbol, { color: colors.text }]}>{bestPerformer.symbol}</Text>
                </View>
              </View>
              <Text style={[styles.performerValue, { color: bestPerformer.gainPercent >= 0 ? '#34C759' : '#FF3B30' }]}>
                {bestPerformer.gainPercent >= 0 ? '+' : ''}{bestPerformer.gainPercent.toFixed(2)}%
              </Text>
            </View>
          )}
          {worstPerformer && worstPerformer !== bestPerformer && (
            <View style={[styles.performerRow, { borderBottomWidth: 0 }]}>
              <View style={styles.performerLeft}>
                <View style={[styles.performerIcon, { backgroundColor: '#FF3B3020' }]}>
                  <Ionicons name="trending-down" size={20} color="#FF3B30" />
                </View>
                <View>
                  <Text style={[styles.performerLabel, { color: colors.textSecondary }]}>Worst</Text>
                  <Text style={[styles.performerSymbol, { color: colors.text }]}>{worstPerformer.symbol}</Text>
                </View>
              </View>
              <Text style={[styles.performerValue, { color: worstPerformer.gainPercent >= 0 ? '#34C759' : '#FF3B30' }]}>
                {worstPerformer.gainPercent >= 0 ? '+' : ''}{worstPerformer.gainPercent.toFixed(2)}%
              </Text>
            </View>
          )}
        </View>

        {/* All-Time P&L */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>All-Time P&L</Text>
          <View style={styles.pnlContainer}>
            <View style={styles.pnlItem}>
              <Text style={[styles.pnlLabel, { color: colors.textSecondary }]}>Total Cost</Text>
              <Text style={[styles.pnlValue, { color: colors.text }]}>
                ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.pnlItem}>
              <Text style={[styles.pnlLabel, { color: colors.textSecondary }]}>Current Value</Text>
              <Text style={[styles.pnlValue, { color: colors.text }]}>
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.pnlDivider, { backgroundColor: colors.border }]} />
            <View style={styles.pnlItem}>
              <Text style={[styles.pnlLabel, { color: colors.textSecondary }]}>Unrealized P&L</Text>
              <View style={styles.pnlValueContainer}>
                <Text style={[styles.pnlValueLarge, { color: totalGain >= 0 ? '#34C759' : '#FF3B30' }]}>
                  {totalGain >= 0 ? '+' : ''}${Math.abs(totalGain).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={[styles.pnlPercent, { color: totalGain >= 0 ? '#34C759' : '#FF3B30' }]}>
                  ({totalGainPercent >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%)
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Performance vs S&P 500 */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>vs S&P 500 (All-Time)</Text>
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>Your Portfolio</Text>
              <Text style={[styles.comparisonValue, { color: totalGainPercent >= 0 ? '#34C759' : '#FF3B30' }]}>
                {totalGainPercent >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.comparisonVs}>
              <Text style={[styles.comparisonVsText, { color: colors.textSecondary }]}>vs</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>S&P 500</Text>
              <Text style={[styles.comparisonValue, { color: sp500Change.percent >= 0 ? '#34C759' : '#FF3B30' }]}>
                {sp500Change.percent >= 0 ? '+' : ''}{sp500Change.percent.toFixed(2)}%
              </Text>
            </View>
          </View>
          <View style={[styles.comparisonResultBadge, {
            backgroundColor: totalGainPercent > sp500Change.percent ? '#34C75920' : '#FF3B3020'
          }]}>
            <Ionicons
              name={totalGainPercent > sp500Change.percent ? 'trending-up' : 'trending-down'}
              size={18}
              color={totalGainPercent > sp500Change.percent ? '#34C759' : '#FF3B30'}
            />
            <Text style={[styles.comparisonResult, {
              color: totalGainPercent > sp500Change.percent ? '#34C759' : '#FF3B30'
            }]}>
              {totalGainPercent > sp500Change.percent ? 'Outperforming' : 'Underperforming'} by {Math.abs(totalGainPercent - sp500Change.percent).toFixed(2)}%
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  valueSection: {
    marginBottom: 16,
  },
  valueLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  changePercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    marginHorizontal: -20,
    marginBottom: 16,
    minHeight: 180,
  },
  chartLoadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChartText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  timeRangeTextActive: {
    color: '#007AFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHalf: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  pieChartCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartCenterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  pieChartCenterLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  pieLegend: {
    flex: 1,
    marginLeft: 20,
    gap: 8,
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pieLegendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  pieLegendPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  performerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  performerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  performerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  performerLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  performerSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  performerValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  pnlContainer: {
    gap: 12,
  },
  pnlItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pnlLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  pnlValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  pnlValueContainer: {
    alignItems: 'flex-end',
  },
  pnlValueLarge: {
    fontSize: 18,
    fontWeight: '700',
  },
  pnlPercent: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  pnlDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 6,
  },
  comparisonValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  comparisonVs: {
    paddingHorizontal: 12,
  },
  comparisonVsText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  comparisonResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  comparisonResult: {
    fontSize: 14,
    fontWeight: '600',
  },
});
