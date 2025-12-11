// app/resources/market.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORY_COLOR = '#00C853';

const SUBCATEGORIES = [
  {
    id: 'technical-analysis',
    title: 'Technical Analysis',
    icon: 'bar-chart-outline' as const,
    articles: [
      {
        id: 'm1',
        title: 'Chart Patterns Basics',
        description: 'Head and shoulders, double tops, and more',
        readTime: '8 min',
        content: 'Chart patterns help predict future price movements based on historical patterns. Head and shoulders patterns signal potential reversals. Double tops and bottoms indicate strong support/resistance levels. Triangles (ascending, descending, symmetrical) show consolidation before breakouts. Cup and handle patterns are bullish continuation signals. Always confirm patterns with volume.',
      },
      {
        id: 'm2',
        title: 'Moving Averages',
        description: 'SMA, EMA, and trading signals',
        readTime: '6 min',
        content: 'Moving averages smooth price data to identify trends. Simple Moving Average (SMA) weights all prices equally. Exponential Moving Average (EMA) gives more weight to recent prices. Common periods are 20, 50, and 200 days. Golden cross (50-day crosses above 200-day) is bullish. Death cross (50-day crosses below 200-day) is bearish.',
      },
      {
        id: 'm3',
        title: 'RSI and MACD Indicators',
        description: 'Momentum indicators for timing',
        readTime: '7 min',
        content: 'Relative Strength Index (RSI) measures overbought/oversold conditions on a 0-100 scale. RSI above 70 suggests overbought, below 30 suggests oversold. MACD (Moving Average Convergence Divergence) shows momentum and trend direction. MACD crossing above signal line is bullish. Divergences between price and indicators can signal reversals.',
      },
      {
        id: 'm4',
        title: 'Support and Resistance',
        description: 'Key price levels for trading',
        readTime: '5 min',
        content: 'Support levels are prices where buying interest tends to prevent further decline. Resistance levels are prices where selling pressure prevents further advance. These levels often occur at round numbers, previous highs/lows, and moving averages. Breakouts above resistance or below support can signal new trends.',
      },
    ],
  },
  {
    id: 'market-concepts',
    title: 'Market Concepts',
    icon: 'globe-outline' as const,
    articles: [
      {
        id: 'm5',
        title: 'Understanding Market Cycles',
        description: 'Bull markets, bear markets, and corrections',
        readTime: '7 min',
        content: 'Bull markets are extended periods of rising prices, typically 20%+ gains from recent lows. Bear markets are declines of 20% or more from recent highs. Corrections are pullbacks of 10-20%. Markets cycle through expansion, peak, contraction, and trough phases. Average bull market lasts about 5 years; bear markets average 13 months.',
      },
      {
        id: 'm6',
        title: 'Sector Rotation Strategy',
        description: 'Positioning based on economic cycles',
        readTime: '8 min',
        content: 'Different sectors perform better at different economic stages. Early cycle (recovery): consumer discretionary, financials, industrials. Mid cycle (expansion): technology, communication services. Late cycle (slowdown): energy, materials, healthcare. Recession: utilities, consumer staples, healthcare. This strategy requires accurately timing the economic cycle.',
      },
      {
        id: 'm7',
        title: 'Market Sentiment Indicators',
        description: 'Fear and greed in trading',
        readTime: '6 min',
        content: 'Sentiment indicators gauge investor emotions and can signal extremes. VIX (fear index) spikes during market stress and drops during calm. Put/call ratios show options market sentiment. AAII surveys measure individual investor bullish/bearish sentiment. Extreme fear can signal buying opportunities; extreme greed may precede corrections.',
      },
    ],
  },
  {
    id: 'trading-strategies',
    title: 'Trading Strategies',
    icon: 'swap-horizontal-outline' as const,
    articles: [
      {
        id: 'm8',
        title: 'Day Trading Basics',
        description: 'Short-term trading strategies and risks',
        readTime: '7 min',
        content: 'Day trading involves buying and selling within the same day. It requires significant time, knowledge, and capital. Pattern day trader rules require $25,000 minimum in margin accounts. Most day traders lose money. Focus on liquid stocks with tight spreads. Use stop-losses religiously. Start with paper trading to practice.',
      },
      {
        id: 'm9',
        title: 'Swing Trading Guide',
        description: 'Capturing multi-day price moves',
        readTime: '6 min',
        content: 'Swing trading holds positions for days to weeks to capture price swings. It requires less time than day trading but still demands active management. Look for stocks breaking out of consolidation patterns. Use technical analysis for entry and exit points. Set stop-losses at key support levels. Take profits at resistance levels.',
      },
      {
        id: 'm10',
        title: 'Options Trading Introduction',
        description: 'Basics of calls, puts, and strategies',
        readTime: '9 min',
        content: 'Options give the right (not obligation) to buy or sell at a set price. Calls profit when stocks rise; puts profit when stocks fall. Premium is the price paid for the option. Strike price is the price at which you can buy/sell. Expiration date is when the option expires. Start with covered calls and cash-secured puts before complex strategies.',
      },
    ],
  },
];

export default function MarketResource() {
  const router = useRouter();
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  const toggleSubcategory = (id: string) => {
    setExpandedSubcategory(expandedSubcategory === id ? null : id);
    setExpandedArticle(null);
  };

  const toggleArticle = (id: string) => {
    setExpandedArticle(expandedArticle === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: CATEGORY_COLOR }]}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="trending-up-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Market</Text>
          <Text style={styles.headerDescription}>
            Market analysis, trends, and trading strategies
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {SUBCATEGORIES.map((subcategory) => (
          <View key={subcategory.id} style={styles.subcategoryContainer}>
            <TouchableOpacity
              style={styles.subcategoryHeader}
              activeOpacity={0.7}
              onPress={() => toggleSubcategory(subcategory.id)}
            >
              <View style={[styles.subcategoryIconContainer, { backgroundColor: `${CATEGORY_COLOR}15` }]}>
                <Ionicons name={subcategory.icon} size={22} color={CATEGORY_COLOR} />
              </View>
              <Text style={styles.subcategoryTitle}>{subcategory.title}</Text>
              <View style={styles.subcategoryMeta}>
                <Text style={styles.articleCount}>{subcategory.articles.length} articles</Text>
                <Ionicons 
                  name={expandedSubcategory === subcategory.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#8E8E93" 
                />
              </View>
            </TouchableOpacity>

            {expandedSubcategory === subcategory.id && (
              <View style={styles.articlesContainer}>
                {subcategory.articles.map((article) => (
                  <View key={article.id} style={styles.articleCard}>
                    <TouchableOpacity
                      style={styles.articleHeader}
                      activeOpacity={0.7}
                      onPress={() => toggleArticle(article.id)}
                    >
                      <View style={styles.articleTitleSection}>
                        <Text style={styles.articleTitle}>{article.title}</Text>
                        <Text style={styles.articleDescription}>{article.description}</Text>
                      </View>
                      <View style={styles.articleMeta}>
                        <View style={styles.readTimeBadge}>
                          <Ionicons name="time-outline" size={12} color="#8E8E93" />
                          <Text style={styles.readTimeText}>{article.readTime}</Text>
                        </View>
                        <Ionicons 
                          name={expandedArticle === article.id ? "chevron-up" : "chevron-down"} 
                          size={18} 
                          color="#8E8E93" 
                        />
                      </View>
                    </TouchableOpacity>

                    {expandedArticle === article.id && (
                      <View style={styles.articleContent}>
                        <Text style={styles.articleText}>{article.content}</Text>
                        <TouchableOpacity 
                          style={[styles.learnMoreButton, { backgroundColor: `${CATEGORY_COLOR}15` }]}
                          onPress={() => Linking.openURL('https://www.wallstreetstocks.ai')}
                        >
                          <Text style={[styles.learnMoreText, { color: CATEGORY_COLOR }]}>
                            Learn More on Website
                          </Text>
                          <Ionicons name="open-outline" size={16} color={CATEGORY_COLOR} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20 },
  backArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  headerContent: { alignItems: 'center' },
  headerIconContainer: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  headerDescription: { fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 22 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  subcategoryContainer: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  subcategoryHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  subcategoryIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  subcategoryTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#000' },
  subcategoryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  articleCount: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  articlesContainer: { borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingHorizontal: 16, paddingBottom: 8 },
  articleCard: { borderBottomWidth: 1, borderBottomColor: '#E5E5EA', paddingVertical: 12 },
  articleHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  articleTitleSection: { flex: 1, marginRight: 12 },
  articleTitle: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 4 },
  articleDescription: { fontSize: 13, color: '#8E8E93', lineHeight: 18 },
  articleMeta: { alignItems: 'flex-end', gap: 8 },
  readTimeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  readTimeText: { fontSize: 11, color: '#8E8E93', fontWeight: '600' },
  articleContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  articleText: { fontSize: 14, color: '#333', lineHeight: 22, marginBottom: 16 },
  learnMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  learnMoreText: { fontSize: 14, fontWeight: '700' },
});
