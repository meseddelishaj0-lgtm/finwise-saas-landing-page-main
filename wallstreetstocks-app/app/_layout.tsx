// app/_layout.tsx
import { useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StatusBar, Platform, AppState, LogBox } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Constants from "expo-constants";

// OneSignal for push notifications
let OneSignal: any = null;
try {
  OneSignal = require("react-native-onesignal").default;
} catch {
  // Module not available in Expo Go - will work in production builds
}

// In-app browser for opening article URLs from notifications
let WebBrowser: any = null;
try {
  WebBrowser = require("expo-web-browser");
} catch {
  // Module not available
}

// ATT module - only available in production builds, not Expo Go
let requestTrackingPermissionsAsync: (() => Promise<any>) | null = null;
try {
  requestTrackingPermissionsAsync = require("expo-tracking-transparency").requestTrackingPermissionsAsync;
} catch {
  // Module not available in Expo Go - will work in production builds
}

// Google Mobile Ads - must be initialized AFTER ATT consent
let mobileAds: (() => { initialize: () => Promise<any> }) | null = null;
try {
  mobileAds = require("react-native-google-mobile-ads").default;
} catch {
  // Module not available in Expo Go
}
import { SubscriptionProvider, useSubscription } from "../context/SubscriptionContext";
import { WatchlistProvider } from "../context/WatchlistContext";
import { UserProfileProvider } from "../context/UserProfileContext";
import { ReferralProvider, useReferral } from "../context/ReferralContext";
import { WebSocketProvider } from "../context/WebSocketContext";
import { PortfolioProvider } from "../context/PortfolioContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { LanguageProvider } from "../context/LanguageContext";
import { useAuth } from "@/lib/auth";
import { preloadAppData } from "../utils/preload";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { initializeSentry } from "../utils/sentry";

// Initialize Sentry for crash reporting
initializeSentry();

// Initialize OneSignal JS bridge (native init + permission handled in AppDelegate via withOneSignalAppDelegate plugin)
const ONESIGNAL_APP_ID = Constants.expoConfig?.extra?.oneSignalAppId || 'f964a298-9c86-43a2-bb7f-a9f0cc8dac24';

// Module-level notification click handling — catches cold-start taps before React mounts
let _pendingNotificationClick: any = null;
let _notificationProcessor: ((event: any) => Promise<void>) | null = null;

if (OneSignal && ONESIGNAL_APP_ID) {
  OneSignal.initialize(ONESIGNAL_APP_ID);

  // Register click handler at module level so cold-start taps are never missed.
  // preventDefault() stops OneSignal from opening any launchURL in Safari (legacy notifications).
  OneSignal.Notifications.addEventListener('click', (event: any) => {
    try { event.preventDefault(); } catch (_) {}

    if (_notificationProcessor) {
      _notificationProcessor(event);
    } else {
      // Router not ready yet (cold start) — queue for processing after mount
      _pendingNotificationClick = event;
    }
  });
}

// Default symbols to stream - 24/7 crypto for always-live prices + popular stocks
// Crypto trades 24/7 ensuring live price updates for Apple review anytime
const DEFAULT_STREAMING_SYMBOLS = [
  // Crypto (24/7) - always live
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'ADA/USD',
  'DOGE/USD', 'AVAX/USD', 'DOT/USD', 'MATIC/USD', 'LINK/USD', 'LTC/USD',
  // Popular stocks (market hours)
  'AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL',
];

const queryClient = new QueryClient();

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { initialize, isInitialized, currentTier, identifyUser: rcIdentify, logOut: rcLogOut } = useSubscription();
  const { initializeReferral, initialized: referralInitialized } = useReferral();
  const appState = useRef(AppState.currentState);
  const trackingRequested = useRef(false);

  useEffect(() => {
    if (!OneSignal) return;

    const openArticle = async (articleUrl: string) => {
      if (WebBrowser) {
        try {
          await WebBrowser.openBrowserAsync(articleUrl, {
            presentationStyle: 1, // FULL_SCREEN
            dismissButtonStyle: 'close',
            enableBarCollapsing: true,
          });
          return;
        } catch (e) {
          console.warn('[OneSignal] In-app browser failed, opening externally:', e);
        }
      }
      const { Linking } = require('react-native');
      Linking.openURL(articleUrl).catch(() => {});
    };

    const processNotificationClick = async (event: any) => {
      const notification = event?.notification;
      // OneSignal may deliver custom payload flat (additionalData) or nested under custom.a
      const rawData = notification?.additionalData || {};
      const data = rawData?.custom?.a || rawData || {};
      const articleUrl = data?.url || rawData?.url || notification?.launchURL || rawData?.custom?.u;

      // Wait for navigation stack to be fully mounted on cold start
      await new Promise(resolve => setTimeout(resolve, 800));

      switch (data?.type) {
        // Social notifications -> open the relevant post in the community tab
        case 'like':
        case 'comment':
        case 'mention':
        case 'reply':
          if (data.postId != null) {
            router.push({
              pathname: '/(tabs)/community',
              params: { openPostId: String(data.postId) },
            } as any);
          } else {
            router.push({ pathname: '/(tabs)/community' } as any);
          }
          return;

        // Follow -> open the follower's profile in the community tab
        case 'follow':
          if (data.userId != null) {
            router.push({
              pathname: '/(tabs)/community',
              params: { openUserId: String(data.userId) },
            } as any);
          } else {
            router.push({ pathname: '/(tabs)/community' } as any);
          }
          return;

        // Direct message -> open the conversation
        case 'message':
          if (data.conversationId != null) {
            router.push(`/messages/${data.conversationId}` as any);
          } else {
            router.push({ pathname: '/(tabs)/community' } as any);
          }
          return;

        // Price / watchlist alerts -> open the symbol chart
        case 'price_alert':
        case 'watchlist_alert':
          if (data.symbol || data.ticker) {
            router.push(`/symbol/${data.symbol || data.ticker}/chart` as any);
          } else {
            router.push({ pathname: '/(tabs)/trending' } as any);
          }
          return;

        // Market movers -> trending gainers
        case 'market_mover':
          router.push({ pathname: '/(tabs)/trending', params: { initialTab: 'gainers' } } as any);
          return;

        // News -> open the article, fall back to trending
        case 'market_news':
        case 'breaking_news':
          if (articleUrl) {
            await openArticle(articleUrl);
          } else {
            router.push({ pathname: '/(tabs)/trending' } as any);
          }
          return;

        // Daily recap -> trending overview
        case 'daily_recap':
          router.push({ pathname: '/(tabs)/trending' } as any);
          return;

        // Unknown type: open URL if present, otherwise show the notifications list
        default:
          if (articleUrl) {
            await openArticle(articleUrl);
          } else {
            router.push('/notifications' as any);
          }
          return;
      }
    };

    // Wire up the processor so the module-level handler can route events here
    _notificationProcessor = processNotificationClick;

    // Drain any cold-start event that arrived before mount
    if (_pendingNotificationClick) {
      processNotificationClick(_pendingNotificationClick);
      _pendingNotificationClick = null;
    }

    return () => {
      _notificationProcessor = null;
    };
  }, []);

  // Update OneSignal user tags for segmentation (Gold/Platinum/Diamond targeting)
  useEffect(() => {
    if (!OneSignal) return;
    if (user?.id) {
      OneSignal.login(user.id.toString());
      OneSignal.User.addTags({
        subscription_tier: currentTier || 'free',
        user_id: user.id.toString(),
      });
    } else {
      // Signed out — unbind this device from the previous user's external_id so
      // it stops receiving their personal push (DMs, mentions, price alerts).
      try { OneSignal.logout(); } catch (_) {}
    }
  }, [user?.id, currentTier]);

  // Notification permission is handled natively by OneSignal in AppDelegate (via withOneSignalAppDelegate plugin).
  // Here we only request ATT and initialize ads after the notification prompt has had time to show.
  useEffect(() => {
    const requestPermissionsSequentially = async () => {
      // Wait for OneSignal's native notification prompt to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 1: ATT permission on iOS
      if (Platform.OS === 'ios' && !trackingRequested.current) {
        trackingRequested.current = true;

        if (requestTrackingPermissionsAsync) {
          try {
            await requestTrackingPermissionsAsync();
          } catch {
            // Tracking permission request failed - ads will be non-personalized
          }
        }
      }

      // Step 2: Initialize ads
      if (mobileAds) {
        try {
          await mobileAds().initialize();
        } catch {
          // AdMob initialization failed
        }
      }
    };
    requestPermissionsSequentially();
  }, []);

  // Keep RevenueCat's identity in lockstep with the auth user. Auth loads
  // async, so this must re-run when user?.id resolves — initializing once
  // with an undefined id left RevenueCat anonymous (no entitlements) and
  // paying users appeared free/gold after a restart or re-login.
  const rcIdentityRef = useRef<string | null>(null);
  useEffect(() => {
    const uid = user?.id ? String(user.id) : null;
    if (!isInitialized) {
      initialize(uid ?? undefined);
      rcIdentityRef.current = uid;
      return;
    }
    if (uid && rcIdentityRef.current !== uid) {
      // logIn also migrates purchases made under an anonymous identity
      rcIdentityRef.current = uid;
      rcIdentify(uid);
    } else if (!uid && rcIdentityRef.current) {
      rcIdentityRef.current = null;
      rcLogOut();
    }
  }, [user?.id, isInitialized]);

  useEffect(() => {
    // Pre-load popular stocks data on app startup
    preloadAppData();

    // Also preload when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        preloadAppData();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // Initialize referral system when user is available
  useEffect(() => {
    if (user?.id && user?.name && !referralInitialized) {
      initializeReferral(user.id, user.name);
    }
  }, [user?.id, user?.name, referralInitialized]);

  return <>{children}</>;
}

function ThemedApp() {
  const { colors, isDark } = useTheme();

  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
          translucent={Platform.OS === 'android'}
        />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* Disable swipe back on tabs to prevent exiting app */}
          <Stack.Screen
            name="(tabs)"
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="index"
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="onboarding"
            options={{
              gestureEnabled: false,
            }}
          />
          {/* Symbol screen: edge-only swipe-back. Full-screen back
              gestures (SDK 57 default) fight the chart's crosshair drag,
              so keep the gesture but confine it to the left edge. */}
          <Stack.Screen
            name="symbol/[symbol]"
            options={{
              gestureEnabled: true,
              fullScreenGestureEnabled: false,
            }}
          />
        </Stack>
      </View>
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <SubscriptionProvider>
            <ReferralProvider>
              <WatchlistProvider>
                <PortfolioProvider>
                    <UserProfileProvider>
                      <WebSocketProvider
                        autoConnect={true}  // Twelve Data WebSocket for real-time streaming
                        initialSymbols={DEFAULT_STREAMING_SYMBOLS}
                      >
                        <AppInitializer>
                          <ThemedApp />
                        </AppInitializer>
                      </WebSocketProvider>
                    </UserProfileProvider>
                </PortfolioProvider>
              </WatchlistProvider>
            </ReferralProvider>
          </SubscriptionProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
