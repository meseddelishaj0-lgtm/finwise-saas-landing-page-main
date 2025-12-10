// app/symbol/[symbol]/fundamentals.tsx - FIXED VERSION
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useGlobalSearchParams, useSegments } from "expo-router";

const FMP_KEY = "bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU";

export default function FundamentalsTab() {
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const segments = useSegments();

  // Extract symbol using multiple methods (same as chart and news)
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

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!cleanSymbol) {
      setLoading(false);
      setError('No symbol provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching fundamentals for:', cleanSymbol);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${cleanSymbol}?apikey=${FMP_KEY}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Profile data received:', data?.length || 0);

      // FMP returns an array — take first item
      if (data && Array.isArray(data) && data.length > 0) {
        setProfile(data[0]);
        setError(null);
      } else {
        // Fallback with minimal data
        setProfile({ 
          symbol: cleanSymbol, 
          companyName: cleanSymbol, 
          price: 0 
        });
        setError(`Limited data available for ${cleanSymbol}`);
      }
    } catch (err: any) {
      console.error('FMP error:', err);
      
      const errorMessage = err.name === 'AbortError'
        ? 'Request timeout. Please try again.'
        : err.message?.includes('Network')
        ? 'Network error. Check your connection.'
        : `Unable to load fundamentals for ${cleanSymbol}`;
      
      setError(errorMessage);
      
      // Set minimal fallback
      setProfile({ 
        symbol: cleanSymbol, 
        companyName: cleanSymbol, 
        price: 0 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Fundamentals mounted with symbol:', cleanSymbol);
    if (cleanSymbol) {
      fetchProfile();
    }
  }, [cleanSymbol]);

  const handleRetry = () => {
    fetchProfile();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00C853" />
        <Text style={styles.loading}>Loading fundamentals...</Text>
      </View>
    );
  }

  if (!cleanSymbol) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No symbol provided</Text>
      </View>
    );
  }

  const fmtB = (n: number) =>
    n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toFixed(0)}`;

  const safe = (val: any, fallback = "—") => (val != null && val !== 0 ? val : fallback);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        Fundamentals • {safe(profile?.companyName, cleanSymbol)}
      </Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price & Valuation</Text>
        <InfoRow label="Current Price" value={`$${safe(profile?.price?.toFixed(2), "—")}`} />
        <InfoRow label="Market Cap" value={profile?.mktCap ? fmtB(profile.mktCap) : "—"} />
        <InfoRow label="P/E Ratio" value={safe(profile?.pe?.toFixed(2), "N/A")} />
        <InfoRow label="EPS" value={profile?.eps ? `$${profile.eps.toFixed(2)}` : "—"} />
        <InfoRow label="Beta" value={safe(profile?.beta?.toFixed(2), "N/A")} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>52-Week Range</Text>
        <InfoRow label="52W High" value={profile?.range ? profile.range.split('-')[1]?.trim() : (profile?.yearHigh ? `$${profile.yearHigh.toFixed(2)}` : "—")} />
        <InfoRow label="52W Low" value={profile?.range ? profile.range.split('-')[0]?.trim() : (profile?.yearLow ? `$${profile.yearLow.toFixed(2)}` : "—")} />
        <InfoRow label="Price Change" value={profile?.changes ? `$${profile.changes.toFixed(2)}` : "—"} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dividends & Volume</Text>
        <InfoRow
          label="Dividend Yield"
          value={profile?.lastDiv ? `${(profile.lastDiv * 100).toFixed(2)}%` : "0.00%"}
        />
        <InfoRow
          label="Avg Volume"
          value={profile?.volAvg ? Number(profile.volAvg).toLocaleString() : "—"}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Info</Text>
        <InfoRow label="Exchange" value={safe(profile?.exchangeShortName || profile?.exchange)} />
        <InfoRow label="Sector" value={safe(profile?.sector)} />
        <InfoRow label="Industry" value={safe(profile?.industry)} />
        <InfoRow label="Country" value={safe(profile?.country)} />
        <InfoRow label="Employees" value={safe(profile?.fullTimeEmployees?.toLocaleString())} />
        <InfoRow
          label="IPO Date"
          value={profile?.ipoDate ? new Date(profile.ipoDate).toLocaleDateString() : "—"}
        />
        <InfoRow
          label="Website"
          value={profile?.website ? profile.website.replace(/^https?:\/\//, "") : "—"}
        />
      </View>

      {profile?.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{profile.description}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000" 
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#000" 
  },
  loading: { 
    color: "#888", 
    marginTop: 12, 
    fontSize: 16 
  },
  errorText: {
    color: '#FF1744',
    fontSize: 16,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FF1744',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  retryText: {
    color: '#FF1744',
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: { 
    color: "#fff", 
    fontSize: 22, 
    fontWeight: "bold", 
    padding: 20,
    paddingBottom: 12,
  },
  section: { 
    marginBottom: 32, 
    paddingHorizontal: 20 
  },
  sectionTitle: {
    color: '#00C853',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  label: { 
    color: "#aaa", 
    fontSize: 16 
  },
  value: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600" 
  },
  description: {
    color: '#aaa',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 8,
  },
});

