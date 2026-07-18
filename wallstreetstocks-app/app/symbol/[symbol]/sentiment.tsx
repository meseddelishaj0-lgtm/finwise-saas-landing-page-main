// app/symbol/[symbol]/sentiment.tsx - WITH CACHING
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";
import { useLocalSearchParams, useGlobalSearchParams, useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "@/context/LanguageContext";

const FMP_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || "";
// v2: cache now stores daily-aggregated rows (old caches held raw hourly rows)
const SENTIMENT_CACHE_PREFIX = 'sentiment_cache_v2_';
const SENTIMENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface SentimentData {
  date: string;
  score: number;
  mentions: number;
}

// FMP returns HOURLY rows with twitterSentiment/stocktwitsSentiment (0-1)
// and activity counts — there is no `score` field. Aggregate into one row
// per day, weighting each platform's sentiment by its post+comment volume.
const processSentiment = (rows: any[]): SentimentData[] => {
  const byDay: Record<string, { weighted: number; weight: number; mentions: number }> = {};

  for (const r of rows) {
    const day = String(r.date || '').split(' ')[0];
    if (!day) continue;

    const twWeight = (r.twitterPosts || 0) + (r.twitterComments || 0);
    const stWeight = (r.stocktwitsPosts || 0) + (r.stocktwitsComments || 0);

    let rowScore = 0;
    let rowWeight = 0;
    if (typeof r.twitterSentiment === 'number' && twWeight > 0) {
      rowScore += r.twitterSentiment * twWeight;
      rowWeight += twWeight;
    }
    if (typeof r.stocktwitsSentiment === 'number' && stWeight > 0) {
      rowScore += r.stocktwitsSentiment * stWeight;
      rowWeight += stWeight;
    }
    if (rowWeight === 0) {
      // No activity counts — fall back to a plain average of what exists
      const vals = [r.twitterSentiment, r.stocktwitsSentiment]
        .filter((v: any) => typeof v === 'number' && isFinite(v));
      if (vals.length === 0) continue;
      rowScore = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
      rowWeight = 1;
    } else {
      rowScore = rowScore / rowWeight;
    }

    if (!byDay[day]) byDay[day] = { weighted: 0, weight: 0, mentions: 0 };
    byDay[day].weighted += rowScore * rowWeight;
    byDay[day].weight += rowWeight;
    byDay[day].mentions += twWeight + stWeight;
  }

  return Object.entries(byDay)
    .map(([day, v]) => ({
      date: day,
      score: v.weight > 0 ? v.weighted / v.weight : 0.5,
      mentions: v.mentions,
    }))
    .filter((d) => isFinite(d.score))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 14);
};

interface AnalystRating {
  symbol: string;
  date: string;
  analystRatingsbuy: number;
  analystRatingsHold: number;
  analystRatingsSell: number;
  analystRatingsStrongBuy: number;
  analystRatingsStrongSell: number;
}

export default function SentimentTab() {
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

  const [sentiment, setSentiment] = useState<SentimentData[]>([]);
  const [ratings, setRatings] = useState<AnalystRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSentiment = useCallback(async (skipCache = false, isCancelled: () => boolean = () => false) => {
    if (!cleanSymbol) {
      if (isCancelled()) return;
      setLoading(false);
      setError(t('No symbol provided'));
      return;
    }

    const cacheKey = `${SENTIMENT_CACHE_PREFIX}${cleanSymbol}`;

    // Try cache first
    if (!skipCache) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { sentimentData, ratingsData, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < SENTIMENT_CACHE_TTL) {
            if (isCancelled()) return;
            if (sentimentData) setSentiment(sentimentData);
            if (ratingsData) setRatings(ratingsData);
            setLoading(false);
            // Continue to fetch fresh data in background
          }
        }
      } catch (e) {
        // Cache miss
      }
    }

    if (isCancelled()) return;
    if (sentiment.length === 0 && !ratings) {
      setLoading(true);
    }
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Fetch both sentiment and analyst ratings in parallel
      const [sentimentRes, ratingsRes] = await Promise.all([
        fetch(
          `https://financialmodelingprep.com/api/v4/historical/social-sentiment?symbol=${cleanSymbol}&apikey=${FMP_KEY}`,
          { signal: controller.signal }
        ),
        fetch(
          `https://financialmodelingprep.com/api/v3/rating/${cleanSymbol}?apikey=${FMP_KEY}`,
          { signal: controller.signal }
        )
      ]);

      clearTimeout(timeoutId);

      let newSentiment = null;
      let newRatings = null;

      // Process sentiment data (hourly rows -> daily aggregates)
      if (sentimentRes.ok) {
        const sentimentData = await sentimentRes.json();
        if (sentimentData && Array.isArray(sentimentData) && sentimentData.length > 0) {
          const daily = processSentiment(sentimentData);
          if (daily.length > 0) {
            newSentiment = daily;
          }
        }
      }

      // Process ratings data
      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json();
        if (ratingsData && Array.isArray(ratingsData) && ratingsData.length > 0) {
          newRatings = ratingsData[0];
        }
      }

      // Skip applying a stale response (symbol changed / unmounted mid-fetch)
      if (isCancelled()) return;

      if (newSentiment) setSentiment(newSentiment);
      if (newRatings) setRatings(newRatings);

      // Cache the data
      if (newSentiment || newRatings) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          sentimentData: newSentiment,
          ratingsData: newRatings,
          timestamp: Date.now()
        }));
      }

      if (!sentimentRes.ok && !ratingsRes.ok && sentiment.length === 0) {
        throw new Error('Unable to fetch sentiment data');
      }

      setError(null);
    } catch (err: any) {
      if (isCancelled()) return;
      // Only show error if we don't have cached data
      if (sentiment.length === 0 && !ratings) {
        const errorMessage = err.name === 'AbortError'
          ? t('Request timeout. Please try again.')
          : err.message?.includes('Network')
          ? t('Network error. Check your connection.')
          : `${t('Limited sentiment data for')} ${cleanSymbol}`;
        setError(errorMessage);
      }
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, [cleanSymbol, sentiment.length, ratings, t]);

  useEffect(() => {
    let cancelled = false;
    if (cleanSymbol) {
      fetchSentiment(false, () => cancelled);
    }
    return () => { cancelled = true; };
  }, [cleanSymbol]);

  const handleRetry = () => {
    fetchSentiment(true); // Skip cache on retry
  };

  const formatDate = (dateString: string) => {
    // Parse "YYYY-MM-DD" as local time (new Date(string) would parse UTC and
    // can render the previous day in western timezones)
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSentimentColor = (score: number) => {
    if (score >= 0.6) return '#00C853';
    if (score >= 0.4) return '#FFA726';
    return '#FF1744';
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 0.7) return 'Very Bullish';
    if (score >= 0.6) return 'Bullish';
    if (score >= 0.4) return 'Neutral';
    if (score >= 0.3) return 'Bearish';
    return 'Very Bearish';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00C853" />
        <Text style={styles.loading}>{t('Loading sentiment data...')}</Text>
      </View>
    );
  }

  const totalRatings = ratings 
    ? (ratings.analystRatingsStrongBuy || 0) + 
      (ratings.analystRatingsbuy || 0) + 
      (ratings.analystRatingsHold || 0) + 
      (ratings.analystRatingsSell || 0) + 
      (ratings.analystRatingsStrongSell || 0)
    : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t('Market Sentiment')} • {cleanSymbol}</Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Analyst Ratings */}
      {ratings && totalRatings > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Analyst Ratings')}</Text>
          <View style={styles.ratingsCard}>
            <View style={styles.ratingRow}>
              <View style={styles.ratingBar}>
                <View 
                  style={[
                    styles.ratingFill, 
                    { 
                      width: `${((ratings.analystRatingsStrongBuy || 0) / totalRatings) * 100}%`,
                      backgroundColor: '#00C853'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.ratingLabel}>
                {t('Strong Buy')} ({ratings.analystRatingsStrongBuy || 0})
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <View style={styles.ratingBar}>
                <View 
                  style={[
                    styles.ratingFill, 
                    { 
                      width: `${((ratings.analystRatingsbuy || 0) / totalRatings) * 100}%`,
                      backgroundColor: '#66BB6A'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.ratingLabel}>
                {t('Buy')} ({ratings.analystRatingsbuy || 0})
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <View style={styles.ratingBar}>
                <View 
                  style={[
                    styles.ratingFill, 
                    { 
                      width: `${((ratings.analystRatingsHold || 0) / totalRatings) * 100}%`,
                      backgroundColor: '#FFA726'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.ratingLabel}>
                {t('Hold')} ({ratings.analystRatingsHold || 0})
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <View style={styles.ratingBar}>
                <View 
                  style={[
                    styles.ratingFill, 
                    { 
                      width: `${((ratings.analystRatingsSell || 0) / totalRatings) * 100}%`,
                      backgroundColor: '#EF5350'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.ratingLabel}>
                {t('Sell')} ({ratings.analystRatingsSell || 0})
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <View style={styles.ratingBar}>
                <View 
                  style={[
                    styles.ratingFill, 
                    { 
                      width: `${((ratings.analystRatingsStrongSell || 0) / totalRatings) * 100}%`,
                      backgroundColor: '#FF1744'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.ratingLabel}>
                {t('Strong Sell')} ({ratings.analystRatingsStrongSell || 0})
              </Text>
            </View>

            <Text style={styles.totalRatings}>
              {t('Total:')} {totalRatings} {totalRatings !== 1 ? t('analysts') : t('analyst')}
            </Text>
          </View>
        </View>
      )}

      {/* Social Sentiment History */}
      {sentiment.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('Social Sentiment History')}</Text>
          {sentiment.map((item, index) => (
            <View key={`${item.date}-${index}`} style={styles.sentimentCard}>
              <View style={styles.sentimentHeader}>
                <View>
                  <Text style={styles.sentimentDate}>{formatDate(item.date)}</Text>
                  {item.mentions > 0 && (
                    <Text style={styles.sentimentMentions}>
                      {item.mentions.toLocaleString()} {t('mentions')}
                    </Text>
                  )}
                </View>
                <View style={[
                  styles.sentimentBadge,
                  { backgroundColor: `${getSentimentColor(item.score)}20` }
                ]}>
                  <Text style={[
                    styles.sentimentBadgeText,
                    { color: getSentimentColor(item.score) }
                  ]}>
                    {t(getSentimentLabel(item.score))}
                  </Text>
                </View>
              </View>
              
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{t('Sentiment Score')}</Text>
                <Text style={[
                  styles.scoreValue,
                  { color: getSentimentColor(item.score) }
                ]}>
                  {(item.score * 100).toFixed(1)}%
                </Text>
              </View>

              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${item.score * 100}%`,
                      backgroundColor: getSentimentColor(item.score)
                    }
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {sentiment.length === 0 && !ratings && (
        <View style={styles.center}>
          <Text style={styles.noDataText}>
            {t('No sentiment data available for')} {cleanSymbol}
          </Text>
        </View>
      )}

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
    minHeight: 400,
  },
  loading: { 
    color: "#888", 
    marginTop: 16, 
    fontSize: 16 
  },
  errorBanner: {
    backgroundColor: '#FF1744',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  retryText: {
    color: '#FF1744',
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: { 
    color: "#fff", 
    fontSize: 22, 
    fontWeight: "bold", 
    padding: 20,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#00C853',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingsCard: {
    backgroundColor: '#111',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  ratingRow: {
    marginBottom: 12,
  },
  ratingBar: {
    height: 24,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  ratingFill: {
    height: '100%',
    borderRadius: 12,
  },
  ratingLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  totalRatings: {
    color: '#888',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  sentimentCard: {
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  sentimentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sentimentDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sentimentMentions: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  sentimentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sentimentBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    color: '#888',
    fontSize: 14,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
});
