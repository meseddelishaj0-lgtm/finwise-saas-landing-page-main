// app/market-calendar.tsx
// Full Market Calendar — earnings / IPOs / dividends with real date
// navigation: month day-strip, quick ranges (yesterday, past week/month,
// upcoming), past events show actuals alongside estimates.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { cachedJson } from '@/lib/cachedFetch';

const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

type TabKey = 'earnings' | 'ipos' | 'dividends';

const TABS: { key: TabKey; label: string; icon: any; tint: string; endpoint: string }[] = [
  { key: 'earnings', label: 'Earnings', icon: 'bar-chart', tint: '#FFD60A', endpoint: 'earning_calendar' },
  { key: 'ipos', label: 'IPOs', icon: 'rocket', tint: '#34C759', endpoint: 'ipo_calendar' },
  { key: 'dividends', label: 'Dividends', icon: 'cash', tint: '#0A84FF', endpoint: 'stock_dividend_calendar' },
];

type ChipKey = 'yesterday' | 'today' | 'pastWeek' | 'pastMonth' | 'upcoming';

// Either a quick range or a single tapped calendar day
type Selection = { kind: 'chip'; chip: ChipKey } | { kind: 'day'; date: string };

const isUsSymbol = (sym: string) => /^[A-Z]{1,5}$/.test(sym || '');

// Well-known large caps float to the top within the same date
const CAL_PRIORITY = new Set([
  'AAPL','MSFT','NVDA','GOOGL','GOOG','AMZN','META','TSLA','AVGO','JPM','LLY','V','MA','UNH',
  'XOM','WMT','HD','PG','COST','ORCL','NFLX','AMD','CRM','BAC','KO','PEP','DIS','CSCO','INTC',
  'PLTR','UBER','MU','TSM','ANET','VRT','SHOP','CRWD','NOW','SNOW','DDOG','ISRG','TTD','ABBV',
  'MRK','PFE','TMO','ABT','NKE','MCD','SBUX','CAT','GE','BA','GS','MS','C','WFC','T','VZ','IBM',
]);

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
const todayLocal = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};
const fmtShort = (dateStr: string) => {
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt((dateStr || '').slice(5, 7), 10) - 1] || '';
  return `${mon} ${parseInt((dateStr || '').slice(8, 10), 10) || ''}`;
};

const chipWindow = (chip: ChipKey): { from: string; to: string } => {
  const t0 = todayLocal();
  switch (chip) {
    case 'yesterday': return { from: iso(addDays(t0, -1)), to: iso(addDays(t0, -1)) };
    case 'today': return { from: iso(t0), to: iso(t0) };
    case 'pastWeek': return { from: iso(addDays(t0, -7)), to: iso(addDays(t0, -1)) };
    case 'pastMonth': return { from: iso(addDays(t0, -30)), to: iso(addDays(t0, -1)) };
    case 'upcoming': return { from: iso(t0), to: iso(addDays(t0, 14)) };
  }
};

export default function MarketCalendarScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  const initialTab: TabKey = (['earnings', 'ipos', 'dividends'] as TabKey[]).includes(params.tab as TabKey)
    ? (params.tab as TabKey)
    : 'earnings';

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [sel, setSel] = useState<Selection>({ kind: 'chip', chip: 'upcoming' });
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const t0 = todayLocal();
    return new Date(t0.getFullYear(), t0.getMonth(), 1);
  });
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const stripRef = useRef<ScrollView>(null);

  const tabSpec = TABS.find((x) => x.key === tab)!;

  const window_ = useMemo(() => {
    if (sel.kind === 'chip') return chipWindow(sel.chip);
    return { from: sel.date, to: sel.date };
  }, [sel]);

  // ---- event list for the selected window ----
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const data = await cachedJson(
          `${BASE_URL}/${tabSpec.endpoint}?from=${window_.from}&to=${window_.to}&apikey=${FMP_API_KEY}`,
          30 * 60 * 1000,
          { cacheKey: `calscr-${tab}-${window_.from}-${window_.to}` }
        ).catch(() => []);
        if (!alive) return;
        let list = (Array.isArray(data) ? data : []).filter((r: any) => r?.symbol && isUsSymbol(r.symbol));
        if (tab === 'dividends') list = list.filter((r: any) => (r.dividend || 0) > 0);
        const pastOnly = window_.to < iso(todayLocal());
        list.sort((a: any, b: any) => {
          const c = String(a.date).localeCompare(String(b.date));
          if (c !== 0) return pastOnly ? -c : c;
          const ap = CAL_PRIORITY.has(a.symbol) ? 0 : 1;
          const bp = CAL_PRIORITY.has(b.symbol) ? 0 : 1;
          return ap - bp;
        });
        setRows(list.slice(0, 150));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, window_.from, window_.to]);

  // ---- per-day event dots for the visible month ----
  useEffect(() => {
    let alive = true;
    (async () => {
      const from = iso(viewMonth);
      const to = iso(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0));
      try {
        const data = await cachedJson(
          `${BASE_URL}/${tabSpec.endpoint}?from=${from}&to=${to}&apikey=${FMP_API_KEY}`,
          6 * 60 * 60 * 1000,
          { cacheKey: `calmon-${tab}-${from}` }
        ).catch(() => []);
        if (!alive) return;
        const counts: Record<string, number> = {};
        (Array.isArray(data) ? data : []).forEach((r: any) => {
          if (!r?.symbol || !isUsSymbol(r.symbol)) return;
          if (tab === 'dividends' && !((r.dividend || 0) > 0)) return;
          const d = String(r.date || '').slice(0, 10);
          if (d) counts[d] = (counts[d] || 0) + 1;
        });
        setDayCounts(counts);
      } catch {}
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, viewMonth]);

  // Days of the visible month for the strip
  const monthDays = useMemo(() => {
    const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    return Array.from({ length: last }, (_, i) => {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1);
      return { date: iso(d), day: i + 1, weekday: WEEKDAYS[d.getDay()] };
    });
  }, [viewMonth]);

  const selectedDay = sel.kind === 'day' ? sel.date : null;
  const todayIso = iso(todayLocal());

  // Keep the selected/today cell in view when month or selection changes
  useEffect(() => {
    const target = selectedDay && selectedDay.slice(0, 7) === iso(viewMonth).slice(0, 7)
      ? parseInt(selectedDay.slice(8, 10), 10)
      : todayIso.slice(0, 7) === iso(viewMonth).slice(0, 7)
        ? parseInt(todayIso.slice(8, 10), 10)
        : 1;
    const x = Math.max(0, (target - 3) * 52);
    setTimeout(() => stripRef.current?.scrollTo({ x, animated: false }), 50);
  }, [viewMonth, selectedDay, todayIso]);

  const shiftMonth = (delta: number) =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const CHIPS: { key: ChipKey; label: string }[] = [
    { key: 'yesterday', label: t('Yesterday') },
    { key: 'today', label: t('Today') },
    { key: 'pastWeek', label: t('Past Week') },
    { key: 'pastMonth', label: t('Past Month') },
    { key: 'upcoming', label: t('Upcoming') },
  ];

  const renderRow = ({ item }: { item: any }) => {
    const navigable = tab !== 'ipos';
    let detail: React.ReactNode = null;
    if (tab === 'earnings') {
      const est = item.epsEstimated != null ? Number(item.epsEstimated) : null;
      const act = item.eps != null ? Number(item.eps) : null;
      const beat = act != null && est != null ? act >= est : null;
      detail = (
        <Text style={[styles.rowDetail, { color: colors.textSecondary }]} numberOfLines={1}>
          {est != null ? `${t('Est. EPS')} $${est.toFixed(2)}` : '—'}
          {act != null && (
            <>
              {'   '}
              <Text style={{ color: beat ? '#34C759' : '#FF453A', fontWeight: '600' }}>
                {t('Actual')} ${act.toFixed(2)}
              </Text>
            </>
          )}
        </Text>
      );
    } else if (tab === 'ipos') {
      const range = item.priceRange ? `${t('Price Range')} ${item.priceRange}` : null;
      detail = (
        <Text style={[styles.rowDetail, { color: colors.textSecondary }]} numberOfLines={1}>
          {(item.company || '').slice(0, 30)}
          {range ? `  ·  ${range}` : ''}
          {item.exchange ? `  ·  ${item.exchange}` : ''}
        </Text>
      );
    } else {
      detail = (
        <Text style={[styles.rowDetail, { color: colors.textSecondary }]} numberOfLines={1}>
          {`$${Number(item.dividend || 0).toFixed(2)} ${t('per share')}`}
          {item.paymentDate ? `  ·  ${t('Payment')} ${fmtShort(item.paymentDate)}` : ''}
        </Text>
      );
    }
    return (
      <TouchableOpacity
        activeOpacity={navigable ? 0.6 : 1}
        onPress={() => { if (navigable) router.push(`/symbol/${item.symbol}` as any); }}
        style={[styles.row, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.borderLight : '#EEE' }]}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={[styles.rowSymbol, { color: colors.text }]}>{item.symbol}</Text>
          {detail}
        </View>
        <View style={[styles.dateChip, { backgroundColor: tabSpec.tint + '16' }]}>
          <Text style={[styles.dateChipText, { color: tabSpec.tint }]}>{fmtShort(item.date)}</Text>
        </View>
        {navigable && (
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 6 }} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('Back')}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Market Calendar')}</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Type tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((x) => {
          const active = tab === x.key;
          return (
            <TouchableOpacity
              key={x.key}
              onPress={() => setTab(x.key)}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: active ? x.tint + (isDark ? '22' : '18') : (isDark ? colors.surface : '#FFFFFF'),
                  borderColor: active ? x.tint + '66' : (isDark ? colors.borderLight : '#E5E5EA'),
                },
              ]}
            >
              <Ionicons name={x.icon} size={14} color={active ? x.tint : colors.textTertiary} />
              <Text style={[styles.tabLabel, { color: active ? (isDark ? '#FFF' : colors.text) : colors.textSecondary }]}>
                {t(x.label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick ranges */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
        {CHIPS.map((c) => {
          const active = sel.kind === 'chip' && sel.chip === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setSel({ kind: 'chip', chip: c.key })}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary + (isDark ? '26' : '1C') : (isDark ? colors.surface : '#FFFFFF'),
                  borderColor: active ? colors.primary : (isDark ? colors.borderLight : '#E5E5EA'),
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Month calendar strip */}
      <View style={[styles.monthCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.borderLight : '#E5E5EA' }]}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.monthArrow} accessibilityRole="button">
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.monthArrow} accessibilityRole="button">
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView ref={stripRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
          {monthDays.map((d) => {
            const isSel = selectedDay === d.date;
            const isToday = d.date === todayIso;
            const hasEvents = (dayCounts[d.date] || 0) > 0;
            return (
              <TouchableOpacity
                key={d.date}
                onPress={() => setSel({ kind: 'day', date: d.date })}
                style={[
                  styles.dayCell,
                  isSel && { backgroundColor: tabSpec.tint + (isDark ? '2A' : '20'), borderColor: tabSpec.tint },
                  !isSel && isToday && { borderColor: colors.primary + '88' },
                ]}
              >
                <Text style={[styles.dayWeekday, { color: isSel ? tabSpec.tint : colors.textTertiary }]}>{d.weekday}</Text>
                <Text style={[styles.dayNum, { color: isSel ? tabSpec.tint : colors.text }]}>{d.day}</Text>
                <View style={[styles.dayDot, { backgroundColor: hasEvents ? tabSpec.tint : 'transparent' }]} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Events */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : rows.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textTertiary }]}>
          {sel.kind === 'day' ? t('No events on this date') : t('No events in this period')}
        </Text>
      ) : (
        <FlatList
          data={rows}
          style={{ flex: 1 }}
          keyExtractor={(item, i) => `${item.symbol}-${item.date}-${i}`}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 13, fontWeight: '700' },
  chipsScroll: { flexGrow: 0, marginBottom: 10 },
  chipsRow: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  monthCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    marginBottom: 12,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  monthArrow: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 15, fontWeight: '700' },
  daysRow: { paddingHorizontal: 10, gap: 6 },
  dayCell: {
    width: 46,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayWeekday: { fontSize: 10, fontWeight: '600', marginBottom: 3 },
  dayNum: { fontSize: 15, fontWeight: '700' },
  dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  loadingWrap: { paddingTop: 40, alignItems: 'center' },
  empty: { textAlign: 'center', paddingTop: 40, fontSize: 14, paddingHorizontal: 24 },
  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowSymbol: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  rowDetail: { fontSize: 12.5 },
  dateChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dateChipText: { fontSize: 12, fontWeight: '700' },
});
