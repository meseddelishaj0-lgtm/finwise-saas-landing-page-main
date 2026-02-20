// app/profile/terms.tsx
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

export default function Terms() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const sections = [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      content: `By downloading, accessing, or using WallStreetStocks ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.

These Terms constitute a legally binding agreement between you and WallStreetStocks, Inc. ("we," "us," or "our"). We reserve the right to modify these Terms at any time, and such modifications will be effective immediately upon posting.`,
    },
    {
      id: 'description',
      title: '2. Description of Service',
      content: `WallStreetStocks is a financial research and information platform that provides:

• Stock market data and analytics
• Financial news and insights
• Community discussion forums
• Educational resources
• Portfolio tracking tools
• AI-powered research assistance

IMPORTANT: WallStreetStocks is a RESEARCH AND INFORMATION PLATFORM ONLY. We do not offer brokerage services, execute trades, or provide access to securities markets. No trading or investment transactions can be made through our App.`,
    },
    {
      id: 'no-trading',
      title: '3. No Trading or Brokerage Services',
      content: `WallStreetStocks expressly does NOT provide:

• Securities brokerage services
• Trade execution capabilities
• Investment advisory services
• Portfolio management services
• Access to buy, sell, or trade any securities

All market data, stock information, and financial metrics displayed in the App are for RESEARCH AND INFORMATIONAL PURPOSES ONLY. Any investment decisions you make based on information from our App are made at your own risk and through your own separate brokerage accounts.

We are not a registered broker-dealer, investment adviser, or financial institution. We do not hold customer funds or securities.`,
    },
    {
      id: 'not-advice',
      title: '4. Not Financial Advice',
      content: `IMPORTANT DISCLAIMER: Nothing in this App constitutes financial, investment, legal, or tax advice.

All content provided through the App, including but not limited to stock data, analysis, news, community posts, and AI-generated insights, is for informational and educational purposes only. This information should not be construed as a recommendation to buy, sell, or hold any security.

You should always:
• Conduct your own research before making investment decisions
• Consult with qualified financial professionals
• Consider your personal financial situation and risk tolerance
• Understand that past performance does not guarantee future results

We make no representations about the suitability of any information for your particular circumstances.`,
    },
    {
      id: 'data-accuracy',
      title: '5. Data Accuracy and Limitations',
      content: `While we strive to provide accurate and timely information, we cannot guarantee:

• The accuracy, completeness, or timeliness of any data
• That market data reflects real-time prices
• That information is free from errors or omissions
• The reliability of third-party data sources

Market data may be delayed by 15 minutes or more unless otherwise indicated. Historical data may contain inaccuracies. AI-generated content may contain errors or hallucinations.

You acknowledge that financial markets are volatile and that data can change rapidly. Always verify critical information through official sources before making any decisions.`,
    },
    {
      id: 'user-accounts',
      title: '6. User Accounts',
      content: `To access certain features, you must create an account. You agree to:

• Provide accurate and complete registration information
• Maintain the security of your account credentials
• Accept responsibility for all activities under your account
• Notify us immediately of any unauthorized access
• Not share your account with others
• Not create multiple accounts

We reserve the right to suspend or terminate accounts that violate these Terms or our Community Guidelines.`,
    },
    {
      id: 'user-content',
      title: '7. User-Generated Content',
      content: `Our App allows users to post content in community forums. By posting content, you:

• Grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content
• Represent that you own or have rights to the content
• Agree not to post content that is illegal, harmful, or violates others' rights
• Understand that you are solely responsible for your content

We do not endorse user-generated content and are not responsible for its accuracy. User posts about stocks or investments are personal opinions, not professional advice.

We reserve the right to remove content that violates our policies without notice.`,
    },
    {
      id: 'prohibited',
      title: '8. Prohibited Activities',
      content: `You agree NOT to:

• Use the App for any illegal purpose
• Attempt to manipulate markets or coordinate trading activity
• Post false or misleading information about securities
• Share insider information or encourage insider trading
• Harass, threaten, or harm other users
• Scrape, crawl, or collect data without permission
• Reverse engineer or decompile the App
• Circumvent security measures
• Use automated systems or bots
• Impersonate others or misrepresent affiliations
• Violate any applicable laws or regulations

Violation of these prohibitions may result in immediate termination and potential legal action.`,
    },
    {
      id: 'intellectual-property',
      title: '9. Intellectual Property',
      content: `All content, features, and functionality of the App are owned by WallStreetStocks, Inc. and are protected by copyright, trademark, and other intellectual property laws.

You may not:
• Copy, modify, or distribute our content without permission
• Use our trademarks or branding without authorization
• Remove any copyright or proprietary notices

Third-party content and trademarks remain the property of their respective owners.`,
    },
    {
      id: 'subscriptions',
      title: '10. Subscriptions and Payments',
      content: `Some features require a paid subscription ("Premium"). By subscribing:

• You authorize recurring charges to your payment method
• Subscriptions auto-renew unless cancelled before the renewal date
• Refunds are handled according to Apple App Store or Google Play policies
• We may change pricing with 30 days notice
• Cancellation takes effect at the end of the current billing period

Free trials convert to paid subscriptions unless cancelled. Premium features are for personal, non-commercial use only.`,
    },
    {
      id: 'disclaimers',
      title: '11. Disclaimers',
      content: `THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.

WE DISCLAIM ALL WARRANTIES INCLUDING:
• MERCHANTABILITY
• FITNESS FOR A PARTICULAR PURPOSE
• NON-INFRINGEMENT
• ACCURACY OF INFORMATION
• UNINTERRUPTED SERVICE

WE DO NOT WARRANT THAT THE APP WILL MEET YOUR REQUIREMENTS OR THAT ANY ERRORS WILL BE CORRECTED.

INVESTMENT IN SECURITIES INVOLVES RISK. YOU MAY LOSE SOME OR ALL OF YOUR INVESTMENT. PAST PERFORMANCE IS NOT INDICATIVE OF FUTURE RESULTS.`,
    },
    {
      id: 'liability',
      title: '12. Limitation of Liability',
      content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, WALLSTREETSTOCKS SHALL NOT BE LIABLE FOR:

• Any indirect, incidental, special, consequential, or punitive damages
• Loss of profits, data, or goodwill
• Investment losses or trading decisions
• Actions taken based on information from the App
• Interruption of service or data loss
• Third-party content or actions

OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS, OR $100, WHICHEVER IS GREATER.

Some jurisdictions do not allow limitation of liability, so some limitations may not apply to you.`,
    },
    {
      id: 'indemnification',
      title: '13. Indemnification',
      content: `You agree to indemnify and hold harmless WallStreetStocks, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from:

• Your use of the App
• Your violation of these Terms
• Your violation of any third-party rights
• Your user-generated content
• Any investment decisions you make`,
    },
    {
      id: 'termination',
      title: '14. Termination',
      content: `We may terminate or suspend your access to the App at any time, with or without cause, with or without notice.

Upon termination:
• Your right to use the App ceases immediately
• We may delete your account and data
• Provisions that should survive termination will remain in effect

You may terminate your account at any time through the App settings.`,
    },
    {
      id: 'governing-law',
      title: '15. Governing Law and Disputes',
      content: `These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles.

Any disputes shall be resolved through binding arbitration in accordance with the American Arbitration Association rules. You waive your right to participate in class actions.

For claims under $10,000, disputes may be resolved through small claims court.

Arbitration shall take place in Delaware, or remotely if permitted.`,
    },
    {
      id: 'misc',
      title: '16. Miscellaneous',
      content: `• Entire Agreement: These Terms constitute the entire agreement between you and WallStreetStocks.

• Severability: If any provision is found unenforceable, the remaining provisions remain in effect.

• Waiver: Failure to enforce any right does not constitute a waiver.

• Assignment: You may not assign these Terms. We may assign our rights freely.

• Force Majeure: We are not liable for failures due to circumstances beyond our control.

• Contact: For questions about these Terms, contact wallstreetstocks@outlook.com`,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : '#f0f0f0' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.heroSection, { backgroundColor: isDark ? colors.surface : '#f8f9fa', borderBottomColor: isDark ? colors.border : '#e5e5e5' }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.card }]}>
            <Ionicons name="document-text" size={36} color="#007AFF" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Terms of Service</Text>
          <Text style={[styles.effectiveDate, { color: colors.textSecondary }]}>Effective Date: January 1, 2025</Text>
        </View>

        {/* Important Notice */}
        <View style={[styles.importantNotice, { backgroundColor: isDark ? '#2A1A00' : '#fff8e6', borderColor: isDark ? '#5A3A00' : '#ffe0a3' }]}>
          <Ionicons name="information-circle" size={24} color="#FF9500" />
          <View style={styles.noticeContent}>
            <Text style={[styles.noticeTitle, { color: isDark ? '#FFB84D' : '#996300' }]}>Research Platform Only</Text>
            <Text style={[styles.noticeText, { color: isDark ? '#FFB84D' : '#7a5000' }]}>
              WallStreetStocks is an information and research platform. We do not offer trading, 
              brokerage services, or financial advice. All data is for educational purposes only.
            </Text>
          </View>
        </View>

        {/* Table of Contents */}
        <View style={[styles.tocSection, { backgroundColor: isDark ? colors.surface : '#f5f5f5' }]}>
          <Text style={[styles.tocTitle, { color: colors.text }]}>Contents</Text>
          <View style={styles.tocList}>
            {sections.map((section, index) => (
              <TouchableOpacity key={section.id} style={styles.tocItem}>
                <Text style={styles.tocNumber}>{index + 1}.</Text>
                <Text style={[styles.tocText, { color: colors.textSecondary }]}>{section.title.replace(/^\d+\.\s/, '')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.id} style={[styles.section, { borderBottomColor: isDark ? colors.border : '#f0f0f0' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{section.content}</Text>
          </View>
        ))}

        {/* Agreement Box */}
        <View style={[styles.agreementBox, { backgroundColor: isDark ? '#0A2A10' : '#f0fff4', borderColor: isDark ? '#1A4A20' : '#d4edda' }]}>
          <Ionicons name="checkmark-circle" size={32} color="#34C759" />
          <Text style={[styles.agreementTitle, { color: colors.text }]}>Your Agreement</Text>
          <Text style={[styles.agreementText, { color: colors.textSecondary }]}>
            By using WallStreetStocks, you acknowledge that you have read, understood, 
            and agree to be bound by these Terms of Service.
          </Text>
        </View>

        {/* Contact */}
        <View style={[styles.contactSection, { borderTopColor: isDark ? colors.border : '#f0f0f0' }]}>
          <Text style={[styles.contactTitle, { color: colors.text }]}>Questions?</Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            If you have questions about these Terms, please contact us:
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
          <Text style={[styles.relatedTitle, { color: colors.text }]}>Related Documents</Text>
          <TouchableOpacity
            style={[styles.relatedLink, { borderBottomColor: isDark ? colors.border : '#e5e5e5' }]}
            onPress={() => router.push('/profile/privacy' as any)}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#007AFF" />
            <Text style={[styles.relatedLinkText, { color: colors.text }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.relatedLink, { borderBottomColor: isDark ? colors.border : '#e5e5e5' }]}
            onPress={() => router.push('/profile/community-guidelines' as any)}
          >
            <Ionicons name="people-outline" size={20} color="#007AFF" />
            <Text style={[styles.relatedLinkText, { color: colors.text }]}>Community Guidelines</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.relatedLink, { borderBottomColor: isDark ? colors.border : '#e5e5e5' }]}
            onPress={() => router.push('/profile/cookie-policy' as any)}
          >
            <Ionicons name="ellipse-outline" size={20} color="#007AFF" />
            <Text style={[styles.relatedLinkText, { color: colors.text }]}>Cookie Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.copyright, { color: colors.textTertiary }]}>
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
    backgroundColor: '#fff8e6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe0a3',
    gap: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#996300',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 14,
    color: '#7a5000',
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
    color: '#007AFF',
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
