// components/AdBanner.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Production ad unit IDs (platform-specific)
const IOS_AD_UNIT_ID = 'ca-app-pub-7939235723023664/3423124622';
const ANDROID_AD_UNIT_ID = 'ca-app-pub-7939235723023664/6596082877';

// Use test ads in development, production ads in release
const adUnitId = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.OS === 'ios' ? IOS_AD_UNIT_ID : ANDROID_AD_UNIT_ID;

interface AdBannerProps {
  size?: BannerAdSize;
  style?: any;
}

// Premium tiers that should not see ads
const PREMIUM_TIERS = ['gold', 'platinum', 'diamond'];

export function AdBanner({ size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER, style }: AdBannerProps) {
  const { isPremium, currentTier } = useSubscription();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  // Don't show ads to premium users (gold, platinum, diamond)
  if (isPremium || (currentTier && PREMIUM_TIERS.includes(currentTier.toLowerCase()))) {
    return null;
  }

  // Don't render if there was an error loading the ad
  if (adError) {
    return null;
  }

  return (
    <View style={[styles.container, style, !adLoaded && styles.hidden]}>
      <BannerAd
        unitId={adUnitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          setAdLoaded(true);
        }}
        onAdFailedToLoad={() => {
          setAdError(true);
        }}
      />
    </View>
  );
}

// Specific banner for bottom of screens
export function BottomAdBanner() {
  return (
    <AdBanner
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      style={styles.bottomBanner}
    />
  );
}

// Inline banner for use within scrollable content
export function InlineAdBanner() {
  return (
    <AdBanner
      size={BannerAdSize.MEDIUM_RECTANGLE}
      style={styles.inlineBanner}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
  },
  bottomBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  inlineBanner: {
    marginVertical: 16,
  },
});
