// app/profile/cookie-policy.tsx
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

export default function CookiePolicy() {
  const router = useRouter();

  const cookieTypes = [
    {
      title: 'Essential Cookies',
      description: 'Required for the app to function properly. These cannot be disabled.',
      examples: ['Authentication tokens', 'Security cookies', 'Session management'],
      required: true,
    },
    {
      title: 'Functional Cookies',
      description: 'Help remember your preferences and personalize your experience.',
      examples: ['Language preferences', 'Theme settings', 'Watchlist data'],
      required: false,
    },
    {
      title: 'Analytics Cookies',
      description: 'Help us understand how you use the app so we can improve it.',
      examples: ['Usage patterns', 'Feature engagement', 'Performance metrics'],
      required: false,
    },
    {
      title: 'Marketing Cookies',
      description: 'Used to deliver relevant advertisements and track campaign effectiveness.',
      examples: ['Ad preferences', 'Campaign tracking', 'Conversion data'],
      required: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Cookie Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>
          
          <Text style={styles.paragraph}>
            This Cookie Policy explains how WallStreetStocks ("we", "us", or "our") uses cookies 
            and similar tracking technologies when you use our mobile application and services.
          </Text>
        </View>

        {/* What Are Cookies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Are Cookies?</Text>
          <Text style={styles.paragraph}>
            Cookies are small text files that are stored on your device when you use our app. 
            They help us provide you with a better experience by remembering your preferences, 
            keeping you logged in, and understanding how you use our services.
          </Text>
          <Text style={styles.paragraph}>
            In mobile apps, we use similar technologies such as device identifiers, local storage, 
            and SDKs that function similarly to cookies on websites.
          </Text>
        </View>

        {/* Types of Cookies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Types of Cookies We Use</Text>
          
          {cookieTypes.map((cookie, index) => (
            <View key={index} style={styles.cookieCard}>
              <View style={styles.cookieHeader}>
                <Text style={styles.cookieTitle}>{cookie.title}</Text>
                {cookie.required && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>Required</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cookieDescription}>{cookie.description}</Text>
              <View style={styles.examplesList}>
                <Text style={styles.examplesTitle}>Examples:</Text>
                {cookie.examples.map((example, i) => (
                  <Text key={i} style={styles.exampleItem}>• {example}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* How We Use Cookies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Cookies</Text>
          
          <View style={styles.useCase}>
            <Ionicons name="person-outline" size={24} color="#007AFF" />
            <View style={styles.useCaseContent}>
              <Text style={styles.useCaseTitle}>Authentication</Text>
              <Text style={styles.useCaseText}>Keep you logged in securely across sessions</Text>
            </View>
          </View>
          
          <View style={styles.useCase}>
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
            <View style={styles.useCaseContent}>
              <Text style={styles.useCaseTitle}>Preferences</Text>
              <Text style={styles.useCaseText}>Remember your settings and customizations</Text>
            </View>
          </View>
          
          <View style={styles.useCase}>
            <Ionicons name="analytics-outline" size={24} color="#007AFF" />
            <View style={styles.useCaseContent}>
              <Text style={styles.useCaseTitle}>Analytics</Text>
              <Text style={styles.useCaseText}>Understand usage patterns to improve the app</Text>
            </View>
          </View>
          
          <View style={styles.useCase}>
            <Ionicons name="shield-outline" size={24} color="#007AFF" />
            <View style={styles.useCaseContent}>
              <Text style={styles.useCaseTitle}>Security</Text>
              <Text style={styles.useCaseText}>Detect and prevent fraudulent activity</Text>
            </View>
          </View>
        </View>

        {/* Third-Party Cookies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.paragraph}>
            We work with trusted third-party partners who may also set cookies or use similar 
            technologies when you use our app. These include:
          </Text>
          <View style={styles.thirdPartyList}>
            <Text style={styles.thirdPartyItem}>• Analytics providers (e.g., Firebase, Mixpanel)</Text>
            <Text style={styles.thirdPartyItem}>• Advertising networks</Text>
            <Text style={styles.thirdPartyItem}>• Payment processors</Text>
            <Text style={styles.thirdPartyItem}>• Customer support tools</Text>
          </View>
        </View>

        {/* Managing Cookies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Managing Your Preferences</Text>
          <Text style={styles.paragraph}>
            You can manage your cookie preferences at any time through the app settings. 
            Note that disabling certain cookies may affect the functionality of the app.
          </Text>
          
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => router.push('/profile/privacy' as any)}
          >
            <Ionicons name="options-outline" size={20} color="#fff" />
            <Text style={styles.manageButtonText}>Manage Privacy Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions?</Text>
          <Text style={styles.paragraph}>
            If you have any questions about our use of cookies or this policy, please contact us at:
          </Text>
          <Text style={styles.contactEmail}>privacy@wallstreetstocks.com</Text>
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
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000',
  },
  paragraph: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    marginBottom: 12,
  },
  cookieCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cookieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cookieTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  requiredBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requiredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cookieDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  examplesList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  examplesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  exampleItem: {
    fontSize: 13,
    color: '#888',
    marginLeft: 8,
    marginBottom: 2,
  },
  useCase: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 14,
  },
  useCaseContent: {
    flex: 1,
  },
  useCaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  useCaseText: {
    fontSize: 14,
    color: '#666',
  },
  thirdPartyList: {
    marginTop: 8,
  },
  thirdPartyItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactEmail: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
