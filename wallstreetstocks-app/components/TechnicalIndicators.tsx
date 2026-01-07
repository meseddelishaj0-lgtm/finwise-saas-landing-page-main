// components/TechnicalIndicators.tsx
// Technical indicators display component (RSI, MACD, SMA, EMA, Bollinger Bands)

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchRSI,
  fetchMACD,
  fetchSMA,
  fetchEMA,
  fetchBollingerBands,
  RSIDataPoint,
  MACDDataPoint,
  SMADataPoint,
  EMADataPoint,
  BollingerBandsDataPoint,
  interpretRSI,
  interpretMACD,
} from '../services/technicalIndicators';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const INDICATOR_HEIGHT = 100;

interface TechnicalIndicatorsProps {
  symbol: string;
  timeframe: string;
  priceColor: string;
}

type IndicatorType = 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BB';

export default function TechnicalIndicators({
  symbol,
  timeframe,
  priceColor,
}: TechnicalIndicatorsProps) {
  const [activeIndicator, setActiveIndicator] = useState<IndicatorType>('RSI');
  const [loading, setLoading] = useState(true);
  const [rsiData, setRsiData] = useState<RSIDataPoint[]>([]);
  const [macdData, setMacdData] = useState<MACDDataPoint[]>([]);
  const [sma20Data, setSma20Data] = useState<SMADataPoint[]>([]);
  const [sma50Data, setSma50Data] = useState<SMADataPoint[]>([]);
  const [ema12Data, setEma12Data] = useState<EMADataPoint[]>([]);
  const [ema26Data, setEma26Data] = useState<EMADataPoint[]>([]);
  const [bollingerData, setBollingerData] = useState<BollingerBandsDataPoint[]>([]);

  // Fetch indicators when symbol or timeframe changes
  useEffect(() => {
    if (!symbol) return;

    const fetchIndicators = async () => {
      setLoading(true);
      try {
        // Fetch all indicators in parallel
        const [rsi, macd, sma20, sma50, ema12, ema26, bollinger] = await Promise.all([
          fetchRSI(symbol, timeframe),
          fetchMACD(symbol, timeframe),
          fetchSMA(symbol, timeframe, 20),
          fetchSMA(symbol, timeframe, 50),
          fetchEMA(symbol, timeframe, 12),
          fetchEMA(symbol, timeframe, 26),
          fetchBollingerBands(symbol, timeframe),
        ]);

        setRsiData(rsi);
        setMacdData(macd);
        setSma20Data(sma20);
        setSma50Data(sma50);
        setEma12Data(ema12);
        setEma26Data(ema26);
        setBollingerData(bollinger);
      } catch (error) {
        console.error('Failed to fetch indicators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIndicators();
  }, [symbol, timeframe]);

  // RSI Chart Data
  const rsiChartData = useMemo(() => {
    if (rsiData.length === 0) return [];

    const maxPoints = 60;
    let data = rsiData;
    if (data.length > maxPoints) {
      const sampleRate = Math.ceil(data.length / maxPoints);
      data = data.filter((_, i) => i % sampleRate === 0);
    }

    return data.map((d) => ({
      value: d.rsi,
      label: '',
    }));
  }, [rsiData]);

  // Current RSI value and interpretation
  const currentRSI = rsiData.length > 0 ? rsiData[rsiData.length - 1].rsi : null;
  const rsiInterpretation = currentRSI ? interpretRSI(currentRSI) : null;

  // MACD Chart Data
  const macdChartData = useMemo(() => {
    if (macdData.length === 0) return { macd: [], signal: [], histogram: [] };

    const maxPoints = 60;
    let data = macdData;
    if (data.length > maxPoints) {
      const sampleRate = Math.ceil(data.length / maxPoints);
      data = data.filter((_, i) => i % sampleRate === 0);
    }

    return {
      macd: data.map((d) => ({ value: d.macd, label: '' })),
      signal: data.map((d) => ({ value: d.macd_signal, label: '' })),
      histogram: data.map((d) => ({
        value: Math.abs(d.macd_hist),
        label: '',
        frontColor: d.macd_hist >= 0 ? '#34C759' : '#FF3B30',
      })),
    };
  }, [macdData]);

  // Current MACD values and interpretation
  const currentMACD = macdData.length > 0 ? macdData[macdData.length - 1] : null;
  const macdInterpretation = currentMACD
    ? interpretMACD(currentMACD.macd, currentMACD.macd_signal)
    : null;

  // SMA Chart Data
  const smaChartData = useMemo(() => {
    if (sma20Data.length === 0 && sma50Data.length === 0) return { sma20: [], sma50: [] };

    const maxPoints = 60;

    let data20 = sma20Data;
    if (data20.length > maxPoints) {
      const sampleRate = Math.ceil(data20.length / maxPoints);
      data20 = data20.filter((_, i) => i % sampleRate === 0);
    }

    let data50 = sma50Data;
    if (data50.length > maxPoints) {
      const sampleRate = Math.ceil(data50.length / maxPoints);
      data50 = data50.filter((_, i) => i % sampleRate === 0);
    }

    return {
      sma20: data20.map((d) => ({ value: d.sma, label: '' })),
      sma50: data50.map((d) => ({ value: d.sma, label: '' })),
    };
  }, [sma20Data, sma50Data]);

  // Current SMA values
  const currentSMA20 = sma20Data.length > 0 ? sma20Data[sma20Data.length - 1].sma : null;
  const currentSMA50 = sma50Data.length > 0 ? sma50Data[sma50Data.length - 1].sma : null;

  // EMA Chart Data
  const emaChartData = useMemo(() => {
    if (ema12Data.length === 0 && ema26Data.length === 0) return { ema12: [], ema26: [] };

    const maxPoints = 60;

    let data12 = ema12Data;
    if (data12.length > maxPoints) {
      const sampleRate = Math.ceil(data12.length / maxPoints);
      data12 = data12.filter((_, i) => i % sampleRate === 0);
    }

    let data26 = ema26Data;
    if (data26.length > maxPoints) {
      const sampleRate = Math.ceil(data26.length / maxPoints);
      data26 = data26.filter((_, i) => i % sampleRate === 0);
    }

    return {
      ema12: data12.map((d) => ({ value: d.ema, label: '' })),
      ema26: data26.map((d) => ({ value: d.ema, label: '' })),
    };
  }, [ema12Data, ema26Data]);

  // Current EMA values
  const currentEMA12 = ema12Data.length > 0 ? ema12Data[ema12Data.length - 1].ema : null;
  const currentEMA26 = ema26Data.length > 0 ? ema26Data[ema26Data.length - 1].ema : null;

  // Bollinger Bands Chart Data
  const bollingerChartData = useMemo(() => {
    if (bollingerData.length === 0) return { upper: [], middle: [], lower: [] };

    const maxPoints = 60;
    let data = bollingerData;
    if (data.length > maxPoints) {
      const sampleRate = Math.ceil(data.length / maxPoints);
      data = data.filter((_, i) => i % sampleRate === 0);
    }

    return {
      upper: data.map((d) => ({ value: d.upper_band, label: '' })),
      middle: data.map((d) => ({ value: d.middle_band, label: '' })),
      lower: data.map((d) => ({ value: d.lower_band, label: '' })),
    };
  }, [bollingerData]);

  // Current Bollinger values
  const currentBollinger = bollingerData.length > 0 ? bollingerData[bollingerData.length - 1] : null;

  // Calculate spacing based on active indicator
  const getChartSpacing = (dataLength: number) => {
    if (dataLength <= 1) return 10;
    return Math.max(2, (SCREEN_WIDTH - 60) / dataLength);
  };

  // MACD Y-axis bounds
  const macdYBounds = useMemo(() => {
    if (macdChartData.macd.length === 0) return { min: -1, max: 1 };
    const allValues = [
      ...macdChartData.macd.map((d) => d.value),
      ...macdChartData.signal.map((d) => d.value),
    ];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 0.1;
    return { min: min - padding, max: max + padding };
  }, [macdChartData]);

  // SMA Y-axis bounds
  const smaYBounds = useMemo(() => {
    const allValues = [
      ...smaChartData.sma20.map((d) => d.value),
      ...smaChartData.sma50.map((d) => d.value),
    ];
    if (allValues.length === 0) return { min: 0, max: 100 };
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || max * 0.05;
    return { min: min - padding, max: max + padding };
  }, [smaChartData]);

  // EMA Y-axis bounds
  const emaYBounds = useMemo(() => {
    const allValues = [
      ...emaChartData.ema12.map((d) => d.value),
      ...emaChartData.ema26.map((d) => d.value),
    ];
    if (allValues.length === 0) return { min: 0, max: 100 };
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || max * 0.05;
    return { min: min - padding, max: max + padding };
  }, [emaChartData]);

  // Bollinger Y-axis bounds
  const bollingerYBounds = useMemo(() => {
    const allValues = [
      ...bollingerChartData.upper.map((d) => d.value),
      ...bollingerChartData.lower.map((d) => d.value),
    ];
    if (allValues.length === 0) return { min: 0, max: 100 };
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || max * 0.05;
    return { min: min - padding, max: max + padding };
  }, [bollingerChartData]);

  const renderIndicatorTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScrollView}
      contentContainerStyle={styles.tabContainer}
    >
      {(['RSI', 'MACD', 'SMA', 'EMA', 'BB'] as IndicatorType[]).map((indicator) => (
        <TouchableOpacity
          key={indicator}
          style={[
            styles.tab,
            activeIndicator === indicator && [styles.activeTab, { borderBottomColor: priceColor }],
          ]}
          onPress={() => setActiveIndicator(indicator)}
        >
          <Text
            style={[
              styles.tabText,
              activeIndicator === indicator && [styles.activeTabText, { color: priceColor }],
            ]}
          >
            {indicator === 'BB' ? 'Bollinger' : indicator}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderRSIChart = () => (
    <View style={styles.indicatorChart}>
      <View style={styles.indicatorHeader}>
        <View style={styles.indicatorTitleRow}>
          <Text style={styles.indicatorTitle}>RSI (14)</Text>
          {currentRSI !== null && (
            <View style={[styles.signalBadge, { backgroundColor: rsiInterpretation?.color + '20' }]}>
              <Text style={[styles.signalText, { color: rsiInterpretation?.color }]}>
                {currentRSI.toFixed(1)} - {rsiInterpretation?.signal.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.indicatorDescription}>
          {'>'} 70 = Overbought | {'<'} 30 = Oversold
        </Text>
      </View>

      {rsiChartData.length > 1 ? (
        <View style={styles.chartWrapper}>
          <View style={[styles.levelLine, { top: INDICATOR_HEIGHT * 0.3 }]}>
            <View style={styles.dottedLine} />
            <Text style={[styles.levelLabel, { color: '#FF3B30' }]}>70</Text>
          </View>
          <View style={[styles.levelLine, { top: INDICATOR_HEIGHT * 0.7 }]}>
            <View style={styles.dottedLine} />
            <Text style={[styles.levelLabel, { color: '#34C759' }]}>30</Text>
          </View>

          <LineChart
            data={rsiChartData}
            height={INDICATOR_HEIGHT}
            width={SCREEN_WIDTH - 40}
            curved
            curvature={0.1}
            color={priceColor}
            thickness={1.5}
            hideDataPoints
            hideAxesAndRules
            hideYAxisText
            backgroundColor="transparent"
            spacing={getChartSpacing(rsiChartData.length)}
            initialSpacing={5}
            endSpacing={10}
            yAxisOffset={0}
            maxValue={100}
            areaChart
            startFillColor={priceColor}
            endFillColor={priceColor}
            startOpacity={0.2}
            endOpacity={0.02}
          />
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No RSI data available</Text>
        </View>
      )}
    </View>
  );

  const renderMACDChart = () => (
    <View style={styles.indicatorChart}>
      <View style={styles.indicatorHeader}>
        <View style={styles.indicatorTitleRow}>
          <Text style={styles.indicatorTitle}>MACD (12, 26, 9)</Text>
          {currentMACD && (
            <View style={[styles.signalBadge, { backgroundColor: macdInterpretation?.color + '20' }]}>
              <Ionicons
                name={macdInterpretation?.trend === 'bullish' ? 'trending-up' : 'trending-down'}
                size={12}
                color={macdInterpretation?.color}
              />
              <Text style={[styles.signalText, { color: macdInterpretation?.color }]}>
                {macdInterpretation?.trend.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>MACD</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>Signal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBar, { backgroundColor: '#34C759' }]} />
            <Text style={styles.legendText}>Histogram</Text>
          </View>
        </View>
      </View>

      {macdChartData.macd.length > 1 ? (
        <View style={styles.chartWrapper}>
          <View style={[styles.zeroLine, { top: INDICATOR_HEIGHT * 0.5 }]}>
            <View style={styles.solidLine} />
          </View>

          <View style={styles.histogramContainer}>
            <BarChart
              data={macdChartData.histogram}
              height={INDICATOR_HEIGHT * 0.4}
              width={SCREEN_WIDTH - 60}
              barWidth={Math.max(2, getChartSpacing(macdChartData.histogram.length) * 0.6)}
              spacing={Math.max(1, getChartSpacing(macdChartData.histogram.length) * 0.4)}
              hideAxesAndRules
              hideYAxisText
              noOfSections={1}
              backgroundColor="transparent"
              initialSpacing={5}
              disablePress
            />
          </View>

          <View style={styles.macdLinesContainer}>
            <LineChart
              data={macdChartData.macd}
              height={INDICATOR_HEIGHT}
              width={SCREEN_WIDTH - 40}
              curved
              curvature={0.1}
              color="#007AFF"
              thickness={1.5}
              hideDataPoints
              hideAxesAndRules
              hideYAxisText
              backgroundColor="transparent"
              spacing={getChartSpacing(macdChartData.macd.length)}
              initialSpacing={5}
              endSpacing={10}
              yAxisOffset={macdYBounds.min}
              maxValue={macdYBounds.max - macdYBounds.min}
              data2={macdChartData.signal}
              color2="#FF9500"
              thickness2={1.5}
            />
          </View>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No MACD data available</Text>
        </View>
      )}
    </View>
  );

  const renderSMAChart = () => (
    <View style={styles.indicatorChart}>
      <View style={styles.indicatorHeader}>
        <View style={styles.indicatorTitleRow}>
          <Text style={styles.indicatorTitle}>Simple Moving Average</Text>
          {currentSMA20 !== null && currentSMA50 !== null && (
            <View style={[styles.signalBadge, { backgroundColor: currentSMA20 > currentSMA50 ? '#34C75920' : '#FF3B3020' }]}>
              <Ionicons
                name={currentSMA20 > currentSMA50 ? 'trending-up' : 'trending-down'}
                size={12}
                color={currentSMA20 > currentSMA50 ? '#34C759' : '#FF3B30'}
              />
              <Text style={[styles.signalText, { color: currentSMA20 > currentSMA50 ? '#34C759' : '#FF3B30' }]}>
                {currentSMA20 > currentSMA50 ? 'BULLISH' : 'BEARISH'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>SMA 20 {currentSMA20 ? `($${currentSMA20.toFixed(2)})` : ''}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>SMA 50 {currentSMA50 ? `($${currentSMA50.toFixed(2)})` : ''}</Text>
          </View>
        </View>
        <Text style={styles.indicatorDescription}>
          SMA 20 above SMA 50 = Bullish trend
        </Text>
      </View>

      {smaChartData.sma20.length > 1 ? (
        <View style={styles.chartWrapper}>
          <LineChart
            data={smaChartData.sma20}
            height={INDICATOR_HEIGHT}
            width={SCREEN_WIDTH - 40}
            curved
            curvature={0.1}
            color="#007AFF"
            thickness={1.5}
            hideDataPoints
            hideAxesAndRules
            hideYAxisText
            backgroundColor="transparent"
            spacing={getChartSpacing(smaChartData.sma20.length)}
            initialSpacing={5}
            endSpacing={10}
            yAxisOffset={smaYBounds.min}
            maxValue={smaYBounds.max - smaYBounds.min}
            data2={smaChartData.sma50}
            color2="#FF9500"
            thickness2={1.5}
          />
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No SMA data available</Text>
        </View>
      )}
    </View>
  );

  const renderEMAChart = () => (
    <View style={styles.indicatorChart}>
      <View style={styles.indicatorHeader}>
        <View style={styles.indicatorTitleRow}>
          <Text style={styles.indicatorTitle}>Exponential Moving Average</Text>
          {currentEMA12 !== null && currentEMA26 !== null && (
            <View style={[styles.signalBadge, { backgroundColor: currentEMA12 > currentEMA26 ? '#34C75920' : '#FF3B3020' }]}>
              <Ionicons
                name={currentEMA12 > currentEMA26 ? 'trending-up' : 'trending-down'}
                size={12}
                color={currentEMA12 > currentEMA26 ? '#34C759' : '#FF3B30'}
              />
              <Text style={[styles.signalText, { color: currentEMA12 > currentEMA26 ? '#34C759' : '#FF3B30' }]}>
                {currentEMA12 > currentEMA26 ? 'BULLISH' : 'BEARISH'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#AF52DE' }]} />
            <Text style={styles.legendText}>EMA 12 {currentEMA12 ? `($${currentEMA12.toFixed(2)})` : ''}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#5856D6' }]} />
            <Text style={styles.legendText}>EMA 26 {currentEMA26 ? `($${currentEMA26.toFixed(2)})` : ''}</Text>
          </View>
        </View>
        <Text style={styles.indicatorDescription}>
          EMA 12 above EMA 26 = Bullish momentum
        </Text>
      </View>

      {emaChartData.ema12.length > 1 ? (
        <View style={styles.chartWrapper}>
          <LineChart
            data={emaChartData.ema12}
            height={INDICATOR_HEIGHT}
            width={SCREEN_WIDTH - 40}
            curved
            curvature={0.1}
            color="#AF52DE"
            thickness={1.5}
            hideDataPoints
            hideAxesAndRules
            hideYAxisText
            backgroundColor="transparent"
            spacing={getChartSpacing(emaChartData.ema12.length)}
            initialSpacing={5}
            endSpacing={10}
            yAxisOffset={emaYBounds.min}
            maxValue={emaYBounds.max - emaYBounds.min}
            data2={emaChartData.ema26}
            color2="#5856D6"
            thickness2={1.5}
          />
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No EMA data available</Text>
        </View>
      )}
    </View>
  );

  const renderBollingerChart = () => {
    // Determine if price is near bands
    let bandSignal = 'NEUTRAL';
    let bandColor = '#8E8E93';
    if (currentBollinger && currentSMA20) {
      const price = currentBollinger.middle_band;
      const upperDist = currentBollinger.upper_band - price;
      const lowerDist = price - currentBollinger.lower_band;
      const bandWidth = currentBollinger.upper_band - currentBollinger.lower_band;

      if (upperDist < bandWidth * 0.2) {
        bandSignal = 'OVERBOUGHT';
        bandColor = '#FF3B30';
      } else if (lowerDist < bandWidth * 0.2) {
        bandSignal = 'OVERSOLD';
        bandColor = '#34C759';
      }
    }

    return (
      <View style={styles.indicatorChart}>
        <View style={styles.indicatorHeader}>
          <View style={styles.indicatorTitleRow}>
            <Text style={styles.indicatorTitle}>Bollinger Bands (20, 2)</Text>
            <View style={[styles.signalBadge, { backgroundColor: bandColor + '20' }]}>
              <Text style={[styles.signalText, { color: bandColor }]}>
                {bandSignal}
              </Text>
            </View>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
              <Text style={styles.legendText}>Upper {currentBollinger ? `($${currentBollinger.upper_band.toFixed(2)})` : ''}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#8E8E93' }]} />
              <Text style={styles.legendText}>Middle</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
              <Text style={styles.legendText}>Lower {currentBollinger ? `($${currentBollinger.lower_band.toFixed(2)})` : ''}</Text>
            </View>
          </View>
          <Text style={styles.indicatorDescription}>
            Price near upper band = Overbought | Near lower = Oversold
          </Text>
        </View>

        {bollingerChartData.upper.length > 1 ? (
          <View style={styles.chartWrapper}>
            {/* Upper band */}
            <LineChart
              data={bollingerChartData.upper}
              height={INDICATOR_HEIGHT}
              width={SCREEN_WIDTH - 40}
              curved
              curvature={0.1}
              color="#FF3B30"
              thickness={1}
              hideDataPoints
              hideAxesAndRules
              hideYAxisText
              backgroundColor="transparent"
              spacing={getChartSpacing(bollingerChartData.upper.length)}
              initialSpacing={5}
              endSpacing={10}
              yAxisOffset={bollingerYBounds.min}
              maxValue={bollingerYBounds.max - bollingerYBounds.min}
              data2={bollingerChartData.middle}
              color2="#8E8E93"
              thickness2={1.5}
            />
            {/* Lower band overlay */}
            <View style={styles.bollingerLowerOverlay}>
              <LineChart
                data={bollingerChartData.lower}
                height={INDICATOR_HEIGHT}
                width={SCREEN_WIDTH - 40}
                curved
                curvature={0.1}
                color="#34C759"
                thickness={1}
                hideDataPoints
                hideAxesAndRules
                hideYAxisText
                backgroundColor="transparent"
                spacing={getChartSpacing(bollingerChartData.lower.length)}
                initialSpacing={5}
                endSpacing={10}
                yAxisOffset={bollingerYBounds.min}
                maxValue={bollingerYBounds.max - bollingerYBounds.min}
              />
            </View>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No Bollinger Bands data available</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {renderIndicatorTabs()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={priceColor} />
          <Text style={styles.loadingText}>Loading indicators...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderIndicatorTabs()}
      {activeIndicator === 'RSI' && renderRSIChart()}
      {activeIndicator === 'MACD' && renderMACDChart()}
      {activeIndicator === 'SMA' && renderSMAChart()}
      {activeIndicator === 'EMA' && renderEMAChart()}
      {activeIndicator === 'BB' && renderBollingerChart()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
    paddingBottom: 16,
  },
  tabScrollView: {
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    fontWeight: '700',
  },
  indicatorChart: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  indicatorHeader: {
    marginBottom: 8,
  },
  indicatorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  indicatorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  indicatorDescription: {
    fontSize: 11,
    color: '#636366',
    marginTop: 4,
  },
  signalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  signalText: {
    fontSize: 11,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendBar: {
    width: 12,
    height: 6,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: '#8E8E93',
  },
  chartWrapper: {
    position: 'relative',
    height: INDICATOR_HEIGHT,
  },
  levelLine: {
    position: 'absolute',
    left: 0,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  dottedLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: '#3C3C3E',
  },
  solidLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3C3C3E',
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 4,
    width: 20,
  },
  zeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  histogramContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  macdLinesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bollingerLowerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  loadingContainer: {
    height: INDICATOR_HEIGHT + 60,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  noDataContainer: {
    height: INDICATOR_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 13,
    color: '#636366',
  },
});
