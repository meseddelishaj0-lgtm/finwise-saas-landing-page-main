// app/profile/settings.tsx
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
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const settingsItems = [
    { title: t('settings.personalInfo'), icon: 'person', route: '/profile/personal-info', color: '#B8860B', bgColor: '#B8860B15' },
    { title: t('settings.display'), icon: 'color-palette', route: '/profile/display', color: '#AF52DE', bgColor: '#AF52DE15' },
    { title: t('settings.language'), icon: 'globe', route: '/profile/language', color: '#0A84FF', bgColor: '#0A84FF15' },
    { title: t('settings.experience'), icon: 'sparkles', route: '/profile/experience', color: '#FF9500', bgColor: '#FF950015' },
    { title: t('settings.notifications'), icon: 'notifications', route: '/profile/notifications', color: '#FF3B30', bgColor: '#FF3B3015' },
    { title: t('settings.password'), icon: 'lock-closed', route: '/profile/password', color: '#34C759', bgColor: '#34C75915' },
    { title: t('settings.muted'), icon: 'volume-mute', route: '/profile/muted', color: '#8E8E93', bgColor: '#8E8E9315' },
    { title: t('settings.blocked'), icon: 'ban', route: '/profile/blocked', color: '#FF2D55', bgColor: '#FF2D5515' },
  ];

  const dangerItems = [
    { title: t('settings.deleteAccount'), icon: 'trash', route: '/profile/delete-account', color: '#FF3B30', bgColor: '#FF3B3015' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.titleText, { color: colors.text }]}>{t('settings.title')}</Text>
        </View>

        <View style={{ width: 24 }} />
      </View>

      {/* Settings List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.row, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={[styles.rowText, { color: colors.text }]}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}

        {/* Danger Zone */}
        <View style={[styles.dangerSection, { borderTopColor: colors.danger + '20' }]}>
          <Text style={[styles.dangerSectionTitle, { color: colors.danger }]}>{t('settings.dangerZone')}</Text>
          {dangerItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.row, { borderBottomColor: colors.borderLight }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[styles.rowText, { color: colors.danger }]}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rowText: { fontSize: 16, fontWeight: '500' },
  dangerSection: {
    marginTop: 32,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  dangerSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
