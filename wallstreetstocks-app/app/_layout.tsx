// app/_layout.tsx
import { useEffect, useRef, useCallback } from "react";
import { Stack, router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StatusBar, Platform, AppState, Linking, LogBox } from "react-native";
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
import { StockProvider } from "../context/StockContext";
import { WatchlistProvider } from "../context/WatchlistContext";
import { UserProfileProvider } from "../context/UserProfileContext";
import { NotificationProvider } from "../context/NotificationContext";
import { ReferralProvider, useReferral } from "../context/ReferralContext";
import { WebSocketProvider } from "../context/WebSocketContext";
import { PortfolioProvider } from "../context/PortfolioContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
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
  const { initialize, isInitialized, currentTier } = useSubscription();
  const { initializeReferral, initialized: referralInitialized } = useReferral();
  const appState = useRef(AppState.currentState);
  const trackingRequested = useRef(false);

  // Helper: open a URL in the in-app browser, falling back to external browser
  const openArticleUrl = useCallback(async (url: string) => {
    try {
      const WebBrowser = require('expo-web-browser');
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: 1, // Modal — swipe down to return to app
        dismissButtonStyle: 'close',
        enableBarCollapsing: true,
      });
    } catch (e) {
      console.warn('[Notification] In-app browser failed, opening externally:', e);
      Linking.openURL(url).catch(() => {});
    }
  }, []);

  // OneSignal notification tap handler — router is ready here inside the component tree.
  // The click listener itself is registered at module level (above) to catch cold-start taps.
  // This effect sets the processor function and drains any pending events.
  useEffect(() => {
    if (!OneSignal) return;

    const processNotificationClick = async (event: any) => {
      const notification = event?.notification;
      const data = notification?.additionalData || {};

      // Get URL from multiple possible locations (OneSignal v5 puts it in different places):
      // 1. additionalData.url (custom data field — primary, always set by our backend)
      // 2. notification.launchURL (OneSignal standard field — no longer set to avoid native SDK interference)
      // 3. event.result.url (OneSignal click result)
      // 4. notification.url (direct field)
      const articleUrl =
        data.url ||
        notification?.launchURL ||
        event?.result?.url ||
        notification?.url;

      console.log('[OneSignal] Notification tapped:', JSON.stringify({
        additionalData: data,
        launchURL: notification?.launchURL,
        resultUrl: event?.result?.url,
        notificationUrl: notification?.url,
        resolvedUrl: articleUrl,
      }));

      // Wait for navigation stack to be fully mounted on cold start
      await new Promise(resolve => setTimeout(resolve, 800));

      if (data.type === 'price_alert' && data.symbol) {
        router.push(`/symbol/${data.symbol}/chart` as any);
      } else if (data.type === 'market_mover') {
        router.push({ pathname: '/(tabs)/trending', params: { initialTab: 'gainers' } } as any);
      } else if (articleUrl) {
        await openArticleUrl(articleUrl);
      } else {
        // Fallback: no URL or recognized type — navigate to trending
        router.push({ pathname: '/(tabs)/trending' } as any);
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

  // Fallback: catch URLs opened by OneSignal's native SDK on cold start
  // (when the JS click listener hasn't registered in time).
  // Also handles Linking.getInitialURL() for notifications that launched the app.
  useEffect(() => {
    let handled = false;

    const handleUrl = (url: string) => {
      if (handled) return;
      // Only handle external article URLs, not deep links into the app
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        handled = true;
        console.log('[Linking] Opening URL from cold start:', url);
        openArticleUrl(url);
      }
    };

    // Check if the app was launched with a URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Listen for URLs while app is running
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => sub.remove();
  }, []);

  // Update OneSignal user tags for segmentation (Gold/Platinum/Diamond targeting)
  useEffect(() => {
    if (OneSignal && user?.id) {
      OneSignal.login(user.id.toString());
      OneSignal.User.addTags({
        subscription_tier: currentTier || 'free',
        user_id: user.id.toString(),
      });
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

  useEffect(() => {
    if (!isInitialized) {
      initialize(user?.id);
    }

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
        </Stack>
      </View>
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <SubscriptionProvider>
            <ReferralProvider>
              <WatchlistProvider>
                <PortfolioProvider>
                  <StockProvider>
                    <UserProfileProvider>
                      <NotificationProvider>
                        <WebSocketProvider
                          autoConnect={true}  // Twelve Data WebSocket for real-time streaming
                          initialSymbols={DEFAULT_STREAMING_SYMBOLS}
                        >
                          <AppInitializer>
                            <ThemedApp />
                          </AppInitializer>
                        </WebSocketProvider>
                      </NotificationProvider>
                    </UserProfileProvider>
                  </StockProvider>
                </PortfolioProvider>
              </WatchlistProvider>
            </ReferralProvider>
          </SubscriptionProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
