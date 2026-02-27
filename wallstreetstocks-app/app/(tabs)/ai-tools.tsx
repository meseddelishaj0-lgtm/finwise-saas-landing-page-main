// app/(tabs)/ai-tools.tsx
import React, { useState, useCallback, useMemo } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { usePremiumFeature, FEATURE_TIERS } from '@/hooks/usePremiumFeature';
import { useTheme } from '@/context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// FMP API Configuration
const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// OpenAI API - calls should go through backend API
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

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

// Diamond-only AI tabs
const DIAMOND_TABS = ['analyzer', 'compare', 'forecast', 'assistant', 'insider'];

export default function AITools() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { canAccess } = usePremiumFeature();
  const [activeTab, setActiveTab] = useState<'analyzer' | 'compare' | 'forecast' | 'assistant' | 'resources' | 'calculator' | 'insider'>('analyzer');

  // Check if user has Diamond access for AI tools
  const hasDiamondAccess = canAccess(FEATURE_TIERS.AI_TOOLS);

  // Handle tab press with premium check
  const handleTabPress = (tabKey: string) => {
    if (DIAMOND_TABS.includes(tabKey) && !hasDiamondAccess) {
      // Allow switching to show locked state
      setActiveTab(tabKey as any);
    } else {
      setActiveTab(tabKey as any);
    }
  };

  // Calculator state
  const [calcType, setCalcType] = useState<'investment' | 'mortgage' | 'loan' | 'bond' | 'retirement'>('investment');

  // Investment Calculator
  const [calcInitialAmount, setCalcInitialAmount] = useState('10000');
  const [calcMonthlyContribution, setCalcMonthlyContribution] = useState('500');
  const [calcYears, setCalcYears] = useState('10');
  const [calcAnnualReturn, setCalcAnnualReturn] = useState('8');
  const [calcResult, setCalcResult] = useState<any>(null);

  // Mortgage Calculator
  const [mortgageHomePrice, setMortgageHomePrice] = useState('400000');
  const [mortgageDownPayment, setMortgageDownPayment] = useState('80000');
  const [mortgageInterestRate, setMortgageInterestRate] = useState('6.5');
  const [mortgageTerm, setMortgageTerm] = useState('30');
  const [mortgagePropertyTax, setMortgagePropertyTax] = useState('3600');
  const [mortgageInsurance, setMortgageInsurance] = useState('1200');

  // Loan Calculator
  const [loanAmount, setLoanAmount] = useState('25000');
  const [loanInterestRate, setLoanInterestRate] = useState('7.5');
  const [loanTerm, setLoanTerm] = useState('5');

  // Bond Calculator
  const [bondFaceValue, setBondFaceValue] = useState('1000');
  const [bondCouponRate, setBondCouponRate] = useState('5');
  const [bondYearsToMaturity, setBondYearsToMaturity] = useState('10');
  const [bondMarketRate, setBondMarketRate] = useState('4');
  const [bondPaymentFrequency, setBondPaymentFrequency] = useState('2');

  // Retirement Calculator
  const [retireCurrentAge, setRetireCurrentAge] = useState('30');
  const [retireTargetAge, setRetireTargetAge] = useState('65');
  const [retireCurrentSavings, setRetireCurrentSavings] = useState('50000');
  const [retireMonthlyContrib, setRetireMonthlyContrib] = useState('1000');
  const [retireExpectedReturn, setRetireExpectedReturn] = useState('7');
  const [retireMonthlyExpense, setRetireMonthlyExpense] = useState('5000');

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

  // Enhanced Stock Analyzer Function with AI - Using FMP + OpenAI
  const handleAnalyze = async (ticker?: string) => {
    const symbol = (ticker || analyzerTicker).toUpperCase().trim();
    if (!symbol) return;

    setAnalyzerLoading(true);
    setAnalysisResult(null);
    setAnalyzerError(null);
    setAnalyzerTicker(symbol);

    try {
      // Fetch comprehensive stock data from FMP
      const [quoteRes, dcfRes, ratiosRes, growthRes] = await Promise.all([
        fetch(`${FMP_BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/discounted-cash-flow/${symbol}?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/ratios/${symbol}?limit=1&apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/financial-growth/${symbol}?limit=1&apikey=${FMP_API_KEY}`),
      ]);

      const [quoteData, dcfData, ratiosData, growthData] = await Promise.all([
        quoteRes.json(),
        dcfRes.json(),
        ratiosRes.json(),
        growthRes.json(),
      ]);

      if (!quoteData || quoteData.length === 0) {
        setAnalyzerError(`No data found for ${symbol}`);
        return;
      }

      const quote = quoteData[0];
      const dcf = dcfData[0] || {};
      const ratios = ratiosData[0] || {};
      const growth = growthData[0] || {};

      // Calculate DCF valuation
      const dcfValue = dcf.dcf || null;
      const dcfDiff = dcfValue ? dcfValue - quote.price : null;
      const dcfDiffPercent = dcfValue ? ((dcfValue - quote.price) / quote.price) * 100 : null;
      const isUndervalued = dcfDiffPercent ? dcfDiffPercent > 10 : false;

      // Use OpenAI for AI analysis
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a stock analyst. Provide a JSON response only, no markdown or explanation.'
            },
            {
              role: 'user',
              content: `Analyze ${symbol} (${quote.name}) stock. Data:
- Price: $${quote.price}, Change: ${quote.changesPercentage}%
- Market Cap: $${quote.marketCap}, P/E: ${quote.pe || 'N/A'}, EPS: ${quote.eps || 'N/A'}
- 52W High: $${quote.yearHigh}, 52W Low: $${quote.yearLow}
- DCF Value: $${dcfValue || 'N/A'}, ${isUndervalued ? 'Undervalued' : 'At/Above fair value'}
- ROE: ${ratios.returnOnEquity ? (ratios.returnOnEquity * 100).toFixed(1) + '%' : 'N/A'}
- Debt/Equity: ${ratios.debtEquityRatio?.toFixed(2) || 'N/A'}
- Revenue Growth: ${growth.revenueGrowth ? (growth.revenueGrowth * 100).toFixed(1) + '%' : 'N/A'}

Return ONLY a JSON object:
{
  "aiSummary": "2-3 sentence analysis summary",
  "strengths": ["3 key strengths"],
  "risks": ["3 key risks"],
  "sentiment": "bullish" or "bearish" or "neutral",
  "confidence": number 1-100,
  "recommendation": "Strong Buy" or "Buy" or "Hold" or "Sell",
  "priceTarget": {"low": number, "mid": number, "high": number}
}`
            }
          ],
          max_tokens: 600,
          temperature: 0.3,
        }),
      });

      const aiData = await aiResponse.json();
      let aiAnalysis;

      try {
        const content = aiData.choices[0]?.message?.content || '{}';
        aiAnalysis = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
      } catch {
        aiAnalysis = {
          aiSummary: `${quote.name} is currently trading at $${quote.price}. ${isUndervalued ? 'The stock appears undervalued based on DCF analysis.' : 'Conduct further research before investing.'}`,
          strengths: ['Market presence', 'Trading volume', 'Industry position'],
          risks: ['Market volatility', 'Economic conditions', 'Competition'],
          sentiment: 'neutral',
          confidence: 60,
          recommendation: 'Hold',
          priceTarget: { low: quote.price * 0.9, mid: quote.price * 1.1, high: quote.price * 1.25 }
        };
      }

      setAnalysisResult({
        symbol,
        name: quote.name,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changesPercentage,
        marketCap: quote.marketCap,
        pe: quote.pe,
        eps: quote.eps,
        yearHigh: quote.yearHigh,
        yearLow: quote.yearLow,
        volume: quote.volume,
        avgVolume: quote.avgVolume,
        dcfValue,
        dcfDiff,
        dcfDiffPercent,
        isUndervalued,
        roe: ratios.returnOnEquity ? ratios.returnOnEquity * 100 : null,
        roa: ratios.returnOnAssets ? ratios.returnOnAssets * 100 : null,
        debtToEquity: ratios.debtEquityRatio,
        currentRatio: ratios.currentRatio,
        revenueGrowth: growth.revenueGrowth ? growth.revenueGrowth * 100 : null,
        netIncomeGrowth: growth.netIncomeGrowth ? growth.netIncomeGrowth * 100 : null,
        aiSummary: aiAnalysis.aiSummary,
        strengths: aiAnalysis.strengths,
        risks: aiAnalysis.risks,
        sentiment: aiAnalysis.sentiment,
        confidence: aiAnalysis.confidence,
        recommendation: aiAnalysis.recommendation,
        priceTarget: aiAnalysis.priceTarget,
      });
    } catch {
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
        fetch(`${FMP_BASE_URL}/quote/${ticker1}?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/quote/${ticker2}?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/discounted-cash-flow/${ticker1}?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/discounted-cash-flow/${ticker2}?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/ratios/${ticker1}?limit=1&apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/ratios/${ticker2}?limit=1&apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/financial-growth/${ticker1}?limit=1&apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/financial-growth/${ticker2}?limit=1&apikey=${FMP_API_KEY}`),
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
    } catch {
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
      // Fetch stock data from FMP
      const [quoteRes, historyRes, ratiosRes] = await Promise.all([
        fetch(`${FMP_BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/historical-price-full/${symbol}?timeseries=90&apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/ratios/${symbol}?limit=1&apikey=${FMP_API_KEY}`),
      ]);

      const [quoteData, historyData] = await Promise.all([
        quoteRes.json(),
        historyRes.json(),
        ratiosRes.json(),
      ]);

      if (!quoteData || quoteData.length === 0) {
        setForecastError(`No data found for ${symbol}`);
        return;
      }

      const quote = quoteData[0];
      const history = historyData.historical || [];

      // Calculate technical indicators
      const prices = history.slice(0, 30).map((h: any) => h.close).reverse();
      const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      const volatility = Math.sqrt(prices.reduce((sum: number, p: number) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length) / avgPrice * 100;
      const momentum = ((quote.price - prices[0]) / prices[0]) * 100;
      const high52w = quote.yearHigh || Math.max(...prices);
      const low52w = quote.yearLow || Math.min(...prices);

      // Use OpenAI for forecast analysis
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a stock analyst. Provide a JSON response only, no markdown or explanation.'
            },
            {
              role: 'user',
              content: `Analyze ${symbol} stock for a 3-month forecast. Current price: $${quote.price}, Change: ${quote.changesPercentage}%, 52W High: $${high52w}, 52W Low: $${low52w}, P/E: ${quote.pe || 'N/A'}, Volatility: ${volatility.toFixed(1)}%, Momentum: ${momentum.toFixed(1)}%.

Return ONLY a JSON object with this exact structure:
{
  "sentiment": "bullish" or "bearish" or "neutral",
  "confidence": number 1-100,
  "recommendation": "Strong Buy" or "Buy" or "Hold" or "Sell",
  "priceTargets": {"conservative": number, "base": number, "bullish": number},
  "probabilities": {"upside": number 0-100, "downside": number 0-100},
  "catalysts": ["string array of 3 potential catalysts"],
  "risks": ["string array of 3 key risks"],
  "technicalSignals": {"trend": "uptrend" or "downtrend" or "sideways", "support": number, "resistance": number},
  "summary": "2-3 sentence forecast summary"
}`
            }
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      const aiData = await aiResponse.json();
      let aiAnalysis;

      try {
        const content = aiData.choices[0]?.message?.content || '{}';
        aiAnalysis = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
      } catch {
        aiAnalysis = {
          sentiment: momentum > 0 ? 'bullish' : momentum < -5 ? 'bearish' : 'neutral',
          confidence: 65,
          recommendation: 'Hold',
          priceTargets: { conservative: quote.price * 0.95, base: quote.price * 1.05, bullish: quote.price * 1.15 },
          probabilities: { upside: 55, downside: 45 },
          catalysts: ['Earnings report', 'Market conditions', 'Sector trends'],
          risks: ['Market volatility', 'Economic factors', 'Competition'],
          technicalSignals: { trend: 'sideways', support: low52w, resistance: high52w },
          summary: `${symbol} shows mixed signals. Monitor closely for breakout opportunities.`
        };
      }

      setForecastResult({
        symbol,
        name: quote.name || symbol,
        currentPrice: quote.price || 0,
        change: quote.change || 0,
        changePercent: quote.changesPercentage || 0,
        yearHigh: high52w,
        yearLow: low52w,
        momentum: momentum || 0,
        volatility: volatility || 0,
        avgVolume: quote.avgVolume || 0,
        priceTargets: aiAnalysis.priceTargets || { conservative: quote.price * 0.9, base: quote.price, bullish: quote.price * 1.1 },
        probabilities: aiAnalysis.probabilities || { upside: 50, downside: 50 },
        timeframe: '3 months',
        sentiment: aiAnalysis.sentiment || 'neutral',
        confidence: aiAnalysis.confidence || 50,
        recommendation: aiAnalysis.recommendation || 'Hold',
        catalysts: aiAnalysis.catalysts || [],
        risks: aiAnalysis.risks || [],
        technicalSignals: aiAnalysis.technicalSignals || { trend: 'sideways', support: low52w, resistance: high52w },
        summary: aiAnalysis.summary || `Analysis for ${symbol}`,
      });
    } catch {
      setForecastError('Forecast failed. Please try again.');
    } finally {
      setForecastLoading(false);
    }
  };

  // AI Assistant Handler - Using OpenAI API
  const handleAssistantMessage = async () => {
    const input = userInput.trim();
    if (!input || assistantLoading) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setAssistantLoading(true);

    try {
      // Build conversation history for OpenAI
      const conversationHistory = [
        {
          role: 'system',
          content: `You are an expert AI Trading Assistant for WallStreetStocks app. You help users with:
- Stock market analysis and research
- Trading strategies and techniques
- Portfolio management and diversification
- Understanding financial metrics (P/E, EPS, market cap, etc.)
- Market trends and news interpretation
- Risk management and investment education

Be concise, helpful, and accurate. When discussing specific stocks, mention that users should do their own research.
Format responses clearly with bullet points or numbered lists when appropriate.
Always remind users that this is educational information, not financial advice.`
        },
        ...messages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: input }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: conversationHistory,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get response');
      }

      const assistantReply = data.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantReply }]);
    } catch {
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDark ? 'transparent' : colors.borderLight }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconBg}>
              <Ionicons name="sparkles" size={28} color="#007AFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>AI Tools</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Powered by Advanced Analytics</Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: colors.background, borderBottomColor: isDark ? 'transparent' : '#E5E5EA' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'analyzer', icon: 'analytics', label: 'Analyzer', isDiamond: true },
              { key: 'compare', icon: 'git-compare', label: 'Compare', isDiamond: true },
              { key: 'forecast', icon: 'trending-up', label: 'Forecast', isDiamond: true },
              { key: 'insider', icon: 'briefcase', label: 'Insider', isDiamond: true },
              { key: 'calculator', icon: 'calculator', label: 'Calculator', isDiamond: false },
              { key: 'assistant', icon: 'chatbubbles', label: 'Assistant', isDiamond: true },
              { key: 'resources', icon: 'library', label: 'Resources', isDiamond: false },
            ].map((tab) => {
              const isLocked = tab.isDiamond && !hasDiamondAccess;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.tabActive, activeTab !== tab.key && { backgroundColor: colors.surface }, activeTab === tab.key && { backgroundColor: isDark ? '#fff' : '#111827' }]}
                  onPress={() => handleTabPress(tab.key)}
                >
                  <View style={styles.tabContent}>
                    <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? (isDark ? '#000' : '#007AFF') : colors.textTertiary} />
                    <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive, activeTab !== tab.key && { color: colors.textSecondary }, activeTab === tab.key && { color: isDark ? '#000' : '#fff' }]}>{tab.label}</Text>
                    {tab.isDiamond && (
                      <View style={[styles.diamondBadge, isLocked && styles.diamondBadgeLocked]}>
                        <Ionicons name={isLocked ? "lock-closed" : "diamond"} size={8} color={isLocked ? "#B9F2FF" : "#B9F2FF"} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Stock Analyzer Tab - NEW DESIGN (Diamond Only) */}
        {activeTab === 'analyzer' && (
          <View style={[styles.analyzerContainer, { backgroundColor: colors.background }]}>
            {!hasDiamondAccess ? (
              // Locked State for non-Diamond users
              <View style={styles.premiumLockedContainer}>
                <LinearGradient
                  colors={['#1a1a2e', '#16213e']}
                  style={styles.premiumLockedGradient}
                >
                  <View style={styles.premiumLockedIcon}>
                    <Ionicons name="diamond" size={48} color="#B9F2FF" />
                  </View>
                  <Text style={styles.premiumLockedTitle}>AI Stock Analyzer</Text>
                  <Text style={styles.premiumLockedSubtitle}>Diamond Feature</Text>
                  <Text style={styles.premiumLockedDescription}>
                    Get DCF valuations, AI-powered analysis, strengths & risks assessment,
                    and professional recommendations for any stock.
                  </Text>

                  <View style={styles.premiumFeaturesList}>
                    {['DCF Valuation Analysis', 'AI-Powered Insights', 'Buy/Sell Recommendations', 'Risk Assessment'].map((feature, idx) => (
                      <View key={idx} style={styles.premiumFeatureItem}>
                        <Ionicons name="checkmark-circle" size={18} color="#B9F2FF" />
                        <Text style={styles.premiumFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.premiumUpgradeButton}
                    onPress={() => router.push('/(modals)/paywall' as any)}
                  >
                    <Ionicons name="diamond" size={20} color="#000" />
                    <Text style={styles.premiumUpgradeText}>Upgrade to Diamond</Text>
                  </TouchableOpacity>

                  <Text style={styles.premiumPriceHint}>Unlock all AI tools</Text>
                </LinearGradient>
              </View>
            ) : (
            <>
            {/* Search Card */}
            <View style={[styles.searchCard, { backgroundColor: isDark ? colors.card : colors.background, shadowOpacity: isDark ? 0 : 0.06, elevation: isDark ? 0 : 3 }]}>
              <Text style={[styles.searchTitle, { color: colors.text }]}>Stock Analyzer</Text>
              <Text style={[styles.searchSubtitle, { color: colors.textSecondary }]}>DCF Valuation & AI-Powered Analysis</Text>

              <View style={[styles.searchInputContainer, { backgroundColor: colors.surface, borderColor: isDark ? 'transparent' : colors.border }]}>
                <Ionicons name="search" size={20} color={colors.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Enter ticker symbol (e.g., AAPL)"
                  placeholderTextColor={colors.textTertiary}
                  value={analyzerTicker}
                  onChangeText={setAnalyzerTicker}
                  autoCapitalize="characters"
                  onSubmitEditing={() => handleAnalyze()}
                />
                {analyzerTicker.length > 0 && (
                  <TouchableOpacity onPress={() => { setAnalyzerTicker(''); setAnalysisResult(null); }}>
                    <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
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
                <Text style={[styles.quickPicksLabel, { color: colors.textSecondary }]}>Quick Analysis:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {QUICK_PICKS.map((symbol) => (
                    <TouchableOpacity
                      key={symbol}
                      style={[styles.quickPickChip, { backgroundColor: colors.surface, borderColor: isDark ? 'transparent' : colors.border }]}
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
              <View style={[styles.loadingCard, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={[styles.loadingText, { color: colors.text }]}>Analyzing {analyzerTicker}...</Text>
                <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>Fetching DCF valuation & running AI analysis</Text>
              </View>
            )}

            {/* Analysis Results */}
            {analysisResult && !analyzerLoading && (
              <>
                {/* Stock Header Card */}
                <View style={[styles.stockHeaderCard, { backgroundColor: colors.background }]}>
                  <View style={styles.stockHeaderTop}>
                    <View>
                      <Text style={[styles.stockSymbol, { color: colors.text }]}>{analysisResult.symbol}</Text>
                      <Text style={[styles.stockName, { color: colors.textSecondary }]}>{analysisResult.name}</Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={[styles.stockPrice, { color: colors.text }]}>${analysisResult.price.toFixed(2)}</Text>
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
                  <View style={[styles.dcfCard, { backgroundColor: colors.background }]}>
                    <View style={styles.dcfHeader}>
                      <Ionicons name="calculator" size={22} color="#007AFF" />
                      <Text style={[styles.dcfTitle, { color: colors.text }]}>DCF Valuation</Text>
                    </View>

                    <View style={styles.dcfContent}>
                      <View style={styles.dcfValueRow}>
                        <View style={styles.dcfValueItem}>
                          <Text style={[styles.dcfLabel, { color: colors.textSecondary }]}>Current Price</Text>
                          <Text style={[styles.dcfValue, { color: colors.text }]}>${analysisResult.price.toFixed(2)}</Text>
                        </View>
                        <View style={styles.dcfArrow}>
                          <Ionicons name="arrow-forward" size={24} color={colors.textTertiary} />
                        </View>
                        <View style={styles.dcfValueItem}>
                          <Text style={[styles.dcfLabel, { color: colors.textSecondary }]}>Intrinsic Value</Text>
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
                          <Text style={[styles.valuationPercent, { color: colors.textSecondary }]}>
                            by ${Math.abs(analysisResult.dcfDiff || 0).toFixed(2)} ({Math.abs(analysisResult.dcfDiffPercent || 0).toFixed(1)}%)
                          </Text>
                        </View>
                      </View>

                      {/* Valuation Gauge */}
                      <View style={styles.gaugeContainer}>
                        <View style={[styles.gaugeTrack, { backgroundColor: colors.surface }]}>
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
                          <Text style={[styles.gaugeLabel, { color: colors.textSecondary }]}>Cheap</Text>
                          <Text style={[styles.gaugeLabel, { color: colors.textSecondary }]}>Fair Value</Text>
                          <Text style={[styles.gaugeLabel, { color: colors.textSecondary }]}>Expensive</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* AI Summary Card */}
                <View style={[styles.aiSummaryCard, { backgroundColor: colors.background }]}>
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
                  <Text style={[styles.aiSummaryText, { color: colors.textSecondary }]}>{analysisResult.aiSummary}</Text>
                </View>

                {/* Key Metrics Grid */}
                <View style={[styles.metricsCard, { backgroundColor: colors.background }]}>
                  <Text style={[styles.metricsTitle, { color: colors.text }]}>Key Metrics</Text>
                  <View style={styles.metricsGrid}>
                    <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Market Cap</Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>{formatNumber(analysisResult.marketCap)}</Text>
                    </View>
                    <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>P/E Ratio</Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>{analysisResult.pe?.toFixed(2) || '—'}</Text>
                    </View>
                    <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>EPS</Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>${analysisResult.eps?.toFixed(2) || '—'}</Text>
                    </View>
                    <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>52W High</Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>${analysisResult.yearHigh?.toFixed(2) || '—'}</Text>
                    </View>
                    <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>52W Low</Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>${analysisResult.yearLow?.toFixed(2) || '—'}</Text>
                    </View>
                    <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>ROE</Text>
                      <Text style={[styles.metricValue, { color: (analysisResult.roe || 0) > 15 ? '#00C853' : '#000' }]}>
                        {analysisResult.roe?.toFixed(1) || '—'}%
                      </Text>
                    </View>
                    <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Debt/Equity</Text>
                      <Text style={[styles.metricValue, { color: (analysisResult.debtToEquity || 0) < 1 ? '#00C853' : '#FF9500' }]}>
                        {analysisResult.debtToEquity?.toFixed(2) || '—'}
                      </Text>
                    </View>
                    <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Revenue Growth</Text>
                      <Text style={[styles.metricValue, { color: (analysisResult.revenueGrowth || 0) > 0 ? '#00C853' : '#FF3B30' }]}>
                        {analysisResult.revenueGrowth?.toFixed(1) || '—'}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Strengths & Risks */}
                <View style={styles.analysisCards}>
                  <View style={[styles.strengthsCard, { backgroundColor: colors.background }]}>
                    <View style={styles.listHeader}>
                      <Ionicons name="checkmark-circle" size={20} color="#00C853" />
                      <Text style={[styles.listTitle, { color: colors.text }]}>Key Strengths</Text>
                    </View>
                    {analysisResult.strengths.map((item, idx) => (
                      <View key={idx} style={styles.listItem}>
                        <View style={[styles.listBullet, { backgroundColor: '#00C853' }]} />
                        <Text style={[styles.listText, { color: colors.textSecondary }]}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={[styles.risksCard, { backgroundColor: colors.background }]}>
                    <View style={styles.listHeader}>
                      <Ionicons name="warning" size={20} color="#FF3B30" />
                      <Text style={[styles.listTitle, { color: colors.text }]}>Key Risks</Text>
                    </View>
                    {analysisResult.risks.map((item, idx) => (
                      <View key={idx} style={styles.listItem}>
                        <View style={[styles.listBullet, { backgroundColor: '#FF3B30' }]} />
                        <Text style={[styles.listText, { color: colors.textSecondary }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Price Targets */}
                {analysisResult.priceTarget && (
                  <View style={[styles.priceTargetCard, { backgroundColor: colors.background }]}>
                    <View style={styles.priceTargetHeader}>
                      <Ionicons name="flag" size={20} color="#007AFF" />
                      <Text style={[styles.priceTargetTitle, { color: colors.text }]}>12-Month Price Targets</Text>
                    </View>
                    <View style={styles.priceTargetRow}>
                      <View style={styles.priceTargetItem}>
                        <Text style={[styles.priceTargetLabel, { color: colors.textSecondary }]}>Bear Case</Text>
                        <Text style={[styles.priceTargetValue, { color: '#FF3B30' }]}>${analysisResult.priceTarget.low}</Text>
                      </View>
                      <View style={styles.priceTargetItem}>
                        <Text style={[styles.priceTargetLabel, { color: colors.textSecondary }]}>Base Case</Text>
                        <Text style={[styles.priceTargetValue, { color: '#007AFF' }]}>${analysisResult.priceTarget.mid}</Text>
                      </View>
                      <View style={styles.priceTargetItem}>
                        <Text style={[styles.priceTargetLabel, { color: colors.textSecondary }]}>Bull Case</Text>
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
                  <Ionicons name="information-circle" size={16} color={colors.textTertiary} />
                  <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>AI analysis is for informational purposes only. Not financial advice.</Text>
                </View>
              </>
            )}
            </>
            )}
          </View>
        )}

        {/* Stock Comparison Tab (Diamond Only) */}
        {activeTab === 'compare' && (
          <View style={[styles.compareContainer, { backgroundColor: colors.background }]}>
            {!hasDiamondAccess ? (
              <View style={styles.premiumLockedContainer}>
                <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.premiumLockedGradient}>
                  <View style={styles.premiumLockedIcon}>
                    <Ionicons name="git-compare" size={48} color="#B9F2FF" />
                  </View>
                  <Text style={styles.premiumLockedTitle}>Stock Comparison</Text>
                  <Text style={styles.premiumLockedSubtitle}>Diamond Feature</Text>
                  <Text style={styles.premiumLockedDescription}>
                    Compare two stocks side-by-side with DCF valuations,
                    financial metrics, and AI-powered winner analysis.
                  </Text>
                  <View style={styles.premiumFeaturesList}>
                    {['Side-by-side Analysis', 'DCF Value Comparison', 'AI Winner Selection', 'Key Metrics Grid'].map((feature, idx) => (
                      <View key={idx} style={styles.premiumFeatureItem}>
                        <Ionicons name="checkmark-circle" size={18} color="#B9F2FF" />
                        <Text style={styles.premiumFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.premiumUpgradeButton} onPress={() => router.push('/(modals)/paywall' as any)}>
                    <Ionicons name="diamond" size={20} color="#000" />
                    <Text style={styles.premiumUpgradeText}>Upgrade to Diamond</Text>
                  </TouchableOpacity>
                  <Text style={styles.premiumPriceHint}>Unlock all AI tools</Text>
                </LinearGradient>
              </View>
            ) : (
            <>
            {/* Search Card */}
            <View style={[styles.searchCard, { backgroundColor: isDark ? colors.card : colors.background, shadowOpacity: isDark ? 0 : 0.06, elevation: isDark ? 0 : 3 }]}>
              <Text style={[styles.searchTitle, { color: colors.text }]}>Stock Comparison</Text>
              <Text style={[styles.searchSubtitle, { color: colors.textSecondary }]}>Side-by-side analysis with DCF valuation</Text>

              <View style={styles.compareInputRow}>
                <View style={styles.compareInputWrapper}>
                  <View style={[styles.compareInputBox, { backgroundColor: colors.surface, borderColor: isDark ? 'transparent' : '#E5E5EA' }, compareTicker1 && styles.compareInputBoxActive]}>
                    <Ionicons name="business" size={18} color={compareTicker1 ? '#007AFF' : '#8E8E93'} />
                    <TextInput
                      style={[styles.compareInput, { backgroundColor: 'transparent', color: colors.text }]}
                      placeholder="AAPL"
                      placeholderTextColor={colors.textTertiary}
                      value={compareTicker1}
                      onChangeText={setCompareTicker1}
                      autoCapitalize="characters"
                      maxLength={5}
                    />
                  </View>
                  <Text style={[styles.compareInputLabel, { color: colors.textSecondary }]}>Stock 1</Text>
                </View>

                <View style={styles.vsCircle}>
                  <Text style={styles.vsCircleText}>VS</Text>
                </View>

                <View style={styles.compareInputWrapper}>
                  <View style={[styles.compareInputBox, { backgroundColor: colors.surface, borderColor: isDark ? 'transparent' : '#E5E5EA' }, compareTicker2 && styles.compareInputBoxActive]}>
                    <Ionicons name="business" size={18} color={compareTicker2 ? '#FF9500' : '#8E8E93'} />
                    <TextInput
                      style={[styles.compareInput, { backgroundColor: 'transparent', color: colors.text }]}
                      placeholder="MSFT"
                      placeholderTextColor={colors.textTertiary}
                      value={compareTicker2}
                      onChangeText={setCompareTicker2}
                      autoCapitalize="characters"
                      maxLength={5}
                    />
                  </View>
                  <Text style={[styles.compareInputLabel, { color: colors.textSecondary }]}>Stock 2</Text>
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
                <Text style={[styles.quickPicksLabel, { color: colors.textSecondary }]}>Popular Comparisons:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    ['AAPL', 'MSFT'], ['NVDA', 'AMD'], ['GOOGL', 'META'], ['TSLA', 'RIVN'], ['JPM', 'BAC']
                  ].map(([t1, t2], idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.quickCompareChip, { backgroundColor: colors.surface, borderColor: isDark ? 'transparent' : colors.border }]}
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
              <View style={[styles.loadingCard, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={[styles.loadingText, { color: colors.text }]}>Comparing {compareTicker1} vs {compareTicker2}...</Text>
                <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>Fetching valuations & running AI analysis</Text>
              </View>
            )}

            {/* Comparison Results */}
            {comparisonResult && !compareLoading && (
              <>
                {/* Winner Card */}
                <View style={[styles.winnerCard, { backgroundColor: colors.background }]}>
                  <View style={styles.winnerHeader}>
                    <Ionicons name="trophy" size={24} color="#FFD700" />
                    <Text style={[styles.winnerHeaderText, { color: colors.text }]}>AI Recommendation</Text>
                  </View>
                  <View style={styles.winnerContent}>
                    {comparisonResult.winner === 'TIE' ? (
                      <View style={styles.tieContainer}>
                        <Text style={styles.tieText}>It&apos;s a Tie!</Text>
                        <Text style={styles.tieSubtext}>Both stocks have comparable merits</Text>
                      </View>
                    ) : (
                      <View style={styles.winnerBadge}>
                        <Text style={[styles.winnerSymbol, { color: colors.text }]}>{comparisonResult.winner}</Text>
                        <View style={styles.winnerCrown}>
                          <Ionicons name="ribbon" size={16} color="#FFD700" />
                          <Text style={styles.winnerLabel}>WINNER</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.verdictText, { color: colors.textSecondary }]}>{comparisonResult.aiVerdict}</Text>
                </View>

                {/* Category Winners */}
                <View style={[styles.categoryWinnersCard, { backgroundColor: colors.background }]}>
                  <Text style={[styles.categoryWinnersTitle, { color: colors.text }]}>Best For Each Category</Text>
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
                        <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>{cat.label}</Text>
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
                <View style={[styles.comparisonCard, { backgroundColor: colors.background }]}>
                  <Text style={[styles.comparisonSectionTitle, { color: colors.text }]}>Price & Performance</Text>
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
                <View style={[styles.comparisonCard, { backgroundColor: colors.background }]}>
                  <Text style={[styles.comparisonSectionTitle, { color: colors.text }]}>Valuation</Text>
                  <CompareRow
                    label="P/E Ratio"
                    value1={comparisonResult.stock1.pe?.toFixed(2) || '—'}
                    value2={comparisonResult.stock2.pe?.toFixed(2) || '—'}
                    winner={comparisonResult.stock1.pe && comparisonResult.stock2.pe ? (comparisonResult.stock1.pe < comparisonResult.stock2.pe ? 1 : 2) : 0}
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
                <View style={[styles.comparisonCard, { backgroundColor: colors.background }]}>
                  <Text style={[styles.comparisonSectionTitle, { color: colors.text }]}>Growth & Profitability</Text>
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
                <View style={[styles.comparisonCard, { backgroundColor: colors.background }]}>
                  <Text style={[styles.comparisonSectionTitle, { color: colors.text }]}>Financial Health</Text>
                  <CompareRow
                    label="Debt/Equity"
                    value1={comparisonResult.stock1.debtToEquity?.toFixed(2) || '—'}
                    value2={comparisonResult.stock2.debtToEquity?.toFixed(2) || '—'}
                    winner={comparisonResult.stock1.debtToEquity && comparisonResult.stock2.debtToEquity ? (comparisonResult.stock1.debtToEquity < comparisonResult.stock2.debtToEquity ? 1 : 2) : 0}
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
                  <Ionicons name="information-circle" size={16} color={colors.textTertiary} />
                  <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>Comparison is for informational purposes only. Not financial advice.</Text>
                </View>
              </>
            )}
            </>
            )}
          </View>
        )}

        {/* AI Forecast Tab (Diamond Only) */}
        {activeTab === 'forecast' && (
          <View style={[styles.forecastContainer, { backgroundColor: colors.background }]}>
            {!hasDiamondAccess ? (
              <View style={styles.premiumLockedContainer}>
                <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.premiumLockedGradient}>
                  <View style={styles.premiumLockedIcon}>
                    <Ionicons name="trending-up" size={48} color="#B9F2FF" />
                  </View>
                  <Text style={styles.premiumLockedTitle}>AI Price Forecast</Text>
                  <Text style={styles.premiumLockedSubtitle}>Diamond Feature</Text>
                  <Text style={styles.premiumLockedDescription}>
                    Get AI-powered 3-6 month price targets, probability analysis,
                    technical signals, and actionable catalysts.
                  </Text>
                  <View style={styles.premiumFeaturesList}>
                    {['Price Target Forecasts', 'Probability Analysis', 'Technical Signals', 'Risk & Catalyst Alerts'].map((feature, idx) => (
                      <View key={idx} style={styles.premiumFeatureItem}>
                        <Ionicons name="checkmark-circle" size={18} color="#B9F2FF" />
                        <Text style={styles.premiumFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.premiumUpgradeButton} onPress={() => router.push('/(modals)/paywall' as any)}>
                    <Ionicons name="diamond" size={20} color="#000" />
                    <Text style={styles.premiumUpgradeText}>Upgrade to Diamond</Text>
                  </TouchableOpacity>
                  <Text style={styles.premiumPriceHint}>Unlock all AI tools</Text>
                </LinearGradient>
              </View>
            ) : (
            <>
            {/* Search Card */}
            <View style={[styles.searchCard, { backgroundColor: isDark ? colors.card : colors.background, shadowOpacity: isDark ? 0 : 0.06, elevation: isDark ? 0 : 3 }]}>
              <Text style={[styles.searchTitle, { color: colors.text }]}>AI Price Forecast</Text>
              <Text style={[styles.searchSubtitle, { color: colors.textSecondary }]}>3-6 month price targets & probability analysis</Text>

              <View style={[styles.searchInputContainer, { backgroundColor: colors.surface, borderColor: isDark ? 'transparent' : colors.border }]}>
                <Ionicons name="telescope" size={20} color={colors.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Enter ticker symbol (e.g., TSLA)"
                  placeholderTextColor={colors.textTertiary}
                  value={forecastTicker}
                  onChangeText={setForecastTicker}
                  autoCapitalize="characters"
                  onSubmitEditing={() => handleForecast()}
                />
                {forecastTicker.length > 0 && (
                  <TouchableOpacity onPress={() => { setForecastTicker(''); setForecastResult(null); }}>
                    <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
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
                <Text style={[styles.quickPicksLabel, { color: colors.textSecondary }]}>Quick Forecast:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['TSLA', 'NVDA', 'AAPL', 'META', 'AMD', 'AMZN'].map((sym) => (
                    <TouchableOpacity
                      key={sym}
                      style={[styles.quickPickChip, { backgroundColor: colors.surface, borderColor: isDark ? 'transparent' : '#5856D620' }]}
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
              <View style={[styles.loadingCard, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color="#5856D6" />
                <Text style={[styles.loadingText, { color: colors.text }]}>Forecasting {forecastTicker}...</Text>
                <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>Analyzing technicals & generating predictions</Text>
              </View>
            )}

            {/* Forecast Results */}
            {forecastResult && !forecastLoading && (
              <>
                {/* Stock Header */}
                <View style={[styles.forecastHeaderCard, { backgroundColor: colors.background }]}>
                  <View style={styles.forecastHeaderTop}>
                    <View>
                      <Text style={[styles.stockSymbol, { color: colors.text }]}>{forecastResult.symbol}</Text>
                      <Text style={[styles.stockName, { color: colors.textSecondary }]}>{forecastResult.name}</Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={[styles.stockPrice, { color: colors.text }]}>${forecastResult.currentPrice.toFixed(2)}</Text>
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
                <View style={[styles.priceTargetsCard, { backgroundColor: colors.background }]}>
                  <View style={styles.priceTargetsHeader}>
                    <Ionicons name="flag" size={20} color="#5856D6" />
                    <Text style={[styles.priceTargetsTitle, { color: colors.text }]}>Price Targets</Text>
                  </View>

                  <View style={styles.targetsVisual}>
                    {/* Visual Range Bar */}
                    <View style={styles.targetRangeContainer}>
                      {/* Price Labels Row */}
                      <View style={styles.targetLabelsRow}>
                        <View style={styles.targetLabelItem}>
                          <Text style={[styles.targetLabelPrice, { color: '#FF3B30' }]}>${forecastResult.priceTargets.conservative.toFixed(0)}</Text>
                          <Text style={[styles.targetLabelName, { color: colors.textSecondary }]}>Bear</Text>
                        </View>
                        <View style={[styles.targetLabelItem, { alignItems: 'center' }]}>
                          <Text style={[styles.targetLabelPrice, { color: '#5856D6' }]}>${forecastResult.priceTargets.base.toFixed(0)}</Text>
                          <Text style={[styles.targetLabelName, { color: colors.textSecondary }]}>Base</Text>
                        </View>
                        <View style={[styles.targetLabelItem, { alignItems: 'flex-end' }]}>
                          <Text style={[styles.targetLabelPrice, { color: '#00C853' }]}>${forecastResult.priceTargets.bullish.toFixed(0)}</Text>
                          <Text style={[styles.targetLabelName, { color: colors.textSecondary }]}>Bull</Text>
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
                          <Text style={[styles.currentPriceLabel, { color: colors.textSecondary }]}>Current: ${forecastResult.currentPrice.toFixed(0)}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Target Cards */}
                    <View style={styles.targetCardsRow}>
                      <View style={[styles.targetCard, { borderColor: '#FF3B3030' }]}>
                        <Ionicons name="trending-down" size={18} color="#FF3B30" />
                        <Text style={[styles.targetCardLabel, { color: colors.textSecondary }]}>Conservative</Text>
                        <Text style={[styles.targetCardValue, { color: '#FF3B30' }]}>${forecastResult.priceTargets.conservative.toFixed(2)}</Text>
                        <Text style={[styles.targetCardPercent, { color: colors.textSecondary }]}>
                          {(((forecastResult.priceTargets.conservative - forecastResult.currentPrice) / forecastResult.currentPrice) * 100).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={[styles.targetCard, { borderColor: '#5856D630', backgroundColor: '#5856D610' }]}>
                        <Ionicons name="remove" size={18} color="#5856D6" />
                        <Text style={[styles.targetCardLabel, { color: colors.textSecondary }]}>Base Case</Text>
                        <Text style={[styles.targetCardValue, { color: '#5856D6' }]}>${forecastResult.priceTargets.base.toFixed(2)}</Text>
                        <Text style={[styles.targetCardPercent, { color: '#5856D6' }]}>
                          +{(((forecastResult.priceTargets.base - forecastResult.currentPrice) / forecastResult.currentPrice) * 100).toFixed(1)}%
                        </Text>
                      </View>
                      <View style={[styles.targetCard, { borderColor: '#00C85330' }]}>
                        <Ionicons name="trending-up" size={18} color="#00C853" />
                        <Text style={[styles.targetCardLabel, { color: colors.textSecondary }]}>Bullish</Text>
                        <Text style={[styles.targetCardValue, { color: '#00C853' }]}>${forecastResult.priceTargets.bullish.toFixed(2)}</Text>
                        <Text style={[styles.targetCardPercent, { color: '#00C853' }]}>
                          +{(((forecastResult.priceTargets.bullish - forecastResult.currentPrice) / forecastResult.currentPrice) * 100).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Probability Card */}
                <View style={[styles.probabilityCard, { backgroundColor: colors.background }]}>
                  <Text style={[styles.probabilityTitle, { color: colors.text }]}>Probability Assessment</Text>
                  <View style={styles.probabilityRow}>
                    <View style={styles.probabilityItem}>
                      <View style={styles.probabilityCircle}>
                        <Text style={[styles.probabilityValue, { color: '#00C853' }]}>{forecastResult.probabilities.upside}%</Text>
                      </View>
                      <Text style={[styles.probabilityLabel, { color: colors.textSecondary }]}>Upside</Text>
                    </View>
                    <View style={styles.probabilityBarContainer}>
                      <View style={[styles.probabilityBar, { backgroundColor: '#00C853', flex: forecastResult.probabilities.upside }]} />
                      <View style={[styles.probabilityBar, { backgroundColor: '#FF3B30', flex: forecastResult.probabilities.downside }]} />
                    </View>
                    <View style={styles.probabilityItem}>
                      <View style={styles.probabilityCircle}>
                        <Text style={[styles.probabilityValue, { color: '#FF3B30' }]}>{forecastResult.probabilities.downside}%</Text>
                      </View>
                      <Text style={[styles.probabilityLabel, { color: colors.textSecondary }]}>Downside</Text>
                    </View>
                  </View>
                </View>

                {/* Technical Signals Card */}
                <View style={[styles.technicalCard, { backgroundColor: colors.background }]}>
                  <View style={styles.technicalHeader}>
                    <Ionicons name="pulse" size={20} color="#007AFF" />
                    <Text style={[styles.technicalTitle, { color: colors.text }]}>Technical Signals</Text>
                  </View>
                  <View style={styles.technicalGrid}>
                    <View style={[styles.technicalItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.technicalLabel, { color: colors.textSecondary }]}>Trend</Text>
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
                    <View style={[styles.technicalItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.technicalLabel, { color: colors.textSecondary }]}>Momentum</Text>
                      <Text style={[styles.technicalValue, { color: forecastResult.momentum >= 0 ? '#00C853' : '#FF3B30' }]}>
                        {forecastResult.momentum >= 0 ? '+' : ''}{forecastResult.momentum.toFixed(2)}%
                      </Text>
                    </View>
                    <View style={[styles.technicalItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.technicalLabel, { color: colors.textSecondary }]}>Support</Text>
                      <Text style={[styles.technicalValue, { color: colors.text }]}>${forecastResult.technicalSignals.support.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.technicalItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.technicalLabel, { color: colors.textSecondary }]}>Resistance</Text>
                      <Text style={[styles.technicalValue, { color: colors.text }]}>${forecastResult.technicalSignals.resistance.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.technicalItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.technicalLabel, { color: colors.textSecondary }]}>52W High</Text>
                      <Text style={[styles.technicalValue, { color: colors.text }]}>${forecastResult.yearHigh.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.technicalItem, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.technicalLabel, { color: colors.textSecondary }]}>Volatility</Text>
                      <Text style={[styles.technicalValue, { color: forecastResult.volatility > 3 ? '#FF9500' : '#00C853' }]}>
                        {forecastResult.volatility.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* AI Summary Card */}
                <View style={[styles.aiSummaryCard, { backgroundColor: colors.background }]}>
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
                  <Text style={[styles.aiSummaryText, { color: colors.textSecondary }]}>{forecastResult.summary}</Text>
                </View>

                {/* Catalysts & Risks */}
                <View style={styles.analysisCards}>
                  <View style={[styles.strengthsCard, { backgroundColor: colors.background }]}>
                    <View style={styles.listHeader}>
                      <Ionicons name="rocket" size={20} color="#00C853" />
                      <Text style={[styles.listTitle, { color: colors.text }]}>Key Catalysts</Text>
                    </View>
                    {forecastResult.catalysts.map((item, idx) => (
                      <View key={idx} style={styles.listItem}>
                        <View style={[styles.listBullet, { backgroundColor: '#00C853' }]} />
                        <Text style={[styles.listText, { color: colors.textSecondary }]}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={[styles.risksCard, { backgroundColor: colors.background }]}>
                    <View style={styles.listHeader}>
                      <Ionicons name="warning" size={20} color="#FF3B30" />
                      <Text style={[styles.listTitle, { color: colors.text }]}>Key Risks</Text>
                    </View>
                    {forecastResult.risks.map((item, idx) => (
                      <View key={idx} style={styles.listItem}>
                        <View style={[styles.listBullet, { backgroundColor: '#FF3B30' }]} />
                        <Text style={[styles.listText, { color: colors.textSecondary }]}>{item}</Text>
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
                  <Ionicons name="information-circle" size={16} color={colors.textTertiary} />
                  <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>Forecasts are AI-generated predictions. Not financial advice.</Text>
                </View>
              </>
            )}
            </>
            )}
          </View>
        )}

        {/* AI Assistant Tab (Diamond Only) */}
        {activeTab === 'assistant' && (
          !hasDiamondAccess ? (
            <View style={styles.premiumLockedContainer}>
              <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.premiumLockedGradient}>
                <View style={styles.premiumLockedIcon}>
                  <Ionicons name="chatbubbles" size={48} color="#B9F2FF" />
                </View>
                <Text style={styles.premiumLockedTitle}>AI Financial Assistant</Text>
                <Text style={styles.premiumLockedSubtitle}>Diamond Feature</Text>
                <Text style={styles.premiumLockedDescription}>
                  Chat with our AI assistant for personalized investment insights,
                  portfolio advice, and market analysis.
                </Text>
                <View style={styles.premiumFeaturesList}>
                  {['24/7 AI Chat Support', 'Investment Q&A', 'Market Insights', 'Portfolio Advice'].map((feature, idx) => (
                    <View key={idx} style={styles.premiumFeatureItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#B9F2FF" />
                      <Text style={styles.premiumFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={styles.premiumUpgradeButton} onPress={() => router.push('/(modals)/paywall' as any)}>
                  <Ionicons name="diamond" size={20} color="#000" />
                  <Text style={styles.premiumUpgradeText}>Upgrade to Diamond</Text>
                </TouchableOpacity>
                <Text style={styles.premiumPriceHint}>Unlock all AI tools</Text>
              </LinearGradient>
            </View>
          ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.chatPageContainer, { backgroundColor: colors.background }]}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
          >
            <ScrollView
              style={styles.chatScrollView}
              contentContainerStyle={styles.chatScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Chat Header Card */}
              <View style={[styles.chatHeaderCard, { backgroundColor: colors.background }]}>
                <View style={styles.chatHeaderTop}>
                  <View style={styles.chatHeaderIconBg}>
                    <Ionicons name="sparkles" size={28} color="#34C759" />
                  </View>
                  <View style={styles.chatHeaderTextContainer}>
                    <Text style={[styles.chatHeaderTitle, { color: colors.text }]}>AI Trading Assistant</Text>
                    <Text style={[styles.chatHeaderSubtitle, { color: colors.textSecondary }]}>Ask anything about stocks, trading & investing</Text>
                  </View>
                </View>
                <View style={styles.chatCapabilities}>
                  <View style={[styles.capabilityChip, { backgroundColor: colors.surface }]}>
                    <Ionicons name="analytics" size={14} color="#007AFF" />
                    <Text style={[styles.capabilityText, { color: colors.text }]}>Market Analysis</Text>
                  </View>
                  <View style={[styles.capabilityChip, { backgroundColor: colors.surface }]}>
                    <Ionicons name="school" size={14} color="#5856D6" />
                    <Text style={[styles.capabilityText, { color: colors.text }]}>Education</Text>
                  </View>
                  <View style={[styles.capabilityChip, { backgroundColor: colors.surface }]}>
                    <Ionicons name="pie-chart" size={14} color="#FF9500" />
                    <Text style={[styles.capabilityText, { color: colors.text }]}>Portfolio Tips</Text>
                  </View>
                </View>
              </View>

              {/* Suggested Questions - Only show when few messages */}
              {messages.length <= 2 && (
                <View style={styles.suggestedContainer}>
                  <Text style={[styles.suggestedTitle, { color: colors.text }]}>Suggested Questions</Text>
                  <View style={styles.suggestedGrid}>
                    {SUGGESTED_QUESTIONS.map((q, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.suggestedCard, { backgroundColor: colors.surface }]}
                        onPress={() => {
                          setUserInput(q.text);
                        }}
                      >
                        <View style={[styles.suggestedIconBg, { backgroundColor: `${q.color}15` }]}>
                          <Ionicons name={q.icon as any} size={20} color={q.color} />
                        </View>
                        <Text style={[styles.suggestedText, { color: colors.text }]} numberOfLines={2}>{q.text}</Text>
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
                    <View style={[styles.messageBubbleContent, message.role === 'user' ? styles.userBubbleContent : [styles.aiBubbleContent, { backgroundColor: colors.surface }]]}>
                      <Text style={[styles.messageBubbleText, { color: colors.text }, message.role === 'user' && styles.userBubbleText]}>{message.content}</Text>
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
                    <View style={[styles.messageBubbleContent, styles.aiBubbleContent, { backgroundColor: colors.surface }]}>
                      <View style={styles.typingIndicator}>
                        <View style={[styles.typingDot, styles.typingDot1]} />
                        <View style={[styles.typingDot, styles.typingDot2]} />
                        <View style={[styles.typingDot, styles.typingDot3]} />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.chatInputArea, { backgroundColor: colors.background }]}>
              <View style={[styles.chatInputWrapper, { backgroundColor: colors.surface, borderColor: isDark ? 'transparent' : colors.border }]}>
                <TextInput
                  style={[styles.chatTextInput, { color: colors.text }]}
                  placeholder="Ask about stocks, trading strategies..."
                  placeholderTextColor={colors.textTertiary}
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
              <Text style={[styles.chatDisclaimer, { color: colors.textTertiary }]}>AI responses are for educational purposes only. Not financial advice.</Text>
            </View>
          </KeyboardAvoidingView>
          )
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <View style={[styles.resourcesContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.resourcesHeader, { backgroundColor: colors.background }]}>
              <Ionicons name="library" size={28} color="#007AFF" />
              <View>
                <Text style={[styles.resourcesTitle, { color: colors.text }]}>Learning Resources</Text>
                <Text style={[styles.resourcesSubtitle, { color: colors.textSecondary }]}>Expand your financial knowledge</Text>
              </View>
            </View>

            <View style={styles.categoriesGrid}>
              {RESOURCE_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat.id} style={[styles.categoryCard, { backgroundColor: colors.surface }]} onPress={() => router.push(`/resources/${cat.id}` as any)}>
                  <View style={[styles.categoryIconBg, { backgroundColor: `${cat.color}15` }]}>
                    <Ionicons name={cat.icon} size={24} color={cat.color} />
                  </View>
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>{cat.title}</Text>
                  <Text style={[styles.categoryDesc, { color: colors.textSecondary }]} numberOfLines={2}>{cat.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Insider Trading Tab (Diamond Only) */}
        {activeTab === 'insider' && (
          <View style={[styles.insiderContainer, { backgroundColor: colors.background }]}>
            {!hasDiamondAccess ? (
              <View style={styles.premiumLockedContainer}>
                <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.premiumLockedGradient}>
                  <View style={styles.premiumLockedIcon}>
                    <Ionicons name="briefcase" size={48} color="#B9F2FF" />
                  </View>
                  <Text style={styles.premiumLockedTitle}>Insider Trading Data</Text>
                  <Text style={styles.premiumLockedSubtitle}>Diamond Feature</Text>
                  <Text style={styles.premiumLockedDescription}>
                    Track SEC Form 4 filings and see what executives,
                    directors, and insiders are buying and selling.
                  </Text>
                  <View style={styles.premiumFeaturesList}>
                    {['Real-Time SEC Filings', 'Buy/Sell Activity Tracking', 'Executive Trade Details', 'Symbol Search'].map((feature, idx) => (
                      <View key={idx} style={styles.premiumFeatureItem}>
                        <Ionicons name="checkmark-circle" size={18} color="#B9F2FF" />
                        <Text style={styles.premiumFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.premiumUpgradeButton} onPress={() => router.push('/(modals)/paywall' as any)}>
                    <Ionicons name="diamond" size={20} color="#000" />
                    <Text style={styles.premiumUpgradeText}>Upgrade to Diamond</Text>
                  </TouchableOpacity>
                  <Text style={styles.premiumPriceHint}>Unlock all AI tools</Text>
                </LinearGradient>
              </View>
            ) : (
            <>
            {/* Header */}
            <View style={[styles.insiderHeader, { backgroundColor: colors.background }]}>
              <View style={styles.insiderHeaderIcon}>
                <Ionicons name="briefcase" size={28} color="#5856D6" />
              </View>
              <View style={styles.insiderHeaderText}>
                <Text style={[styles.insiderHeaderTitle, { color: colors.text }]}>Insider Trading</Text>
                <Text style={[styles.insiderHeaderSubtitle, { color: colors.textSecondary }]}>Track what executives are buying & selling</Text>
              </View>
            </View>

            {/* Info Card */}
            <View style={[styles.insiderInfoCard, { backgroundColor: colors.background }]}>
              <View style={styles.insiderInfoRow}>
                <View style={styles.insiderInfoItem}>
                  <Ionicons name="eye" size={20} color="#007AFF" />
                  <Text style={[styles.insiderInfoLabel, { color: colors.textSecondary }]}>Real-Time Data</Text>
                </View>
                <View style={styles.insiderInfoItem}>
                  <Ionicons name="document-text" size={20} color="#34C759" />
                  <Text style={[styles.insiderInfoLabel, { color: colors.textSecondary }]}>SEC Filings</Text>
                </View>
                <View style={styles.insiderInfoItem}>
                  <Ionicons name="search" size={20} color="#FF9500" />
                  <Text style={[styles.insiderInfoLabel, { color: colors.textSecondary }]}>Symbol Search</Text>
                </View>
              </View>
            </View>

            {/* Feature List */}
            <View style={[styles.insiderFeatures, { backgroundColor: colors.background }]}>
              <Text style={[styles.insiderFeaturesTitle, { color: colors.text }]}>What you can do:</Text>
              {[
                { icon: 'search', text: 'Search insider trades by stock symbol', color: '#007AFF' },
                { icon: 'trending-up', text: 'Filter by buys or sells', color: '#34C759' },
                { icon: 'person', text: 'See who is trading (executives, directors)', color: '#FF9500' },
                { icon: 'cash', text: 'View trade values and share counts', color: '#5856D6' },
                { icon: 'time', text: 'Track recent SEC Form 4 filings', color: '#FF3B30' },
              ].map((feature, idx) => (
                <View key={idx} style={styles.insiderFeatureItem}>
                  <View style={[styles.insiderFeatureIcon, { backgroundColor: `${feature.color}15` }]}>
                    <Ionicons name={feature.icon as any} size={16} color={feature.color} />
                  </View>
                  <Text style={[styles.insiderFeatureText, { color: colors.textSecondary }]}>{feature.text}</Text>
                </View>
              ))}
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              style={styles.insiderCTAButton}
              onPress={() => router.push('/insider-trading')}
            >
              <Text style={styles.insiderCTAText}>Open Insider Trading</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>

            {/* Quick Access Popular Stocks */}
            <View style={[styles.insiderQuickAccess, { backgroundColor: colors.background }]}>
              <Text style={[styles.insiderQuickTitle, { color: colors.text }]}>Quick Access</Text>
              <Text style={[styles.insiderQuickSubtitle, { color: colors.textSecondary }]}>Check insider activity for popular stocks</Text>
              <View style={styles.insiderQuickGrid}>
                {['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN'].map((symbol) => (
                  <TouchableOpacity
                    key={symbol}
                    style={[styles.insiderQuickChip, { backgroundColor: colors.surface }]}
                    onPress={() => router.push('/insider-trading')}
                  >
                    <Text style={[styles.insiderQuickChipText, { color: colors.text }]}>{symbol}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Disclaimer */}
            <View style={styles.insiderDisclaimer}>
              <Ionicons name="information-circle" size={16} color={colors.textTertiary} />
              <Text style={[styles.insiderDisclaimerText, { color: colors.textTertiary }]}>
                Insider trading data is sourced from SEC Form 4 filings. This is for informational purposes only.
              </Text>
            </View>
            </>
            )}
          </View>
        )}

        {/* Advanced Calculator Tab */}
        {activeTab === 'calculator' && (
          <View style={[styles.calculatorContainer, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.calcHeader, { backgroundColor: colors.background }]}>
              <View style={styles.calcHeaderIcon}>
                <Ionicons name="calculator" size={28} color="#34C759" />
              </View>
              <View>
                <Text style={[styles.calcHeaderTitle, { color: colors.text }]}>Financial Calculators</Text>
                <Text style={[styles.calcHeaderSubtitle, { color: colors.textSecondary }]}>Plan your financial future</Text>
              </View>
            </View>

            {/* Calculator Type Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calcTypeScroll}>
              {[
                { key: 'investment', label: 'Investment', icon: 'trending-up', color: '#34C759' },
                { key: 'mortgage', label: 'Mortgage', icon: 'home', color: '#007AFF' },
                { key: 'loan', label: 'Loan', icon: 'card', color: '#FF9500' },
                { key: 'bond', label: 'Bond', icon: 'ribbon', color: '#5856D6' },
                { key: 'retirement', label: 'Retirement', icon: 'sunny', color: '#FF3B30' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.calcTypeButton,
                    calcType === type.key && { backgroundColor: `${type.color}15`, borderColor: type.color },
                  ]}
                  onPress={() => { setCalcType(type.key as any); setCalcResult(null); }}
                >
                  <Ionicons name={type.icon as any} size={18} color={calcType === type.key ? type.color : '#8E8E93'} />
                  <Text style={[styles.calcTypeText, calcType === type.key && { color: type.color }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Investment Calculator */}
            {calcType === 'investment' && (
              <View style={[styles.calcCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.calcCardTitle, { color: colors.text }]}>Investment Growth Calculator</Text>
                <View style={styles.calcInputGroup}>
                  <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Initial Investment</Text>
                  <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                    <TextInput style={[styles.calcInput, { color: colors.text }]} value={calcInitialAmount} onChangeText={setCalcInitialAmount} keyboardType="numeric" placeholder="10,000" placeholderTextColor={colors.textTertiary} />
                  </View>
                </View>
                <View style={styles.calcInputGroup}>
                  <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Monthly Contribution</Text>
                  <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                    <TextInput style={[styles.calcInput, { color: colors.text }]} value={calcMonthlyContribution} onChangeText={setCalcMonthlyContribution} keyboardType="numeric" placeholder="500" placeholderTextColor={colors.textTertiary} />
                  </View>
                </View>
                <View style={styles.calcRow}>
                  <View style={[styles.calcInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Years</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={calcYears} onChangeText={setCalcYears} keyboardType="numeric" placeholder="10" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>yrs</Text>
                    </View>
                  </View>
                  <View style={[styles.calcInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Annual Return</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={calcAnnualReturn} onChangeText={setCalcAnnualReturn} keyboardType="numeric" placeholder="8" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>%</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={[styles.calcButton, { backgroundColor: '#34C759' }]} onPress={() => {
                  const initial = parseFloat(calcInitialAmount) || 0;
                  const monthly = parseFloat(calcMonthlyContribution) || 0;
                  const years = parseInt(calcYears) || 10;
                  const rate = (parseFloat(calcAnnualReturn) || 8) / 100;
                  const monthlyRate = rate / 12;
                  const months = years * 12;
                  let balance = initial;
                  let totalContributions = initial;
                  for (let month = 1; month <= months; month++) {
                    balance = balance * (1 + monthlyRate) + monthly;
                    totalContributions += monthly;
                  }
                  setCalcResult({ type: 'investment', futureValue: Math.round(balance), totalContributions: Math.round(totalContributions), totalInterest: Math.round(balance - totalContributions), years });
                }}>
                  <Ionicons name="calculator" size={20} color="#FFF" />
                  <Text style={styles.calcButtonText}>Calculate Growth</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Mortgage Calculator */}
            {calcType === 'mortgage' && (
              <View style={[styles.calcCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.calcCardTitle, { color: colors.text }]}>Mortgage Payment Calculator</Text>
                <View style={styles.calcInputGroup}>
                  <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Home Price</Text>
                  <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                    <TextInput style={[styles.calcInput, { color: colors.text }]} value={mortgageHomePrice} onChangeText={setMortgageHomePrice} keyboardType="numeric" placeholder="400,000" placeholderTextColor={colors.textTertiary} />
                  </View>
                </View>
                <View style={styles.calcInputGroup}>
                  <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Down Payment</Text>
                  <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                    <TextInput style={[styles.calcInput, { color: colors.text }]} value={mortgageDownPayment} onChangeText={setMortgageDownPayment} keyboardType="numeric" placeholder="80,000" placeholderTextColor={colors.textTertiary} />
                  </View>
                </View>
                <View style={styles.calcRow}>
                  <View style={[styles.calcInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Interest Rate</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={mortgageInterestRate} onChangeText={setMortgageInterestRate} keyboardType="numeric" placeholder="6.5" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>%</Text>
                    </View>
                  </View>
                  <View style={[styles.calcInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Loan Term</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={mortgageTerm} onChangeText={setMortgageTerm} keyboardType="numeric" placeholder="30" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>yrs</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.calcRow}>
                  <View style={[styles.calcInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Property Tax/yr</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={mortgagePropertyTax} onChangeText={setMortgagePropertyTax} keyboardType="numeric" placeholder="3,600" placeholderTextColor={colors.textTertiary} />
                    </View>
                  </View>
                  <View style={[styles.calcInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Insurance/yr</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={mortgageInsurance} onChangeText={setMortgageInsurance} keyboardType="numeric" placeholder="1,200" placeholderTextColor={colors.textTertiary} />
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={[styles.calcButton, { backgroundColor: '#007AFF' }]} onPress={() => {
                  const principal = (parseFloat(mortgageHomePrice) || 0) - (parseFloat(mortgageDownPayment) || 0);
                  const rate = (parseFloat(mortgageInterestRate) || 6.5) / 100 / 12;
                  const payments = (parseInt(mortgageTerm) || 30) * 12;
                  const monthlyPI = principal * (rate * Math.pow(1 + rate, payments)) / (Math.pow(1 + rate, payments) - 1);
                  const monthlyTax = (parseFloat(mortgagePropertyTax) || 0) / 12;
                  const monthlyIns = (parseFloat(mortgageInsurance) || 0) / 12;
                  const totalMonthly = monthlyPI + monthlyTax + monthlyIns;
                  const totalPayments = totalMonthly * payments;
                  const totalInterest = (monthlyPI * payments) - principal;
                  setCalcResult({ type: 'mortgage', monthlyPayment: Math.round(totalMonthly), principalInterest: Math.round(monthlyPI), propertyTax: Math.round(monthlyTax), insurance: Math.round(monthlyIns), loanAmount: Math.round(principal), totalPayments: Math.round(totalPayments), totalInterest: Math.round(totalInterest), downPaymentPercent: Math.round(((parseFloat(mortgageDownPayment) || 0) / (parseFloat(mortgageHomePrice) || 1)) * 100) });
                }}>
                  <Ionicons name="home" size={20} color="#FFF" />
                  <Text style={styles.calcButtonText}>Calculate Mortgage</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loan Calculator */}
            {calcType === 'loan' && (
              <View style={[styles.calcCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.calcCardTitle, { color: colors.text }]}>Loan Payment Calculator</Text>
                <View style={styles.calcInputGroup}>
                  <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Loan Amount</Text>
                  <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                    <TextInput style={[styles.calcInput, { color: colors.text }]} value={loanAmount} onChangeText={setLoanAmount} keyboardType="numeric" placeholder="25,000" placeholderTextColor={colors.textTertiary} />
                  </View>
                </View>
                <View style={styles.calcRow}>
                  <View style={[styles.calcInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Interest Rate</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={loanInterestRate} onChangeText={setLoanInterestRate} keyboardType="numeric" placeholder="7.5" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>%</Text>
                    </View>
                  </View>
                  <View style={[styles.calcInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Loan Term</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={loanTerm} onChangeText={setLoanTerm} keyboardType="numeric" placeholder="5" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>yrs</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={[styles.calcButton, { backgroundColor: '#FF9500' }]} onPress={() => {
                  const principal = parseFloat(loanAmount) || 0;
                  const rate = (parseFloat(loanInterestRate) || 7.5) / 100 / 12;
                  const payments = (parseInt(loanTerm) || 5) * 12;
                  const monthlyPayment = principal * (rate * Math.pow(1 + rate, payments)) / (Math.pow(1 + rate, payments) - 1);
                  const totalPayments = monthlyPayment * payments;
                  const totalInterest = totalPayments - principal;
                  setCalcResult({ type: 'loan', monthlyPayment: Math.round(monthlyPayment), totalPayments: Math.round(totalPayments), totalInterest: Math.round(totalInterest), principal: Math.round(principal) });
                }}>
                  <Ionicons name="card" size={20} color="#FFF" />
                  <Text style={styles.calcButtonText}>Calculate Loan</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bond Calculator */}
            {calcType === 'bond' && (
              <View style={[styles.calcCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.calcCardTitle, { color: colors.text }]}>Bond Valuation Calculator</Text>
                <View style={styles.calcRow}>
                  <View style={[styles.calcInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Face Value</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={bondFaceValue} onChangeText={setBondFaceValue} keyboardType="numeric" placeholder="1,000" placeholderTextColor={colors.textTertiary} />
                    </View>
                  </View>
                  <View style={[styles.calcInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Coupon Rate</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={bondCouponRate} onChangeText={setBondCouponRate} keyboardType="numeric" placeholder="5" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>%</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.calcRow}>
                  <View style={[styles.calcInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Years to Maturity</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={bondYearsToMaturity} onChangeText={setBondYearsToMaturity} keyboardType="numeric" placeholder="10" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>yrs</Text>
                    </View>
                  </View>
                  <View style={[styles.calcInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Market Rate</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={bondMarketRate} onChangeText={setBondMarketRate} keyboardType="numeric" placeholder="4" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>%</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.calcInputGroup}>
                  <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Payments per Year</Text>
                  <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TextInput style={[styles.calcInput, { color: colors.text }]} value={bondPaymentFrequency} onChangeText={setBondPaymentFrequency} keyboardType="numeric" placeholder="2" placeholderTextColor={colors.textTertiary} />
                    <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>/yr</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.calcButton, { backgroundColor: '#5856D6' }]} onPress={() => {
                  const faceValue = parseFloat(bondFaceValue) || 1000;
                  const couponRate = (parseFloat(bondCouponRate) || 5) / 100;
                  const years = parseInt(bondYearsToMaturity) || 10;
                  const marketRate = (parseFloat(bondMarketRate) || 4) / 100;
                  const frequency = parseInt(bondPaymentFrequency) || 2;
                  const couponPayment = (faceValue * couponRate) / frequency;
                  const periodicRate = marketRate / frequency;
                  const totalPeriods = years * frequency;
                  let pvCoupons = 0;
                  for (let t = 1; t <= totalPeriods; t++) {
                    pvCoupons += couponPayment / Math.pow(1 + periodicRate, t);
                  }
                  const pvFaceValue = faceValue / Math.pow(1 + periodicRate, totalPeriods);
                  const bondPrice = pvCoupons + pvFaceValue;
                  const currentYield = (couponPayment * frequency) / bondPrice * 100;
                  setCalcResult({ type: 'bond', bondPrice: Math.round(bondPrice * 100) / 100, couponPayment: Math.round(couponPayment * 100) / 100, annualIncome: Math.round(couponPayment * frequency * 100) / 100, totalIncome: Math.round(couponPayment * totalPeriods * 100) / 100, currentYield: Math.round(currentYield * 100) / 100, isPremium: bondPrice > faceValue, faceValue });
                }}>
                  <Ionicons name="ribbon" size={20} color="#FFF" />
                  <Text style={styles.calcButtonText}>Calculate Bond Value</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Retirement Calculator */}
            {calcType === 'retirement' && (
              <View style={[styles.calcCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.calcCardTitle, { color: colors.text }]}>Retirement Planning Calculator</Text>
                <View style={styles.calcRow}>
                  <View style={[styles.calcInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Current Age</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={retireCurrentAge} onChangeText={setRetireCurrentAge} keyboardType="numeric" placeholder="30" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>yrs</Text>
                    </View>
                  </View>
                  <View style={[styles.calcInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Retirement Age</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={retireTargetAge} onChangeText={setRetireTargetAge} keyboardType="numeric" placeholder="65" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>yrs</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.calcRow}>
                  <View style={[styles.calcInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Current Savings</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={retireCurrentSavings} onChangeText={setRetireCurrentSavings} keyboardType="numeric" placeholder="50,000" placeholderTextColor={colors.textTertiary} />
                    </View>
                  </View>
                  <View style={[styles.calcInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Monthly Savings</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={retireMonthlyContrib} onChangeText={setRetireMonthlyContrib} keyboardType="numeric" placeholder="1,000" placeholderTextColor={colors.textTertiary} />
                    </View>
                  </View>
                </View>
                <View style={styles.calcRow}>
                  <View style={[styles.calcInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Expected Return</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={retireExpectedReturn} onChangeText={setRetireExpectedReturn} keyboardType="numeric" placeholder="7" placeholderTextColor={colors.textTertiary} />
                      <Text style={[styles.calcInputSuffix, { color: colors.textTertiary }]}>%</Text>
                    </View>
                  </View>
                  <View style={[styles.calcInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.calcInputLabel, { color: colors.textSecondary }]}>Monthly Expense</Text>
                    <View style={[styles.calcInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.calcInputPrefix, { color: colors.textTertiary }]}>$</Text>
                      <TextInput style={[styles.calcInput, { color: colors.text }]} value={retireMonthlyExpense} onChangeText={setRetireMonthlyExpense} keyboardType="numeric" placeholder="5,000" placeholderTextColor={colors.textTertiary} />
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={[styles.calcButton, { backgroundColor: '#FF3B30' }]} onPress={() => {
                  const currentAge = parseInt(retireCurrentAge) || 30;
                  const targetAge = parseInt(retireTargetAge) || 65;
                  const currentSavings = parseFloat(retireCurrentSavings) || 0;
                  const monthlyContrib = parseFloat(retireMonthlyContrib) || 0;
                  const expectedReturn = (parseFloat(retireExpectedReturn) || 7) / 100;
                  const monthlyExpense = parseFloat(retireMonthlyExpense) || 5000;
                  const yearsToRetire = targetAge - currentAge;
                  const monthsToRetire = yearsToRetire * 12;
                  const monthlyReturn = expectedReturn / 12;
                  let balance = currentSavings;
                  for (let m = 0; m < monthsToRetire; m++) {
                    balance = balance * (1 + monthlyReturn) + monthlyContrib;
                  }
                  const annualExpense = monthlyExpense * 12;
                  const withdrawalRate = 0.04;
                  const neededForRetirement = annualExpense / withdrawalRate;
                  const yearsOfRetirement = balance / annualExpense;
                  const monthlyIncome = balance * withdrawalRate / 12;
                  setCalcResult({ type: 'retirement', retirementSavings: Math.round(balance), neededForRetirement: Math.round(neededForRetirement), yearsOfRetirement: Math.round(yearsOfRetirement * 10) / 10, monthlyIncome: Math.round(monthlyIncome), totalContributions: Math.round(currentSavings + (monthlyContrib * monthsToRetire)), isOnTrack: balance >= neededForRetirement, gap: Math.round(neededForRetirement - balance) });
                }}>
                  <Ionicons name="sunny" size={20} color="#FFF" />
                  <Text style={styles.calcButtonText}>Calculate Retirement</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Results Display */}
            {calcResult && calcResult.type === 'investment' && (
              <View style={[styles.calcResultCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.calcResultTitle, { color: colors.text }]}>Investment Growth Results</Text>
                <View style={styles.calcResultMain}>
                  <Text style={styles.calcResultLabel}>Future Value</Text>
                  <Text style={[styles.calcResultValue, { color: '#34C759' }]}>${calcResult.futureValue.toLocaleString()}</Text>
                </View>
                <View style={styles.calcResultGrid}>
                  <View style={[styles.calcResultItem, { backgroundColor: colors.surface }]}>
                    <Ionicons name="wallet-outline" size={20} color="#007AFF" />
                    <Text style={[styles.calcResultItemLabel, { color: colors.textSecondary }]}>Total Invested</Text>
                    <Text style={[styles.calcResultItemValue, { color: colors.text }]}>${calcResult.totalContributions.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.calcResultItem, { backgroundColor: colors.surface }]}>
                    <Ionicons name="trending-up" size={20} color="#34C759" />
                    <Text style={[styles.calcResultItemLabel, { color: colors.textSecondary }]}>Interest Earned</Text>
                    <Text style={[styles.calcResultItemValue, { color: '#34C759' }]}>+${calcResult.totalInterest.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            )}

            {calcResult && calcResult.type === 'mortgage' && (
              <View style={[styles.calcResultCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.calcResultTitle, { color: colors.text }]}>Mortgage Payment Breakdown</Text>
                <View style={styles.calcResultMain}>
                  <Text style={styles.calcResultLabel}>Monthly Payment</Text>
                  <Text style={[styles.calcResultValue, { color: '#007AFF' }]}>${calcResult.monthlyPayment.toLocaleString()}</Text>
                </View>
                <View style={styles.calcResultGrid}>
                  <View style={[styles.calcResultItem, { backgroundColor: colors.surface }]}>
                    <Ionicons name="home-outline" size={20} color="#007AFF" />
                    <Text style={[styles.calcResultItemLabel, { color: colors.textSecondary }]}>Principal & Interest</Text>
                    <Text style={[styles.calcResultItemValue, { color: colors.text }]}>${calcResult.principalInterest.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.calcResultItem, { backgroundColor: colors.surface }]}>
                    <Ionicons name="document-text-outline" size={20} color="#FF9500" />
                    <Text style={[styles.calcResultItemLabel, { color: colors.textSecondary }]}>Tax & Insurance</Text>
                    <Text style={[styles.calcResultItemValue, { color: colors.text }]}>${(calcResult.propertyTax + calcResult.insurance).toLocaleString()}</Text>
                  </View>
                </View>
                <View style={[styles.calcInflationBox, { backgroundColor: '#007AFF15' }]}>
                  <Ionicons name="information-circle" size={18} color="#007AFF" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.calcInflationLabel, { color: colors.text }]}>Loan Details</Text>
                    <Text style={[styles.calcInflationValue, { color: '#007AFF' }]}>Loan: ${calcResult.loanAmount.toLocaleString()}</Text>
                    <Text style={styles.calcInflationNote}>Down Payment: {calcResult.downPaymentPercent}% | Total Interest: ${calcResult.totalInterest.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            )}

            {calcResult && calcResult.type === 'loan' && (
              <View style={[styles.calcResultCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.calcResultTitle, { color: colors.text }]}>Loan Payment Summary</Text>
                <View style={styles.calcResultMain}>
                  <Text style={styles.calcResultLabel}>Monthly Payment</Text>
                  <Text style={[styles.calcResultValue, { color: '#FF9500' }]}>${calcResult.monthlyPayment.toLocaleString()}</Text>
                </View>
                <View style={styles.calcResultGrid}>
                  <View style={[styles.calcResultItem, { backgroundColor: colors.surface }]}>
                    <Ionicons name="cash-outline" size={20} color="#007AFF" />
                    <Text style={[styles.calcResultItemLabel, { color: colors.textSecondary }]}>Total Payments</Text>
                    <Text style={[styles.calcResultItemValue, { color: colors.text }]}>${calcResult.totalPayments.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.calcResultItem, { backgroundColor: colors.surface }]}>
                    <Ionicons name="trending-up" size={20} color="#FF3B30" />
                    <Text style={[styles.calcResultItemLabel, { color: colors.textSecondary }]}>Total Interest</Text>
                    <Text style={[styles.calcResultItemValue, { color: '#FF3B30' }]}>${calcResult.totalInterest.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            )}

            {calcResult && calcResult.type === 'bond' && (
              <View style={[styles.calcResultCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.calcResultTitle, { color: colors.text }]}>Bond Valuation Results</Text>
                <View style={styles.calcResultMain}>
                  <Text style={styles.calcResultLabel}>Bond Price</Text>
                  <Text style={[styles.calcResultValue, { color: '#5856D6' }]}>${calcResult.bondPrice.toLocaleString()}</Text>
                </View>
                <View style={[styles.calcInflationBox, { backgroundColor: calcResult.isPremium ? '#34C75915' : '#FF3B3015' }]}>
                  <Ionicons name={calcResult.isPremium ? 'arrow-up-circle' : 'arrow-down-circle'} size={18} color={calcResult.isPremium ? '#34C759' : '#FF3B30'} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.calcInflationLabel, { color: colors.text }]}>Bond Status</Text>
                    <Text style={[styles.calcInflationValue, { color: calcResult.isPremium ? '#34C759' : '#FF3B30' }]}>
                      Trading at {calcResult.isPremium ? 'Premium' : 'Discount'}
                    </Text>
                    <Text style={styles.calcInflationNote}>
                      {calcResult.isPremium ? 'Above' : 'Below'} face value of ${calcResult.faceValue.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.calcResultGrid}>
                  <View style={[styles.calcResultItem, { backgroundColor: colors.surface }]}>
                    <Ionicons name="cash-outline" size={20} color="#5856D6" />
                    <Text style={[styles.calcResultItemLabel, { color: colors.textSecondary }]}>Annual Income</Text>
                    <Text style={[styles.calcResultItemValue, { color: colors.text }]}>${calcResult.annualIncome.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.calcResultItem, { backgroundColor: colors.surface }]}>
                    <Ionicons name="trending-up" size={20} color="#34C759" />
                    <Text style={[styles.calcResultItemLabel, { color: colors.textSecondary }]}>Current Yield</Text>
                    <Text style={[styles.calcResultItemValue, { color: '#34C759' }]}>{calcResult.currentYield}%</Text>
                  </View>
                </View>
              </View>
            )}

            {calcResult && calcResult.type === 'retirement' && (
              <View style={[styles.calcResultCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.calcResultTitle, { color: colors.text }]}>Retirement Projection</Text>
                <View style={styles.calcResultMain}>
                  <Text style={styles.calcResultLabel}>Projected Savings at Retirement</Text>
                  <Text style={[styles.calcResultValue, { color: '#FF3B30' }]}>${calcResult.retirementSavings.toLocaleString()}</Text>
                </View>
                <View style={[styles.calcInflationBox, { backgroundColor: calcResult.isOnTrack ? '#34C75915' : '#FF950015' }]}>
                  <Ionicons name={calcResult.isOnTrack ? 'checkmark-circle' : 'alert-circle'} size={18} color={calcResult.isOnTrack ? '#34C759' : '#FF9500'} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.calcInflationLabel, { color: colors.text }]}>Retirement Status</Text>
                    <Text style={[styles.calcInflationValue, { color: calcResult.isOnTrack ? '#34C759' : '#FF9500' }]}>
                      {calcResult.isOnTrack ? 'On Track!' : 'Gap: $' + Math.abs(calcResult.gap).toLocaleString()}
                    </Text>
                    <Text style={styles.calcInflationNote}>
                      Target: ${calcResult.neededForRetirement.toLocaleString()} (4% withdrawal rule)
                    </Text>
                  </View>
                </View>
                <View style={styles.calcResultGrid}>
                  <View style={[styles.calcResultItem, { backgroundColor: colors.surface }]}>
                    <Ionicons name="time-outline" size={20} color="#007AFF" />
                    <Text style={[styles.calcResultItemLabel, { color: colors.textSecondary }]}>Years in Retirement</Text>
                    <Text style={[styles.calcResultItemValue, { color: colors.text }]}>{calcResult.yearsOfRetirement} yrs</Text>
                  </View>
                  <View style={[styles.calcResultItem, { backgroundColor: colors.surface }]}>
                    <Ionicons name="cash-outline" size={20} color="#34C759" />
                    <Text style={[styles.calcResultItemLabel, { color: colors.textSecondary }]}>Monthly Income</Text>
                    <Text style={[styles.calcResultItemValue, { color: '#34C759' }]}>${calcResult.monthlyIncome.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Compare Row Component
const CompareRow = ({ label, value1, value2, color1, color2, winner }: {
  label: string;
  value1: string;
  value2: string;
  color1?: string;
  color2?: string;
  winner?: 0 | 1 | 2;
}) => {
  const { colors } = useTheme();
  return (
    <View style={[compareStyles.row, { borderBottomColor: colors.border }]}>
      <View style={compareStyles.rowLeft}>
        {winner === 1 && <View style={compareStyles.winnerDot} />}
        <Text style={[compareStyles.rowValue, { color: colors.text }, color1 && { color: color1 }]}>{value1}</Text>
      </View>
      <Text style={[compareStyles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={compareStyles.rowRight}>
        <Text style={[compareStyles.rowValue, { color: colors.text }, color2 && { color: color2 }]}>{value2}</Text>
        {winner === 2 && <View style={compareStyles.winnerDot} />}
      </View>
    </View>
  );
};

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
  tabContent: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginLeft: 6 },
  tabTextActive: { color: '#007AFF' },
  diamondBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#B9F2FF30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4
  },
  diamondBadgeLocked: { backgroundColor: '#B9F2FF20' },

  // Premium Locked State
  premiumLockedContainer: { margin: 16, borderRadius: 24, overflow: 'hidden' },
  premiumLockedGradient: { padding: 32, alignItems: 'center' },
  premiumLockedIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(185, 242, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  premiumLockedTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', marginBottom: 8, textAlign: 'center' },
  premiumLockedSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B9F2FF',
    backgroundColor: 'rgba(185, 242, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16
  },
  premiumLockedDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10
  },
  premiumFeaturesList: { width: '100%', marginBottom: 28 },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12
  },
  premiumFeatureText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  premiumUpgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B9F2FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10
  },
  premiumUpgradeText: { fontSize: 17, fontWeight: '800', color: '#000' },
  premiumPriceHint: { fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', marginTop: 12, fontWeight: '500' },

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
  chatPageContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  chatScrollView: { flex: 1 },
  chatScrollContent: { paddingBottom: 16 },
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

  // Calculator Styles
  // Insider Trading Styles
  insiderContainer: { paddingHorizontal: 16, paddingTop: 16 },
  insiderHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, gap: 12 },
  insiderHeaderIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#5856D615', justifyContent: 'center', alignItems: 'center' },
  insiderHeaderText: { flex: 1 },
  insiderHeaderTitle: { fontSize: 22, fontWeight: '800', color: '#000' },
  insiderHeaderSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  insiderInfoCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  insiderInfoRow: { flexDirection: 'row', justifyContent: 'space-around' },
  insiderInfoItem: { alignItems: 'center', gap: 6 },
  insiderInfoLabel: { fontSize: 12, fontWeight: '600', color: '#333' },
  insiderFeatures: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  insiderFeaturesTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  insiderFeatureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  insiderFeatureIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  insiderFeatureText: { fontSize: 14, color: '#333', flex: 1 },
  insiderCTAButton: { backgroundColor: '#5856D6', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 },
  insiderCTAText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  insiderQuickAccess: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  insiderQuickTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  insiderQuickSubtitle: { fontSize: 13, color: '#8E8E93', marginBottom: 12 },
  insiderQuickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  insiderQuickChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, gap: 6 },
  insiderQuickChipText: { fontSize: 14, fontWeight: '700', color: '#007AFF' },
  insiderDisclaimer: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4, gap: 8, marginBottom: 20 },
  insiderDisclaimerText: { flex: 1, fontSize: 12, color: '#8E8E93', lineHeight: 18 },

  // Calculator Styles
  calculatorContainer: { paddingHorizontal: 16, paddingTop: 16 },
  calcHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, gap: 12 },
  calcHeaderIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#34C75915', justifyContent: 'center', alignItems: 'center' },
  calcHeaderTitle: { fontSize: 22, fontWeight: '800', color: '#000' },
  calcHeaderSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  calcCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  calcCardTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 20 },
  calcInputGroup: { marginBottom: 16 },
  calcInputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  calcInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E5EA' },
  calcInputPrefix: { fontSize: 18, fontWeight: '700', color: '#8E8E93' },
  calcInputSuffix: { fontSize: 16, fontWeight: '600', color: '#8E8E93' },
  calcInput: { flex: 1, paddingVertical: 14, fontSize: 18, fontWeight: '700', color: '#000', marginLeft: 8 },
  calcRow: { flexDirection: 'row' },
  calcButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#34C759', borderRadius: 14, paddingVertical: 16, marginTop: 8, gap: 10 },
  calcButtonText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  calcResultCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  calcResultTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 20 },
  calcResultMain: { alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  calcResultLabel: { fontSize: 14, color: '#8E8E93', fontWeight: '600', marginBottom: 8 },
  calcResultValue: { fontSize: 36, fontWeight: '800', color: '#34C759' },
  calcResultGrid: { flexDirection: 'row', marginTop: 20, gap: 12 },
  calcResultItem: { flex: 1, alignItems: 'center', backgroundColor: '#F9F9FB', padding: 16, borderRadius: 14 },
  calcResultItemLabel: { fontSize: 12, color: '#8E8E93', marginTop: 8, fontWeight: '600' },
  calcResultItemValue: { fontSize: 17, fontWeight: '700', color: '#000', marginTop: 4 },
  calcInflationBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FF950015', padding: 16, borderRadius: 14, marginTop: 20 },
  calcInflationLabel: { fontSize: 14, fontWeight: '600', color: '#000' },
  calcInflationValue: { fontSize: 20, fontWeight: '800', color: '#FF9500', marginTop: 4 },
  calcInflationNote: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  calcBreakdownCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16 },
  calcBreakdownTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 16 },
  calcBreakdownHeader: { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  calcBreakdownHeaderText: { fontSize: 12, fontWeight: '700', color: '#8E8E93' },
  calcBreakdownRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  calcBreakdownCell: { fontSize: 14, fontWeight: '600', color: '#000' },
  calcBreakdownMore: { fontSize: 13, color: '#8E8E93', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
  calcTipsCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginTop: 16 },
  calcTipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  calcTipsTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  calcTip: { flexDirection: 'row', marginBottom: 12 },
  calcTipBullet: { fontSize: 16, color: '#FF9500', marginRight: 10, fontWeight: '700' },
  calcTipText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20, fontWeight: '500' },
  calcTypeScroll: { marginBottom: 16 },
  calcTypeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 10, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E5E5EA', gap: 6 },
  calcTypeText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
});
