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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ReportProblem() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(false);

  const categories = [
    { id: 'bug', icon: 'bug', label: 'App Bug or Crash', color: '#FF3B30' },
    { id: 'data', icon: 'cloud-offline', label: 'Data Not Loading', color: '#FF9500' },
    { id: 'account', icon: 'person', label: 'Account Issue', color: '#007AFF' },
    { id: 'payment', icon: 'card', label: 'Payment Problem', color: '#34C759' },
    { id: 'content', icon: 'flag', label: 'Report Content', color: '#AF52DE' },
    { id: 'feature', icon: 'bulb', label: 'Feature Request', color: '#5856D6' },
    { id: 'other', icon: 'ellipsis-horizontal', label: 'Other', color: '#8E8E93' },
  ];

  const handleSubmit = () => {
    if (!selectedCategory) {
      Alert.alert('Select Category', 'Please select a problem category.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Add Description', 'Please describe the issue you\'re experiencing.');
      return;
    }

    // Here you would typically send to your API
    Alert.alert(
      'Report Submitted',
      'Thank you for your feedback! Our team will review your report and get back to you if needed.',
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
        <Text style={styles.title}>Report a Problem</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={styles.submitText}>Submit</Text>
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

          {/* Screenshot Option */}
          <TouchableOpacity
            style={styles.screenshotOption}
            onPress={() => setIncludeScreenshot(!includeScreenshot)}
          >
            <View style={styles.screenshotLeft}>
              <Ionicons name="camera" size={24} color="#007AFF" />
              <View>
                <Text style={styles.screenshotTitle}>Include Screenshot</Text>
                <Text style={styles.screenshotSubtitle}>Attach a screenshot to help us understand</Text>
              </View>
            </View>
            <View style={[styles.toggle, includeScreenshot && styles.toggleActive]}>
              <View style={[styles.toggleKnob, includeScreenshot && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>

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
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit Report</Text>
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
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
