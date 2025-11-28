// app/login.tsx
import React, { useState, useEffect } from 'react';
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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: '596401606956-4dsv6d83a9a93cmbh1ehinr352craei6.apps.googleusercontent.com',
    webClientId: '596401606956-k2basop69e3nib00a4de4hbv2mbkcrvp.apps.googleusercontent.com'
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleSignIn(authentication?.accessToken);
    }
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email, undefined, undefined, 'email');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to log in. Please try again.');
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
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const userInfo = await userInfoResponse.json();
      
      console.log('Google user info:', userInfo);
      
      await login(userInfo.email, userInfo.name, userInfo.picture, 'google');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Google sign-in error:', error);
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'Apple Sign In is only available on iOS devices');
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
        Alert.alert(
          'Email Required',
          'We couldn\'t retrieve your email from Apple. Please log in with your email address instead.',
        );
        return;
      }

      let fullName = '';
      if (credential.fullName) {
        const { givenName, familyName } = credential.fullName;
        fullName = [givenName, familyName].filter(Boolean).join(' ');
      }
      
      if (!fullName) {
        fullName = appleEmail.split('@')[0];
      }

      console.log('Apple user info:', { email: appleEmail, name: fullName });

      await login(appleEmail, fullName, undefined, 'apple');
      router.replace('/(tabs)');
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Apple Sign-In Error:', error);
      Alert.alert('Error', 'Apple sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>

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

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity 
        onPress={() => Alert.alert('Reset', 'Password reset will be added soon')}
        disabled={loading}
      >
        <Text style={styles.forgot}>Forgot your password?</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
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
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={30}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}

      {Platform.OS !== 'ios' && (
        <TouchableOpacity 
          style={[styles.socialButton, styles.appleButtonFallback]} 
          onPress={() => Alert.alert('Info', 'Apple Sign In is only available on iOS devices')}
          disabled={loading}
        >
          <Ionicons name="logo-apple" size={20} color="#fff" style={styles.socialIcon} />
          <Text style={[styles.socialText, { color: '#fff' }]}>Continue with Apple</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => router.push('/signup')} disabled={loading}>
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 40,
    textAlign: 'left',
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#000',
  },
  forgot: {
    color: '#007AFF',
    textAlign: 'right',
    marginBottom: 24,
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#0dd977',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  or: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 16,
    fontSize: 14,
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
    position: 'relative',
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
  appleButtonFallback: {
    backgroundColor: '#000',
  },
  link: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 24,
    textDecorationLine: 'underline',
    fontSize: 16,
  },
});
