// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { HapticTab } from '@/components/haptic-tab';

// Custom tab bar icon with soft glow pill behind the active icon
const TabIcon = ({
  name,
  color,
  focused,
  accentColor,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  accentColor: string;
}) => (
  <View style={styles.iconContainer}>
    {focused && (
      <View
        style={[
          styles.activePill,
          { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}44` },
        ]}
      />
    )}
    <Ionicons
      name={focused ? name : (`${name}-outline` as keyof typeof Ionicons.glyphMap)}
      size={22}
      color={color}
    />
    {focused && <View style={[styles.activeIndicator, { backgroundColor: accentColor }]} />}
  </View>
);

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

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
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: Platform.OS === 'ios'
            ? (isDark ? 'rgba(8,8,8,0.9)' : 'rgba(255,255,255,0.9)')
            : colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? 'rgba(255,214,10,0.18)' : 'rgba(212,160,23,0.25)',
          elevation: Platform.OS === 'android' ? 8 : 0,
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          shadowColor: isDark ? '#FFD60A' : '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.06 : 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          letterSpacing: 0.2,
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
          title: t('Home'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} accentColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('Markets'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="globe" color={color} focused={focused} accentColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="trending"
        options={{
          title: t('Trending'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="flame" color={color} focused={focused} accentColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-tools"
        options={{
          title: t('AI'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="sparkles" color={color} focused={focused} accentColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t('Social'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chatbubbles" color={color} focused={focused} accentColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="screener"
        options={{
          title: t('Screen'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="funnel" color={color} focused={focused} accentColor={colors.primary} />
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
    width: 48,
    height: 30,
  },
  activePill: {
    position: 'absolute',
    width: 48,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -5,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
