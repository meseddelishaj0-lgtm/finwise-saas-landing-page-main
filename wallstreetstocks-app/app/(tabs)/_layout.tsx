// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

// Custom tab bar icon with indicator
const TabIcon = ({
  name,
  color,
  focused,
  indicatorColor,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  indicatorColor: string;
}) => (
  <View style={styles.iconContainer}>
    <Ionicons
      name={focused ? name : `${name}-outline` as keyof typeof Ionicons.glyphMap}
      size={22}
      color={color}
    />
    {focused && <View style={[styles.activeIndicator, { backgroundColor: indicatorColor }]} />}
  </View>
);

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Calculate proper bottom padding for Android navigation bar
  // Android needs extra padding to clear the system navigation bar
  // Use larger minimum for Android to handle gesture nav and 3-button nav
  const androidBottomPadding = Math.max(insets.bottom, 48);
  const tabBarHeight = Platform.OS === 'ios' ? 85 : 60 + androidBottomPadding;
  const bottomPadding = Platform.OS === 'ios' ? 28 : androidBottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: Platform.OS === 'ios'
            ? (isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)')
            : colors.background,
          borderTopWidth: Platform.OS === 'android' ? 1 : 0,
          borderTopColor: colors.border,
          elevation: Platform.OS === 'android' ? 8 : 0,
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              style={StyleSheet.absoluteFill}
              tint={isDark ? "dark" : "light"}
            />
          ) : null
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} indicatorColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Markets',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="globe" color={color} focused={focused} indicatorColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="trending"
        options={{
          title: 'Trending',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="flame" color={color} focused={focused} indicatorColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-tools"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="sparkles" color={color} focused={focused} indicatorColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chatbubbles" color={color} focused={focused} indicatorColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="screener"
        options={{
          title: 'Screen',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="funnel" color={color} focused={focused} indicatorColor={colors.primary} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 28,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
