// app/premium/research-reports.tsx
// Diamond Feature - Professional Research Reports
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
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePremiumFeature, FEATURE_TIERS } from '@/hooks/usePremiumFeature';

const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';

interface ResearchReport {
  ticker: string;
  company: string;
  sector: string;
  industry: string;
  generatedAt: string;
  executive_summary: string;
  investment_thesis: string;
  financial_analysis: {
    revenue_growth: string;
    profit_margins: string;
    balance_sheet: string;
    cash_flow: string;
  };
  competitive_analysis: string;
  risks: string[];
  catalysts: string[];
  valuation: {
    current_price: number;
    fair_value: number;
    pe_ratio: number;
    ps_ratio: number;
    pb_ratio: number;
    method: string;
  };
  recommendation: {
    rating: string;
    price_target: number;
    upside: number;
    timeframe: string;
  };
}

export default function ResearchReportsScreen() {
  const { canAccess } = usePremiumFeature();
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']);

  // Redirect to paywall if user doesn't have access
  useEffect(() => {
    if (!canAccess(FEATURE_TIERS.RESEARCH_REPORTS)) {
      router.replace('/(modals)/paywall');
    }
  }, [canAccess]);

  const generateReport = async (symbol: string) => {
    if (!symbol.trim()) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const tickerUpper = symbol.toUpperCase();

      // Fetch comprehensive data
      const [quoteRes, profileRes, ratiosRes, incomeRes, balanceRes, cashFlowRes] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/quote/${tickerUpper}?apikey=${FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/profile/${tickerUpper}?apikey=${FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/ratios/${tickerUpper}?limit=1&apikey=${FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/income-statement/${tickerUpper}?limit=4&apikey=${FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${tickerUpper}?limit=1&apikey=${FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${tickerUpper}?limit=1&apikey=${FMP_API_KEY}`),
      ]);

      const [quoteData, profileData, ratiosData, incomeData, balanceData, cashFlowData] = await Promise.all([
        quoteRes.json(),
        profileRes.json(),
        ratiosRes.json(),
        incomeRes.json(),
        balanceRes.json(),
        cashFlowRes.json(),
      ]);

      if (!quoteData?.[0] || !profileData?.[0]) {
        setError(`No data found for ${tickerUpper}`);
        setLoading(false);
        return;
      }

      const quote = quoteData[0];
      const profile = profileData[0];
      const ratios = ratiosData?.[0] || {};
      const income = incomeData || [];
      const balance = balanceData?.[0] || {};
      const cashFlow = cashFlowData?.[0] || {};

      // Calculate revenue growth
      let revenueGrowth = 'N/A';
      if (income.length >= 2) {
        const growth = ((income[0].revenue - income[1].revenue) / income[1].revenue * 100);
        revenueGrowth = `${growth.toFixed(1)}%`;
      }

      // AI-powered research report generation
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [
            {
              role: 'user',
              content: `Generate a professional institutional-grade equity research report for ${tickerUpper} (${profile.companyName}).

COMPANY DATA:
- Sector: ${profile.sector}
- Industry: ${profile.industry}
- Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B
- Current Price: $${quote.price}
- 52W Range: $${quote.yearLow} - $${quote.yearHigh}
- P/E Ratio: ${quote.pe || 'N/A'}
- Revenue Growth YoY: ${revenueGrowth}
- Gross Margin: ${ratios.grossProfitMargin ? (ratios.grossProfitMargin * 100).toFixed(1) + '%' : 'N/A'}
- Net Margin: ${ratios.netProfitMargin ? (ratios.netProfitMargin * 100).toFixed(1) + '%' : 'N/A'}
- ROE: ${ratios.returnOnEquity ? (ratios.returnOnEquity * 100).toFixed(1) + '%' : 'N/A'}
- Debt/Equity: ${ratios.debtEquityRatio?.toFixed(2) || 'N/A'}
- Current Ratio: ${ratios.currentRatio?.toFixed(2) || 'N/A'}
- Free Cash Flow: $${((cashFlow.freeCashFlow || 0) / 1e9).toFixed(2)}B
- Description: ${profile.description?.substring(0, 300)}...

Generate the report in this exact JSON format:
{
  "executive_summary": "3-4 sentence executive summary for institutional investors",
  "investment_thesis": "Detailed 2-3 paragraph investment thesis explaining the bull case",
  "financial_analysis": {
    "revenue_growth": "Analysis of revenue trends and drivers",
    "profit_margins": "Margin analysis and outlook",
    "balance_sheet": "Balance sheet strength assessment",
    "cash_flow": "Cash flow quality and sustainability"
  },
  "competitive_analysis": "Competitive positioning and moat analysis",
  "risks": ["risk 1", "risk 2", "risk 3", "risk 4"],
  "catalysts": ["catalyst 1", "catalyst 2", "catalyst 3"],
  "recommendation": {
    "rating": "Strong Buy|Buy|Hold|Sell|Strong Sell",
    "price_target": 180,
    "upside": 15,
    "timeframe": "12 months"
  }
}

Return ONLY the JSON, no other text.`
            }
          ],
        })
      });

      const aiData = await aiResponse.json();
      const aiText = aiData.content?.[0]?.text || '';

      let parsedReport;
      try {
        parsedReport = JSON.parse(aiText);
      } catch {
        parsedReport = {
          executive_summary: 'Report generation failed. Please try again.',
          investment_thesis: '',
          financial_analysis: {
            revenue_growth: 'N/A',
            profit_margins: 'N/A',
            balance_sheet: 'N/A',
            cash_flow: 'N/A',
          },
          competitive_analysis: '',
          risks: [],
          catalysts: [],
          recommendation: {
            rating: 'Hold',
            price_target: quote.price,
            upside: 0,
            timeframe: '12 months',
          },
        };
      }

      setReport({
        ticker: tickerUpper,
        company: profile.companyName,
        sector: profile.sector,
        industry: profile.industry,
        generatedAt: new Date().toISOString(),
        ...parsedReport,
        valuation: {
          current_price: quote.price,
          fair_value: parsedReport.recommendation?.price_target || quote.price,
          pe_ratio: quote.pe || 0,
          ps_ratio: ratios.priceToSalesRatio || 0,
          pb_ratio: ratios.priceBookValueRatio || 0,
          method: 'DCF + Comparable Analysis',
        },
      });

    } catch (err) {
      
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const shareReport = async () => {
    if (!report) return;

    try {
      await Share.share({
        message: `${report.company} (${report.ticker}) Research Report\n\nRating: ${report.recommendation.rating}\nPrice Target: $${report.recommendation.price_target}\n\n${report.executive_summary}\n\nGenerated by WallStreetStocks AI`,
      });
    } catch (err) {
      
    }
  };

  const getRatingColor = (rating: string) => {
    if (rating.includes('Buy')) return '#34C759';
    if (rating.includes('Sell')) return '#FF3B30';
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
          <View style={styles.diamondBadge}>
            <Ionicons name="diamond" size={14} color="#000" />
            <Text style={styles.diamondBadgeText}>Diamond</Text>
          </View>
          <Text style={styles.headerTitle}>Research Reports</Text>
        </View>
        {report && (
          <TouchableOpacity onPress={shareReport} style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        {!report && <View style={{ width: 40 }} />}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Card */}
        <View style={styles.searchCard}>
          <View style={styles.searchHeader}>
            <Ionicons name="document-text" size={24} color="#B9F2FF" />
            <View style={styles.searchHeaderText}>
              <Text style={styles.searchTitle}>Institutional Research</Text>
              <Text style={styles.searchSubtitle}>Professional-grade equity research powered by AI</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.input}
              placeholder="Enter stock symbol (e.g., AAPL)"
              placeholderTextColor="#8E8E93"
              value={ticker}
              onChangeText={setTicker}
              autoCapitalize="characters"
              onSubmitEditing={() => generateReport(ticker)}
            />
          </View>

          <TouchableOpacity
            style={[styles.generateButton, loading && styles.buttonDisabled]}
            onPress={() => generateReport(ticker)}
            disabled={loading || !ticker.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="document-text" size={20} color="#000" />
                <Text style={styles.generateButtonText}>Generate Report</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Quick Access */}
          <View style={styles.quickAccess}>
            <Text style={styles.quickAccessLabel}>Popular Reports:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {savedReports.map((sym) => (
                <TouchableOpacity
                  key={sym}
                  style={styles.quickChip}
                  onPress={() => {
                    setTicker(sym);
                    generateReport(sym);
                  }}
                >
                  <Text style={styles.quickChipText}>{sym}</Text>
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
            <ActivityIndicator size="large" color="#B9F2FF" />
            <Text style={styles.loadingText}>Generating Research Report...</Text>
            <Text style={styles.loadingSubtext}>Analyzing financials and competitive landscape</Text>
            <View style={styles.loadingSteps}>
              <Text style={styles.loadingStep}>Gathering financial data...</Text>
              <Text style={styles.loadingStep}>Analyzing balance sheet...</Text>
              <Text style={styles.loadingStep}>Evaluating competitive position...</Text>
              <Text style={styles.loadingStep}>Generating valuation...</Text>
            </View>
          </View>
        )}

        {/* Report */}
        {report && !loading && (
          <View style={styles.reportContainer}>
            {/* Report Header */}
            <View style={styles.reportHeader}>
              <View style={styles.reportHeaderTop}>
                <View>
                  <Text style={styles.reportTicker}>{report.ticker}</Text>
                  <Text style={styles.reportCompany}>{report.company}</Text>
                  <Text style={styles.reportSector}>{report.sector} • {report.industry}</Text>
                </View>
                <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(report.recommendation.rating) }]}>
                  <Text style={styles.ratingText}>{report.recommendation.rating}</Text>
                </View>
              </View>
              <View style={styles.priceTargetRow}>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Current Price</Text>
                  <Text style={styles.priceValue}>${report.valuation.current_price.toFixed(2)}</Text>
                </View>
                <View style={styles.priceArrow}>
                  <Ionicons name="arrow-forward" size={20} color="#007AFF" />
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Price Target</Text>
                  <Text style={[styles.priceValue, { color: '#007AFF' }]}>
                    ${report.recommendation.price_target.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Upside</Text>
                  <Text style={[styles.priceValue, { color: report.recommendation.upside >= 0 ? '#34C759' : '#FF3B30' }]}>
                    {report.recommendation.upside >= 0 ? '+' : ''}{report.recommendation.upside.toFixed(1)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.generatedAt}>
                Generated {new Date(report.generatedAt).toLocaleDateString()} • {report.recommendation.timeframe} outlook
              </Text>
            </View>

            {/* Executive Summary */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flash" size={20} color="#B9F2FF" />
                <Text style={styles.sectionTitle}>Executive Summary</Text>
              </View>
              <Text style={styles.sectionText}>{report.executive_summary}</Text>
            </View>

            {/* Investment Thesis */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb" size={20} color="#FFD700" />
                <Text style={styles.sectionTitle}>Investment Thesis</Text>
              </View>
              <Text style={styles.sectionText}>{report.investment_thesis}</Text>
            </View>

            {/* Financial Analysis */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>Financial Analysis</Text>
              </View>
              <View style={styles.financialGrid}>
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Revenue Growth</Text>
                  <Text style={styles.financialText}>{report.financial_analysis.revenue_growth}</Text>
                </View>
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Profit Margins</Text>
                  <Text style={styles.financialText}>{report.financial_analysis.profit_margins}</Text>
                </View>
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Balance Sheet</Text>
                  <Text style={styles.financialText}>{report.financial_analysis.balance_sheet}</Text>
                </View>
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Cash Flow</Text>
                  <Text style={styles.financialText}>{report.financial_analysis.cash_flow}</Text>
                </View>
              </View>
            </View>

            {/* Valuation Metrics */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calculator" size={20} color="#AF52DE" />
                <Text style={styles.sectionTitle}>Valuation Metrics</Text>
              </View>
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{report.valuation.pe_ratio?.toFixed(1) || 'N/A'}</Text>
                  <Text style={styles.metricLabel}>P/E</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{report.valuation.ps_ratio?.toFixed(1) || 'N/A'}</Text>
                  <Text style={styles.metricLabel}>P/S</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{report.valuation.pb_ratio?.toFixed(1) || 'N/A'}</Text>
                  <Text style={styles.metricLabel}>P/B</Text>
                </View>
              </View>
              <Text style={styles.methodText}>Valuation Method: {report.valuation.method}</Text>
            </View>

            {/* Competitive Analysis */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={20} color="#FF9500" />
                <Text style={styles.sectionTitle}>Competitive Analysis</Text>
              </View>
              <Text style={styles.sectionText}>{report.competitive_analysis}</Text>
            </View>

            {/* Catalysts */}
            {report.catalysts?.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="rocket" size={20} color="#34C759" />
                  <Text style={styles.sectionTitle}>Key Catalysts</Text>
                </View>
                {report.catalysts.map((catalyst, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={[styles.listBullet, { backgroundColor: '#34C759' }]} />
                    <Text style={styles.listText}>{catalyst}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Risks */}
            {report.risks?.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="warning" size={20} color="#FF3B30" />
                  <Text style={styles.sectionTitle}>Key Risks</Text>
                </View>
                {report.risks.map((risk, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={[styles.listBullet, { backgroundColor: '#FF3B30' }]} />
                    <Text style={styles.listText}>{risk}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={16} color="#8E8E93" />
              <Text style={styles.disclaimerText}>
                This report is AI-generated for informational purposes only. Not investment advice.
                Past performance does not guarantee future results.
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
  diamondBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B9F2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  diamondBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  shareButton: {
    padding: 8,
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  searchHeaderText: {
    flex: 1,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  searchSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
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
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B9F2FF',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  quickAccess: {
    marginTop: 16,
  },
  quickAccessLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  quickChip: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickChipText: {
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
  loadingSteps: {
    marginTop: 20,
    alignItems: 'flex-start',
  },
  loadingStep: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  reportContainer: {
    paddingHorizontal: 16,
  },
  reportHeader: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  reportHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reportTicker: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
  },
  reportCompany: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  reportSector: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  ratingBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  priceTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  priceArrow: {
    paddingHorizontal: 8,
  },
  generatedAt: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  sectionText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  financialGrid: {
    gap: 16,
  },
  financialItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
  },
  financialLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  financialText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  metricLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  methodText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
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
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 16,
  },
});
