// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StatusBar, Platform } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SubscriptionProvider, useSubscription } from "../context/SubscriptionContext";
import { StockProvider } from "../context/StockContext";
import { WatchlistProvider } from "../context/WatchlistContext";
import { UserProfileProvider } from "../context/UserProfileContext";
import { NotificationProvider } from "../context/NotificationContext";
import { ReferralProvider, useReferral } from "../context/ReferralContext";
import { useAuth } from "@/lib/auth";

const queryClient = new QueryClient();

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { initialize, isInitialized } = useSubscription();
  const { initializeReferral, initialized: referralInitialized } = useReferral();

  useEffect(() => {
    if (!isInitialized) {
      initialize(user?.id);
    }
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
