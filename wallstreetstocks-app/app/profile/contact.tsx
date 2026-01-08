// app/profile/contact-us.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ContactUs() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Contact Us</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="headset" size={40} color="#007AFF" />
          </View>
          <Text style={styles.heroTitle}>We&apos;re Here to Help</Text>
          <Text style={styles.heroSubtitle}>
            Our support team is available to assist you with any questions or concerns
          </Text>
        </View>

        {/* Contact Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <View style={styles.contactGrid}>
            {contactMethods.map((method, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactCard}
                onPress={method.action}
              >
                <View style={[styles.contactIcon, { backgroundColor: `${method.color}15` }]}>
                  <Ionicons name={method.icon as any} size={24} color={method.color} />
                </View>
                <Text style={styles.contactTitle}>{method.title}</Text>
                <Text style={styles.contactSubtitle}>{method.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Answers</Text>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqRow}
              onPress={() => router.push(faq.route as any)}
            >
              <Ionicons name="help-circle-outline" size={22} color="#007AFF" />
              <Text style={styles.faqText}>{faq.question}</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
          <Text style={styles.sectionTitle}>Send us a Message</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="What's this about?"
              placeholderTextColor="#999"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="How can we help you?"
              placeholderTextColor="#999"
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
          <Ionicons name="time-outline" size={24} color="#666" />
          <Text style={styles.responseText}>
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
