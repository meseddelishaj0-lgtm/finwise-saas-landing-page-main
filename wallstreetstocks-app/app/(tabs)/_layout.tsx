// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import GlassTabBar from '@/components/GlassTabBar';

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
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('Home'),
          tabBarIcon: ({ color, focused }: { color: any; focused: boolean }) => (
            <TabIcon name="home" color={color} focused={focused} accentColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('Markets'),
          tabBarIcon: ({ color, focused }: { color: any; focused: boolean }) => (
            <TabIcon name="globe" color={color} focused={focused} accentColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="trending"
        options={{
          title: t('Trending'),
          tabBarIcon: ({ color, focused }: { color: any; focused: boolean }) => (
            <TabIcon name="flame" color={color} focused={focused} accentColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-tools"
        options={{
          title: t('AI'),
          tabBarIcon: ({ color, focused }: { color: any; focused: boolean }) => (
            <TabIcon name="sparkles" color={color} focused={focused} accentColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t('Social'),
          tabBarIcon: ({ color, focused }: { color: any; focused: boolean }) => (
            <TabIcon name="chatbubbles" color={color} focused={focused} accentColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="screener"
        options={{
          title: t('Screen'),
          tabBarIcon: ({ color, focused }: { color: any; focused: boolean }) => (
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
