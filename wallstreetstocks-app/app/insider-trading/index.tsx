// app/insider-trading/index.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';
const BASE_URL = 'https://financialmodelingprep.com/api/v4';

interface InsiderTrade {
  symbol: string;
  filingDate: string;
  transactionDate: string;
  reportingCik: string;
  transactionType: string;
  securitiesOwned: number;
  companyCik: string;
  reportingName: string;
  typeOfOwner: string;
  acquistionOrDisposition: string;
  formType: string;
  securitiesTransacted: number;
  price: number;
  securityName: string;
  link: string;
}

const TRANSACTION_TYPES: { [key: string]: { label: string; color: string; icon: string } } = {
  'P-Purchase': { label: 'Purchase', color: '#34C759', icon: 'arrow-up' },
  'S-Sale': { label: 'Sale', color: '#FF3B30', icon: 'arrow-down' },
  'A-Grant': { label: 'Grant', color: '#007AFF', icon: 'gift' },
  'M-Exempt': { label: 'Option Exercise', color: '#FF9500', icon: 'swap-horizontal' },
  'G-Gift': { label: 'Gift', color: '#AF52DE', icon: 'heart' },
  'D-Sale to Issuer': { label: 'Sale to Issuer', color: '#FF3B30', icon: 'arrow-down' },
  'F-Tax': { label: 'Tax Payment', color: '#8E8E93', icon: 'receipt' },
};

export default function InsiderTradingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [trades, setTrades] = useState<InsiderTrade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<InsiderTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedSymbol, setSearchedSymbol] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'buys' | 'sells'>('all');
  const [stats, setStats] = useState({ totalBuys: 0, totalSells: 0, netActivity: 0 });
  const searchTimeoutRef = useRef<number | null>(null);

  const calculateStats = (tradeData: InsiderTrade[]) => {
    let buys = 0;
    let sells = 0;
    tradeData.forEach((trade: InsiderTrade) => {
      const value = (trade.securitiesTransacted || 0) * (trade.price || 0);
      if (trade.acquistionOrDisposition === 'A') {
        buys += value;
      } else if (trade.acquistionOrDisposition === 'D') {
        sells += value;
      }
    });
    setStats({
      totalBuys: buys,
      totalSells: sells,
      netActivity: buys - sells,
    });
  };

  const fetchInsiderTrades = async (symbol?: string) => {
    try {
      let url = `${BASE_URL}/insider-trading?page=0&apikey=${FMP_API_KEY}`;

      // If symbol is provided, search for that specific symbol
      if (symbol) {
        url = `${BASE_URL}/insider-trading?symbol=${symbol.toUpperCase()}&page=0&apikey=${FMP_API_KEY}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (Array.isArray(data)) {
        const tradeData = data.slice(0, 100);
        setTrades(tradeData);
        setFilteredTrades(tradeData);
        calculateStats(tradeData);
        setSearchedSymbol(symbol || null);
      } else {
        // No results found
        setTrades([]);
        setFilteredTrades([]);
        setStats({ totalBuys: 0, totalSells: 0, netActivity: 0 });
      }
    } catch (error) {
      
      setTrades([]);
      setFilteredTrades([]);
    } finally {
      setLoading(false);
      setSearching(false);
      setRefreshing(false);
    }
  };

  // Search function with debounce
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is empty, fetch all trades
    if (!query.trim()) {
      setSearching(true);
      fetchInsiderTrades();
      return;
    }

    // Check if it looks like a stock symbol (1-5 uppercase letters)
    const isSymbol = /^[A-Za-z]{1,5}$/.test(query.trim());

    if (isSymbol && query.length >= 1) {
      // Debounce the API call
      searchTimeoutRef.current = setTimeout(() => {
        setSearching(true);
        Keyboard.dismiss();
        fetchInsiderTrades(query.trim());
      }, 500);
    } else {
      // For longer queries or non-symbol text, filter locally
      const upperQuery = query.toUpperCase();
      const filtered = trades.filter(
        (trade) =>
          trade.symbol?.toUpperCase().includes(upperQuery) ||
          trade.reportingName?.toUpperCase().includes(upperQuery)
      );
      setFilteredTrades(filtered);
    }
  }, [trades]);

  // Submit search on enter
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      Keyboard.dismiss();
      setSearching(true);
      fetchInsiderTrades(searchQuery.trim());
    }
  };

  useEffect(() => {
    fetchInsiderTrades();
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Apply transaction type filter
    let filtered = trades;

    if (activeFilter === 'buys') {
      filtered = filtered.filter((trade) => trade.acquistionOrDisposition === 'A');
    } else if (activeFilter === 'sells') {
      filtered = filtered.filter((trade) => trade.acquistionOrDisposition === 'D');
    }

    setFilteredTrades(filtered);
  }, [activeFilter, trades]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInsiderTrades();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getTransactionInfo = (trade: InsiderTrade) => {
    const type = TRANSACTION_TYPES[trade.transactionType] || {
      label: trade.acquistionOrDisposition === 'A' ? 'Acquisition' : 'Disposition',
      color: trade.acquistionOrDisposition === 'A' ? '#34C759' : '#FF3B30',
      icon: trade.acquistionOrDisposition === 'A' ? 'arrow-up' : 'arrow-down',
    };
    return type;
  };

  const renderTrade = (trade: InsiderTrade, index: number) => {
    const transactionInfo = getTransactionInfo(trade);
    const totalValue = (trade.securitiesTransacted || 0) * (trade.price || 0);

    return (
      <TouchableOpacity
        key={`${trade.symbol}-${trade.filingDate}-${index}`}
        style={[styles.tradeCard, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/symbol/${trade.symbol}/chart`)}
        activeOpacity={0.7}
      >
        <View style={styles.tradeHeader}>
          <View style={styles.tradeSymbolContainer}>
            <Text style={[styles.tradeSymbol, { color: colors.text }]}>{trade.symbol}</Text>
            <View style={[styles.transactionBadge, { backgroundColor: `${transactionInfo.color}15` }]}>
              <Ionicons name={transactionInfo.icon as any} size={12} color={transactionInfo.color} />
              <Text style={[styles.transactionBadgeText, { color: transactionInfo.color }]}>
                {transactionInfo.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.tradeDate, { color: colors.textTertiary }]}>{formatDate(trade.filingDate)}</Text>
        </View>

        <View style={styles.tradeDetails}>
          <View style={styles.tradeInsider}>
            <Ionicons name="person" size={14} color={colors.textTertiary} />
            <Text style={[styles.insiderName, { color: colors.textSecondary }]} numberOfLines={1}>
              {trade.reportingName || 'Unknown'}
            </Text>
            {trade.typeOfOwner && (
              <View style={[styles.ownerBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.ownerBadgeText, { color: colors.textSecondary }]}>
                  {trade.typeOfOwner === 'director' ? 'DIR' :
                   trade.typeOfOwner === 'officer' ? 'OFF' :
                   trade.typeOfOwner === '10 percent owner' ? '10%' : 'INS'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.tradeNumbers, { borderTopColor: isDark ? colors.border : '#F0F0F0' }]}>
          <View style={styles.tradeNumberItem}>
            <Text style={[styles.tradeNumberLabel, { color: colors.textTertiary }]}>Shares</Text>
            <Text style={[styles.tradeNumberValue, { color: colors.text }]}>
              {formatNumber(trade.securitiesTransacted || 0)}
            </Text>
          </View>
          <View style={styles.tradeNumberItem}>
            <Text style={[styles.tradeNumberLabel, { color: colors.textTertiary }]}>Price</Text>
            <Text style={[styles.tradeNumberValue, { color: colors.text }]}>
              ${(trade.price || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.tradeNumberItem}>
            <Text style={[styles.tradeNumberLabel, { color: colors.textTertiary }]}>Value</Text>
            <Text style={[styles.tradeNumberValue, { color: transactionInfo.color }]}>
              {formatCurrency(totalValue)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDark ? colors.border : '#E5E5EA' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Insider Trading</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: isDark ? colors.surface : '#F0EFFF' }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.card }]}>
            <Ionicons name="briefcase" size={32} color="#5856D6" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Track Insider Activity</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            See what executives and major shareholders are buying and selling
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#34C75915' }]}>
              <Ionicons name="trending-up" size={20} color="#34C759" />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Insider Buys</Text>
            <Text style={[styles.statValue, { color: '#34C759' }]}>
              {formatCurrency(stats.totalBuys)}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#FF3B3015' }]}>
              <Ionicons name="trending-down" size={20} color="#FF3B30" />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Insider Sells</Text>
            <Text style={[styles.statValue, { color: '#FF3B30' }]}>
              {formatCurrency(stats.totalSells)}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: stats.netActivity >= 0 ? '#34C75915' : '#FF3B3015' }]}>
              <Ionicons
                name={stats.netActivity >= 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={20}
                color={stats.netActivity >= 0 ? '#34C759' : '#FF3B30'}
              />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Net Activity</Text>
            <Text style={[styles.statValue, { color: stats.netActivity >= 0 ? '#34C759' : '#FF3B30' }]}>
              {stats.netActivity >= 0 ? '+' : ''}{formatCurrency(stats.netActivity)}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#E5E5EA' }]}>
            <Ionicons name="search" size={20} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by symbol (e.g., AAPL, TSLA)..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearch}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {searching && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
            )}
            {searchQuery.length > 0 && !searching && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchedSymbol(null);
                  setSearching(true);
                  fetchInsiderTrades();
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={handleSearchSubmit}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Popular Symbols */}
        {!searchedSymbol && (
          <View style={styles.popularSection}>
            <Text style={[styles.popularTitle, { color: colors.textSecondary }]}>Popular Stocks</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularScroll}>
              {['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD', 'NFLX', 'JPM'].map((symbol) => (
                <TouchableOpacity
                  key={symbol}
                  style={[styles.popularChip, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#E5E5EA' }]}
                  onPress={() => {
                    setSearchQuery(symbol);
                    setSearching(true);
                    fetchInsiderTrades(symbol);
                  }}
                >
                  <Text style={[styles.popularChipText, { color: colors.primary }]}>{symbol}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Searched Symbol Indicator */}
        {searchedSymbol && (
          <View style={[styles.searchedIndicator, { backgroundColor: isDark ? colors.surface : '#E8F4FD' }]}>
            <Text style={[styles.searchedText, { color: colors.textSecondary }]}>
              Showing insider trades for: <Text style={[styles.searchedSymbol, { color: colors.primary }]}>{searchedSymbol.toUpperCase()}</Text>
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchedSymbol(null);
                setSearching(true);
                fetchInsiderTrades();
              }}
              style={[styles.clearSearchButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.clearSearchText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {[
            { key: 'all', label: 'All Trades' },
            { key: 'buys', label: 'Buys Only' },
            { key: 'sells', label: 'Sells Only' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#E5E5EA' },
                activeFilter === filter.key && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(filter.key as any)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: colors.textSecondary },
                  activeFilter === filter.key && styles.filterTabTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trades List */}
        <View style={styles.tradesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Filings ({filteredTrades.length})
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading insider trades...</Text>
            </View>
          ) : filteredTrades.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No trades found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Try adjusting your search or filter
              </Text>
            </View>
          ) : (
            filteredTrades.map((trade, index) => renderTrade(trade, index))
          )}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Ionicons name="information-circle" size={16} color={colors.textTertiary} />
          <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
            Insider trading data is sourced from SEC Form 4 filings. This information is for educational purposes only and should not be considered investment advice.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F0EFFF',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    marginLeft: 10,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F4FD',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchedText: {
    fontSize: 14,
    color: '#333',
  },
  searchedSymbol: {
    fontWeight: '700',
    color: '#007AFF',
  },
  clearSearchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearSearchText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  popularSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  popularTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  popularScroll: {
    flexDirection: 'row',
  },
  popularChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  popularChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  tradesSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  tradeCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tradeSymbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tradeSymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  transactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  transactionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tradeDate: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tradeDetails: {
    marginBottom: 12,
  },
  tradeInsider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insiderName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  ownerBadge: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },
  tradeNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  tradeNumberItem: {
    alignItems: 'center',
  },
  tradeNumberLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
  },
  tradeNumberValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 18,
  },
});
