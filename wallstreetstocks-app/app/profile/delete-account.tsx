// app/profile/delete-account.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://finwise-saas-landing-page-main.vercel.app';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE to confirm account deletion.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This action cannot be undone. All your data, watchlists, and preferences will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Call API to delete account
              const response = await fetch(`${API_BASE_URL}/api/user/delete`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: user?.id }),
              });

              // Clear all local data regardless of API response
              await AsyncStorage.multiRemove([
                'personalInfo',
                'watchlist',
                'portfolioData',
                'userPreferences',
              ]);

              // Logout user
              await logout();

              Alert.alert(
                'Account Deleted',
                'Your account has been permanently deleted.',
                [{ text: 'OK', onPress: () => router.replace('/login') }]
              );
            } catch (error) {
              
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Delete Account</Text>
        </View>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Warning Icon */}
        <View style={styles.warningIconContainer}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning" size={48} color="#FF3B30" />
          </View>
        </View>

        {/* Warning Title */}
        <Text style={styles.warningTitle}>Delete Your Account?</Text>
        <Text style={styles.warningSubtitle}>
          This action is permanent and cannot be undone.
        </Text>

        {/* Consequences List */}
        <View style={styles.consequencesList}>
          <Text style={styles.consequencesTitle}>What happens when you delete your account:</Text>

          <View style={styles.consequenceItem}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.consequenceText}>All your personal data will be permanently deleted</Text>
          </View>

          <View style={styles.consequenceItem}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.consequenceText}>Your watchlists and saved stocks will be removed</Text>
          </View>

          <View style={styles.consequenceItem}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.consequenceText}>Your community posts and comments will be deleted</Text>
          </View>

          <View style={styles.consequenceItem}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.consequenceText}>Your referral history and rewards will be lost</Text>
          </View>

          <View style={styles.consequenceItem}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.consequenceText}>You will not be able to recover this account</Text>
          </View>
        </View>

        {/* Confirmation Input */}
        <View style={styles.confirmSection}>
          <Text style={styles.confirmLabel}>
            Type <Text style={styles.deleteWord}>DELETE</Text> to confirm:
          </Text>
          <TextInput
            style={styles.confirmInput}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE here"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={[
            styles.deleteButton,
            confirmText !== 'DELETE' && styles.deleteButtonDisabled,
          ]}
          onPress={handleDeleteAccount}
          disabled={isDeleting || confirmText !== 'DELETE'}
          activeOpacity={0.7}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete My Account</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Link */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel and Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  titleContainer: { flex: 1, alignItems: 'center' },
  titleText: { fontSize: 18, fontWeight: '600', color: '#FF3B30' },
  content: { flex: 1, padding: 20 },
  warningIconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  warningIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF3B3015',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  consequencesList: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FF3B3020',
  },
  consequencesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  consequenceText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  confirmSection: {
    marginBottom: 24,
  },
  confirmLabel: {
    fontSize: 15,
    color: '#333',
    marginBottom: 10,
  },
  deleteWord: {
    fontWeight: '700',
    color: '#FF3B30',
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#f9f9f9',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  deleteButtonDisabled: {
    backgroundColor: '#FFB5B5',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
