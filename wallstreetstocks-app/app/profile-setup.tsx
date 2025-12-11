import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useUserProfile } from '@/context/UserProfileContext';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://www.wallstreetstocks.ai';

export default function ProfileSetupScreen() {
  const { user, updateProfile } = useAuth();
  const { refreshProfile } = useUserProfile();
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState('');

  // Pre-fill with existing data
  useEffect(() => {
    if (user) {
      if (user.name) setDisplayName(user.name);
      if (user.username) setUsername(user.username);
      if (user.bio) setBio(user.bio);
    }
  }, [user]);

  // Debounced username check
  const checkUsername = useCallback((value: string) => {
    if (!value || value.length < 3) {
      setUsernameAvailable(null);
      setUsernameError(value.length > 0 ? 'Username must be at least 3 characters' : '');
      return;
    }

    if (value.length > 20) {
      setUsernameAvailable(false);
      setUsernameError('Username must be 20 characters or less');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameAvailable(false);
      setUsernameError('Only letters, numbers, and underscores allowed');
      return;
    }

    setCheckingUsername(true);
    setUsernameError('');

    // Debounce the API call
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/api/username/check?username=${value}`);
        const text = await response.text();
        
        // Check if response is HTML (404 page)
        if (text.startsWith('<')) {
          console.log('Username check API not available');
          setUsernameAvailable(true);
          setCheckingUsername(false);
          return;
        }
        
        const data = JSON.parse(text);
        setUsernameAvailable(data.available);
        if (!data.available) {
          setUsernameError('Username is already taken');
        }
      } catch (error) {
        console.log('Username check failed:', error);
        setUsernameAvailable(true); // Allow on error, server will validate
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    checkUsername(cleaned);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }
    
    if (!username.trim() || username.length < 3) {
      Alert.alert('Error', 'Please choose a username (at least 3 characters)');
      return;
    }

    if (usernameAvailable === false) {
      Alert.alert('Error', 'Please choose an available username');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        name: displayName.trim(),
        username: username.toLowerCase(),
        bio: bio.trim() || undefined,
      });
      
      // Refresh the profile context to get updated data
      await refreshProfile();
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Profile Setup?',
      'You can set up your profile later in Settings.',
      [
        { text: 'Go Back', style: 'cancel' },
        { 
          text: 'Skip', 
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <Text style={styles.subtitle}>
              Choose how you appear in the community
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Display Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor="#666"
                autoCapitalize="words"
                maxLength={50}
              />
              <Text style={styles.hint}>
                This is how your name appears on posts and comments
              </Text>
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.usernameContainer}>
                <Text style={styles.usernamePrefix}>@</Text>
                <TextInput
                  style={styles.usernameInput}
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="username"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                />
                {checkingUsername && (
                  <ActivityIndicator size="small" color="#FFD700" />
                )}
                {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                )}
              </View>
              {usernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : (
                <Text style={styles.hint}>
                  Unique identifier for your profile (3-20 characters)
                </Text>
              )}
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio (Optional)</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell others about yourself..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                maxLength={160}
              />
              <Text style={styles.hint}>{bio.length}/160</Text>
            </View>
          </View>

          {/* Preview */}
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewAvatarText}>
                  {displayName.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>
                  {displayName || 'Your Name'}
                </Text>
                <Text style={styles.previewUsername}>
                  @{username || 'username'}
                </Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false) && 
                styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={loading || !displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.saveButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
  },
  usernamePrefix: {
    fontSize: 16,
    color: '#888',
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
    fontSize: 16,
    color: '#FFF',
  },
  hint: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
  },
  preview: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
  },
  previewTitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  previewUsername: {
    fontSize: 14,
    color: '#888',
  },
  buttons: {
    marginTop: 32,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#333',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#888',
  },
});
