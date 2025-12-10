// app/profile/display.tsx
import React, { useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Appearance,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// Key for saving preference
const THEME_KEY = 'user-theme-preference';

export default function Display() {
  const router = useRouter();
  const systemScheme = Appearance.getColorScheme(); // 'light' or 'dark'
  const [isDarkMode, setIsDarkMode] = React.useState(systemScheme === 'dark');

  // Load saved preference on mount
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved !== null) {
        setIsDarkMode(saved === 'dark');
      } else {
        setIsDarkMode(systemScheme === 'dark'); // follow system if no preference
      }
    })();
  }, [systemScheme]);

  // Save preference when toggled
  const toggleDarkMode = async (value: boolean) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem(THEME_KEY, value ? 'dark' : 'light');
  };

  // Dynamic colors based on current mode
  const theme = {
    background: isDarkMode ? '#000' : '#fff',
    text: isDarkMode ? '#fff' : '#000',
    subtitle: isDarkMode ? '#aaa' : '#666',
    border: isDarkMode ? '#333' : '#f0f0f0',
    headerBorder: isDarkMode ? '#333' : '#f0f0f0',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.headerBorder }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Display</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <View>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Dark mode</Text>
            <Text style={[styles.rowSubtitle, { color: theme.subtitle }]}>
              {isDarkMode ? 'On' : 'Off'} {isDarkMode ? '' : '(follows system)'}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#767577', true: '#1D9BF0' }}
            thumbColor={isDarkMode ? '#1D9BF0' : '#f4f3f4'}
          />
        </View>
      </View>
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
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  section: { marginTop: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, marginTop: 4 },
});
