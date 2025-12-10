// app/symbol/[symbol]/chart.tsx - Robinhood-Style Chart with Baseline

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useGlobalSearchParams, useSegments } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';

const { width, height } = Dimensions.get('window');
type Timeframe = '1D' | '5D' | '1M' | '3M' | '1Y' | 'ALL';

const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';

export default function ChartTab() {
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const segments = useSegments();

  // Extract symbol using multiple methods
  let symbol: string | null = null;
  
  if (localParams.symbol) {
    symbol = Array.isArray(localParams.symbol) ? localParams.symbol[0] : localParams.symbol;
  }
  
  if (!symbol && globalParams.symbol) {
    symbol = Array.isArray(globalParams.symbol) ? globalParams.symbol[0] : globalParams.symbol;
  }
  
  if (!symbol && segments.length >= 2) {
    const symbolIndex = segments.findIndex(seg => seg === 'symbol') + 1;
    if (symbolIndex > 0 && symbolIndex < segments.length) {
      symbol = segments[symbolIndex] as string;
    }
  }

  // FIXED: Decode URL-encoded symbol and preserve special characters like ^ and /
  const cleanSymbol = symbol 
    ? decodeURIComponent(String(symbol))
        .trim()
        .replace(/^\[|\]$/g, '')
        .replace(/[\(\)\{\}]/g, '')
        // Keep ^, /, -, and . for indices, forex, and other special symbols
        .toUpperCase() 
    : null;

  const [chartData, setChartData] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number | null>(null);
  const [priceColor, setPriceColor] = useState<'#00C853' | '#FF1744'>('#00C853');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [baseValue, setBaseValue] = useState<number | null>(null); // Starting price for the period
  const [yAxisMin, setYAxisMin] = useState<number | null>(null);
  const [yAxisMax, setYAxisMax] = useState<number | null>(null);
  const [pointerPrice, setPointerPrice] = useState<number | null>(null); // Price at pointer position

  const intervalRef = useRef<number | null>(null);
  const pointerValueRef = useRef<number | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const priceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Callback to update pointer price safely (not during render)
  const updatePointerPrice = useCallback((value: number | null) => {
    if (pointerValueRef.current !== value) {
      pointerValueRef.current = value;
      // Use setTimeout to defer the setState call outside of render
      setTimeout(() => {
        setPointerPrice(value);
      }, 0);
    }
  }, []);

  // Fetch live quote
  const fetchQuote = async () => {
    if (!cleanSymbol) return;
    
    try {
      console.log('Fetching quote for:', cleanSymbol);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // URL encode the symbol for the API call to handle special characters
      const encodedSymbol = encodeURIComponent(cleanSymbol);
      let res = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${encodedSymbol}?apikey=${FMP_API_KEY}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      let data = await res.json();
      
      // If no data and symbol has no special chars, might be forex - try without slash
      if ((!data || !Array.isArray(data) || data.length === 0) && cleanSymbol.includes('/')) {
        console.log('Retrying with normalized forex symbol (no slash)');
        const noSlashSymbol = cleanSymbol.replace(/\//g, '');
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
        
        res = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(noSlashSymbol)}?apikey=${FMP_API_KEY}`,
          { signal: controller2.signal }
        );
        
        clearTimeout(timeoutId2);
        data = await res.json();
      }
      
      console.log('Quote response:', data?.[0]?.price);

      if (data && Array.isArray(data) && data.length > 0) {
        const q = data[0];
        if (q.price !== undefined) {
          // Animate price change
          Animated.sequence([
            Animated.timing(priceAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(priceAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();

          setCurrentPrice(q.price);
          setChange(q.change || 0);
          setChangePercent(q.changesPercentage || 0);
          
          // Update color based on change from baseline or daily change
          const isPositive = baseValue 
            ? q.price >= baseValue 
            : (q.change || 0) >= 0;
          setPriceColor(isPositive ? '#00C853' : '#FF1744');
          
          setLastUpdated(new Date());
          setError(null);
        }
      }
    } catch (err: any) {
      console.error('Quote fetch error:', err);
      if (!currentPrice) {
        setError('Unable to load price data');
      }
    }
  };

  // Fetch chart data
  const fetchChartData = async () => {
    if (!cleanSymbol) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching chart data for:', cleanSymbol, 'timeframe:', timeframe);
      let formatted: any[] = [];

      // URL encode the symbol for the API call, handle forex by removing slashes
      const symbolForApi = cleanSymbol.replace(/\//g, ''); // Remove slashes for forex
      const encodedSymbol = encodeURIComponent(symbolForApi);

      if (timeframe === '1D') {
        const today = new Date().toISOString().split('T')[0];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/historical-chart/1min/${encodedSymbol}?from=${today}&to=${today}&apikey=${FMP_API_KEY}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);
        const data = await res.json();
        console.log('1min data points (including extended hours):', data?.length || 0);

        if (Array.isArray(data) && data.length > 10) {
          // Include ALL data points - pre-market, regular hours, and after-hours
          const filteredData = data
            .filter((d: any) => d.close !== undefined && d.close !== null);
          
          console.log('Total data points including extended hours:', filteredData.length);
          
          // Optimize: Sample data to max 300 points for extended hours
          const sampleRate = Math.max(1, Math.floor(filteredData.length / 300));
          
          formatted = filteredData
            .filter((_: any, i: number) => i % sampleRate === 0)
            .reverse()
            .map((d: any) => {
              const date = new Date(d.date);
              return {
                value: d.close,
                label: date.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true
                }),
                dataPointLabelComponent: () => null,
              };
            });
        } else {
          console.log('Falling back to daily data');
          const res2 = await fetch(
            `https://financialmodelingprep.com/api/v3/historical-price-full/${encodedSymbol}?timeseries=10&apikey=${FMP_API_KEY}`
          );
          const data2 = await res2.json();
          
          if (data2?.historical && Array.isArray(data2.historical)) {
            formatted = data2.historical
              .slice(0, 5)
              .reverse()
              .map((d: any) => ({
                value: d.close,
                label: new Date(d.date).toLocaleDateString('en-US', { 
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short' 
                }),
                dataPointLabelComponent: () => null,
              }));
          }
        }
      } else {
        const daysMap: Record<Timeframe, string> = {
          '5D': '10',
          '1M': '30',
          '3M': '90',
          '1Y': '365',
          'ALL': '10000', // Fetch maximum history (27+ years)
          '1D': '10',
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        // For 'ALL', try to get maximum history by using a very old start date
        const endpoint = timeframe === 'ALL'
          ? `https://financialmodelingprep.com/api/v3/historical-price-full/${encodedSymbol}?from=1980-01-01&apikey=${FMP_API_KEY}`
          : `https://financialmodelingprep.com/api/v3/historical-price-full/${encodedSymbol}?timeseries=${daysMap[timeframe]}&apikey=${FMP_API_KEY}`;

        const res = await fetch(endpoint, { signal: controller.signal });

        clearTimeout(timeoutId);
        const data = await res.json();
        
        const totalPoints = data?.historical?.length || 0;
        console.log('Historical data points received from API:', totalPoints);
        
        if (totalPoints > 0 && data?.historical?.[0] && data?.historical?.[totalPoints - 1]) {
          console.log(`Date range: ${data.historical[totalPoints - 1].date} to ${data.historical[0].date}`);
        }

        if (data?.historical && Array.isArray(data.historical)) {
          // For 'ALL', don't limit the data - use full history
          const histData = timeframe === 'ALL' 
            ? data.historical 
            : data.historical.slice(0, 800);
          
          // Optimize: Sample data based on timeframe
          const maxPoints: Record<Timeframe, number> = {
            '5D': 50,
            '1M': 90,
            '3M': 120,
            '1Y': 200,
            'ALL': 400, // More points for ALL to show full history detail
            '1D': 200,
          };
          
          const targetPoints = maxPoints[timeframe] || 150;
          const sampleRate = Math.max(1, Math.ceil(histData.length / targetPoints));
          
          console.log(`ALL timeframe: Total history=${histData.length} days, Sampling every ${sampleRate} days`);
          
          formatted = histData
            .filter((_: any, i: number) => i % sampleRate === 0)
            .reverse()
            .map((d: any) => {
              const date = new Date(d.date);
              return {
                value: d.close,
                label: date.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  ...(timeframe === 'ALL' || timeframe === '1Y' ? { year: 'numeric' } : {})
                }),
                dataPointLabelComponent: () => null,
              };
            });
        }
      }

      console.log('Formatted data points:', formatted.length);

      if (formatted.length > 0) {
        // Calculate baseline (first price in the period)
        const firstPrice = formatted[0].value;
        setBaseValue(firstPrice);

        // Calculate Y-axis range to center baseline at 0% (middle of chart)
        const values = formatted.map(d => d.value);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        
        // Calculate the maximum deviation from baseline
        const maxDeviation = Math.max(
          Math.abs(maxValue - firstPrice),
          Math.abs(firstPrice - minValue)
        );
        
        // Add 5% padding for visual breathing room
        const paddedDeviation = maxDeviation * 1.05;
        
        // Set symmetric Y-axis bounds around the baseline
        // This centers the baseline horizontally at 0%
        setYAxisMin(firstPrice - paddedDeviation);
        setYAxisMax(firstPrice + paddedDeviation);

        setChartData(formatted);
        
        // Update color based on current price vs baseline
        const lastPrice = formatted[formatted.length - 1].value;
        setPriceColor(lastPrice >= firstPrice ? '#00C853' : '#FF1744');
        
        setError(null);
      } else {
        setError(`No chart data available for ${cleanSymbol}`);
        if (currentPrice) {
          setBaseValue(currentPrice);
          setChartData([{ value: currentPrice, label: 'Now' }]);
        }
      }
    } catch (err: any) {
      console.error('Chart data error:', err);
      const errorMessage =
        err.name === 'AbortError'
          ? 'Request timeout. Please try again.'
          : err.response?.status === 401
          ? 'Invalid API key'
          : `Unable to load chart data for ${cleanSymbol}`;
      
      setError(errorMessage);

      if (currentPrice) {
        setBaseValue(currentPrice);
        setChartData([{ value: currentPrice, label: 'Now' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Chart mounted with symbol:', cleanSymbol);
    
    if (!cleanSymbol) {
      setLoading(false);
      setError('No symbol provided');
      return;
    }

    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    fetchQuote();
    fetchChartData();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Pulse animation for live indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Poll every 30 seconds for 1D, every 60 seconds for others
    if (timeframe === '1D') {
      intervalRef.current = setInterval(() => {
        fetchQuote();
        fetchChartData();
      }, 30000) as any;
    } else {
      intervalRef.current = setInterval(() => {
        fetchQuote();
      }, 60000) as any;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cleanSymbol, timeframe]);

  const handleRetry = () => {
    setError(null);
    fetchQuote();
    fetchChartData();
  };

  // Reset pointer price when touch ends
  const handleTouchEnd = useCallback(() => {
    updatePointerPrice(null);
  }, [updatePointerPrice]);

  if (loading && !chartData.length) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00C853" />
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      </View>
    );
  }

  const priceScale = priceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Price and Stats Section */}
        <View style={styles.priceSection}>
          <Animated.Text 
            style={[
              styles.price,
              { transform: [{ scale: priceScale }] }
            ]}
          >
            {pointerPrice ? `$${pointerPrice.toFixed(2)}` : currentPrice ? `$${currentPrice.toFixed(2)}` : '−'}
          </Animated.Text>
          
          {change !== null && (
            <View style={styles.changeContainer}>
              <View style={[styles.changePill, { backgroundColor: priceColor + '20' }]}>
                <Text style={[styles.changeIcon, { color: priceColor }]}>
                  {change >= 0 ? '▲' : '▼'}
                </Text>
                <Text style={[styles.change, { color: priceColor }]}>
                  ${Math.abs(change).toFixed(2)} ({Math.abs(changePercent || 0).toFixed(2)}%)
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.updateContainer}>
            <Text style={styles.lastUpdated}>
              Updated {lastUpdated.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit' 
              })}
            </Text>
            <Animated.View 
              style={[
                styles.liveIndicator,
                { transform: [{ scale: pulseAnim }] }
              ]}
            />
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <Animated.View 
            style={[
              styles.errorContainer,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Chart Container */}
        <View 
          style={styles.chartWrapper}
          onTouchEnd={handleTouchEnd}
        >
          {/* Horizontal Centerline at 0% */}
          {chartData.length > 0 && baseValue !== null && (
            <View 
              style={[
                styles.centerLine,
                { top: (height * 0.52) / 2 }
              ]}
            >
              {/* Create dotted line with repeating dots */}
              {Array.from({ length: Math.floor(width / 8) }).map((_, index) => (
                <View 
                  key={index}
                  style={[
                    styles.dot,
                    { left: index * 8 }
                  ]}
                />
              ))}
            </View>
          )}

          {chartData.length > 0 && baseValue !== null && (
            <LineChart
              data={chartData}
              height={height * 0.52}
              width={width - 10}
              hideDataPoints
              curved
              curvature={0.3}
              color={priceColor}
              thickness={2.5}
              hideAxesAndRules
              hideYAxisText
              yAxisLabelPrefix="$"
              backgroundColor="transparent"
              spacing={Math.max(1, (width - 40) / chartData.length)}
              initialSpacing={0}
              endSpacing={0}
              yAxisOffset={yAxisMin || 0}
              maxValue={yAxisMax ? yAxisMax - (yAxisMin || 0) : undefined}
              showReferenceLine1
              referenceLine1Position={baseValue}
              referenceLine1Config={{
                color: '#8E8E93',
                thickness: 1.5,
                dashWidth: 8,
                dashGap: 4,
                labelText: '',
                type: 'dashed',
              }}
              pointerConfig={{
                pointerStripHeight: height * 0.52,
                pointerStripColor: priceColor,
                pointerStripWidth: 2,
                strokeDashArray: [5, 5],
                pointerColor: priceColor,
                radius: 6,
                pointerLabelWidth: 130,
                pointerLabelHeight: 90,
                activatePointersOnLongPress: false,
                autoAdjustPointerLabelPosition: true,
                resetPointerOnDataChange: true,
                pointerLabelComponent: (items: any) => {
                  if (!items?.[0]) return null;
                  
                  const currentValue = items[0].value;
                  const currentLabel = items[0].label;
                  const diffFromBase = baseValue ? currentValue - baseValue : 0;
                  const percentChange = baseValue ? ((diffFromBase / baseValue) * 100) : 0;
                  
                  // Store the value in ref (don't call setState here)
                  pointerValueRef.current = currentValue;
                  
                  // Update pointer price using deferred setState
                  if (pointerValueRef.current !== currentValue) {
                    pointerValueRef.current = currentValue;
                    setTimeout(() => {
                      setPointerPrice(currentValue);
                    }, 0);
                  }
                  
                  return (
                    <View style={styles.tooltip}>
                      <Text style={[
                        styles.tooltipChange,
                        { color: diffFromBase >= 0 ? '#00C853' : '#FF1744' }
                      ]}>
                        {diffFromBase >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
                      </Text>
                      <Text style={styles.tooltipLabel}>
                        {currentLabel || ''}
                      </Text>
                    </View>
                  );
                },
                pointerEvents: 'auto',
              }}
              noOfSections={4}
            />
          )}
        </View>

        {/* Timeframe Pills */}
        <View style={styles.timeframeContainer}>
          <View style={styles.timeframeRow}>
            {(['1D', '5D', '1M', '3M', '1Y', 'ALL'] as Timeframe[]).map((tf) => (
              <TouchableOpacity
                key={tf}
                onPress={() => setTimeframe(tf)}
                style={[
                  styles.pill,
                  timeframe === tf && styles.pillActive,
                  timeframe === tf && { backgroundColor: priceColor }
                ]}
                activeOpacity={0.7}
              >
                <Text 
                  style={[
                    styles.pillText, 
                    timeframe === tf && styles.pillTextActive
                  ]}
                >
                  {tf}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  priceSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00C853',
  },
  price: { 
    fontSize: 48, 
    color: '#FFFFFF', 
    fontWeight: '700', 
    letterSpacing: -1,
  },
  changeContainer: {
    marginTop: 8,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  changeIcon: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  change: { 
    fontSize: 16, 
    fontWeight: '600',
  },
  updateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  lastUpdated: { 
    fontSize: 12, 
    color: '#636366', 
    fontWeight: '500',
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: { 
    color: '#8E8E93', 
    marginTop: 16, 
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: { 
    backgroundColor: '#FF453A', 
    marginHorizontal: 20, 
    marginVertical: 12, 
    padding: 16,
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  errorText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    flex: 1,
    fontWeight: '500',
  },
  retryBtn: { 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginLeft: 12,
  },
  retryText: { 
    color: '#FF453A', 
    fontWeight: '700', 
    fontSize: 14,
  },
  chartWrapper: {
    flex: 1,
    marginTop: 10,
    marginBottom: 70,
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 1,
    backgroundColor: '#636366',
    opacity: 0.6,
  },
  tooltip: {
    backgroundColor: '#1C1C1EF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 80,
  },
  tooltipChange: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
  tooltipLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  timeframeContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#000',
  },
  timeframeRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 30,
    padding: 4,
    gap: 4,
  },
  pill: { 
    flex: 1,
    paddingVertical: 10,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { 
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  pillText: { 
    color: '#8E8E93', 
    fontWeight: '600',
    fontSize: 14,
  },
  pillTextActive: { 
    color: '#000000', 
    fontWeight: '700',
  },
});

