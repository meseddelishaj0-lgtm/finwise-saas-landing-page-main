// components/AdBanner.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';

// Production ad unit ID
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-7939235723023664/3423124622';

// Try to import AdMob - will fail in Expo Go
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;
let isAdMobAvailable = false;

try {
  const AdMob = require('react-native-google-mobile-ads');
  BannerAd = AdMob.BannerAd;
  BannerAdSize = AdMob.BannerAdSize;
  TestIds = AdMob.TestIds;
  isAdMobAvailable = true;
} catch (e) {
  // AdMob not available (likely running in Expo Go)
  console.log('📢 AdMob not available - native module required');
}

// Use test ads in development, production ads in release
const getAdUnitId = () => {
  if (!TestIds) return PRODUCTION_AD_UNIT_ID;
  return __DEV__ ? TestIds.BANNER : PRODUCTION_AD_UNIT_ID;
};

interface AdBannerProps {
  size?: any;
  style?: any;
}

export function AdBanner({ size, style }: AdBannerProps) {
  const { isPremium } = useSubscription();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  // Don't show ads if AdMob is not available (Expo Go)
  if (!isAdMobAvailable || !BannerAd) {
    return null;
  }

  // Don't show ads to premium users
  if (isPremium) {
    return null;
  }

  // Don't render if there was an error loading the ad
  if (adError) {
    return null;
  }

  const adSize = size || (BannerAdSize?.ANCHORED_ADAPTIVE_BANNER ?? 'BANNER');

  return (
    <View style={[styles.container, style, !adLoaded && styles.hidden]}>
      <BannerAd
        unitId={getAdUnitId()}
        size={adSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('📢 Ad loaded successfully');
          setAdLoaded(true);
        }}
        onAdFailedToLoad={(error: any) => {
          console.log('📢 Ad failed to load:', error?.message);
          setAdError(true);
        }}
      />
    </View>
  );
}

// Specific banner for bottom of screens
export function BottomAdBanner() {
  if (!isAdMobAvailable) return null;

  return (
    <AdBanner
      size={BannerAdSize?.ANCHORED_ADAPTIVE_BANNER}
      style={styles.bottomBanner}
    />
  );
}

// Inline banner for use within scrollable content
export function InlineAdBanner() {
  if (!isAdMobAvailable) return null;

  return (
    <AdBanner
      size={BannerAdSize?.MEDIUM_RECTANGLE}
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
