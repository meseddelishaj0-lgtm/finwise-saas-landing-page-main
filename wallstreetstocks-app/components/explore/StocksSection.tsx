// components/explore/StocksSection.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import Constants from "expo-constants";

const FMP_API_KEY =
  Constants.expoConfig?.extra?.fmpApiKey || "bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU";

type MarketIndex = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
};

const FALLBACK_INDICES: MarketIndex[] = [
  { id: "sp500", name: "S&P 500", symbol: "^GSPC", price: 6642.16, changePercent: 0.38 },
  { id: "dow", name: "DOW", symbol: "^DJI", price: 46138.77, changePercent: 0.10 },
  { id: "nasdaq", name: "NASDAQ", symbol: "^IXIC", price: 22564.23, changePercent: 0.59 },
  { id: "russell", name: "Russell 2000", symbol: "^RUT", price: 2347.89, changePercent: -0.04 },
];

export default function StocksSection() {
  const [indices, setIndices] = useState<MarketIndex[]>(FALLBACK_INDICES);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchIndices = async () => {
      try {
        setLoading(true);

        // FMP majors indexes endpoint
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/majors-indexes?apikey=${FMP_API_KEY}`
        );
        const data = await res.json();

        // Map response to our four indices
        const mapped: MarketIndex[] = [
          {
            id: "sp500",
            name: "S&P 500",
            symbol: "^GSPC",
            price: data.find((d: any) => d.indexName.includes("S&P 500"))?.price ?? 6642.16,
            changePercent:
              data.find((d: any) => d.indexName.includes("S&P 500"))?.changesPercentage ?? 0.38,
          },
          {
            id: "dow",
            name: "DOW",
            symbol: "^DJI",
            price: data.find((d: any) => d.indexName.includes("Dow Jones"))?.price ?? 46138.77,
            changePercent:
              data.find((d: any) => d.indexName.includes("Dow Jones"))?.changesPercentage ?? 0.1,
          },
          {
            id: "nasdaq",
            name: "NASDAQ",
            symbol: "^IXIC",
            price: data.find((d: any) => d.indexName.includes("Nasdaq"))?.price ?? 22564.23,
            changePercent:
              data.find((d: any) => d.indexName.includes("Nasdaq"))?.changesPercentage ?? 0.59,
          },
          {
            id: "russell",
            name: "Russell 2000",
            symbol: "^RUT",
            price:
              data.find((d: any) => d.indexName.toLowerCase().includes("russell 2000"))?.price ??
              2347.89,
            changePercent:
              data.find((d: any) => d.indexName.toLowerCase().includes("russell 2000"))
                ?.changesPercentage ?? -0.04,
          },
        ];

        setIndices(mapped);
      } catch (err) {
        console.warn("Error fetching indices, using fallback", err);
        setIndices(FALLBACK_INDICES);
      } finally {
        setLoading(false);
      }
    };

    fetchIndices();
  }, []);

  return (
    <View className="mt-4">
      {/* Card with indices list */}
      <View className="bg-[#111827] mx-4 rounded-2xl px-4 pt-4 pb-2">
        <Text className="text-gray-400 text-xs mb-2">U.S. MARKETS</Text>

        {loading && (
          <View className="py-6 items-center">
            <ActivityIndicator />
          </View>
        )}

        {!loading &&
          indices.map((idx, i) => {
            const isPositive = idx.changePercent >= 0;
            const dotColors = ["bg-blue-400", "bg-yellow-400", "bg-purple-400", "bg-pink-400"];

            return (
              <View
                key={idx.id}
                className={`flex-row items-center justify-between py-3 ${
                  i !== indices.length - 1 ? "border-b border-gray-800" : ""
                }`}
              >
                <View className="flex-row items-center">
                  <View className={`w-2 h-2 rounded-full mr-2 ${dotColors[i]}`} />
                  <Text className="text-gray-200 font-medium">{idx.name}</Text>
                </View>

                <View className="items-end">
                  <Text className="text-white font-semibold">
                    {idx.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text
                    className={`text-xs ${
                      isPositive ? "text-green-400" : "text-red-400"
                    } mt-0.5`}
                  >
                    {isPositive ? "+" : ""}
                    {idx.changePercent.toFixed(2)}%
                  </Text>
                </View>
              </View>
            );
          })}
      </View>

      {/* Chart + time-frame selector (placeholder box for now) */}
      <View className="mt-4 mx-4">
        <View className="bg-[#020617] rounded-2xl h-44 items-center justify-center">
          <Text className="text-gray-500 text-xs">
            📈 Multi-index chart will go here
          </Text>
        </View>

        <View className="flex-row justify-between mt-3 px-2">
          {["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "ALL"].map((label, idx) => (
            <Text
              key={label}
              className={`text-xs ${
                idx === 0 ? "text-white font-semibold" : "text-gray-500"
              }`}
            >
              {label}
            </Text>
          ))}
        </View>
      </View>

      {/* Live headline bar */}
      <View className="bg-[#111827] mx-4 mt-4 rounded-2xl px-4 py-3">
        <Text className="text-red-400 text-xs font-semibold mb-1">LIVE</Text>
        <Text className="text-gray-200 text-xs">
          Stock market today: Dow, S&amp;P 500, Nasdaq futures move after earnings &amp; macro data.
        </Text>
      </View>
    </View>
  );
}
