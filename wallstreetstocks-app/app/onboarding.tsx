// app/onboarding.tsx
// First-time user onboarding — 5 feature slides + trial offer slide
import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ViewToken,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../context/SubscriptionContext';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

interface Slide {
  id: string;
  type: 'feature' | 'trial';
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    type: 'feature',
    title: 'Welcome to\nWallStreetStocks',
    subtitle: 'AI-Powered Research for Smart Investors',
    icon: 'rocket-outline',
  },
  {
    id: '2',
    type: 'feature',
    title: 'Real-Time\nMarket Data',
    subtitle: 'Live prices, charts, and streaming quotes for stocks & crypto',
    icon: 'pulse-outline',
  },
  {
    id: '3',
    type: 'feature',
    title: 'AI-Powered\nAnalysis',
    subtitle: 'Get AI stock ratings, earnings analysis, and smart screeners',
    icon: 'sparkles-outline',
  },
  {
    id: '4',
    type: 'feature',
    title: 'Investor\nCommunity',
    subtitle: 'Share ideas, follow traders, and discuss market moves',
    icon: 'people-outline',
  },
  {
    id: '5',
    type: 'feature',
    title: 'Never Miss\na Move',
    subtitle: 'Price alerts, market movers, and daily recaps pushed to you',
    icon: 'notifications-outline',
  },
  {
    id: '6',
    type: 'trial',
    title: 'Unlock Premium',
    subtitle: 'Start your 7-day free trial',
  },
];

const TRIAL_FEATURES = [
  { icon: 'sparkles' as const, text: '15 Expert Stock Picks Daily' },
  { icon: 'analytics' as const, text: 'AI Tools (Analyzer, Compare, Forecast)' },
  { icon: 'chatbubble-ellipses' as const, text: 'AI Financial Assistant' },
  { icon: 'eye' as const, text: 'Insider Trading Data' },
  { icon: 'document-text' as const, text: 'Research Reports & Portfolio Tools' },
  { icon: 'shield-checkmark' as const, text: 'Ad-Free Experience' },
];

function Dot({ index, scrollX, width }: { index: number; scrollX: Animated.SharedValue<number>; width: number }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const dotWidth = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
    return { width: dotWidth, opacity };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const currentIndex = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { packages, loadOfferings, purchase, refreshStatus } = useSubscription();

  // Pre-load RevenueCat offerings so trial button is ready
  useEffect(() => {
    loadOfferings();
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      currentIndex.current = viewableItems[0].index;
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (currentIndex.current < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex.current + 1,
        animated: true,
      });
    }
  };

  const handleStartTrial = async () => {
    // Find Diamond monthly package
    const diamondPkg = packages.find((pkg) => {
      const id = pkg.product.identifier.toLowerCase();
      return id.includes('diamond') && id.includes('monthly');
    });

    if (!diamondPkg) {
      // Fallback: go to full paywall screen
      await completeOnboarding();
      router.push('/paywall' as any);
      return;
    }

    setIsPurchasing(true);
    try {
      const success = await purchase(diamondPkg);
      if (success) {
        await refreshStatus();
        await completeOnboarding();
      }
    } catch {
      // Purchase cancelled or failed — user stays on slide
    } finally {
      setIsPurchasing(false);
    }
  };

  const isTrialSlide = activeIndex === SLIDES.length - 1;
  const isLastFeatureSlide = activeIndex === SLIDES.length - 2;

  const renderSlide = ({ item }: { item: Slide }) => {
    if (item.type === 'trial') {
      return (
        <View style={[styles.slide, styles.trialSlide, { width }]}>
          <View style={styles.trialIconContainer}>
            <Ionicons name="diamond-outline" size={60} color="#FFD700" />
          </View>
          <Text style={styles.trialTitle}>Unlock Premium</Text>
          <Text style={styles.trialSubtitle}>
            Try free for 7 days, then $9.99/mo
          </Text>

          <View style={styles.trialFeatures}>
            {TRIAL_FEATURES.map((feature, i) => (
              <View key={i} style={styles.trialFeatureRow}>
                <Ionicons name={feature.icon} size={20} color="#FFD700" />
                <Text style={styles.trialFeatureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon!} size={80} color="#FFD700" />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={completeOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <AnimatedFlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item: Slide) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_: any, index: number) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Bottom section: dots + buttons */}
      <View style={styles.bottomSection}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>

        {isTrialSlide ? (
          /* Trial slide: two buttons */
          <View style={styles.trialButtons}>
            <TouchableOpacity
              style={[styles.trialButton, isPurchasing && styles.trialButtonDisabled]}
              onPress={handleStartTrial}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.trialButtonText}>Start 7-Day Free Trial</Text>
                  <Text style={styles.trialButtonSubtext}>Cancel anytime</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.freeButton} onPress={completeOnboarding}>
              <Text style={styles.freeButtonText}>Continue with Free</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              7-day free trial, then $9.99/mo. Cancel anytime.{'\n'}
              <Text style={styles.termsLink} onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>Terms</Text>
              {' & '}
              <Text style={styles.termsLink} onPress={() => Linking.openURL('https://www.wallstreetstocks.ai/privacy')}>Privacy</Text>
            </Text>
          </View>
        ) : (
          /* Feature slides: single Next button */
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: '#888',
    fontSize: 16,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 17,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  // Trial slide
  trialSlide: {
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  trialIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  trialTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  trialSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 28,
  },
  trialFeatures: {
    alignSelf: 'stretch',
    gap: 16,
  },
  trialFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trialFeatureText: {
    fontSize: 16,
    color: '#DDD',
    flex: 1,
  },
  // Bottom section
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  nextButton: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
  },
  // Trial buttons
  trialButtons: {
    gap: 10,
  },
  trialButton: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  trialButtonDisabled: {
    opacity: 0.6,
  },
  trialButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trialButtonSubtext: {
    color: 'rgba(0, 0, 0, 0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  freeButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  freeButtonText: {
    color: '#888',
    fontSize: 16,
  },
  termsText: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: '#777',
  },
});
