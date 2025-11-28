// app/profile/about.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function About() {
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Logo / App Name */}
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🚀</Text>
            <Text style={styles.appName}>Wallstreetstocks</Text>
            <Text style={styles.tagline}>Connect, Share, Inspire</Text>
          </View>

          {/* Version */}
          <View style={styles.versionBox}>
            <Text style={styles.versionLabel}>Version</Text>
            <Text style={styles.versionNumber}>1.0.0</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            Welcome to Wallstreetstocks — the next-generation social platform built for real connections, 
            authentic expression, and meaningful conversations.
          </Text>

          <Text style={styles.description}>
            We believe in a world where everyone has a voice, privacy is respected, and communities thrive. 
            Our mission is to bring people closer together through technology that puts you first.
          </Text>

          {/* Features */}
          <Text style={styles.sectionTitle}>What We Offer</Text>
          <View style={styles.featureList}>
            {[
              'Real-time global conversations',
              'Advanced privacy controls',
              'Customizable experience',
              'No ads in your timeline',
              'End-to-end encrypted DMs',
              'Open and transparent platform',
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Team / Credit */}
          <Text style={styles.sectionTitle}>Made With ❤️ By</Text>
          <Text style={styles.madeBy}>
            An independent developer passionate about building better social experiences.
          </Text>

          {/* Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL('https://twitter.com/wallstreet66666')}
            >
              <Ionicons name="logo-twitter" size={20} color="#1D9BF0" />
              <Text style={styles.linkText}>Follow us on X</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL('https://tiktok.com/wallstreetstocks1')}
            >
              <Ionicons name="logo-tiktok" size={20} color="#000" />
              <Text style={styles.linkText}>TikTok</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Linking.openURL('mailto:wallstreetstocks@outlook.com')}
            >
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.linkText}>wallstreetstocks@outlook.com</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.copyright}>
              © {currentYear} Wallstreetstocks. All rights reserved.
            </Text>
            <Text style={styles.finalLine}>
              Thank you for being part of our journey 🌟
            </Text>
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
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  content: { padding: 20, alignItems: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logo: { fontSize: 80, marginBottom: 16 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  tagline: { fontSize: 16, color: '#666', marginTop: 8 },
  versionBox: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 30,
  },
  versionLabel: { fontSize: 14, color: '#999', textAlign: 'center' },
  versionNumber: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  description: {
    fontSize: 16,
    lineHeight: 26,
    color: '#444',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 32,
    marginBottom: 16,
  },
  featureList: { width: '100%' },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkmark: { fontSize: 20, color: '#1D9BF0', marginRight: 12 },
  featureText: { fontSize: 16, color: '#333' },
  madeBy: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 30,
  },
  linksContainer: { width: '100%', marginTop: 20 },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
  },
  linkText: { marginLeft: 12, fontSize: 16, color: '#000' },
  footer: { marginTop: 50, alignItems: 'center' },
  copyright: { fontSize: 14, color: '#aaa', marginBottom: 8 },
  finalLine: { fontSize: 16, color: '#666', fontStyle: 'italic' },
});
