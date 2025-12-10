// app/profile/help-center.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HelpCenter() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');

  const categories = [
    {
      title: 'Getting Started',
      icon: 'rocket-outline',
      items: ['Create an account', 'Set up your profile', 'Link your brokerage', 'Navigate the app'],
    },
    {
      title: 'Trading & Orders',
      icon: 'trending-up-outline',
      items: ['How to place a trade', 'Order types explained', 'Cancel or modify orders', 'Trading hours'],
    },
    {
      title: 'Portfolio & Positions',
      icon: 'briefcase-outline',
      items: ['View your portfolio', 'Track performance', 'Understand gains/losses', 'Export statements'],
    },
    {
      title: 'Account & Security',
      icon: 'shield-outline',
      items: ['Change password', 'Enable 2FA', 'Manage notifications', 'Delete account'],
    },
    {
      title: 'Billing & Subscriptions',
      icon: 'card-outline',
      items: ['Manage subscription', 'Payment methods', 'Refund policy', 'Premium features'],
    },
    {
      title: 'Troubleshooting',
      icon: 'build-outline',
      items: ['App not loading', 'Data sync issues', 'Login problems', 'Report a bug'],
    },
  ];

  const popularArticles = [
    'How do I reset my password?',
    'What are the trading fees?',
    'How to enable push notifications',
    'Understanding market orders vs limit orders',
    'How to contact support',
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Popular Articles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Articles</Text>
          {popularArticles.map((article, index) => (
            <TouchableOpacity key={index} style={styles.articleRow}>
              <Ionicons name="document-text-outline" size={20} color="#007AFF" />
              <Text style={styles.articleText}>{article}</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          {categories.map((category, index) => (
            <View key={index} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIconContainer}>
                  <Ionicons name={category.icon as any} size={24} color="#007AFF" />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </View>
              <View style={styles.categoryItems}>
                {category.items.map((item, itemIndex) => (
                  <TouchableOpacity key={itemIndex} style={styles.categoryItem}>
                    <Text style={styles.categoryItemText}>• {item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Contact Support */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactSubtitle}>Our support team is here for you</Text>
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000',
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    gap: 12,
  },
  articleText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  categoryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  categoryItems: {
    marginLeft: 52,
  },
  categoryItem: {
    paddingVertical: 6,
  },
  categoryItemText: {
    fontSize: 15,
    color: '#666',
  },
  contactSection: {
    alignItems: 'center',
    padding: 24,
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
