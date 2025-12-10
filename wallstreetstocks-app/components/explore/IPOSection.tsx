// components/explore/IPOSection.tsx
import React from "react";
import { View, Text } from "react-native";

const ipos = [
  { name: "FinTechX", symbol: "FTX", date: "2025-11-22", priceRange: "$18 - $20" },
  { name: "GreenEnergy Corp", symbol: "GEC", date: "2025-11-25", priceRange: "$24 - $26" },
];

export default function IPOSection() {
  return (
    <View className="mt-4">
      <View className="bg-[#111827] mx-4 rounded-2xl px-4 pt-4 pb-2">
        <Text className="text-gray-400 text-xs mb-2">UPCOMING IPOs</Text>

        {ipos.map((ipo, i) => (
          <View
            key={ipo.symbol}
            className={`flex-row items-center justify-between py-3 ${
              i !== ipos.length - 1 ? "border-b border-gray-800" : ""
            }`}
          >
            <View>
              <Text className="text-white font-semibold">
                {ipo.symbol}
              </Text>
              <Text className="text-gray-400 text-xs">{ipo.name}</Text>
            </View>

            <View className="items-end">
              <Text className="text-gray-300 text-xs">{ipo.date}</Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                {ipo.priceRange}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
