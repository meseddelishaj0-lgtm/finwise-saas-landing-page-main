// app/profile/language.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES } from '@/i18n/translations';

export default function LanguageScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { lang, setLang, t } = useLanguage();

  const accent = isDark ? '#FFD60A' : '#B8860B';

  const choose = (code: string) => {
    Haptics.selectionAsync().catch(() => {});
    setLang(code);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.titleText, { color: colors.text }]}>{t('language.title')}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('language.subtitle')}
        </Text>

        {LANGUAGES.map((item) => {
          const selected = item.code === lang;
          return (
            <TouchableOpacity
              key={item.code}
              style={[
                styles.row,
                { borderBottomColor: colors.borderLight },
                selected && { backgroundColor: accent + '12' },
              ]}
              onPress={() => choose(item.code)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.flag}>{item.flag}</Text>
                <View>
                  <Text style={[styles.native, { color: selected ? accent : colors.text }]}>
                    {item.native}
                  </Text>
                  <Text style={[styles.name, { color: colors.textTertiary }]}>{item.name}</Text>
                </View>
              </View>
              {selected && <Ionicons name="checkmark-circle" size={22} color={accent} />}
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.note, { color: colors.textTertiary }]}>{t('language.note')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  titleContainer: { flex: 1, alignItems: 'center' },
  titleText: { fontSize: 18, fontWeight: '600' },
  listContainer: { flex: 1 },
  listContent: { paddingTop: 12, paddingBottom: 40 },
  subtitle: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flag: { fontSize: 26 },
  native: { fontSize: 16, fontWeight: '600' },
  name: { fontSize: 12, marginTop: 1 },
  note: {
    fontSize: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    textAlign: 'center',
  },
});
