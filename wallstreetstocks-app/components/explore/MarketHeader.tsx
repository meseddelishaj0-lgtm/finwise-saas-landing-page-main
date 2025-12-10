// components/explore/MarketHeader.tsx
import { View, Text, TouchableOpacity } from "react-native";
import React, { useState } from "react";

export default function MarketHeader() {
  const [region, setRegion] = useState("us");

  return (
    <View className="px-4 mt-6">
      <View className="flex-row">
        {["us", "europe", "asia"].map((r) => (
          <TouchableOpacity key={r} onPress={() => setRegion(r)}>
            <Text
              className={`mr-6 text-lg ${
                region === r ? "text-white font-bold" : "text-gray-500"
              }`}
            >
              {r.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

