// app/profile/notifications.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/lib/auth';
import { loadNotifPrefs, saveNotifPrefs } from '@/lib/notificationPrefs';

// OneSignal is a native module — absent in Expo Go, present in production builds
let OneSignal: any = null;
try {
  // v5 SDK: named export { OneSignal }, no default (".default" broke on the v5 upgrade)
  const osModule = require('react-native-onesignal');
  OneSignal = osModule?.OneSignal ?? osModule?.default ?? null;
} catch {}

// Prefs are stored on the SERVER (User.notificationPrefs via
// /api/user/notification-prefs) — survives reinstall/new device. AsyncStorage
// is only a per-user cache; see lib/notificationPrefs.ts.
// Tag keys must match the server (src/lib/onesignal.ts NotificationCategory):
// tag `pref_<category>` = "off" mutes; removing the tag re-enables.
interface CategoryDef {
  key: string; // pref tag suffix
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

const SOCIAL_CATEGORIES: CategoryDef[] = [
  { key: 'messages', title: 'Messages', subtitle: 'New direct messages', icon: 'chatbubble', color: '#0A84FF' },
  { key: 'social', title: 'Social Activity', subtitle: 'Likes, comments, follows and mentions', icon: 'heart', color: '#FF2D55' },
];

const MARKET_CATEGORIES: CategoryDef[] = [
  { key: 'price_alerts', title: 'Price Alerts', subtitle: 'Alerts when your price targets hit', icon: 'pricetag', color: '#34C759' },
  { key: 'watchlist', title: 'Watchlist Alerts', subtitle: 'News about stocks in your watchlist', icon: 'star', color: '#FFD60A' },
  { key: 'market_news', title: 'Market News', subtitle: 'Top market headlines during the day', icon: 'newspaper', color: '#FF9500' },
  { key: 'market_movers', title: 'Market Movers', subtitle: 'Big gainers and losers alerts', icon: 'trending-up', color: '#AF52DE' },
  { key: 'daily_recap', title: 'Daily Recap', subtitle: 'End-of-day market summary', icon: 'time', color: '#8E8E93' },
];

const ALL_KEYS = [...SOCIAL_CATEGORIES, ...MARKET_CATEGORIES].map((c) => c.key);

export default function Notifications() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();

  const accent = isDark ? '#FFD60A' : '#B8860B';
  const [masterOn, setMasterOn] = useState(true);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_KEYS.map((k) => [k, true]))
  );

  // Load prefs (server-first, per-user cache fallback) + real OneSignal opt-in
  useEffect(() => {
    if (user?.id) {
      loadNotifPrefs(user.id)
        .then((saved) => {
          if (!saved) return;
          if (saved.categories) setPrefs((prev) => ({ ...prev, ...saved.categories }));
          if (typeof saved.master === 'boolean') setMasterOn(saved.master);
        })
        .catch(() => {});
    }
    try {
      OneSignal?.User?.pushSubscription
        ?.getOptedInAsync?.()
        .then((opted: boolean) => setMasterOn(opted))
        .catch(() => {});
    } catch {}
  }, [user?.id]);

  const persist = (master: boolean, categories: Record<string, boolean>) => {
    if (!user?.id) return;
    // Per-user cache + server (User.notificationPrefs) — fire-and-forget.
    saveNotifPrefs(user.id, { master, categories }).catch(() => {});
  };

  const toggleMaster = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMasterOn(value);
    persist(value, prefs);
    try {
      if (value) OneSignal?.User?.pushSubscription?.optIn();
      else OneSignal?.User?.pushSubscription?.optOut();
    } catch {}
  };

  const toggleCategory = (key: string, value: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    persist(masterOn, next);
    try {
      if (value) OneSignal?.User?.removeTag(`pref_${key}`);
      else OneSignal?.User?.addTag(`pref_${key}`, 'off');
    } catch {}
  };

  const Row = ({ def }: { def: CategoryDef }) => {
    const enabled = prefs[def.key];
    return (
      <View
        style={[styles.row, { borderBottomColor: colors.borderLight, opacity: masterOn ? 1 : 0.4 }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: def.color + '15' }]}>
          <Ionicons name={def.icon as any} size={18} color={def.color} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>{t(def.title)}</Text>
          <Text style={[styles.rowSubtitle, { color: colors.textTertiary }]}>{t(def.subtitle)}</Text>
        </View>
        <Switch
          value={masterOn && enabled}
          onValueChange={(v) => toggleCategory(def.key, v)}
          disabled={!masterOn}
          trackColor={{ false: isDark ? '#3A3A3C' : '#E9E9EA', true: accent }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={isDark ? '#3A3A3C' : '#E9E9EA'}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : '#f0f0f0' }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('Notifications')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Master switch */}
        <View
          style={[
            styles.masterCard,
            {
              backgroundColor: colors.surface,
              borderColor: masterOn ? accent + '55' : colors.borderLight,
            },
          ]}
        >
          <View style={[styles.iconContainer, styles.masterIcon, { backgroundColor: accent + '18' }]}>
            <Ionicons name={masterOn ? 'notifications' : 'notifications-off'} size={22} color={accent} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.masterTitle, { color: colors.text }]}>{t('Push Notifications')}</Text>
            <Text style={[styles.rowSubtitle, { color: colors.textTertiary }]}>
              {t('Receive push notifications from WallStreetStocks')}
            </Text>
          </View>
          <Switch
            value={masterOn}
            onValueChange={toggleMaster}
            trackColor={{ false: isDark ? '#3A3A3C' : '#E9E9EA', true: accent }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={isDark ? '#3A3A3C' : '#E9E9EA'}
          />
        </View>

        {!masterOn && (
          <>
            <Text style={[styles.offHint, { color: colors.textTertiary }]}>
              {t('Notifications from WallStreetStocks are stopped for this device.')}
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openSettings().catch(() => {})}
              style={[styles.settingsLink, { borderColor: accent + '55' }]}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={15} color={accent} />
              <Text style={[styles.settingsLinkText, { color: accent }]}>
                {t('Also turn off in iPhone Settings')}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={accent} />
            </TouchableOpacity>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('Social & Messages')}</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {SOCIAL_CATEGORIES.map((def) => (
            <Row key={def.key} def={def} />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('Markets & Alerts')}</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {MARKET_CATEGORIES.map((def) => (
            <Row key={def.key} def={def} />
          ))}
        </View>

        <Text style={[styles.footnote, { color: colors.textTertiary }]}>
          {t('Changes apply instantly across the app.')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 48 },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  masterIcon: { width: 42, height: 42, borderRadius: 12 },
  masterTitle: { fontSize: 16, fontWeight: '700' },
  offHint: { fontSize: 12, textAlign: 'center', marginTop: 12, paddingHorizontal: 12 },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  settingsLinkText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  section: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 12, marginTop: 1 },
  footnote: { fontSize: 12, textAlign: 'center', marginTop: 24 },
});
