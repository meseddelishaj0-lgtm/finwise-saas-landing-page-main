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
  ScrollView,
  KeyboardAvoidingView,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import GoogleLogo from '../components/GoogleLogo';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useLanguage } from '@/context/LanguageContext';

// Only import AppleAuthentication on iOS to prevent Android crashes
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
if (Platform.OS === 'ios') {
  AppleAuthentication = require('expo-apple-authentication');
}

// Complete auth session for OAuth redirects (iOS only)
if (Platform.OS === 'ios') {
  WebBrowser.maybeCompleteAuthSession();
}

// Configure Google Sign-In for Android (wrapped in try-catch to prevent crashes)
if (Platform.OS === 'android') {
  try {
    GoogleSignin.configure({
      webClientId: '596401606956-k2basop69e3nib00a4de4hbv2mbkcrvp.apps.googleusercontent.com',
    });
  } catch (e) {
    // Google Sign-In configuration failed - will handle in sign-in flow
  }
}

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

// Fade + slide-up entrance (native driver)
const Enter = ({ children, delay = 0, distance = 16, style }: any) => {
  const pr = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pr, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: pr, transform: [{ translateY: pr.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
};

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
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { signup, socialLogin } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  // Google OAuth configuration (iOS uses expo-auth-session, Android uses native SDK)
  // Provide both client IDs to prevent hook errors, but Android uses native SDK for actual sign-in
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: '596401606956-4dsv6d83a9a93cmbh1ehinr352craei6.apps.googleusercontent.com',
    androidClientId: '596401606956-k2basop69e3nib00a4de4hbv2mbkcrvp.apps.googleusercontent.com',
  });

  // Debug: Log the redirect URI being used (iOS)
  useEffect(() => {
    if (request && Platform.OS === 'ios') {
      // Debug logging removed
    }
  }, [request]);

  // Handle iOS Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success' && Platform.OS === 'ios') {
      const { authentication } = response;
      handleGoogleSignIn(authentication?.accessToken);
    }
  }, [response]);

  // Handle Android Google Sign-In using native SDK
  const handleAndroidGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      

      // Get user details and call socialLogin
      const user = userInfo.data?.user;
      if (user) {
        setLoading(true);
        await socialLogin(user.email, user.name || '', user.photo || '', 'google');
        router.replace('/profile-setup');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        
      } else if (error.code === statusCodes.IN_PROGRESS) {
        
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(t('Error'), t('Google Play Services is not available'));
      } else {

        Alert.alert(t('Error'), error.message || t('Google sign-in failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Unified Google Sign-In handler
  const onGoogleSignInPress = () => {
    if (Platform.OS === 'android') {
      handleAndroidGoogleSignIn();
    } else {
      promptAsync();
    }
  };

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
      setUsernameError(t('Username must be at least 3 characters'));
      return;
    }

    if (cleaned.length > 20) {
      setUsernameError(t('Username must be 20 characters or less'));
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
          
          setUsernameAvailable(true);
          return;
        }
        
        const data = JSON.parse(text);
        if (data.available) {
          setUsernameAvailable(true);
          setUsernameError('');
        } else {
          setUsernameAvailable(false);
          setUsernameError(t('Username is already taken'));
        }
      } catch (error) {
        
        setUsernameAvailable(true);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert(t('Error'), t('Please enter your name'));
      return;
    }
    if (!username.trim()) {
      Alert.alert(t('Error'), t('Please choose a username'));
      return;
    }
    if (username.length < 3 || username.length > 20) {
      Alert.alert(t('Error'), t('Username must be 3-20 characters'));
      return;
    }
    if (usernameError) {
      Alert.alert(t('Error'), usernameError);
      return;
    }
    if (usernameAvailable === false) {
      Alert.alert(t('Error'), t('This username is already taken'));
      return;
    }
    if (!email) {
      Alert.alert(t('Error'), t('Please enter your email'));
      return;
    }
    if (!password) {
      Alert.alert(t('Error'), t('Please enter a password'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('Error'), t('Password must be at least 6 characters'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('Error'), t('Passwords do not match'));
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, name, username);
      router.replace('/onboarding' as any);
    } catch (error: any) {
      Alert.alert(t('Error'), error.message || t('Failed to create account'));
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
      Alert.alert(t('Error'), error.message || t('Google sign-in failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios' || !AppleAuthentication) {
      Alert.alert(t('Error'), t('Apple Sign In is only available on iOS'));
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
        Alert.alert(t('Error'), t('Could not retrieve email from Apple'));
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
        Alert.alert(t('Error'), error.message || t('Apple sign-in failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0B1A2E', '#070E1C', '#050A14']} style={styles.container}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Enter delay={0}>
          <Image source={require('../assets/images/wallstreetstocks.png')} style={styles.headerLogo} />
        </Enter>
        <Enter delay={90}>
          <Text style={styles.title}>{t('Create Account')}</Text>
        </Enter>
        <Enter delay={160}>
          <Text style={styles.subtitle}>{t('Join the community')}</Text>
        </Enter>

      <View style={styles.inputCard}>
        <Ionicons name="person-outline" size={19} color="rgba(255,255,255,0.45)" />
        <TextInput
          style={styles.inputFlex}
          placeholder={t('Full Name')}
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading}
        />
      </View>

      <View>
        <View style={[styles.inputCard, usernameError ? styles.inputErrorBorder : usernameAvailable === true ? styles.inputSuccessBorder : null]}>
          <Ionicons name="at-outline" size={19} color="rgba(255,255,255,0.45)" />
          <TextInput
            style={styles.inputFlex}
            placeholder={t('Username (e.g. wallstreetbull)')}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={username}
            onChangeText={validateUsername}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {checkingUsername && (
            <ActivityIndicator size="small" color="#FFD60A" />
          )}
        </View>
        {usernameError ? (
          <Text style={styles.errorText}>{usernameError}</Text>
        ) : usernameAvailable === true && username.length >= 3 ? (
          <Text style={styles.successText}>✓ @{username} {t('is available!')}</Text>
        ) : username.length >= 3 && !checkingUsername ? (
          <Text style={styles.hintText}>{t('Checking availability...')}</Text>
        ) : username.length > 0 ? (
          <Text style={styles.hintText}>{t('3-20 characters, letters, numbers, underscores only')}</Text>
        ) : null}
      </View>

      <View style={styles.inputCard}>
        <Ionicons name="mail-outline" size={19} color="rgba(255,255,255,0.45)" />
        <TextInput
          style={styles.inputFlex}
          placeholder={t('Email')}
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <View style={styles.inputCard}>
        <Ionicons name="lock-closed-outline" size={19} color="rgba(255,255,255,0.45)" />
        <TextInput
          style={styles.inputFlex}
          placeholder={t('Password')}
          placeholderTextColor="rgba(255,255,255,0.4)"
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
            color="rgba(255,255,255,0.5)" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputCard}>
        <Ionicons name="shield-checkmark-outline" size={19} color="rgba(255,255,255,0.45)" />
        <TextInput
          style={styles.inputFlex}
          placeholder={t('Confirm Password')}
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={loading ? styles.buttonDisabled : undefined}
        onPress={handleSignup}
        disabled={loading}
        activeOpacity={0.85}
      >
        <LinearGradient colors={['#FFD60A', '#DAA520']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {loading ? (
            <ActivityIndicator color="#1a1a1a" />
          ) : (
            <>
              <Text style={styles.buttonText}>{t('Create Account')}</Text>
              <Ionicons name="arrow-forward" size={19} color="#1a1a1a" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.or}>{t('or')}</Text>
        <View style={styles.orLine} />
      </View>

      <TouchableOpacity
        style={styles.socialButton}
        onPress={onGoogleSignInPress}
        disabled={loading || (Platform.OS === 'ios' && !request)}
      >
        <View style={styles.socialIcon}>
          <GoogleLogo size={20} />
        </View>
        <Text style={styles.socialText}>{t('Continue with Google')}</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && AppleAuthentication && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={30}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}

      <TouchableOpacity onPress={() => router.push('/login')} disabled={loading}>
        <Text style={styles.link}>{t('Already have an account? Log In')}</Text>
      </TouchableOpacity>

      <Text style={styles.terms}>
        {t('By signing up, you agree to the')}{' '}
        <Text style={styles.underline}>{t('Terms and Conditions')}</Text>
      </Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 40,
  },
  headerLogo: {
    width: 54,
    height: 54,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.35)',
    resizeMode: 'cover',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15.5,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 26,
  },
  // Frosted input cards
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#FFFFFF',
  },
  // Legacy names kept for safety
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#FFFFFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeButton: { padding: 6 },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#1a1a1a',
    fontWeight: '800',
    fontSize: 17,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  or: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontWeight: '600',
  },
  socialButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  socialIcon: {},
  socialText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appleButton: {
    width: '100%',
    height: 48,
    marginBottom: 12,
  },
  link: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 22,
    fontSize: 15.5,
  },
  terms: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 32,
  },
  underline: {
    textDecorationLine: 'underline',
    color: 'rgba(255,255,255,0.55)',
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    marginBottom: 4,
  },
  usernamePrefix: {
    color: 'rgba(255,255,255,0.45)',
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
  inputHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, marginLeft: 4 },
  inputError: { fontSize: 12, color: '#FF6B6B', marginBottom: 8, marginLeft: 4 },
  inputSuccess: { fontSize: 12, color: '#34D399', marginBottom: 8, marginLeft: 4 },
  errorText: { fontSize: 12, color: '#FF6B6B', marginTop: 2, marginBottom: 10, marginLeft: 4 },
  successText: { fontSize: 12, color: '#34D399', marginTop: 2, marginBottom: 10, marginLeft: 4 },
  inputErrorBorder: { borderColor: '#FF6B6B' },
  inputSuccessBorder: { borderColor: '#34D399' },
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  usernameLoader: { position: 'absolute', right: 16 },
  hintText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, marginBottom: 10, marginLeft: 4 },
});
