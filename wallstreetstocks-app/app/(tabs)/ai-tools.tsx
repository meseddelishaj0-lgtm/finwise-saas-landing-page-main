// app/(tabs)/ai-tools.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface StockAnalysis {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number | null;
  eps: number | null;
  yearHigh: number;
  yearLow: number;
  volume: number;
  avgVolume: number;
  // DCF Data
  dcfValue: number | null;
  dcfDiff: number | null;
  dcfDiffPercent: number | null;
  isUndervalued: boolean;
  // Ratios
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  // Growth
  revenueGrowth: number | null;
  netIncomeGrowth: number | null;
  // AI Analysis
  aiSummary: string;
  strengths: string[];
  risks: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  recommendation: string;
  priceTarget: { low: number; mid: number; high: number } | null;
}

interface CompareStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number | null;
  eps: number | null;
  yearHigh: number;
  yearLow: number;
  dcfValue: number | null;
  dcfDiffPercent: number | null;
  isUndervalued: boolean;
  roe: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowth: number | null;
  netIncomeGrowth: number | null;
  dividendYield: number | null;
}

interface ComparisonResult {
  stock1: CompareStock;
  stock2: CompareStock;
  winner: string;
  aiVerdict: string;
  categories: {
    growth: string;
    value: string;
    safety: string;
    momentum: string;
  };
}

interface ForecastResult {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  yearHigh: number;
  yearLow: number;
  momentum: number;
  volatility: number;
  avgVolume: number;
  priceTargets: {
    conservative: number;
    base: number;
    bullish: number;
  };
  probabilities: {
    upside: number;
    downside: number;
  };
  timeframe: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  recommendation: string;
  catalysts: string[];
  risks: string[];
  technicalSignals: {
    trend: 'uptrend' | 'downtrend' | 'sideways';
    support: number;
    resistance: number;
  };
  summary: string;
}

interface ResourceCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}

const RESOURCE_CATEGORIES: ResourceCategory[] = [
  { id: 'finance', title: 'Finance', icon: 'wallet-outline', color: '#007AFF', description: 'Personal finance and wealth building' },
  { id: 'accounting', title: 'Accounting', icon: 'calculator-outline', color: '#34C759', description: 'Financial statements and bookkeeping' },
  { id: 'real-estate', title: 'Real Estate', icon: 'home-outline', color: '#FF9500', description: 'Property investing and REITs' },
  { id: 'insurance', title: 'Insurance', icon: 'shield-checkmark-outline', color: '#5856D6', description: 'Risk protection and policies' },
  { id: 'taxes', title: 'Taxes', icon: 'document-text-outline', color: '#FF3B30', description: 'Tax strategies and deductions' },
  { id: 'market', title: 'Market', icon: 'trending-up-outline', color: '#00C853', description: 'Market analysis and trends' },
  { id: 'tools', title: 'Tools', icon: 'construct-outline', color: '#AF52DE', description: 'Calculators and planning tools' },
  { id: 'business', title: 'Business', icon: 'briefcase-outline', color: '#FF6B35', description: 'Entrepreneurship and business finance' },
];

const QUICK_PICKS = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'];

export default function AITools() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analyzer' | 'compare' | 'forecast' | 'assistant' | 'resources'>('analyzer');

  // Stock Analyzer
  const [analyzerTicker, setAnalyzerTicker] = useState('');
  const [analyzerLoading, setAnalyzerLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StockAnalysis | null>(null);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);

  // Stock Comparison
  const [compareTicker1, setCompareTicker1] = useState('');
  const [compareTicker2, setCompareTicker2] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  // AI Forecast
  const [forecastTicker, setForecastTicker] = useState('');
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  // AI Assistant
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI Trading Assistant. I can help you with market analysis, trading strategies, stock research, and portfolio advice. What would you like to know?"
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

  // Enhanced Stock Analyzer Function with AI
  const handleAnalyze = async (ticker?: string) => {
    const symbol = (ticker || analyzerTicker).toUpperCase().trim();
    if (!symbol) return;

    setAnalyzerLoading(true);
    setAnalysisResult(null);
    setAnalyzerError(null);
    setAnalyzerTicker(symbol);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAnalyzerError(data.error || `No data found for ${symbol}`);
        return;
      }

      setAnalysisResult(data);
    } catch (err) {
      console.error('Analyzer error:', err);
      setAnalyzerError('Analysis failed. Please try again.');
    } finally {
      setAnalyzerLoading(false);
    }
  };

  // Stock Comparison Function
  const handleCompare = async () => {
    if (!compareTicker1.trim() || !compareTicker2.trim()) return;

    const ticker1 = compareTicker1.toUpperCase().trim();
    const ticker2 = compareTicker2.toUpperCase().trim();

    if (ticker1 === ticker2) {
      setCompareError('Please enter two different tickers to compare.');
      return;
    }

    setCompareLoading(true);
    setComparisonResult(null);
    setCompareError(null);

    try {
      // Fetch all data for both stocks in parallel
      const [
        quote1Res, quote2Res,
        dcf1Res, dcf2Res,
        ratios1Res, ratios2Res,
        growth1Res, growth2Res
      ] = await Promise.all([
        fetch(`${BASE_URL}/quote/${ticker1}?apikey=${FMP_API_KEY}`),
        fetch(`${BASE_URL}/quote/${ticker2}?apikey=${FMP_API_KEY}`),
        fetch(`${BASE_URL}/discounted-cash-flow/${ticker1}?apikey=${FMP_API_KEY}`),
        fetch(`${BASE_URL}/discounted-cash-flow/${ticker2}?apikey=${FMP_API_KEY}`),
        fetch(`${BASE_URL}/ratios/${ticker1}?limit=1&apikey=${FMP_API_KEY}`),
        fetch(`${BASE_URL}/ratios/${ticker2}?limit=1&apikey=${FMP_API_KEY}`),
        fetch(`${BASE_URL}/financial-growth/${ticker1}?limit=1&apikey=${FMP_API_KEY}`),
        fetch(`${BASE_URL}/financial-growth/${ticker2}?limit=1&apikey=${FMP_API_KEY}`),
      ]);

      const [
        quote1Data, quote2Data,
        dcf1Data, dcf2Data,
        ratios1Data, ratios2Data,
        growth1Data, growth2Data
      ] = await Promise.all([
        quote1Res.json(), quote2Res.json(),
        dcf1Res.json(), dcf2Res.json(),
        ratios1Res.json(), ratios2Res.json(),
        growth1Res.json(), growth2Res.json(),
      ]);

      if (!quote1Data?.[0] || !quote2Data?.[0]) {
        setCompareError('Could not find data for one or both tickers.');
        setCompareLoading(false);
        return;
      }

      const quote1 = quote1Data[0];
      const quote2 = quote2Data[0];
      const dcf1 = dcf1Data?.[0];
      const dcf2 = dcf2Data?.[0];
      const ratios1 = ratios1Data?.[0] || {};
      const ratios2 = ratios2Data?.[0] || {};
      const growth1 = growth1Data?.[0] || {};
      const growth2 = growth2Data?.[0] || {};

      // Build stock comparison objects
      const buildStockData = (quote: any, dcf: any, ratios: any, growth: any): CompareStock => {
        const dcfValue = dcf?.dcf || null;
        const dcfDiffPercent = dcfValue && quote.price ? ((dcfValue - quote.price) / quote.price) * 100 : null;
        return {
          symbol: quote.symbol,
          name: quote.name || quote.symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changesPercentage,
          marketCap: quote.marketCap,
          pe: quote.pe,
          eps: quote.eps,
          yearHigh: quote.yearHigh,
          yearLow: quote.yearLow,
          dcfValue,
          dcfDiffPercent,
          isUndervalued: dcfDiffPercent ? dcfDiffPercent > 0 : false,
          roe: ratios.returnOnEquity ? ratios.returnOnEquity * 100 : null,
          debtToEquity: ratios.debtEquityRatio,
          currentRatio: ratios.currentRatio,
          revenueGrowth: growth.revenueGrowth ? growth.revenueGrowth * 100 : null,
          netIncomeGrowth: growth.netIncomeGrowth ? growth.netIncomeGrowth * 100 : null,
          dividendYield: ratios.dividendYield ? ratios.dividendYield * 100 : null,
        };
      };

      const stock1 = buildStockData(quote1, dcf1, ratios1, growth1);
      const stock2 = buildStockData(quote2, dcf2, ratios2, growth2);

      // AI Analysis for comparison
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `Compare ${ticker1} vs ${ticker2} for investment:

${ticker1}: Price $${stock1.price}, MCap $${(stock1.marketCap/1e9).toFixed(1)}B, PE ${stock1.pe || 'N/A'}, ROE ${stock1.roe?.toFixed(1) || 'N/A'}%, Revenue Growth ${stock1.revenueGrowth?.toFixed(1) || 'N/A'}%, DCF ${stock1.dcfDiffPercent ? (stock1.isUndervalued ? 'Undervalued' : 'Overvalued') + ' by ' + Math.abs(stock1.dcfDiffPercent).toFixed(1) + '%' : 'N/A'}

${ticker2}: Price $${stock2.price}, MCap $${(stock2.marketCap/1e9).toFixed(1)}B, PE ${stock2.pe || 'N/A'}, ROE ${stock2.roe?.toFixed(1) || 'N/A'}%, Revenue Growth ${stock2.revenueGrowth?.toFixed(1) || 'N/A'}%, DCF ${stock2.dcfDiffPercent ? (stock2.isUndervalued ? 'Undervalued' : 'Overvalued') + ' by ' + Math.abs(stock2.dcfDiffPercent).toFixed(1) + '%' : 'N/A'}

Return JSON only:
{
  "winner": "${ticker1}|${ticker2}|TIE",
  "verdict": "2-3 sentence final verdict explaining the winner",
  "growth": "${ticker1}|${ticker2}",
  "value": "${ticker1}|${ticker2}",
  "safety": "${ticker1}|${ticker2}",
  "momentum": "${ticker1}|${ticker2}"
}`
          }]
        })
      });

      const aiData = await aiResponse.json();
      let parsedAI;
      try {
        parsedAI = JSON.parse(aiData.content?.[0]?.text || '{}');
      } catch {
        parsedAI = {
          winner: 'TIE',
          verdict: 'Both stocks have their merits. Review the metrics below to make your decision.',
          growth: stock1.revenueGrowth && stock2.revenueGrowth ? (stock1.revenueGrowth > stock2.revenueGrowth ? ticker1 : ticker2) : ticker1,
          value: stock1.pe && stock2.pe ? (stock1.pe < stock2.pe ? ticker1 : ticker2) : ticker1,
          safety: stock1.debtToEquity && stock2.debtToEquity ? (stock1.debtToEquity < stock2.debtToEquity ? ticker1 : ticker2) : ticker1,
          momentum: stock1.changePercent > stock2.changePercent ? ticker1 : ticker2,
        };
      }

      setComparisonResult({
        stock1,
        stock2,
        winner: parsedAI.winner || 'TIE',
        aiVerdict: parsedAI.verdict || 'Review the comparison below.',
        categories: {
          growth: parsedAI.growth || ticker1,
          value: parsedAI.value || ticker1,
          safety: parsedAI.safety || ticker1,
          momentum: parsedAI.momentum || ticker1,
        }
      });
    } catch (err) {
      console.error('Compare error:', err);
      setCompareError('Comparison failed. Please try again.');
    } finally {
      setCompareLoading(false);
    }
  };

  // AI Forecast Function
  const handleForecast = async (ticker?: string) => {
    const symbol = (ticker || forecastTicker).toUpperCase().trim();
    if (!symbol) return;

    setForecastLoading(true);
    setForecastResult(null);
    setForecastError(null);
    setForecastTicker(symbol);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, timeframe: '3 months' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setForecastError(data.error || `No data found for ${symbol}`);
        return;
      }

      setForecastResult(data);
    } catch (err) {
      console.error('Forecast error:', err);
      setForecastError('Forecast failed. Please try again.');
    } finally {
      setForecastLoading(false);
    }
  };

  // AI Assistant Handler
  const handleAssistantMessage = async () => {
    const input = userInput.trim();
    if (!input || assistantLoading) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setAssistantLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-10), // Send recent history for context
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error('Assistant error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please check your connection and try again."
      }]);
    } finally {
      setAssistantLoading(false);
    }
  };

  // Suggested questions for assistant
  const SUGGESTED_QUESTIONS = [
    { icon: 'trending-up', text: 'What stocks are trending today?', color: '#00C853' },
    { icon: 'analytics', text: 'Explain P/E ratio', color: '#007AFF' },
    { icon: 'shield-checkmark', text: 'How to diversify my portfolio?', color: '#5856D6' },
    { icon: 'warning', text: 'What are the risks of day trading?', color: '#FF9500' },
  ];

  // Helper functions
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '—';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  };

  const getRecommendationColor = (rec: string) => {
    if (rec.includes('Strong Buy')) return '#00C853';
    if (rec.includes('Buy')) return '#4CAF50';
    if (rec.includes('Sell')) return '#FF3B30';
    return '#FF9500';
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'bullish') return '#00C853';
    if (sentiment === 'bearish') return '#FF3B30';
    return '#FF9500';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconBg}>
              <Ionicons name="sparkles" size={28} color="#007AFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>AI Tools</Text>
              <Text style={styles.headerSubtitle}>Powered by Advanced Analytics</Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'analyzer', icon: 'analytics', label: 'Analyzer' },
              { key: 'compare', icon: 'git-compare', label: 'Compare' },
              { key: 'forecast', icon: 'trending-up', label: 'Forecast' },
              { key: 'assistant', icon: 'chatbubbles', label: 'Assistant' },
              { key: 'resources', icon: 'library', label: 'Resources' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key as any)}
              >
                <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? '#007AFF' : '#8E8E93'} />
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stock Analyzer Tab - NEW DESIGN */}
        {activeTab === 'analyzer' && (
          <View style={styles.analyzerContainer}>
            {/* Search Card */}
            <View style={styles.searchCard}>
              <Text style={styles.searchTitle}>Stock Analyzer</Text>
              <Text style={styles.searchSubtitle}>DCF Valuation & AI-Powered Analysis</Text>

              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#8E8E93" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter ticker symbol (e.g., AAPL)"
                  placeholderTextColor="#8E8E93"
                  value={analyzerTicker}
                  onChangeText={setAnalyzerTicker}
                  autoCapitalize="characters"
                  onSubmitEditing={() => handleAnalyze()}
                />
                {analyzerTicker.length > 0 && (
                  <TouchableOpacity onPress={() => { setAnalyzerTicker(''); setAnalysisResult(null); }}>
                    <Ionicons name="close-circle" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.analyzeButton, analyzerLoading && styles.buttonDisabled]}
                onPress={() => handleAnalyze()}
                disabled={analyzerLoading || !analyzerTicker.trim()}
              >
                {analyzerLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="flash" size={20} color="#FFF" />
                    <Text style={styles.analyzeButtonText}>Analyze Stock</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Quick Picks */}
              <View style={styles.quickPicksContainer}>
                <Text style={styles.quickPicksLabel}>Quick Analysis:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {QUICK_PICKS.map((symbol) => (
                    <TouchableOpacity
                      key={symbol}
                      style={styles.quickPickChip}
                      onPress={() => handleAnalyze(symbol)}
                    >
                      <Text style={styles.quickPickText}>{symbol}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Error State */}
            {analyzerError && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={24} color="#FF3B30" />
                <Text style={styles.errorText}>{analyzerError}</Text>
              </View>
            )}

            {/* Loading State */}
            {analyzerLoading && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Analyzing {analyzerTicker}...</Text>
                <Text style={styles.loadingSubtext}>Fetching DCF valuation & running AI analysis</Text>
              </View>
            )}

            {/* Analysis Results */}
            {analysisResult && !analyzerLoading && (
              <>
                {/* Stock Header Card */}
                <View style={styles.stockHeaderCard}>
                  <View style={styles.stockHeaderTop}>
                    <View>
                      <Text style={styles.stockSymbol}>{analysisResult.symbol}</Text>
                      <Text style={styles.stockName}>{analysisResult.name}</Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={styles.stockPrice}>${analysisResult.price.toFixed(2)}</Text>
                      <View style={[styles.changeBadge, { backgroundColor: analysisResult.change >= 0 ? '#00C85320' : '#FF3B3020' }]}>
                        <Ionicons name={analysisResult.change >= 0 ? 'arrow-up' : 'arrow-down'} size={14} color={analysisResult.change >= 0 ? '#00C853' : '#FF3B30'} />
                        <Text style={[styles.changeText, { color: analysisResult.change >= 0 ? '#00C853' : '#FF3B30' }]}>
                          {Math.abs(analysisResult.changePercent).toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Recommendation Badge */}
                  <View style={[styles.recommendationBadge, { backgroundColor: getRecommendationColor(analysisResult.recommendation) }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                    <Text style={styles.recommendationText}>{analysisResult.recommendation}</Text>
                    <Text style={styles.confidenceText}>{analysisResult.confidence}% Confidence</Text>
                  </View>
                </View>

                {/* DCF Valuation Card */}
                {analysisResult.dcfValue && (
                  <View style={styles.dcfCard}>
                    <View style={styles.dcfHeader}>
                      <Ionicons name="calculator" size={22} color="#007AFF" />
                      <Text style={styles.dcfTitle}>DCF Valuation</Text>
                    </View>

                    <View style={styles.dcfContent}>
                      <View style={styles.dcfValueRow}>
                        <View style={styles.dcfValueItem}>
                          <Text style={styles.dcfLabel}>Current Price</Text>
                          <Text style={styles.dcfValue}>${analysisResult.price.toFixed(2)}</Text>
                        </View>
                        <View style={styles.dcfArrow}>
                          <Ionicons name="arrow-forward" size={24} color="#8E8E93" />
                        </View>
                        <View style={styles.dcfValueItem}>
                          <Text style={styles.dcfLabel}>Intrinsic Value</Text>
                          <Text style={[styles.dcfValue, { color: '#007AFF' }]}>${analysisResult.dcfValue.toFixed(2)}</Text>
                        </View>
                      </View>

                      <View style={[styles.valuationBadge, { backgroundColor: analysisResult.isUndervalued ? '#00C85315' : '#FF3B3015' }]}>
                        <Ionicons
                          name={analysisResult.isUndervalued ? 'trending-up' : 'trending-down'}
                          size={20}
                          color={analysisResult.isUndervalued ? '#00C853' : '#FF3B30'}
                        />
                        <View>
                          <Text style={[styles.valuationStatus, { color: analysisResult.isUndervalued ? '#00C853' : '#FF3B30' }]}>
                            {analysisResult.isUndervalued ? 'Undervalued' : 'Overvalued'}
                          </Text>
                          <Text style={styles.valuationPercent}>
                            by ${Math.abs(analysisResult.dcfDiff || 0).toFixed(2)} ({Math.abs(analysisResult.dcfDiffPercent || 0).toFixed(1)}%)
                          </Text>
                        </View>
                      </View>

                      {/* Valuation Gauge */}
                      <View style={styles.gaugeContainer}>
                        <View style={styles.gaugeTrack}>
                          <View
                            style={[
                              styles.gaugeFill,
                              {
                                width: `${Math.min(Math.max((analysisResult.price / analysisResult.dcfValue) * 50, 10), 90)}%`,
                                backgroundColor: analysisResult.isUndervalued ? '#00C853' : '#FF3B30',
                              },
                            ]}
                          />
                          <View style={[styles.gaugeMarker, { left: '50%' }]} />
                        </View>
                        <View style={styles.gaugeLabels}>
                          <Text style={styles.gaugeLabel}>Cheap</Text>
                          <Text style={styles.gaugeLabel}>Fair Value</Text>
                          <Text style={styles.gaugeLabel}>Expensive</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* AI Summary Card */}
                <View style={styles.aiSummaryCard}>
                  <View style={styles.aiSummaryHeader}>
                    <View style={[styles.sentimentBadge, { backgroundColor: getSentimentColor(analysisResult.sentiment) }]}>
                      <Ionicons
                        name={analysisResult.sentiment === 'bullish' ? 'trending-up' : analysisResult.sentiment === 'bearish' ? 'trending-down' : 'remove'}
                        size={16}
                        color="#FFF"
                      />
                      <Text style={styles.sentimentText}>{analysisResult.sentiment.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.aiSummaryText}>{analysisResult.aiSummary}</Text>
                </View>

                {/* Key Metrics Grid */}
                <View style={styles.metricsCard}>
                  <Text style={styles.metricsTitle}>Key Metrics</Text>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Market Cap</Text>
                      <Text style={styles.metricValue}>{formatNumber(analysisResult.marketCap)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>P/E Ratio</Text>
                      <Text style={styles.metricValue}>{analysisResult.pe?.toFixed(2) || '—'}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>EPS</Text>
                      <Text style={styles.metricValue}>${analysisResult.eps?.toFixed(2) || '—'}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>52W High</Text>
                      <Text style={styles.metricValue}>${analysisResult.yearHigh?.toFixed(2) || '—'}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>52W Low</Text>
                      <Text style={styles.metricValue}>${analysisResult.yearLow?.toFixed(2) || '—'}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>ROE</Text>
                      <Text style={[styles.metricValue, { color: (analysisResult.roe || 0) > 15 ? '#00C853' : '#000' }]}>
                        {analysisResult.roe?.toFixed(1) || '—'}%
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Debt/Equity</Text>
                      <Text style={[styles.metricValue, { color: (analysisResult.debtToEquity || 0) < 1 ? '#00C853' : '#FF9500' }]}>
                        {analysisResult.debtToEquity?.toFixed(2) || '—'}
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Revenue Growth</Text>
                      <Text style={[styles.metricValue, { color: (analysisResult.revenueGrowth || 0) > 0 ? '#00C853' : '#FF3B30' }]}>
                        {analysisResult.revenueGrowth?.toFixed(1) || '—'}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Strengths & Risks */}
                <View style={styles.analysisCards}>
                  <View style={styles.strengthsCard}>
                    <View style={styles.listHeader}>
                      <Ionicons name="checkmark-circle" size={20} color="#00C853" />
                      <Text style={styles.listTitle}>Key Strengths</Text>
                    </View>
                    {analysisResult.strengths.map((item, idx) => (
                      <View key={idx} style={styles.listItem}>
                        <View style={[styles.listBullet, { backgroundColor: '#00C853' }]} />
                        <Text style={styles.listText}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.risksCard}>
                    <View style={styles.listHeader}>
                      <Ionicons name="warning" size={20} color="#FF3B30" />
                      <Text style={styles.listTitle}>Key Risks</Text>
                    </View>
                    {analysisResult.risks.map((item, idx) => (
                      <View key={idx} style={styles.listItem}>
                        <View style={[styles.listBullet, { backgroundColor: '#FF3B30' }]} />
                        <Text style={styles.listText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Price Targets */}
                {analysisResult.priceTarget && (
                  <View style={styles.priceTargetCard}>
                    <View style={styles.priceTargetHeader}>
                      <Ionicons name="flag" size={20} color="#007AFF" />
                      <Text style={styles.priceTargetTitle}>12-Month Price Targets</Text>
                    </View>
                    <View style={styles.priceTargetRow}>
                      <View style={styles.priceTargetItem}>
                        <Text style={styles.priceTargetLabel}>Bear Case</Text>
                        <Text style={[styles.priceTargetValue, { color: '#FF3B30' }]}>${analysisResult.priceTarget.low}</Text>
                      </View>
                      <View style={styles.priceTargetItem}>
                        <Text style={styles.priceTargetLabel}>Base Case</Text>
                        <Text style={[styles.priceTargetValue, { color: '#007AFF' }]}>${analysisResult.priceTarget.mid}</Text>
                      </View>
                      <View style={styles.priceTargetItem}>
                        <Text style={styles.priceTargetLabel}>Bull Case</Text>
                        <Text style={[styles.priceTargetValue, { color: '#00C853' }]}>${analysisResult.priceTarget.high}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* View Chart Button */}
                <TouchableOpacity
                  style={styles.viewChartButton}
                  onPress={() => router.push(`/symbol/${analysisResult.symbol}/chart`)}
                >
                  <Ionicons name="stats-chart" size={20} color="#007AFF" />
                  <Text style={styles.viewChartText}>View Full Chart & Fundamentals</Text>
                  <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                </TouchableOpacity>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                  <Ionicons name="information-circle" size={16} color="#8E8E93" />
                  <Text style={styles.disclaimerText}>AI analysis is for informational purposes only. Not financial advice.</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Stock Comparison Tab */}
        {activeTab === 'compare' && (
          <View style={styles.compareContainer}>
            {/* Search Card */}
            <View style={styles.searchCard}>
              <Text style={styles.searchTitle}>Stock Comparison</Text>
              <Text style={styles.searchSubtitle}>Side-by-side analysis with DCF valuation</Text>

              <View style={styles.compareInputRow}>
                <View style={styles.compareInputWrapper}>
                  <View style={[styles.compareInputBox, compareTicker1 && styles.compareInputBoxActive]}>
                    <Ionicons name="business" size={18} color={compareTicker1 ? '#007AFF' : '#8E8E93'} />
                    <TextInput
                      style={styles.compareInput}
                      placeholder="AAPL"
                      placeholderTextColor="#C7C7CC"
                      value={compareTicker1}
                      onChangeText={setCompareTicker1}
                      autoCapitalize="characters"
                      maxLength={5}
                    />
                  </View>
                  <Text style={styles.compareInputLabel}>Stock 1</Text>
                </View>

                <View style={styles.vsCircle}>
                  <Text style={styles.vsCircleText}>VS</Text>
                </View>

                <View style={styles.compareInputWrapper}>
                  <View style={[styles.compareInputBox, compareTicker2 && styles.compareInputBoxActive]}>
                    <Ionicons name="business" size={18} color={compareTicker2 ? '#FF9500' : '#8E8E93'} />
                    <TextInput
                      style={styles.compareInput}
                      placeholder="MSFT"
                      placeholderTextColor="#C7C7CC"
                      value={compareTicker2}
                      onChangeText={setCompareTicker2}
                      autoCapitalize="characters"
                      maxLength={5}
                    />
                  </View>
                  <Text style={styles.compareInputLabel}>Stock 2</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.analyzeButton, (compareLoading || !compareTicker1 || !compareTicker2) && styles.buttonDisabled]}
                onPress={handleCompare}
                disabled={compareLoading || !compareTicker1.trim() || !compareTicker2.trim()}
              >
                {compareLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="git-compare" size={20} color="#FFF" />
                    <Text style={styles.analyzeButtonText}>Compare Stocks</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Quick Compare Suggestions */}
              <View style={styles.quickCompareSuggestions}>
                <Text style={styles.quickPicksLabel}>Popular Comparisons:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    ['AAPL', 'MSFT'], ['NVDA', 'AMD'], ['GOOGL', 'META'], ['TSLA', 'RIVN'], ['JPM', 'BAC']
                  ].map(([t1, t2], idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.quickCompareChip}
                      onPress={() => { setCompareTicker1(t1); setCompareTicker2(t2); }}
                    >
                      <Text style={styles.quickCompareText}>{t1} vs {t2}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Error State */}
            {compareError && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={24} color="#FF3B30" />
                <Text style={styles.errorText}>{compareError}</Text>
              </View>
            )}

            {/* Loading State */}
            {compareLoading && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Comparing {compareTicker1} vs {compareTicker2}...</Text>
                <Text style={styles.loadingSubtext}>Fetching valuations & running AI analysis</Text>
              </View>
            )}

            {/* Comparison Results */}
            {comparisonResult && !compareLoading && (
              <>
                {/* Winner Card */}
                <View style={styles.winnerCard}>
                  <View style={styles.winnerHeader}>
                    <Ionicons name="trophy" size={24} color="#FFD700" />
                    <Text style={styles.winnerHeaderText}>AI Recommendation</Text>
                  </View>
                  <View style={styles.winnerContent}>
                    {comparisonResult.winner === 'TIE' ? (
                      <View style={styles.tieContainer}>
                        <Text style={styles.tieText}>It's a Tie!</Text>
                        <Text style={styles.tieSubtext}>Both stocks have comparable merits</Text>
                      </View>
                    ) : (
                      <View style={styles.winnerBadge}>
                        <Text style={styles.winnerSymbol}>{comparisonResult.winner}</Text>
                        <View style={styles.winnerCrown}>
                          <Ionicons name="ribbon" size={16} color="#FFD700" />
                          <Text style={styles.winnerLabel}>WINNER</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <Text style={styles.verdictText}>{comparisonResult.aiVerdict}</Text>
                </View>

                {/* Category Winners */}
                <View style={styles.categoryWinnersCard}>
                  <Text style={styles.categoryWinnersTitle}>Best For Each Category</Text>
                  <View style={styles.categoryGrid}>
                    {[
                      { key: 'growth', label: 'Growth', icon: 'trending-up', color: '#00C853' },
                      { key: 'value', label: 'Value', icon: 'pricetag', color: '#007AFF' },
                      { key: 'safety', label: 'Safety', icon: 'shield-checkmark', color: '#5856D6' },
                      { key: 'momentum', label: 'Momentum', icon: 'flash', color: '#FF9500' },
                    ].map((cat) => (
                      <View key={cat.key} style={styles.categoryItem}>
                        <View style={[styles.categoryIconBg, { backgroundColor: `${cat.color}15` }]}>
                          <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                        </View>
                        <Text style={styles.categoryLabel}>{cat.label}</Text>
                        <Text style={[styles.categoryWinner, { color: cat.color }]}>
                          {comparisonResult.categories[cat.key as keyof typeof comparisonResult.categories]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Side by Side Header */}
                <View style={styles.sideBySideHeader}>
                  <View style={[styles.stockHeaderBadge, { backgroundColor: '#007AFF' }]}>
                    <Text style={styles.stockHeaderSymbol}>{comparisonResult.stock1.symbol}</Text>
                  </View>
                  <Text style={styles.sideBySideVs}>VS</Text>
                  <View style={[styles.stockHeaderBadge, { backgroundColor: '#FF9500' }]}>
                    <Text style={styles.stockHeaderSymbol}>{comparisonResult.stock2.symbol}</Text>
                  </View>
                </View>

                {/* Price Comparison */}
                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonSectionTitle}>Price & Performance</Text>
                  <CompareRow
                    label="Price"
                    value1={`$${comparisonResult.stock1.price.toFixed(2)}`}
                    value2={`$${comparisonResult.stock2.price.toFixed(2)}`}
                  />
                  <CompareRow
                    label="Daily Change"
                    value1={`${comparisonResult.stock1.changePercent >= 0 ? '+' : ''}${comparisonResult.stock1.changePercent.toFixed(2)}%`}
                    value2={`${comparisonResult.stock2.changePercent >= 0 ? '+' : ''}${comparisonResult.stock2.changePercent.toFixed(2)}%`}
                    color1={comparisonResult.stock1.changePercent >= 0 ? '#00C853' : '#FF3B30'}
                    color2={comparisonResult.stock2.changePercent >= 0 ? '#00C853' : '#FF3B30'}
                    winner={comparisonResult.stock1.changePercent > comparisonResult.stock2.changePercent ? 1 : comparisonResult.stock2.changePercent > comparisonResult.stock1.changePercent ? 2 : 0}
                  />
                  <CompareRow
                    label="Market Cap"
                    value1={formatNumber(comparisonResult.stock1.marketCap)}
                    value2={formatNumber(comparisonResult.stock2.marketCap)}
                    winner={comparisonResult.stock1.marketCap > comparisonResult.stock2.marketCap ? 1 : 2}
                  />
                </View>

                {/* Valuation Comparison */}
                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonSectionTitle}>Valuation</Text>
                  <CompareRow
                    label="P/E Ratio"
                    value1={comparisonResult.stock1.pe?.toFixed(2) || '—'}
                    value2={comparisonResult.stock2.pe?.toFixed(2) || '—'}
                    winner={comparisonResult.stock1.pe && comparisonResult.stock2.pe ? (comparisonResult.stock1.pe < comparisonResult.stock2.pe ? 1 : 2) : 0}
                    lowerBetter
                  />
                  <CompareRow
                    label="EPS"
                    value1={comparisonResult.stock1.eps ? `$${comparisonResult.stock1.eps.toFixed(2)}` : '—'}
                    value2={comparisonResult.stock2.eps ? `$${comparisonResult.stock2.eps.toFixed(2)}` : '—'}
                    winner={comparisonResult.stock1.eps && comparisonResult.stock2.eps ? (comparisonResult.stock1.eps > comparisonResult.stock2.eps ? 1 : 2) : 0}
                  />
                  <CompareRow
                    label="DCF Valuation"
                    value1={comparisonResult.stock1.dcfDiffPercent ? `${comparisonResult.stock1.isUndervalued ? '+' : ''}${comparisonResult.stock1.dcfDiffPercent.toFixed(1)}%` : '—'}
                    value2={comparisonResult.stock2.dcfDiffPercent ? `${comparisonResult.stock2.isUndervalued ? '+' : ''}${comparisonResult.stock2.dcfDiffPercent.toFixed(1)}%` : '—'}
                    color1={comparisonResult.stock1.isUndervalued ? '#00C853' : '#FF3B30'}
                    color2={comparisonResult.stock2.isUndervalued ? '#00C853' : '#FF3B30'}
                    winner={comparisonResult.stock1.dcfDiffPercent && comparisonResult.stock2.dcfDiffPercent ? ((comparisonResult.stock1.dcfDiffPercent || 0) > (comparisonResult.stock2.dcfDiffPercent || 0) ? 1 : 2) : 0}
                  />
                </View>

                {/* Growth Comparison */}
                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonSectionTitle}>Growth & Profitability</Text>
                  <CompareRow
                    label="Revenue Growth"
                    value1={comparisonResult.stock1.revenueGrowth ? `${comparisonResult.stock1.revenueGrowth.toFixed(1)}%` : '—'}
                    value2={comparisonResult.stock2.revenueGrowth ? `${comparisonResult.stock2.revenueGrowth.toFixed(1)}%` : '—'}
                    color1={(comparisonResult.stock1.revenueGrowth || 0) > 0 ? '#00C853' : '#FF3B30'}
                    color2={(comparisonResult.stock2.revenueGrowth || 0) > 0 ? '#00C853' : '#FF3B30'}
                    winner={comparisonResult.stock1.revenueGrowth && comparisonResult.stock2.revenueGrowth ? (comparisonResult.stock1.revenueGrowth > comparisonResult.stock2.revenueGrowth ? 1 : 2) : 0}
                  />
                  <CompareRow
                    label="Net Income Growth"
                    value1={comparisonResult.stock1.netIncomeGrowth ? `${comparisonResult.stock1.netIncomeGrowth.toFixed(1)}%` : '—'}
                    value2={comparisonResult.stock2.netIncomeGrowth ? `${comparisonResult.stock2.netIncomeGrowth.toFixed(1)}%` : '—'}
                    color1={(comparisonResult.stock1.netIncomeGrowth || 0) > 0 ? '#00C853' : '#FF3B30'}
                    color2={(comparisonResult.stock2.netIncomeGrowth || 0) > 0 ? '#00C853' : '#FF3B30'}
                    winner={comparisonResult.stock1.netIncomeGrowth && comparisonResult.stock2.netIncomeGrowth ? (comparisonResult.stock1.netIncomeGrowth > comparisonResult.stock2.netIncomeGrowth ? 1 : 2) : 0}
                  />
                  <CompareRow
                    label="ROE"
                    value1={comparisonResult.stock1.roe ? `${comparisonResult.stock1.roe.toFixed(1)}%` : '—'}
                    value2={comparisonResult.stock2.roe ? `${comparisonResult.stock2.roe.toFixed(1)}%` : '—'}
                    winner={comparisonResult.stock1.roe && comparisonResult.stock2.roe ? (comparisonResult.stock1.roe > comparisonResult.stock2.roe ? 1 : 2) : 0}
                  />
                </View>

                {/* Financial Health */}
                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonSectionTitle}>Financial Health</Text>
                  <CompareRow
                    label="Debt/Equity"
                    value1={comparisonResult.stock1.debtToEquity?.toFixed(2) || '—'}
                    value2={comparisonResult.stock2.debtToEquity?.toFixed(2) || '—'}
                    winner={comparisonResult.stock1.debtToEquity && comparisonResult.stock2.debtToEquity ? (comparisonResult.stock1.debtToEquity < comparisonResult.stock2.debtToEquity ? 1 : 2) : 0}
                    lowerBetter
                  />
                  <CompareRow
                    label="Current Ratio"
                    value1={comparisonResult.stock1.currentRatio?.toFixed(2) || '—'}
                    value2={comparisonResult.stock2.currentRatio?.toFixed(2) || '—'}
                    winner={comparisonResult.stock1.currentRatio && comparisonResult.stock2.currentRatio ? (comparisonResult.stock1.currentRatio > comparisonResult.stock2.currentRatio ? 1 : 2) : 0}
                  />
                  <CompareRow
                    label="52W High"
                    value1={`$${comparisonResult.stock1.yearHigh?.toFixed(2) || '—'}`}
                    value2={`$${comparisonResult.stock2.yearHigh?.toFixed(2) || '—'}`}
                  />
                </View>

                {/* View Individual Stocks */}
                <View style={styles.viewStocksRow}>
                  <TouchableOpacity
                    style={[styles.viewStockButton, { borderColor: '#007AFF' }]}
                    onPress={() => router.push(`/symbol/${comparisonResult.stock1.symbol}/chart`)}
                  >
                    <Ionicons name="stats-chart" size={18} color="#007AFF" />
                    <Text style={[styles.viewStockText, { color: '#007AFF' }]}>View {comparisonResult.stock1.symbol}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewStockButton, { borderColor: '#FF9500' }]}
                    onPress={() => router.push(`/symbol/${comparisonResult.stock2.symbol}/chart`)}
                  >
                    <Ionicons name="stats-chart" size={18} color="#FF9500" />
                    <Text style={[styles.viewStockText, { color: '#FF9500' }]}>View {comparisonResult.stock2.symbol}</Text>
                  </TouchableOpacity>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                  <Ionicons name="information-circle" size={16} color="#8E8E93" />
                  <Text style={styles.disclaimerText}>Comparison is for informational purposes only. Not financial advice.</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* AI Forecast Tab */}
        {activeTab === 'forecast' && (
          <View style={styles.forecastContainer}>
            {/* Search Card */}
            <View style={styles.searchCard}>
              <Text style={styles.searchTitle}>AI Price Forecast</Text>
              <Text style={styles.searchSubtitle}>3-6 month price targets & probability analysis</Text>

              <View style={styles.searchInputContainer}>
                <Ionicons name="telescope" size={20} color="#8E8E93" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter ticker symbol (e.g., TSLA)"
                  placeholderTextColor="#8E8E93"
                  value={forecastTicker}
                  onChangeText={setForecastTicker}
                  autoCapitalize="characters"
                  onSubmitEditing={() => handleForecast()}
                />
                {forecastTicker.length > 0 && (
                  <TouchableOpacity onPress={() => { setForecastTicker(''); setForecastResult(null); }}>
                    <Ionicons name="close-circle" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.analyzeButton, { backgroundColor: '#5856D6' }, (forecastLoading || !forecastTicker) && styles.buttonDisabled]}
                onPress={() => handleForecast()}
                disabled={forecastLoading || !forecastTicker.trim()}
              >
                {forecastLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#FFF" />
                    <Text style={styles.analyzeButtonText}>Generate Forecast</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Quick Forecast */}
              <View style={styles.quickPicksContainer}>
                <Text style={styles.quickPicksLabel}>Quick Forecast:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['TSLA', 'NVDA', 'AAPL', 'META', 'AMD', 'AMZN'].map((sym) => (
                    <TouchableOpacity
                      key={sym}
                      style={[styles.quickPickChip, { borderColor: '#5856D620' }]}
                      onPress={() => handleForecast(sym)}
                    >
                      <Text style={[styles.quickPickText, { color: '#5856D6' }]}>{sym}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Error State */}
            {forecastError && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={24} color="#FF3B30" />
                <Text style={styles.errorText}>{forecastError}</Text>
              </View>
            )}

            {/* Loading State */}
            {forecastLoading && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#5856D6" />
                <Text style={styles.loadingText}>Forecasting {forecastTicker}...</Text>
                <Text style={styles.loadingSubtext}>Analyzing technicals & generating predictions</Text>
              </View>
            )}

            {/* Forecast Results */}
            {forecastResult && !forecastLoading && (
              <>
                {/* Stock Header */}
                <View style={styles.forecastHeaderCard}>
                  <View style={styles.forecastHeaderTop}>
                    <View>
                      <Text style={styles.stockSymbol}>{forecastResult.symbol}</Text>
                      <Text style={styles.stockName}>{forecastResult.name}</Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={styles.stockPrice}>${forecastResult.currentPrice.toFixed(2)}</Text>
                      <View style={[styles.changeBadge, { backgroundColor: forecastResult.change >= 0 ? '#00C85320' : '#FF3B3020' }]}>
                        <Ionicons name={forecastResult.change >= 0 ? 'arrow-up' : 'arrow-down'} size={14} color={forecastResult.change >= 0 ? '#00C853' : '#FF3B30'} />
                        <Text style={[styles.changeText, { color: forecastResult.change >= 0 ? '#00C853' : '#FF3B30' }]}>
                          {Math.abs(forecastResult.changePercent).toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Timeframe Badge */}
                  <View style={styles.timeframeBadge}>
                    <Ionicons name="calendar" size={16} color="#5856D6" />
                    <Text style={styles.timeframeText}>{forecastResult.timeframe} Forecast</Text>
                    <View style={styles.confidencePill}>
                      <Text style={styles.confidenceText}>{forecastResult.confidence}% Confidence</Text>
                    </View>
                  </View>
                </View>

                {/* Price Targets Card */}
                <View style={styles.priceTargetsCard}>
                  <View style={styles.priceTargetsHeader}>
                    <Ionicons name="flag" size={20} color="#5856D6" />
                    <Text style={styles.priceTargetsTitle}>Price Targets</Text>
                  </View>

                  <View style={styles.targetsVisual}>
                    {/* Visual Range Bar */}
                    <View style={styles.targetRangeContainer}>
                      {/* Price Labels Row */}
                      <View style={styles.targetLabelsRow}>
                        <View style={styles.targetLabelItem}>
                          <Text style={[styles.targetLabelPrice, { color: '#FF3B30' }]}>${forecastResult.priceTargets.conservative.toFixed(0)}</Text>
                          <Text style={styles.targetLabelName}>Bear</Text>
                        </View>
                        <View style={[styles.targetLabelItem, { alignItems: 'center' }]}>
                          <Text style={[styles.targetLabelPrice, { color: '#5856D6' }]}>${forecastResult.priceTargets.base.toFixed(0)}</Text>
                          <Text style={styles.targetLabelName}>Base</Text>
                        </View>
                        <View style={[styles.targetLabelItem, { alignItems: 'flex-end' }]}>
                          <Text style={[styles.targetLabelPrice, { color: '#00C853' }]}>${forecastResult.priceTargets.bullish.toFixed(0)}</Text>
                          <Text style={styles.targetLabelName}>Bull</Text>
                        </View>
                      </View>
                      {/* Gradient Bar */}
                      <View style={styles.targetRangeBar}>
                        <View style={[styles.gradientSegment, { flex: 1, backgroundColor: '#FF3B3040', borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
                        <View style={[styles.gradientSegment, { flex: 1, backgroundColor: '#5856D640' }]} />
                        <View style={[styles.gradientSegment, { flex: 1, backgroundColor: '#00C85340', borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
                        {/* Current Price Indicator */}
                        <View style={[styles.currentPriceIndicator, {
                          left: `${Math.min(Math.max(((forecastResult.currentPrice - forecastResult.priceTargets.conservative) / (forecastResult.priceTargets.bullish - forecastResult.priceTargets.conservative)) * 100, 0), 100)}%`
                        }]}>
                          <View style={styles.currentPriceDot} />
                          <Text style={styles.currentPriceLabel}>Current: ${forecastResult.currentPrice.toFixed(0)}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Target Cards */}
                    <View style={styles.targetCardsRow}>
                      <View style={[styles.targetCard, { borderColor: '#FF3B3030' }]}>
                        <Ionicons name="trending-down" size={18} color="#FF3B30" />
                        <Text style={styles.targetCardLabel}>Conservative</Text>
                        <Text style={[styles.targetCardValue, { color: '#FF3B30' }]}>${forecastResult.priceTargets.conservative.toFixed(2)}</Text>
                        <Text style={styles.targetCardPercent}>
                          {(((forecastResult.priceTargets.conservative - forecastResult.currentPrice) / forecastResult.currentPrice) * 100).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={[styles.targetCard, { borderColor: '#5856D630', backgroundColor: '#5856D610' }]}>
                        <Ionicons name="remove" size={18} color="#5856D6" />
                        <Text style={styles.targetCardLabel}>Base Case</Text>
                        <Text style={[styles.targetCardValue, { color: '#5856D6' }]}>${forecastResult.priceTargets.base.toFixed(2)}</Text>
                        <Text style={[styles.targetCardPercent, { color: '#5856D6' }]}>
                          +{(((forecastResult.priceTargets.base - forecastResult.currentPrice) / forecastResult.currentPrice) * 100).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={[styles.targetCard, { borderColor: '#00C85330' }]}>
                        <Ionicons name="trending-up" size={18} color="#00C853" />
                        <Text style={styles.targetCardLabel}>Bullish</Text>
                        <Text style={[styles.targetCardValue, { color: '#00C853' }]}>${forecastResult.priceTargets.bullish.toFixed(2)}</Text>
                        <Text style={[styles.targetCardPercent, { color: '#00C853' }]}>
                          +{(((forecastResult.priceTargets.bullish - forecastResult.currentPrice) / forecastResult.currentPrice) * 100).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Probability Card */}
                <View style={styles.probabilityCard}>
                  <Text style={styles.probabilityTitle}>Probability Assessment</Text>
                  <View style={styles.probabilityRow}>
                    <View style={styles.probabilityItem}>
                      <View style={styles.probabilityCircle}>
                        <Text style={[styles.probabilityValue, { color: '#00C853' }]}>{forecastResult.probabilities.upside}%</Text>
                      </View>
                      <Text style={styles.probabilityLabel}>Upside</Text>
                    </View>
                    <View style={styles.probabilityBarContainer}>
                      <View style={[styles.probabilityBar, { backgroundColor: '#00C853', flex: forecastResult.probabilities.upside }]} />
                      <View style={[styles.probabilityBar, { backgroundColor: '#FF3B30', flex: forecastResult.probabilities.downside }]} />
                    </View>
                    <View style={styles.probabilityItem}>
                      <View style={styles.probabilityCircle}>
                        <Text style={[styles.probabilityValue, { color: '#FF3B30' }]}>{forecastResult.probabilities.downside}%</Text>
                      </View>
                      <Text style={styles.probabilityLabel}>Downside</Text>
                    </View>
                  </View>
                </View>

                {/* Technical Signals Card */}
                <View style={styles.technicalCard}>
                  <View style={styles.technicalHeader}>
                    <Ionicons name="pulse" size={20} color="#007AFF" />
                    <Text style={styles.technicalTitle}>Technical Signals</Text>
                  </View>
                  <View style={styles.technicalGrid}>
                    <View style={styles.technicalItem}>
                      <Text style={styles.technicalLabel}>Trend</Text>
                      <View style={[styles.trendBadge, {
                        backgroundColor: forecastResult.technicalSignals.trend === 'uptrend' ? '#00C85320' : forecastResult.technicalSignals.trend === 'downtrend' ? '#FF3B3020' : '#FF950020'
                      }]}>
                        <Ionicons
                          name={forecastResult.technicalSignals.trend === 'uptrend' ? 'arrow-up' : forecastResult.technicalSignals.trend === 'downtrend' ? 'arrow-down' : 'remove'}
                          size={14}
                          color={forecastResult.technicalSignals.trend === 'uptrend' ? '#00C853' : forecastResult.technicalSignals.trend === 'downtrend' ? '#FF3B30' : '#FF9500'}
                        />
                        <Text style={[styles.trendText, {
                          color: forecastResult.technicalSignals.trend === 'uptrend' ? '#00C853' : forecastResult.technicalSignals.trend === 'downtrend' ? '#FF3B30' : '#FF9500'
                        }]}>
                          {forecastResult.technicalSignals.trend.charAt(0).toUpperCase() + forecastResult.technicalSignals.trend.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.technicalItem}>
                      <Text style={styles.technicalLabel}>Momentum</Text>
                      <Text style={[styles.technicalValue, { color: forecastResult.momentum >= 0 ? '#00C853' : '#FF3B30' }]}>
                        {forecastResult.momentum >= 0 ? '+' : ''}{forecastResult.momentum.toFixed(2)}%
                      </Text>
                    </View>
                    <View style={styles.technicalItem}>
                      <Text style={styles.technicalLabel}>Support</Text>
                      <Text style={styles.technicalValue}>${forecastResult.technicalSignals.support.toFixed(2)}</Text>
                    </View>
                    <View style={styles.technicalItem}>
                      <Text style={styles.technicalLabel}>Resistance</Text>
                      <Text style={styles.technicalValue}>${forecastResult.technicalSignals.resistance.toFixed(2)}</Text>
                    </View>
                    <View style={styles.technicalItem}>
                      <Text style={styles.technicalLabel}>52W High</Text>
                      <Text style={styles.technicalValue}>${forecastResult.yearHigh.toFixed(2)}</Text>
                    </View>
                    <View style={styles.technicalItem}>
                      <Text style={styles.technicalLabel}>Volatility</Text>
                      <Text style={[styles.technicalValue, { color: forecastResult.volatility > 3 ? '#FF9500' : '#00C853' }]}>
                        {forecastResult.volatility.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* AI Summary Card */}
                <View style={styles.aiSummaryCard}>
                  <View style={styles.aiSummaryHeader}>
                    <View style={[styles.sentimentBadge, { backgroundColor: getSentimentColor(forecastResult.sentiment) }]}>
                      <Ionicons
                        name={forecastResult.sentiment === 'bullish' ? 'trending-up' : forecastResult.sentiment === 'bearish' ? 'trending-down' : 'remove'}
                        size={16}
                        color="#FFF"
                      />
                      <Text style={styles.sentimentText}>{forecastResult.sentiment.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.recommendationPill, { backgroundColor: getRecommendationColor(forecastResult.recommendation) }]}>
                      <Text style={styles.recommendationPillText}>{forecastResult.recommendation}</Text>
                    </View>
                  </View>
                  <Text style={styles.aiSummaryText}>{forecastResult.summary}</Text>
                </View>

                {/* Catalysts & Risks */}
                <View style={styles.analysisCards}>
                  <View style={styles.strengthsCard}>
                    <View style={styles.listHeader}>
                      <Ionicons name="rocket" size={20} color="#00C853" />
                      <Text style={styles.listTitle}>Key Catalysts</Text>
                    </View>
                    {forecastResult.catalysts.map((item, idx) => (
                      <View key={idx} style={styles.listItem}>
                        <View style={[styles.listBullet, { backgroundColor: '#00C853' }]} />
                        <Text style={styles.listText}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.risksCard}>
                    <View style={styles.listHeader}>
                      <Ionicons name="warning" size={20} color="#FF3B30" />
                      <Text style={styles.listTitle}>Key Risks</Text>
                    </View>
                    {forecastResult.risks.map((item, idx) => (
                      <View key={idx} style={styles.listItem}>
                        <View style={[styles.listBullet, { backgroundColor: '#FF3B30' }]} />
                        <Text style={styles.listText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* View Chart Button */}
                <TouchableOpacity
                  style={[styles.viewChartButton, { backgroundColor: '#5856D615' }]}
                  onPress={() => router.push(`/symbol/${forecastResult.symbol}/chart`)}
                >
                  <Ionicons name="stats-chart" size={20} color="#5856D6" />
                  <Text style={[styles.viewChartText, { color: '#5856D6' }]}>View Full Chart & Analysis</Text>
                  <Ionicons name="chevron-forward" size={20} color="#5856D6" />
                </TouchableOpacity>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                  <Ionicons name="information-circle" size={16} color="#8E8E93" />
                  <Text style={styles.disclaimerText}>Forecasts are AI-generated predictions. Not financial advice.</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'assistant' && (
          <View style={styles.chatPageContainer}>
            {/* Chat Header Card */}
            <View style={styles.chatHeaderCard}>
              <View style={styles.chatHeaderTop}>
                <View style={styles.chatHeaderIconBg}>
                  <Ionicons name="sparkles" size={28} color="#34C759" />
                </View>
                <View style={styles.chatHeaderTextContainer}>
                  <Text style={styles.chatHeaderTitle}>AI Trading Assistant</Text>
                  <Text style={styles.chatHeaderSubtitle}>Ask anything about stocks, trading & investing</Text>
                </View>
              </View>
              <View style={styles.chatCapabilities}>
                <View style={styles.capabilityChip}>
                  <Ionicons name="analytics" size={14} color="#007AFF" />
                  <Text style={styles.capabilityText}>Market Analysis</Text>
                </View>
                <View style={styles.capabilityChip}>
                  <Ionicons name="school" size={14} color="#5856D6" />
                  <Text style={styles.capabilityText}>Education</Text>
                </View>
                <View style={styles.capabilityChip}>
                  <Ionicons name="pie-chart" size={14} color="#FF9500" />
                  <Text style={styles.capabilityText}>Portfolio Tips</Text>
                </View>
              </View>
            </View>

            {/* Suggested Questions - Only show when few messages */}
            {messages.length <= 2 && (
              <View style={styles.suggestedContainer}>
                <Text style={styles.suggestedTitle}>Suggested Questions</Text>
                <View style={styles.suggestedGrid}>
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestedCard}
                      onPress={() => {
                        setUserInput(q.text);
                      }}
                    >
                      <View style={[styles.suggestedIconBg, { backgroundColor: `${q.color}15` }]}>
                        <Ionicons name={q.icon as any} size={20} color={q.color} />
                      </View>
                      <Text style={styles.suggestedText} numberOfLines={2}>{q.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Chat Messages */}
            <View style={styles.messagesContainer}>
              {messages.map((message, index) => (
                <View key={index} style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                  {message.role === 'assistant' && (
                    <View style={styles.aiAvatarContainer}>
                      <View style={styles.aiAvatar}>
                        <Ionicons name="sparkles" size={16} color="#FFF" />
                      </View>
                    </View>
                  )}
                  <View style={[styles.messageBubbleContent, message.role === 'user' ? styles.userBubbleContent : styles.aiBubbleContent]}>
                    <Text style={[styles.messageBubbleText, message.role === 'user' && styles.userBubbleText]}>{message.content}</Text>
                  </View>
                  {message.role === 'user' && (
                    <View style={styles.userAvatarContainer}>
                      <View style={styles.userAvatar}>
                        <Ionicons name="person" size={16} color="#FFF" />
                      </View>
                    </View>
                  )}
                </View>
              ))}
              {assistantLoading && (
                <View style={[styles.messageBubble, styles.aiBubble]}>
                  <View style={styles.aiAvatarContainer}>
                    <View style={styles.aiAvatar}>
                      <Ionicons name="sparkles" size={16} color="#FFF" />
                    </View>
                  </View>
                  <View style={[styles.messageBubbleContent, styles.aiBubbleContent]}>
                    <View style={styles.typingIndicator}>
                      <View style={[styles.typingDot, styles.typingDot1]} />
                      <View style={[styles.typingDot, styles.typingDot2]} />
                      <View style={[styles.typingDot, styles.typingDot3]} />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Input Area */}
            <View style={styles.chatInputArea}>
              <View style={styles.chatInputWrapper}>
                <TextInput
                  style={styles.chatTextInput}
                  placeholder="Ask about stocks, trading strategies..."
                  placeholderTextColor="#8E8E93"
                  value={userInput}
                  onChangeText={setUserInput}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.chatSendButton, !userInput.trim() && styles.chatSendButtonDisabled]}
                  onPress={handleAssistantMessage}
                  disabled={!userInput.trim() || assistantLoading}
                >
                  {assistantLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="arrow-up" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.chatDisclaimer}>AI responses are for educational purposes only. Not financial advice.</Text>
            </View>
          </View>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <View style={styles.resourcesContainer}>
            <View style={styles.resourcesHeader}>
              <Ionicons name="library" size={28} color="#007AFF" />
              <View>
                <Text style={styles.resourcesTitle}>Learning Resources</Text>
                <Text style={styles.resourcesSubtitle}>Expand your financial knowledge</Text>
              </View>
            </View>

            <View style={styles.categoriesGrid}>
              {RESOURCE_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat.id} style={styles.categoryCard} onPress={() => router.push(`/resources/${cat.id}` as any)}>
                  <View style={[styles.categoryIconBg, { backgroundColor: `${cat.color}15` }]}>
                    <Ionicons name={cat.icon} size={24} color={cat.color} />
                  </View>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                  <Text style={styles.categoryDesc} numberOfLines={2}>{cat.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Compare Row Component
const CompareRow = ({ label, value1, value2, color1, color2, winner, lowerBetter }: {
  label: string;
  value1: string;
  value2: string;
  color1?: string;
  color2?: string;
  winner?: 0 | 1 | 2;
  lowerBetter?: boolean;
}) => (
  <View style={compareStyles.row}>
    <View style={compareStyles.rowLeft}>
      {winner === 1 && <View style={compareStyles.winnerDot} />}
      <Text style={[compareStyles.rowValue, color1 && { color: color1 }]}>{value1}</Text>
    </View>
    <Text style={compareStyles.rowLabel}>{label}</Text>
    <View style={compareStyles.rowRight}>
      <Text style={[compareStyles.rowValue, color2 && { color: color2 }]}>{value2}</Text>
      {winner === 2 && <View style={compareStyles.winnerDot} />}
    </View>
  </View>
);

const compareStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 },
  rowRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textAlign: 'center', flex: 1.2 },
  rowValue: { fontSize: 15, fontWeight: '700', color: '#000' },
  winnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C853' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  scrollView: { flex: 1 },
  content: { paddingBottom: 20 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerIconBg: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#007AFF15', justifyContent: 'center', alignItems: 'center' },
  headerText: { marginLeft: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#000' },
  headerSubtitle: { fontSize: 13, color: '#8E8E93', fontWeight: '500', marginTop: 2 },

  // Tabs
  tabContainer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginRight: 8 },
  tabActive: { backgroundColor: '#007AFF15' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginLeft: 6 },
  tabTextActive: { color: '#007AFF' },

  // Analyzer
  analyzerContainer: { paddingHorizontal: 16, paddingTop: 16 },
  searchCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  searchTitle: { fontSize: 22, fontWeight: '800', color: '#000', marginBottom: 4 },
  searchSubtitle: { fontSize: 14, color: '#8E8E93', marginBottom: 20 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E5EA' },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, fontWeight: '600', color: '#000', marginLeft: 10 },
  analyzeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 16, marginTop: 16, gap: 8 },
  analyzeButtonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  quickPicksContainer: { marginTop: 20 },
  quickPicksLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '600', marginBottom: 10 },
  quickPickChip: { backgroundColor: '#F5F5F7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  quickPickText: { fontSize: 14, fontWeight: '700', color: '#007AFF' },

  // Error & Loading
  errorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B3015', padding: 16, borderRadius: 14, marginTop: 16, gap: 12 },
  errorText: { flex: 1, fontSize: 15, color: '#FF3B30', fontWeight: '600' },
  loadingCard: { backgroundColor: '#FFF', padding: 40, borderRadius: 20, marginTop: 16, alignItems: 'center' },
  loadingText: { fontSize: 18, fontWeight: '700', color: '#000', marginTop: 16 },
  loadingSubtext: { fontSize: 14, color: '#8E8E93', marginTop: 6 },

  // Stock Header Card
  stockHeaderCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16 },
  stockHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stockSymbol: { fontSize: 28, fontWeight: '800', color: '#000' },
  stockName: { fontSize: 14, color: '#8E8E93', marginTop: 4, maxWidth: 180 },
  priceContainer: { alignItems: 'flex-end' },
  stockPrice: { fontSize: 28, fontWeight: '800', color: '#000' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginTop: 6, gap: 4 },
  changeText: { fontSize: 14, fontWeight: '700' },
  recommendationBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, marginTop: 20, gap: 8 },
  recommendationText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  confidenceText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },

  // DCF Card
  dcfCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16 },
  dcfHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dcfTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  dcfContent: {},
  dcfValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  dcfValueItem: { alignItems: 'center', flex: 1 },
  dcfArrow: { paddingHorizontal: 10 },
  dcfLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 6, fontWeight: '600' },
  dcfValue: { fontSize: 22, fontWeight: '800', color: '#000' },
  valuationBadge: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, gap: 12 },
  valuationStatus: { fontSize: 17, fontWeight: '700' },
  valuationPercent: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  gaugeContainer: { marginTop: 20 },
  gaugeTrack: { height: 10, backgroundColor: '#E5E5EA', borderRadius: 5, position: 'relative' },
  gaugeFill: { height: '100%', borderRadius: 5 },
  gaugeMarker: { position: 'absolute', top: -3, width: 3, height: 16, backgroundColor: '#000', borderRadius: 2, marginLeft: -1.5 },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  gaugeLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '500' },

  // AI Summary
  aiSummaryCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16 },
  aiSummaryHeader: { flexDirection: 'row', marginBottom: 12 },
  sentimentBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  sentimentText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  aiSummaryText: { fontSize: 15, color: '#333', lineHeight: 24, fontWeight: '500' },

  // Metrics
  metricsCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16 },
  metricsTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 16 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricItem: { width: (SCREEN_WIDTH - 80) / 2 - 6, backgroundColor: '#F9F9FB', padding: 14, borderRadius: 12 },
  metricLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 6, fontWeight: '500' },
  metricValue: { fontSize: 17, fontWeight: '700', color: '#000' },

  // Strengths & Risks
  analysisCards: { marginTop: 16, gap: 16 },
  strengthsCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  risksCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  listTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  listBullet: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 12 },
  listText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20, fontWeight: '500' },

  // Price Targets
  priceTargetCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16 },
  priceTargetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  priceTargetTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  priceTargetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceTargetItem: { alignItems: 'center', flex: 1 },
  priceTargetLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 6, fontWeight: '500' },
  priceTargetValue: { fontSize: 22, fontWeight: '800' },

  // View Chart Button
  viewChartButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF15', padding: 16, borderRadius: 14, marginTop: 16, gap: 8 },
  viewChartText: { fontSize: 16, fontWeight: '700', color: '#007AFF' },

  // Disclaimer
  disclaimer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 6 },
  disclaimerText: { fontSize: 12, color: '#8E8E93' },

  // Generic Tool Card
  toolCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20 },
  toolHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  toolTitle: { fontSize: 20, fontWeight: '700', color: '#000', marginLeft: 10 },
  toolDescription: { fontSize: 14, color: '#8E8E93', marginBottom: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, fontWeight: '500', color: '#000', marginLeft: 10 },
  vsContainer: { alignItems: 'center', marginVertical: 8 },
  vsText: { fontSize: 18, fontWeight: '800', color: '#007AFF' },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, marginTop: 8, gap: 8 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resultCard: { marginTop: 20, backgroundColor: '#F9F9FB', borderRadius: 14, padding: 16 },
  resultText: { fontSize: 15, color: '#000', lineHeight: 24, fontWeight: '500' },

  // Assistant
  assistantContainer: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16, borderRadius: 20, overflow: 'hidden' },
  assistantHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F9F9FB', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', gap: 10 },
  assistantTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  chatContainer: { maxHeight: 400 },
  chatContent: { padding: 16 },
  messageContainer: { marginBottom: 12, padding: 12, borderRadius: 14, maxWidth: '85%' },
  userMessage: { backgroundColor: '#007AFF15', alignSelf: 'flex-end' },
  assistantMessage: { backgroundColor: '#F5F5F7', alignSelf: 'flex-start' },
  messageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  messageRole: { fontSize: 12, fontWeight: '700', color: '#000' },
  messageText: { fontSize: 14, color: '#000', lineHeight: 20, fontWeight: '500' },
  inputArea: { padding: 12, borderTopWidth: 1, borderTopColor: '#E5E5EA', backgroundColor: '#F9F9FB' },
  chatInputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  chatInput: { flex: 1, fontSize: 15, color: '#000', maxHeight: 80, paddingVertical: 6, fontWeight: '500' },
  sendButton: { backgroundColor: '#007AFF', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendButtonDisabled: { backgroundColor: '#C7C7CC' },

  // Resources
  resourcesContainer: { paddingHorizontal: 16, paddingTop: 16 },
  resourcesHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, gap: 12 },
  resourcesTitle: { fontSize: 20, fontWeight: '800', color: '#000' },
  resourcesSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  categoryIconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  categoryTitle: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 4 },
  categoryDesc: { fontSize: 12, color: '#8E8E93', lineHeight: 16 },

  // Comparison Styles
  compareContainer: { paddingHorizontal: 16, paddingTop: 16 },
  compareInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  compareInputWrapper: { flex: 1, alignItems: 'center' },
  compareInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, width: '100%', borderWidth: 2, borderColor: '#E5E5EA', gap: 8 },
  compareInputBoxActive: { borderColor: '#007AFF30' },
  compareInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#000', textAlign: 'center' },
  compareInputLabel: { fontSize: 12, color: '#8E8E93', marginTop: 8, fontWeight: '600' },
  vsCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center', marginHorizontal: 12 },
  vsCircleText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  quickCompareSuggestions: { marginTop: 20 },
  quickCompareChip: { backgroundColor: '#F5F5F7', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  quickCompareText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  winnerCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16, borderWidth: 2, borderColor: '#FFD70030' },
  winnerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  winnerHeaderText: { fontSize: 18, fontWeight: '700', color: '#000' },
  winnerContent: { alignItems: 'center', marginBottom: 16 },
  winnerBadge: { alignItems: 'center' },
  winnerSymbol: { fontSize: 36, fontWeight: '800', color: '#000' },
  winnerCrown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFD70020', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 8, gap: 4 },
  winnerLabel: { fontSize: 12, fontWeight: '800', color: '#B8860B' },
  tieContainer: { alignItems: 'center' },
  tieText: { fontSize: 24, fontWeight: '800', color: '#8E8E93' },
  tieSubtext: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  verdictText: { fontSize: 15, color: '#333', lineHeight: 22, textAlign: 'center', fontWeight: '500' },
  categoryWinnersCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16 },
  categoryWinnersTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 16 },
  categoryGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryItem: { alignItems: 'center', flex: 1 },
  categoryLabel: { fontSize: 11, color: '#8E8E93', marginTop: 8, fontWeight: '600' },
  categoryWinner: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  sideBySideHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 4, gap: 16 },
  stockHeaderBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  stockHeaderSymbol: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  sideBySideVs: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
  comparisonCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 12 },
  comparisonSectionTitle: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 8 },
  viewStocksRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  viewStockButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 2, gap: 8 },
  viewStockText: { fontSize: 15, fontWeight: '700' },

  // Forecast Styles
  forecastContainer: { paddingHorizontal: 16, paddingTop: 16 },
  forecastHeaderCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  forecastHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  timeframeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#5856D615', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginTop: 20, gap: 10 },
  timeframeText: { fontSize: 14, fontWeight: '700', color: '#5856D6' },
  confidencePill: { backgroundColor: '#5856D6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginLeft: 'auto' },
  priceTargetsCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  priceTargetsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  priceTargetsTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  targetsVisual: {},
  targetRangeContainer: { marginBottom: 50 },
  targetLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  targetLabelItem: { flex: 1 },
  targetLabelPrice: { fontSize: 18, fontWeight: '800' },
  targetLabelName: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginTop: 2 },
  targetRangeBar: { height: 12, backgroundColor: '#E5E5EA', borderRadius: 6, position: 'relative', flexDirection: 'row', overflow: 'visible' },
  gradientSegment: { height: '100%' },
  currentPriceIndicator: { position: 'absolute', alignItems: 'center', top: -8, transform: [{ translateX: -16 }] },
  currentPriceDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1C1C1E', borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5 },
  currentPriceLabel: { fontSize: 11, fontWeight: '700', color: '#1C1C1E', marginTop: 6, backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  targetCardsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  targetCard: { flex: 1, alignItems: 'center', backgroundColor: '#F9F9FB', padding: 14, borderRadius: 14, borderWidth: 2 },
  targetCardLabel: { fontSize: 11, color: '#8E8E93', marginTop: 8, fontWeight: '600' },
  targetCardValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  targetCardPercent: { fontSize: 12, color: '#8E8E93', marginTop: 4, fontWeight: '600' },
  probabilityCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  probabilityTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 20, textAlign: 'center' },
  probabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  probabilityItem: { alignItems: 'center', width: 70 },
  probabilityCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F9F9FB', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#E5E5EA' },
  probabilityValue: { fontSize: 16, fontWeight: '800' },
  probabilityLabel: { fontSize: 12, color: '#8E8E93', marginTop: 8, fontWeight: '600' },
  probabilityBarContainer: { flex: 1, flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  probabilityBar: { height: '100%' },
  technicalCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  technicalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  technicalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  technicalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  technicalItem: { width: (SCREEN_WIDTH - 80) / 2 - 6, backgroundColor: '#F9F9FB', padding: 14, borderRadius: 12, alignItems: 'center' },
  technicalLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 8, fontWeight: '600' },
  technicalValue: { fontSize: 17, fontWeight: '700', color: '#000' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 4 },
  trendText: { fontSize: 14, fontWeight: '700' },
  recommendationPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, marginLeft: 10 },
  recommendationPillText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // AI Assistant Styles
  chatPageContainer: { paddingHorizontal: 16, paddingTop: 16 },
  chatHeaderCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  chatHeaderTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  chatHeaderIconBg: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#34C75915', justifyContent: 'center', alignItems: 'center' },
  chatHeaderTextContainer: { marginLeft: 14, flex: 1 },
  chatHeaderTitle: { fontSize: 22, fontWeight: '800', color: '#000' },
  chatHeaderSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 4, fontWeight: '500' },
  chatCapabilities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  capabilityChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  capabilityText: { fontSize: 12, fontWeight: '600', color: '#1C1C1E' },

  suggestedContainer: { marginTop: 16 },
  suggestedTitle: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 12, marginLeft: 4 },
  suggestedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  suggestedCard: { width: (SCREEN_WIDTH - 48) / 2 - 5, backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  suggestedIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  suggestedText: { fontSize: 13, fontWeight: '600', color: '#1C1C1E', lineHeight: 18 },

  messagesContainer: { marginTop: 16 },
  messageBubble: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatarContainer: { marginRight: 10 },
  userAvatarContainer: { marginLeft: 10 },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center' },
  userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  messageBubbleContent: { maxWidth: '75%', borderRadius: 20, padding: 14 },
  userBubbleContent: { backgroundColor: '#007AFF', borderBottomRightRadius: 6 },
  aiBubbleContent: { backgroundColor: '#FFF', borderBottomLeftRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  messageBubbleText: { fontSize: 15, lineHeight: 22, color: '#1C1C1E', fontWeight: '500' },
  userBubbleText: { color: '#FFF' },

  typingIndicator: { flexDirection: 'row', alignItems: 'center', height: 24, gap: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8E8E93' },
  typingDot1: { opacity: 0.4 },
  typingDot2: { opacity: 0.6 },
  typingDot3: { opacity: 0.8 },

  chatInputArea: { marginTop: 16, paddingBottom: 20 },
  chatInputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#E5E5EA' },
  chatTextInput: { flex: 1, fontSize: 16, color: '#000', fontWeight: '500', maxHeight: 100, paddingVertical: 6, paddingRight: 10 },
  chatSendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center' },
  chatSendButtonDisabled: { backgroundColor: '#C7C7CC' },
  chatDisclaimer: { fontSize: 11, color: '#8E8E93', textAlign: 'center', marginTop: 12 },
});
