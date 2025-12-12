// app/profile/privacy.tsx
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

export default function Privacy() {
  const router = useRouter();

  const sections = [
    {
      id: 'introduction',
      title: '1. Introduction',
      content: `WallStreetStocks.ai ("Company," "we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile applications, and services (collectively, the "Services").

Please read this Privacy Policy carefully. By using our Services, you consent to the practices described in this policy.`,
    },
    {
      id: 'information-collected',
      title: '2. Information We Collect',
      content: `We collect information you voluntarily provide:

• Account Information: Name, email address, username, password, and profile picture
• Profile Information: Bio, location, website, and other optional profile details
• Payment Information: Credit card details, billing address (processed securely through third-party payment processors)
• Communication Data: Messages, feedback, support requests, and community posts
• Portfolio Data: Stock symbols, watchlists, and investment preferences you choose to track

We also automatically collect:

• Device Information: Device type, operating system, unique device identifiers, browser type
• Usage Data: Pages visited, features used, time spent, click patterns, search queries
• Location Data: General geographic location based on IP address
• Log Data: IP address, access times, referring URLs, error logs`,
    },
    {
      id: 'how-we-use',
      title: '3. How We Use Your Information',
      content: `We use your information to:

• Provide, maintain, and improve our Services
• Create and manage your account
• Process payments and subscriptions
• Personalize your experience and deliver relevant content
• Send transactional emails (account verification, password resets, subscription updates)
• Send marketing communications (with your consent)
• Respond to customer support inquiries
• Monitor and analyze usage patterns and trends
• Detect, prevent, and address technical issues and security threats
• Comply with legal obligations
• Enforce our Terms and Conditions`,
    },
    {
      id: 'information-sharing',
      title: '4. How We Share Your Information',
      content: `We may share your information with:

Service Providers: Trusted third-party vendors who assist us in operating our Services (e.g., payment processors, cloud hosting, analytics providers, email services).

Legal Requirements: We may disclose information if required by law, court order, or government request, or to protect our rights, privacy, safety, or property.

Business Transfers: In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.

IMPORTANT: We do NOT sell your personal information. WallStreetStocks.ai does not sell, rent, or trade your personal information to third parties for their marketing purposes.`,
    },
    {
      id: 'data-security',
      title: '5. Data Security',
      content: `We implement industry-standard security measures to protect your information, including:

• Encryption of data in transit using SSL/TLS protocols
• Encryption of sensitive data at rest
• Secure authentication mechanisms
• Regular security assessments and monitoring
• Access controls limiting employee access to personal data

However, no method of transmission or storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.`,
    },
    {
      id: 'data-retention',
      title: '6. Data Retention',
      content: `We retain your personal information for as long as necessary to provide our Services, comply with legal obligations, resolve disputes, and enforce our agreements.

When you delete your account, we will delete or anonymize your personal information within 90 days, except where retention is required by law.`,
    },
    {
      id: 'your-rights',
      title: '7. Your Rights and Choices',
      content: `Depending on your location, you may have the following rights:

• Access: Request a copy of the personal information we hold about you
• Correction: Request correction of inaccurate or incomplete information
• Deletion: Request deletion of your personal information
• Portability: Request a portable copy of your data
• Opt-Out: Opt out of marketing communications at any time
• Restriction: Request restriction of processing in certain circumstances
• Objection: Object to processing based on legitimate interests

To exercise these rights, contact us at wallstreetstocks@outlook.com. We will respond to your request within 30 days.`,
    },
    {
      id: 'california-rights',
      title: '8. California Privacy Rights (CCPA)',
      content: `If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):

• Right to know what personal information is collected, used, shared, or sold
• Right to delete personal information (with certain exceptions)
• Right to opt-out of the sale of personal information (we do not sell your data)
• Right to non-discrimination for exercising your privacy rights

To submit a CCPA request, email us at wallstreetstocks@outlook.com with "CCPA Request" in the subject line.`,
    },
    {
      id: 'children',
      title: '9. Children\'s Privacy',
      content: `Our Services are not intended for children under 18 years of age. We do not knowingly collect personal information from children. If we learn that we have collected information from a child under 18, we will delete that information promptly. If you believe we have collected information from a child, please contact us immediately.`,
    },
    {
      id: 'changes',
      title: '10. Changes to This Privacy Policy',
      content: `We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our website and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically. Your continued use of our Services after changes constitutes acceptance of the updated policy.`,
    },
    {
      id: 'contact',
      title: '11. Contact Us',
      content: `If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

WallStreetStocks.ai
Email: wallstreetstocks@outlook.com

For privacy-related inquiries, please include "Privacy Inquiry" in your email subject line.`,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={36} color="#34C759" />
          </View>
          <Text style={styles.heroTitle}>Your Privacy Matters</Text>
          <Text style={styles.effectiveDate}>Last Updated: January 1, 2025</Text>
        </View>

        {/* Important Notice */}
        <View style={styles.importantNotice}>
          <Ionicons name="lock-closed" size={24} color="#34C759" />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>We Don't Sell Your Data</Text>
            <Text style={styles.noticeText}>
              WallStreetStocks.ai does not sell, rent, or trade your personal information
              to third parties for their marketing purposes.
            </Text>
          </View>
        </View>

        {/* Table of Contents */}
        <View style={styles.tocSection}>
          <Text style={styles.tocTitle}>Contents</Text>
          <View style={styles.tocList}>
            {sections.map((section, index) => (
              <TouchableOpacity key={section.id} style={styles.tocItem}>
                <Text style={styles.tocNumber}>{index + 1}.</Text>
                <Text style={styles.tocText}>{section.title.replace(/^\d+\.\s/, '')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        {/* Agreement Box */}
        <View style={styles.agreementBox}>
          <Ionicons name="checkmark-circle" size={32} color="#34C759" />
          <Text style={styles.agreementTitle}>Your Privacy is Protected</Text>
          <Text style={styles.agreementText}>
            By using WallStreetStocks, you acknowledge that you have read and understood
            this Privacy Policy and agree to the collection and use of information in
            accordance with this policy.
          </Text>
        </View>

        {/* Contact */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Questions?</Text>
          <Text style={styles.contactText}>
            If you have questions about this Privacy Policy, please contact us:
          </Text>
          <Text style={styles.contactEmail}>wallstreetstocks@outlook.com</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => router.push('/profile/contact-us' as any)}
          >
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Related Links */}
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>Related Documents</Text>
          <TouchableOpacity
            style={styles.relatedLink}
            onPress={() => router.push('/profile/terms' as any)}
          >
            <Ionicons name="document-text-outline" size={20} color="#007AFF" />
            <Text style={styles.relatedLinkText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.relatedLink}
            onPress={() => router.push('/profile/house-rules' as any)}
          >
            <Ionicons name="shield-outline" size={20} color="#007AFF" />
            <Text style={styles.relatedLinkText}>House Rules</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        <Text style={styles.copyright}>
          © 2025 WallStreetStocks, Inc. All rights reserved.
        </Text>

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
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  effectiveDate: {
    fontSize: 14,
    color: '#666',
  },
  importantNotice: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: '#f0fff4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d4edda',
    gap: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#155724',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
  tocSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  tocTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  tocList: {
    gap: 8,
  },
  tocItem: {
    flexDirection: 'row',
    gap: 8,
  },
  tocNumber: {
    fontSize: 13,
    color: '#34C759',
    width: 20,
  },
  tocText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
  },
  agreementBox: {
    margin: 20,
    padding: 24,
    backgroundColor: '#f0fff4',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d4edda',
  },
  agreementTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
  },
  agreementText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  contactSection: {
    alignItems: 'center',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 16,
  },
  contactButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  contactButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  relatedSection: {
    padding: 20,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  relatedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    gap: 12,
  },
  relatedLinkText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  copyright: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
    paddingVertical: 20,
  },
});
