// app/_layout.tsx
import { useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StatusBar, Platform, AppState } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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

// Default symbols to stream (indices, crypto, and popular stocks)
// Crypto trades 24/7 ensuring live price updates for Apple review outside market hours
const DEFAULT_STREAMING_SYMBOLS = [
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'GLD',  // Indices
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD', 'ADA/USD',  // Crypto (24/7)
  'AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL',  // Popular stocks
];

const queryClient = new QueryClient();

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { initialize, isInitialized } = useSubscription();
  const { initializeReferral, initialized: referralInitialized } = useReferral();
  const appState = useRef(AppState.currentState);

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
