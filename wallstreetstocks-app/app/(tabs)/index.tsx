// app/(tabs)/index.tsx - REDESIGNED CLEAN WHITE VERSION WITH WATCHLIST
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { LineChart as GiftedLineChart } from 'react-native-gifted-charts';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '@/context/SubscriptionContext';

const { width } = Dimensions.get('window');
const chartWidth = 110;
const portfolioChartWidth = width - 80;

const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Stock picks preview data
const STOCK_PICKS_PREVIEW = [
  { symbol: 'NVDA', category: 'AI & Tech', reason: 'AI chip leader' },
  { symbol: 'AAPL', category: 'Tech Giant', reason: 'Services growth' },
  { symbol: 'MSFT', category: 'Cloud & AI', reason: 'Azure expansion' },
];

export default function Dashboard() {
  const router = useRouter();
  const { isPremium, currentTier } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const [stockPicksData, setStockPicksData] = useState<any[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Add Stock Modal
  const [addStockModal, setAddStockModal] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockShares, setNewStockShares] = useState('');
  const [newStockAvgCost, setNewStockAvgCost] = useState('');
  const [addingStock, setAddingStock] = useState(false);

  // Watchlist Modal
  const [watchlistModal, setWatchlistModal] = useState(false);
  const [watchlistSymbol, setWatchlistSymbol] = useState('');
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [watchlistSearchResults, setWatchlistSearchResults] = useState<any[]>([]);
  const [showWatchlistSearchDropdown, setShowWatchlistSearchDropdown] = useState(false);

  // Watchlist Filter & Sort
  const [watchlistFilter, setWatchlistFilter] = useState<'All' | 'Gainers' | 'Losers'>('All');
  const [watchlistSort, setWatchlistSort] = useState<'My Sort' | 'Name' | 'Price' | 'Change %' | 'Change $'>('My Sort');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Portfolio graph time range
  const [portfolioTimeRange, setPortfolioTimeRange] = useState('1Y');

  // Live Major Indices - Expanded list
  const [majorIndices, setMajorIndices] = useState([
    { symbol: 'SPY', name: 'S&P 500', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'QQQ', name: 'Nasdaq 100', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'DIA', name: 'Dow Jones', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'IWM', name: 'Russell 2000', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'VTI', name: 'Total Market', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'EFA', name: 'Intl Developed', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'EEM', name: 'Emerging Mkts', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'VXX', name: 'Volatility', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'GLD', name: 'Gold', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'SLV', name: 'Silver', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'USO', name: 'Oil', price: 0, change: 0, changePercent: 0, color: '#34C759' },
    { symbol: 'TLT', name: '20+ Yr Treasury', price: 0, change: 0, changePercent: 0, color: '#34C759' },
  ]);
  const [indicesLoading, setIndicesLoading] = useState(true);

  // Live Trending
  const [trending, setTrending] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // Portfolio data
  const [portfolio, setPortfolio] = useState({
    totalValue: 0,
    dayChange: 0,
    dayChangePercent: 0,
    yearChange: 0,
    yearChangePercent: 0,
    holdings: [] as any[],
    chartData: [] as Array<{ value: number; label: string; dataPointText?: string }>,
    chartLabels: [] as string[]
  });

  // User's stock holdings
  const [userHoldings, setUserHoldings] = useState([
    { symbol: 'AAPL', shares: 10, avgCost: 150 },
    { symbol: 'TSLA', shares: 5, avgCost: 200 },
    { symbol: 'MSFT', shares: 8, avgCost: 300 },
  ]);

  // Watchlist state
  const [watchlist, setWatchlist] = useState<string[]>(['NVDA', 'GOOGL', 'AMZN', 'META']);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  // Fetch live market indices data
  const fetchMarketChips = async () => {
    setIndicesLoading(true);
    try {
      const symbols = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'EFA', 'EEM', 'VXX', 'GLD', 'SLV', 'USO', 'TLT'];
      const nameMap: { [key: string]: string } = {
        'SPY': 'S&P 500',
        'QQQ': 'Nasdaq 100',
        'DIA': 'Dow Jones',
        'IWM': 'Russell 2000',
        'VTI': 'Total Market',
        'EFA': 'Intl Developed',
        'EEM': 'Emerging Mkts',
        'VXX': 'Volatility',
        'GLD': 'Gold',
        'SLV': 'Silver',
        'USO': 'Oil',
        'TLT': '20+ Yr Treasury',
      };
      
      const res = await fetch(
        `${BASE_URL}/quote/${symbols.join(',')}?apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

      if (data && Array.isArray(data)) {
        const updated = symbols.map(symbol => {
          const item = data.find((d: any) => d.symbol === symbol);
          if (item) {
            return {
              symbol: item.symbol,
              name: nameMap[item.symbol] || item.symbol,
              price: item.price || 0,
              change: item.change || 0,
              changePercent: item.changesPercentage || 0,
              color: (item.changesPercentage || 0) >= 0 ? '#34C759' : '#FF3B30'
            };
          }
          return {
            symbol,
            name: nameMap[symbol] || symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            color: '#34C759'
          };
        });
        setMajorIndices(updated);
      }
    } catch (err) {
      console.error('Market chips fetch error:', err);
    } finally {
      setIndicesLoading(false);
    }
  };

  // Fetch trending stocks with live data
  const fetchTrending = async () => {
    setTrendingLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/stock_market/actives?limit=6&apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

      if (data && Array.isArray(data)) {
        const trendingData = await Promise.all(
          data.slice(0, 6).map(async (stock: any, idx: number) => {
            try {
              const chartRes = await fetch(
                `${BASE_URL}/historical-chart/5min/${stock.symbol}?apikey=${FMP_API_KEY}`
              );
              const chartData = await chartRes.json();

              const chartValues = chartData && Array.isArray(chartData) 
                ? chartData.slice(0, 30).reverse().map((d: any) => d.close)
                : [stock.price, stock.price * 0.99, stock.price * 1.01, stock.price];

              return {
                symbol: stock.symbol,
                name: stock.name || stock.symbol,
                price: stock.price || 0,
                change: stock.change || 0,
                changePercent: stock.changesPercentage || 0,
                color: (stock.changesPercentage || 0) >= 0 ? '#34C759' : '#FF3B30',
                data: chartValues,
                rank: idx + 1
              };
            } catch (err) {
              return {
                symbol: stock.symbol,
                name: stock.name || stock.symbol,
                price: stock.price || 0,
                change: stock.change || 0,
                changePercent: stock.changesPercentage || 0,
                color: (stock.changesPercentage || 0) >= 0 ? '#34C759' : '#FF3B30',
                data: [stock.price, stock.price, stock.price, stock.price],
                rank: idx + 1
              };
            }
          })
        );

        setTrending(trendingData);
      }
    } catch (err) {
      console.error('Trending fetch error:', err);
    } finally {
      setTrendingLoading(false);
    }
  };

  // Fetch watchlist data
  const fetchWatchlist = async () => {
    if (watchlist.length === 0) {
      setWatchlistData([]);
      setWatchlistLoading(false);
      return;
    }

    setWatchlistLoading(true);
    try {
      const symbols = watchlist.join(',');
      const res = await fetch(
        `${BASE_URL}/quote/${symbols}?apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

      if (data && Array.isArray(data)) {
        const watchlistWithCharts = await Promise.all(
          data.map(async (stock: any) => {
            try {
              const chartRes = await fetch(
                `${BASE_URL}/historical-chart/5min/${stock.symbol}?apikey=${FMP_API_KEY}`
              );
              const chartData = await chartRes.json();

              const chartValues = chartData && Array.isArray(chartData)
                ? chartData.slice(0, 30).reverse().map((d: any) => d.close)
                : [stock.price, stock.price * 0.99, stock.price * 1.01, stock.price];

              return {
                symbol: stock.symbol,
                name: stock.name || stock.symbol,
                price: stock.price || 0,
                change: stock.change || 0,
                changePercent: stock.changesPercentage || 0,
                color: (stock.changesPercentage || 0) >= 0 ? '#34C759' : '#FF3B30',
                data: chartValues,
              };
            } catch (err) {
              return {
                symbol: stock.symbol,
                name: stock.name || stock.symbol,
                price: stock.price || 0,
                change: stock.change || 0,
                changePercent: stock.changesPercentage || 0,
                color: (stock.changesPercentage || 0) >= 0 ? '#34C759' : '#FF3B30',
                data: [stock.price, stock.price, stock.price, stock.price],
              };
            }
          })
        );

        setWatchlistData(watchlistWithCharts);
      }
    } catch (err) {
      console.error('Watchlist fetch error:', err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  // Fetch stock picks preview data
  const fetchStockPicks = async () => {
    try {
      const symbols = STOCK_PICKS_PREVIEW.map(p => p.symbol).join(',');
      const res = await fetch(`${BASE_URL}/quote/${symbols}?apikey=${FMP_API_KEY}`);
      const data = await res.json();

      if (data && Array.isArray(data)) {
        const enrichedPicks = STOCK_PICKS_PREVIEW.map(pick => {
          const quote = data.find((q: any) => q.symbol === pick.symbol);
          return {
            ...pick,
            price: quote?.price || 0,
            change: quote?.change || 0,
            changePercent: quote?.changesPercentage || 0,
          };
        });
        setStockPicksData(enrichedPicks);
      }
    } catch (err) {
      console.error('Stock picks fetch error:', err);
    }
  };

  // Fetch portfolio data with historical chart
  const fetchPortfolio = async () => {
    try {
      if (userHoldings.length === 0) {
        setPortfolio({
          totalValue: 0,
          dayChange: 0,
          dayChangePercent: 0,
          yearChange: 0,
          yearChangePercent: 0,
          holdings: [],
          chartData: [{ value: 0, label: '' }],
          chartLabels: ['']
        });
        return;
      }

      const symbols = userHoldings.map(h => h.symbol).join(',');
      const res = await fetch(
        `${BASE_URL}/quote/${symbols}?apikey=${FMP_API_KEY}`
      );
      const quotes = await res.json();

      if (quotes && Array.isArray(quotes)) {
        const holdings = userHoldings.map((holding) => {
          const quote = quotes.find(q => q.symbol === holding.symbol);
          if (!quote) return null;

          const currentValue = holding.shares * quote.price;
          const costBasis = holding.shares * holding.avgCost;
          const gain = currentValue - costBasis;
          const gainPercent = (gain / costBasis) * 100;

          return {
            ...holding,
            currentPrice: quote.price,
            currentValue,
            gain,
            gainPercent,
            dayChange: quote.change * holding.shares,
          };
        }).filter(h => h !== null);

        const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
        const totalDayChange = holdings.reduce((sum, h) => sum + h.dayChange, 0);
        const totalDayChangePercent = totalValue > 0 ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;

        // Fetch historical data for portfolio chart
        await fetchPortfolioChart(totalValue, holdings);

        setPortfolio(prev => ({
          ...prev,
          totalValue,
          dayChange: totalDayChange,
          dayChangePercent: totalDayChangePercent,
          holdings,
        }));
      }
    } catch (err) {
      console.error('Portfolio fetch error:', err);
    }
  };

  // Fetch portfolio historical chart data
  const fetchPortfolioChart = async (currentValue: number, holdings: any[]) => {
    try {
      let historicalData: any[] = [];
      let labels: string[] = [];
      let fullLabels: string[] = [];

      const today = new Date();
      let daysBack = 365;
      
      switch (portfolioTimeRange) {
        case '1D': daysBack = 1; break;
        case '5D': daysBack = 5; break;
        case '1M': daysBack = 30; break;
        case '6M': daysBack = 180; break;
        case 'YTD': 
          const yearStart = new Date(today.getFullYear(), 0, 1);
          daysBack = Math.floor((today.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
          break;
        case '1Y': daysBack = 365; break;
        case '5Y': daysBack = 1825; break;
        case 'ALL': daysBack = 3650; break;
      }

      const primarySymbol = holdings[0]?.symbol;
      if (!primarySymbol) return;

      const fromDate = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const histRes = await fetch(
        `${BASE_URL}/historical-price-full/${primarySymbol}?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`
      );
      const histData = await histRes.json();

      if (histData?.historical && Array.isArray(histData.historical)) {
        const dataPoints = histData.historical.reverse();
        
        const portfolioValues = dataPoints.map((point: any) => {
          const dayValue = point.close;
          const baseValue = dataPoints[0].close;
          const percentChange = (dayValue - baseValue) / baseValue;
          const costBasis = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
          return costBasis * (1 + percentChange);
        });

        const step = Math.max(1, Math.floor(portfolioValues.length / 100));
        const sampledValues = portfolioValues.filter((_: number, i: number) => i % step === 0);
        const sampledDates = dataPoints.filter((_: any, i: number) => i % step === 0);
        
        // Create data array with labels for each point
        historicalData = sampledValues.map((value: number, idx: number) => {
          const date = new Date(sampledDates[idx].date);
          let label = '';
          
          // Show labels based on position for better visibility
          const totalPoints = sampledValues.length;
          const labelInterval = Math.ceil(totalPoints / 5); // Show ~5 labels
          const showLabel = idx % labelInterval === 0 || idx === totalPoints - 1;
          
          if (showLabel) {
            if (portfolioTimeRange === '1D') {
              label = date.toLocaleTimeString('en-US', { 
                hour: 'numeric',
              });
            } else if (portfolioTimeRange === '5D') {
              label = date.toLocaleDateString('en-US', { 
                weekday: 'short'
              });
            } else {
              label = date.toLocaleDateString('en-US', { 
                month: 'short'
              });
            }
          }
          
          // Full label for tooltip
          let fullLabel = '';
          if (portfolioTimeRange === '1D') {
            fullLabel = date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            });
          } else {
            fullLabel = date.toLocaleDateString('en-US', { 
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
          }
          
          return {
            value: value,
            label: '',
            dataPointText: fullLabel
          };
        });

        // Generate visible labels (fewer for x-axis)
        const labelStep = Math.ceil(historicalData.length / 6);
        labels = historicalData.map((d: any, i: number) => 
          i % labelStep === 0 ? d.label : ''
        );

        const startValue = sampledValues[0] || currentValue;
        const endValue = sampledValues[sampledValues.length - 1] || currentValue;
        const yearChange = endValue - startValue;
        const yearChangePercent = startValue > 0 ? (yearChange / startValue) * 100 : 0;

        setPortfolio(prev => ({
          ...prev,
          chartData: historicalData,
          chartLabels: labels,
          yearChange,
          yearChangePercent
        }));
      }
    } catch (err) {
      console.error('Portfolio chart fetch error:', err);
      setPortfolio(prev => ({
        ...prev,
        chartData: [
          { value: currentValue * 0.7, label: 'Start' },
          { value: currentValue * 0.8, label: '' },
          { value: currentValue * 0.9, label: '' },
          { value: currentValue, label: 'Now' }
        ],
        chartLabels: ['Start', '', '', 'Now']
      }));
    }
  };

  // Add stock to portfolio
  const handleAddStock = async () => {
    if (!newStockSymbol.trim() || !newStockShares.trim() || !newStockAvgCost.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setAddingStock(true);

    try {
      const symbol = newStockSymbol.toUpperCase().trim();
      
      const quoteRes = await fetch(
        `${BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`
      );
      const quoteData = await quoteRes.json();

      if (!quoteData || !Array.isArray(quoteData) || quoteData.length === 0) {
        Alert.alert('Error', `Stock ${symbol} not found`);
        setAddingStock(false);
        return;
      }

      const newHolding = {
        symbol,
        shares: parseFloat(newStockShares),
        avgCost: parseFloat(newStockAvgCost)
      };

      setUserHoldings(prev => [...prev, newHolding]);
      
      setNewStockSymbol('');
      setNewStockShares('');
      setNewStockAvgCost('');
      setAddStockModal(false);

      setTimeout(() => {
        fetchPortfolio();
      }, 500);

      Alert.alert('Success', `${symbol} added to your portfolio!`);
    } catch (err) {
      console.error('Add stock error:', err);
      Alert.alert('Error', 'Failed to add stock. Please try again.');
    } finally {
      setAddingStock(false);
    }
  };

  // Remove stock from portfolio
  const handleRemoveStock = (symbol: string) => {
    Alert.alert(
      'Remove Stock',
      `Are you sure you want to remove ${symbol} from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setUserHoldings(prev => prev.filter(h => h.symbol !== symbol));
            setTimeout(() => {
              fetchPortfolio();
            }, 500);
          }
        }
      ]
    );
  };

  // Add to watchlist
  const handleAddToWatchlist = async (symbol?: string) => {
    const symbolToAdd = symbol || watchlistSymbol.toUpperCase().trim();
    
    if (!symbolToAdd) {
      Alert.alert('Error', 'Please enter a stock symbol');
      return;
    }

    if (watchlist.includes(symbolToAdd)) {
      Alert.alert('Already Added', `${symbolToAdd} is already in your watchlist`);
      setWatchlistSymbol('');
      setShowWatchlistSearchDropdown(false);
      return;
    }

    setAddingToWatchlist(true);

    try {
      // Verify the symbol exists
      const quoteRes = await fetch(
        `${BASE_URL}/quote/${symbolToAdd}?apikey=${FMP_API_KEY}`
      );
      const quoteData = await quoteRes.json();

      if (!quoteData || !Array.isArray(quoteData) || quoteData.length === 0) {
        Alert.alert('Error', `Stock ${symbolToAdd} not found`);
        setAddingToWatchlist(false);
        return;
      }

      setWatchlist(prev => [...prev, symbolToAdd]);
      setWatchlistSymbol('');
      setShowWatchlistSearchDropdown(false);
      setWatchlistModal(false);

      // Refresh watchlist data
      setTimeout(() => {
        fetchWatchlist();
      }, 500);

      Alert.alert('Success', `${symbolToAdd} added to your watchlist!`);
    } catch (err) {
      console.error('Add to watchlist error:', err);
      Alert.alert('Error', 'Failed to add stock. Please try again.');
    } finally {
      setAddingToWatchlist(false);
    }
  };

  // Remove from watchlist
  const handleRemoveFromWatchlist = (symbol: string) => {
    Alert.alert(
      'Remove from Watchlist',
      `Remove ${symbol} from your watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setWatchlist(prev => prev.filter(s => s !== symbol));
            setWatchlistData(prev => prev.filter(s => s.symbol !== symbol));
          }
        }
      ]
    );
  };

  // Search for tickers
  const searchTickers = async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    try {
      const res = await fetch(
        `${BASE_URL}/search?query=${query}&limit=10&apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

      if (data && Array.isArray(data)) {
        setSearchResults(data);
        setShowSearchDropdown(true);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // Search for watchlist tickers
  const searchWatchlistTickers = async (query: string) => {
    if (!query || query.length < 1) {
      setWatchlistSearchResults([]);
      setShowWatchlistSearchDropdown(false);
      return;
    }

    try {
      const res = await fetch(
        `${BASE_URL}/search?query=${query}&limit=8&apikey=${FMP_API_KEY}`
      );
      const data = await res.json();

      if (data && Array.isArray(data)) {
        setWatchlistSearchResults(data);
        setShowWatchlistSearchDropdown(true);
      }
    } catch (err) {
      console.error('Watchlist search error:', err);
    }
  };

  // Debounce search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery) {
        searchTickers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Debounce watchlist search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (watchlistSymbol) {
        searchWatchlistTickers(watchlistSymbol);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [watchlistSymbol]);

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchMarketChips(),
      fetchTrending(),
      fetchPortfolio(),
      fetchWatchlist(),
      fetchStockPicks()
    ]);
    setRefreshing(false);
  };

  // Initial fetch
  useEffect(() => {
    fetchMarketChips();
    fetchTrending();
    fetchPortfolio();
    fetchWatchlist();
    fetchStockPicks();

    const interval = setInterval(() => {
      fetchMarketChips();
      fetchTrending();
      fetchPortfolio();
      fetchWatchlist();
      fetchStockPicks();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Refetch portfolio when time range changes
  useEffect(() => {
    if (portfolio.holdings.length > 0) {
      fetchPortfolio();
    }
  }, [portfolioTimeRange]);

  // Refetch watchlist when watchlist changes
  useEffect(() => {
    fetchWatchlist();
  }, [watchlist.length]);

  // Compute filtered and sorted watchlist
  const getFilteredSortedWatchlist = () => {
    let filtered = [...watchlistData];

    // Apply filter
    if (watchlistFilter === 'Gainers') {
      filtered = filtered.filter(stock => stock.changePercent >= 0);
    } else if (watchlistFilter === 'Losers') {
      filtered = filtered.filter(stock => stock.changePercent < 0);
    }

    // Apply sort
    switch (watchlistSort) {
      case 'Name':
        filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
      case 'Price':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'Change %':
        filtered.sort((a, b) => b.changePercent - a.changePercent);
        break;
      case 'Change $':
        filtered.sort((a, b) => b.change - a.change);
        break;
      case 'My Sort':
      default:
        // Keep original order (order added)
        break;
    }

    return filtered;
  };

  const filteredWatchlist = getFilteredSortedWatchlist();

  // Get icon for index type
  const getIndexIcon = (symbol: string): string => {
    switch (symbol) {
      case 'GLD':
      case 'SLV':
        return 'flash';
      case 'USO':
        return 'water';
      case 'TLT':
        return 'document-text';
      case 'VXX':
        return 'pulse';
      case 'EFA':
      case 'EEM':
        return 'globe';
      default:
        return 'stats-chart';
    }
  };

  return (
    <View style={styles.container}>
      {/* Floating + Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setAddStockModal(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#007AFF" />
        }
        onScrollBeginDrag={() => {
          setShowFilterDropdown(false);
          setShowSortDropdown(false);
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => router.push('/menu')}
          >
            <Text style={styles.menu}>Menu</Text>
          </TouchableOpacity>

          <View style={styles.searchWrapper}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIconHeader} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search stocks, ETFs, bonds..."
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (text.length === 0) {
                    setShowSearchDropdown(false);
                  }
                }}
                onFocus={() => {
                  if (searchQuery && searchResults.length > 0) {
                    setShowSearchDropdown(true);
                  }
                }}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchDropdown(false);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <View style={styles.searchDropdown}>
                <ScrollView 
                  style={styles.searchScrollView}
                  keyboardShouldPersistTaps="handled"
                >
                  {searchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setSearchQuery('');
                        setShowSearchDropdown(false);
                        router.push(`/symbol/${result.symbol}/chart`);
                      }}
                    >
                      <View style={styles.searchResultLeft}>
                        <Text style={styles.searchResultSymbol}>{result.symbol}</Text>
                        <Text style={styles.searchResultName} numberOfLines={1}>
                          {result.name}
                        </Text>
                      </View>
                      <View style={styles.searchResultRight}>
                        <Text style={styles.searchResultExchange}>{result.exchangeShortName}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={() => router.push('/messages')}>
            <Ionicons name="chatbubble-ellipses-outline" size={26} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Live Major Indices - Horizontal Scrollable */}
        <View style={styles.indicesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Market Overview</Text>
            <View style={styles.liveIndicatorContainer}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          
          {indicesLoading ? (
            <View style={styles.indicesLoadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.indicesScrollContent}
            >
              {majorIndices.map((index, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.indexCard}
                  onPress={() => router.push(`/symbol/${index.symbol}/chart`)}
                >
                  <View style={styles.indexCardHeader}>
                    <View style={[styles.indexIconContainer, { backgroundColor: index.color + '15' }]}>
                      <Ionicons 
                        name={getIndexIcon(index.symbol) as any} 
                        size={16} 
                        color={index.color} 
                      />
                    </View>
                    <Text style={styles.indexSymbol}>{index.symbol}</Text>
                  </View>
                  <Text style={styles.indexName} numberOfLines={1}>{index.name}</Text>
                  <Text style={styles.indexPrice}>${index.price.toFixed(2)}</Text>
                  <View style={[styles.indexChangePill, { backgroundColor: index.color + '15' }]}>
                    <Ionicons 
                      name={index.changePercent >= 0 ? 'trending-up' : 'trending-down'} 
                      size={12} 
                      color={index.color} 
                    />
                    <Text style={[styles.indexChange, { color: index.color }]}>
                      {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Enhanced Portfolio Section */}
        <View style={styles.portfolioSection}>
          <View style={styles.portfolioTopRow}>
            <View style={styles.portfolioDropdown}>
              <Text style={styles.portfolioDropdownText}>All Holdings</Text>
              <Ionicons name="chevron-down" size={20} color="#007AFF" />
            </View>
            <TouchableOpacity 
              style={styles.addIconButton}
              onPress={() => setAddStockModal(true)}
            >
              <Ionicons name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.portfolioValueSection}>
            <Text style={styles.portfolioValue}>
              ${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.portfolioChange, { color: portfolio.dayChange >= 0 ? "#00C853" : "#FF3B30" }]}>
              {portfolio.dayChange >= 0 ? '+' : ''}${Math.abs(portfolio.dayChange).toFixed(2)} ({portfolio.dayChange >= 0 ? '+' : ''}{portfolio.dayChangePercent.toFixed(2)}%)
            </Text>
          </View>

          {/* Portfolio Chart */}
          {portfolio.chartData.length > 1 && (
            <View style={styles.portfolioChartContainer}>
              <GiftedLineChart
                areaChart
                data={portfolio.chartData}
                height={200}
                width={portfolioChartWidth}
                curved
                curvature={0.2}
                startFillColor={portfolio.yearChange >= 0 ? '#86EFAC' : '#FCA5A5'}
                startOpacity={0.2}
                endOpacity={0.02}
                color={portfolio.yearChange >= 0 ? '#34D399' : '#FF3B30'}
                thickness={2}
                hideDataPoints
                hideAxesAndRules
                hideYAxisText
                xAxisLabelsHeight={0}
                yAxisLabelPrefix="$"
                backgroundColor="transparent"
                spacing={Math.max(1, (portfolioChartWidth - 40) / portfolio.chartData.length)}
                initialSpacing={10}
                endSpacing={10}
                pointerConfig={{
                  pointerStripHeight: 200,
                  pointerStripColor: '#8E8E93',
                  pointerStripWidth: 2,
                  strokeDashArray: [0],
                  pointerColor: portfolio.yearChange >= 0 ? '#34D399' : '#FF3B30',
                  radius: 7,
                  pointerLabelWidth: 140,
                  pointerLabelHeight: 70,
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: (items: any) => {
                    if (!items?.[0]) return null;
                    
                    const dataPointText = items[0].dataPointText;
                    
                    return (
                      <View style={styles.portfolioTooltip}>
                        <Text style={styles.portfolioTooltipLabel}>
                          {dataPointText || ''}
                        </Text>
                      </View>
                    );
                  },
                }}
              />
              
              {/* Time Range Selector */}
              <View style={styles.timeRangeSelectorContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timeRangeScrollContent}
                >
                  {['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'ALL'].map((range) => (
                    <TouchableOpacity
                      key={range}
                      style={[
                        styles.timeRangeButton,
                        portfolioTimeRange === range && styles.timeRangeButtonActive
                      ]}
                      onPress={() => setPortfolioTimeRange(range)}
                    >
                      <Text style={[
                        styles.timeRangeText,
                        portfolioTimeRange === range && styles.timeRangeTextActive
                      ]}>
                        {range}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.expandButton}>
                  <Ionicons name="expand-outline" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Holdings List */}
          {portfolio.holdings.length > 0 && (
            <View style={styles.holdingsList}>
              <Text style={styles.holdingsTitle}>Holdings</Text>
              {portfolio.holdings.map((holding, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.holdingRow}
                  onPress={() => router.push(`/symbol/${holding.symbol}/chart`)}
                  onLongPress={() => handleRemoveStock(holding.symbol)}
                >
                  <View style={styles.holdingLeft}>
                    <View style={styles.holdingIconContainer}>
                      <Text style={styles.holdingIcon}>{holding.symbol.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                      <Text style={styles.holdingShares}>
                        {holding.shares} shares • ${holding.avgCost.toFixed(2)} avg
                      </Text>
                    </View>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={styles.holdingValue}>
                      ${holding.currentValue.toFixed(2)}
                    </Text>
                    <Text style={[styles.holdingGain, { color: holding.gain >= 0 ? "#34C759" : "#FF3B30" }]}>
                      {holding.gain >= 0 ? '+' : ''}${Math.abs(holding.gain).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {portfolio.holdings.length === 0 && (
            <View style={styles.emptyPortfolio}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="pie-chart-outline" size={48} color="#007AFF" />
              </View>
              <Text style={styles.emptyText}>Start Building Your Portfolio</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add your first stock</Text>
            </View>
          )}
        </View>

        {/* Watchlist Section */}
        <View style={styles.watchlistSection}>
          <View style={styles.watchlistHeader}>
            <View style={styles.watchlistHeaderLeft}>
              <Text style={styles.sectionTitle}>Watchlist</Text>
              <TouchableOpacity 
                style={styles.addWatchlistButtonHeader}
                onPress={() => setWatchlistModal(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <View style={styles.watchlistHeaderRight}>
              {/* Filter Dropdown */}
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.filterButton}
                  onPress={() => {
                    setShowFilterDropdown(!showFilterDropdown);
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={styles.filterButtonText}>{watchlistFilter}</Text>
                  <Ionicons name="chevron-down" size={16} color="#8E8E93" />
                </TouchableOpacity>
                {showFilterDropdown && (
                  <View style={styles.dropdownMenu}>
                    {(['All', 'Gainers', 'Losers'] as const).map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          watchlistFilter === option && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setWatchlistFilter(option);
                          setShowFilterDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          watchlistFilter === option && styles.dropdownItemTextActive
                        ]}>
                          {option}
                        </Text>
                        {watchlistFilter === option && (
                          <Ionicons name="checkmark" size={16} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Sort Dropdown */}
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.filterButton}
                  onPress={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterDropdown(false);
                  }}
                >
                  <Text style={styles.filterButtonText}>{watchlistSort}</Text>
                  <Ionicons name="chevron-down" size={16} color="#8E8E93" />
                </TouchableOpacity>
                {showSortDropdown && (
                  <View style={[styles.dropdownMenu, styles.dropdownMenuRight]}>
                    {(['My Sort', 'Name', 'Price', 'Change %', 'Change $'] as const).map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownItem,
                          watchlistSort === option && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setWatchlistSort(option);
                          setShowSortDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          watchlistSort === option && styles.dropdownItemTextActive
                        ]}>
                          {option}
                        </Text>
                        {watchlistSort === option && (
                          <Ionicons name="checkmark" size={16} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {watchlistLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : watchlistData.length === 0 ? (
            <View style={styles.emptyWatchlist}>
              <View style={styles.emptyWatchlistIconContainer}>
                <Ionicons name="star-outline" size={40} color="#007AFF" />
              </View>
              <Text style={styles.emptyWatchlistText}>Your watchlist is empty</Text>
              <Text style={styles.emptyWatchlistSubtext}>Add stocks to track their performance</Text>
              <TouchableOpacity 
                style={styles.addFirstButton}
                onPress={() => setWatchlistModal(true)}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addFirstButtonText}>Add Stock</Text>
              </TouchableOpacity>
            </View>
          ) : filteredWatchlist.length === 0 ? (
            <View style={styles.emptyWatchlist}>
              <Text style={styles.emptyWatchlistText}>No {watchlistFilter.toLowerCase()} found</Text>
              <Text style={styles.emptyWatchlistSubtext}>Try changing your filter</Text>
            </View>
          ) : (
            <View style={styles.watchlistList}>
              {filteredWatchlist.map((stock, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.watchlistRow}
                  onPress={() => router.push(`/symbol/${stock.symbol}/chart`)}
                  onLongPress={() => handleRemoveFromWatchlist(stock.symbol)}
                >
                  <View style={styles.watchlistRowLeft}>
                    <Text style={styles.watchlistRowSymbol}>{stock.symbol}</Text>
                    <Text style={styles.watchlistRowName} numberOfLines={1}>{stock.name}</Text>
                  </View>
                  
                  <View style={styles.watchlistRowCenter}>
                    <LineChart
                      data={{ 
                        labels: [], 
                        datasets: [{ 
                          data: stock.data.length > 1 ? stock.data : [stock.price, stock.price * 0.99, stock.price * 1.01, stock.price],
                          strokeWidth: 1.5,
                        }] 
                      }}
                      width={80}
                      height={40}
                      chartConfig={{ 
                        backgroundGradientFrom: 'transparent', 
                        backgroundGradientTo: 'transparent',
                        backgroundGradientFromOpacity: 0,
                        backgroundGradientToOpacity: 0,
                        color: () => stock.color, 
                        strokeWidth: 1.5,
                        propsForDots: {
                          r: '0',
                        },
                        propsForBackgroundLines: {
                          stroke: 'transparent',
                        },
                      }}
                      withDots={false}
                      withShadow={false}
                      withHorizontalLabels={false}
                      withVerticalLabels={false}
                      withInnerLines={false}
                      withOuterLines={false}
                      bezier
                      style={styles.watchlistSparkline}
                    />
                  </View>
                  
                  <View style={styles.watchlistRowRight}>
                    <Text style={styles.watchlistRowPrice}>${stock.price.toFixed(2)}</Text>
                    <View style={styles.watchlistRowChangeContainer}>
                      <Ionicons 
                        name={stock.changePercent >= 0 ? 'arrow-up' : 'arrow-down'} 
                        size={12} 
                        color={stock.color} 
                      />
                      <Text style={[styles.watchlistRowChange, { color: stock.color }]}>
                        ${Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Stock Picks Section */}
        <View style={styles.stockPicksSection}>
          <TouchableOpacity
            style={styles.stockPicksCard}
            onPress={() => router.push('/premium/stock-picks')}
            activeOpacity={0.9}
          >
            {/* Header */}
            <View style={styles.stockPicksHeader}>
              <View style={styles.stockPicksHeaderLeft}>
                <View style={styles.stockPicksIconBg}>
                  <Ionicons name="trophy" size={20} color="#FFD700" />
                </View>
                <View>
                  <Text style={styles.stockPicksTitle}>Stock Picks</Text>
                  <Text style={styles.stockPicksSubtitle}>
                    {isPremium
                      ? `${currentTier === 'gold' ? '5' : currentTier === 'platinum' ? '8' : '15'} expert picks`
                      : 'Expert curated selections'}
                  </Text>
                </View>
              </View>
              <View style={styles.stockPicksBadge}>
                {isPremium ? (
                  <View style={[styles.tierBadge, {
                    backgroundColor: currentTier === 'diamond' ? '#B9F2FF' : currentTier === 'platinum' ? '#E5E4E2' : '#FFD700'
                  }]}>
                    <Ionicons name={currentTier === 'gold' ? 'star' : 'diamond'} size={12} color="#000" />
                    <Text style={styles.tierBadgeText}>
                      {currentTier?.charAt(0).toUpperCase()}{currentTier?.slice(1)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="lock-closed" size={12} color="#FFD700" />
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Preview Cards */}
            <View style={styles.stockPicksPreview}>
              {(stockPicksData.length > 0 ? stockPicksData : STOCK_PICKS_PREVIEW).map((pick, idx) => (
                <View key={idx} style={styles.pickPreviewCard}>
                  <View style={styles.pickPreviewLeft}>
                    <View style={[styles.pickRankBadge, {
                      backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32'
                    }]}>
                      <Text style={styles.pickRankText}>#{idx + 1}</Text>
                    </View>
                    <View>
                      <Text style={styles.pickSymbol}>{pick.symbol}</Text>
                      <Text style={styles.pickCategory}>{pick.category}</Text>
                    </View>
                  </View>
                  <View style={styles.pickPreviewRight}>
                    {isPremium && stockPicksData.length > 0 ? (
                      <>
                        <Text style={styles.pickPrice}>${pick.price?.toFixed(2)}</Text>
                        <View style={[styles.pickChangeContainer, {
                          backgroundColor: (pick.changePercent || 0) >= 0 ? '#34C75915' : '#FF3B3015'
                        }]}>
                          <Ionicons
                            name={(pick.changePercent || 0) >= 0 ? 'arrow-up' : 'arrow-down'}
                            size={10}
                            color={(pick.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30'}
                          />
                          <Text style={[styles.pickChange, {
                            color: (pick.changePercent || 0) >= 0 ? '#34C759' : '#FF3B30'
                          }]}>
                            {Math.abs(pick.changePercent || 0).toFixed(2)}%
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.pickLockedOverlay}>
                        <Ionicons name="lock-closed" size={14} color="#8E8E93" />
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* CTA */}
            <View style={styles.stockPicksCTA}>
              <Text style={styles.stockPicksCTAText}>
                {isPremium ? 'View All Picks' : 'Unlock Stock Picks'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#007AFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Trending Section */}
        <View style={styles.trendingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
            <View style={styles.liveIndicatorContainer}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          {trendingLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.trendingScroll}
            >
              {trending.map((stock, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.trendingCard}
                  onPress={() => router.push(`/symbol/${stock.symbol}/chart`)}
                >
                  <View style={styles.trendingHeader}>
                    <Text style={styles.trendingSymbol}>{stock.symbol}</Text>
                    <Ionicons 
                      name={stock.changePercent >= 0 ? 'trending-up' : 'trending-down'} 
                      size={16} 
                      color={stock.color} 
                    />
                  </View>
                  
                  <Text style={styles.trendingPrice}>${stock.price.toFixed(2)}</Text>
                  
                  <LineChart
                    data={{ 
                      labels: stock.data.map(() => ''), 
                      datasets: [{ 
                        data: stock.data.length > 0 ? stock.data : [stock.price],
                        strokeWidth: 2,
                      }] 
                    }}
                    width={chartWidth}
                    height={50}
                    chartConfig={{ 
                      backgroundGradientFrom: '#fff', 
                      backgroundGradientTo: '#fff',
                      backgroundGradientFromOpacity: 0,
                      backgroundGradientToOpacity: 0,
                      color: (opacity = 1) => stock.color, 
                      strokeWidth: 2,
                      propsForDots: {
                        r: '0',
                      },
                    }}
                    withDots={false}
                    withShadow={false}
                    withHorizontalLabels={false}
                    withVerticalLabels={false}
                    withInnerLines={false}
                    withOuterLines={false}
                    bezier
                    style={styles.miniChart}
                  />
                  
                  <Text style={[styles.trendingChange, { color: stock.color }]}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Add Stock Modal */}
      <Modal
        visible={addStockModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddStockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Stock</Text>
                <Text style={styles.modalSubtitle}>Add to your portfolio</Text>
              </View>
              <TouchableOpacity onPress={() => setAddStockModal(false)}>
                <Ionicons name="close-circle" size={32} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock Symbol</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., AAPL"
                  placeholderTextColor="#999"
                  value={newStockSymbol}
                  onChangeText={setNewStockSymbol}
                  autoCapitalize="characters"
                  editable={!addingStock}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Shares</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="10"
                    placeholderTextColor="#999"
                    value={newStockShares}
                    onChangeText={setNewStockShares}
                    keyboardType="decimal-pad"
                    editable={!addingStock}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Avg Cost ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="150.00"
                    placeholderTextColor="#999"
                    value={newStockAvgCost}
                    onChangeText={setNewStockAvgCost}
                    keyboardType="decimal-pad"
                    editable={!addingStock}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, addingStock && styles.modalButtonDisabled]}
                onPress={handleAddStock}
                disabled={addingStock}
              >
                {addingStock ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Add to Portfolio</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Watchlist Modal */}
      <Modal
        visible={watchlistModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setWatchlistModal(false);
          setWatchlistSymbol('');
          setShowWatchlistSearchDropdown(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add to Watchlist</Text>
                <Text style={styles.modalSubtitle}>Track stocks you're interested in</Text>
              </View>
              <TouchableOpacity onPress={() => {
                setWatchlistModal(false);
                setWatchlistSymbol('');
                setShowWatchlistSearchDropdown(false);
              }}>
                <Ionicons name="close-circle" size={32} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Search Stock</Text>
                <View style={styles.watchlistSearchContainer}>
                  <Ionicons name="search" size={20} color="#8E8E93" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.watchlistSearchInput}
                    placeholder="Search by symbol or company name"
                    placeholderTextColor="#999"
                    value={watchlistSymbol}
                    onChangeText={(text) => {
                      setWatchlistSymbol(text);
                      if (text.length === 0) {
                        setShowWatchlistSearchDropdown(false);
                      }
                    }}
                    autoCapitalize="characters"
                    editable={!addingToWatchlist}
                  />
                  {watchlistSymbol.length > 0 && (
                    <TouchableOpacity onPress={() => {
                      setWatchlistSymbol('');
                      setShowWatchlistSearchDropdown(false);
                    }}>
                      <Ionicons name="close-circle" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Watchlist Search Dropdown */}
                {showWatchlistSearchDropdown && watchlistSearchResults.length > 0 && (
                  <View style={styles.watchlistSearchDropdown}>
                    <ScrollView 
                      style={styles.watchlistSearchScrollView}
                      keyboardShouldPersistTaps="handled"
                    >
                      {watchlistSearchResults.map((result, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.watchlistSearchResultItem}
                          onPress={() => handleAddToWatchlist(result.symbol)}
                        >
                          <View style={styles.watchlistSearchResultLeft}>
                            <Text style={styles.watchlistSearchResultSymbol}>{result.symbol}</Text>
                            <Text style={styles.watchlistSearchResultName} numberOfLines={1}>
                              {result.name}
                            </Text>
                          </View>
                          <View style={styles.watchlistSearchResultRight}>
                            {watchlist.includes(result.symbol) ? (
                              <View style={styles.alreadyAddedBadge}>
                                <Ionicons name="checkmark" size={14} color="#34C759" />
                                <Text style={styles.alreadyAddedText}>Added</Text>
                              </View>
                            ) : (
                              <View style={styles.addBadge}>
                                <Ionicons name="add" size={16} color="#007AFF" />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Popular Stocks Quick Add */}
              <View style={styles.quickAddSection}>
                <Text style={styles.quickAddTitle}>Popular Stocks</Text>
                <View style={styles.quickAddGrid}>
                  {['AAPL', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META'].map((symbol) => (
                    <TouchableOpacity
                      key={symbol}
                      style={[
                        styles.quickAddChip,
                        watchlist.includes(symbol) && styles.quickAddChipAdded
                      ]}
                      onPress={() => !watchlist.includes(symbol) && handleAddToWatchlist(symbol)}
                      disabled={watchlist.includes(symbol)}
                    >
                      {watchlist.includes(symbol) && (
                        <Ionicons name="checkmark" size={14} color="#34C759" style={{ marginRight: 4 }} />
                      )}
                      <Text style={[
                        styles.quickAddChipText,
                        watchlist.includes(symbol) && styles.quickAddChipTextAdded
                      ]}>
                        {symbol}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, (!watchlistSymbol.trim() || addingToWatchlist) && styles.modalButtonDisabled]}
                onPress={() => handleAddToWatchlist()}
                disabled={!watchlistSymbol.trim() || addingToWatchlist}
              >
                {addingToWatchlist ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="eye" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Add to Watchlist</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F7' 
  },
  scrollView: { flex: 1 },
  content: { paddingBottom: 20 },
  
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 110 : 90,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F7'
  },
  menuButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1.5, 
    borderColor: '#E5E5EA' 
  },
  menu: { 
    fontSize: 15, 
    fontWeight: '600',
    color: '#000'
  },
  searchWrapper: {
    flex: 1,
    marginHorizontal: 12,
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIconHeader: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  searchDropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
  },
  searchScrollView: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  searchResultSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  searchResultName: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  searchResultRight: {
    alignItems: 'flex-end',
  },
  searchResultExchange: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
    backgroundColor: '#007AFF15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  title: { 
    fontSize: 20, 
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5
  },
  
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: '700',
    color: '#000'
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B3015',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  liveText: { 
    color: '#FF3B30', 
    fontSize: 11, 
    fontWeight: '700',
    letterSpacing: 0.5
  },
  
  // Market Indices - Horizontal Scroll
  indicesSection: {
    paddingLeft: 20,
    marginBottom: 24,
  },
  indicesLoadingContainer: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicesScrollContent: {
    paddingRight: 20,
  },
  indexCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    width: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  indexCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  indexIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  indexSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.3,
  },
  indexName: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 6,
  },
  indexPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  indexChangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  indexChange: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  
  // Portfolio Section
  portfolioSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  portfolioTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  portfolioDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  portfolioDropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 6,
  },
  eyeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioValueSection: {
    marginBottom: 24,
  },
  portfolioValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -1,
    marginBottom: 8,
  },
  portfolioChange: {
    fontSize: 20,
    fontWeight: '700',
  },
  
  // Chart
  portfolioChartContainer: {
    marginVertical: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 0,
  },
  portfolioTooltip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  portfolioTooltipLabel: {
    color: '#000',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  xAxisLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
  },
  timeRangeSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    justifyContent: 'space-between',
  },
  timeRangeScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  timeRangeButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  timeRangeButtonActive: {
    backgroundColor: '#D6F0FF',
  },
  timeRangeText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },
  timeRangeTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  expandButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // Holdings
  holdingsList: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
  },
  holdingsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  holdingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  holdingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  holdingIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  holdingSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  holdingShares: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  holdingGain: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyPortfolio: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    color: '#000',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 6,
  },

  // Watchlist Section
  watchlistSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  watchlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  watchlistHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addWatchlistButtonHeader: {
    marginLeft: 8,
  },
  watchlistHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 100,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 36,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 120,
    zIndex: 1000,
  },
  dropdownMenuRight: {
    left: 'auto',
    right: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemActive: {
    backgroundColor: '#007AFF10',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  addWatchlistButton: {
    padding: 4,
  },
  watchlistList: {
    marginTop: 8,
  },
  watchlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  watchlistRowLeft: {
    flex: 1,
    minWidth: 100,
  },
  watchlistRowSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  watchlistRowName: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  watchlistRowCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchlistSparkline: {
    paddingRight: 0,
    marginRight: -10,
  },
  watchlistRowRight: {
    alignItems: 'flex-end',
    minWidth: 110,
  },
  watchlistRowPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  watchlistRowChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  watchlistRowChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyWatchlist: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyWatchlistIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyWatchlistText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
  },
  emptyWatchlistSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 16,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Trending
  trendingSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingScroll: { 
    paddingRight: 20,
  },
  trendingCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 12, 
    marginRight: 12, 
    width: chartWidth + 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  trendingSymbol: { 
    fontWeight: '700', 
    fontSize: 15,
    color: '#000',
  },
  trendingPrice: { 
    fontSize: 18, 
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  miniChart: {
    marginVertical: 4,
    marginHorizontal: -12,
  },
  trendingChange: { 
    fontSize: 13, 
    fontWeight: '700',
    marginTop: 4,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  modalForm: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    color: '#000',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Watchlist Modal Specific
  watchlistSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  watchlistSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  watchlistSearchDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  watchlistSearchScrollView: {
    maxHeight: 200,
  },
  watchlistSearchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  watchlistSearchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  watchlistSearchResultSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  watchlistSearchResultName: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  watchlistSearchResultRight: {
    alignItems: 'flex-end',
  },
  alreadyAddedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C75915',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  alreadyAddedText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
  },
  addBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddSection: {
    marginBottom: 20,
  },
  quickAddTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  quickAddChipAdded: {
    backgroundColor: '#34C75915',
    borderColor: '#34C75930',
  },
  quickAddChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  quickAddChipTextAdded: {
    color: '#34C759',
  },

  // Stock Picks Section
  stockPicksSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  stockPicksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFD70030',
  },
  stockPicksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockPicksHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockPicksIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockPicksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  stockPicksSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  stockPicksBadge: {},
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
  },
  stockPicksPreview: {
    gap: 10,
    marginBottom: 16,
  },
  pickPreviewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9FB',
    padding: 12,
    borderRadius: 12,
  },
  pickPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickRankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pickRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  pickSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  pickCategory: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 1,
  },
  pickPreviewRight: {
    alignItems: 'flex-end',
  },
  pickPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  pickChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  pickChange: {
    fontSize: 11,
    fontWeight: '600',
  },
  pickLockedOverlay: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockPicksCTA: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  stockPicksCTAText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});
