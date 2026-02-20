// app/profile/community-guidelines.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function CommunityGuidelines() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const guidelines = [
    {
      icon: 'heart',
      title: 'Be Respectful',
      description: 'Treat others the way you want to be treated. No harassment, bullying, or hate speech of any kind.',
      color: '#FF2D55',
    },
    {
      icon: 'checkmark-circle',
      title: 'Be Authentic',
      description: 'Share genuine insights and opinions. Don\'t impersonate others or spread misinformation.',
      color: '#34C759',
    },
    {
      icon: 'shield',
      title: 'Protect Privacy',
      description: 'Don\'t share personal information about others without consent. Respect everyone\'s privacy.',
      color: '#007AFF',
    },
    {
      icon: 'warning',
      title: 'No Market Manipulation',
      description: 'Coordinated efforts to artificially influence stock prices are illegal and will result in permanent ban.',
      color: '#FF9500',
    },
    {
      icon: 'document-text',
      title: 'Disclose Positions',
      description: 'When discussing specific stocks, be transparent about your positions and potential conflicts of interest.',
      color: '#5856D6',
    },
    {
      icon: 'chatbubbles',
      title: 'Constructive Discussion',
      description: 'Engage in meaningful conversations. Low-effort spam, trolling, and off-topic content will be removed.',
      color: '#00C7BE',
    },
  ];

  const prohibitedContent = [
    'Hate speech or discrimination',
    'Harassment or bullying',
    'Spam or promotional content',
    'Misleading financial advice',
    'Pump and dump schemes',
    'Personal attacks',
    'Explicit or violent content',
    'Illegal activities',
    'Doxxing or privacy violations',
    'Impersonation',
  ];

  const consequences = [
    { level: 'Warning', description: 'First minor offense - educational reminder', color: '#FF9500' },
    { level: 'Temporary Mute', description: 'Repeated minor offenses - 24-72 hour mute', color: '#FF9500' },
    { level: 'Suspension', description: 'Serious violations - 7-30 day suspension', color: '#FF3B30' },
    { level: 'Permanent Ban', description: 'Severe or repeated violations - account termination', color: '#FF3B30' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : '#f0f0f0' }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Community Guidelines</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={[styles.introSection, { backgroundColor: isDark ? colors.surface : '#f0f8ff' }]}>
          <Text style={[styles.introTitle, { color: colors.text }]}>Building a Better Community Together</Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Our community guidelines help create a safe, informative, and respectful environment 
            for all investors to learn, share, and grow together.
          </Text>
        </View>

        {/* Core Guidelines */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Core Guidelines</Text>
          {guidelines.map((guideline, index) => (
            <View key={index} style={[styles.guidelineCard, { backgroundColor: colors.card }]}>
              <View style={[styles.guidelineIcon, { backgroundColor: `${guideline.color}15` }]}>
                <Ionicons name={guideline.icon as any} size={24} color={guideline.color} />
              </View>
              <View style={styles.guidelineContent}>
                <Text style={[styles.guidelineTitle, { color: colors.text }]}>{guideline.title}</Text>
                <Text style={[styles.guidelineDescription, { color: colors.textSecondary }]}>{guideline.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Prohibited Content */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Prohibited Content</Text>
          <View style={[styles.prohibitedCard, { backgroundColor: isDark ? '#2A1010' : '#fff5f5', borderColor: isDark ? '#5A2020' : '#ffcccc' }]}>
            {prohibitedContent.map((item, index) => (
              <View key={index} style={styles.prohibitedItem}>
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
                <Text style={[styles.prohibitedText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Consequences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Enforcement</Text>
          <Text style={[styles.enforcementIntro, { color: colors.textSecondary }]}>
            Violations of these guidelines may result in the following actions:
          </Text>
          {consequences.map((item, index) => (
            <View key={index} style={styles.consequenceItem}>
              <View style={[styles.consequenceLevel, { backgroundColor: `${item.color}15` }]}>
                <Text style={[styles.consequenceLevelText, { color: item.color }]}>{item.level}</Text>
              </View>
              <Text style={[styles.consequenceDescription, { color: colors.textSecondary }]}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Reporting */}
        <View style={[styles.reportSection, { backgroundColor: isDark ? colors.surface : '#f0f8ff' }]}>
          <Ionicons name="flag" size={32} color="#007AFF" />
          <Text style={[styles.reportTitle, { color: colors.text }]}>See Something? Report It.</Text>
          <Text style={[styles.reportText, { color: colors.textSecondary }]}>
            Help us keep the community safe by reporting content that violates these guidelines.
          </Text>
          <TouchableOpacity 
            style={styles.reportButton}
            onPress={() => router.push('/profile/report-problem' as any)}
          >
            <Text style={styles.reportButtonText}>Report Content</Text>
          </TouchableOpacity>
        </View>

        {/* Last Updated */}
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
    minHeight: 56,
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
  },
  content: { flex: 1 },
  introSection: {
    padding: 20,
    backgroundColor: '#f0f8ff',
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  introText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000',
  },
  guidelineCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  guidelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  guidelineContent: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  guidelineDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  prohibitedCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  prohibitedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  prohibitedText: {
    fontSize: 15,
    color: '#333',
  },
  enforcementIntro: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  consequenceLevel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 120,
  },
  consequenceLevelText: {
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  consequenceDescription: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  reportSection: {
    margin: 16,
    padding: 24,
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    alignItems: 'center',
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
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  lastUpdated: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
    marginTop: 20,
  },
});
