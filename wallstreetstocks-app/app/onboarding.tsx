// app/onboarding.tsx
// First-time user onboarding — 5-slide swipe-through showcasing app features
import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ViewToken,
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

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Welcome to\nWallStreetStocks',
    subtitle: 'AI-Powered Research for Smart Investors',
    icon: 'rocket-outline',
  },
  {
    id: '2',
    title: 'Real-Time\nMarket Data',
    subtitle: 'Live prices, charts, and streaming quotes for stocks & crypto',
    icon: 'pulse-outline',
  },
  {
    id: '3',
    title: 'AI-Powered\nAnalysis',
    subtitle: 'Get AI stock ratings, earnings analysis, and smart screeners',
    icon: 'sparkles-outline',
  },
  {
    id: '4',
    title: 'Investor\nCommunity',
    subtitle: 'Share ideas, follow traders, and discuss market moves',
    icon: 'people-outline',
  },
  {
    id: '5',
    title: 'Never Miss\na Move',
    subtitle: 'Price alerts, market movers, and daily recaps pushed to you',
    icon: 'notifications-outline',
  },
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

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      currentIndex.current = viewableItems[0].index;
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

  const isLastSlide = () => currentIndex.current === SLIDES.length - 1;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon} size={80} color="#FFD700" />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

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

      {/* Bottom section: dots + button */}
      <View style={styles.bottomSection}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => {
            if (isLastSlide()) {
              completeOnboarding();
            } else {
              handleNext();
            }
          }}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide() ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
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
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 24,
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
});
