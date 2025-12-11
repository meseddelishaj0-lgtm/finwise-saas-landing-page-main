// app/auth/setup-username.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = "https://www.wallstreetstocks.ai/api";

export default function SetupUsername() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  // Debounce username check
  useEffect(() => {
    if (username.length < 3) {
      setIsAvailable(null);
      setError('');
      return;
    }

    // Validate format
    const validFormat = /^[a-zA-Z0-9_]+$/.test(username);
    if (!validFormat) {
      setError('Only letters, numbers, and underscores allowed');
      setIsAvailable(false);
      return;
    }

    const timer = setTimeout(() => {
      checkUsername(username);
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const checkUsername = async (name: string) => {
    setChecking(true);
    setError('');
    
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/check-username?username=${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      
      if (res.ok) {
        setIsAvailable(data.available);
        if (!data.available) {
          setError('Username is already taken');
        }
      } else {
        setIsAvailable(null);
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setIsAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!username.trim() || username.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters');
      return;
    }

    if (!isAvailable) {
      Alert.alert('Username Unavailable', 'Please choose a different username');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      const res = await fetch(`${API_BASE_URL}/users/${userId}/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      });

      if (res.ok) {
        // Save username locally too
        const saved = await AsyncStorage.getItem('personalInfo');
        const data = saved ? JSON.parse(saved) : {};
        data.username = username.trim().toLowerCase();
        await AsyncStorage.setItem('personalInfo', JSON.stringify(data));
        
        // Mark setup as complete
        await AsyncStorage.setItem('usernameSetup', 'complete');

        // Navigate to main app
        router.replace('/(tabs)');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to set username');
      }
    } catch (err) {
      console.error('Error setting username:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInputBorderColor = () => {
    if (username.length < 3) return '#E0E0E0';
    if (checking) return '#007AFF';
    if (isAvailable === true) return '#34C759';
    if (isAvailable === false) return '#FF3B30';
    return '#E0E0E0';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="person-add" size={40} color="#007AFF" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Create your username</Text>
        <Text style={styles.subtitle}>
          Choose a unique username for your WallStreetStocks profile. This is how other members will find and mention you.
        </Text>

        {/* Username Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.atSymbol}>@</Text>
          <TextInput
            style={[styles.input, { borderColor: getInputBorderColor() }]}
            value={username}
            onChangeText={(text) => setUsername(text.replace(/\s/g, ''))}
            placeholder="username"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            maxLength={20}
          />
          <View style={styles.inputIcon}>
            {checking && <ActivityIndicator size="small" color="#007AFF" />}
            {!checking && isAvailable === true && (
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            )}
            {!checking && isAvailable === false && (
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            )}
          </View>
        </View>

        {/* Error/Helper Text */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={styles.helperText}>
            {username.length > 0 && username.length < 3
              ? `${3 - username.length} more characters needed`
              : 'Letters, numbers, and underscores only'}
          </Text>
        )}

        {/* Username Preview */}
        {username.length >= 3 && isAvailable && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Your profile will appear as:</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewInitial}>{username[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.previewUsername}>@{username.toLowerCase()}</Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isAvailable || loading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isAvailable || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        {/* Rules */}
        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>Username guidelines:</Text>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark" size={16} color="#34C759" />
            <Text style={styles.ruleText}>3-20 characters</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark" size={16} color="#34C759" />
            <Text style={styles.ruleText}>Letters, numbers, underscores only</Text>
          </View>
          <View style={styles.ruleItem}>
            <Ionicons name="checkmark" size={16} color="#34C759" />
            <Text style={styles.ruleText}>No spaces or special characters</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  atSymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#000',
    backgroundColor: '#FAFAFA',
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 8,
    marginLeft: 20,
  },
  helperText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    marginLeft: 20,
  },
  previewContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  previewUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#B0D4FF',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  rulesContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 14,
    color: '#666',
  },
});
