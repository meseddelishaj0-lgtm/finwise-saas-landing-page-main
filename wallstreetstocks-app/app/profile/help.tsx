// app/profile/help.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Help() {
  const router = useRouter();

  const helpItems = [
    { 
      title: 'Help Center', 
      icon: 'help-circle-outline', 
      route: '/profile/help-center',
      subtitle: 'Browse FAQs and guides'
    },
    { 
      title: 'Safety Center', 
      icon: 'shield-checkmark-outline', 
      route: '/profile/safety-center',
      subtitle: 'Account security & privacy'
    },
    { 
      title: 'Community Guidelines', 
      icon: 'document-text-outline', 
      route: '/profile/community-guidelines',
      subtitle: 'Rules and best practices'
    },
    { 
      title: 'Terms of Service', 
      icon: 'newspaper-outline', 
      route: '/profile/terms',
      subtitle: 'Legal terms and conditions'
    },
    { 
      title: 'Privacy Policy', 
      icon: 'lock-closed-outline', 
      route: '/profile/privacy',
      subtitle: 'How we handle your data'
    },
    { 
      title: 'Cookie Policy', 
      icon: 'ellipse-outline', 
      route: '/profile/cookie-policy',
      subtitle: 'About cookies and tracking'
    },
    { 
      title: 'About Premium', 
      icon: 'diamond-outline', 
      route: '/profile/about-premium',
      subtitle: 'Premium features and pricing'
    },
    { 
      title: 'Report a Problem', 
      icon: 'alert-circle-outline', 
      route: '/profile/report-problem',
      subtitle: 'Report bugs or issues'
    },
    { 
      title: 'Contact Us', 
      icon: 'mail-outline', 
      route: '/profile/contact-us',
      subtitle: 'Get in touch with support'
    },
  ];

  const quickActions = [
    { icon: 'chatbubble-ellipses', label: 'Live Chat', color: '#34C759', isX: false },
    { icon: 'call', label: 'Call Us', color: '#007AFF', isX: false },
    { icon: 'logo-twitter', label: 'X', color: '#000000', isX: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Help</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.quickActionsTitle}>Need immediate help?</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionButton}
                onPress={() => {
                  if (action.isX) {
                    Linking.openURL('https://x.com/wallstreet66666');
                  } else if (action.label === 'Live Chat') {
                    router.push('/profile/live-chat' as any);
                  } else {
                    router.push('/profile/contact' as any);
                  }
                }}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                  {action.isX ? (
                    <Text style={styles.xLogo}>𝕏</Text>
                  ) : (
                    <Ionicons name={action.icon as any} size={22} color={action.color} />
                  )}
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Main Help Items */}
        <Text style={styles.sectionTitle}>Support & Resources</Text>

        {helpItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.row}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon as any} size={22} color="#007AFF" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowText}>{item.title}</Text>
                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}

        {/* App Info Footer */}
        <View style={styles.footer}>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>WallStreetStocks</Text>
            <Text style={styles.version}>Version 1.0.0 (Build 100)</Text>
          </View>
          <Text style={styles.copyright}>© 2025 WallStreetStocks. All rights reserved.</Text>
          
          <View style={styles.socialLinks}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://x.com/wallstreet66666')}
            >
              <Text style={styles.xLogoSmall}>𝕏</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Linking.openURL('https://instagram.com/wallstreetstocks')}
            >
              <Ionicons name="logo-instagram" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
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
  quickActionsContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  quickActionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 14,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 20,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  version: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  copyright: {
    fontSize: 12,
    color: '#bbb',
    marginBottom: 16,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xLogo: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  xLogoSmall: {
    fontSize: 18,
    fontWeight: '900',
    color: '#666',
  },
});
