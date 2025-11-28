// app/symbol/[symbol]/header.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, useGlobalSearchParams, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';

export default function SymbolHeader() {
  const router = useRouter();
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const segments = useSegments();

  // Extract symbol using multiple methods
  let symbol: string | null = null;
  
  if (localParams.symbol) {
    symbol = Array.isArray(localParams.symbol) ? localParams.symbol[0] : localParams.symbol;
  }
  
  if (!symbol && globalParams.symbol) {
    symbol = Array.isArray(globalParams.symbol) ? globalParams.symbol[0] : globalParams.symbol;
  }
  
  if (!symbol && segments.length >= 2) {
    const symbolIndex = segments.findIndex(seg => seg === 'symbol') + 1;
    if (symbolIndex > 0 && symbolIndex < segments.length) {
      symbol = segments[symbolIndex] as string;
    }
  }

  const cleanSymbol = symbol 
    ? String(symbol)
        .trim()
        .replace(/^\[|\]$/g, '')
        .replace(/[\(\)\{\}]/g, '')
        .replace(/[^A-Za-z0-9.-]/g, '')
        .toUpperCase() 
    : null;

  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number | null>(null);
  const [priceColor, setPriceColor] = useState<'#00C853' | '#FF1744'>('#00C853');

  useEffect(() => {
    if (!cleanSymbol) return;

    const fetchQuote = async () => {
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${cleanSymbol}?apikey=${FMP_API_KEY}`
        );
        const data = await res.json();

        if (data && Array.isArray(data) && data.length > 0) {
          const q = data[0];
          if (q.price !== undefined) {
            setCurrentPrice(q.price);
            setChange(q.change || 0);
            setChangePercent(q.changesPercentage || 0);
            setPriceColor((q.change || 0) >= 0 ? '#00C853' : '#FF1744');
          }
        }
      } catch (err) {
        console.error('Quote fetch error:', err);
      }
    };

    fetchQuote();
    const interval = setInterval(fetchQuote, 30000);
    return () => clearInterval(interval);
  }, [cleanSymbol]);

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.centerSection}>
        <Text style={styles.symbolText}>{cleanSymbol || 'Loading...'}</Text>
        {currentPrice !== null && (
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>${currentPrice.toFixed(2)}</Text>
            {change !== null && (
              <Text style={[styles.changeText, { color: priceColor }]}>
                {change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(2)} ({Math.abs(changePercent || 0).toFixed(2)}%)
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.rightSection}>
        {/* Empty space where Trade button was - now removed */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  leftSection: {
    width: 50,
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 4,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rightSection: {
    width: 50,
    alignItems: 'flex-end',
  },
});
