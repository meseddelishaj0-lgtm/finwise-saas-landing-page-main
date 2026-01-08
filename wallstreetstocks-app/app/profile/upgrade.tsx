// app/profile/upgrade.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type PlanId = 'basic' | 'pro' | 'elite';
type BillingCycle = 'monthly' | 'yearly';

export default function Upgrade() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');

  const plans = {
    basic: {
      id: 'basic' as PlanId,
      name: 'Basic',
      icon: 'flash',
      color: '#8E8E93',
      monthlyPrice: 4.99,
      yearlyPrice: 3.99,
      description: 'Essential tools for beginners',
      features: [
        { text: 'Real-time stock quotes', included: true },
        { text: 'Basic charts & indicators', included: true },
        { text: '5 price alerts', included: true },
        { text: 'Daily market news', included: true },
        { text: 'Community access', included: true },
        { text: 'Advanced technical analysis', included: false },
        { text: 'AI-powered insights', included: false },
        { text: 'Unlimited alerts', included: false },
        { text: 'Premium research reports', included: false },
        { text: 'Priority support', included: false },
      ],
    },
    pro: {
      id: 'pro' as PlanId,
      name: 'Pro',
      icon: 'diamond',
      color: '#007AFF',
      monthlyPrice: 14.99,
      yearlyPrice: 9.99,
      description: 'Advanced tools for serious investors',
      popular: true,
      features: [
        { text: 'Real-time stock quotes', included: true },
        { text: 'Advanced charts & 50+ indicators', included: true },
        { text: 'Unlimited price alerts', included: true },
        { text: 'Real-time market news', included: true },
        { text: 'Community access + badges', included: true },
        { text: 'Advanced technical analysis', included: true },
        { text: 'AI-powered insights', included: true },
        { text: 'Earnings calendar & alerts', included: true },
        { text: 'Premium research reports', included: false },
        { text: 'Priority support', included: false },
      ],
    },
    elite: {
      id: 'elite' as PlanId,
      name: 'Elite',
      icon: 'trophy',
      color: '#FFD700',
      monthlyPrice: 29.99,
      yearlyPrice: 19.99,
      description: 'Ultimate toolkit for professionals',
      features: [
        { text: 'Real-time stock quotes', included: true },
        { text: 'Advanced charts & 100+ indicators', included: true },
        { text: 'Unlimited price alerts', included: true },
        { text: 'Real-time market news', included: true },
        { text: 'Community access + elite badge', included: true },
        { text: 'Advanced technical analysis', included: true },
        { text: 'AI-powered insights + custom queries', included: true },
        { text: 'Earnings calendar & alerts', included: true },
        { text: 'Premium research reports', included: true },
        { text: '24/7 Priority support', included: true },
      ],
    },
  };

  const getPrice = (plan: typeof plans.basic) => {
    return billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const getSavings = (plan: typeof plans.basic) => {
    const yearlySavings = (plan.monthlyPrice - plan.yearlyPrice) * 12;
    const percentSavings = Math.round((1 - plan.yearlyPrice / plan.monthlyPrice) * 100);
    return { amount: yearlySavings.toFixed(0), percent: percentSavings };
  };

  const handleSubscribe = () => {
    const plan = plans[selectedPlan];
    const price = getPrice(plan);
    const period = billingCycle === 'yearly' ? 'year' : 'month';
    
    Alert.alert(
      'Confirm Subscription',
      `Subscribe to ${plan.name} for $${price.toFixed(2)}/${period === 'year' ? 'mo (billed annually)' : 'month'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Subscribe', 
          onPress: () => {
            Alert.alert(
              'Success! 🎉',
              `Welcome to WallStreetStocks ${plan.name}! Your premium features are now active.`,
              [{ text: 'Get Started', onPress: () => router.back() }]
            );
          }
        },
      ]
    );
  };

  const selectedPlanData = plans[selectedPlan];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Your Plan</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Unlock Premium Research</Text>
          <Text style={styles.heroSubtitle}>
            Get advanced tools, AI insights, and real-time data to make smarter investment decisions
          </Text>
        </View>

        {/* Billing Toggle */}
        <View style={styles.billingToggleContainer}>
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
              onPress={() => setBillingCycle('monthly')}
            >
              <Text style={[styles.billingOptionText, billingCycle === 'monthly' && styles.billingOptionTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
              onPress={() => setBillingCycle('yearly')}
            >
              <Text style={[styles.billingOptionText, billingCycle === 'yearly' && styles.billingOptionTextActive]}>
                Yearly
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save 33%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plan Cards */}
        <View style={styles.plansContainer}>
          {Object.values(plans).map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                selectedPlan === plan.id && { borderColor: plan.color },
              ]}
              onPress={() => setSelectedPlan(plan.id)}
              activeOpacity={0.8}
            >
              {'popular' in plan && plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, { backgroundColor: `${plan.color}20` }]}>
                  <Ionicons name={plan.icon as any} size={24} color={plan.color} />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>
                <View style={[
                  styles.radioOuter,
                  selectedPlan === plan.id && { borderColor: plan.color }
                ]}>
                  {selectedPlan === plan.id && (
                    <View style={[styles.radioInner, { backgroundColor: plan.color }]} />
                  )}
                </View>
              </View>

              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>${getPrice(plan).toFixed(2)}</Text>
                <Text style={styles.planPeriod}>/month</Text>
                {billingCycle === 'yearly' && (
                  <Text style={styles.billedText}>billed annually</Text>
                )}
              </View>

              {billingCycle === 'yearly' && (
                <View style={styles.savingsRow}>
                  <Ionicons name="pricetag" size={14} color="#34C759" />
                  <Text style={styles.savingsText}>
                    Save ${getSavings(plan).amount}/year ({getSavings(plan).percent}% off)
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Features Comparison */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresSectionTitle}>
            {selectedPlanData.name} Features
          </Text>
          <View style={styles.featuresList}>
            {selectedPlanData.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons
                  name={feature.included ? 'checkmark-circle' : 'close-circle'}
                  size={22}
                  color={feature.included ? '#34C759' : '#ccc'}
                />
                <Text style={[
                  styles.featureText,
                  !feature.included && styles.featureTextDisabled
                ]}>
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Compare All Plans */}
        <TouchableOpacity style={styles.compareButton}>
          <Text style={styles.compareButtonText}>Compare All Plans</Text>
          <Ionicons name="chevron-forward" size={18} color="#007AFF" />
        </TouchableOpacity>

        {/* Trust Badges */}
        <View style={styles.trustSection}>
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={20} color="#34C759" />
            <Text style={styles.trustText}>Secure Payment</Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="refresh" size={20} color="#007AFF" />
            <Text style={styles.trustText}>Cancel Anytime</Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="card" size={20} color="#FF9500" />
            <Text style={styles.trustText}>7-Day Trial</Text>
          </View>
        </View>

        {/* Testimonial */}
        <View style={styles.testimonialCard}>
          <View style={styles.testimonialStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons key={star} name="star" size={16} color="#FFD700" />
            ))}
          </View>
          <Text style={styles.testimonialText}>
            &quot;The AI insights alone are worth the subscription. I&apos;ve discovered so many great research opportunities!&quot;
          </Text>
          <Text style={styles.testimonialAuthor}>— Michael R., Pro Member</Text>
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Common Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
            <Text style={styles.faqAnswer}>
              Yes! You can cancel your subscription at any time. You&apos;ll continue to have access until the end of your billing period.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is there a free trial?</Text>
            <Text style={styles.faqAnswer}>
              Yes, all plans include a 7-day free trial. You won&apos;t be charged until the trial ends.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I switch plans?</Text>
            <Text style={styles.faqAnswer}>
              Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.
            </Text>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          WallStreetStocks is a research and information platform only. We do not provide trading, 
          brokerage services, or financial advice. Subscription provides access to premium research tools and data.
        </Text>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed Bottom CTA */}
      <View style={styles.bottomCTA}>
        <View style={styles.ctaPriceContainer}>
          <Text style={styles.ctaPlanName}>{selectedPlanData.name}</Text>
          <View style={styles.ctaPriceRow}>
            <Text style={styles.ctaPrice}>${getPrice(selectedPlanData).toFixed(2)}</Text>
            <Text style={styles.ctaPeriod}>/{billingCycle === 'yearly' ? 'mo' : 'month'}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.subscribeButton, { backgroundColor: selectedPlanData.color === '#FFD700' ? '#007AFF' : selectedPlanData.color }]}
          onPress={handleSubscribe}
        >
          <Text style={styles.subscribeButtonText}>Start Free Trial</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: { flex: 1 },
  heroSection: {
    padding: 24,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  billingToggleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
  },
  billingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  billingOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  billingOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  billingOptionTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  saveBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  plansContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    position: 'relative',
  },
  planCardSelected: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  planDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
  },
  planPeriod: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  billedText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 8,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savingsText: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '600',
  },
  featuresSection: {
    padding: 20,
    marginTop: 8,
  },
  featuresSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  featureTextDisabled: {
    color: '#bbb',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 20,
    gap: 4,
  },
  compareButtonText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  trustBadge: {
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  testimonialCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    alignItems: 'center',
  },
  testimonialStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 12,
  },
  testimonialText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    fontSize: 13,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  faqSection: {
    padding: 20,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  ctaPriceContainer: {
    flex: 1,
  },
  ctaPlanName: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  ctaPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  ctaPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },
  ctaPeriod: {
    fontSize: 14,
    color: '#666',
  },
  subscribeButton: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
 