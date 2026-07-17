// app/symbol/[symbol]/earnings.tsx - FIXED VERSION
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity 
} from "react-native";
import { useLocalSearchParams, useGlobalSearchParams, useSegments } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";

const FMP_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || "";

interface EarningsData {
  date: string;
  symbol: string;
  eps: number;
  epsEstimated: number;
  time: string;
  revenue: number;
  revenueEstimated: number;
  fiscalDateEnding: string;
  updatedFromDate: string;
}

export default function EarningsTab() {
  const { t } = useLanguage();
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

  const cleanSymbol = symbol 
    ? String(symbol)
        .trim()
        .replace(/^\[|\]$/g, '')
        .replace(/[\(\)\{\}]/g, '')
        .replace(/[^A-Za-z0-9.-]/g, '')
        .toUpperCase() 
    : null;

  const [earnings, setEarnings] = useState<EarningsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = async () => {
    if (!cleanSymbol) {
      setLoading(false);
      setError(t('No symbol provided'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `https://www.wallstreetstocks.ai/api/fmp/api/v3/historical/earning_calendar/${cleanSymbol}?apikey=${FMP_KEY}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      

      if (data && Array.isArray(data) && data.length > 0) {
        // Sort by date, most recent first
        const sorted = data.sort((a: EarningsData, b: EarningsData) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setEarnings(sorted.slice(0, 20)); // Last 20 earnings reports
        setError(null);
      } else {
        setEarnings([]);
        setError(`No earnings data available for ${cleanSymbol}`);
      }
    } catch (err: any) {
      
      
      const errorMessage = err.name === 'AbortError'
        ? t('Request timeout. Please try again.')
        : err.message?.includes('Network')
        ? t('Network error. Check your connection.')
        : `Unable to load earnings data for ${cleanSymbol}`;
      
      setError(errorMessage);
      setEarnings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    
    if (cleanSymbol) {
      fetchEarnings();
    }
  }, [cleanSymbol]);

  const handleRetry = () => {
    fetchEarnings();
  };

  const formatDate = (dateString: string) => {
    // Parse YYYY-MM-DD as a local calendar date; `new Date(str)` treats it as
    // UTC midnight and renders the previous day in US timezones.
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString || '');
    const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: number | null | undefined) => {
    const val = value ?? 0;
    if (val >= 1e9) {
      return `${(val / 1e9).toFixed(2)}B`;
    } else if (val >= 1e6) {
      return `${(val / 1e6).toFixed(2)}M`;
    } else {
      return `${val.toFixed(2)}`;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00C853" />
        <Text style={styles.loading}>{t('Loading earnings data...')}</Text>
      </View>
    );
  }

  if (error && earnings.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>{t('Retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t('Earnings History •')} {cleanSymbol}</Text>

      {earnings.map((earning, index) => {
        const eps = earning.eps ?? 0;
        const epsEstimated = earning.epsEstimated ?? 0;
        const revenue = earning.revenue ?? 0;
        const revenueEstimated = earning.revenueEstimated ?? 0;

        // Not yet reported: no actual EPS (null from the API) or the
        // earnings date is still in the future
        const isUpcoming =
          earning.eps == null ||
          new Date(earning.date).getTime() > Date.now();

        // Only judge beat/miss when an estimate actually exists — otherwise a
        // quarter with no estimate would be scored against a fabricated $0
        // (any profit = "Beat", an exact meet = "Miss").
        const hasEpsEst = earning.epsEstimated != null && earning.epsEstimated !== 0;
        const hasRevEst = earning.revenueEstimated != null && earning.revenueEstimated !== 0;
        const epsBeat = eps >= epsEstimated; // meet counts as beat
        const revenueBeat = revenue >= revenueEstimated;
        const epsDiff = eps - epsEstimated;
        const revenueDiff = revenue - revenueEstimated;

        // Overall verdict for the header badge
        const anyMiss = (hasEpsEst && eps < epsEstimated) || (hasRevEst && revenue < revenueEstimated);
        const hasAnyEst = hasEpsEst || hasRevEst;
        const verdict: 'upcoming' | 'beat' | 'miss' | 'reported' =
          isUpcoming ? 'upcoming' : !hasAnyEst ? 'reported' : anyMiss ? 'miss' : 'beat';
        const verdictColor =
          verdict === 'upcoming' ? '#FFD60A' : verdict === 'miss' ? '#FF1744' : verdict === 'beat' ? '#00C853' : '#8E8E93';
        const verdictBg =
          verdict === 'upcoming' ? '#B8860B20' : verdict === 'miss' ? '#FF174420' : verdict === 'beat' ? '#00C85320' : '#8E8E9320';
        const verdictLabel =
          verdict === 'upcoming' ? t('Upcoming') : verdict === 'miss' ? t('Miss') : verdict === 'beat' ? t('Beat') : t('Reported');

        return (
          <View key={`${earning.date}-${index}`} style={styles.card}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardDate}>{formatDate(earning.date)}</Text>
                <Text style={styles.cardTime}>
                  {earning.time || t('N/A')} • Q{earning.fiscalDateEnding?.slice(5, 7) || '?'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: verdictBg }]}>
                <Text style={[styles.badgeText, { color: verdictColor }]}>
                  {verdictLabel}
                </Text>
              </View>
            </View>

            {/* EPS */}
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Text style={styles.metricLabel}>{t('EPS (Actual)')}</Text>
                <Text style={styles.metricValue}>{isUpcoming ? '—' : `$${eps.toFixed(2)}`}</Text>
              </View>
              <View style={styles.metricRight}>
                <Text style={styles.metricLabel}>{t('EPS (Expected)')}</Text>
                <Text style={styles.metricValue}>{hasEpsEst ? `$${epsEstimated.toFixed(2)}` : '—'}</Text>
              </View>
            </View>
            <View style={styles.differenceRow}>
              {isUpcoming ? (
                <Text style={[styles.differenceText, { color: '#8E8E93' }]}>
                  {t('Report expected')} {formatDate(earning.date)}
                </Text>
              ) : !hasEpsEst ? (
                <Text style={[styles.differenceText, { color: '#8E8E93' }]}>
                  {t('No estimate available')}
                </Text>
              ) : (
                <Text style={[
                  styles.differenceText,
                  { color: epsBeat ? '#00C853' : '#FF1744' }
                ]}>
                  {epsBeat ? '↑' : '↓'} ${Math.abs(epsDiff).toFixed(2)}
                  {epsBeat ? ` ${t('above')}` : ` ${t('below')}`} {t('estimate')}
                </Text>
              )}
            </View>

            {/* Revenue */}
            {revenue > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <Text style={styles.metricLabel}>{t('Revenue (Actual)')}</Text>
                    <Text style={styles.metricValue}>{formatCurrency(revenue)}</Text>
                  </View>
                  <View style={styles.metricRight}>
                    <Text style={styles.metricLabel}>{t('Revenue (Expected)')}</Text>
                    <Text style={styles.metricValue}>{hasRevEst ? formatCurrency(revenueEstimated) : '—'}</Text>
                  </View>
                </View>
                <View style={styles.differenceRow}>
                  {hasRevEst ? (
                    <Text style={[
                      styles.differenceText,
                      { color: revenueBeat ? '#00C853' : '#FF1744' }
                    ]}>
                      {revenueBeat ? '↑' : '↓'} {formatCurrency(Math.abs(revenueDiff))}
                      {revenueBeat ? ` ${t('above')}` : ` ${t('below')}`} {t('estimate')}
                    </Text>
                  ) : (
                    <Text style={[styles.differenceText, { color: '#8E8E93' }]}>
                      {t('No estimate available')}
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000" 
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#000",
    paddingHorizontal: 32,
  },
  loading: { 
    color: "#888", 
    marginTop: 16, 
    fontSize: 16 
  },
  errorText: {
    color: '#FF1744',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#00C853',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: { 
    color: "#fff", 
    fontSize: 22, 
    fontWeight: "bold", 
    padding: 20,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardDate: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardTime: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricLeft: {
    flex: 1,
  },
  metricRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metricLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  metricValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  differenceRow: {
    marginTop: 4,
    marginBottom: 8,
  },
  differenceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E1E1E',
    marginVertical: 12,
  },
});
