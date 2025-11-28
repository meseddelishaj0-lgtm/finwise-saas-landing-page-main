import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create ONE global QueryClient
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "black" }}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
