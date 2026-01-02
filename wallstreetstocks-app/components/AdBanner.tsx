// components/AdBanner.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useSubscription } from '../context/SubscriptionContext';

// Production ad unit ID
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-7939235723023664/3423124622';

// Use test ads in development, production ads in release
const adUnitId = __DEV__ ? TestIds.BANNER : PRODUCTION_AD_UNIT_ID;

interface AdBannerProps {
  size?: BannerAdSize;
  style?: any;
}

export function AdBanner({ size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER, style }: AdBannerProps) {
  const { isPremium } = useSubscription();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  // Don't show ads to premium users
  if (isPremium) {
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
          console.log('📢 Ad loaded successfully');
          setAdLoaded(true);
        }}
        onAdFailedToLoad={(error) => {
          console.log('📢 Ad failed to load:', error.message);
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
