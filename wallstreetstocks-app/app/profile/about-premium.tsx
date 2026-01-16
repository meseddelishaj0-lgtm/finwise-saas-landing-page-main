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
    },
    {
      name: 'Platinum',
      price: '$19.99',
      period: '/month',
      savings: null,
      popular: true,
      color: '#E5E4E2',
    },
    {
      name: 'Diamond',
      price: '$29.99',
      period: '/month',
      savings: 'Best Value',
      color: '#B9F2FF',
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
          <View style={styles.plansContainer}>
            {plans.map((plan, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.planCard,
                  plan.popular && styles.popularPlan,
                  { borderColor: plan.color }
                ]}
                onPress={() => router.push('/paywall' as any)}
              >
                {plan.popular && (
                  <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}
                <View style={[styles.tierBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.tierBadgeText}>{plan.name}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
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

        {/* Comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Free vs Premium</Text>
          <View style={styles.comparisonTable}>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>Real-time quotes</Text>
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>Advanced charts</Text>
              <Text style={styles.comparisonLimit}>Basic</Text>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>Price alerts</Text>
              <Text style={styles.comparisonLimit}>3</Text>
              <Text style={styles.comparisonUnlimited}>Unlimited</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>AI insights</Text>
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>Premium news</Text>
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>Data export</Text>
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            </View>
          </View>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonHeaderText}>Feature</Text>
            <Text style={styles.comparisonHeaderText}>Free</Text>
            <Text style={[styles.comparisonHeaderText, { color: '#007AFF' }]}>Premium</Text>
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

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/paywall' as any)}
          >
            <Ionicons name="diamond" size={20} color="#fff" />
            <Text style={styles.ctaButtonText}>Start Free Trial</Text>
          </TouchableOpacity>
          <Text style={styles.ctaNote}>7-day free trial • Cancel anytime</Text>
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
  planCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e5e5',
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
  comparisonTable: {
    marginTop: 8,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e5e5',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  comparisonHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    flex: 1,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  comparisonFeature: {
    flex: 2,
    fontSize: 14,
    color: '#333',
  },
  comparisonLimit: {
    flex: 1,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  comparisonUnlimited: {
    flex: 1,
    fontSize: 13,
    color: '#34C759',
    fontWeight: '600',
    textAlign: 'center',
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
  ctaSection: {
    padding: 20,
    alignItems: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  ctaNote: {
    marginTop: 12,
    fontSize: 13,
    color: '#999',
  },
});
