// app/profile/display.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function Display() {
  const router = useRouter();
  const { mode, isDark, colors, setMode } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Light', icon: 'sunny' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System', icon: 'phone-portrait' },
  ] as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Display</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          APPEARANCE
        </Text>

        {themeOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.row, { borderBottomColor: colors.borderLight }]}
            onPress={() => setMode(option.value)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[
                styles.iconContainer,
                { backgroundColor: mode === option.value ? colors.primary + '20' : colors.surface }
              ]}>
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={mode === option.value ? colors.primary : colors.textSecondary}
                />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  {option.label}
                </Text>
                {option.value === 'system' && (
                  <Text style={[styles.rowSubtitle, { color: colors.textTertiary }]}>
                    Matches your device settings
                  </Text>
                )}
              </View>
            </View>
            {mode === option.value && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Preview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          PREVIEW
        </Text>
        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.previewHeader}>
            <View style={[styles.previewDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Text style={[styles.previewText, { color: colors.textSecondary }]}>
            This is how your app will look with the current theme setting.
          </Text>
          <View style={styles.previewButtons}>
            <View style={[styles.previewButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.previewButtonText}>Primary</Text>
            </View>
            <View style={[styles.previewButton, { backgroundColor: colors.success }]}>
              <Text style={styles.previewButtonText}>Success</Text>
            </View>
            <View style={[styles.previewButton, { backgroundColor: colors.danger }]}>
              <Text style={styles.previewButtonText}>Danger</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: {
    zIndex: 10,
    padding: 8,
    marginLeft: -8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSubtitle: { fontSize: 12, marginTop: 2 },
  previewCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  previewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
