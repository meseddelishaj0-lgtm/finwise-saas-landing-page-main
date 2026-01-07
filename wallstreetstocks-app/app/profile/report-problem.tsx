// app/profile/report-problem.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import Constants from 'expo-constants';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://finwise-saas-landing-page-main.vercel.app';

export default function ReportProblem() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Categories matching the API expectations
  const categories = [
    { id: 'app_crash', icon: 'bug', label: 'App Crash', color: '#FF3B30' },
    { id: 'ui_issue', icon: 'phone-portrait', label: 'UI Issue', color: '#FF9500' },
    { id: 'slow_laggy', icon: 'speedometer', label: 'Slow / Laggy', color: '#FFCC00' },
    { id: 'data_error', icon: 'cloud-offline', label: 'Data Error', color: '#007AFF' },
    { id: 'login_issue', icon: 'log-in', label: 'Login Issue', color: '#AF52DE' },
    { id: 'other', icon: 'ellipsis-horizontal', label: 'Other', color: '#8E8E93' },
  ];

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Select Category', 'Please select a problem category.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Add Description', 'Please describe the issue you\'re experiencing.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Collect device info
      const deviceInfo = {
        platform: Platform.OS,
        osVersion: Platform.Version,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android Device',
      };

      const response = await fetch(`${API_BASE_URL}/api/bug-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || null,
          category: selectedCategory,
          description: description.trim(),
          contactEmail: email.trim() || user?.email || null,
          deviceInfo,
          appVersion: Constants.expoConfig?.version || '1.0.0',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          'Report Submitted',
          data.message || 'Thank you for your feedback! Our team will review your report.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Bug report submission error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Report a Problem</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's the issue?</Text>
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === category.id && styles.categorySelected,
                    selectedCategory === category.id && { borderColor: category.color },
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
                    <Ionicons name={category.icon as any} size={24} color={category.color} />
                  </View>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  {selectedCategory === category.id && (
                    <View style={[styles.checkmark, { backgroundColor: category.color }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Describe the problem</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Please provide as much detail as possible. What were you trying to do? What happened instead?"
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
            <Text style={styles.charCount}>{description.length}/1000</Text>
          </View>

          {/* Contact Email */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact email (optional)</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="your@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <Text style={styles.emailHint}>
              Provide your email if you'd like us to follow up on your report.
            </Text>
          </View>

          {/* Device Info */}
          <View style={styles.deviceInfoSection}>
            <Text style={styles.deviceInfoTitle}>Device Information</Text>
            <Text style={styles.deviceInfoText}>
              The following information will be included to help us diagnose the issue:
            </Text>
            <View style={styles.deviceInfoList}>
              <Text style={styles.deviceInfoItem}>• App version: 1.0.0</Text>
              <Text style={styles.deviceInfoItem}>• Device: {Platform.OS === 'ios' ? 'iPhone' : 'Android'}</Text>
              <Text style={styles.deviceInfoItem}>• OS version: {Platform.Version}</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  submitText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: { flex: 1 },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '31%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categorySelected: {
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textArea: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 150,
    color: '#000',
  },
  charCount: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 13,
    color: '#999',
  },
  screenshotOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  screenshotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  screenshotTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  screenshotSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e5e5',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#34C759',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  emailInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#000',
  },
  emailHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#999',
  },
  deviceInfoSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  deviceInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  deviceInfoText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  deviceInfoList: {
    gap: 4,
  },
  deviceInfoItem: {
    fontSize: 13,
    color: '#888',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#A0C4FF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
