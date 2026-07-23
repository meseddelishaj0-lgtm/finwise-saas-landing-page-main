// app/onboarding.tsx
// Interactive onboarding wizard: users build a real watchlist, seed their
// portfolio, and pick notification alerts — everything they tap here is
// saved through the same APIs the app uses (watchlist, portfolio,
// OneSignal preference tags).
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInRight,
  FadeInUp,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import { useWatchlist } from '@/context/WatchlistContext';
import { usePortfolio } from '@/context/PortfolioContext';
import { useLanguage } from '@/context/LanguageContext';
import { fetchQuotesWithCache } from '@/services/quoteService';
import StockLogo from '@/components/StockLogo';

let OneSignal: any = null;
try {
  // v5 SDK: named export { OneSignal }, no default (".default" broke on the v5 upgrade)
  const osModule = require('react-native-onesignal');
  OneSignal = osModule?.OneSignal ?? osModule?.default ?? null;
} catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GOLD = '#FFD60A';
const GOLD_DIM = '#B8860B';
const BG = '#0A0A08';
const CARD = '#16140F';

// ---------------------------------------------------------------- catalogs

const INTERESTS = [
  { key: 'stocks', label: 'Stocks', emoji: '📈' },
  { key: 'crypto', label: 'Crypto', emoji: '₿' },
  { key: 'etfs', label: 'ETFs', emoji: '🧺' },
  { key: 'dividends', label: 'Dividends', emoji: '💰' },
  { key: 'ai', label: 'AI Research', emoji: '🤖' },
  { key: 'daytrading', label: 'Day Trading', emoji: '⚡' },
  { key: 'longterm', label: 'Long-Term', emoji: '🎯' },
  { key: 'news', label: 'Market News', emoji: '📰' },
];

const TICKER_GROUPS: Record<string, { label: string; symbols: { symbol: string; name: string }[] }> = {
  stocks: {
    label: 'Stocks',
    symbols: [
      { symbol: 'NVDA', name: 'NVIDIA' },
      { symbol: 'AAPL', name: 'Apple' },
      { symbol: 'TSLA', name: 'Tesla' },
      { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'AMZN', name: 'Amazon' },
      { symbol: 'META', name: 'Meta' },
      { symbol: 'GOOGL', name: 'Alphabet' },
      { symbol: 'AMD', name: 'AMD' },
      { symbol: 'PLTR', name: 'Palantir' },
      { symbol: 'NFLX', name: 'Netflix' },
      { symbol: 'KO', name: 'Coca-Cola' },
      { symbol: 'DIS', name: 'Disney' },
    ],
  },
  crypto: {
    label: 'Crypto',
    symbols: [
      { symbol: 'BTCUSD', name: 'Bitcoin' },
      { symbol: 'ETHUSD', name: 'Ethereum' },
      { symbol: 'SOLUSD', name: 'Solana' },
      { symbol: 'XRPUSD', name: 'XRP' },
      { symbol: 'DOGEUSD', name: 'Dogecoin' },
      { symbol: 'ADAUSD', name: 'Cardano' },
    ],
  },
  etfs: {
    label: 'ETFs',
    symbols: [
      { symbol: 'SPY', name: 'S&P 500' },
      { symbol: 'QQQ', name: 'Nasdaq 100' },
      { symbol: 'VOO', name: 'Vanguard S&P' },
      { symbol: 'SCHD', name: 'Dividend ETF' },
      { symbol: 'ARKK', name: 'ARK Innovation' },
      { symbol: 'GLD', name: 'Gold' },
    ],
  },
};

const ALERT_CATEGORIES = [
  { key: 'price_alerts', label: 'Price Alerts', emoji: '🏷️' },
  { key: 'watchlist', label: 'Watchlist News', emoji: '⭐' },
  { key: 'market_news', label: 'Market News', emoji: '📰' },
  { key: 'market_movers', label: 'Market Movers', emoji: '🚀' },
  { key: 'daily_recap', label: 'Daily Recap', emoji: '🌙' },
  { key: 'social', label: 'Social Activity', emoji: '❤️' },
  { key: 'messages', label: 'Messages', emoji: '💬' },
];

const TOTAL_STEPS = 7;

// ---------------------------------------------------------------- screen

export default function Onboarding() {
  const router = useRouter();
  const { t } = useLanguage();
  const { addToWatchlist } = useWatchlist();
  const { addHolding } = usePortfolio();

  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [owned, setOwned] = useState<Record<string, number>>({}); // symbol -> shares
  const [alertsOn, setAlertsOn] = useState<Set<string>>(new Set(ALERT_CATEGORIES.map((c) => c.key)));
  const [quotes, setQuotes] = useState<Record<string, { price: number; changePct: number }>>({});
  const [saving, setSaving] = useState(false);
  const [savedCounts, setSavedCounts] = useState({ watch: 0, holdings: 0 });
  const [selectedPlan, setSelectedPlan] = useState('diamond');

  const progress = useSharedValue(1 / TOTAL_STEPS);
  useEffect(() => {
    progress.value = withSpring((step + 1) / TOTAL_STEPS, { damping: 16 });
  }, [step, progress]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  // Live prices for the ticker grid
  useEffect(() => {
    const all = Object.values(TICKER_GROUPS).flatMap((g) => g.symbols.map((s) => s.symbol));
    fetchQuotesWithCache(all, { timeout: 12000 })
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, { price: number; changePct: number }> = {};
        for (const q of data) {
          map[q.symbol] = { price: q.price || 0, changePct: q.changesPercentage || 0 };
        }
        setQuotes(map);
      })
      .catch(() => {});
  }, []);

  const tap = () => Haptics.selectionAsync().catch(() => {});
  const thump = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

  const next = () => {
    thump();
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };
  const back = () => {
    tap();
    setStep((s) => Math.max(s - 1, 0));
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(tabs)');
  };

  // Ordered ticker groups: interests picked first
  const orderedGroups = useMemo(() => {
    const keys = ['stocks', 'crypto', 'etfs'];
    keys.sort((a, b) => Number(interests.has(b)) - Number(interests.has(a)));
    return keys.map((k) => ({ key: k, ...TICKER_GROUPS[k] }));
  }, [interests]);

  // ---------------- step actions

  const saveWatchlist = async () => {
    if (picked.size === 0) {
      next();
      return;
    }
    setSaving(true);
    let ok = 0;
    for (const symbol of picked) {
      try {
        const added = await addToWatchlist(symbol);
        if (added) ok++;
      } catch {}
    }
    setSavedCounts((c) => ({ ...c, watch: ok }));
    setSaving(false);
    next();
  };

  const savePortfolio = async () => {
    const entries = Object.entries(owned).filter(([, shares]) => shares > 0);
    if (entries.length === 0) {
      next();
      return;
    }
    setSaving(true);

    // Make sure we have a price for every picked symbol before adding. The
    // mount-time quote fetch can miss some (or return 0), and a missing price
    // was silently dropping that pick — so fetch the gaps here first.
    const priceMap: Record<string, number> = {};
    for (const [symbol] of entries) {
      const p = quotes[symbol]?.price || 0;
      if (p > 0) priceMap[symbol] = p;
    }
    const missing = entries.map(([s]) => s).filter((s) => !priceMap[s]);
    if (missing.length > 0) {
      try {
        const fresh = await fetchQuotesWithCache(missing, { timeout: 8000 });
        if (Array.isArray(fresh)) {
          for (const q of fresh) if (q?.price > 0) priceMap[q.symbol] = q.price;
        }
      } catch {}
    }

    let ok = 0;
    for (const [symbol, shares] of entries) {
      const price = priceMap[symbol] || 0;
      if (price <= 0) continue; // genuinely unpriced (delisted/invalid) — skip
      try {
        await addHolding(symbol, shares, price);
        ok++;
      } catch {}
    }
    setSavedCounts((c) => ({ ...c, holdings: ok }));
    setSaving(false);
    next();
  };

  const saveAlerts = () => {
    try {
      for (const cat of ALERT_CATEGORIES) {
        if (alertsOn.has(cat.key)) OneSignal?.User?.removeTag(`pref_${cat.key}`);
        else OneSignal?.User?.addTag(`pref_${cat.key}`, 'off');
      }
      const categories = Object.fromEntries(ALERT_CATEGORIES.map((c) => [c.key, alertsOn.has(c.key)]));
      AsyncStorage.setItem('notifPrefs', JSON.stringify({ master: true, categories })).catch(() => {});
    } catch {}
    next();
  };

  // ---------------- shared UI

  const Header = ({ showBack, showSkip }: { showBack: boolean; showSkip: boolean }) => (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity onPress={back} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color="#FFF" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 26 }} />
      )}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>
      {showSkip ? (
        <TouchableOpacity onPress={next} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.skipText}>{t('Skip')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 26 }} />
      )}
    </View>
  );

  const CTA = ({ label, onPress, disabled, loading }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) => (
    <TouchableOpacity
      style={[styles.cta, disabled && styles.ctaDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.ctaText}>{label}</Text>}
    </TouchableOpacity>
  );

  // ---------------- steps

  const renderWelcome = () => (
    <Animated.View key="s0" entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepWrap}>
      <View style={styles.welcomeCenter}>
        <Animated.View entering={ZoomIn.delay(150).springify()} style={styles.logoGlow}>
          <Text style={styles.logoEmoji}>🏛️</Text>
        </Animated.View>
        <Animated.Text entering={FadeInUp.delay(300)} style={styles.welcomeTitle}>
          {t('Welcome to')}
          {'\n'}
          <Text style={{ color: GOLD }}>WallStreetStocks</Text>
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(450)} style={styles.welcomeSub}>
          {t("Let's build your investing setup — it takes about a minute.")}
        </Animated.Text>
        <Animated.View entering={FadeInUp.delay(600)} style={styles.welcomeSteps}>
          {[
            ['👀', t('Pick stocks to watch')],
            ['💼', t('Start your portfolio')],
            ['🔔', t('Choose your alerts')],
          ].map(([emoji, label], i) => (
            <View key={i} style={styles.welcomeStepRow}>
              <Text style={styles.welcomeStepEmoji}>{emoji}</Text>
              <Text style={styles.welcomeStepText}>{label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>
      <CTA label={t("Let's go")} onPress={next} />
    </Animated.View>
  );

  const renderInterests = () => (
    <Animated.View key="s1" entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepWrap}>
      <Text style={styles.stepTitle}>{t('What are you into?')}</Text>
      <Text style={styles.stepSub}>{t('Pick at least one — we’ll personalize the app for you.')}</Text>
      <View style={styles.chipGrid}>
        {INTERESTS.map((item, i) => {
          const on = interests.has(item.key);
          return (
            <Animated.View key={item.key} entering={FadeInUp.delay(60 * i).springify()}>
              <TouchableOpacity
                style={[styles.interestChip, on && styles.chipOn]}
                onPress={() => {
                  tap();
                  setInterests((prev) => {
                    const nxt = new Set(prev);
                    if (nxt.has(item.key)) nxt.delete(item.key);
                    else nxt.add(item.key);
                    return nxt;
                  });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.chipEmoji}>{item.emoji}</Text>
                <Text style={[styles.chipLabel, on && { color: GOLD }]}>{t(item.label)}</Text>
                {on && <Ionicons name="checkmark-circle" size={16} color={GOLD} />}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
      <CTA label={t('Continue')} onPress={next} disabled={interests.size === 0} />
    </Animated.View>
  );

  const renderWatchlist = () => (
    <Animated.View key="s2" entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepWrap}>
      <Text style={styles.stepTitle}>{t('Build your watchlist')}</Text>
      <Text style={styles.stepSub}>{t('Tap at least 3 to follow. Live prices included.')}</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {orderedGroups.map((group) => (
          <View key={group.key}>
            <Text style={styles.groupLabel}>{t(group.label)}</Text>
            <View style={styles.tickerGrid}>
              {group.symbols.map((s) => {
                const on = picked.has(s.symbol);
                const q = quotes[s.symbol];
                const up = (q?.changePct ?? 0) >= 0;
                return (
                  <TouchableOpacity
                    key={s.symbol}
                    style={[styles.tickerCard, on && styles.tickerCardOn]}
                    onPress={() => {
                      tap();
                      setPicked((prev) => {
                        const nxt = new Set(prev);
                        if (nxt.has(s.symbol)) nxt.delete(s.symbol);
                        else nxt.add(s.symbol);
                        return nxt;
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <StockLogo symbol={s.symbol} size={34} />
                    <Text style={styles.tickerSymbol}>{s.symbol.replace('USD', '')}</Text>
                    <Text style={styles.tickerName} numberOfLines={1}>{s.name}</Text>
                    {q ? (
                      <Text style={[styles.tickerPrice, { color: up ? '#34C759' : '#FF453A' }]}>
                        ${q.price >= 1000 ? Math.round(q.price).toLocaleString() : q.price.toFixed(2)}
                      </Text>
                    ) : (
                      <Text style={[styles.tickerPrice, { color: '#666' }]}>—</Text>
                    )}
                    {on && (
                      <View style={styles.tickerCheck}>
                        <Ionicons name="checkmark" size={12} color="#000" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ height: 12 }} />
      </ScrollView>
      <CTA
        label={
          picked.size >= 3
            ? `${t('Follow')} ${picked.size} →`
            : `${t('Pick')} ${3 - picked.size} ${t('more')}`
        }
        onPress={saveWatchlist}
        disabled={picked.size < 3}
        loading={saving}
      />
    </Animated.View>
  );

  const renderPortfolio = () => {
    const candidates = Array.from(picked);
    return (
      <Animated.View key="s3" entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepWrap}>
        <Text style={styles.stepTitle}>{t('Own any of these?')}</Text>
        <Text style={styles.stepSub}>{t('Add them to your portfolio to track your gains. You can skip this.')}</Text>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {candidates.map((symbol) => {
            const shares = owned[symbol] || 0;
            const isOwned = shares > 0;
            const price = quotes[symbol]?.price || 0;
            return (
              <TouchableOpacity
                key={symbol}
                style={[styles.holdingRow, isOwned && styles.holdingRowOn]}
                onPress={() => {
                  tap();
                  setOwned((prev) => ({ ...prev, [symbol]: isOwned ? 0 : 1 }));
                }}
                activeOpacity={0.85}
              >
                <StockLogo symbol={symbol} size={36} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.holdingSymbol}>{symbol.replace('USD', '')}</Text>
                  {isOwned && price > 0 && (
                    <Text style={styles.holdingValue}>
                      ≈ ${(shares * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </Text>
                  )}
                </View>
                {isOwned ? (
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => {
                        tap();
                        setOwned((prev) => ({ ...prev, [symbol]: Math.max(0, (prev[symbol] || 0) - 1) }));
                      }}
                    >
                      <Ionicons name="remove" size={18} color={GOLD} />
                    </TouchableOpacity>
                    <Text style={styles.stepperCount}>{shares}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => {
                        tap();
                        setOwned((prev) => ({ ...prev, [symbol]: (prev[symbol] || 0) + 1 }));
                      }}
                    >
                      <Ionicons name="add" size={18} color={GOLD} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.holdingAdd}>{t('I own this')}</Text>
                )}
              </TouchableOpacity>
            );
          })}
          <Text style={styles.portfolioNote}>
            {t('Shares are added at the current market price — fine-tune anytime in Portfolio.')}
          </Text>
        </ScrollView>
        <CTA
          label={
            Object.values(owned).some((s) => s > 0)
              ? t('Add to my portfolio')
              : t("I don't own any yet")
          }
          onPress={savePortfolio}
          loading={saving}
        />
      </Animated.View>
    );
  };

  const renderAlerts = () => (
    <Animated.View key="s4" entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.stepWrap}>
      <Text style={styles.stepTitle}>{t('What should we ping you about?')}</Text>
      <Text style={styles.stepSub}>{t('All on by default — mute anything. Change later in Settings.')}</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {ALERT_CATEGORIES.map((cat, i) => {
          const on = alertsOn.has(cat.key);
          return (
            <Animated.View key={cat.key} entering={FadeInUp.delay(50 * i)}>
              <TouchableOpacity
                style={[styles.alertRow, on && styles.alertRowOn]}
                onPress={() => {
                  tap();
                  setAlertsOn((prev) => {
                    const nxt = new Set(prev);
                    if (nxt.has(cat.key)) nxt.delete(cat.key);
                    else nxt.add(cat.key);
                    return nxt;
                  });
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.alertEmoji}>{cat.emoji}</Text>
                <Text style={[styles.alertLabel, !on && { color: '#777' }]}>{t(cat.label)}</Text>
                <Ionicons
                  name={on ? 'notifications' : 'notifications-off-outline'}
                  size={20}
                  color={on ? GOLD : '#555'}
                />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
      <CTA label={t('Save my alerts')} onPress={saveAlerts} />
    </Animated.View>
  );

  const renderDone = () => {
    const holdings = Object.values(owned).filter((s) => s > 0).length;
    return (
      <Animated.View key="s5" entering={FadeInRight.duration(300)} style={styles.stepWrap}>
        <View style={styles.welcomeCenter}>
          <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.doneBadge}>
            <Ionicons name="checkmark" size={54} color="#000" />
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(200)} style={styles.welcomeTitle}>
            {t("You're all set!")} 🎉
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(350)} style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNum}>{savedCounts.watch || picked.size}</Text>
              <Text style={styles.summaryLabel}>{t('Watching')}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNum}>{savedCounts.holdings || holdings}</Text>
              <Text style={styles.summaryLabel}>{t('Holdings')}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNum}>{alertsOn.size}</Text>
              <Text style={styles.summaryLabel}>{t('Alerts on')}</Text>
            </View>
          </Animated.View>
        </View>
        <CTA label={t('Continue')} onPress={next} />
      </Animated.View>
    );
  };

  const PLANS = [
    { key: 'gold', name: 'Gold', price: '$4.99', tag: null, emoji: '🥇', features: ['5 Expert Stock Picks', 'Ad-free experience'] },
    { key: 'platinum', name: 'Platinum', price: '$6.99', tag: 'MOST POPULAR', emoji: '🏆', features: ['8 Expert Stock Picks', 'Screener Filters & Premium Presets'] },
    { key: 'diamond', name: 'Diamond', price: '$9.99', tag: 'BEST VALUE', emoji: '💎', features: ['15 Picks + AI Tools', 'Verified Profile Badge'] },
  ];

  const renderPlans = () => (
    <Animated.View key="s6" entering={FadeInRight.duration(300)} style={styles.stepWrap}>
      <Animated.View entering={FadeInUp.delay(100)} style={styles.socialProof}>
        <Text style={styles.socialProofStars}>★★★★★</Text>
        <Text style={styles.socialProofTitle}>
          {t('Join')} <Text style={{ color: GOLD }}>2,000+</Text> {t('investors already on WallStreetStocks')}
        </Text>
      </Animated.View>
      <Text style={styles.stepTitle}>{t('Pick your edge')}</Text>
      <Text style={styles.stepSub}>{t('7-day free trial on every plan. Cancel anytime.')}</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {PLANS.map((plan, i) => {
          const on = selectedPlan === plan.key;
          return (
            <Animated.View key={plan.key} entering={FadeInUp.delay(120 * i).springify()}>
              <TouchableOpacity
                style={[styles.planCard, on && styles.planCardOn]}
                onPress={() => {
                  tap();
                  setSelectedPlan(plan.key);
                }}
                activeOpacity={0.85}
              >
                {plan.tag && (
                  <View style={[styles.planTag, plan.key === 'diamond' && { backgroundColor: '#B9F2FF' }]}>
                    <Text style={styles.planTagText}>{t(plan.tag)}</Text>
                  </View>
                )}
                <View style={styles.planTop}>
                  <Text style={styles.planEmoji}>{plan.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, on && { color: GOLD }]}>{plan.name}</Text>
                    <Text style={styles.planPrice}>
                      {plan.price}
                      <Text style={styles.planPer}>/{t('month')}</Text>
                    </Text>
                  </View>
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={on ? GOLD : '#555'}
                  />
                </View>
                {plan.features.map((f) => (
                  <View key={f} style={styles.planFeatureRow}>
                    <Ionicons name="checkmark" size={13} color={GOLD} />
                    <Text style={styles.planFeature}>{t(f)}</Text>
                  </View>
                ))}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
      <CTA
        label={`${t('Start my free trial')} →`}
        onPress={async () => {
          thump();
          await completeOnboarding();
          router.push('/paywall' as any);
        }}
      />
      <TouchableOpacity style={styles.freeLink} onPress={completeOnboarding}>
        <Text style={styles.freeLinkText}>{t('Maybe later — continue with the free plan')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const steps = [renderWelcome, renderInterests, renderWatchlist, renderPortfolio, renderAlerts, renderDone, renderPlans];

  return (
    <SafeAreaView style={styles.container}>
      <Header showBack={step > 0 && step < 5} showSkip={step > 0 && step < 5} />
      {steps[step]()}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------- styles

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: GOLD },
  skipText: { color: '#888', fontSize: 14, fontWeight: '600' },

  stepWrap: { flex: 1, paddingHorizontal: 20, paddingBottom: 12 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', marginTop: 10 },
  stepSub: { fontSize: 14, color: '#999', marginTop: 6, marginBottom: 16, lineHeight: 20 },

  welcomeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoGlow: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,214,10,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,214,10,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  logoEmoji: { fontSize: 52 },
  welcomeTitle: { fontSize: 30, fontWeight: '800', color: '#FFF', textAlign: 'center', lineHeight: 38 },
  welcomeSub: { fontSize: 15, color: '#AAA', textAlign: 'center', marginTop: 12, lineHeight: 22, paddingHorizontal: 12 },
  welcomeSteps: { marginTop: 28, gap: 12, alignSelf: 'stretch', paddingHorizontal: 24 },
  welcomeStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  welcomeStepEmoji: { fontSize: 20 },
  welcomeStepText: { color: '#DDD', fontSize: 15, fontWeight: '600' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipOn: { borderColor: GOLD, backgroundColor: 'rgba(255,214,10,0.10)' },
  chipEmoji: { fontSize: 17 },
  chipLabel: { color: '#DDD', fontSize: 15, fontWeight: '600' },

  groupLabel: {
    color: '#8A8A8E',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 8,
  },
  tickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tickerCard: {
    width: (SCREEN_WIDTH - 40 - 20) / 3,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  tickerCardOn: { borderColor: GOLD, backgroundColor: 'rgba(255,214,10,0.08)' },
  tickerSymbol: { color: '#FFF', fontWeight: '800', fontSize: 14, marginTop: 6 },
  tickerName: { color: '#888', fontSize: 10.5, marginTop: 1, maxWidth: '90%' },
  tickerPrice: { fontSize: 11.5, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] },
  tickerCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },

  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  holdingRowOn: { borderColor: GOLD, backgroundColor: 'rgba(255,214,10,0.07)' },
  holdingSymbol: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  holdingValue: { color: GOLD, fontSize: 12, fontWeight: '700', marginTop: 2 },
  holdingAdd: { color: '#888', fontSize: 13, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,214,10,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCount: { color: '#FFF', fontWeight: '800', fontSize: 16, minWidth: 34, textAlign: 'center' },
  portfolioNote: { color: '#777', fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  alertRowOn: { borderColor: 'rgba(255,214,10,0.45)' },
  alertEmoji: { fontSize: 18 },
  alertLabel: { flex: 1, color: '#EEE', fontSize: 15, fontWeight: '600' },

  doneBadge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: GOLD,
    shadowOpacity: 0.5,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
  },
  summaryCards: { flexDirection: 'row', gap: 10, marginTop: 26 },
  summaryCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.25)',
    minWidth: 92,
  },
  summaryNum: { color: GOLD, fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: '#999', fontSize: 12, marginTop: 2 },
  socialProof: { alignItems: 'center', marginTop: 8, marginBottom: 4 },
  socialProofStars: { color: GOLD, fontSize: 16, letterSpacing: 3 },
  socialProofTitle: { color: '#CCC', fontSize: 13, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  planCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 12,
  },
  planCardOn: { borderColor: GOLD, backgroundColor: 'rgba(255,214,10,0.07)' },
  planTag: {
    position: 'absolute',
    top: -9,
    right: 14,
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planTagText: { color: '#000', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  planEmoji: { fontSize: 26 },
  planName: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  planPrice: { color: '#DDD', fontSize: 14, fontWeight: '700', marginTop: 1 },
  planPer: { color: '#888', fontSize: 12, fontWeight: '500' },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  planFeature: { color: '#BBB', fontSize: 12.5 },
  freeLink: { alignItems: 'center', paddingVertical: 12 },
  freeLinkText: { color: '#888', fontSize: 13, fontWeight: '600' },
  premiumLink: { alignItems: 'center', paddingVertical: 12 },
  premiumLinkText: { color: GOLD_DIM, fontSize: 14, fontWeight: '700' },

  cta: {
    backgroundColor: GOLD,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  ctaDisabled: { backgroundColor: 'rgba(255,214,10,0.25)' },
  ctaText: { color: '#000', fontSize: 17, fontWeight: '800' },
});
