// components/explore/ETFSection.tsx
import React from "react";
import { View, Text } from "react-native";

const etfs = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF", price: 580.21, changePercent: 0.42 },
  { symbol: "QQQ", name: "Invesco QQQ Trust", price: 495.33, changePercent: 0.88 },
  { symbol: "IWM", name: "iShares Russell 2000", price: 210.18, changePercent: -0.15 },
];

export default function ETFSection() {
  return (
    <View className="mt-4">
      <View className="bg-[#111827] mx-4 rounded-2xl px-4 pt-4 pb-2">
        <Text className="text-gray-400 text-xs mb-2">POPULAR ETFs</Text>

        {etfs.map((etf, i) => {
          const isPositive = etf.changePercent >= 0;

          return (
            <View
              key={etf.symbol}
              className={`flex-row items-center justify-between py-3 ${
                i !== etfs.length - 1 ? "border-b border-gray-800" : ""
              }`}
            >
              <View>
                <Text className="text-white font-semibold">{etf.symbol}</Text>
                <Text className="text-gray-400 text-xs">{etf.name}</Text>
              </View>

              <View className="items-end">
                <Text className="text-white font-semibold">
                  {etf.price.toFixed(2)}
                </Text>
                <Text
                  className={`text-xs ${
                    isPositive ? "text-green-400" : "text-red-400"
                  } mt-0.5`}
                >
                  {isPositive ? "+" : ""}
                  {etf.changePercent.toFixed(2)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
