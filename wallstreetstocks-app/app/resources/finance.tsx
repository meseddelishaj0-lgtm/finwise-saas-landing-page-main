// app/resources/finance.tsx
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

const CATEGORY_COLOR = '#007AFF';

const SUBCATEGORIES = [
  {
    id: 'investing-basics',
    title: 'Investing Basics',
    icon: 'school-outline' as const,
    articles: [
      {
        id: 'f1',
        title: 'Understanding Stock Market Basics',
        description: 'Learn the fundamentals of how the stock market works',
        readTime: '5 min',
        content: 'The stock market is where buyers and sellers trade shares of publicly listed companies. When you buy a stock, you own a small piece of that company. Stock prices fluctuate based on supply and demand, company performance, and market conditions. Key concepts include: market orders vs limit orders, bid-ask spreads, and market hours.',
      },
      {
        id: 'f2',
        title: 'Types of Investment Accounts',
        description: 'IRA, 401(k), brokerage accounts explained',
        readTime: '6 min',
        content: 'There are several types of investment accounts: Brokerage accounts offer flexibility but no tax advantages. Traditional IRAs provide tax-deferred growth. Roth IRAs offer tax-free growth. 401(k) plans are employer-sponsored with potential matching. Each has contribution limits and withdrawal rules.',
      },
      {
        id: 'f3',
        title: 'Dollar-Cost Averaging Strategy',
        description: 'How to reduce risk by investing consistently',
        readTime: '4 min',
        content: 'Dollar-cost averaging (DCA) involves investing a fixed amount regularly, regardless of market conditions. This strategy reduces the impact of volatility by buying more shares when prices are low and fewer when prices are high. Its ideal for long-term investors who want to avoid timing the market.',
      },
    ],
  },
  {
    id: 'portfolio-management',
    title: 'Portfolio Management',
    icon: 'pie-chart-outline' as const,
    articles: [
      {
        id: 'f4',
        title: 'Building Your First Portfolio',
        description: 'Step-by-step guide to creating a diversified portfolio',
        readTime: '8 min',
        content: 'A well-diversified portfolio spreads risk across different asset classes. Start with your risk tolerance and time horizon. A common approach is the 60/40 portfolio (60% stocks, 40% bonds). Consider index funds for broad market exposure. Rebalance annually to maintain your target allocation.',
      },
      {
        id: 'f5',
        title: 'Asset Allocation Strategies',
        description: 'How to divide your investments across asset classes',
        readTime: '7 min',
        content: 'Asset allocation determines how you divide investments among stocks, bonds, and cash. Aggressive allocations favor stocks for growth. Conservative allocations favor bonds for stability. Your age, goals, and risk tolerance should guide your allocation.',
      },
      {
        id: 'f6',
        title: 'Rebalancing Your Portfolio',
        description: 'When and how to adjust your investments',
        readTime: '5 min',
        content: 'Rebalancing brings your portfolio back to its target allocation. Market movements can shift your allocation over time. Rebalance annually or when allocations drift more than 5%. Consider tax implications when selling in taxable accounts.',
      },
    ],
  },
  {
    id: 'risk-management',
    title: 'Risk Management',
    icon: 'shield-outline' as const,
    articles: [
      {
        id: 'f7',
        title: 'Understanding Investment Risk',
        description: 'Different types of risk and how to manage them',
        readTime: '6 min',
        content: 'Investment risks include market risk, inflation risk, interest rate risk, and company-specific risk. Diversification reduces unsystematic risk. Time horizon affects how much risk you can tolerate. Never invest money you need in the short term.',
      },
      {
        id: 'f8',
        title: 'Stop-Loss Strategies',
        description: 'Protecting your investments from major losses',
        readTime: '5 min',
        content: 'Stop-loss orders automatically sell when a stock reaches a certain price. They limit potential losses but can trigger during temporary dips. Trailing stops move up with the stock price. Consider position sizing to limit any single investment to 5-10% of your portfolio.',
      },
    ],
  },
];

export default function FinanceResource() {
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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: CATEGORY_COLOR }]}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="wallet-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Finance</Text>
          <Text style={styles.headerDescription}>
            Personal finance, investing basics, and wealth building strategies
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  subcategoryContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  subcategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subcategoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subcategoryTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  subcategoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  articleCount: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  articlesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  articleCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingVertical: 12,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  articleTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  articleDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  articleMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  readTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  readTimeText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  articleContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  articleText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
