// app/profile/about-premium.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AboutPremium() {
  const router = useRouter();

  const premiumFeatures = [
    {
      icon: 'analytics',
      title: 'Advanced Analytics',
      description: 'Access professional-grade charts, technical indicators, and market analysis tools.',
      color: '#007AFF',
    },
    {
      icon: 'flash',
      title: 'Real-Time Data',
      description: 'Get live streaming quotes with zero delay. Never miss a market move.',
      color: '#FF9500',
    },
    {
      icon: 'notifications',
      title: 'Smart Alerts',
      description: 'Set unlimited price alerts and get notified instantly on any device.',
      color: '#FF2D55',
    },
    {
      icon: 'newspaper',
      title: 'Premium News',
      description: 'Exclusive access to breaking news, analyst reports, and market insights.',
      color: '#5856D6',
    },
    {
      icon: 'bulb',
      title: 'AI Insights',
      description: 'Personalized stock recommendations and sentiment analysis powered by AI.',
      color: '#34C759',
    },
    {
      icon: 'briefcase',
      title: 'Portfolio Tools',
      description: 'Advanced portfolio tracking, risk analysis, and performance attribution.',
      color: '#00C7BE',
    },
    {
      icon: 'cloud-download',
      title: 'Data Export',
      description: 'Export your data, trades, and reports in multiple formats.',
      color: '#8E8E93',
    },
    {
      icon: 'headset',
      title: 'Priority Support',
      description: '24/7 dedicated customer support with priority response times.',
      color: '#AF52DE',
    },
  ];

  const plans = [
    {
      name: 'Gold',
      price: '$9.99',
      period: '/month',
      savings: null,
      color: '#FFD700',
      features: [
        '5 Expert Stock Picks',
        'Ad-free experience',
        'Basic watchlists',
        'Community access',
        'Daily market summary',
      ],
    },
    {
      name: 'Platinum',
      price: '$19.99',
      period: '/month',
      savings: null,
      popular: true,
      color: '#E5E4E2',
      features: [
        'Everything in Gold',
        '8 Expert Stock Picks',
        'Screener Filters & Presets',
        'Real-time price alerts',
        'Unlimited watchlists',
        'Priority support',
      ],
    },
    {
      name: 'Diamond',
      price: '$29.99',
      period: '/month',
      savings: 'Best Value',
      color: '#B9F2FF',
      features: [
        'Everything in Platinum',
        '15 Expert Stock Picks',
        'AI Tools & Assistant',
        'Insider Trading Data',
        'Research Reports',
        'Portfolio Tools',
      ],
    },
  ];

  const faqs = [
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.',
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes! New users get a 7-day free trial of Premium. No credit card required to start.',
    },
    {
      question: 'What happens to my data if I cancel?',
      answer: 'Your data is always yours. If you cancel, you\'ll still have access to basic features and all your historical data.',
    },
    {
      question: 'Can I switch plans?',
      answer: 'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle.',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Premium</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="diamond" size={48} color="#007AFF" />
          </View>
          <Text style={styles.heroTitle}>Unlock Your Trading Potential</Text>
          <Text style={styles.heroSubtitle}>
            Join thousands of traders using Premium tools to make smarter investment decisions
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          <View style={styles.featuresGrid}>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: `${feature.color}15` }]}>
                  <Ionicons name={feature.icon as any} size={24} color={feature.color} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <View style={styles.plansVerticalContainer}>
            {plans.map((plan, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.planCardVertical,
                  plan.popular && styles.popularPlanVertical,
                  { borderColor: plan.color }
                ]}
                onPress={() => router.push('/paywall' as any)}
              >
                {plan.popular && (
                  <View style={[styles.popularBadgeVertical, { backgroundColor: plan.color }]}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                )}
                <View style={styles.planCardHeader}>
                  <View style={[styles.tierBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.tierBadgeText}>{plan.name}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </View>
                </View>
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={styles.planFeatureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                      <Text style={styles.planFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                {plan.savings && (
                  <View style={[styles.savingsBadge, { backgroundColor: `${plan.color}30` }]}>
                    <Text style={[styles.savingsText, { color: '#000' }]}>{plan.savings}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 1,
  },
  content: { flex: 1 },
  heroSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f0f8ff',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 17,
  },
  plansContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  plansVerticalContainer: {
    gap: 16,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  planCardVertical: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    position: 'relative',
    overflow: 'hidden',
  },
  popularPlanVertical: {
    backgroundColor: '#f8f8f8',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planFeatures: {
    gap: 8,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  popularPlan: {
    backgroundColor: '#f0f8ff',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularBadgeVertical: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  popularText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  tierBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  tierBadgeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  planPeriod: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  savingsBadge: {
    backgroundColor: '#34C75920',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  savingsText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
