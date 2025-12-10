// app/signup.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

const API_URL = 'https://www.wallstreetstocks.ai';

function decodeJWT(token: string): { email?: string; sub?: string } | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default function Signup() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const { signup, socialLogin } = useAuth();
  const router = useRouter();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: '596401606956-4dsv6d83a9a93cmbh1ehinr352craei6.apps.googleusercontent.com',
    webClientId: '596401606956-k2basop69e3nib00a4de4hbv2mbkcrvp.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleSignIn(authentication?.accessToken);
    }
  }, [response]);

  // Validate username format and check availability
  const validateUsername = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setUsernameAvailable(null);
    
    // Clear previous timeout
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
    
    // Check availability after 500ms debounce
    usernameCheckTimeout.current = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const response = await fetch(`${API_URL}/api/check-username?username=${cleaned}`);
        const text = await response.text();
        
        // Check if response is JSON
        if (text.startsWith('<') || text.startsWith('<!')) {
          // API returned HTML (404 page), skip check
          console.log('Username check API not available, skipping');
          setUsernameAvailable(true);
          return;
        }
        
        const data = JSON.parse(text);
        if (data.available) {
          setUsernameAvailable(true);
          setUsernameError('');
        } else {
          setUsernameAvailable(false);
          setUsernameError('Username is already taken');
        }
      } catch (error) {
        console.log('Username check failed, allowing username:', error);
        setUsernameAvailable(true);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
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
    if (usernameError) {
      Alert.alert('Error', usernameError);
      return;
    }
    if (usernameAvailable === false) {
      Alert.alert('Error', 'This username is already taken');
      return;
    }
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, name, username);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (accessToken?: string) => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userInfo = await userInfoResponse.json();
      
      await socialLogin(userInfo.email, userInfo.name, userInfo.picture, 'google');
      
      // Social login users should always go to profile setup
      const { isNewUser: newUser, user } = useAuth.getState();
      if (newUser || !user?.profileComplete) {
        router.replace('/profile-setup');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'Apple Sign In is only available on iOS');
      return;
    }

    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      let appleEmail = credential.email;
      if (!appleEmail && credential.identityToken) {
        const decoded = decodeJWT(credential.identityToken);
        appleEmail = decoded?.email ?? null;
      }
      
      if (!appleEmail) {
        Alert.alert('Error', 'Could not retrieve email from Apple');
        return;
      }

      let fullName = '';
      if (credential.fullName) {
        const { givenName, familyName } = credential.fullName;
        fullName = [givenName, familyName].filter(Boolean).join(' ');
      }
      if (!fullName) fullName = appleEmail.split('@')[0];

      await socialLogin(appleEmail, fullName, undefined, 'apple');
      
      // Social login users should always go to profile setup
      const { isNewUser: newUser, user } = useAuth.getState();
      if (newUser || !user?.profileComplete) {
        router.replace('/profile-setup');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      if (error.code !== 'ERR_CANCELED') {
        Alert.alert('Error', error.message || 'Apple sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join the community</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        editable={!loading}
      />

      <View>
        <View style={styles.usernameRow}>
          <TextInput
            style={[styles.input, { flex: 1 }, usernameError ? styles.inputErrorBorder : usernameAvailable === true ? styles.inputSuccessBorder : null]}
            placeholder="Username (e.g. wallstreetbull)"
            placeholderTextColor="#999"
            value={username}
            onChangeText={validateUsername}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {checkingUsername && (
            <ActivityIndicator size="small" color="#007AFF" style={styles.usernameLoader} />
          )}
        </View>
        {usernameError ? (
          <Text style={styles.errorText}>{usernameError}</Text>
        ) : usernameAvailable === true && username.length >= 3 ? (
          <Text style={styles.successText}>✓ @{username} is available!</Text>
        ) : username.length >= 3 && !checkingUsername ? (
          <Text style={styles.hintText}>Checking availability...</Text>
        ) : username.length > 0 ? (
          <Text style={styles.hintText}>3-20 characters, letters, numbers, underscores only</Text>
        ) : null}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!loading}
        />
        <TouchableOpacity 
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeButton}
        >
          <Ionicons 
            name={showPassword ? "eye-off" : "eye"} 
            size={22} 
            color="#999" 
          />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#999"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPassword}
        editable={!loading}
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.or}>or</Text>

      <TouchableOpacity 
        style={styles.socialButton} 
        onPress={() => promptAsync()}
        disabled={loading || !request}
      >
        <Ionicons name="logo-google" size={20} color="#DB4437" style={styles.socialIcon} />
        <Text style={styles.socialText}>Continue with Google</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={30}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}

      <TouchableOpacity onPress={() => router.push('/login')} disabled={loading}>
        <Text style={styles.link}>Already have an account? Log In</Text>
      </TouchableOpacity>

      <Text style={styles.terms}>
        By signing up, you agree to the{' '}
        <Text style={styles.underline}>Terms and Conditions</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    paddingHorizontal: 32, 
    paddingTop: 60 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 40 
  },
  input: { 
    borderBottomWidth: 1, 
    borderColor: '#ddd', 
    paddingVertical: 12, 
    fontSize: 16, 
    marginBottom: 20,
    color: '#000',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  eyeButton: {
    padding: 8,
  },
  button: { 
    backgroundColor: '#0dd977', 
    paddingVertical: 16, 
    borderRadius: 30, 
    alignItems: 'center', 
    marginBottom: 24 
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16 
  },
  or: { 
    textAlign: 'center', 
    color: '#999', 
    marginVertical: 16 
  },
  socialButton: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    paddingVertical: 14, 
    borderRadius: 30, 
    alignItems: 'center', 
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialIcon: {
    position: 'absolute',
    left: 20,
  },
  socialText: { 
    fontSize: 16, 
    color: '#000',
  },
  appleButton: {
    width: '100%',
    height: 48,
    marginBottom: 12,
  },
  link: { 
    color: '#007AFF', 
    textAlign: 'center', 
    marginTop: 24, 
    textDecorationLine: 'underline' 
  },
  terms: { 
    fontSize: 12, 
    color: '#999', 
    textAlign: 'center', 
    marginTop: 40 
  },
  underline: { 
    textDecorationLine: 'underline' 
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    marginBottom: 4,
  },
  usernamePrefix: {
    color: '#999',
    fontSize: 16,
    paddingLeft: 16,
    paddingRight: 4,
  },
  usernameInput: {
    flex: 1,
    color: '#fff',
    padding: 16,
    paddingLeft: 0,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputError: {
    fontSize: 12,
    color: '#FF3B30',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputSuccess: {
    fontSize: 12,
    color: '#34C759',
    marginBottom: 8,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
  successText: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputErrorBorder: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  inputSuccessBorder: {
    borderWidth: 1,
    borderColor: '#34C759',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameLoader: {
    position: 'absolute',
    right: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
});
