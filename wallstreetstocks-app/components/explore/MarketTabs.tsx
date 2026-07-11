// components/explore/MarketTabs.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useLanguage } from "@/context/LanguageContext";

const tabs: Tab[] = ["stocks", "crypto", "etf", "bonds", "ipo"];

type Tab = "stocks" | "crypto" | "etf" | "bonds" | "ipo";

interface MarketTabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export default function MarketTabs({ activeTab, setActiveTab }: MarketTabsProps) {
  const t = useLanguage().t as (key: string) => string;
  return (
    <View className="flex-row px-4 mt-4">
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => setActiveTab(tab)}
          className="mr-4 pb-2"
        >
          <Text
            className={`text-lg ${
              activeTab === tab ? "text-white font-bold" : "text-gray-400"
            }`}
          >
            {t(tab).toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
