// components/explore/BondsSection.tsx
import React from "react";
import { View, Text } from "react-native";

const bonds = [
  { name: "U.S. 2 Year Treasury", yield: 4.85, move: 0.03 },
  { name: "U.S. 10 Year Treasury", yield: 4.25, move: -0.05 },
  { name: "U.S. 30 Year Treasury", yield: 4.10, move: -0.02 },
];

export default function BondsSection() {
  return (
    <View className="mt-4">
      <View className="bg-[#111827] mx-4 rounded-2xl px-4 pt-4 pb-2">
        <Text className="text-gray-400 text-xs mb-2">U.S. TREASURIES</Text>

        {bonds.map((b, i) => {
          const isPositive = b.move >= 0;

          return (
            <View
              key={b.name}
              className={`flex-row items-center justify-between py-3 ${
                i !== bonds.length - 1 ? "border-b border-gray-800" : ""
              }`}
            >
              <View className="flex-1 pr-4">
                <Text className="text-white text-xs font-semibold">
                  {b.name}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-white font-semibold">
                  {b.yield.toFixed(2)}%
                </Text>
                <Text
                  className={`text-xs ${
                    isPositive ? "text-green-400" : "text-red-400"
                  } mt-0.5`}
                >
                  {isPositive ? "+" : ""}
                  {b.move.toFixed(2)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
