// components/GlassTabBar.tsx
// Floating "liquid glass" tab bar: rounded blurred pill detached from the
// screen edges, with a glass bubble that springs to the active tab.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/context/ThemeContext';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  explore: 'globe',
  trending: 'flame',
  'ai-tools': 'sparkles',
  community: 'chatbubbles',
  screener: 'funnel',
};

const BAR_MARGIN = 14;
const BAR_HEIGHT = 72;
const BUBBLE_INSET = 6;

export default function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const count = state.routes.length;
  const tabWidth = barWidth > 0 ? barWidth / count : 0;
  const tx = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tabWidth <= 0) return;
    Animated.spring(tx, {
      toValue: BUBBLE_INSET + state.index * tabWidth,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  }, [state.index, tabWidth, tx]);

  const accent = colors.primary;
  const bottomOffset = Math.max(insets.bottom, 10) + (Platform.OS === 'ios' ? 6 : 10);

  return (
    <>
      {/* Fade content into the background beneath the floating bar so
          nothing stays readable under the tabs */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(0,0,0,0)',
          colors.background,
          colors.background,
        ]}
        locations={[0, 0.5, 1]}
        style={[styles.backdrop, { height: bottomOffset + BAR_HEIGHT + 48 }]}
      />
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: bottomOffset }]}
    >
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={[
          styles.bar,
          {
            borderColor: isDark ? 'rgba(255,214,10,0.16)' : 'rgba(184,134,11,0.22)',
            shadowColor: isDark ? '#FFD60A' : '#000',
            backgroundColor:
              Platform.OS === 'ios'
                ? (isDark ? 'rgba(16,16,14,0.55)' : 'rgba(255,255,255,0.55)')
                : (isDark ? 'rgba(18,18,16,0.97)' : 'rgba(255,255,255,0.97)'),
          },
        ]}
      >
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={60}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* top glass highlight */}
        <LinearGradient
          colors={[
            isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
            'rgba(255,255,255,0)',
          ]}
          style={styles.highlight}
          pointerEvents="none"
        />

        {/* sliding glass bubble */}
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bubble,
              {
                width: tabWidth - BUBBLE_INSET * 2,
                transform: [{ translateX: tx }],
                backgroundColor: isDark ? 'rgba(255,214,10,0.10)' : 'rgba(184,134,11,0.10)',
                borderColor: isDark ? 'rgba(255,214,10,0.35)' : 'rgba(184,134,11,0.35)',
              },
            ]}
          >
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={30}
                tint={isDark ? 'light' : 'dark'}
                style={[StyleSheet.absoluteFill, { borderRadius: 24, opacity: 0.25 }]}
              />
            )}
            <LinearGradient
              colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
              style={styles.bubbleShine}
              pointerEvents="none"
            />
          </Animated.View>
        )}

        {/* tabs */}
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              typeof options.title === 'string' ? options.title : route.name;
            const focused = state.index === index;

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                onPress={onPress}
                style={styles.tab}
              >
                <Ionicons
                  name={
                    focused
                      ? ICONS[route.name] ?? 'ellipse'
                      : (`${ICONS[route.name] ?? 'ellipse'}-outline` as keyof typeof Ionicons.glyphMap)
                  }
                  size={24}
                  color={focused ? accent : colors.textTertiary}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    { color: focused ? accent : colors.textTertiary },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  wrap: {
    position: 'absolute',
    left: BAR_MARGIN,
    right: BAR_MARGIN,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT / 2,
    borderTopLeftRadius: BAR_HEIGHT / 2,
    borderTopRightRadius: BAR_HEIGHT / 2,
  },
  bubble: {
    position: 'absolute',
    top: BUBBLE_INSET,
    bottom: BUBBLE_INSET,
    left: 0,
    borderRadius: (BAR_HEIGHT - BUBBLE_INSET * 2) / 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bubbleShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    maxWidth: '92%',
  },
});
