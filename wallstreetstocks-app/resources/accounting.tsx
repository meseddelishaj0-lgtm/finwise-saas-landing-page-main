// app/resources/accounting.tsx
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

const CATEGORY_COLOR = '#34C759';

const SUBCATEGORIES = [
  {
    id: 'financial-statements',
    title: 'Financial Statements',
    icon: 'document-text-outline' as const,
    articles: [
      {
        id: 'a1',
        title: 'Reading Income Statements',
        description: 'Understanding revenue, expenses, and profitability',
        readTime: '8 min',
        content: 'The income statement shows a companys profitability over a period. Key lines include: Revenue (total sales), Cost of Goods Sold, Gross Profit, Operating Expenses, Operating Income, and Net Income. Look for consistent revenue growth and improving margins. Compare to industry peers for context.',
      },
      {
        id: 'a2',
        title: 'Understanding Balance Sheets',
        description: 'Assets, liabilities, and shareholders equity explained',
        readTime: '7 min',
        content: 'The balance sheet shows what a company owns (assets) and owes (liabilities) at a point in time. Assets = Liabilities + Equity. Current assets and liabilities are short-term. Look at debt-to-equity ratios and current ratios. A strong balance sheet has manageable debt and liquid assets.',
      },
      {
        id: 'a3',
        title: 'Cash Flow Statement Analysis',
        description: 'Why cash flow matters more than profits',
        readTime: '6 min',
        content: 'Cash flow statements show actual cash movements. Three sections: Operating (core business), Investing (capital expenditures), and Financing (debt and equity). Free cash flow = Operating cash flow - Capital expenditures. Positive free cash flow indicates financial health.',
      },
    ],
  },
  {
    id: 'ratios-metrics',
    title: 'Financial Ratios',
    icon: 'analytics-outline' as const,
    articles: [
      {
        id: 'a4',
        title: 'Profitability Ratios',
        description: 'ROE, ROA, and profit margins explained',
        readTime: '6 min',
        content: 'Profitability ratios measure how efficiently a company generates profits. Return on Equity (ROE) = Net Income / Shareholders Equity. Return on Assets (ROA) = Net Income / Total Assets. Profit Margin = Net Income / Revenue. Higher ratios generally indicate better performance.',
      },
      {
        id: 'a5',
        title: 'Valuation Ratios',
        description: 'P/E, P/B, and P/S ratios for stock analysis',
        readTime: '7 min',
        content: 'Valuation ratios help determine if a stock is over or undervalued. P/E (Price-to-Earnings) compares stock price to earnings per share. P/B (Price-to-Book) compares to book value. P/S (Price-to-Sales) compares to revenue. Compare ratios to industry averages and historical ranges.',
      },
      {
        id: 'a6',
        title: 'Liquidity and Solvency Ratios',
        description: 'Measuring financial health and stability',
        readTime: '5 min',
        content: 'Liquidity ratios measure short-term financial health. Current Ratio = Current Assets / Current Liabilities (aim for >1.5). Quick Ratio excludes inventory. Debt-to-Equity measures leverage. Interest Coverage shows ability to pay interest. Strong ratios indicate financial stability.',
      },
    ],
  },
  {
    id: 'accounting-principles',
    title: 'Accounting Principles',
    icon: 'book-outline' as const,
    articles: [
      {
        id: 'a7',
        title: 'Understanding GAAP',
        description: 'Generally Accepted Accounting Principles explained',
        readTime: '7 min',
        content: 'GAAP provides standardized accounting rules in the US. Key principles include revenue recognition, matching expenses to revenue, and full disclosure. GAAP ensures consistency and comparability between companies. Public companies must follow GAAP for financial reporting.',
      },
      {
        id: 'a8',
        title: 'Depreciation Methods',
        description: 'Different ways companies account for asset depreciation',
        readTime: '5 min',
        content: 'Depreciation allocates asset costs over their useful life. Straight-line depreciation spreads costs evenly. Accelerated methods (declining balance, sum-of-years) front-load expenses. Different methods affect reported profits and taxes. Check depreciation policies in financial statement notes.',
      },
    ],
  },
];

export default function AccountingResource() {
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
            <Ionicons name="calculator-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Accounting</Text>
          <Text style={styles.headerDescription}>
            Financial statements, bookkeeping, and accounting principles
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
