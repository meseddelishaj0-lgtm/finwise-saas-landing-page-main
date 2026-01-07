// app/premium/ai-analysis.tsx
// Gold Feature - AI Stock Analysis
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePremiumFeature, FEATURE_TIERS } from '@/hooks/usePremiumFeature';

const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

interface AnalysisResult {
  ticker: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number | null;
  intrinsicValue: number | null;
  aiAnalysis: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  recommendation: string;
}

export default function AIAnalysisScreen() {
  const { canAccess } = usePremiumFeature();
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL']);

  // Redirect to paywall if user doesn't have access
  useEffect(() => {
    if (!canAccess(FEATURE_TIERS.BASIC_ANALYSIS)) {
      router.replace('/(modals)/paywall');
    }
  }, [canAccess]);

  const analyzeStock = async (symbol: string) => {
    if (!symbol.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const tickerUpper = symbol.toUpperCase();

      // Fetch quote data
      const quoteRes = await fetch(`${BASE_URL}/quote/${tickerUpper}?apikey=${FMP_API_KEY}`);
      const quoteData = await quoteRes.json();

      if (!quoteData || !Array.isArray(quoteData) || quoteData.length === 0) {
        setError(`No data found for ${tickerUpper}`);
        setLoading(false);
        return;
      }

      const quote = quoteData[0];

      // Fetch DCF valuation
      const dcfRes = await fetch(`${BASE_URL}/discounted-cash-flow/${tickerUpper}?apikey=${FMP_API_KEY}`);
      const dcfData = await dcfRes.json();
      const intrinsicValue = dcfData?.[0]?.dcf || null;

      // Fetch financial ratios
      const ratiosRes = await fetch(`${BASE_URL}/ratios/${tickerUpper}?limit=1&apikey=${FMP_API_KEY}`);
      const ratiosData = await ratiosRes.json();
      const ratios = ratiosData?.[0] || {};

      // AI Analysis using Claude
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: `You are an expert stock analyst. Analyze ${tickerUpper} (${quote.name}) and provide:

CURRENT DATA:
- Price: $${quote.price}
- Change: ${quote.change} (${quote.changesPercentage?.toFixed(2)}%)
- Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B
- P/E Ratio: ${quote.pe || 'N/A'}
- 52W High: $${quote.yearHigh}
- 52W Low: $${quote.yearLow}
${intrinsicValue ? `- DCF Value: $${intrinsicValue.toFixed(2)}` : ''}
- ROE: ${ratios.returnOnEquity ? (ratios.returnOnEquity * 100).toFixed(2) + '%' : 'N/A'}
- Debt/Equity: ${ratios.debtEquityRatio?.toFixed(2) || 'N/A'}

Provide a comprehensive analysis in this exact JSON format:
{
  "summary": "2-3 sentence investment thesis",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "catalysts": ["catalyst 1", "catalyst 2"],
  "sentiment": "bullish|bearish|neutral",
  "confidence": 75,
  "recommendation": "Strong Buy|Buy|Hold|Sell|Strong Sell",
  "priceTarget": { "low": 150, "mid": 175, "high": 200 },
  "timeframe": "12 months"
}

Return ONLY the JSON, no other text.`
            }
          ],
        })
      });

      const aiData = await aiResponse.json();
      const aiText = aiData.content?.[0]?.text || '';

      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(aiText);
      } catch {
        parsedAnalysis = {
          summary: aiText,
          strengths: [],
          risks: [],
          catalysts: [],
          sentiment: 'neutral',
          confidence: 50,
          recommendation: 'Hold',
          priceTarget: null,
          timeframe: '12 months'
        };
      }

      setResult({
        ticker: tickerUpper,
        company: quote.name,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changesPercentage,
        marketCap: quote.marketCap,
        pe: quote.pe,
        intrinsicValue,
        aiAnalysis: parsedAnalysis.summary,
        sentiment: parsedAnalysis.sentiment,
        confidence: parsedAnalysis.confidence,
        recommendation: parsedAnalysis.recommendation,
        ...parsedAnalysis,
      });

      // Update recent searches
      setRecentSearches(prev => {
        const updated = [tickerUpper, ...prev.filter(t => t !== tickerUpper)].slice(0, 5);
        return updated;
      });

    } catch (err) {
      console.error('Analysis error:', err);
      setError('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return '#34C759';
      case 'bearish': return '#FF3B30';
      default: return '#FF9500';
    }
  };

  const getRecommendationColor = (rec: string) => {
    if (rec.includes('Buy')) return '#34C759';
    if (rec.includes('Sell')) return '#FF3B30';
    return '#FF9500';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.goldBadge}>
            <Ionicons name="star" size={14} color="#000" />
            <Text style={styles.goldBadgeText}>Gold</Text>
          </View>
          <Text style={styles.headerTitle}>AI Stock Analysis</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Input */}
        <View style={styles.searchCard}>
          <View style={styles.inputContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.input}
              placeholder="Enter stock symbol (e.g., AAPL)"
              placeholderTextColor="#8E8E93"
              value={ticker}
              onChangeText={setTicker}
              autoCapitalize="characters"
              onSubmitEditing={() => analyzeStock(ticker)}
            />
            {ticker.length > 0 && (
              <TouchableOpacity onPress={() => setTicker('')}>
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.analyzeButton, loading && styles.buttonDisabled]}
            onPress={() => analyzeStock(ticker)}
            disabled={loading || !ticker.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="analytics" size={20} color="#000" />
                <Text style={styles.analyzeButtonText}>Analyze</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Recent Searches */}
          <View style={styles.recentContainer}>
            <Text style={styles.recentLabel}>Quick Analysis:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentSearches.map((sym) => (
                <TouchableOpacity
                  key={sym}
                  style={styles.recentChip}
                  onPress={() => {
                    setTicker(sym);
                    analyzeStock(sym);
                  }}
                >
                  <Text style={styles.recentChipText}>{sym}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={24} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Analyzing {ticker.toUpperCase()}...</Text>
            <Text style={styles.loadingSubtext}>Gathering data and running AI analysis</Text>
          </View>
        )}

        {/* Results */}
        {result && !loading && (
          <View style={styles.resultsContainer}>
            {/* Stock Header */}
            <View style={styles.stockHeader}>
              <View>
                <Text style={styles.stockTicker}>{result.ticker}</Text>
                <Text style={styles.stockCompany}>{result.company}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.stockPrice}>${result.price.toFixed(2)}</Text>
                <View style={[
                  styles.changeContainer,
                  { backgroundColor: result.change >= 0 ? '#34C75915' : '#FF3B3015' }
                ]}>
                  <Ionicons
                    name={result.change >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={14}
                    color={result.change >= 0 ? '#34C759' : '#FF3B30'}
                  />
                  <Text style={[
                    styles.changeText,
                    { color: result.change >= 0 ? '#34C759' : '#FF3B30' }
                  ]}>
                    {result.changePercent?.toFixed(2)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Recommendation Card */}
            <View style={[styles.recommendationCard, { borderColor: getRecommendationColor(result.recommendation) }]}>
              <View style={styles.recommendationHeader}>
                <Text style={styles.recommendationLabel}>AI Recommendation</Text>
                <View style={[styles.sentimentBadge, { backgroundColor: getSentimentColor(result.sentiment) }]}>
                  <Text style={styles.sentimentText}>{result.sentiment.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={[styles.recommendationText, { color: getRecommendationColor(result.recommendation) }]}>
                {result.recommendation}
              </Text>
              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceFill, { width: `${result.confidence}%` }]} />
              </View>
              <Text style={styles.confidenceText}>{result.confidence}% Confidence</Text>
            </View>

            {/* AI Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="bulb" size={20} color="#FFD700" />
                <Text style={styles.cardTitle}>Investment Thesis</Text>
              </View>
              <Text style={styles.summaryText}>{result.aiAnalysis}</Text>
            </View>

            {/* Valuation */}
            {result.intrinsicValue && (
              <View style={styles.valuationCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="calculator" size={20} color="#007AFF" />
                  <Text style={styles.cardTitle}>Valuation</Text>
                </View>
                <View style={styles.valuationRow}>
                  <View style={styles.valuationItem}>
                    <Text style={styles.valuationLabel}>Current Price</Text>
                    <Text style={styles.valuationValue}>${result.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.valuationItem}>
                    <Text style={styles.valuationLabel}>Fair Value (DCF)</Text>
                    <Text style={styles.valuationValue}>${result.intrinsicValue.toFixed(2)}</Text>
                  </View>
                  <View style={styles.valuationItem}>
                    <Text style={styles.valuationLabel}>Upside/Downside</Text>
                    <Text style={[
                      styles.valuationValue,
                      { color: result.intrinsicValue > result.price ? '#34C759' : '#FF3B30' }
                    ]}>
                      {((result.intrinsicValue - result.price) / result.price * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Strengths */}
            {(result as any).strengths?.length > 0 && (
              <View style={styles.listCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                  <Text style={styles.cardTitle}>Key Strengths</Text>
                </View>
                {(result as any).strengths.map((item: string, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <View style={[styles.listBullet, { backgroundColor: '#34C759' }]} />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Risks */}
            {(result as any).risks?.length > 0 && (
              <View style={styles.listCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="warning" size={20} color="#FF3B30" />
                  <Text style={styles.cardTitle}>Key Risks</Text>
                </View>
                {(result as any).risks.map((item: string, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <View style={[styles.listBullet, { backgroundColor: '#FF3B30' }]} />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Price Targets */}
            {(result as any).priceTarget && (
              <View style={styles.priceTargetCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="trending-up" size={20} color="#007AFF" />
                  <Text style={styles.cardTitle}>Price Targets ({(result as any).timeframe})</Text>
                </View>
                <View style={styles.priceTargetRow}>
                  <View style={styles.priceTargetItem}>
                    <Text style={styles.priceTargetLabel}>Bear Case</Text>
                    <Text style={[styles.priceTargetValue, { color: '#FF3B30' }]}>
                      ${(result as any).priceTarget.low}
                    </Text>
                  </View>
                  <View style={styles.priceTargetItem}>
                    <Text style={styles.priceTargetLabel}>Base Case</Text>
                    <Text style={[styles.priceTargetValue, { color: '#007AFF' }]}>
                      ${(result as any).priceTarget.mid}
                    </Text>
                  </View>
                  <View style={styles.priceTargetItem}>
                    <Text style={styles.priceTargetLabel}>Bull Case</Text>
                    <Text style={[styles.priceTargetValue, { color: '#34C759' }]}>
                      ${(result as any).priceTarget.high}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={16} color="#8E8E93" />
              <Text style={styles.disclaimerText}>
                AI analysis is for informational purposes only. Not financial advice.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  goldBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  searchCard: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  recentContainer: {
    marginTop: 16,
  },
  recentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  recentChip: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  recentChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B3015',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '500',
  },
  loadingCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  resultsContainer: {
    paddingHorizontal: 16,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  stockTicker: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },
  stockCompany: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    gap: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recommendationCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  sentimentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  recommendationText: {
    fontSize: 28,
    fontWeight: '800',
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 6,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  summaryText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  valuationCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  valuationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  valuationItem: {
    alignItems: 'center',
  },
  valuationLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  valuationValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  listCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 10,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  priceTargetCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  priceTargetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceTargetItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceTargetLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  priceTargetValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
