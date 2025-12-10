// app/profile-setup.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://www.wallstreetstocks.ai';

export default function ProfileSetup() {
  const { user, token, updateProfile } = useAuth();
  const router = useRouter();
  
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Generate username suggestion from name or email
  useEffect(() => {
    if (user && !username) {
      const baseName = (user.name || user.email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const suggestion = baseName.substring(0, 12) + Math.floor(Math.random() * 1000);
      setUsername(suggestion);
      validateUsername(suggestion);
    }
  }, [user]);

  const validateUsername = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setUsernameAvailable(null);
    
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }
    
    if (cleaned.length === 0) {
      setUsernameError('');
      return;
    }
    
    if (cleaned.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    
    if (cleaned.length > 20) {
      setUsernameError('Username must be 20 characters or less');
      return;
    }
    
    setUsernameError('');
    
    usernameCheckTimeout.current = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const response = await fetch(`${API_URL}/api/user/check-username?username=${cleaned}`);
        const data = await response.json();
        if (data.available) {
          setUsernameAvailable(true);
          setUsernameError('');
        } else {
          setUsernameAvailable(false);
          setUsernameError('Username is already taken');
        }
      } catch (error) {
        console.error('Username check failed:', error);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please choose a username');
      return;
    }
    if (username.length < 3 || username.length > 20) {
      Alert.alert('Error', 'Username must be 3-20 characters');
      return;
    }
    if (usernameError || usernameAvailable === false) {
      Alert.alert('Error', 'Please choose an available username');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        name: displayName.trim(),
        username: username.toLowerCase(),
        bio: bio.trim() || undefined,
        profileComplete: true,
      });
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow skipping but still mark as having seen the setup
    Alert.alert(
      'Skip Profile Setup?',
      'You can always update your profile later in Settings. Your username will be auto-generated.',
      [
        { text: 'Go Back', style: 'cancel' },
        { 
          text: 'Skip for Now', 
          onPress: async () => {
            try {
              // Generate a random username
              const autoUsername = `user${Date.now().toString(36)}`;
              await updateProfile({
                username: autoUsername,
                profileComplete: true,
              });
              router.replace('/(tabs)');
            } catch (error) {
              router.replace('/(tabs)');
            }
          }
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="person-circle-outline" size={80} color="#007AFF" />
          <Text style={styles.title}>Set Up Your Profile</Text>
          <Text style={styles.subtitle}>
            Choose how you'll appear in the community
          </Text>
        </View>

        <View style={styles.form}>
          {/* Display Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="How should we call you?"
              placeholderTextColor="#666"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              editable={!loading}
              maxLength={50}
            />
            <Text style={styles.hint}>
              This is shown on your posts and profile
            </Text>
          </View>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.usernameRow}>
              <View style={styles.usernameInputContainer}>
                <Text style={styles.atSymbol}>@</Text>
                <TextInput
                  style={[
                    styles.usernameInput,
                    usernameError ? styles.inputErrorBorder : 
                    usernameAvailable === true ? styles.inputSuccessBorder : null
                  ]}
                  placeholder="your_username"
                  placeholderTextColor="#666"
                  value={username}
                  onChangeText={validateUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  maxLength={20}
                />
              </View>
              {checkingUsername && (
                <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
              )}
            </View>
            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : usernameAvailable === true ? (
              <Text style={styles.successText}>✓ @{username} is available!</Text>
            ) : (
              <Text style={styles.hint}>
                3-20 characters: letters, numbers, underscores
              </Text>
            )}
          </View>

          {/* Bio (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell the community about yourself..."
              placeholderTextColor="#666"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              editable={!loading}
              maxLength={160}
            />
            <Text style={styles.charCount}>{bio.length}/160</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={loading || !!usernameError || checkingUsername}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          You can change these anytime in your profile settings
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  optional: {
    color: '#666',
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
  },
  atSymbol: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    paddingLeft: 16,
  },
  usernameInput: {
    flex: 1,
    padding: 16,
    paddingLeft: 4,
    fontSize: 16,
    color: '#fff',
  },
  inputErrorBorder: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 12,
  },
  inputSuccessBorder: {
    borderWidth: 1,
    borderColor: '#34C759',
    borderRadius: 12,
  },
  loader: {
    marginLeft: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 6,
  },
  successText: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 6,
  },
  buttonContainer: {
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
});
