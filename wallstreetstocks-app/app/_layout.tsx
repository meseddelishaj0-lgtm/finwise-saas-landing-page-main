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
import { useAuth } from "@/lib/auth";
import { preloadAppData } from "../utils/preload";

// Default symbols to stream (major indices and popular stocks)
const DEFAULT_STREAMING_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL'];

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
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <SubscriptionProvider>
            <ReferralProvider>
              <WatchlistProvider>
                <StockProvider>
                  <UserProfileProvider>
                    <NotificationProvider>
                      <WebSocketProvider
                        autoConnect={true}
                        initialSymbols={DEFAULT_STREAMING_SYMBOLS}
                      >
                        <AppInitializer>
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
                            />
                          </View>
                        </AppInitializer>
                      </WebSocketProvider>
                    </NotificationProvider>
                  </UserProfileProvider>
                </StockProvider>
              </WatchlistProvider>
            </ReferralProvider>
          </SubscriptionProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
