// app/index.tsx — animated welcome screen
// Dark hero with floating ticker chips + mini charts. Same behavior as before:
// auth redirect, Get Started → /signup, Log in → /login.
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Sparkline from '@/components/Sparkline';
import { useAuth } from '@/lib/auth';

const { width: W, height: H } = Dimensions.get('window');

// ---------- animation helpers (native driver only) ----------

// Fade + slide-up entrance
const Enter = ({ children, delay = 0, distance = 18, style }: any) => {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 520,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: p,
          transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Endless gentle bobbing
const Float = ({ children, delay = 0, duration = 2600, distance = 10, style }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }] }]}
    >
      {children}
    </Animated.View>
  );
};

// Soft breathing scale (CTA)
const Breathe = ({ children, style }: any) => {
  const s = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 1.02, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(s, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>;
};

// ---------- floating decorations ----------

const TickerChip = ({ symbol, change, up }: { symbol: string; change: string; up: boolean }) => (
  <View style={styles.chip}>
    <Text style={styles.chipSymbol}>{symbol}</Text>
    <Text style={[styles.chipChange, { color: up ? '#00C853' : '#FF5252' }]}>
      {up ? '▲' : '▼'} {change}
    </Text>
  </View>
);

const UP_DATA = [10, 10.6, 10.2, 11.1, 10.9, 11.8, 12.4, 12.1, 13.2, 13.8];
const DOWN_DATA = [14, 13.4, 13.8, 12.9, 13.1, 12.2, 12.6, 11.7, 11.9, 11.1];

const ChartCard = ({ up }: { up: boolean }) => (
  <View style={styles.chartCard}>
    <Sparkline
      data={up ? UP_DATA : DOWN_DATA}
      color={up ? '#00C853' : '#FF5252'}
      width={92}
      height={34}
      strokeWidth={2}
      fillOpacity={0.25}
    />
  </View>
);

// position, element, timing — scattered around the edges, clear of the copy
const DECOR: Array<{ top: number; left?: number; right?: number; delay: number; duration: number; node: React.ReactNode }> = [
  { top: H * 0.075, left: 22, delay: 0, duration: 2400, node: <TickerChip symbol="NVDA" change="2.4%" up /> },
  { top: H * 0.06, right: 26, delay: 500, duration: 3000, node: <ChartCard up /> },
  { top: H * 0.155, right: 60, delay: 950, duration: 2700, node: <TickerChip symbol="AAPL" change="1.2%" up /> },
  { top: H * 0.175, left: 48, delay: 300, duration: 3200, node: <ChartCard up={false} /> },
  { top: H * 0.265, left: 24, delay: 750, duration: 2500, node: <TickerChip symbol="BTC" change="3.1%" up /> },
  { top: H * 0.26, right: 30, delay: 150, duration: 2900, node: <TickerChip symbol="TSLA" change="0.8%" up={false} /> },
  { top: H * 0.75, left: 26, delay: 600, duration: 3100, node: <TickerChip symbol="SPY" change="0.6%" up /> },
  { top: H * 0.76, right: 28, delay: 1100, duration: 2600, node: <TickerChip symbol="MSFT" change="0.9%" up /> },
];

// ---------- screen ----------

export default function Index() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  // Wait for component to be fully mounted before allowing navigation
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Check for existing session and redirect if logged in
  useEffect(() => {
    if (isReady && !loading && user && token) {
      router.replace('/(tabs)');
    }
  }, [user, token, loading, isReady]);

  if (loading || !isReady || (user && token)) {
    return (
      <LinearGradient colors={['#0B1A2E', '#050A14']} style={[styles.container, styles.loadingContainer]}>
        <Image source={require('../assets/images/wallstreetstocks.png')} style={styles.logoLoading} />
        <ActivityIndicator size="large" color="#FFD700" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0B1A2E', '#070E1C', '#050A14']} style={styles.container}>
      {/* Floating market decorations */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {DECOR.map((d, i) => (
          <Enter key={i} delay={250 + i * 110} distance={10} style={[styles.decor, { top: d.top, left: d.left, right: d.right }]}>
            <Float delay={d.delay} duration={d.duration} distance={9}>
              {d.node}
            </Float>
          </Enter>
        ))}
      </View>

      {/* Hero */}
      <View style={styles.content}>
        <Enter delay={0}>
          <View style={styles.logoWrap}>
            <Image source={require('../assets/images/wallstreetstocks.png')} style={styles.logo} />
          </View>
        </Enter>

        <Enter delay={140}>
          <Text style={styles.title}>
            Wall Street <Text style={styles.titleAccent}>Stocks</Text>
          </Text>
        </Enter>

        <Enter delay={260}>
          <Text style={styles.subtitle}>AI-Powered Research for the Next Generation of Investors</Text>
        </Enter>

        <Enter delay={400} style={{ alignSelf: 'stretch' }}>
          <Breathe>
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/signup')}>
              <LinearGradient
                colors={['#FFD60A', '#DAA520']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color="#1a1a1a" />
              </LinearGradient>
            </TouchableOpacity>
          </Breathe>
        </Enter>

        <Enter delay={520}>
          <TouchableOpacity onPress={() => router.push('/login')} hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}>
            <Text style={styles.link}>
              Already have an account? <Text style={styles.linkAccent}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </Enter>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  decor: {
    position: 'absolute',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipSymbol: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  chipChange: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 26, // squircle — kills the hard square edge
    borderWidth: 1.5,
    borderColor: 'rgba(255,214,10,0.5)',
    resizeMode: 'cover',
    // Diffused gold halo via shadow — no solid disc (a low-opacity gold
    // circle over navy rendered as a muddy gray blob)
    shadowColor: '#FFD60A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: '#FFD60A',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginBottom: 44,
    lineHeight: 23,
    paddingHorizontal: 12,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: 30,
    marginBottom: 18,
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '800',
  },
  link: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15.5,
    textAlign: 'center',
  },
  linkAccent: {
    color: '#FFD60A',
    fontWeight: '700',
  },
  logoLoading: {
    width: 88,
    height: 88,
    borderRadius: 22,
    marginBottom: 28,
    resizeMode: 'cover',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
