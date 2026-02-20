// app/profile/house-rules.tsx
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
import { useTheme } from '@/context/ThemeContext';

export default function HouseRules() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const coreRules = [
    {
      number: 1,
      icon: 'people',
      title: 'Respect Everyone',
      description: 'Treat all community members with respect. No personal attacks, insults, or harassment of any kind.',
      color: '#FF2D55',
    },
    {
      number: 2,
      icon: 'checkmark-done',
      title: 'Be Authentic',
      description: 'Use your real identity. No fake accounts, impersonation, or misleading profiles.',
      color: '#34C759',
    },
    {
      number: 3,
      icon: 'trending-up',
      title: 'No Market Manipulation',
      description: 'Coordinated buying/selling, pump and dump schemes, and spreading false information to influence prices is strictly prohibited.',
      color: '#007AFF',
    },
    {
      number: 4,
      icon: 'document-text',
      title: 'Disclose Your Positions',
      description: 'When discussing specific stocks, be transparent about whether you hold a position. Honesty builds trust.',
      color: '#FF9500',
    },
    {
      number: 5,
      icon: 'warning',
      title: 'No Financial Advice',
      description: 'Share opinions and analysis, but don\'t give personalized financial advice. Always remind others to do their own research.',
      color: '#AF52DE',
    },
    {
      number: 6,
      icon: 'shield',
      title: 'Protect Privacy',
      description: 'Never share personal information about yourself or others. This includes real names, addresses, and financial details.',
      color: '#5856D6',
    },
    {
      number: 7,
      icon: 'chatbubbles',
      title: 'Stay On Topic',
      description: 'Keep discussions relevant to investing and finance. Off-topic spam and promotional content will be removed.',
      color: '#00C7BE',
    },
    {
      number: 8,
      icon: 'eye-off',
      title: 'No Spam or Self-Promotion',
      description: 'Don\'t spam links, promote services, or post repetitive content. Quality over quantity.',
      color: '#8E8E93',
    },
  ];

  const quickDonts = [
    'Post misleading headlines or fake news',
    'Share insider information',
    'Harass or bully other members',
    'Create multiple accounts',
    'Post explicit or violent content',
    'Spam or flood discussions',
    'Promote pyramid schemes or scams',
    'Dox or reveal others\' personal info',
    'Use bots or automated posting',
    'Evade bans or suspensions',
  ];

  const quickDos = [
    'Share thoughtful analysis and DD',
    'Credit sources and original authors',
    'Use appropriate content warnings',
    'Report violations when you see them',
    'Help newcomers learn',
    'Engage in constructive debate',
    'Fact-check before sharing',
    'Be patient with different skill levels',
    'Celebrate wins and support losses',
    'Keep discussions civil',
  ];

  const penalties = [
    { offense: 'First Violation', action: 'Warning', icon: 'alert-circle', color: '#FF9500' },
    { offense: 'Minor Repeat', action: '24h Mute', icon: 'volume-mute', color: '#FF9500' },
    { offense: 'Serious Violation', action: '7-Day Ban', icon: 'ban', color: '#FF3B30' },
    { offense: 'Severe/Repeated', action: 'Permanent Ban', icon: 'close-circle', color: '#FF3B30' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : '#f0f0f0' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>House Rules</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: isDark ? colors.surface : '#f0f8ff' }]}>
          <View style={[styles.heroIconContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="home" size={40} color="#007AFF" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Our Community Standards</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            These rules help us maintain a safe, informative, and respectful space for all investors
          </Text>
        </View>

        {/* Core Rules */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>The 8 Golden Rules</Text>
          {coreRules.map((rule, index) => (
            <View key={index} style={[styles.ruleCard, { backgroundColor: colors.card }]}>
              <View style={styles.ruleHeader}>
                <View style={[styles.ruleNumber, { backgroundColor: rule.color }]}>
                  <Text style={styles.ruleNumberText}>{rule.number}</Text>
                </View>
                <View style={[styles.ruleIconContainer, { backgroundColor: `${rule.color}15` }]}>
                  <Ionicons name={rule.icon as any} size={22} color={rule.color} />
                </View>
              </View>
              <Text style={[styles.ruleTitle, { color: colors.text }]}>{rule.title}</Text>
              <Text style={[styles.ruleDescription, { color: colors.textSecondary }]}>{rule.description}</Text>
            </View>
          ))}
        </View>

        {/* Do's and Don'ts */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Reference</Text>

          <View style={styles.dosAndDontsContainer}>
            {/* Don'ts */}
            <View style={[styles.listCard, styles.dontsCard, { backgroundColor: isDark ? '#2A1010' : '#fff5f5', borderColor: isDark ? '#5A2020' : '#ffdddd' }]}>
              <View style={styles.listHeader}>
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
                <Text style={[styles.listTitle, { color: '#FF3B30' }]}>Don&apos;t</Text>
              </View>
              {quickDonts.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={[styles.bulletDot, { backgroundColor: '#FF3B30' }]} />
                  <Text style={[styles.listItemText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Do's */}
            <View style={[styles.listCard, styles.dosCard, { backgroundColor: isDark ? '#0A2A10' : '#f0fff4', borderColor: isDark ? '#1A4A20' : '#d4edda' }]}>
              <View style={styles.listHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={[styles.listTitle, { color: '#34C759' }]}>Do</Text>
              </View>
              {quickDos.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={[styles.bulletDot, { backgroundColor: '#34C759' }]} />
                  <Text style={[styles.listItemText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Enforcement */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Enforcement</Text>
          <Text style={[styles.enforcementIntro, { color: colors.textSecondary }]}>
            We take violations seriously. Here&apos;s what happens when rules are broken:
          </Text>

          <View style={[styles.penaltiesContainer, { backgroundColor: colors.card }]}>
            {penalties.map((penalty, index) => (
              <View key={index} style={styles.penaltyRow}>
                <View style={[styles.penaltyIcon, { backgroundColor: `${penalty.color}15` }]}>
                  <Ionicons name={penalty.icon as any} size={20} color={penalty.color} />
                </View>
                <View style={styles.penaltyContent}>
                  <Text style={[styles.penaltyOffense, { color: colors.textSecondary }]}>{penalty.offense}</Text>
                  <Text style={[styles.penaltyAction, { color: penalty.color }]}>{penalty.action}</Text>
                </View>
                {index < penalties.length - 1 && (
                  <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} style={styles.penaltyArrow} />
                )}
              </View>
            ))}
          </View>

          <View style={[styles.appealBox, { backgroundColor: isDark ? colors.surface : '#f0f8ff' }]}>
            <Ionicons name="hand-left-outline" size={24} color="#007AFF" />
            <View style={styles.appealContent}>
              <Text style={styles.appealTitle}>Appeals Process</Text>
              <Text style={[styles.appealText, { color: colors.textSecondary }]}>
                Think we made a mistake? You can appeal any moderation decision within 14 days by contacting support.
              </Text>
            </View>
          </View>
        </View>

        {/* Report Section */}
        <View style={[styles.reportSection, { backgroundColor: isDark ? '#2A1010' : '#fff5f5', borderColor: isDark ? '#5A2020' : '#ffdddd' }]}>
          <Ionicons name="flag" size={28} color="#FF3B30" />
          <Text style={[styles.reportTitle, { color: colors.text }]}>See a Violation?</Text>
          <Text style={[styles.reportText, { color: colors.textSecondary }]}>
            Help keep our community safe by reporting content that breaks these rules.
          </Text>
          <TouchableOpacity 
            style={styles.reportButton}
            onPress={() => router.push('/profile/report-problem' as any)}
          >
            <Text style={styles.reportButtonText}>Report Content</Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: isDark ? colors.surface : '#f5f5f5' }]}>
          <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
            These rules may be updated from time to time. Continued use of the platform constitutes
            acceptance of any changes. For detailed legal terms, please see our Terms of Service.
          </Text>
          <TouchableOpacity onPress={() => router.push('/profile/terms' as any)}>
            <Text style={styles.disclaimerLink}>View Terms of Service</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>Last updated: January 2025</Text>

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
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f0f8ff',
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
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
  ruleCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  ruleNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  ruleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  ruleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
  },
  dosAndDontsContainer: {
    gap: 12,
  },
  listCard: {
    borderRadius: 16,
    padding: 18,
  },
  dontsCard: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffdddd',
  },
  dosCard: {
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#d4edda',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  enforcementIntro: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  penaltiesContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  penaltyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  penaltyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  penaltyContent: {
    flex: 1,
  },
  penaltyOffense: {
    fontSize: 14,
    color: '#666',
  },
  penaltyAction: {
    fontSize: 16,
    fontWeight: '600',
  },
  penaltyArrow: {
    marginLeft: 8,
  },
  appealBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  appealContent: {
    flex: 1,
  },
  appealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  appealText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reportSection: {
    margin: 20,
    padding: 24,
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffdddd',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
  },
  reportText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  reportButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disclaimer: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 19,
    marginBottom: 8,
  },
  disclaimerLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  lastUpdated: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
    marginTop: 20,
  },
});
