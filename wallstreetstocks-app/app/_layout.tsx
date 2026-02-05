// app/_layout.tsx
import { useEffect, useRef } from "react";
import { Stack } from "expo-router";
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
import { ThemeProvider } from "../context/ThemeContext";
import { useAuth } from "@/lib/auth";
import { preloadAppData } from "../utils/preload";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { initializeSentry } from "../utils/sentry";

// Initialize Sentry for crash reporting
initializeSentry();

// Initialize OneSignal for push notifications
// Use config value with hardcoded fallback for production builds
const ONESIGNAL_APP_ID = Constants.expoConfig?.extra?.oneSignalAppId || 'f964a298-9c86-43a2-bb7f-a9f0cc8dac24';
console.log('[OneSignal] App ID:', ONESIGNAL_APP_ID);
console.log('[OneSignal] App ID from config:', Constants.expoConfig?.extra?.oneSignalAppId);
console.log('[OneSignal] Module loaded:', !!OneSignal);

if (OneSignal && ONESIGNAL_APP_ID) {
  // Debug logging - remove in production
  OneSignal.Debug.setLogLevel(6);

  console.log('[OneSignal] Initializing...');

  // Initialize OneSignal
  OneSignal.initialize(ONESIGNAL_APP_ID);

  console.log('[OneSignal] Initialized successfully');

  // Listen for subscription changes
  OneSignal.User.pushSubscription.addEventListener('change', (subscription: any) => {
    console.log('[OneSignal] Subscription changed:', JSON.stringify(subscription, null, 2));
  });

  // Note: Permission request moved to AppInitializer useEffect for proper timing
} else {
  console.log('[OneSignal] NOT initialized - missing module or App ID');
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

  // Request OneSignal push notification permission after app is ready
  const notificationPermissionRequested = useRef(false);
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (OneSignal && !notificationPermissionRequested.current) {
        notificationPermissionRequested.current = true;
        console.log('[OneSignal] Waiting 2s before requesting permission...');
        // Delay to ensure app is fully ready - iOS may ignore early requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('[OneSignal] Requesting notification permission...');
        // Request notification permission (shows iOS prompt)
        const result = await OneSignal.Notifications.requestPermission(true);
        console.log('[OneSignal] Permission result:', result);

        // Check subscription status
        const pushSubscription = OneSignal.User.pushSubscription;
        console.log('[OneSignal] Push subscription ID:', pushSubscription?.id);
        console.log('[OneSignal] Push subscription token:', pushSubscription?.token);
      }
    };
    requestNotificationPermission();
  }, []);

  // Update OneSignal user tags for segmentation (Gold/Platinum/Diamond targeting)
  useEffect(() => {
    if (OneSignal && user?.id) {
      // Set external user ID for targeting specific users
      OneSignal.login(user.id.toString());

      // Set tags for segmentation
      OneSignal.User.addTags({
        subscription_tier: currentTier || 'free',
        user_id: user.id.toString(),
      });
    }
  }, [user?.id, currentTier]);

  // Request App Tracking Transparency permission on iOS (required for personalized ads)
  // Delay ensures app is fully loaded - iOS ignores ATT requests if called too early
  // AdMob is initialized AFTER ATT consent (GADDelayAppMeasurementInit in app.json)
  useEffect(() => {
    const initializeAdsWithConsent = async () => {
      // On iOS, request ATT first, then initialize ads
      if (Platform.OS === 'ios' && !trackingRequested.current) {
        trackingRequested.current = true;

        // Wait 1 second for app to be fully ready before showing ATT prompt
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Request tracking permission
        if (requestTrackingPermissionsAsync) {
          try {
            await requestTrackingPermissionsAsync();
          } catch {
            // Tracking permission request failed - ads will be non-personalized
          }
        }

        // Initialize Google Mobile Ads AFTER ATT consent (regardless of user choice)
        if (mobileAds) {
          try {
            await mobileAds().initialize();
          } catch {
            // AdMob initialization failed
          }
        }
      } else if (Platform.OS === 'android') {
        // On Android, just initialize ads (no ATT needed)
        if (mobileAds) {
          try {
            await mobileAds().initialize();
          } catch {
            // AdMob initialization failed
          }
        }
      }
    };
    initializeAdsWithConsent();
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
                            <ErrorBoundary>
                              <View style={{ flex: 1, backgroundColor: "black" }}>
                                <StatusBar
                                  barStyle="light-content"
                                  backgroundColor="black"
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
                                </Stack>
                              </View>
                            </ErrorBoundary>
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
