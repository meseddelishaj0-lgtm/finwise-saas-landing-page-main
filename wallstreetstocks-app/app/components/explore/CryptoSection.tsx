// components/explore/CryptoSection.tsx - FIXED with Live Updates
import React, { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";

const FMP_KEY = "bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU";

interface Crypto {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
}

export default function CryptoSection() {
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const intervalRef = useRef<number | null>(null);

  const fetchCrypto = async () => {
    try {
      console.log('Fetching crypto data...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/BTCUSD,ETHUSD,SOLUSD,ADAUSD,XRPUSD,DOGEUSD?apikey=${FMP_KEY}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Crypto data received:', data?.length || 0);

      if (data && Array.isArray(data) && data.length > 0) {
        const formatted = data.map((c: any) => ({
          symbol: c.symbol.replace("USD", "-USD"),
          name: c.name || c.symbol,
          price: c.price ?? 0,
          changesPercentage: c.changesPercentage ?? 0,
          change: c.change ?? 0,
        }));
        
        setCryptos(formatted);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error('No crypto data available');
      }
    } catch (err: any) {
      console.error('Crypto fetch error:', err);
      
      const errorMessage = err.name === 'AbortError'
        ? 'Request timeout'
        : err.message?.includes('Network')
        ? 'Network error'
        : 'Unable to load crypto data';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCrypto();

    // Set up polling every 30 seconds for live updates
    intervalRef.current = setInterval(() => {
      fetchCrypto();
    }, 30000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchCrypto();
  };

  if (loading && cryptos.length === 0) {
    return (
      <View className="mt-4 mx-4 bg-[#111827] rounded-2xl p-8 items-center">
        <ActivityIndicator color="#0dd977" size="large" />
        <Text className="text-gray-500 mt-2">Loading crypto...</Text>
      </View>
    );
  }

  if (error && cryptos.length === 0) {
    return (
      <View className="mt-4 mx-4 bg-[#111827] rounded-2xl p-6">
        <Text className="text-red-400 text-center mb-3">{error}</Text>
        <TouchableOpacity 
          onPress={handleRetry}
          className="bg-green-500 py-3 px-6 rounded-full self-center"
        >
          <Text className="text-black font-bold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="mt-4">
      <View className="bg-[#111827] mx-4 rounded-2xl px-4 pt-4 pb-2">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-gray-400 text-xs">TOP CRYPTO • LIVE</Text>
          <Text className="text-gray-600 text-[10px]">
            Updated {lastUpdated.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit' 
            })}
          </Text>
        </View>

        {error && (
          <View className="bg-red-500/10 px-3 py-2 rounded-lg mb-2">
            <Text className="text-red-400 text-xs text-center">{error}</Text>
          </View>
        )}

        {cryptos.map((c, i) => {
          const isPositive = c.changesPercentage >= 0;
          const priceColor = isPositive ? 'text-green-400' : 'text-red-400';

          return (
            <View
              key={c.symbol}
              className={`flex-row items-center justify-between py-3 ${
                i !== cryptos.length - 1 ? "border-b border-gray-800" : ""
              }`}
            >
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">
                  {c.symbol}
                </Text>
                <Text className="text-gray-400 text-xs">{c.name}</Text>
              </View>

              <View className="items-end">
                <Text className="text-white font-semibold">
                  ${c.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View className="flex-row items-center">
                  <Text className={`text-xs font-medium ${priceColor}`}>
                    {isPositive ? "↑" : "↓"} {Math.abs(c.changesPercentage).toFixed(2)}%
                  </Text>
                  <Text className={`text-[10px] ml-1 ${priceColor}`}>
                    (${Math.abs(c.change).toFixed(2)})
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Refresh Indicator */}
        {loading && cryptos.length > 0 && (
          <View className="absolute top-2 right-2">
            <ActivityIndicator size="small" color="#0dd977" />
          </View>
        )}
      </View>
    </View>
  );
}

