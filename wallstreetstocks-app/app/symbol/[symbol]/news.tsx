// app/symbol/[symbol]/news.tsx - IMPROVED VERSION
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Linking,
  RefreshControl 
} from "react-native";
import { useLocalSearchParams, useGlobalSearchParams, useSegments } from "expo-router";
import { useEffect, useState } from "react";

const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';

interface NewsItem {
  title: string;
  site: string;
  publishedDate: string;
  text: string;
  url: string;
  image?: string;
  symbol: string;
}

export default function NewsTab() {
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const segments = useSegments();
  
  console.log('=== NEWS TAB DEBUG ===');
  console.log('Local params:', JSON.stringify(localParams));
  console.log('Global params:', JSON.stringify(globalParams));
  console.log('Route segments:', segments);
  
  // Try multiple methods to extract symbol
  let symbol: string | null = null;
  
  // Method 1: Local params
  if (localParams.symbol) {
    symbol = Array.isArray(localParams.symbol) ? localParams.symbol[0] : localParams.symbol;
    console.log('Method 1 (local params):', symbol);
  }
  
  // Method 2: Global params
  if (!symbol && globalParams.symbol) {
    symbol = Array.isArray(globalParams.symbol) ? globalParams.symbol[0] : globalParams.symbol;
    console.log('Method 2 (global params):', symbol);
  }
  
  // Method 3: From segments (e.g., ['symbol', 'AAPL', 'news'])
  if (!symbol && segments.length >= 2) {
    const symbolIndex = segments.findIndex(seg => seg === 'symbol') + 1;
    if (symbolIndex > 0 && symbolIndex < segments.length) {
      symbol = segments[symbolIndex] as string;
      console.log('Method 3 (segments):', symbol);
    }
  }
  
  // Method 4: Check if it's in a different param key
  if (!symbol) {
    const allKeys = Object.keys(localParams);
    console.log('All param keys:', allKeys);
    // Sometimes it might be stored differently
    for (const key of allKeys) {
      if (key.includes('symbol') || key.match(/^[A-Z]{1,5}$/)) {
        symbol = String(localParams[key]);
        console.log('Method 4 (key search):', symbol);
        break;
      }
    }
  }
  
  // Clean the symbol - remove brackets, special chars, uppercase
  const cleanSymbol = symbol 
    ? String(symbol)
        .trim()
        .replace(/^\[|\]$/g, '')         // Remove leading/trailing brackets
        .replace(/[\(\)\{\}]/g, '')      // Remove other brackets
        .replace(/[^A-Za-z0-9.-]/g, '')  // Keep only alphanumeric, dots, dashes
        .toUpperCase() 
    : null;
  
  console.log('Final clean symbol:', cleanSymbol);
  console.log('======================');
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (isRefresh = false) => {
    if (!cleanSymbol) {
      console.error('No symbol provided');
      setLoading(false);
      setError('No symbol provided. Please navigate from a stock page.');
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      console.log('Fetching news for symbol:', cleanSymbol);
      
      const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${cleanSymbol}&limit=20&apikey=${FMP_API_KEY}`;
      console.log('Request URL:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, { 
        signal: controller.signal 
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('News data received, type:', typeof data);
      console.log('Is array?', Array.isArray(data));
      console.log('Length:', data?.length);
      console.log('First item:', data?.[0] ? JSON.stringify(data[0]).substring(0, 200) : 'none');

      if (Array.isArray(data) && data.length > 0) {
        console.log('✅ Setting news with', data.length, 'articles');
        setNews(data);
        setError(null);
      } else if (Array.isArray(data) && data.length === 0) {
        console.log('⚠️ Empty array returned');
        setNews([]);
        setError(`No recent news for ${cleanSymbol}`);
      } else {
        console.log('❌ Invalid response format:', typeof data);
        setNews([]);
        setError(`Invalid response from API`);
      }
    } catch (err: any) {
      console.error('❌ News fetch error:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      
      if (err.name === 'AbortError') {
        setError('Request timeout. Please try again.');
      } else if (err.message?.includes('Network')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(`Error loading news: ${err.message}`);
      }
      setNews([]);
    } finally {
      console.log('✅ Fetch complete, setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('NewsTab mounted with cleanSymbol:', cleanSymbol);
    if (cleanSymbol) {
      fetchNews();
    } else {
      console.warn('No symbol provided to NewsTab');
      setLoading(false);
      setError('No symbol provided. Please navigate from a stock page.');
    }
  }, [cleanSymbol]);

  const handleRefresh = () => {
    fetchNews(true);
  };

  const handleArticlePress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error("Can't open URL:", url);
      }
    } catch (err) {
      console.error('Error opening article:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00C853" />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => fetchNews()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No news available for {symbol}</Text>
      </View>
    );
  };

  if (loading && news.length === 0) {
    return renderEmpty();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={news}
        keyExtractor={(item, i) => `${item.url}-${i}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00C853"
            colors={["#00C853"]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => handleArticlePress(item.url)}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <Text style={styles.title} numberOfLines={3}>
                {item.title}
              </Text>
              
              {item.text && (
                <Text style={styles.description} numberOfLines={2}>
                  {item.text}
                </Text>
              )}
              
              <View style={styles.metaContainer}>
                <Text style={styles.source}>
                  {item.site || 'Unknown Source'}
                </Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.date}>
                  {formatDate(item.publishedDate)}
                </Text>
              </View>
            </View>
            
            {/* Optional: Show arrow indicator for external link */}
            <View style={styles.arrowContainer}>
              <Text style={styles.arrow}>→</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#111",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 8,
  },
  description: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    color: "#888",
    fontSize: 13,
    fontWeight: '500',
  },
  dot: {
    color: "#666",
    marginHorizontal: 6,
  },
  date: {
    color: "#888",
    fontSize: 13,
  },
  arrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    color: '#666',
    fontSize: 18,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 400,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#FF1744',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#00C853',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  retryText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

