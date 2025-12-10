// app/resources/tools.tsx
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

const CATEGORY_COLOR = '#AF52DE';

const SUBCATEGORIES = [
  {
    id: 'investment-calculators',
    title: 'Investment Calculators',
    icon: 'calculator-outline' as const,
    articles: [
      {
        id: 'tc1',
        title: 'Compound Interest Calculator',
        description: 'Understanding the power of compounding',
        readTime: '5 min',
        content: 'Compound interest is earning interest on your interest. The formula is A = P(1 + r/n)^(nt) where P is principal, r is annual rate, n is compounding frequency, and t is time in years. Starting early matters: $10,000 invested at 7% for 30 years grows to $76,123. The same amount for 40 years grows to $149,745.',
      },
      {
        id: 'tc2',
        title: 'Retirement Calculator',
        description: 'How much do you need to retire?',
        readTime: '7 min',
        content: 'The 4% rule suggests you can withdraw 4% of your portfolio annually in retirement. To generate $40,000/year, you need $1 million saved. Factor in Social Security, pensions, and healthcare costs. Adjust for inflation (2-3% annually). Most calculators assume 5-7% real returns. Run scenarios with different assumptions to stress-test your plan.',
      },
      {
        id: 'tc3',
        title: 'Investment Returns Calculator',
        description: 'Calculate your portfolio performance',
        readTime: '6 min',
        content: 'Simple return = (Ending Value - Beginning Value) / Beginning Value. Annualized return accounts for time: ((1 + Total Return)^(1/Years)) - 1. Time-weighted returns remove the effect of cash flows. Money-weighted returns (IRR) include cash flow timing. Compare to benchmarks like the S&P 500 to evaluate performance.',
      },
      {
        id: 'tc4',
        title: 'Dollar-Cost Averaging Calculator',
        description: 'Visualize regular investment strategies',
        readTime: '5 min',
        content: 'Dollar-cost averaging calculates average cost per share when investing fixed amounts regularly. If you invest $500/month and prices are $50, $40, $60, $50, you buy 10, 12.5, 8.33, 10 shares = 40.83 shares for $2,000. Average cost: $48.98 vs average price: $50. This strategy reduces timing risk.',
      },
    ],
  },
  {
    id: 'stock-screening',
    title: 'Stock Screening',
    icon: 'filter-outline' as const,
    articles: [
      {
        id: 'tc5',
        title: 'Using Stock Screeners',
        description: 'Find stocks that match your criteria',
        readTime: '8 min',
        content: 'Stock screeners filter thousands of stocks by criteria you specify. Common filters include: P/E ratio, market cap, dividend yield, revenue growth, and sector. Value investors might screen for low P/E and high dividend yield. Growth investors might filter for high revenue growth and expanding margins. Combine fundamental and technical filters.',
      },
      {
        id: 'tc6',
        title: 'DCF Valuation Calculator',
        description: 'Estimating intrinsic stock value',
        readTime: '9 min',
        content: 'Discounted Cash Flow (DCF) values a company based on future cash flows. Project free cash flows for 5-10 years. Apply a discount rate (usually WACC, 8-12%). Calculate terminal value for cash flows beyond projection period. Sum discounted values and divide by shares outstanding. Compare to current price to find undervalued stocks.',
      },
      {
        id: 'tc7',
        title: 'Dividend Calculator',
        description: 'Project dividend income over time',
        readTime: '5 min',
        content: 'Dividend calculators project income from dividend-paying stocks. Input current yield, dividend growth rate, and reinvestment assumptions. A $10,000 investment at 4% yield produces $400/year. With 5% annual dividend growth and reinvestment, income grows significantly over time. Use DRIP (dividend reinvestment) to compound returns.',
      },
    ],
  },
  {
    id: 'portfolio-tools',
    title: 'Portfolio Tools',
    icon: 'apps-outline' as const,
    articles: [
      {
        id: 'tc8',
        title: 'Portfolio Rebalancing Tool',
        description: 'Maintain your target allocation',
        readTime: '6 min',
        content: 'Rebalancing tools show how to restore your target allocation. If your 60/40 portfolio drifts to 70/30, the tool calculates what to buy/sell. Consider tax implications of selling in taxable accounts. Use new contributions to rebalance when possible. Set rebalancing triggers (time-based or threshold-based).',
      },
      {
        id: 'tc9',
        title: 'Risk Analysis Tools',
        description: 'Measure and manage portfolio risk',
        readTime: '7 min',
        content: 'Beta measures volatility relative to the market (1 = market, >1 = more volatile). Standard deviation measures total volatility. Sharpe ratio measures risk-adjusted returns. Maximum drawdown shows worst peak-to-trough decline. Correlation analysis helps build diversified portfolios with uncorrelated assets.',
      },
      {
        id: 'tc10',
        title: 'Asset Correlation Matrix',
        description: 'Understanding how assets move together',
        readTime: '6 min',
        content: 'Correlation ranges from -1 (perfect negative) to +1 (perfect positive). Stocks and bonds historically have low correlation, making them good diversifiers. International stocks have become more correlated with US stocks over time. Gold often has low or negative correlation with stocks. Build portfolios with low-correlated assets to reduce overall volatility.',
      },
    ],
  },
];

export default function ToolsResource() {
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
            <Ionicons name="construct-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Tools & Calculator</Text>
          <Text style={styles.headerDescription}>
            Investment calculators, screeners, and analysis tools
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
                          onPress={() => Linking.openURL('https://wallstreetstocks.ai')}
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
