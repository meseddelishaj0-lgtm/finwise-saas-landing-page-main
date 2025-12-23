// app/profile/settings.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';   // ← THIS IS THE FIX

const settingsItems = [
  { title: 'Personal Info', icon: 'person', route: '/profile/personal-info', color: '#007AFF', bgColor: '#007AFF15' },
  { title: 'Display', icon: 'color-palette', route: '/profile/display', color: '#AF52DE', bgColor: '#AF52DE15' },
  { title: 'Experience', icon: 'sparkles', route: '/profile/experience', color: '#FF9500', bgColor: '#FF950015' },
  { title: 'Notifications', icon: 'notifications', route: '/profile/notifications', color: '#FF3B30', bgColor: '#FF3B3015' },
  { title: 'Password', icon: 'lock-closed', route: '/profile/password', color: '#34C759', bgColor: '#34C75915' },
  { title: 'Muted', icon: 'volume-mute', route: '/profile/muted', color: '#8E8E93', bgColor: '#8E8E9315' },
  { title: 'Blocked', icon: 'ban', route: '/profile/blocked', color: '#FF2D55', bgColor: '#FF2D5515' },
];

const dangerItems = [
  { title: 'Delete Account', icon: 'trash', route: '/profile/delete-account', color: '#FF3B30', bgColor: '#FF3B3015' },
];

export default function SettingsScreen() {
  const router = useRouter();   // ← THIS REPLACES useNavigation

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Settings</Text>
        </View>

        <View style={{ width: 24 }} />
      </View>

      {/* Settings List */}
      <View style={styles.listContainer}>
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.row}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={styles.rowText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        ))}

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
          {dangerItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.row}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[styles.rowText, { color: '#FF3B30' }]}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={26} color="#1D9BF0" />
          <Text style={[styles.navLabel, { color: '#1D9BF0' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="people-outline" size={26} color="#666" />
          <Text style={styles.navLabel}>Community</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="search-outline" size={26} color="#666" />
          <Text style={styles.navLabel}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="trending-up-outline" size={26} color="#666" />
          <Text style={styles.navLabel}>Trending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="notifications-outline" size={26} color="#666" />
          <Text style={styles.navLabel}>Notifications</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleContainer: { flex: 1, alignItems: 'center' },
  titleText: { fontSize: 18, fontWeight: '600', color: '#000' },
  listContainer: { flex: 1, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  rowText: { fontSize: 16, fontWeight: '500', color: '#000' },
  dangerSection: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#FF3B3020',
    paddingTop: 8,
  },
  dangerSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 10, marginTop: 4, color: '#666' },
});
