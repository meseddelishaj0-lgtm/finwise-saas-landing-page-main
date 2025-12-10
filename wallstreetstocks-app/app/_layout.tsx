// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SubscriptionProvider, useSubscription } from "../context/SubscriptionContext";
import { StockProvider } from "../context/StockContext";
import { UserProfileProvider } from "../context/UserProfileContext";
import { useAuth } from "@/lib/auth";

const queryClient = new QueryClient();

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { initialize, isInitialized } = useSubscription();

  useEffect(() => {
    if (!isInitialized) {
      initialize(user?.id);
    }
  }, []);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SubscriptionProvider>
          <StockProvider>
            <UserProfileProvider>
              <AppInitializer>
                <View style={{ flex: 1, backgroundColor: "black" }}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                    }}
                  />
                </View>
              </AppInitializer>
            </UserProfileProvider>
          </StockProvider>
        </SubscriptionProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
