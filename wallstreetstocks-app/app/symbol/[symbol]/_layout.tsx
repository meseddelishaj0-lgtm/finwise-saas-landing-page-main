// app/symbol/[symbol]/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import SymbolHeader from "./header";

export default function SymbolLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => <SymbolHeader />,
        tabBarActiveTintColor: "#0dd977",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: { backgroundColor: "#000", borderTopWidth: 0 },
        tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="chart"
        options={{ title: "Chart", tabBarIcon: ({ color }) => <Ionicons name="trending-up" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="news"
        options={{ title: "News", tabBarIcon: ({ color }) => <Ionicons name="newspaper" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="sentiment"
        options={{ title: "Sentiment", tabBarIcon: ({ color }) => <Ionicons name="heart" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ title: "Earnings", tabBarIcon: ({ color }) => <Ionicons name="cash" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="fundamentals"
        options={{ title: "Fundamentals", tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="info"
        options={{ title: "Info", tabBarIcon: ({ color }) => <Ionicons name="information-circle" size={22} color={color} /> }}
      />
      {/* Hide the header file from tabs */}
      <Tabs.Screen
        name="header"
        options={{ 
          href: null, // This prevents it from appearing in tabs
        }}
      />
    </Tabs>
  );
}
