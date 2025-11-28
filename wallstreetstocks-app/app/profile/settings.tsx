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
  { title: 'Personal Info', icon: 'person-outline', route: '/profile/personal-info' },
  { title: 'Display',       icon: 'color-palette-outline', route: '/profile/display' },
  { title: 'Experience',    icon: 'sparkles-outline',       route: '/profile/experience' },
  { title: 'Notifications', icon: 'notifications-outline',  route: '/profile/notifications' },
  { title: 'Password',      icon: 'lock-closed-outline',    route: '/profile/password' },
  { title: 'Muted',         icon: 'volume-mute-outline',    route: '/profile/muted' },
  { title: 'Blocked',       icon: 'ban-outline',            route: '/profile/blocked' },
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
            onPress={() => router.push(item.route as any)}   // ← THIS FIXES NAVIGATION
          >
            <View style={styles.rowLeft}>
              <Ionicons name={item.icon as any} size={22} color="#333" />
              <Text style={styles.rowText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#999" />
          </TouchableOpacity>
        ))}
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
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowText: { fontSize: 16, color: '#000' },
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
