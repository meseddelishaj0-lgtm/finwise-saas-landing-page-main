// app/(tabs)/screener.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { usePremiumFeature, FEATURE_TIERS } from '@/hooks/usePremiumFeature';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';

interface SavedPreset {
  id: string;
  name: string;
  filters: Record<string, string>;
  createdAt: string;
}

// FMP API Key - move to env in production
const FMP_API_KEY = 'bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU';
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FILTER_ITEM_WIDTH = (SCREEN_WIDTH - 60) / 2; // 20px padding on each side + 20px gap

// Types
interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  pe: number | null;
  sector: string;
  roe?: number;
  netIncome?: number;
  freeCashFlow?: number;
  debtToEquity?: number;
  currentRatio?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  revenueGrowth?: number;
  epsGrowth?: number;
  dividendYield?: number;
  priceToBook?: number;
  priceToSales?: number;
  evToEbitda?: number;
}

interface HeatMapStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  marketCap: number;
  sector?: string;
}

interface FilterOption {
  id: string;
  label: string;
  icon: string;
  options: string[];
  category: 'basic' | 'valuation' | 'profitability' | 'financial' | 'growth' | 'premium';
  isPremium?: boolean;
}

interface Preset {
  id: string;
  name: string;
  icon: string;
  gradient: string[];
  description: string;
  isPremium?: boolean;
}

interface ScreenerParams {
  marketCapMoreThan?: number;
  marketCapLowerThan?: number;
  priceMoreThan?: number;
  priceLowerThan?: number;
  betaMoreThan?: number;
  betaLowerThan?: number;
  volumeMoreThan?: number;
  volumeLowerThan?: number;
  dividendMoreThan?: number;
  dividendLowerThan?: number;
  sector?: string;
  industry?: string;
  exchange?: string;
  country?: string;
  limit?: number;
  peMoreThan?: number;
  peLessThan?: number;
  priceToBookMoreThan?: number;
  priceToBookLessThan?: number;
  priceToSalesMoreThan?: number;
  priceToSalesLessThan?: number;
  evToEbitdaMoreThan?: number;
  evToEbitdaLessThan?: number;
  returnOnEquityMoreThan?: number;
  returnOnEquityLessThan?: number;
  returnOnAssetsMoreThan?: number;
  returnOnAssetsLessThan?: number;
  grossMarginMoreThan?: number;
  grossMarginLessThan?: number;
  operatingMarginMoreThan?: number;
  operatingMarginLessThan?: number;
  netMarginMoreThan?: number;
  netMarginLessThan?: number;
  debtToEquityMoreThan?: number;
  debtToEquityLessThan?: number;
  currentRatioMoreThan?: number;
  currentRatioLessThan?: number;
  revenueGrowthMoreThan?: number;
  revenueGrowthLessThan?: number;
  epsGrowthMoreThan?: number;
  epsGrowthLessThan?: number;
  freeCashFlowMoreThan?: number;
  freeCashFlowLessThan?: number;
  netIncomeMoreThan?: number;
  netIncomeLessThan?: number;
}

// Preset Screens
const presets: Preset[] = [
  { id: 'trending', name: 'Trending', icon: 'flame', gradient: ['#FF6B6B', '#FF8E53'], description: 'Most active today' },
  { id: 'gainers', name: 'Top Gainers', icon: 'trending-up', gradient: ['#00C853', '#69F0AE'], description: 'Biggest winners' },
  { id: 'losers', name: 'Top Losers', icon: 'trending-down', gradient: ['#FF5252', '#FF1744'], description: 'Biggest drops' },
  { id: 'heatmap', name: 'Heat Map', icon: 'grid', gradient: ['#8B5CF6', '#EC4899'], description: 'Visual overview' },
  { id: 'undervalued', name: 'Undervalued', icon: 'diamond', gradient: ['#7C4DFF', '#B388FF'], description: 'Low P/E gems' },
  { id: 'dividend', name: 'High Dividend', icon: 'cash', gradient: ['#00BCD4', '#4DD0E1'], description: '4%+ yield' },
  { id: 'quality', name: 'Quality', icon: 'shield-checkmark', gradient: ['#5C6BC0', '#7986CB'], description: 'High ROE & margins' },
  { id: 'growth', name: 'Growth', icon: 'rocket', gradient: ['#FF9800', '#FFB74D'], description: 'Fast growing' },
  { id: 'cashcow', name: 'Cash Cows', icon: 'wallet', gradient: ['#26A69A', '#80CBC4'], description: 'Strong FCF' },
  // Premium Presets
  { id: 'insider', name: 'Insider Buying', icon: 'people', gradient: ['#FFD700', '#FFA000'], description: 'Insider activity', isPremium: true },
  { id: 'momentum', name: 'Momentum', icon: 'flash', gradient: ['#E91E63', '#F06292'], description: 'Strong momentum', isPremium: true },
  { id: 'aipicks', name: 'AI Picks', icon: 'sparkles', gradient: ['#00BFA5', '#1DE9B6'], description: 'AI recommended', isPremium: true },
  { id: 'shortSqueeze', name: 'Short Squeeze', icon: 'arrow-up', gradient: ['#FF6F00', '#FFAB00'], description: 'High short %', isPremium: true },
  { id: 'breakout', name: 'Breakout', icon: 'pulse', gradient: ['#D500F9', '#E040FB'], description: '52W high', isPremium: true },
];

// Filter Categories
const filterCategories: FilterOption[] = [
  { id: 'marketCap', label: 'Market Cap', icon: 'pie-chart', category: 'basic', options: ['Any', 'Mega (>$200B)', 'Large ($10B-$200B)', 'Mid ($2B-$10B)', 'Small ($300M-$2B)', 'Micro (<$300M)'] },
  { id: 'sector', label: 'Sector', icon: 'business', category: 'basic', options: ['Any', 'Technology', 'Healthcare', 'Financial Services', 'Energy', 'Consumer Cyclical', 'Consumer Defensive', 'Industrials', 'Real Estate', 'Utilities', 'Basic Materials', 'Communication Services'] },
  { id: 'price', label: 'Price', icon: 'pricetag', category: 'basic', options: ['Any', 'Under $10', '$10 - $50', '$50 - $100', '$100 - $500', 'Over $500'] },
  { id: 'volume', label: 'Volume', icon: 'bar-chart', category: 'basic', options: ['Any', 'Over 10M', 'Over 5M', 'Over 1M', 'Over 500K', 'Under 500K'] },
  { id: 'exchange', label: 'Exchange', icon: 'globe', category: 'basic', options: ['Any', 'NYSE', 'NASDAQ', 'AMEX'] },
  { id: 'country', label: 'Country', icon: 'flag', category: 'basic', options: ['Any', 'US', 'China', 'UK', 'Canada', 'Germany', 'Japan', 'India', 'France'] },
  { id: 'pe', label: 'P/E Ratio', icon: 'calculator', category: 'valuation', options: ['Any', 'Under 10', '10 - 15', '15 - 20', '20 - 30', '30 - 50', 'Over 50', 'Negative (Loss)'] },
  { id: 'priceToBook', label: 'Price/Book', icon: 'book', category: 'valuation', options: ['Any', 'Under 1', '1 - 2', '2 - 3', '3 - 5', 'Over 5'] },
  { id: 'priceToSales', label: 'Price/Sales', icon: 'cart', category: 'valuation', options: ['Any', 'Under 1', '1 - 2', '2 - 5', '5 - 10', 'Over 10'] },
  { id: 'evToEbitda', label: 'EV/EBITDA', icon: 'analytics', category: 'valuation', options: ['Any', 'Under 5', '5 - 10', '10 - 15', '15 - 20', 'Over 20'] },
  { id: 'dividend', label: 'Dividend Yield', icon: 'cash', category: 'valuation', options: ['Any', 'Over 5%', '3% - 5%', '1% - 3%', 'Under 1%', 'None'] },
  { id: 'roe', label: 'ROE', icon: 'trending-up', category: 'profitability', options: ['Any', 'Over 30%', '20% - 30%', '15% - 20%', '10% - 15%', '5% - 10%', 'Under 5%', 'Negative'] },
  { id: 'roa', label: 'ROA', icon: 'layers', category: 'profitability', options: ['Any', 'Over 15%', '10% - 15%', '5% - 10%', '0% - 5%', 'Negative'] },
  { id: 'grossMargin', label: 'Gross Margin', icon: 'stats-chart', category: 'profitability', options: ['Any', 'Over 70%', '50% - 70%', '30% - 50%', '15% - 30%', 'Under 15%'] },
  { id: 'operatingMargin', label: 'Operating Margin', icon: 'speedometer', category: 'profitability', options: ['Any', 'Over 30%', '20% - 30%', '10% - 20%', '0% - 10%', 'Negative'] },
  { id: 'netMargin', label: 'Net Margin', icon: 'checkmark-circle', category: 'profitability', options: ['Any', 'Over 25%', '15% - 25%', '10% - 15%', '5% - 10%', '0% - 5%', 'Negative'] },
  { id: 'debtToEquity', label: 'Debt/Equity', icon: 'scale', category: 'financial', options: ['Any', 'No Debt', 'Under 0.5', '0.5 - 1', '1 - 2', 'Over 2'] },
  { id: 'currentRatio', label: 'Current Ratio', icon: 'water', category: 'financial', options: ['Any', 'Over 3', '2 - 3', '1.5 - 2', '1 - 1.5', 'Under 1'] },
  { id: 'netIncome', label: 'Net Income', icon: 'cash', category: 'financial', options: ['Any', 'Over $10B', '$1B - $10B', '$100M - $1B', '$0 - $100M', 'Negative'] },
  { id: 'freeCashFlow', label: 'Free Cash Flow', icon: 'wallet', category: 'financial', options: ['Any', 'Over $10B', '$1B - $10B', '$100M - $1B', '$0 - $100M', 'Negative'] },
  { id: 'revenueGrowth', label: 'Revenue Growth', icon: 'arrow-up-circle', category: 'growth', options: ['Any', 'Over 50%', '25% - 50%', '15% - 25%', '5% - 15%', '0% - 5%', 'Negative'] },
  { id: 'epsGrowth', label: 'EPS Growth', icon: 'trending-up', category: 'growth', options: ['Any', 'Over 50%', '25% - 50%', '15% - 25%', '5% - 15%', '0% - 5%', 'Negative'] },
  { id: 'beta', label: 'Beta', icon: 'pulse', category: 'growth', options: ['Any', 'Low (<0.8)', 'Medium (0.8-1.2)', 'High (1.2-1.5)', 'Very High (>1.5)'] },
  // Premium Filters
  { id: 'fiftyTwoWeek', label: '52-Week Range', icon: 'analytics', category: 'premium', options: ['Any', 'Near 52W High (>90%)', 'Upper Half (50-90%)', 'Lower Half (10-50%)', 'Near 52W Low (<10%)'], isPremium: true },
  { id: 'shortInterest', label: 'Short Interest', icon: 'warning', category: 'premium', options: ['Any', 'Over 30%', '20% - 30%', '10% - 20%', '5% - 10%', 'Under 5%'], isPremium: true },
  { id: 'institutionalOwnership', label: 'Institutional %', icon: 'business', category: 'premium', options: ['Any', 'Over 90%', '70% - 90%', '50% - 70%', '30% - 50%', 'Under 30%'], isPremium: true },
  { id: 'analystRating', label: 'Analyst Rating', icon: 'star', category: 'premium', options: ['Any', 'Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'], isPremium: true },
  { id: 'rsi', label: 'RSI (14)', icon: 'speedometer', category: 'premium', options: ['Any', 'Oversold (<30)', 'Neutral (30-70)', 'Overbought (>70)'], isPremium: true },
  { id: 'movingAvg', label: 'Moving Average', icon: 'git-compare', category: 'premium', options: ['Any', 'Above 50 & 200 MA', 'Above 50 MA', 'Below 50 MA', 'Below 50 & 200 MA'], isPremium: true },
  { id: 'earningsDate', label: 'Earnings Date', icon: 'calendar', category: 'premium', options: ['Any', 'Next 7 days', 'Next 30 days', 'Last 7 days', 'Last 30 days'], isPremium: true },
  { id: 'insiderActivity', label: 'Insider Activity', icon: 'people', category: 'premium', options: ['Any', 'Heavy Buying', 'Net Buying', 'No Activity', 'Net Selling', 'Heavy Selling'], isPremium: true },
];

const categoryLabels: Record<string, string> = {
  basic: '📊 Basic',
  valuation: '💰 Valuation',
  profitability: '📈 Profitability',
  financial: '🏦 Financial Health',
  growth: '🚀 Growth',
  premium: '👑 Premium',
};

// Helper Functions
const formatMarketCap = (value: number): string => {
  if (!value) return 'N/A';
  if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  return value.toLocaleString();
};

// Heat Map Color Functions
const getHeatMapColor = (change: number): string => {
  if (change >= 5) return '#00C853';
  if (change >= 3) return '#2E7D32';
  if (change >= 2) return '#43A047';
  if (change >= 1) return '#66BB6A';
  if (change >= 0.5) return '#81C784';
  if (change >= 0) return '#A5D6A7';
  if (change >= -0.5) return '#FFCDD2';
  if (change >= -1) return '#EF9A9A';
  if (change >= -2) return '#E57373';
  if (change >= -3) return '#EF5350';
  if (change >= -5) return '#F44336';
  return '#B71C1C';
};

const getHeatMapTextColor = (change: number): string => {
  if (Math.abs(change) >= 2) return '#FFFFFF';
  return '#000000';
};

const getTileSize = (marketCap: number, maxCap: number, minSize = 55, maxSize = 100): number => {
  if (!maxCap || maxCap === 0) return minSize;
  const ratio = Math.sqrt(marketCap / maxCap);
  return Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * ratio));
};

// Build screener params from filters
const buildScreenerParams = (filters: Record<string, string>): ScreenerParams => {
  const params: ScreenerParams = { limit: 50 };

  if (filters.marketCap) {
    switch (filters.marketCap) {
      case 'Mega (>$200B)': params.marketCapMoreThan = 200000000000; break;
      case 'Large ($10B-$200B)': params.marketCapMoreThan = 10000000000; params.marketCapLowerThan = 200000000000; break;
      case 'Mid ($2B-$10B)': params.marketCapMoreThan = 2000000000; params.marketCapLowerThan = 10000000000; break;
      case 'Small ($300M-$2B)': params.marketCapMoreThan = 300000000; params.marketCapLowerThan = 2000000000; break;
      case 'Micro (<$300M)': params.marketCapLowerThan = 300000000; break;
    }
  }

  if (filters.price) {
    switch (filters.price) {
      case 'Under $10': params.priceLowerThan = 10; break;
      case '$10 - $50': params.priceMoreThan = 10; params.priceLowerThan = 50; break;
      case '$50 - $100': params.priceMoreThan = 50; params.priceLowerThan = 100; break;
      case '$100 - $500': params.priceMoreThan = 100; params.priceLowerThan = 500; break;
      case 'Over $500': params.priceMoreThan = 500; break;
    }
  }

  if (filters.volume) {
    switch (filters.volume) {
      case 'Over 10M': params.volumeMoreThan = 10000000; break;
      case 'Over 5M': params.volumeMoreThan = 5000000; break;
      case 'Over 1M': params.volumeMoreThan = 1000000; break;
      case 'Over 500K': params.volumeMoreThan = 500000; break;
      case 'Under 500K': params.volumeLowerThan = 500000; break;
    }
  }

  if (filters.sector) params.sector = filters.sector;
  if (filters.exchange && filters.exchange !== 'Any') params.exchange = filters.exchange;
  if (filters.country && filters.country !== 'Any') params.country = filters.country;

  if (filters.pe) {
    switch (filters.pe) {
      case 'Under 10': params.peLessThan = 10; params.peMoreThan = 0; break;
      case '10 - 15': params.peMoreThan = 10; params.peLessThan = 15; break;
      case '15 - 20': params.peMoreThan = 15; params.peLessThan = 20; break;
      case '20 - 30': params.peMoreThan = 20; params.peLessThan = 30; break;
      case '30 - 50': params.peMoreThan = 30; params.peLessThan = 50; break;
      case 'Over 50': params.peMoreThan = 50; break;
      case 'Negative (Loss)': params.peLessThan = 0; break;
    }
  }

  if (filters.dividend) {
    switch (filters.dividend) {
      case 'Over 5%': params.dividendMoreThan = 5; break;
      case '3% - 5%': params.dividendMoreThan = 3; params.dividendLowerThan = 5; break;
      case '1% - 3%': params.dividendMoreThan = 1; params.dividendLowerThan = 3; break;
      case 'Under 1%': params.dividendMoreThan = 0; params.dividendLowerThan = 1; break;
      case 'None': params.dividendLowerThan = 0.01; break;
    }
  }

  if (filters.roe) {
    switch (filters.roe) {
      case 'Over 30%': params.returnOnEquityMoreThan = 30; break;
      case '20% - 30%': params.returnOnEquityMoreThan = 20; params.returnOnEquityLessThan = 30; break;
      case '15% - 20%': params.returnOnEquityMoreThan = 15; params.returnOnEquityLessThan = 20; break;
      case '10% - 15%': params.returnOnEquityMoreThan = 10; params.returnOnEquityLessThan = 15; break;
      case '5% - 10%': params.returnOnEquityMoreThan = 5; params.returnOnEquityLessThan = 10; break;
      case 'Under 5%': params.returnOnEquityMoreThan = 0; params.returnOnEquityLessThan = 5; break;
      case 'Negative': params.returnOnEquityLessThan = 0; break;
    }
  }

  if (filters.beta) {
    switch (filters.beta) {
      case 'Low (<0.8)': params.betaLowerThan = 0.8; break;
      case 'Medium (0.8-1.2)': params.betaMoreThan = 0.8; params.betaLowerThan = 1.2; break;
      case 'High (1.2-1.5)': params.betaMoreThan = 1.2; params.betaLowerThan = 1.5; break;
      case 'Very High (>1.5)': params.betaMoreThan = 1.5; break;
    }
  }

  // Price/Book ratio
  if (filters.priceToBook) {
    switch (filters.priceToBook) {
      case 'Under 1': params.priceToBookLessThan = 1; break;
      case '1 - 2': params.priceToBookMoreThan = 1; params.priceToBookLessThan = 2; break;
      case '2 - 3': params.priceToBookMoreThan = 2; params.priceToBookLessThan = 3; break;
      case '3 - 5': params.priceToBookMoreThan = 3; params.priceToBookLessThan = 5; break;
      case 'Over 5': params.priceToBookMoreThan = 5; break;
    }
  }

  // Price/Sales ratio
  if (filters.priceToSales) {
    switch (filters.priceToSales) {
      case 'Under 1': params.priceToSalesLessThan = 1; break;
      case '1 - 2': params.priceToSalesMoreThan = 1; params.priceToSalesLessThan = 2; break;
      case '2 - 5': params.priceToSalesMoreThan = 2; params.priceToSalesLessThan = 5; break;
      case '5 - 10': params.priceToSalesMoreThan = 5; params.priceToSalesLessThan = 10; break;
      case 'Over 10': params.priceToSalesMoreThan = 10; break;
    }
  }

  // EV/EBITDA ratio
  if (filters.evToEbitda) {
    switch (filters.evToEbitda) {
      case 'Under 5': params.evToEbitdaLessThan = 5; break;
      case '5 - 10': params.evToEbitdaMoreThan = 5; params.evToEbitdaLessThan = 10; break;
      case '10 - 15': params.evToEbitdaMoreThan = 10; params.evToEbitdaLessThan = 15; break;
      case '15 - 20': params.evToEbitdaMoreThan = 15; params.evToEbitdaLessThan = 20; break;
      case 'Over 20': params.evToEbitdaMoreThan = 20; break;
    }
  }

  // ROA (Return on Assets)
  if (filters.roa) {
    switch (filters.roa) {
      case 'Over 15%': params.returnOnAssetsMoreThan = 15; break;
      case '10% - 15%': params.returnOnAssetsMoreThan = 10; params.returnOnAssetsLessThan = 15; break;
      case '5% - 10%': params.returnOnAssetsMoreThan = 5; params.returnOnAssetsLessThan = 10; break;
      case '0% - 5%': params.returnOnAssetsMoreThan = 0; params.returnOnAssetsLessThan = 5; break;
      case 'Negative': params.returnOnAssetsLessThan = 0; break;
    }
  }

  // Gross Margin
  if (filters.grossMargin) {
    switch (filters.grossMargin) {
      case 'Over 70%': params.grossMarginMoreThan = 70; break;
      case '50% - 70%': params.grossMarginMoreThan = 50; params.grossMarginLessThan = 70; break;
      case '30% - 50%': params.grossMarginMoreThan = 30; params.grossMarginLessThan = 50; break;
      case '15% - 30%': params.grossMarginMoreThan = 15; params.grossMarginLessThan = 30; break;
      case 'Under 15%': params.grossMarginLessThan = 15; break;
    }
  }

  // Operating Margin
  if (filters.operatingMargin) {
    switch (filters.operatingMargin) {
      case 'Over 30%': params.operatingMarginMoreThan = 30; break;
      case '20% - 30%': params.operatingMarginMoreThan = 20; params.operatingMarginLessThan = 30; break;
      case '10% - 20%': params.operatingMarginMoreThan = 10; params.operatingMarginLessThan = 20; break;
      case '0% - 10%': params.operatingMarginMoreThan = 0; params.operatingMarginLessThan = 10; break;
      case 'Negative': params.operatingMarginLessThan = 0; break;
    }
  }

  // Net Margin
  if (filters.netMargin) {
    switch (filters.netMargin) {
      case 'Over 25%': params.netMarginMoreThan = 25; break;
      case '15% - 25%': params.netMarginMoreThan = 15; params.netMarginLessThan = 25; break;
      case '10% - 15%': params.netMarginMoreThan = 10; params.netMarginLessThan = 15; break;
      case '5% - 10%': params.netMarginMoreThan = 5; params.netMarginLessThan = 10; break;
      case '0% - 5%': params.netMarginMoreThan = 0; params.netMarginLessThan = 5; break;
      case 'Negative': params.netMarginLessThan = 0; break;
    }
  }

  // Debt/Equity
  if (filters.debtToEquity) {
    switch (filters.debtToEquity) {
      case 'No Debt': params.debtToEquityLessThan = 0.01; break;
      case 'Under 0.5': params.debtToEquityLessThan = 0.5; break;
      case '0.5 - 1': params.debtToEquityMoreThan = 0.5; params.debtToEquityLessThan = 1; break;
      case '1 - 2': params.debtToEquityMoreThan = 1; params.debtToEquityLessThan = 2; break;
      case 'Over 2': params.debtToEquityMoreThan = 2; break;
    }
  }

  // Current Ratio
  if (filters.currentRatio) {
    switch (filters.currentRatio) {
      case 'Over 3': params.currentRatioMoreThan = 3; break;
      case '2 - 3': params.currentRatioMoreThan = 2; params.currentRatioLessThan = 3; break;
      case '1.5 - 2': params.currentRatioMoreThan = 1.5; params.currentRatioLessThan = 2; break;
      case '1 - 1.5': params.currentRatioMoreThan = 1; params.currentRatioLessThan = 1.5; break;
      case 'Under 1': params.currentRatioLessThan = 1; break;
    }
  }

  // Revenue Growth
  if (filters.revenueGrowth) {
    switch (filters.revenueGrowth) {
      case 'Over 50%': params.revenueGrowthMoreThan = 50; break;
      case '25% - 50%': params.revenueGrowthMoreThan = 25; params.revenueGrowthLessThan = 50; break;
      case '15% - 25%': params.revenueGrowthMoreThan = 15; params.revenueGrowthLessThan = 25; break;
      case '5% - 15%': params.revenueGrowthMoreThan = 5; params.revenueGrowthLessThan = 15; break;
      case '0% - 5%': params.revenueGrowthMoreThan = 0; params.revenueGrowthLessThan = 5; break;
      case 'Negative': params.revenueGrowthLessThan = 0; break;
    }
  }

  // EPS Growth
  if (filters.epsGrowth) {
    switch (filters.epsGrowth) {
      case 'Over 50%': params.epsGrowthMoreThan = 50; break;
      case '25% - 50%': params.epsGrowthMoreThan = 25; params.epsGrowthLessThan = 50; break;
      case '15% - 25%': params.epsGrowthMoreThan = 15; params.epsGrowthLessThan = 25; break;
      case '5% - 15%': params.epsGrowthMoreThan = 5; params.epsGrowthLessThan = 15; break;
      case '0% - 5%': params.epsGrowthMoreThan = 0; params.epsGrowthLessThan = 5; break;
      case 'Negative': params.epsGrowthLessThan = 0; break;
    }
  }

  return params;
};

// Heat Map Components
const ColorLegend = () => (
  <View style={styles.legendContainer}>
    <Text style={styles.legendLabel}>-5%</Text>
    <LinearGradient
      colors={['#B71C1C', '#F44336', '#FFCDD2', '#A5D6A7', '#43A047', '#00C853']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.legendGradient}
    />
    <Text style={styles.legendLabel}>+5%</Text>
  </View>
);

const HeatMapTile = ({ 
  stock, 
  size, 
  onPress 
}: { 
  stock: HeatMapStock; 
  size: number; 
  onPress: () => void;
}) => {
  const bgColor = getHeatMapColor(stock.changesPercentage);
  const textColor = getHeatMapTextColor(stock.changesPercentage);
  const isLarge = size > 70;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.heatMapTile,
        {
          width: size,
          height: size,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text
        style={[
          styles.heatMapSymbol,
          { color: textColor, fontSize: isLarge ? 12 : 10 },
        ]}
        numberOfLines={1}
      >
        {stock.symbol}
      </Text>
      <Text
        style={[
          styles.heatMapChange,
          { color: textColor, fontSize: isLarge ? 10 : 8 },
        ]}
      >
        {stock.changesPercentage >= 0 ? '+' : ''}
        {stock.changesPercentage.toFixed(2)}%
      </Text>
      {isLarge && (
        <Text
          style={[styles.heatMapPrice, { color: textColor }]}
          numberOfLines={1}
        >
          ${stock.price.toFixed(2)}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default function Screener() {
  const router = useRouter();
  const { canAccess } = usePremiumFeature();
  const hasPlatinumAccess = canAccess(FEATURE_TIERS.SCREENER_FILTERS);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeFilterModal, setActiveFilterModal] = useState<FilterOption | null>(null);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [heatMapStocks, setHeatMapStocks] = useState<HeatMapStock[]>([]);
  const [heatMapLoading, setHeatMapLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string; exchangeShortName: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [results, setResults] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'marketCap' | 'price' | 'changePercent' | 'volume' | 'pe' | 'roe'>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Saved Presets State
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [showSavedPresetsModal, setShowSavedPresetsModal] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'Any').length;

  const getFiltersByCategory = (category: string) => {
    if (category === 'all') return filterCategories;
    return filterCategories.filter(f => f.category === category);
  };

  // Fetch saved presets from API
  const fetchSavedPresets = useCallback(async () => {
    setLoadingPresets(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        setSavedPresets([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/screener-presets?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSavedPresets(data.presets || []);
      }
    } catch (err) {
      console.error('Failed to fetch presets:', err);
    } finally {
      setLoadingPresets(false);
    }
  }, []);

  // Save new preset to API
  const savePreset = async () => {
    if (!newPresetName.trim()) {
      Alert.alert('Error', 'Please enter a name for your preset');
      return;
    }

    if (activeFilterCount === 0) {
      Alert.alert('Error', 'Please select at least one filter to save');
      return;
    }

    setSavingPreset(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Login Required', 'Please log in to save presets');
        setSavingPreset(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/screener-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: newPresetName.trim(),
          filters,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedPresets(prev => [data.preset, ...prev]);
        setShowSavePresetModal(false);
        setNewPresetName('');
        Alert.alert('Success', 'Preset saved successfully!');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to save preset');
      }
    } catch (err) {
      console.error('Failed to save preset:', err);
      Alert.alert('Error', 'Failed to save preset. Please try again.');
    } finally {
      setSavingPreset(false);
    }
  };

  // Delete preset from API
  const deletePreset = async (presetId: string) => {
    setDeletingPresetId(presetId);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`${API_BASE_URL}/screener-presets/${presetId}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSavedPresets(prev => prev.filter(p => p.id !== presetId));
      } else {
        Alert.alert('Error', 'Failed to delete preset');
      }
    } catch (err) {
      console.error('Failed to delete preset:', err);
      Alert.alert('Error', 'Failed to delete preset');
    } finally {
      setDeletingPresetId(null);
    }
  };

  // Load preset filters
  const loadPreset = (preset: SavedPreset) => {
    setFilters(preset.filters);
    setActivePreset(null);
    setShowSavedPresetsModal(false);
    fetchData(null, preset.filters);
  };

  // Handle bookmark button press
  const handleBookmarkPress = () => {
    fetchSavedPresets();
    setShowSavedPresetsModal(true);
  };

  // Fetch Heat Map Data
  const fetchHeatMapData = async () => {
    setHeatMapLoading(true);
    try {
      const [activesRes, gainersRes, losersRes] = await Promise.all([
        fetch(`${FMP_BASE_URL}/stock_market/actives?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/stock_market/gainers?apikey=${FMP_API_KEY}`),
        fetch(`${FMP_BASE_URL}/stock_market/losers?apikey=${FMP_API_KEY}`),
      ]);

      const [actives, gainers, losers] = await Promise.all([
        activesRes.json(),
        gainersRes.json(),
        losersRes.json(),
      ]);

      const allStocks = [...actives, ...gainers, ...losers];
      const uniqueStocks = allStocks.reduce((acc: HeatMapStock[], stock: any) => {
        if (!acc.find(s => s.symbol === stock.symbol)) {
          acc.push({
            symbol: stock.symbol,
            name: stock.name || stock.companyName || stock.symbol,
            price: stock.price || 0,
            change: stock.change || 0,
            changesPercentage: stock.changesPercentage || 0,
            marketCap: stock.marketCap || 0,
            sector: stock.sector || 'Other',
          });
        }
        return acc;
      }, []);

      // Fetch sector info for stocks without it
      const stocksWithoutSector = uniqueStocks.filter(s => !s.sector || s.sector === 'Other');
      if (stocksWithoutSector.length > 0) {
        const symbols = stocksWithoutSector.slice(0, 50).map(s => s.symbol).join(',');
        try {
          const profileRes = await fetch(`${FMP_BASE_URL}/profile/${symbols}?apikey=${FMP_API_KEY}`);
          const profiles = await profileRes.json();
          if (Array.isArray(profiles)) {
            profiles.forEach((profile: any) => {
              const stock = uniqueStocks.find(s => s.symbol === profile.symbol);
              if (stock && profile.sector) {
                stock.sector = profile.sector;
              }
            });
          }
        } catch (err) {
          console.error('Failed to fetch profiles:', err);
        }
      }

      setHeatMapStocks(uniqueStocks);
    } catch (err) {
      console.error('Failed to fetch heat map data:', err);
    } finally {
      setHeatMapLoading(false);
    }
  };

  // API Fetch Functions
  const fetchGainers = async (): Promise<Stock[]> => {
    const response = await fetch(FMP_BASE_URL + '/stock_market/gainers?apikey=' + FMP_API_KEY);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(data.message || 'Failed to fetch gainers');
    return data.slice(0, 50).map((item: any) => ({
      symbol: item.symbol,
      name: item.name || item.symbol,
      price: item.price || 0,
      change: item.change || 0,
      changePercent: item.changesPercentage || 0,
      marketCap: item.marketCap || 0,
      volume: item.volume || 0,
      pe: item.pe || null,
      sector: item.sector || '',
    }));
  };

  const fetchLosers = async (): Promise<Stock[]> => {
    const response = await fetch(FMP_BASE_URL + '/stock_market/losers?apikey=' + FMP_API_KEY);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(data.message || 'Failed to fetch losers');
    return data.slice(0, 50).map((item: any) => ({
      symbol: item.symbol,
      name: item.name || item.symbol,
      price: item.price || 0,
      change: item.change || 0,
      changePercent: item.changesPercentage || 0,
      marketCap: item.marketCap || 0,
      volume: item.volume || 0,
      pe: item.pe || null,
      sector: item.sector || '',
    }));
  };

  const fetchMostActive = async (): Promise<Stock[]> => {
    const response = await fetch(FMP_BASE_URL + '/stock_market/actives?apikey=' + FMP_API_KEY);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(data.message || 'Failed to fetch active stocks');
    return data.slice(0, 50).map((item: any) => ({
      symbol: item.symbol,
      name: item.name || item.symbol,
      price: item.price || 0,
      change: item.change || 0,
      changePercent: item.changesPercentage || 0,
      marketCap: item.marketCap || 0,
      volume: item.volume || 0,
      pe: item.pe || null,
      sector: item.sector || '',
    }));
  };

  const fetchScreenerResults = async (params: ScreenerParams): Promise<Stock[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('apikey', FMP_API_KEY);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    if (!params.exchange) queryParams.append('exchange', 'NYSE,NASDAQ,AMEX');
    queryParams.append('isActivelyTrading', 'true');

    const response = await fetch(FMP_BASE_URL + '/stock-screener?' + queryParams.toString());
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(data.message || 'Invalid screener response');

    return data.map((item: any) => ({
      symbol: item.symbol,
      name: item.companyName || item.symbol,
      price: item.price || 0,
      change: 0,
      changePercent: 0,
      marketCap: item.marketCap || 0,
      volume: item.volume || 0,
      pe: item.pe || null,
      sector: item.sector || '',
    }));
  };

  const fetchQuotes = async (symbols: string[]): Promise<Record<string, any>> => {
    if (symbols.length === 0) return {};
    const symbolString = symbols.slice(0, 50).join(',');
    const response = await fetch(FMP_BASE_URL + '/quote/' + symbolString + '?apikey=' + FMP_API_KEY);
    const data = await response.json();
    const quoteMap: Record<string, any> = {};
    if (Array.isArray(data)) {
      data.forEach((quote: any) => { quoteMap[quote.symbol] = quote; });
    }
    return quoteMap;
  };

  // Search stocks using FMP API
  const searchStocks = async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);
    try {
      const response = await fetch(
        `${FMP_BASE_URL}/search?query=${encodeURIComponent(query)}&limit=10&exchange=NYSE,NASDAQ,AMEX&apikey=${FMP_API_KEY}`
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setSearchResults(data.map((item: any) => ({
          symbol: item.symbol,
          name: item.name || item.symbol,
          exchangeShortName: item.exchangeShortName || '',
        })));
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search handler
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // If empty, clear results immediately
    if (!text) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Debounce the API call
    searchTimeout.current = setTimeout(() => {
      searchStocks(text);
    }, 300);
  };

  // Handle selecting a search result
  const handleSearchResultSelect = (symbol: string) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    router.push(`/symbol/${symbol}` as any);
  };

  const enrichStocksWithQuotes = async (stocks: Stock[]): Promise<Stock[]> => {
    try {
      const needsQuotes = stocks.some(s => s.change === 0 && s.changePercent === 0);
      if (!needsQuotes) return stocks;
      const quotes = await fetchQuotes(stocks.map(s => s.symbol));
      return stocks.map(stock => {
        const quote = quotes[stock.symbol];
        if (quote) {
          return {
            ...stock,
            price: quote.price || stock.price,
            change: quote.change ?? stock.change,
            changePercent: quote.changesPercentage ?? stock.changePercent,
            marketCap: quote.marketCap || stock.marketCap,
            volume: quote.volume || stock.volume,
            pe: quote.pe || stock.pe,
          };
        }
        return stock;
      });
    } catch (err) {
      return stocks;
    }
  };

  const sortStocks = (stocks: Stock[]): Stock[] => {
    return [...stocks].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case 'price': aVal = a.price || 0; bVal = b.price || 0; break;
        case 'changePercent': aVal = a.changePercent || 0; bVal = b.changePercent || 0; break;
        case 'volume': aVal = a.volume || 0; bVal = b.volume || 0; break;
        case 'pe': aVal = a.pe || 0; bVal = b.pe || 0; break;
        case 'roe': aVal = a.roe || 0; bVal = b.roe || 0; break;
        default: aVal = a.marketCap || 0; bVal = b.marketCap || 0;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
  };

  const fetchData = useCallback(async (preset?: string | null, customFilters?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      let stocks: Stock[] = [];
      const filtersToUse = customFilters || filters;

      if (preset) {
        switch (preset) {
          case 'trending': stocks = await fetchMostActive(); break;
          case 'gainers': stocks = await fetchGainers(); break;
          case 'losers': stocks = await fetchLosers(); break;
          case 'undervalued':
            stocks = await fetchScreenerResults({ marketCapMoreThan: 1000000000, peLessThan: 15, peMoreThan: 0, limit: 50 });
            stocks = await enrichStocksWithQuotes(stocks);
            break;
          case 'dividend':
            stocks = await fetchScreenerResults({ dividendMoreThan: 4, marketCapMoreThan: 1000000000, limit: 50 });
            stocks = await enrichStocksWithQuotes(stocks);
            break;
          case 'quality':
            stocks = await fetchScreenerResults({ returnOnEquityMoreThan: 20, netMarginMoreThan: 15, marketCapMoreThan: 5000000000, limit: 50 });
            stocks = await enrichStocksWithQuotes(stocks);
            break;
          case 'growth':
            stocks = await fetchScreenerResults({ revenueGrowthMoreThan: 25, epsGrowthMoreThan: 20, marketCapMoreThan: 1000000000, limit: 50 });
            stocks = await enrichStocksWithQuotes(stocks);
            break;
          case 'cashcow':
            stocks = await fetchScreenerResults({ freeCashFlowMoreThan: 1000000000, netMarginMoreThan: 10, limit: 50 });
            stocks = await enrichStocksWithQuotes(stocks);
            break;
          default: stocks = await fetchMostActive();
        }
      } else if (Object.keys(filtersToUse).some(k => filtersToUse[k] && filtersToUse[k] !== 'Any')) {
        stocks = await fetchScreenerResults(buildScreenerParams(filtersToUse));
        stocks = await enrichStocksWithQuotes(stocks);
      } else {
        stocks = await fetchMostActive();
      }

      setResults(sortStocks(stocks));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stocks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (results.length > 0) setResults(sortStocks(results));
  }, [sortBy, sortOrder]);

  const handlePresetPress = (preset: Preset) => {
    if (preset.id === 'heatmap') {
      setShowHeatMap(true);
      fetchHeatMapData();
      return;
    }

    if (activePreset === preset.id) {
      setActivePreset(null);
      setFilters({});
      fetchData(null, {});
    } else {
      setActivePreset(preset.id);
      setFilters({});
      fetchData(preset.id, {});
    }
  };

  const handleFilterSelect = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value === 'Any' ? '' : value }));
    setActiveFilterModal(null);
    setActivePreset(null);
  };

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    else { setSortBy(newSortBy); setSortOrder('desc'); }
  };

  const handleStockPress = (symbol: string) => router.push(`/symbol/${symbol}` as any);

  const filteredResults = results.filter(stock => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q);
  });

  // Group heat map stocks by sector
  const groupedHeatMapStocks = heatMapStocks.reduce((acc: Record<string, HeatMapStock[]>, stock) => {
    const sector = stock.sector || 'Other';
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(stock);
    return acc;
  }, {});

  const sortedSectors = Object.entries(groupedHeatMapStocks).sort((a, b) => {
    const capA = a[1].reduce((sum, s) => sum + s.marketCap, 0);
    const capB = b[1].reduce((sum, s) => sum + s.marketCap, 0);
    return capB - capA;
  });

  const maxMarketCap = Math.max(...heatMapStocks.map(s => s.marketCap), 1);

  const handlePremiumPress = () => {
    router.push('/(modals)/paywall' as any);
  };

  const renderPreset = ({ item }: { item: Preset }) => {
    const isLocked = item.isPremium && !hasPlatinumAccess;
    return (
      <TouchableOpacity
        style={[styles.presetCard, activePreset === item.id && styles.presetCardActive]}
        onPress={() => isLocked ? handlePremiumPress() : handlePresetPress(item)}
        activeOpacity={0.8}
      >
        <LinearGradient colors={item.gradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.presetGradient}>
          <View style={styles.presetIconContainer}>
            <Ionicons name={item.icon as any} size={22} color="#fff" />
          </View>
          <Text style={styles.presetName}>{item.name}</Text>
          <Text style={styles.presetDescription}>{item.description}</Text>
        </LinearGradient>
        {item.isPremium && (
          <View style={[styles.premiumBadge, !isLocked && styles.premiumBadgeUnlocked]}>
            <Ionicons name={isLocked ? "lock-closed" : "diamond"} size={12} color={isLocked ? "#FFD700" : "#E5E4E2"} />
          </View>
        )}
        {activePreset === item.id && !isLocked && (
          <View style={styles.presetCheckmark}><Ionicons name="checkmark-circle" size={20} color="#fff" /></View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterChip = (filter: FilterOption) => {
    const isActive = filters[filter.id] && filters[filter.id] !== 'Any';
    const isLocked = filter.isPremium && !hasPlatinumAccess;
    return (
      <TouchableOpacity
        key={filter.id}
        style={[styles.filterChip, isActive && styles.filterChipActive, isLocked && styles.filterChipPremium]}
        onPress={() => isLocked ? handlePremiumPress() : setActiveFilterModal(filter)}
      >
        <Ionicons name={filter.icon as any} size={16} color={isActive ? '#fff' : isLocked ? '#E5E4E2' : '#666'} />
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive, isLocked && styles.filterChipTextPremium]} numberOfLines={1}>
          {isActive ? filters[filter.id] : filter.label}
        </Text>
        {isLocked ? (
          <Ionicons name="lock-closed" size={12} color="#E5E4E2" />
        ) : (
          <Ionicons name="chevron-down" size={14} color={isActive ? '#fff' : '#999'} />
        )}
      </TouchableOpacity>
    );
  };

  const renderStockItem = ({ item }: { item: Stock }) => {
    const isPositive = item.change >= 0;
    return (
      <TouchableOpacity style={styles.stockItem} activeOpacity={0.7} onPress={() => handleStockPress(item.symbol)}>
        <View style={styles.stockLeft}>
          <View style={styles.stockSymbolRow}>
            <Text style={styles.stockSymbol}>{item.symbol}</Text>
            {item.sector ? <View style={styles.sectorBadge}><Text style={styles.sectorText} numberOfLines={1}>{item.sector.length > 10 ? item.sector.substring(0, 10) + '..' : item.sector}</Text></View> : null}
          </View>
          <Text style={styles.stockName} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.stockMiddle}>
          <Text style={styles.stockMetricLabel}>Mkt Cap</Text>
          <Text style={styles.stockMetricValue}>{formatMarketCap(item.marketCap)}</Text>
        </View>
        <View style={styles.stockMiddle}>
          <Text style={styles.stockMetricLabel}>P/E</Text>
          <Text style={styles.stockMetricValue}>{item.pe ? item.pe.toFixed(1) : 'N/A'}</Text>
        </View>
        <View style={styles.stockRight}>
          <Text style={styles.stockPrice}>${item.price ? item.price.toFixed(2) : '0.00'}</Text>
          <View style={[styles.changeContainer, isPositive ? styles.changePositive : styles.changeNegative]}>
            <Ionicons name={isPositive ? 'caret-up' : 'caret-down'} size={12} color={isPositive ? '#00C853' : '#FF5252'} />
            <Text style={[styles.changeText, isPositive ? styles.changeTextPositive : styles.changeTextNegative]}>{Math.abs(item.changePercent || 0).toFixed(2)}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const sortOptions = [
    { key: 'marketCap', label: 'Mkt Cap' },
    { key: 'price', label: 'Price' },
    { key: 'changePercent', label: 'Change' },
    { key: 'volume', label: 'Volume' },
    { key: 'pe', label: 'P/E' },
    { key: 'roe', label: 'ROE' },
  ] as const;

  const categoryTabs = [
    { key: 'all', label: '🔍 All' },
    { key: 'basic', label: '📊 Basic' },
    { key: 'valuation', label: '💰 Valuation' },
    { key: 'profitability', label: '📈 Profit' },
    { key: 'financial', label: '🏦 Financial' },
    { key: 'growth', label: '🚀 Growth' },
    { key: 'premium', label: '👑 Premium' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Screener</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowAllFilters(true)}>
            <Ionicons name="options" size={24} color="#000" />
            {activeFilterCount > 0 && <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{activeFilterCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleBookmarkPress}>
            <Ionicons name={savedPresets.length > 0 ? "bookmark" : "bookmark-outline"} size={24} color={savedPresets.length > 0 ? "#007AFF" : "#000"} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or symbol..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          {searchLoading && <ActivityIndicator size="small" color="#007AFF" style={{ marginRight: 8 }} />}
          {searchQuery.length > 0 && !searchLoading && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <View style={styles.searchResultsDropdown}>
            {searchResults.map((item, index) => (
              <TouchableOpacity
                key={`${item.symbol}-${index}`}
                style={styles.searchResultItem}
                onPress={() => handleSearchResultSelect(item.symbol)}
              >
                <View style={styles.searchResultLeft}>
                  <Text style={styles.searchResultSymbol}>{item.symbol}</Text>
                  <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                </View>
                <Text style={styles.searchResultExchange}>{item.exchangeShortName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Results Message */}
        {showSearchResults && searchQuery.length > 0 && searchResults.length === 0 && !searchLoading && (
          <View style={styles.searchResultsDropdown}>
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={24} color="#999" />
              <Text style={styles.noResultsText}>No stocks found for "{searchQuery}"</Text>
            </View>
          </View>
        )}
      </View>

      {/* Backdrop to close search results */}
      {showSearchResults && (
        <TouchableOpacity
          style={styles.searchBackdrop}
          activeOpacity={1}
          onPress={() => setShowSearchResults(false)}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(activePreset, filters); }} />}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Quick Screens</Text></View>
          <FlatList data={presets} renderItem={renderPreset} keyExtractor={item => item.id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetList} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.filterTitleRow}>
              <Text style={styles.sectionTitle}>Filters</Text>
              {activeFilterCount > 0 && <View style={styles.filterCountBadge}><Text style={styles.filterCountText}>{activeFilterCount}</Text></View>}
            </View>
            {activeFilterCount > 0 && <TouchableOpacity onPress={() => { setFilters({}); setActivePreset(null); fetchData(null, {}); }}><Text style={styles.clearText}>Clear All</Text></TouchableOpacity>}
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs} contentContainerStyle={styles.categoryTabsContent}>
            {categoryTabs.map(tab => (
              <TouchableOpacity key={tab.key} style={[styles.categoryTab, selectedCategory === tab.key && styles.categoryTabActive]} onPress={() => setSelectedCategory(tab.key)}>
                <Text style={[styles.categoryTabText, selectedCategory === tab.key && styles.categoryTabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsContainer}>
            {getFiltersByCategory(selectedCategory).map(renderFilterChip)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Results</Text>
            <Text style={styles.resultCount}>{filteredResults.length} stocks</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortContainer} contentContainerStyle={styles.sortContent}>
            {sortOptions.map(sort => (
              <TouchableOpacity key={sort.key} style={[styles.sortButton, sortBy === sort.key && styles.sortButtonActive]} onPress={() => handleSort(sort.key)}>
                <Text style={[styles.sortButtonText, sortBy === sort.key && styles.sortButtonTextActive]}>{sort.label}</Text>
                {sortBy === sort.key && <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={14} color="#007AFF" />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading && !refreshing && <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#007AFF" /><Text style={styles.loadingText}>Loading stocks...</Text></View>}
          
          {error && !loading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#FF5252" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(activePreset, filters)}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity>
            </View>
          )}

          {!loading && !error && (
            <View style={styles.stockList}>
              {filteredResults.length > 0 ? filteredResults.map(stock => <View key={stock.symbol}>{renderStockItem({ item: stock })}</View>) : (
                <View style={styles.emptyContainer}><Ionicons name="search" size={48} color="#CCC" /><Text style={styles.emptyText}>No stocks found</Text><Text style={styles.emptySubtext}>Try adjusting your filters</Text></View>
              )}
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Filter Selection Modal */}
      <Modal visible={activeFilterModal !== null} transparent animationType="slide" onRequestClose={() => setActiveFilterModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveFilterModal(null)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{activeFilterModal?.label}</Text>
            <ScrollView style={styles.modalOptions}>
              {activeFilterModal?.options.map(option => {
                const isSelected = filters[activeFilterModal.id] === option || (option === 'Any' && !filters[activeFilterModal.id]);
                return (
                  <TouchableOpacity key={option} style={[styles.modalOption, isSelected && styles.modalOptionSelected]} onPress={() => handleFilterSelect(activeFilterModal.id, option)}>
                    <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>{option}</Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* All Filters Modal */}
      <Modal visible={showAllFilters} animationType="slide" onRequestClose={() => setShowAllFilters(false)}>
        <SafeAreaView style={styles.fullModalContainer} edges={['top', 'bottom']}>
          <View style={styles.fullModalHeader}>
            <TouchableOpacity onPress={() => setShowAllFilters(false)} style={styles.fullModalCloseBtn}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.fullModalTitle}>All Filters</Text>
            <TouchableOpacity onPress={() => { setFilters({}); }} style={styles.fullModalResetBtn}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.fullModalContent}
            contentContainerStyle={styles.fullModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(categoryLabels).map(([category, label]) => (
              <View key={category} style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{label}</Text>
                <View style={styles.filterGrid}>
                  {filterCategories.filter(f => f.category === category).map(filter => {
                    const isActive = filters[filter.id] && filters[filter.id] !== 'Any';
                    const isLocked = filter.isPremium && !hasPlatinumAccess;
                    return (
                      <TouchableOpacity
                        key={filter.id}
                        style={[
                          styles.filterGridItem,
                          { width: FILTER_ITEM_WIDTH },
                          isActive && styles.filterGridItemActive,
                          isLocked && styles.filterGridItemPremium
                        ]}
                        onPress={() => isLocked ? handlePremiumPress() : setActiveFilterModal(filter)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.filterGridIconRow}>
                          <View style={[
                            styles.filterGridIconBg,
                            isActive && styles.filterGridIconBgActive,
                            isLocked && styles.filterGridIconBgPremium
                          ]}>
                            <Ionicons
                              name={filter.icon as any}
                              size={20}
                              color={isActive ? '#007AFF' : isLocked ? '#FFD700' : '#666'}
                            />
                          </View>
                          {isLocked && (
                            <View style={styles.filterLockBadge}>
                              <Ionicons name="lock-closed" size={10} color="#FFD700" />
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.filterGridLabel,
                            isActive && styles.filterGridLabelActive,
                            isLocked && styles.filterGridLabelPremium
                          ]}
                          numberOfLines={1}
                        >
                          {filter.label}
                        </Text>
                        {isActive ? (
                          <View style={styles.filterActiveValue}>
                            <Text style={styles.filterGridValue} numberOfLines={1}>
                              {filters[filter.id]}
                            </Text>
                            <Ionicons name="checkmark-circle" size={14} color="#007AFF" />
                          </View>
                        ) : (
                          <Text style={styles.filterGridHint}>Tap to select</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
          <View style={styles.fullModalFooter}>
            <TouchableOpacity
              style={[styles.applyButton, activeFilterCount === 0 && styles.applyButtonDisabled]}
              onPress={() => { setShowAllFilters(false); fetchData(null, filters); }}
            >
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Filters ({activeFilterCount})</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Heat Map Modal */}
      <Modal visible={showHeatMap} animationType="slide" onRequestClose={() => setShowHeatMap(false)}>
        <SafeAreaView style={styles.heatMapContainer} edges={['top']}>
          <View style={styles.heatMapHeader}>
            <TouchableOpacity onPress={() => setShowHeatMap(false)} style={styles.heatMapCloseBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heatMapTitle}>Market Heat Map</Text>
            <TouchableOpacity onPress={fetchHeatMapData} style={styles.heatMapRefreshBtn}>
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ColorLegend />

          {heatMapLoading ? (
            <View style={styles.heatMapLoading}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.heatMapLoadingText}>Loading heat map...</Text>
            </View>
          ) : (
            <ScrollView 
              contentContainerStyle={styles.heatMapScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {sortedSectors.map(([sector, stocks]) => (
                <View key={sector}>
                  <View style={styles.heatMapSectorHeader}>
                    <Text style={styles.heatMapSectorTitle}>{sector}</Text>
                    <Text style={styles.heatMapSectorCount}>{stocks.length} stocks</Text>
                  </View>
                  <View style={styles.heatMapTilesContainer}>
                    {stocks
                      .sort((a, b) => b.marketCap - a.marketCap)
                      .map(stock => (
                        <HeatMapTile
                          key={stock.symbol}
                          stock={stock}
                          size={getTileSize(stock.marketCap, maxMarketCap)}
                          onPress={() => {
                            setShowHeatMap(false);
                            handleStockPress(stock.symbol);
                          }}
                        />
                      ))}
                  </View>
                </View>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Saved Presets Modal */}
      <Modal visible={showSavedPresetsModal} animationType="slide" transparent onRequestClose={() => setShowSavedPresetsModal(false)}>
        <View style={styles.savedPresetsOverlay}>
          <View style={styles.savedPresetsContainer}>
            <View style={styles.savedPresetsHeader}>
              <Text style={styles.savedPresetsTitle}>Saved Presets</Text>
              <TouchableOpacity onPress={() => setShowSavedPresetsModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Save Current Filters Button */}
            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={styles.saveCurrentBtn}
                onPress={() => {
                  setShowSavedPresetsModal(false);
                  setShowSavePresetModal(true);
                }}
              >
                <LinearGradient
                  colors={['#007AFF', '#0055FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveCurrentGradient}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.saveCurrentText}>Save Current Filters ({activeFilterCount})</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {loadingPresets ? (
              <View style={styles.presetsLoading}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.presetsLoadingText}>Loading presets...</Text>
              </View>
            ) : savedPresets.length === 0 ? (
              <View style={styles.noPresetsContainer}>
                <Ionicons name="bookmark-outline" size={64} color="#CCC" />
                <Text style={styles.noPresetsTitle}>No Saved Presets</Text>
                <Text style={styles.noPresetsText}>
                  {activeFilterCount > 0
                    ? 'Tap "Save Current Filters" to save your first preset'
                    : 'Select some filters and save them for quick access later'}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.presetsList} showsVerticalScrollIndicator={false}>
                {savedPresets.map((preset) => {
                  const filterCount = Object.values(preset.filters).filter(v => v && v !== 'Any').length;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={styles.presetItem}
                      onPress={() => loadPreset(preset)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.presetItemLeft}>
                        <View style={styles.presetIconBg}>
                          <Ionicons name="funnel" size={20} color="#007AFF" />
                        </View>
                        <View style={styles.presetItemInfo}>
                          <Text style={styles.presetItemName}>{preset.name}</Text>
                          <Text style={styles.presetItemFilters}>{filterCount} filter{filterCount !== 1 ? 's' : ''}</Text>
                        </View>
                      </View>
                      <View style={styles.presetItemRight}>
                        <TouchableOpacity
                          style={styles.presetDeleteBtn}
                          onPress={() => {
                            Alert.alert(
                              'Delete Preset',
                              `Are you sure you want to delete "${preset.name}"?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deletePreset(preset.id) },
                              ]
                            );
                          }}
                        >
                          {deletingPresetId === preset.id ? (
                            <ActivityIndicator size="small" color="#FF3B30" />
                          ) : (
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                          )}
                        </TouchableOpacity>
                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Save Preset Modal */}
      <Modal visible={showSavePresetModal} animationType="fade" transparent onRequestClose={() => setShowSavePresetModal(false)}>
        <View style={styles.savePresetOverlay}>
          <View style={styles.savePresetContainer}>
            <Text style={styles.savePresetTitle}>Save Filter Preset</Text>
            <Text style={styles.savePresetSubtitle}>Give your {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} a name</Text>

            <TextInput
              style={styles.presetNameInput}
              placeholder="e.g., High Growth Tech Stocks"
              placeholderTextColor="#999"
              value={newPresetName}
              onChangeText={setNewPresetName}
              autoFocus
              maxLength={50}
            />

            <View style={styles.savePresetActions}>
              <TouchableOpacity
                style={styles.savePresetCancelBtn}
                onPress={() => {
                  setShowSavePresetModal(false);
                  setNewPresetName('');
                }}
              >
                <Text style={styles.savePresetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savePresetSaveBtn, savingPreset && styles.savePresetSaveBtnDisabled]}
                onPress={savePreset}
                disabled={savingPreset}
              >
                {savingPreset ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.savePresetSaveText}>Save Preset</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {activeFilterCount > 0 && !activePreset && (
        <TouchableOpacity style={styles.fab} onPress={() => fetchData(null, filters)}>
          <LinearGradient colors={['#007AFF', '#0055FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGradient}>
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={styles.fabText}>Apply Filters</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Platform.OS === 'android' ? 16 : 20, paddingVertical: Platform.OS === 'android' ? 12 : 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: Platform.OS === 'android' ? 22 : 28, fontWeight: '700', color: '#000' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { padding: 8, position: 'relative' },
  headerBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#007AFF', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', zIndex: 1001, position: 'relative' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 10, color: '#000' },
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  filterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterCountBadge: { backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  filterCountText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  clearText: { fontSize: 14, color: '#FF3B30', fontWeight: '600' },
  presetList: { paddingHorizontal: 20 },
  presetCard: { width: 120, height: 110, borderRadius: 16, overflow: 'hidden', marginRight: 12 },
  presetCardActive: { transform: [{ scale: 0.98 }] },
  presetGradient: { flex: 1, padding: 12, justifyContent: 'space-between' },
  presetIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  presetName: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 6 },
  presetDescription: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  presetCheckmark: { position: 'absolute', top: 8, right: 8 },
  premiumBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 4 },
  premiumBadgeUnlocked: { backgroundColor: 'rgba(229, 228, 226, 0.3)' },
  categoryTabs: { marginBottom: 12 },
  categoryTabsContent: { paddingHorizontal: 20 },
  categoryTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  categoryTabActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  categoryTabText: { fontSize: 13, color: '#666', fontWeight: '500' },
  categoryTabTextActive: { color: '#fff' },
  filterChipsContainer: { paddingHorizontal: 20, paddingBottom: 4 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E5E5E5', gap: 6, maxWidth: 160 },
  filterChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  filterChipPremium: { borderColor: '#E5E4E2', backgroundColor: '#F8F8F8' },
  filterChipText: { fontSize: 13, color: '#333', fontWeight: '500', flexShrink: 1 },
  filterChipTextActive: { color: '#fff' },
  filterChipTextPremium: { color: '#A0A0A0' },
  resultCount: { fontSize: 14, color: '#666' },
  sortContainer: { marginBottom: 12 },
  sortContent: { paddingHorizontal: 20 },
  sortButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', marginRight: 8, gap: 4 },
  sortButtonActive: { backgroundColor: '#E8F2FF' },
  sortButtonText: { fontSize: 13, color: '#666', fontWeight: '500' },
  sortButtonTextActive: { color: '#007AFF' },
  stockList: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' },
  stockItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  stockLeft: { flex: 1.2 },
  stockSymbolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockSymbol: { fontSize: 16, fontWeight: '700', color: '#000' },
  sectorBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, maxWidth: 80 },
  sectorText: { fontSize: 9, color: '#666', fontWeight: '600' },
  stockName: { fontSize: 12, color: '#666', marginTop: 3 },
  stockMiddle: { flex: 0.55, alignItems: 'center' },
  stockMetricLabel: { fontSize: 10, color: '#999', marginBottom: 2 },
  stockMetricValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  stockRight: { flex: 0.85, alignItems: 'flex-end' },
  stockPrice: { fontSize: 15, fontWeight: '700', color: '#000' },
  changeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 2 },
  changePositive: { backgroundColor: 'rgba(0, 200, 83, 0.1)' },
  changeNegative: { backgroundColor: 'rgba(255, 82, 82, 0.1)' },
  changeText: { fontSize: 12, fontWeight: '600' },
  changeTextPositive: { color: '#00C853' },
  changeTextNegative: { color: '#FF5252' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  errorContainer: { padding: 40, alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16 },
  errorText: { marginTop: 12, fontSize: 14, color: '#666', textAlign: 'center' },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#007AFF', borderRadius: 20 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: '600', color: '#666' },
  emptySubtext: { marginTop: 4, fontSize: 14, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 40, maxHeight: '70%' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20, color: '#000' },
  modalOptions: { paddingHorizontal: 20 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalOptionSelected: { backgroundColor: '#F8F9FF', marginHorizontal: -20, paddingHorizontal: 20 },
  modalOptionText: { fontSize: 16, color: '#333' },
  modalOptionTextSelected: { color: '#007AFF', fontWeight: '600' },
  fullModalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  fullModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  fullModalCloseBtn: { padding: 4 },
  fullModalResetBtn: { padding: 4 },
  fullModalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  resetText: { fontSize: 16, color: '#FF3B30', fontWeight: '600' },
  fullModalContent: { flex: 1 },
  fullModalScrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  filterSection: { marginTop: 20 },
  filterSectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  filterGridItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    minHeight: 100,
  },
  filterGridItemActive: { borderColor: '#007AFF', backgroundColor: '#F0F7FF' },
  filterGridItemPremium: { borderColor: '#FFD700', backgroundColor: '#FFFEF5' },
  filterGridIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  filterGridIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterGridIconBgActive: { backgroundColor: '#E8F2FF' },
  filterGridIconBgPremium: { backgroundColor: '#FFF9E6' },
  filterLockBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 2,
  },
  filterGridLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  filterGridLabelActive: { color: '#007AFF' },
  filterGridLabelPremium: { color: '#B8860B' },
  filterActiveValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterGridValue: { fontSize: 12, color: '#007AFF', fontWeight: '500', flex: 1 },
  filterGridHint: { fontSize: 11, color: '#999' },
  fullModalFooter: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  applyButtonDisabled: { backgroundColor: '#B0B0B0' },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 100, left: 20, right: 20, borderRadius: 16, overflow: 'hidden', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Heat Map Styles
  heatMapContainer: { flex: 1, backgroundColor: '#0D0D0D' },
  heatMapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  heatMapCloseBtn: { padding: 4 },
  heatMapTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  heatMapRefreshBtn: { padding: 4 },
  legendContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  legendGradient: { flex: 1, height: 12, borderRadius: 6, maxWidth: 200 },
  legendLabel: { color: '#888', fontSize: 11, fontWeight: '500' },
  heatMapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heatMapLoadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  heatMapScrollContent: { padding: 12 },
  heatMapSectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, marginTop: 8 },
  heatMapSectorTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  heatMapSectorCount: { color: '#666', fontSize: 11 },
  heatMapTilesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heatMapTile: { borderRadius: 4, padding: 4, justifyContent: 'center', alignItems: 'center' },
  heatMapSymbol: { fontWeight: '700' },
  heatMapChange: { marginTop: 1 },
  heatMapPrice: { fontSize: 8, marginTop: 1, opacity: 0.8 },
  // Search Results Dropdown Styles
  searchResultsDropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    maxHeight: 350,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  },
  searchResultName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  searchResultExchange: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  searchBackdrop: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 999,
  },
  // Saved Presets Modal Styles
  savedPresetsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  savedPresetsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  savedPresetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  savedPresetsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  saveCurrentBtn: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveCurrentGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  saveCurrentText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  presetsLoading: {
    padding: 60,
    alignItems: 'center',
  },
  presetsLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  noPresetsContainer: {
    padding: 60,
    alignItems: 'center',
  },
  noPresetsTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  noPresetsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  presetsList: {
    paddingHorizontal: 20,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  presetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  presetIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  presetItemInfo: {
    flex: 1,
  },
  presetItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  presetItemFilters: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  presetItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetDeleteBtn: {
    padding: 8,
  },
  // Save Preset Modal Styles
  savePresetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  savePresetContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  savePresetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  savePresetSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  presetNameInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F8F9FA',
    marginBottom: 20,
  },
  savePresetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  savePresetCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  savePresetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  savePresetSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  savePresetSaveBtnDisabled: {
    opacity: 0.6,
  },
  savePresetSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
