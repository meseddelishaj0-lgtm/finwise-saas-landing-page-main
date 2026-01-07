// app/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { user, token, loading } = useAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  // Check for existing session and redirect if logged in
  useEffect(() => {
    // Wait for navigation to be ready
    if (!navigationState?.key) return;

    if (!loading && user && token && !hasNavigated) {
      // User is already logged in, go to main app
      setHasNavigated(true);
      router.replace('/(tabs)');
    }
  }, [user, token, loading, navigationState?.key, hasNavigated]);

  // Show loading while checking auth state or waiting for navigation
  if (loading || !navigationState?.key) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Image source={require('../assets/images/wallstreetstocks.png')} style={styles.logo} />
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  // If user is logged in, don't render welcome screen (redirect will happen)
  if (user && token) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Optional logo – replace with your own */}
      {<Image source={require('../assets/images/wallstreetstocks.png')} style={styles.logo} />}

      <Text style={styles.title}>WallStreetStocks.ai</Text>
      <Text style={styles.subtitle}>
        AI-Powered Research for the Next Generation of Investors
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/signup')}   // Change to '/login' when ready
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',               // White background
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 40,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#FFD700',            // StockTwits yellow
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
