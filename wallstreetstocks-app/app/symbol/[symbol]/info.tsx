// app/symbol/[symbol]/info.tsx - FIXED VERSION
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Linking,
  Image
} from "react-native";
import { useLocalSearchParams, useGlobalSearchParams, useSegments } from "expo-router";

const FMP_KEY = "bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU";

interface CompanyProfile {
  symbol: string;
  companyName: string;
  price: number;
  image?: string;
  description?: string;
  ceo?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  industry?: string;
  sector?: string;
  exchange?: string;
  exchangeShortName?: string;
  ipoDate?: string;
  fullTimeEmployees?: number;
}

export default function InfoTab() {
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

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanyInfo = async () => {
    if (!cleanSymbol) {
      setLoading(false);
      setError('No symbol provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching company info for:', cleanSymbol);
      
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
      console.log('Company info received:', data?.length || 0);

      if (data && Array.isArray(data) && data.length > 0) {
        setProfile(data[0]);
        setError(null);
      } else {
        throw new Error('No company information available');
      }
    } catch (err: any) {
      console.error('Company info error:', err);
      
      const errorMessage = err.name === 'AbortError'
        ? 'Request timeout. Please try again.'
        : err.message?.includes('Network')
        ? 'Network error. Check your connection.'
        : `Unable to load company information for ${cleanSymbol}`;
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Info tab mounted with symbol:', cleanSymbol);
    if (cleanSymbol) {
      fetchCompanyInfo();
    }
  }, [cleanSymbol]);

  const handleRetry = () => {
    fetchCompanyInfo();
  };

  const handleWebsitePress = async () => {
    if (profile?.website) {
      try {
        const url = profile.website.startsWith('http') 
          ? profile.website 
          : `https://${profile.website}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        }
      } catch (err) {
        console.error('Error opening website:', err);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00C853" />
        <Text style={styles.loading}>Loading company info...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No information available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Company Header */}
      <View style={styles.headerSection}>
        {profile.image && (
          <Image 
            source={{ uri: profile.image }} 
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <Text style={styles.companyName}>{profile.companyName}</Text>
        <Text style={styles.symbol}>{profile.symbol}</Text>
        {profile.exchange && (
          <Text style={styles.exchange}>
            {profile.exchangeShortName || profile.exchange}
          </Text>
        )}
      </View>

      {/* Description */}
      {profile.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{profile.description}</Text>
        </View>
      )}

      {/* Leadership & Organization */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leadership & Organization</Text>
        {profile.ceo && (
          <InfoRow label="CEO" value={profile.ceo} />
        )}
        {profile.fullTimeEmployees && (
          <InfoRow 
            label="Employees" 
            value={profile.fullTimeEmployees.toLocaleString()} 
          />
        )}
        {profile.sector && (
          <InfoRow label="Sector" value={profile.sector} />
        )}
        {profile.industry && (
          <InfoRow label="Industry" value={profile.industry} />
        )}
        {profile.ipoDate && (
          <InfoRow 
            label="IPO Date" 
            value={new Date(profile.ipoDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} 
          />
        )}
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        
        {profile.website && (
          <TouchableOpacity onPress={handleWebsitePress} style={styles.linkRow}>
            <Text style={styles.label}>Website</Text>
            <Text style={styles.link}>
              {profile.website.replace(/^https?:\/\//, '')}
            </Text>
          </TouchableOpacity>
        )}
        
        {profile.phone && (
          <InfoRow label="Phone" value={profile.phone} />
        )}
        
        {(profile.address || profile.city || profile.state) && (
          <View style={styles.addressRow}>
            <Text style={styles.label}>Address</Text>
            <View style={styles.addressContent}>
              {profile.address && (
                <Text style={styles.value}>{profile.address}</Text>
              )}
              {(profile.city || profile.state || profile.zip) && (
                <Text style={styles.value}>
                  {[profile.city, profile.state, profile.zip]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              )}
              {profile.country && (
                <Text style={styles.value}>{profile.country}</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Additional spacing at bottom */}
      <View style={{ height: 40 }} />
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
    backgroundColor: "#000",
    paddingHorizontal: 32,
  },
  loading: { 
    color: "#888", 
    marginTop: 16, 
    fontSize: 16 
  },
  errorText: {
    color: '#FF1744',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#00C853',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerSection: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
  },
  companyName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  symbol: {
    color: '#00C853',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  exchange: {
    color: '#888',
    fontSize: 14,
  },
  section: { 
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    color: '#00C853',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    color: '#aaa',
    fontSize: 15,
    lineHeight: 24,
  },
  row: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  label: { 
    color: "#888", 
    fontSize: 16,
    flex: 1,
  },
  value: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "500",
    flex: 2,
    textAlign: 'right',
  },
  linkRow: {
    flexDirection: "row", 
    justifyContent: "space-between",
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  link: {
    color: '#00C853',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
    flex: 2,
    textAlign: 'right',
  },
  addressRow: {
    flexDirection: "row", 
    justifyContent: "space-between",
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  addressContent: {
    flex: 2,
    alignItems: 'flex-end',
  },
});
