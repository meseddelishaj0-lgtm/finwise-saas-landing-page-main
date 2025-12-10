// app/profile/safety-center.tsx
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

export default function SafetyCenter() {
  const router = useRouter();

  const safetyFeatures = [
    {
      icon: 'shield-checkmark',
      title: 'Account Security',
      description: 'Protect your account with strong passwords and two-factor authentication',
      color: '#34C759',
    },
    {
      icon: 'lock-closed',
      title: 'Data Encryption',
      description: 'All your data is encrypted in transit and at rest using industry standards',
      color: '#007AFF',
    },
    {
      icon: 'eye-off',
      title: 'Privacy Controls',
      description: 'Control who can see your profile, posts, and trading activity',
      color: '#5856D6',
    },
    {
      icon: 'finger-print',
      title: 'Biometric Login',
      description: 'Use Face ID or Touch ID for secure and quick access',
      color: '#FF9500',
    },
  ];

  const safetyTips = [
    {
      title: 'Use a Strong Password',
      description: 'Create a unique password with at least 12 characters, including numbers and symbols.',
    },
    {
      title: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security by requiring a code from your phone to log in.',
    },
    {
      title: 'Beware of Phishing',
      description: 'We will never ask for your password via email or message. Always verify links.',
    },
    {
      title: 'Review Connected Apps',
      description: 'Regularly check which third-party apps have access to your account.',
    },
    {
      title: 'Monitor Your Activity',
      description: 'Check your login history regularly for any unauthorized access.',
    },
    {
      title: 'Secure Your Device',
      description: 'Keep your phone and apps updated to protect against vulnerabilities.',
    },
  ];

  const reportOptions = [
    { icon: 'flag-outline', title: 'Report Suspicious Activity', route: '/profile/report-problem' },
    { icon: 'person-remove-outline', title: 'Block a User', route: '/profile/blocked' },
    { icon: 'volume-mute-outline', title: 'Mute a User', route: '/profile/muted' },
    { icon: 'alert-circle-outline', title: 'Report Content', route: '/profile/report-problem' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Safety Center</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={48} color="#34C759" />
          </View>
          <Text style={styles.heroTitle}>Your Safety Matters</Text>
          <Text style={styles.heroSubtitle}>
            We're committed to keeping you and your investments safe
          </Text>
        </View>

        {/* Safety Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Features</Text>
          <View style={styles.featuresGrid}>
            {safetyFeatures.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: `${feature.color}15` }]}>
                  <Ionicons name={feature.icon as any} size={28} color={feature.color} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Safety Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          {safetyTips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Report & Block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report & Block</Text>
          {reportOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.reportRow}
              onPress={() => router.push(option.route as any)}
            >
              <View style={styles.reportLeft}>
                <Ionicons name={option.icon as any} size={24} color="#FF3B30" />
                <Text style={styles.reportText}>{option.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencySection}>
          <Ionicons name="call" size={24} color="#FF3B30" />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Need Immediate Help?</Text>
            <Text style={styles.emergencyText}>
              If you believe your account has been compromised, contact our security team immediately.
            </Text>
          </View>
          <TouchableOpacity style={styles.emergencyButton}>
            <Text style={styles.emergencyButtonText}>Contact Security</Text>
          </TouchableOpacity>
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
    backgroundColor: '#f0fff4',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportText: {
    fontSize: 16,
    color: '#000',
  },
  emergencySection: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  emergencyContent: {
    marginVertical: 12,
  },
  emergencyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
