// app/symbol/[symbol]/fundamentals.tsx - Complete Fundamentals Page
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useGlobalSearchParams, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FMP_KEY = "bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU";

type TabType = "overview" | "income" | "balance" | "cashflow" | "ratios";

export default function FundamentalsTab() {
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const segments = useSegments();

  // Extract symbol
  let symbol: string | null = null;
  if (localParams.symbol) {
    symbol = Array.isArray(localParams.symbol) ? localParams.symbol[0] : localParams.symbol;
  }
  if (!symbol && globalParams.symbol) {
    symbol = Array.isArray(globalParams.symbol) ? globalParams.symbol[0] : globalParams.symbol;
  }
  if (!symbol && segments.length >= 2) {
    const symbolIndex = segments.findIndex((seg) => seg === "symbol") + 1;
    if (symbolIndex > 0 && symbolIndex < segments.length) {
      symbol = segments[symbolIndex] as string;
    }
  }

  const cleanSymbol = symbol
    ? String(symbol)
        .trim()
        .replace(/^\[|\]$/g, "")
        .replace(/[\(\)\{\}]/g, "")
        .replace(/[^A-Za-z0-9.-]/g, "")
        .toUpperCase()
    : null;

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [profile, setProfile] = useState<any>(null);
  const [incomeStatement, setIncomeStatement] = useState<any[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [ratios, setRatios] = useState<any>(null);
  const [keyMetrics, setKeyMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = async () => {
    if (!cleanSymbol) {
      setLoading(false);
      setError("No symbol provided");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [profileRes, incomeRes, balanceRes, cashRes, ratiosRes, metricsRes] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/profile/${cleanSymbol}?apikey=${FMP_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/income-statement/${cleanSymbol}?limit=4&apikey=${FMP_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${cleanSymbol}?limit=4&apikey=${FMP_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${cleanSymbol}?limit=4&apikey=${FMP_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/ratios/${cleanSymbol}?limit=1&apikey=${FMP_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${cleanSymbol}?limit=1&apikey=${FMP_KEY}`),
      ]);

      const [profileData, incomeData, balanceData, cashData, ratiosData, metricsData] = await Promise.all([
        profileRes.json(),
        incomeRes.json(),
        balanceRes.json(),
        cashRes.json(),
        ratiosRes.json(),
        metricsRes.json(),
      ]);

      if (profileData?.[0]) setProfile(profileData[0]);
      if (Array.isArray(incomeData)) setIncomeStatement(incomeData);
      if (Array.isArray(balanceData)) setBalanceSheet(balanceData);
      if (Array.isArray(cashData)) setCashFlow(cashData);
      if (ratiosData?.[0]) setRatios(ratiosData[0]);
      if (metricsData?.[0]) setKeyMetrics(metricsData[0]);

    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Unable to load fundamentals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cleanSymbol) fetchAllData();
  }, [cleanSymbol]);

  // Formatting helpers
  const fmtNum = (n: number | null | undefined, decimals = 2) => {
    if (n === null || n === undefined) return "—";
    if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(decimals)}T`;
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(decimals)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(decimals)}M`;
    if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(decimals)}K`;
    return `$${n.toFixed(decimals)}`;
  };

  const fmtPct = (n: number | null | undefined) => {
    if (n === null || n === undefined) return "—";
    return `${(n * 100).toFixed(2)}%`;
  };

  const fmtRatio = (n: number | null | undefined) => {
    if (n === null || n === undefined) return "—";
    return n.toFixed(2);
  };

  const getYoYChange = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading fundamentals...</Text>
      </View>
    );
  }

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "stats-chart" },
    { key: "income", label: "Income", icon: "trending-up" },
    { key: "balance", label: "Balance", icon: "wallet" },
    { key: "cashflow", label: "Cash Flow", icon: "cash" },
    { key: "ratios", label: "Ratios", icon: "calculator" },
  ];

  return (
    <View style={styles.container}>
      {/* Tab Bar - Compact */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={14}
              color={activeTab === tab.key ? "#007AFF" : "#636366"}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchAllData} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "overview" && (
          <OverviewTab profile={profile} keyMetrics={keyMetrics} ratios={ratios} fmtNum={fmtNum} fmtPct={fmtPct} fmtRatio={fmtRatio} />
        )}
        {activeTab === "income" && (
          <IncomeTab data={incomeStatement} fmtNum={fmtNum} getYoYChange={getYoYChange} />
        )}
        {activeTab === "balance" && (
          <BalanceTab data={balanceSheet} fmtNum={fmtNum} />
        )}
        {activeTab === "cashflow" && (
          <CashFlowTab data={cashFlow} fmtNum={fmtNum} />
        )}
        {activeTab === "ratios" && (
          <RatiosTab ratios={ratios} keyMetrics={keyMetrics} fmtPct={fmtPct} fmtRatio={fmtRatio} />
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Overview Tab
const OverviewTab = ({ profile, keyMetrics, ratios, fmtNum, fmtPct, fmtRatio }: any) => (
  <>
    <Section title="Valuation">
      <DataRow label="Market Cap" value={fmtNum(profile?.mktCap)} />
      <DataRow label="Enterprise Value" value={fmtNum(keyMetrics?.enterpriseValue)} />
      <DataRow label="P/E Ratio" value={fmtRatio(profile?.pe)} />
      <DataRow label="Forward P/E" value={fmtRatio(ratios?.priceEarningsToGrowthRatio)} />
      <DataRow label="P/S Ratio" value={fmtRatio(ratios?.priceToSalesRatio)} />
      <DataRow label="P/B Ratio" value={fmtRatio(ratios?.priceToBookRatio)} />
      <DataRow label="EV/EBITDA" value={fmtRatio(keyMetrics?.evToEbitda)} />
      <DataRow label="EV/Revenue" value={fmtRatio(keyMetrics?.evToSales)} />
    </Section>

    <Section title="Per Share Data">
      <DataRow label="EPS (TTM)" value={profile?.eps ? `$${profile.eps.toFixed(2)}` : "—"} />
      <DataRow label="Book Value/Share" value={keyMetrics?.bookValuePerShare ? `$${keyMetrics.bookValuePerShare.toFixed(2)}` : "—"} />
      <DataRow label="Revenue/Share" value={keyMetrics?.revenuePerShare ? `$${keyMetrics.revenuePerShare.toFixed(2)}` : "—"} />
      <DataRow label="FCF/Share" value={keyMetrics?.freeCashFlowPerShare ? `$${keyMetrics.freeCashFlowPerShare.toFixed(2)}` : "—"} />
    </Section>

    <Section title="Dividends">
      <DataRow label="Dividend Yield" value={fmtPct(ratios?.dividendYield)} />
      <DataRow label="Dividend Payout" value={fmtPct(ratios?.payoutRatio)} />
      <DataRow label="Last Dividend" value={profile?.lastDiv ? `$${profile.lastDiv.toFixed(2)}` : "—"} />
    </Section>

    <Section title="Company Info">
      <DataRow label="Sector" value={profile?.sector || "—"} />
      <DataRow label="Industry" value={profile?.industry || "—"} />
      <DataRow label="Employees" value={profile?.fullTimeEmployees?.toLocaleString() || "—"} />
      <DataRow label="IPO Date" value={profile?.ipoDate || "—"} />
      <DataRow label="Exchange" value={profile?.exchangeShortName || "—"} />
    </Section>

    {profile?.description && (
      <Section title="About">
        <Text style={styles.description}>{profile.description}</Text>
      </Section>
    )}
  </>
);

// Income Statement Tab
const IncomeTab = ({ data, fmtNum, getYoYChange }: any) => {
  if (!data || data.length === 0) {
    return <EmptyState message="No income statement data available" />;
  }

  const latest = data[0];
  const previous = data[1];

  const grossMargin = latest?.revenue ? (latest.grossProfit / latest.revenue) * 100 : 0;
  const operatingMargin = latest?.revenue ? (latest.operatingIncome / latest.revenue) * 100 : 0;
  const netMargin = latest?.revenue ? (latest.netIncome / latest.revenue) * 100 : 0;

  const revenueChange = getYoYChange(latest?.revenue, previous?.revenue);
  const netIncomeChange = getYoYChange(latest?.netIncome, previous?.netIncome);

  const MarginBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={incomeStyles.marginItem}>
      <View style={incomeStyles.marginHeader}>
        <Text style={incomeStyles.marginLabel}>{label}</Text>
        <Text style={[incomeStyles.marginValue, { color }]}>{value.toFixed(1)}%</Text>
      </View>
      <View style={incomeStyles.marginBarBg}>
        <View style={[incomeStyles.marginBarFill, { width: `${Math.min(Math.max(value, 0), 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

  return (
    <>
      {/* Hero Section */}
      <View style={incomeStyles.heroSection}>
        <Text style={incomeStyles.heroSubtitle}>FY {new Date(latest?.date).getFullYear()}</Text>

        {/* Key Metrics Cards */}
        <View style={incomeStyles.metricsGrid}>
          <View style={[incomeStyles.metricCard, { backgroundColor: '#0A2F1F' }]}>
            <View style={incomeStyles.metricHeader}>
              <Ionicons name="trending-up" size={18} color="#00C853" />
              <Text style={incomeStyles.metricLabel}>Revenue</Text>
            </View>
            <Text style={incomeStyles.metricValue}>{fmtNum(latest?.revenue)}</Text>
            {revenueChange !== null && (
              <View style={[incomeStyles.changeBadge, { backgroundColor: revenueChange >= 0 ? '#00C85320' : '#FF3B3020' }]}>
                <Ionicons name={revenueChange >= 0 ? "arrow-up" : "arrow-down"} size={12} color={revenueChange >= 0 ? "#00C853" : "#FF3B30"} />
                <Text style={[incomeStyles.changeText, { color: revenueChange >= 0 ? "#00C853" : "#FF3B30" }]}>
                  {Math.abs(revenueChange).toFixed(1)}% YoY
                </Text>
              </View>
            )}
          </View>

          <View style={[incomeStyles.metricCard, { backgroundColor: '#1A1A2E' }]}>
            <View style={incomeStyles.metricHeader}>
              <Ionicons name="cash" size={18} color="#007AFF" />
              <Text style={incomeStyles.metricLabel}>Net Income</Text>
            </View>
            <Text style={[incomeStyles.metricValue, { color: (latest?.netIncome || 0) >= 0 ? '#00C853' : '#FF3B30' }]}>
              {fmtNum(latest?.netIncome)}
            </Text>
            {netIncomeChange !== null && (
              <View style={[incomeStyles.changeBadge, { backgroundColor: netIncomeChange >= 0 ? '#00C85320' : '#FF3B3020' }]}>
                <Ionicons name={netIncomeChange >= 0 ? "arrow-up" : "arrow-down"} size={12} color={netIncomeChange >= 0 ? "#00C853" : "#FF3B30"} />
                <Text style={[incomeStyles.changeText, { color: netIncomeChange >= 0 ? "#00C853" : "#FF3B30" }]}>
                  {Math.abs(netIncomeChange).toFixed(1)}% YoY
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Margin Bars */}
        <View style={incomeStyles.marginSection}>
          <Text style={incomeStyles.marginSectionTitle}>Profit Margins</Text>
          <MarginBar label="Gross Margin" value={grossMargin} color="#00C853" />
          <MarginBar label="Operating Margin" value={operatingMargin} color="#007AFF" />
          <MarginBar label="Net Margin" value={netMargin} color="#AF52DE" />
        </View>
      </View>

      {/* Waterfall Breakdown */}
      <View style={incomeStyles.waterfallSection}>
        <Text style={incomeStyles.sectionHeader}>
          <Ionicons name="analytics" size={16} color="#007AFF" /> Revenue Breakdown
        </Text>

        <View style={incomeStyles.waterfallCard}>
          <WaterfallRow icon="arrow-up-circle" label="Total Revenue" value={fmtNum(latest?.revenue)} type="positive" isFirst />
          <WaterfallRow icon="remove-circle" label="Cost of Revenue" value={fmtNum(latest?.costOfRevenue)} type="negative" />
          <WaterfallRow icon="checkmark-circle" label="Gross Profit" value={fmtNum(latest?.grossProfit)} type="subtotal" />
        </View>
      </View>

      <View style={incomeStyles.waterfallSection}>
        <Text style={incomeStyles.sectionHeader}>
          <Ionicons name="construct" size={16} color="#FF9500" /> Operating Expenses
        </Text>

        <View style={incomeStyles.waterfallCard}>
          <WaterfallRow icon="flask" label="R&D Expenses" value={fmtNum(latest?.researchAndDevelopmentExpenses)} type="expense" isFirst />
          <WaterfallRow icon="megaphone" label="SG&A Expenses" value={fmtNum(latest?.sellingGeneralAndAdministrativeExpenses)} type="expense" />
          <WaterfallRow icon="list" label="Total Operating Exp" value={fmtNum(latest?.operatingExpenses)} type="negative" />
          <WaterfallRow icon="stats-chart" label="Operating Income" value={fmtNum(latest?.operatingIncome)} type="subtotal" />
        </View>
      </View>

      <View style={incomeStyles.waterfallSection}>
        <Text style={incomeStyles.sectionHeader}>
          <Ionicons name="trophy" size={16} color="#00C853" /> Bottom Line
        </Text>

        <View style={incomeStyles.waterfallCard}>
          <WaterfallRow icon="card" label="Interest Expense" value={fmtNum(latest?.interestExpense)} type="negative" isFirst />
          <WaterfallRow icon="document-text" label="Income Before Tax" value={fmtNum(latest?.incomeBeforeTax)} type="neutral" />
          <WaterfallRow icon="receipt" label="Income Tax" value={fmtNum(latest?.incomeTaxExpense)} type="negative" />
          <WaterfallRow icon="diamond" label="Net Income" value={fmtNum(latest?.netIncome)} type="final" />
        </View>
      </View>

      {/* EPS Card */}
      <View style={incomeStyles.epsSection}>
        <View style={incomeStyles.epsCard}>
          <View style={incomeStyles.epsItem}>
            <Text style={incomeStyles.epsLabel}>EPS Basic</Text>
            <Text style={incomeStyles.epsValue}>${latest?.eps?.toFixed(2) || '—'}</Text>
          </View>
          <View style={incomeStyles.epsDivider} />
          <View style={incomeStyles.epsItem}>
            <Text style={incomeStyles.epsLabel}>EPS Diluted</Text>
            <Text style={incomeStyles.epsValue}>${latest?.epsdiluted?.toFixed(2) || '—'}</Text>
          </View>
        </View>
      </View>

      {/* Historical Trend */}
      <View style={incomeStyles.historicalSection}>
        <Text style={incomeStyles.sectionHeader}>
          <Ionicons name="time" size={16} color="#8E8E93" /> 4-Year Trend
        </Text>

        <View style={incomeStyles.trendCard}>
          {data.slice(0, 4).reverse().map((item: any, idx: number) => {
            const maxRevenue = Math.max(...data.slice(0, 4).map((d: any) => d.revenue || 0));
            const barHeight = maxRevenue > 0 ? ((item.revenue || 0) / maxRevenue) * 80 : 0;
            return (
              <View key={idx} style={incomeStyles.trendItem}>
                <Text style={[incomeStyles.trendValue, { color: (item.netIncome || 0) >= 0 ? '#00C853' : '#FF3B30' }]}>
                  {fmtNum(item.netIncome)}
                </Text>
                <View style={incomeStyles.trendBarContainer}>
                  <View style={[incomeStyles.trendBar, { height: barHeight, backgroundColor: '#007AFF' }]} />
                </View>
                <Text style={incomeStyles.trendYear}>{new Date(item.date).getFullYear()}</Text>
                <Text style={incomeStyles.trendRevenue}>{fmtNum(item.revenue)}</Text>
              </View>
            );
          })}
        </View>
        <View style={incomeStyles.trendLegend}>
          <View style={incomeStyles.legendItem}>
            <View style={[incomeStyles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={incomeStyles.legendText}>Revenue</Text>
          </View>
          <View style={incomeStyles.legendItem}>
            <View style={[incomeStyles.legendDot, { backgroundColor: '#00C853' }]} />
            <Text style={incomeStyles.legendText}>Net Income</Text>
          </View>
        </View>
      </View>
    </>
  );
};

// Waterfall Row Component
const WaterfallRow = ({ icon, label, value, type, isFirst }: {
  icon: string;
  label: string;
  value: string;
  type: 'positive' | 'negative' | 'subtotal' | 'final' | 'expense' | 'neutral';
  isFirst?: boolean;
}) => {
  const getColors = () => {
    switch (type) {
      case 'positive': return { bg: '#0A2F1F', text: '#00C853', icon: '#00C853' };
      case 'negative': return { bg: '#2F0A0A', text: '#FF3B30', icon: '#FF3B30' };
      case 'subtotal': return { bg: '#1A2F1A', text: '#00C853', icon: '#00C853' };
      case 'final': return { bg: '#0A1F2F', text: '#007AFF', icon: '#007AFF' };
      case 'expense': return { bg: '#2F2A0A', text: '#FF9500', icon: '#FF9500' };
      default: return { bg: '#1C1C1E', text: '#FFF', icon: '#8E8E93' };
    }
  };
  const colors = getColors();

  return (
    <View style={[incomeStyles.waterfallRow, !isFirst && incomeStyles.waterfallRowBorder, type === 'final' && incomeStyles.waterfallRowFinal]}>
      <View style={[incomeStyles.waterfallIconBg, { backgroundColor: colors.bg }]}>
        <Ionicons name={icon as any} size={16} color={colors.icon} />
      </View>
      <Text style={incomeStyles.waterfallLabel}>{label}</Text>
      <Text style={[incomeStyles.waterfallValue, { color: colors.text }, type === 'final' && incomeStyles.waterfallValueFinal]}>
        {value}
      </Text>
    </View>
  );
};

const incomeStyles = StyleSheet.create({
  heroSection: {
    padding: 16,
    backgroundColor: '#0D0D0D',
  },
  heroSubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricLabel: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
  },
  metricValue: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  marginSection: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  marginSectionTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  marginItem: {
    marginBottom: 14,
  },
  marginHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  marginLabel: {
    color: '#8E8E93',
    fontSize: 13,
  },
  marginValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  marginBarBg: {
    height: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  marginBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  waterfallSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  waterfallCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  waterfallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  waterfallRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  waterfallRowFinal: {
    backgroundColor: '#0A1F2F',
  },
  waterfallIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterfallLabel: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
  },
  waterfallValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  waterfallValueFinal: {
    fontSize: 16,
    fontWeight: '700',
  },
  epsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  epsCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  epsItem: {
    flex: 1,
    alignItems: 'center',
  },
  epsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2C2C2E',
  },
  epsLabel: {
    color: '#8E8E93',
    fontSize: 13,
    marginBottom: 6,
  },
  epsValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  historicalSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  trendCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendValue: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  trendBarContainer: {
    height: 80,
    width: 24,
    backgroundColor: '#2C2C2E',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  trendBar: {
    width: '100%',
    borderRadius: 6,
  },
  trendYear: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  trendRevenue: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 4,
  },
  trendLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#8E8E93',
    fontSize: 12,
  },
});

// Balance Sheet Tab
const BalanceTab = ({ data, fmtNum }: any) => {
  if (!data || data.length === 0) {
    return <EmptyState message="No balance sheet data available" />;
  }

  const latest = data[0];
  const totalAssets = latest?.totalAssets || 0;
  const totalLiabilities = latest?.totalLiabilities || 0;
  const totalEquity = latest?.totalStockholdersEquity || 0;
  const currentRatio = latest?.totalCurrentLiabilities ? (latest.totalCurrentAssets / latest.totalCurrentLiabilities) : 0;
  const debtToEquity = totalEquity ? ((latest?.totalDebt || 0) / totalEquity) : 0;
  const workingCapital = (latest?.totalCurrentAssets || 0) - (latest?.totalCurrentLiabilities || 0);

  // Calculate percentages for visual breakdown
  const assetsBreakdown = [
    { label: 'Cash', value: latest?.cashAndCashEquivalents || 0, color: '#00C853' },
    { label: 'Receivables', value: latest?.netReceivables || 0, color: '#007AFF' },
    { label: 'Inventory', value: latest?.inventory || 0, color: '#FF9500' },
    { label: 'PP&E', value: latest?.propertyPlantEquipmentNet || 0, color: '#AF52DE' },
    { label: 'Other', value: totalAssets - (latest?.cashAndCashEquivalents || 0) - (latest?.netReceivables || 0) - (latest?.inventory || 0) - (latest?.propertyPlantEquipmentNet || 0), color: '#5856D6' },
  ].filter(item => item.value > 0);

  return (
    <>
      {/* Hero Section */}
      <View style={balanceStyles.heroSection}>
        <Text style={balanceStyles.heroSubtitle}>As of {latest?.date}</Text>

        {/* Balance Equation Visual */}
        <View style={balanceStyles.equationCard}>
          <View style={balanceStyles.equationItem}>
            <View style={[balanceStyles.equationIcon, { backgroundColor: '#0A2F1F' }]}>
              <Ionicons name="cube" size={20} color="#00C853" />
            </View>
            <Text style={balanceStyles.equationLabel}>Assets</Text>
            <Text style={balanceStyles.equationValue}>{fmtNum(totalAssets)}</Text>
          </View>

          <Text style={balanceStyles.equationOperator}>=</Text>

          <View style={balanceStyles.equationItem}>
            <View style={[balanceStyles.equationIcon, { backgroundColor: '#2F0A0A' }]}>
              <Ionicons name="card" size={20} color="#FF3B30" />
            </View>
            <Text style={balanceStyles.equationLabel}>Liabilities</Text>
            <Text style={[balanceStyles.equationValue, { color: '#FF3B30' }]}>{fmtNum(totalLiabilities)}</Text>
          </View>

          <Text style={balanceStyles.equationOperator}>+</Text>

          <View style={balanceStyles.equationItem}>
            <View style={[balanceStyles.equationIcon, { backgroundColor: '#0A1F2F' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
            </View>
            <Text style={balanceStyles.equationLabel}>Equity</Text>
            <Text style={[balanceStyles.equationValue, { color: '#007AFF' }]}>{fmtNum(totalEquity)}</Text>
          </View>
        </View>

        {/* Key Ratios */}
        <View style={balanceStyles.ratiosGrid}>
          <View style={balanceStyles.ratioCard}>
            <Text style={balanceStyles.ratioLabel}>Current Ratio</Text>
            <Text style={[balanceStyles.ratioValue, { color: currentRatio >= 1.5 ? '#00C853' : currentRatio >= 1 ? '#FF9500' : '#FF3B30' }]}>
              {currentRatio.toFixed(2)}x
            </Text>
            <Text style={balanceStyles.ratioHint}>{currentRatio >= 1.5 ? 'Healthy' : currentRatio >= 1 ? 'Adequate' : 'Low'}</Text>
          </View>
          <View style={balanceStyles.ratioCard}>
            <Text style={balanceStyles.ratioLabel}>Debt/Equity</Text>
            <Text style={[balanceStyles.ratioValue, { color: debtToEquity <= 0.5 ? '#00C853' : debtToEquity <= 1 ? '#FF9500' : '#FF3B30' }]}>
              {debtToEquity.toFixed(2)}x
            </Text>
            <Text style={balanceStyles.ratioHint}>{debtToEquity <= 0.5 ? 'Low Leverage' : debtToEquity <= 1 ? 'Moderate' : 'High'}</Text>
          </View>
          <View style={balanceStyles.ratioCard}>
            <Text style={balanceStyles.ratioLabel}>Working Capital</Text>
            <Text style={[balanceStyles.ratioValue, { color: workingCapital >= 0 ? '#00C853' : '#FF3B30' }]}>
              {fmtNum(workingCapital)}
            </Text>
            <Text style={balanceStyles.ratioHint}>{workingCapital >= 0 ? 'Positive' : 'Negative'}</Text>
          </View>
        </View>
      </View>

      {/* Asset Composition */}
      <View style={balanceStyles.compositionSection}>
        <Text style={balanceStyles.sectionHeader}>
          <Ionicons name="pie-chart" size={16} color="#00C853" /> Asset Composition
        </Text>
        <View style={balanceStyles.compositionCard}>
          <View style={balanceStyles.barChart}>
            {assetsBreakdown.map((item, idx) => {
              const width = totalAssets > 0 ? (item.value / totalAssets) * 100 : 0;
              return width > 2 ? (
                <View key={idx} style={[balanceStyles.barSegment, { width: `${width}%`, backgroundColor: item.color }]} />
              ) : null;
            })}
          </View>
          <View style={balanceStyles.legendGrid}>
            {assetsBreakdown.map((item, idx) => (
              <View key={idx} style={balanceStyles.legendItem}>
                <View style={[balanceStyles.legendDot, { backgroundColor: item.color }]} />
                <View style={balanceStyles.legendContent}>
                  <Text style={balanceStyles.legendLabel}>{item.label}</Text>
                  <Text style={balanceStyles.legendValue}>{fmtNum(item.value)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Assets Detail */}
      <View style={balanceStyles.detailSection}>
        <Text style={balanceStyles.sectionHeader}>
          <Ionicons name="layers" size={16} color="#00C853" /> Assets
        </Text>

        <View style={balanceStyles.detailCard}>
          <View style={balanceStyles.subHeader}>
            <Ionicons name="flash" size={14} color="#FF9500" />
            <Text style={balanceStyles.subHeaderText}>Current Assets</Text>
          </View>
          <BalanceRow label="Cash & Cash Equivalents" value={fmtNum(latest?.cashAndCashEquivalents)} icon="cash" />
          <BalanceRow label="Short-term Investments" value={fmtNum(latest?.shortTermInvestments)} icon="trending-up" />
          <BalanceRow label="Accounts Receivable" value={fmtNum(latest?.netReceivables)} icon="document-text" />
          <BalanceRow label="Inventory" value={fmtNum(latest?.inventory)} icon="cube" />
          <BalanceRow label="Total Current Assets" value={fmtNum(latest?.totalCurrentAssets)} icon="checkmark-circle" isTotal />
        </View>

        <View style={balanceStyles.detailCard}>
          <View style={balanceStyles.subHeader}>
            <Ionicons name="business" size={14} color="#007AFF" />
            <Text style={balanceStyles.subHeaderText}>Non-Current Assets</Text>
          </View>
          <BalanceRow label="Property & Equipment" value={fmtNum(latest?.propertyPlantEquipmentNet)} icon="home" />
          <BalanceRow label="Goodwill" value={fmtNum(latest?.goodwill)} icon="star" />
          <BalanceRow label="Intangible Assets" value={fmtNum(latest?.intangibleAssets)} icon="bulb" />
          <BalanceRow label="Long-term Investments" value={fmtNum(latest?.longTermInvestments)} icon="pie-chart" />
          <BalanceRow label="Total Assets" value={fmtNum(latest?.totalAssets)} icon="cube" isTotal isFinal />
        </View>
      </View>

      {/* Liabilities Detail */}
      <View style={balanceStyles.detailSection}>
        <Text style={balanceStyles.sectionHeader}>
          <Ionicons name="card" size={16} color="#FF3B30" /> Liabilities
        </Text>

        <View style={balanceStyles.detailCard}>
          <View style={balanceStyles.subHeader}>
            <Ionicons name="time" size={14} color="#FF9500" />
            <Text style={balanceStyles.subHeaderText}>Current Liabilities</Text>
          </View>
          <BalanceRow label="Accounts Payable" value={fmtNum(latest?.accountPayables)} icon="receipt" />
          <BalanceRow label="Short-term Debt" value={fmtNum(latest?.shortTermDebt)} icon="card" />
          <BalanceRow label="Deferred Revenue" value={fmtNum(latest?.deferredRevenue)} icon="time" />
          <BalanceRow label="Total Current Liab" value={fmtNum(latest?.totalCurrentLiabilities)} icon="checkmark-circle" isTotal />
        </View>

        <View style={balanceStyles.detailCard}>
          <View style={balanceStyles.subHeader}>
            <Ionicons name="calendar" size={14} color="#FF3B30" />
            <Text style={balanceStyles.subHeaderText}>Long-term Liabilities</Text>
          </View>
          <BalanceRow label="Long-term Debt" value={fmtNum(latest?.longTermDebt)} icon="trending-down" />
          <BalanceRow label="Total Debt" value={fmtNum(latest?.totalDebt)} icon="alert-circle" />
          <BalanceRow label="Total Liabilities" value={fmtNum(latest?.totalLiabilities)} icon="card" isTotal isFinal />
        </View>
      </View>

      {/* Equity Detail */}
      <View style={balanceStyles.detailSection}>
        <Text style={balanceStyles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={16} color="#007AFF" /> Shareholders' Equity
        </Text>

        <View style={balanceStyles.detailCard}>
          <BalanceRow label="Common Stock" value={fmtNum(latest?.commonStock)} icon="people" />
          <BalanceRow label="Retained Earnings" value={fmtNum(latest?.retainedEarnings)} icon="wallet" />
          <BalanceRow label="Treasury Stock" value={fmtNum(latest?.treasuryStock)} icon="remove-circle" isNegative />
          <BalanceRow label="Total Equity" value={fmtNum(latest?.totalStockholdersEquity)} icon="shield-checkmark" isTotal isFinal />
        </View>
      </View>
    </>
  );
};

// Balance Row Component
const BalanceRow = ({ label, value, icon, isTotal, isFinal, isNegative }: {
  label: string;
  value: string;
  icon: string;
  isTotal?: boolean;
  isFinal?: boolean;
  isNegative?: boolean;
}) => (
  <View style={[balanceStyles.row, isTotal && balanceStyles.rowTotal, isFinal && balanceStyles.rowFinal]}>
    <View style={balanceStyles.rowLeft}>
      <View style={[balanceStyles.rowIcon, isTotal && balanceStyles.rowIconTotal]}>
        <Ionicons name={icon as any} size={14} color={isTotal ? '#007AFF' : '#8E8E93'} />
      </View>
      <Text style={[balanceStyles.rowLabel, isTotal && balanceStyles.rowLabelTotal]}>{label}</Text>
    </View>
    <Text style={[balanceStyles.rowValue, isTotal && balanceStyles.rowValueTotal, isNegative && balanceStyles.rowValueNegative]}>
      {value}
    </Text>
  </View>
);

const balanceStyles = StyleSheet.create({
  heroSection: {
    padding: 16,
    backgroundColor: '#0D0D0D',
  },
  heroSubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  equationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  equationItem: {
    alignItems: 'center',
    flex: 1,
  },
  equationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  equationLabel: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 4,
  },
  equationValue: {
    color: '#00C853',
    fontSize: 14,
    fontWeight: '700',
  },
  equationOperator: {
    color: '#8E8E93',
    fontSize: 18,
    fontWeight: '600',
  },
  ratiosGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  ratioCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  ratioLabel: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 6,
  },
  ratioValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  ratioHint: {
    color: '#636366',
    fontSize: 10,
    marginTop: 4,
  },
  compositionSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  compositionCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  barChart: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  barSegment: {
    height: '100%',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendContent: {
    flex: 1,
  },
  legendLabel: {
    color: '#8E8E93',
    fontSize: 12,
  },
  legendValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  detailSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  detailCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#2C2C2E',
  },
  subHeaderText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  rowTotal: {
    backgroundColor: '#1A1A2E',
  },
  rowFinal: {
    backgroundColor: '#0A1F2F',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowIconTotal: {
    backgroundColor: '#007AFF20',
  },
  rowLabel: {
    color: '#AEAEB2',
    fontSize: 13,
    flex: 1,
  },
  rowLabelTotal: {
    color: '#FFF',
    fontWeight: '600',
  },
  rowValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  rowValueTotal: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '700',
  },
  rowValueNegative: {
    color: '#FF3B30',
  },
});

// Cash Flow Tab
const CashFlowTab = ({ data, fmtNum }: any) => {
  if (!data || data.length === 0) {
    return <EmptyState message="No cash flow data available" />;
  }

  const latest = data[0];
  const operatingCF = latest?.operatingCashFlow || 0;
  const investingCF = latest?.netCashUsedForInvestingActivites || 0;
  const financingCF = latest?.netCashUsedProvidedByFinancingActivities || 0;
  const freeCashFlow = latest?.freeCashFlow || 0;
  const netChange = latest?.netChangeInCash || 0;

  // Calculate max for bar scaling
  const maxCF = Math.max(Math.abs(operatingCF), Math.abs(investingCF), Math.abs(financingCF), 1);

  const CashFlowBar = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) => {
    const barWidth = Math.abs(value) / maxCF * 100;
    const isNegative = value < 0;
    return (
      <View style={cashFlowStyles.cfBarItem}>
        <View style={cashFlowStyles.cfBarHeader}>
          <View style={[cashFlowStyles.cfBarIcon, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon as any} size={16} color={color} />
          </View>
          <Text style={cashFlowStyles.cfBarLabel}>{label}</Text>
          <Text style={[cashFlowStyles.cfBarValue, { color }]}>{fmtNum(value)}</Text>
        </View>
        <View style={cashFlowStyles.cfBarTrack}>
          <View style={[
            cashFlowStyles.cfBarFill,
            {
              width: `${barWidth}%`,
              backgroundColor: color,
              alignSelf: isNegative ? 'flex-end' : 'flex-start',
            }
          ]} />
        </View>
      </View>
    );
  };

  return (
    <>
      {/* Hero Section */}
      <View style={cashFlowStyles.heroSection}>
        <Text style={cashFlowStyles.heroSubtitle}>FY {new Date(latest?.date).getFullYear()}</Text>

        {/* Key Metrics Cards */}
        <View style={cashFlowStyles.metricsRow}>
          <View style={[cashFlowStyles.metricCard, { backgroundColor: '#0A2F1F', borderColor: '#00C85330' }]}>
            <View style={cashFlowStyles.metricIcon}>
              <Ionicons name="arrow-up-circle" size={24} color="#00C853" />
            </View>
            <Text style={cashFlowStyles.metricLabel}>Operating CF</Text>
            <Text style={[cashFlowStyles.metricValue, { color: operatingCF >= 0 ? '#00C853' : '#FF3B30' }]}>
              {fmtNum(operatingCF)}
            </Text>
          </View>
          <View style={[cashFlowStyles.metricCard, { backgroundColor: '#0A1F2F', borderColor: '#007AFF30' }]}>
            <View style={cashFlowStyles.metricIcon}>
              <Ionicons name="diamond" size={24} color="#007AFF" />
            </View>
            <Text style={cashFlowStyles.metricLabel}>Free Cash Flow</Text>
            <Text style={[cashFlowStyles.metricValue, { color: freeCashFlow >= 0 ? '#00C853' : '#FF3B30' }]}>
              {fmtNum(freeCashFlow)}
            </Text>
          </View>
        </View>

        {/* Cash Flow Bars */}
        <View style={cashFlowStyles.cfBarsCard}>
          <Text style={cashFlowStyles.cfBarsTitle}>Cash Flow Summary</Text>
          <CashFlowBar label="Operating" value={operatingCF} color="#00C853" icon="business" />
          <CashFlowBar label="Investing" value={investingCF} color="#FF9500" icon="trending-down" />
          <CashFlowBar label="Financing" value={financingCF} color="#AF52DE" icon="card" />
          <View style={cashFlowStyles.cfNetChange}>
            <View style={cashFlowStyles.cfNetChangeLeft}>
              <Ionicons name="swap-horizontal" size={18} color="#007AFF" />
              <Text style={cashFlowStyles.cfNetChangeLabel}>Net Change in Cash</Text>
            </View>
            <Text style={[cashFlowStyles.cfNetChangeValue, { color: netChange >= 0 ? '#00C853' : '#FF3B30' }]}>
              {fmtNum(netChange)}
            </Text>
          </View>
        </View>
      </View>

      {/* Operating Activities */}
      <View style={cashFlowStyles.activitySection}>
        <View style={cashFlowStyles.activityHeader}>
          <View style={[cashFlowStyles.activityBadge, { backgroundColor: '#0A2F1F' }]}>
            <Ionicons name="business" size={18} color="#00C853" />
          </View>
          <View style={cashFlowStyles.activityHeaderText}>
            <Text style={cashFlowStyles.activityTitle}>Operating Activities</Text>
            <Text style={cashFlowStyles.activitySubtitle}>Cash from core business operations</Text>
          </View>
          <Text style={[cashFlowStyles.activityTotal, { color: operatingCF >= 0 ? '#00C853' : '#FF3B30' }]}>
            {fmtNum(operatingCF)}
          </Text>
        </View>

        <View style={cashFlowStyles.activityCard}>
          <CashFlowRow icon="wallet" label="Net Income" value={fmtNum(latest?.netIncome)} type="inflow" />
          <CashFlowRow icon="add-circle" label="Depreciation & Amortization" value={fmtNum(latest?.depreciationAndAmortization)} type="adjustment" />
          <CashFlowRow icon="person" label="Stock-Based Compensation" value={fmtNum(latest?.stockBasedCompensation)} type="adjustment" />
          <CashFlowRow icon="sync" label="Change in Working Capital" value={fmtNum(latest?.changeInWorkingCapital)} type="adjustment" />
          <CashFlowRow icon="document-text" label="Accounts Receivable" value={fmtNum(latest?.accountsReceivables)} type="adjustment" />
          <CashFlowRow icon="cube" label="Inventory" value={fmtNum(latest?.inventory)} type="adjustment" />
          <CashFlowRow icon="receipt" label="Accounts Payable" value={fmtNum(latest?.accountsPayables)} type="adjustment" />
        </View>
      </View>

      {/* Investing Activities */}
      <View style={cashFlowStyles.activitySection}>
        <View style={cashFlowStyles.activityHeader}>
          <View style={[cashFlowStyles.activityBadge, { backgroundColor: '#2F2A0A' }]}>
            <Ionicons name="trending-down" size={18} color="#FF9500" />
          </View>
          <View style={cashFlowStyles.activityHeaderText}>
            <Text style={cashFlowStyles.activityTitle}>Investing Activities</Text>
            <Text style={cashFlowStyles.activitySubtitle}>Capital expenditure & investments</Text>
          </View>
          <Text style={[cashFlowStyles.activityTotal, { color: investingCF >= 0 ? '#00C853' : '#FF9500' }]}>
            {fmtNum(investingCF)}
          </Text>
        </View>

        <View style={cashFlowStyles.activityCard}>
          <CashFlowRow icon="hammer" label="Capital Expenditure" value={fmtNum(latest?.capitalExpenditure)} type="outflow" />
          <CashFlowRow icon="business" label="Acquisitions (Net)" value={fmtNum(latest?.acquisitionsNet)} type="outflow" />
          <CashFlowRow icon="cart" label="Investments Purchased" value={fmtNum(latest?.purchasesOfInvestments)} type="outflow" />
          <CashFlowRow icon="cash" label="Investments Sold/Matured" value={fmtNum(latest?.salesMaturitiesOfInvestments)} type="inflow" />
        </View>
      </View>

      {/* Financing Activities */}
      <View style={cashFlowStyles.activitySection}>
        <View style={cashFlowStyles.activityHeader}>
          <View style={[cashFlowStyles.activityBadge, { backgroundColor: '#1F0A2F' }]}>
            <Ionicons name="card" size={18} color="#AF52DE" />
          </View>
          <View style={cashFlowStyles.activityHeaderText}>
            <Text style={cashFlowStyles.activityTitle}>Financing Activities</Text>
            <Text style={cashFlowStyles.activitySubtitle}>Debt, dividends & buybacks</Text>
          </View>
          <Text style={[cashFlowStyles.activityTotal, { color: financingCF >= 0 ? '#00C853' : '#AF52DE' }]}>
            {fmtNum(financingCF)}
          </Text>
        </View>

        <View style={cashFlowStyles.activityCard}>
          <CashFlowRow icon="remove-circle" label="Debt Repayment" value={fmtNum(latest?.debtRepayment)} type="outflow" />
          <CashFlowRow icon="gift" label="Dividends Paid" value={fmtNum(latest?.dividendsPaid)} type="outflow" />
          <CashFlowRow icon="arrow-back-circle" label="Stock Buybacks" value={fmtNum(latest?.commonStockRepurchased)} type="outflow" />
          <CashFlowRow icon="add-circle" label="Stock Issued" value={fmtNum(latest?.commonStockIssued)} type="inflow" />
        </View>
      </View>

      {/* Cash Position */}
      <View style={cashFlowStyles.cashPositionSection}>
        <Text style={cashFlowStyles.sectionHeader}>
          <Ionicons name="wallet" size={16} color="#007AFF" /> Cash Position
        </Text>
        <View style={cashFlowStyles.cashPositionCard}>
          <View style={cashFlowStyles.cashPositionRow}>
            <View style={cashFlowStyles.cashPositionItem}>
              <Text style={cashFlowStyles.cashPositionLabel}>Beginning</Text>
              <Text style={cashFlowStyles.cashPositionValue}>{fmtNum(latest?.cashAtBeginningOfPeriod)}</Text>
            </View>
            <View style={cashFlowStyles.cashPositionArrow}>
              <Ionicons name="arrow-forward" size={20} color={netChange >= 0 ? '#00C853' : '#FF3B30'} />
              <Text style={[cashFlowStyles.cashPositionChange, { color: netChange >= 0 ? '#00C853' : '#FF3B30' }]}>
                {netChange >= 0 ? '+' : ''}{fmtNum(netChange)}
              </Text>
            </View>
            <View style={cashFlowStyles.cashPositionItem}>
              <Text style={cashFlowStyles.cashPositionLabel}>Ending</Text>
              <Text style={[cashFlowStyles.cashPositionValue, { color: '#007AFF' }]}>{fmtNum(latest?.cashAtEndOfPeriod)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Historical FCF */}
      <View style={cashFlowStyles.historicalSection}>
        <Text style={cashFlowStyles.sectionHeader}>
          <Ionicons name="time" size={16} color="#8E8E93" /> 4-Year Free Cash Flow
        </Text>

        <View style={cashFlowStyles.fcfTrendCard}>
          {data.slice(0, 4).reverse().map((item: any, idx: number) => {
            const maxFCF = Math.max(...data.slice(0, 4).map((d: any) => Math.abs(d.freeCashFlow || 0)));
            const barHeight = maxFCF > 0 ? (Math.abs(item.freeCashFlow || 0) / maxFCF) * 70 : 0;
            const isPositive = (item.freeCashFlow || 0) >= 0;
            return (
              <View key={idx} style={cashFlowStyles.fcfTrendItem}>
                <Text style={[cashFlowStyles.fcfTrendValue, { color: isPositive ? '#00C853' : '#FF3B30' }]}>
                  {fmtNum(item.freeCashFlow)}
                </Text>
                <View style={cashFlowStyles.fcfTrendBarContainer}>
                  <View style={[
                    cashFlowStyles.fcfTrendBar,
                    {
                      height: barHeight,
                      backgroundColor: isPositive ? '#00C853' : '#FF3B30',
                    }
                  ]} />
                </View>
                <Text style={cashFlowStyles.fcfTrendYear}>{new Date(item.date).getFullYear()}</Text>
              </View>
            );
          })}
        </View>

        {/* Operating vs FCF Comparison */}
        <View style={cashFlowStyles.comparisonCard}>
          <View style={cashFlowStyles.comparisonHeader}>
            <Text style={cashFlowStyles.comparisonTitle}>Operating CF vs Free CF</Text>
          </View>
          {data.slice(0, 4).map((item: any, idx: number) => (
            <View key={idx} style={cashFlowStyles.comparisonRow}>
              <Text style={cashFlowStyles.comparisonYear}>{new Date(item.date).getFullYear()}</Text>
              <View style={cashFlowStyles.comparisonBars}>
                <View style={cashFlowStyles.comparisonBarGroup}>
                  <View style={[
                    cashFlowStyles.comparisonBar,
                    {
                      width: `${Math.min((Math.abs(item.operatingCashFlow || 0) / Math.max(...data.slice(0, 4).map((d: any) => Math.abs(d.operatingCashFlow || 0))) * 100), 100)}%`,
                      backgroundColor: '#007AFF',
                    }
                  ]} />
                  <View style={[
                    cashFlowStyles.comparisonBar,
                    {
                      width: `${Math.min((Math.abs(item.freeCashFlow || 0) / Math.max(...data.slice(0, 4).map((d: any) => Math.abs(d.operatingCashFlow || 0))) * 100), 100)}%`,
                      backgroundColor: '#00C853',
                    }
                  ]} />
                </View>
              </View>
              <View style={cashFlowStyles.comparisonValues}>
                <Text style={[cashFlowStyles.comparisonValue, { color: '#007AFF' }]}>{fmtNum(item.operatingCashFlow)}</Text>
                <Text style={[cashFlowStyles.comparisonValue, { color: '#00C853' }]}>{fmtNum(item.freeCashFlow)}</Text>
              </View>
            </View>
          ))}
          <View style={cashFlowStyles.comparisonLegend}>
            <View style={cashFlowStyles.legendItem}>
              <View style={[cashFlowStyles.legendDot, { backgroundColor: '#007AFF' }]} />
              <Text style={cashFlowStyles.legendText}>Operating CF</Text>
            </View>
            <View style={cashFlowStyles.legendItem}>
              <View style={[cashFlowStyles.legendDot, { backgroundColor: '#00C853' }]} />
              <Text style={cashFlowStyles.legendText}>Free CF</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
};

// Cash Flow Row Component
const CashFlowRow = ({ icon, label, value, type }: {
  icon: string;
  label: string;
  value: string;
  type: 'inflow' | 'outflow' | 'adjustment';
}) => {
  const getTypeColor = () => {
    switch (type) {
      case 'inflow': return '#00C853';
      case 'outflow': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  return (
    <View style={cashFlowStyles.cfRow}>
      <View style={[cashFlowStyles.cfRowIcon, { backgroundColor: `${getTypeColor()}15` }]}>
        <Ionicons name={icon as any} size={14} color={getTypeColor()} />
      </View>
      <Text style={cashFlowStyles.cfRowLabel}>{label}</Text>
      <Text style={[cashFlowStyles.cfRowValue, { color: type === 'inflow' ? '#00C853' : type === 'outflow' ? '#FF3B30' : '#FFF' }]}>
        {value}
      </Text>
    </View>
  );
};

const cashFlowStyles = StyleSheet.create({
  heroSection: {
    padding: 16,
    backgroundColor: '#0D0D0D',
  },
  heroSubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  cfBarsCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  cfBarsTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  cfBarItem: {
    marginBottom: 16,
  },
  cfBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  cfBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cfBarLabel: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
  },
  cfBarValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  cfBarTrack: {
    height: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  cfBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  cfNetChange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    marginTop: 8,
  },
  cfNetChangeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cfNetChangeLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cfNetChangeValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  activitySection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  activityBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityHeaderText: {
    flex: 1,
  },
  activityTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  activitySubtitle: {
    color: '#636366',
    fontSize: 12,
    marginTop: 2,
  },
  activityTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  activityCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    gap: 10,
  },
  cfRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cfRowLabel: {
    flex: 1,
    color: '#AEAEB2',
    fontSize: 13,
  },
  cfRowValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  cashPositionSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  cashPositionCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
  },
  cashPositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cashPositionItem: {
    alignItems: 'center',
    flex: 1,
  },
  cashPositionLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 6,
  },
  cashPositionValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cashPositionArrow: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cashPositionChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  historicalSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  fcfTrendCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  fcfTrendItem: {
    alignItems: 'center',
    flex: 1,
  },
  fcfTrendValue: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  fcfTrendBarContainer: {
    height: 70,
    width: 24,
    backgroundColor: '#2C2C2E',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  fcfTrendBar: {
    width: '100%',
    borderRadius: 6,
  },
  fcfTrendYear: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  comparisonCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  comparisonHeader: {
    padding: 14,
    backgroundColor: '#2C2C2E',
  },
  comparisonTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  comparisonYear: {
    color: '#8E8E93',
    fontSize: 13,
    width: 50,
  },
  comparisonBars: {
    flex: 1,
    marginHorizontal: 10,
  },
  comparisonBarGroup: {
    gap: 4,
  },
  comparisonBar: {
    height: 8,
    borderRadius: 4,
  },
  comparisonValues: {
    width: 80,
    alignItems: 'flex-end',
  },
  comparisonValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  comparisonLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#8E8E93',
    fontSize: 12,
  },
});

// Ratios Tab
const RatiosTab = ({ ratios, keyMetrics, fmtPct, fmtRatio }: any) => {
  if (!ratios && !keyMetrics) {
    return <EmptyState message="No financial ratios available" />;
  }

  return (
    <>
      <Section title="Profitability">
        <DataRow label="Gross Margin" value={fmtPct(ratios?.grossProfitMargin)} />
        <DataRow label="Operating Margin" value={fmtPct(ratios?.operatingProfitMargin)} />
        <DataRow label="Net Profit Margin" value={fmtPct(ratios?.netProfitMargin)} />
        <DataRow label="EBITDA Margin" value={fmtPct(keyMetrics?.ebitdaMargin)} />
      </Section>

      <Section title="Returns">
        <DataRow label="Return on Assets (ROA)" value={fmtPct(ratios?.returnOnAssets)} />
        <DataRow label="Return on Equity (ROE)" value={fmtPct(ratios?.returnOnEquity)} />
        <DataRow label="Return on Capital (ROIC)" value={fmtPct(keyMetrics?.roic)} />
      </Section>

      <Section title="Liquidity">
        <DataRow label="Current Ratio" value={fmtRatio(ratios?.currentRatio)} />
        <DataRow label="Quick Ratio" value={fmtRatio(ratios?.quickRatio)} />
        <DataRow label="Cash Ratio" value={fmtRatio(ratios?.cashRatio)} />
      </Section>

      <Section title="Leverage">
        <DataRow label="Debt/Equity" value={fmtRatio(ratios?.debtEquityRatio)} />
        <DataRow label="Debt/Assets" value={fmtRatio(ratios?.debtRatio)} />
        <DataRow label="Interest Coverage" value={fmtRatio(ratios?.interestCoverage)} />
        <DataRow label="Net Debt/EBITDA" value={fmtRatio(keyMetrics?.netDebtToEBITDA)} />
      </Section>

      <Section title="Efficiency">
        <DataRow label="Asset Turnover" value={fmtRatio(ratios?.assetTurnover)} />
        <DataRow label="Inventory Turnover" value={fmtRatio(ratios?.inventoryTurnover)} />
        <DataRow label="Receivables Turnover" value={fmtRatio(ratios?.receivablesTurnover)} />
        <DataRow label="Payables Turnover" value={fmtRatio(ratios?.payablesTurnover)} />
      </Section>

      <Section title="Per Share">
        <DataRow label="Earnings/Share" value={keyMetrics?.earningsYield ? `$${(1/keyMetrics.earningsYield).toFixed(2)}` : "—"} />
        <DataRow label="Book Value/Share" value={keyMetrics?.bookValuePerShare ? `$${keyMetrics.bookValuePerShare.toFixed(2)}` : "—"} />
        <DataRow label="Tangible Book/Share" value={keyMetrics?.tangibleBookValuePerShare ? `$${keyMetrics.tangibleBookValuePerShare.toFixed(2)}` : "—"} />
        <DataRow label="FCF/Share" value={keyMetrics?.freeCashFlowPerShare ? `$${keyMetrics.freeCashFlowPerShare.toFixed(2)}` : "—"} />
      </Section>
    </>
  );
};

// Reusable Components
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const DataRow = ({
  label,
  value,
  change,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  change?: React.ReactNode;
  highlight?: boolean;
  negative?: boolean;
}) => (
  <View style={[styles.row, highlight && styles.rowHighlight]}>
    <Text style={[styles.label, highlight && styles.labelHighlight]}>{label}</Text>
    <View style={styles.valueContainer}>
      {change}
      <Text style={[styles.value, highlight && styles.valueHighlight, negative && styles.valueNegative]}>
        {value}
      </Text>
    </View>
  </View>
);

const EmptyState = ({ message }: { message: string }) => (
  <View style={styles.emptyState}>
    <Ionicons name="document-text-outline" size={48} color="#636366" />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#8E8E93",
    marginTop: 12,
    fontSize: 15,
  },
  // Tab Bar - Compact Design
  tabBar: {
    backgroundColor: "#0D0D0D",
    maxHeight: 44,
  },
  tabBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 4,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "transparent",
    gap: 4,
  },
  tabActive: {
    backgroundColor: "#1C1C1E",
  },
  tabText: {
    color: "#636366",
    fontSize: 12,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#FFF",
  },
  // Error
  errorBanner: {
    backgroundColor: "#FF3B30",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    color: "#FFF",
    fontSize: 14,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  retryText: {
    color: "#FF3B30",
    fontWeight: "700",
    fontSize: 13,
  },
  // Content
  content: {
    flex: 1,
  },
  periodHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1C1C1E",
  },
  periodTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },
  periodSubtitle: {
    color: "#8E8E93",
    fontSize: 14,
    marginTop: 4,
  },
  // Section
  section: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: "#007AFF",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    overflow: "hidden",
  },
  // Row
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2E",
  },
  rowHighlight: {
    backgroundColor: "#2C2C2E",
  },
  label: {
    color: "#8E8E93",
    fontSize: 14,
    flex: 1,
  },
  labelHighlight: {
    color: "#FFF",
    fontWeight: "600",
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  value: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  valueHighlight: {
    fontSize: 15,
    fontWeight: "700",
  },
  valueNegative: {
    color: "#FF3B30",
  },
  changeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Description
  description: {
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 22,
    padding: 14,
  },
  // Historical Table
  histTable: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    overflow: "hidden",
  },
  histHeader: {
    flexDirection: "row",
    backgroundColor: "#2C2C2E",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  histHeaderText: {
    color: "#8E8E93",
    fontWeight: "700",
  },
  histRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2E",
  },
  histCell: {
    flex: 1,
    color: "#FFF",
    fontSize: 13,
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  emptyText: {
    color: "#8E8E93",
    fontSize: 15,
    marginTop: 12,
  },
});
