// app/resources/insurance.tsx
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

const CATEGORY_COLOR = '#5856D6';

const SUBCATEGORIES = [
  {
    id: 'insurance-types',
    title: 'Types of Insurance',
    icon: 'layers-outline' as const,
    articles: [
      {
        id: 'i1',
        title: 'Life Insurance Basics',
        description: 'Term vs whole life insurance explained',
        readTime: '7 min',
        content: 'Term life insurance provides coverage for a specific period (10, 20, 30 years) at lower premiums. Whole life insurance provides lifetime coverage with a cash value component that grows over time. Term is better for most people who need pure protection. Whole life can be part of estate planning for high-net-worth individuals.',
      },
      {
        id: 'i2',
        title: 'Health Insurance Options',
        description: 'HMO, PPO, and HSA-compatible plans',
        readTime: '6 min',
        content: 'HMOs require using network providers and getting referrals for specialists. PPOs offer more flexibility to see any provider but cost more. High-Deductible Health Plans (HDHPs) pair with Health Savings Accounts (HSAs). HSAs offer triple tax advantages: tax-deductible contributions, tax-free growth, and tax-free withdrawals for medical expenses.',
      },
      {
        id: 'i3',
        title: 'Property and Casualty Insurance',
        description: 'Protecting your home and assets',
        readTime: '5 min',
        content: 'Homeowners insurance covers property damage and liability claims. Renters insurance protects personal belongings for tenants. Auto insurance includes liability (required), collision, and comprehensive coverage. Umbrella policies provide additional liability protection above your other policies. Review coverage limits annually.',
      },
      {
        id: 'i4',
        title: 'Disability Insurance',
        description: 'Protecting your income if you cannot work',
        readTime: '6 min',
        content: 'Disability insurance replaces a portion of income if you cannot work due to illness or injury. Short-term disability covers weeks to months. Long-term disability covers extended periods. Own-occupation policies pay if you cannot do your specific job. Group policies through employers are often cheaper but less comprehensive.',
      },
    ],
  },
  {
    id: 'insurance-investing',
    title: 'Insurance & Investing',
    icon: 'trending-up-outline' as const,
    articles: [
      {
        id: 'i5',
        title: 'Insurance Company Stocks',
        description: 'Investing in the insurance industry',
        readTime: '6 min',
        content: 'Insurance companies profit from premiums collected and investment income on their float. Key metrics include combined ratio (claims + expenses / premiums - lower is better), book value per share, and return on equity. Life insurers are sensitive to interest rates. Property insurers face catastrophe risk. Diversified insurers offer more stability.',
      },
      {
        id: 'i6',
        title: 'Annuities Explained',
        description: 'Guaranteed income in retirement',
        readTime: '8 min',
        content: 'Annuities are insurance products that provide guaranteed income, often for life. Fixed annuities offer guaranteed returns. Variable annuities returns depend on underlying investments. Immediate annuities start paying right away. Deferred annuities accumulate value over time before payments begin. Fees can be high, so compare products carefully.',
      },
      {
        id: 'i7',
        title: 'Cash Value Life Insurance',
        description: 'Using life insurance as an investment',
        readTime: '7 min',
        content: 'Whole life and universal life policies build cash value over time. You can borrow against cash value tax-free. Indexed universal life ties returns to market indexes with downside protection. Variable universal life allows investment choices. High fees make these inferior to term life plus separate investing for most people.',
      },
    ],
  },
  {
    id: 'risk-protection',
    title: 'Risk Protection',
    icon: 'shield-outline' as const,
    articles: [
      {
        id: 'i8',
        title: 'Determining Coverage Needs',
        description: 'How much insurance do you really need?',
        readTime: '5 min',
        content: 'Life insurance needs depend on income replacement, debts, and dependents. A common rule is 10-12x annual income. Health insurance should cover catastrophic costs with manageable premiums. Auto liability should be at least 100/300/100. Home insurance should cover replacement cost. Review needs as life circumstances change.',
      },
      {
        id: 'i9',
        title: 'Understanding Deductibles',
        description: 'Balancing premiums and out-of-pocket costs',
        readTime: '4 min',
        content: 'Higher deductibles mean lower premiums but more out-of-pocket costs when claims occur. Choose deductibles you can comfortably afford. Health insurance deductibles reset annually. Auto and home deductibles apply per claim. Consider your claims history and risk tolerance when setting deductible levels.',
      },
    ],
  },
];

export default function InsuranceResource() {
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
            <Ionicons name="shield-checkmark-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Insurance</Text>
          <Text style={styles.headerDescription}>
            Insurance products, risk protection, and policy analysis
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
