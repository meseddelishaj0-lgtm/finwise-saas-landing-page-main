// app/profile/contact-us.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function ContactUs() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const contactMethods = [
    {
      icon: 'mail',
      title: 'Email Us',
      subtitle: 'wallstreetstocks@outlook.com',
      action: () => Linking.openURL('mailto:wallstreetstocks@outlook.com'),
      color: '#007AFF',
    },
    {
      icon: 'chatbubbles',
      title: 'Live Chat',
      subtitle: 'Available 9am - 6pm EST',
      action: () => router.push('/profile/live-chat' as any),
      color: '#34C759',
    },
    {
      icon: 'call',
      title: 'Call Us',
      subtitle: '+216 548 3378',
      action: () => Linking.openURL('tel:+2165483378'),
      color: '#FF9500',
    },
    {
      icon: 'logo-twitter',
      title: 'Twitter / X',
      subtitle: '@WallStreetStocks',
      action: () => Linking.openURL('https://twitter.com/WallStreetStocks'),
      color: '#1DA1F2',
    },
  ];

  const faqs = [
    { question: 'How do I reset my password?', route: '/profile/help-center' },
    { question: 'How do I cancel my subscription?', route: '/profile/help-center' },
    { question: 'Why is my data not syncing?', route: '/profile/help-center' },
    { question: 'How do I enable notifications?', route: '/profile/help-center' },
  ];

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    Alert.alert(
      'Message Sent',
      'Thank you for reaching out! We\'ll get back to you within 24-48 hours.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

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
        <Text style={[styles.title, { color: colors.text }]}>Contact Us</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.heroSection, { backgroundColor: isDark ? colors.surface : '#f0f8ff' }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.card }]}>
            <Ionicons name="headset" size={40} color="#007AFF" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>We&apos;re Here to Help</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Our support team is available to assist you with any questions or concerns
          </Text>
        </View>

        {/* Contact Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Get in Touch</Text>
          <View style={styles.contactGrid}>
            {contactMethods.map((method, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.contactCard, { backgroundColor: colors.card }]}
                onPress={method.action}
              >
                <View style={[styles.contactIcon, { backgroundColor: `${method.color}15` }]}>
                  <Ionicons name={method.icon as any} size={24} color={method.color} />
                </View>
                <Text style={[styles.contactTitle, { color: colors.text }]}>{method.title}</Text>
                <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>{method.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick FAQs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Answers</Text>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.faqRow, { borderBottomColor: isDark ? colors.border : '#e5e5e5' }]}
              onPress={() => router.push(faq.route as any)}
            >
              <Ionicons name="help-circle-outline" size={22} color="#007AFF" />
              <Text style={[styles.faqText, { color: colors.text }]}>{faq.question}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/profile/help-center' as any)}
          >
            <Text style={styles.viewAllText}>View All FAQs</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Send us a Message</Text>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#e5e5e5', color: colors.text }]}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Email *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#e5e5e5', color: colors.text }]}
              placeholder="your@email.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Subject</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#e5e5e5', color: colors.text }]}
              placeholder="What's this about?"
              placeholderTextColor={colors.textTertiary}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#e5e5e5', color: colors.text }]}
              placeholder="How can we help you?"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Ionicons name="send" size={18} color="#fff" />
            <Text style={styles.submitButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Response Time */}
        <View style={styles.responseSection}>
          <Ionicons name="time-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.responseText, { color: colors.textSecondary }]}>
            Average response time: <Text style={styles.responseHighlight}>Under 24 hours</Text>
          </Text>
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
  heroSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f0f8ff',
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000',
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    gap: 10,
  },
  faqText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  responseSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#666',
  },
  responseHighlight: {
    fontWeight: '600',
    color: '#34C759',
  },
});
