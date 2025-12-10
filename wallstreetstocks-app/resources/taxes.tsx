// app/resources/taxes.tsx
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

const CATEGORY_COLOR = '#FF3B30';

const SUBCATEGORIES = [
  {
    id: 'investment-taxes',
    title: 'Investment Taxes',
    icon: 'cash-outline' as const,
    articles: [
      {
        id: 't1',
        title: 'Capital Gains Tax Guide',
        description: 'Short-term vs long-term capital gains',
        readTime: '7 min',
        content: 'Short-term capital gains (assets held less than 1 year) are taxed as ordinary income at your marginal rate. Long-term gains (held over 1 year) are taxed at preferential rates: 0%, 15%, or 20% depending on income. Hold investments over a year when possible to benefit from lower rates. Capital losses can offset gains, and up to $3,000 in net losses can offset ordinary income.',
      },
      {
        id: 't2',
        title: 'Tax-Loss Harvesting',
        description: 'Using losses to reduce your tax bill',
        readTime: '6 min',
        content: 'Tax-loss harvesting involves selling losing investments to offset capital gains. The strategy reduces your tax bill while maintaining market exposure. Beware the wash-sale rule: you cannot repurchase the same or substantially identical security within 30 days before or after the sale. Consider replacing with similar but not identical investments.',
      },
      {
        id: 't3',
        title: 'Dividend Tax Treatment',
        description: 'Qualified vs non-qualified dividends',
        readTime: '5 min',
        content: 'Qualified dividends are taxed at long-term capital gains rates (0%, 15%, or 20%). Non-qualified (ordinary) dividends are taxed as regular income. To qualify, you must hold the stock for 60+ days during the 121-day period around the ex-dividend date. REITs and foreign stocks often pay non-qualified dividends.',
      },
      {
        id: 't4',
        title: 'Wash Sale Rules',
        description: 'Avoiding disallowed losses',
        readTime: '5 min',
        content: 'The wash sale rule disallows loss deductions if you buy substantially identical securities within 30 days before or after selling at a loss. The rule applies across all your accounts, including IRAs. Disallowed losses are added to the cost basis of the replacement shares. Wait 31 days or buy a different security to avoid issues.',
      },
    ],
  },
  {
    id: 'tax-strategies',
    title: 'Tax Strategies',
    icon: 'bulb-outline' as const,
    articles: [
      {
        id: 't5',
        title: 'Tax-Advantaged Accounts',
        description: 'IRA, 401(k), and HSA tax benefits',
        readTime: '8 min',
        content: 'Traditional accounts provide tax deductions now; withdrawals are taxed later. Roth accounts are funded with after-tax money but grow and withdraw tax-free. 401(k) limits are higher than IRA limits ($23,000 vs $7,000 in 2024). HSAs offer triple tax benefits: deductible contributions, tax-free growth, and tax-free withdrawals for medical expenses.',
      },
      {
        id: 't6',
        title: 'Tax-Efficient Investing',
        description: 'Asset location strategies',
        readTime: '6 min',
        content: 'Asset location means placing investments in the optimal account type for tax efficiency. Hold tax-inefficient investments (bonds, REITs, high-turnover funds) in tax-advantaged accounts. Hold tax-efficient investments (index funds, growth stocks, municipal bonds) in taxable accounts. This strategy can add meaningful returns over time.',
      },
      {
        id: 't7',
        title: 'Roth Conversion Strategies',
        description: 'When to convert traditional to Roth',
        readTime: '7 min',
        content: 'Roth conversions move money from traditional to Roth accounts, paying taxes now for tax-free growth later. Consider conversions in low-income years, early retirement, or when tax rates are expected to rise. Spread conversions over multiple years to avoid jumping tax brackets. Conversions are irreversible, so plan carefully.',
      },
    ],
  },
  {
    id: 'tax-planning',
    title: 'Tax Planning',
    icon: 'calendar-outline' as const,
    articles: [
      {
        id: 't8',
        title: 'Year-End Tax Planning',
        description: 'Strategies to implement before December 31',
        readTime: '7 min',
        content: 'Review capital gains and losses for harvesting opportunities. Max out retirement contributions before year-end. Consider Roth conversions if in a low tax bracket. Bunch itemized deductions into alternating years if beneficial. Make charitable contributions. Review and adjust estimated tax payments to avoid penalties.',
      },
      {
        id: 't9',
        title: 'Estimated Tax Payments',
        description: 'Avoiding underpayment penalties',
        readTime: '5 min',
        content: 'If you have significant income not subject to withholding (investments, self-employment), you may need quarterly estimated payments. Pay at least 90% of current year tax or 100% of prior year (110% if high income) to avoid penalties. Due dates are April 15, June 15, September 15, and January 15.',
      },
      {
        id: 't10',
        title: 'State Tax Considerations',
        description: 'How state taxes affect your investments',
        readTime: '6 min',
        content: 'State tax rates vary from 0% (Texas, Florida) to over 13% (California). Some states tax capital gains at lower rates or not at all. Municipal bonds from your state are typically state tax-free. Consider state taxes when deciding where to retire or when to realize gains. State residency rules can be complex.',
      },
    ],
  },
];

export default function TaxesResource() {
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
            <Ionicons name="document-text-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Taxes</Text>
          <Text style={styles.headerDescription}>
            Tax strategies, deductions, and investment tax implications
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
