// app/_layout.tsx
import { useEffect, useRef, useCallback } from "react";
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
if (OneSignal && ONESIGNAL_APP_ID) {
  OneSignal.initialize(ONESIGNAL_APP_ID);
  // Click handler registered inside AppInitializer where router is mounted
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

  // OneSignal notification tap handler — router is ready here inside the component tree
  useEffect(() => {
    if (!OneSignal) return;

    const handleNotificationClick = async (event: any) => {
      // Prevent OneSignal from auto-opening launchURL in system browser
      // We handle all URL opening ourselves with the in-app browser
      if (event.preventDefault) {
        event.preventDefault();
      }

      const notification = event.notification;
      const data = notification?.additionalData || {};

      // Get URL from multiple possible locations:
      // 1. additionalData.url (custom field)
      // 2. notification.launchURL (OneSignal standard field)
      const articleUrl = data.url || notification?.launchURL;

      // Small delay to ensure navigation stack is fully mounted on cold start
      await new Promise(resolve => setTimeout(resolve, 500));

      if (data.type === 'price_alert' && data.symbol) {
        // Navigate to stock chart
        router.push(`/symbol/${data.symbol}/chart` as any);
      } else if (data.type === 'market_mover') {
        // Navigate to trending tab
        router.push({ pathname: '/(tabs)/trending', params: { initialTab: 'gainers' } } as any);
      } else if (articleUrl) {
        // Open any article/news URL in the in-app browser
        // This covers: market_news type, launchURL, or any notification with a URL
        try {
          const WebBrowser = require('expo-web-browser');
          await WebBrowser.openBrowserAsync(articleUrl, {
            presentationStyle: 1, // AUTOMATIC - shows as dismissable modal
          });
        } catch {}
      }
    };

    OneSignal.Notifications.addEventListener('click', handleNotificationClick);
    return () => {
      OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
    };
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
