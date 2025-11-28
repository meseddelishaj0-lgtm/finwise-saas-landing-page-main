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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const OPENAI_API_KEY = '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';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ResourceCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}

const RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: 'finance',
    title: 'Finance',
    icon: 'wallet-outline',
    color: '#007AFF',
    description: 'Personal finance, investing basics, and wealth building strategies',
  },
  {
    id: 'accounting',
    title: 'Accounting',
    icon: 'calculator-outline',
    color: '#34C759',
    description: 'Financial statements, bookkeeping, and accounting principles',
  },
  {
    id: 'real-estate',
    title: 'Real Estate',
    icon: 'home-outline',
    color: '#FF9500',
    description: 'Property investing, REITs, and real estate market analysis',
  },
  {
    id: 'insurance',
    title: 'Insurance',
    icon: 'shield-checkmark-outline',
    color: '#5856D6',
    description: 'Insurance products, risk protection, and policy analysis',
  },
  {
    id: 'taxes',
    title: 'Taxes',
    icon: 'document-text-outline',
    color: '#FF3B30',
    description: 'Tax strategies, deductions, and investment tax implications',
  },
  {
    id: 'market',
    title: 'Market',
    icon: 'trending-up-outline',
    color: '#00C853',
    description: 'Market analysis, trends, and trading strategies',
  },
  {
    id: 'tools',
    title: 'Tools & Calculator',
    icon: 'construct-outline',
    color: '#AF52DE',
    description: 'Investment calculators and financial planning tools',
  },
  {
    id: 'business',
    title: 'Business & Entrepreneurship',
    icon: 'briefcase-outline',
    color: '#FF6B35',
    description: 'Starting businesses, entrepreneurship, and business finance',
  },
];

export default function AITools() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analyzer' | 'compare' | 'forecast' | 'assistant' | 'resources'>('analyzer');
  
  // Stock Analyzer
  const [analyzerTicker, setAnalyzerTicker] = useState('');
  const [analyzerLoading, setAnalyzerLoading] = useState(false);
  const [analyzerResult, setAnalyzerResult] = useState<string | null>(null);

  // Stock Comparison
  const [compareTicker1, setCompareTicker1] = useState('');
  const [compareTicker2, setCompareTicker2] = useState('');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<string | null>(null);

  // AI Forecast
  const [forecastTicker, setForecastTicker] = useState('');
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState<string | null>(null);

  // AI Assistant
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI Trading Assistant. I can help you with:\n\n• Market analysis and insights\n• Trading strategies\n• Stock research\n• Portfolio advice\n• Technical analysis\n• Risk management\n\nWhat would you like to know?"
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

  // Stock Analyzer Function
  const handleAnalyze = async () => {
    if (!analyzerTicker.trim()) return;

    setAnalyzerLoading(true);
    setAnalyzerResult(null);

    try {
      const ticker = analyzerTicker.toUpperCase();
      
      // Fetch quote data
      const quoteRes = await fetch(
        `${BASE_URL}/quote/${ticker}?apikey=${FMP_API_KEY}`
      );
      const quoteData = await quoteRes.json();

      if (!quoteData || !Array.isArray(quoteData) || quoteData.length === 0) {
        setAnalyzerResult(`❌ No data found for ${ticker}.`);
        setAnalyzerLoading(false);
        return;
      }

      const quote = quoteData[0];

      // Fetch DCF
      const dcfRes = await fetch(
        `${BASE_URL}/discounted-cash-flow/${ticker}?apikey=${FMP_API_KEY}`
      );
      const dcfData = await dcfRes.json();

      let intrinsicValue = null;
      let dcfInfo = '';
      
      if (dcfData && Array.isArray(dcfData) && dcfData.length > 0 && dcfData[0].dcf) {
        intrinsicValue = dcfData[0].dcf;
        const currentPrice = quote.price;
        const priceDiff = intrinsicValue - currentPrice;
        const priceDiffPercent = (priceDiff / currentPrice) * 100;
        
        dcfInfo = `\n\n📊 Valuation:\nIntrinsic Value: $${intrinsicValue.toFixed(2)}\nCurrent Price: $${currentPrice.toFixed(2)}\n${priceDiff >= 0 ? '✅ Undervalued' : '⚠️ Overvalued'} by: $${Math.abs(priceDiff).toFixed(2)} (${Math.abs(priceDiffPercent).toFixed(2)}%)`;
      }

      // AI Analysis
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Provide a comprehensive stock analysis for ${ticker}:

Symbol: ${ticker}
Company: ${quote.name}
Current Price: $${quote.price}
Change: ${quote.change} (${quote.changesPercentage}%)
Market Cap: ${quote.marketCap}
PE Ratio: ${quote.pe || 'N/A'}
${intrinsicValue ? `DCF Value: $${intrinsicValue.toFixed(2)}` : ''}

Provide:
1. Investment Thesis (2-3 sentences)
2. Key Strengths (3 points)
3. Key Risks (3 points)
4. Sentiment: Positive/Negative/Neutral
5. Confidence: XX%
6. Recommendation: Buy/Hold/Sell

Keep it concise and actionable.`
            }
          ],
        })
      });

      const data = await response.json();
      const aiText = data.content?.[0]?.text || "Analysis complete.";

      setAnalyzerResult(`🎯 ${quote.name || ticker}${dcfInfo}\n\n${aiText}`);
    } catch (err) {
      console.error('Analyzer error:', err);
      setAnalyzerResult(`⚠️ Analysis failed. Please try again.`);
    } finally {
      setAnalyzerLoading(false);
    }
  };

  // Stock Comparison Function
  const handleCompare = async () => {
    if (!compareTicker1.trim() || !compareTicker2.trim()) return;

    setCompareLoading(true);
    setCompareResult(null);

    try {
      const ticker1 = compareTicker1.toUpperCase();
      const ticker2 = compareTicker2.toUpperCase();
      
      // Fetch both quotes
      const [quote1Res, quote2Res] = await Promise.all([
        fetch(`${BASE_URL}/quote/${ticker1}?apikey=${FMP_API_KEY}`),
        fetch(`${BASE_URL}/quote/${ticker2}?apikey=${FMP_API_KEY}`)
      ]);

      const quote1Data = await quote1Res.json();
      const quote2Data = await quote2Res.json();

      if (!quote1Data?.[0] || !quote2Data?.[0]) {
        setCompareResult(`❌ Could not find data for both tickers.`);
        setCompareLoading(false);
        return;
      }

      const quote1 = quote1Data[0];
      const quote2 = quote2Data[0];

      // AI Comparison
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          messages: [
            {
              role: "user",
              content: `Compare these two stocks side-by-side:

STOCK 1: ${ticker1}
Company: ${quote1.name}
Price: $${quote1.price}
Market Cap: ${quote1.marketCap}
PE Ratio: ${quote1.pe || 'N/A'}
52W Change: ${((quote1.price - quote1.yearLow) / quote1.yearLow * 100).toFixed(2)}%

STOCK 2: ${ticker2}
Company: ${quote2.name}
Price: $${quote2.price}
Market Cap: ${quote2.marketCap}
PE Ratio: ${quote2.pe || 'N/A'}
52W Change: ${((quote2.price - quote2.yearLow) / quote2.yearLow * 100).toFixed(2)}%

Provide:
1. Head-to-head comparison (valuation, growth, risk)
2. Which is better for: Growth, Value, Safety
3. Final recommendation: Which to choose and why (2-3 sentences)

Keep it concise and actionable.`
            }
          ],
        })
      });

      const data = await response.json();
      const aiText = data.content?.[0]?.text || "Comparison complete.";

      setCompareResult(`⚖️ ${ticker1} vs ${ticker2}\n\n${aiText}`);
    } catch (err) {
      console.error('Compare error:', err);
      setCompareResult(`⚠️ Comparison failed. Please try again.`);
    } finally {
      setCompareLoading(false);
    }
  };

  // AI Forecast Function
  const handleForecast = async () => {
    if (!forecastTicker.trim()) return;

    setForecastLoading(true);
    setForecastResult(null);

    try {
      const ticker = forecastTicker.toUpperCase();
      
      // Fetch quote and historical data
      const [quoteRes, histRes] = await Promise.all([
        fetch(`${BASE_URL}/quote/${ticker}?apikey=${FMP_API_KEY}`),
        fetch(`${BASE_URL}/historical-price-full/${ticker}?timeseries=30&apikey=${FMP_API_KEY}`)
      ]);

      const quoteData = await quoteRes.json();
      const histData = await histRes.json();

      if (!quoteData?.[0]) {
        setForecastResult(`❌ No data found for ${ticker}.`);
        setForecastLoading(false);
        return;
      }

      const quote = quoteData[0];
      const historical = histData?.historical || [];

      // Calculate momentum indicators
      const prices = historical.map((d: any) => d.close);
      const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      const momentum = ((quote.price - avgPrice) / avgPrice * 100).toFixed(2);

      // AI Forecast
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Provide a 3-6 month AI forecast for ${ticker}:

Current Data:
- Symbol: ${ticker}
- Company: ${quote.name}
- Current Price: $${quote.price}
- 30-day Momentum: ${momentum}%
- 52W Range: $${quote.yearLow} - $${quote.yearHigh}
- YTD Change: ${quote.changesPercentage}%

Provide:
1. Price Target Range (3-6 months): Conservative, Base, Bull case
2. Key Catalysts to watch (3 points)
3. Key Risks to watch (3 points)
4. Probability Assessment: Upside %, Downside %
5. Recommendation: Strong Buy/Buy/Hold/Sell

Base your analysis on momentum, valuation, and market conditions.`
            }
          ],
        })
      });

      const data = await response.json();
      const aiText = data.content?.[0]?.text || "Forecast complete.";

      setForecastResult(`🔮 AI Forecast for ${ticker}\n\nCurrent Price: $${quote.price}\n30-Day Momentum: ${momentum}%\n\n${aiText}`);
    } catch (err) {
      console.error('Forecast error:', err);
      setForecastResult(`⚠️ Forecast failed. Please try again.`);
    } finally {
      setForecastLoading(false);
    }
  };

  // AI Assistant Chat Function
  const handleSendMessage = async () => {
    if (!userInput.trim() || assistantLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: userInput
    };

    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setAssistantLoading(true);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert AI trading assistant for a stock trading app. You help users with market analysis, trading strategies, stock research, portfolio advice, technical analysis, and risk management. Provide clear, actionable insights. Keep responses concise but informative.'
            },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userInput }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      const data = await response.json();

      if (data.choices && data.choices[0] && data.choices[0].message) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.choices[0].message.content
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Invalid response from OpenAI');
      }
    } catch (err) {
      console.error('AI Assistant error:', err);
      const errorMessage: Message = {
        role: 'assistant',
        content: '⚠️ Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setAssistantLoading(false);
    }
  };

  // Handle resource category press
  const handleCategoryPress = (category: ResourceCategory) => {
    router.push(`/resources/${category.id}` as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="sparkles" size={32} color="#007AFF" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>AI Tools</Text>
              <Text style={styles.headerSubtitle}>Powered by Wallstreetstocks</Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'analyzer' && styles.tabActive]}
              onPress={() => setActiveTab('analyzer')}
            >
              <Ionicons 
                name="analytics" 
                size={18} 
                color={activeTab === 'analyzer' ? '#007AFF' : '#8E8E93'} 
              />
              <Text style={[styles.tabText, activeTab === 'analyzer' && styles.tabTextActive]}>
                Analyzer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'compare' && styles.tabActive]}
              onPress={() => setActiveTab('compare')}
            >
              <Ionicons 
                name="git-compare" 
                size={18} 
                color={activeTab === 'compare' ? '#007AFF' : '#8E8E93'} 
              />
              <Text style={[styles.tabText, activeTab === 'compare' && styles.tabTextActive]}>
                Compare
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'forecast' && styles.tabActive]}
              onPress={() => setActiveTab('forecast')}
            >
              <Ionicons 
                name="trending-up" 
                size={18} 
                color={activeTab === 'forecast' ? '#007AFF' : '#8E8E93'} 
              />
              <Text style={[styles.tabText, activeTab === 'forecast' && styles.tabTextActive]}>
                Forecast
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'assistant' && styles.tabActive]}
              onPress={() => setActiveTab('assistant')}
            >
              <Ionicons 
                name="chatbubbles" 
                size={18} 
                color={activeTab === 'assistant' ? '#007AFF' : '#8E8E93'} 
              />
              <Text style={[styles.tabText, activeTab === 'assistant' && styles.tabTextActive]}>
                Assistant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'resources' && styles.tabActive]}
              onPress={() => setActiveTab('resources')}
            >
              <Ionicons 
                name="library" 
                size={18} 
                color={activeTab === 'resources' ? '#007AFF' : '#8E8E93'} 
              />
              <Text style={[styles.tabText, activeTab === 'resources' && styles.tabTextActive]}>
                Resources
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Stock Analyzer Tab */}
        {activeTab === 'analyzer' && (
          <View style={styles.toolCard}>
            <View style={styles.toolHeader}>
              <Ionicons name="analytics" size={24} color="#007AFF" />
              <Text style={styles.toolTitle}>Stock Analyzer</Text>
            </View>
            <Text style={styles.toolDescription}>
              Get comprehensive AI analysis with DCF valuation, sentiment, and recommendations
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="search" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter ticker (e.g., AAPL)"
                placeholderTextColor="#8E8E93"
                value={analyzerTicker}
                onChangeText={setAnalyzerTicker}
                autoCapitalize="characters"
                editable={!analyzerLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.analyzeButton, analyzerLoading && styles.buttonDisabled]}
              onPress={handleAnalyze}
              disabled={analyzerLoading}
            >
              {analyzerLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Analyze Stock</Text>
                </>
              )}
            </TouchableOpacity>

            {analyzerResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultText}>{analyzerResult}</Text>
              </View>
            )}
          </View>
        )}

        {/* Stock Comparison Tab */}
        {activeTab === 'compare' && (
          <View style={styles.toolCard}>
            <View style={styles.toolHeader}>
              <Ionicons name="git-compare" size={24} color="#007AFF" />
              <Text style={styles.toolTitle}>Stock Comparison</Text>
            </View>
            <Text style={styles.toolDescription}>
              Compare two stocks side-by-side with AI-powered insights
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="search" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="First ticker (e.g., AAPL)"
                placeholderTextColor="#8E8E93"
                value={compareTicker1}
                onChangeText={setCompareTicker1}
                autoCapitalize="characters"
                editable={!compareLoading}
              />
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="search" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Second ticker (e.g., MSFT)"
                placeholderTextColor="#8E8E93"
                value={compareTicker2}
                onChangeText={setCompareTicker2}
                autoCapitalize="characters"
                editable={!compareLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.analyzeButton, compareLoading && styles.buttonDisabled]}
              onPress={handleCompare}
              disabled={compareLoading}
            >
              {compareLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="git-compare" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Compare Stocks</Text>
                </>
              )}
            </TouchableOpacity>

            {compareResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultText}>{compareResult}</Text>
              </View>
            )}
          </View>
        )}

        {/* AI Forecast Tab */}
        {activeTab === 'forecast' && (
          <View style={styles.toolCard}>
            <View style={styles.toolHeader}>
              <Ionicons name="trending-up" size={24} color="#007AFF" />
              <Text style={styles.toolTitle}>AI Forecast</Text>
            </View>
            <Text style={styles.toolDescription}>
              Get 3-6 month price targets and probability-based forecasts
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="search" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter ticker (e.g., TSLA)"
                placeholderTextColor="#8E8E93"
                value={forecastTicker}
                onChangeText={setForecastTicker}
                autoCapitalize="characters"
                editable={!forecastLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.analyzeButton, forecastLoading && styles.buttonDisabled]}
              onPress={handleForecast}
              disabled={forecastLoading}
            >
              {forecastLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="telescope" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Generate Forecast</Text>
                </>
              )}
            </TouchableOpacity>

            {forecastResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultText}>{forecastResult}</Text>
              </View>
            )}
          </View>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'assistant' && (
          <View style={styles.assistantContainer}>
            <View style={styles.assistantHeader}>
              <View style={styles.assistantHeaderContent}>
                <Ionicons name="chatbubbles" size={24} color="#007AFF" />
                <View style={styles.assistantHeaderText}>
                  <Text style={styles.assistantTitle}>AI Trading Assistant</Text>
                </View>
              </View>
            </View>

            {/* Chat Messages */}
            <ScrollView 
              style={styles.chatContainer}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageContainer,
                    message.role === 'user' ? styles.userMessage : styles.assistantMessage
                  ]}
                >
                  <View style={styles.messageHeader}>
                    <Ionicons
                      name={message.role === 'user' ? 'person-circle' : 'sparkles'}
                      size={20}
                      color={message.role === 'user' ? '#007AFF' : '#34C759'}
                    />
                    <Text style={styles.messageRole}>
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </Text>
                  </View>
                  <Text style={styles.messageText}>{message.content}</Text>
                </View>
              ))}

              {assistantLoading && (
                <View style={[styles.messageContainer, styles.assistantMessage]}>
                  <View style={styles.messageHeader}>
                    <Ionicons name="sparkles" size={20} color="#34C759" />
                    <Text style={styles.messageRole}>AI Assistant</Text>
                  </View>
                  <View style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputArea}>
              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Ask me anything about trading..."
                  placeholderTextColor="#8E8E93"
                  value={userInput}
                  onChangeText={setUserInput}
                  multiline
                  maxLength={500}
                  editable={!assistantLoading}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!userInput.trim() || assistantLoading) && styles.sendButtonDisabled
                  ]}
                  onPress={handleSendMessage}
                  disabled={!userInput.trim() || assistantLoading}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <View style={styles.resourcesContainer}>
            {/* Resources Header */}
            <View style={styles.resourcesHeader}>
              <Ionicons name="library" size={28} color="#007AFF" />
              <View style={styles.resourcesHeaderText}>
                <Text style={styles.resourcesTitle}>Learning Resources</Text>
                <Text style={styles.resourcesSubtitle}>Expand your financial knowledge</Text>
              </View>
            </View>

            {/* Category Cards */}
            <View style={styles.categoriesGrid}>
              {RESOURCE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  activeOpacity={0.7}
                  onPress={() => handleCategoryPress(category)}
                >
                  <View style={[styles.categoryIconContainer, { backgroundColor: `${category.color}15` }]}>
                    <Ionicons name={category.icon} size={28} color={category.color} />
                  </View>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription} numberOfLines={2}>
                    {category.description}
                  </Text>
                  <View style={[styles.categoryArrow, { backgroundColor: `${category.color}15` }]}>
                    <Ionicons name="arrow-forward" size={16} color={category.color} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#007AFF15',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#007AFF',
  },
  toolCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginLeft: 8,
  },
  toolDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  vsContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  vsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resultCard: {
    marginTop: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  resultText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 24,
    fontWeight: '500',
  },
  // AI Assistant Styles
  assistantContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  assistantHeader: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  assistantHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistantHeaderText: {
    marginLeft: 12,
  },
  assistantTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  assistantSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
    maxHeight: 500,
  },
  chatContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  userMessage: {
    backgroundColor: '#007AFF15',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  assistantMessage: {
    backgroundColor: '#F5F5F7',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageRole: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    marginLeft: 6,
  },
  messageText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
    fontWeight: '500',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8E8E93',
  },
  inputArea: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#F9F9F9',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chatInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    maxHeight: 100,
    paddingVertical: 8,
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  // Resources Styles
  resourcesContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  resourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resourcesHeaderText: {
    marginLeft: 12,
  },
  resourcesTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  resourcesSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
    marginBottom: 12,
  },
  categoryArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
});
