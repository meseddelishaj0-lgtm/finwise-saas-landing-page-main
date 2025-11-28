// src/screens/profile/privacy.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Shield, ExternalLink, ChevronLeft } from 'lucide-react-native';

export default function PrivacyScreen({ navigation }: any) {
  const openPrivacyPolicy = () => {
    Linking.openURL('https://wallstreetstocks.com/privacy-policy');
  };

  const openTerms = () => {
    Linking.openURL('https://wallstreetstocks.com/terms');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ChevronLeft
          size={28}
          color="#000"
          onPress={() => navigation.goBack()}
          style={styles.backIcon}
        />
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 28 }} /> {/* Spacer for centering title */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <View style={styles.shieldCircle}>
            <Shield size={42} color="#007AFF" />
          </View>
        </View>

        <Text style={styles.title}>Your Privacy Matters</Text>

        <Text style={styles.description}>
          At WallStreetStocks, we take your privacy seriously. We collect only the
          data necessary to provide you with the best trading community experience
          and never sell your personal information to third parties.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Collect</Text>
          <Text style={styles.sectionText}>
            • Account information (username, email){'\n'}
            • Public trading ideas and messages you post{'\n'}
            • Device and usage data to improve the app{'\n'}
            • Optional: profile picture and bio
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use It</Text>
          <Text style={styles.sectionText}>
            • To operate and improve the platform{'\n'}
            • Show you relevant stocks and conversations{'\n'}
            • Send important notifications{'\n'}
            • Prevent fraud and enforce our House Rules
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Control</Text>
          <Text style={styles.sectionText}>
            You can delete your account at any time from Settings. All your data
            will be permanently removed within 30 days.
          </Text>
        </View>

        <Text style={styles.footerText}>
          Last updated: November 17, 2025
        </Text>

        <View style={styles.linksContainer}>
          <Text style={styles.linkText} onPress={openPrivacyPolicy}>
            View Full Privacy Policy <ExternalLink size={16} color="#007AFF" />
          </Text>
          <Text style={styles.linkText} onPress={openTerms}>
            Terms & Conditions <ExternalLink size={16} color="#007AFF" />
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shieldCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  linksContainer: {
    gap: 16,
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


