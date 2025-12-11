// app/resources/business.tsx
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

const CATEGORY_COLOR = '#FF6B35';

const SUBCATEGORIES = [
  {
    id: 'starting-business',
    title: 'Starting a Business',
    icon: 'rocket-outline' as const,
    articles: [
      {
        id: 'b1',
        title: 'Business Structure Basics',
        description: 'LLC, S-Corp, C-Corp explained',
        readTime: '8 min',
        content: 'Sole proprietorships are simplest but offer no liability protection. LLCs provide liability protection with pass-through taxation. S-Corps avoid self-employment tax on distributions but have ownership restrictions. C-Corps face double taxation but are preferred for raising venture capital. Consider liability protection, tax implications, and growth plans when choosing.',
      },
      {
        id: 'b2',
        title: 'Writing a Business Plan',
        description: 'Key components of a winning plan',
        readTime: '10 min',
        content: 'A business plan includes: Executive summary, company description, market analysis, organization structure, product/service details, marketing strategy, and financial projections. Be realistic with projections. Include competitive analysis. Show how you will acquire customers profitably. Investors want to see a clear path to profitability.',
      },
      {
        id: 'b3',
        title: 'Funding Options for Startups',
        description: 'Bootstrapping to venture capital',
        readTime: '9 min',
        content: 'Bootstrapping means self-funding through revenue and savings. Friends and family rounds are informal early investments. Angel investors provide seed funding, often $25K-$500K. Venture capital targets high-growth companies with larger investments. SBA loans offer government-backed financing. Crowdfunding platforms like Kickstarter fund consumer products.',
      },
      {
        id: 'b4',
        title: 'Validating Your Business Idea',
        description: 'Testing before you invest',
        readTime: '6 min',
        content: 'Validate before building. Talk to potential customers about their problems. Create a minimum viable product (MVP) to test demand. Use landing pages to gauge interest before full development. Analyze competitors to understand the market. Calculate total addressable market (TAM) to assess opportunity size.',
      },
    ],
  },
  {
    id: 'business-finance',
    title: 'Business Finance',
    icon: 'bar-chart-outline' as const,
    articles: [
      {
        id: 'b5',
        title: 'Cash Flow Management',
        description: 'Keeping your business liquid',
        readTime: '7 min',
        content: 'Cash flow is the lifeblood of business. Profitable companies can fail with poor cash management. Monitor accounts receivable aging. Negotiate payment terms with suppliers. Maintain cash reserves for 3-6 months of expenses. Use 13-week cash flow forecasts for planning. Consider lines of credit for seasonal fluctuations.',
      },
      {
        id: 'b6',
        title: 'Understanding Business Valuation',
        description: 'How businesses are valued',
        readTime: '8 min',
        content: 'Common valuation methods include: Revenue multiples (1-5x annual revenue for SaaS), EBITDA multiples (3-10x depending on industry), and DCF analysis. Growth rate, recurring revenue, and margins affect multiples. Prepare financials for at least 3 years before selling. Strategic buyers often pay premiums over financial buyers.',
      },
      {
        id: 'b7',
        title: 'Business Metrics That Matter',
        description: 'KPIs every entrepreneur should track',
        readTime: '7 min',
        content: 'Key metrics include: Customer Acquisition Cost (CAC), Lifetime Value (LTV) - aim for 3:1 LTV:CAC ratio. Gross margin shows profitability per unit. Burn rate and runway for startups. Monthly Recurring Revenue (MRR) for subscriptions. Churn rate measures customer retention. Track cohort metrics to see trends.',
      },
      {
        id: 'b8',
        title: 'Taking Your Company Public',
        description: 'IPO process and considerations',
        readTime: '9 min',
        content: 'IPOs require significant preparation: audited financials, strong management team, clear growth story, and regulatory compliance. The S-1 filing details company operations and risks. Roadshows pitch to institutional investors. Investment banks underwrite and price the offering. SPACs offer an alternative path to public markets. Consider costs and ongoing obligations carefully.',
      },
    ],
  },
  {
    id: 'growth-scaling',
    title: 'Growth & Scaling',
    icon: 'trending-up-outline' as const,
    articles: [
      {
        id: 'b9',
        title: 'Scaling Your Business',
        description: 'Growing without breaking',
        readTime: '8 min',
        content: 'Scaling requires systems and processes. Document operations before growing. Hire ahead of demand for key roles. Invest in technology to automate repetitive tasks. Maintain quality as you grow. Watch unit economics as scale changes cost structure. Build management layers as the organization expands.',
      },
      {
        id: 'b10',
        title: 'Building a Strong Team',
        description: 'Hiring and culture for growth',
        readTime: '7 min',
        content: 'Hire for culture fit and growth potential. A-players attract A-players. Offer equity compensation to align incentives. Invest in training and development. Create clear career paths. Establish values and communicate them consistently. Build diverse teams for better decision-making. Fire fast when it is not working.',
      },
      {
        id: 'b11',
        title: 'Exit Strategies',
        description: 'Planning your business exit',
        readTime: '8 min',
        content: 'Exit options include: acquisition by strategic buyers (competitors, suppliers, customers), private equity buyouts, management buyouts, IPOs, or passing to family. Plan your exit 3-5 years in advance. Build a business that runs without you. Maximize value by growing recurring revenue and reducing key-person risk. Get proper legal and tax advice.',
      },
    ],
  },
];

export default function BusinessResource() {
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
            <Ionicons name="briefcase-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Business</Text>
          <Text style={styles.headerDescription}>
            Starting businesses, entrepreneurship, and business finance
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
  