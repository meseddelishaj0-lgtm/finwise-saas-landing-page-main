// components/SubscriptionBadge.tsx
// Displays subscription tier badges (Gold, Platinum, Diamond) for premium users
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SubscriptionTier = 'free' | 'gold' | 'platinum' | 'diamond' | null | undefined;

interface SubscriptionBadgeProps {
  tier: SubscriptionTier;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  style?: ViewStyle;
}

const TIER_CONFIG = {
  gold: {
    icon: 'medal-outline' as const,
    label: 'Gold',
    backgroundColor: '#FFF7E6',
    borderColor: '#FFD700',
    textColor: '#B8860B',
    iconColor: '#FFD700',
  },
  platinum: {
    icon: 'diamond-outline' as const,
    label: 'Platinum',
    backgroundColor: '#F0F5FF',
    borderColor: '#7C3AED',
    textColor: '#6D28D9',
    iconColor: '#7C3AED',
  },
  diamond: {
    icon: 'diamond' as const,
    label: 'Diamond',
    backgroundColor: '#E6FFFA',
    borderColor: '#00CED1',
    textColor: '#008B8B',
    iconColor: '#00CED1',
  },
};

const SIZE_CONFIG = {
  small: {
    iconSize: 10,
    fontSize: 9,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  medium: {
    iconSize: 14,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  large: {
    iconSize: 18,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
};

export default function SubscriptionBadge({
  tier,
  size = 'small',
  showLabel = true,
  style
}: SubscriptionBadgeProps) {
  // Don't render for free tier or no tier
  if (!tier || tier === 'free') {
    return null;
  }

  const config = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CONFIG[size];

  if (!config) {
    return null;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          borderRadius: sizeConfig.borderRadius,
          gap: sizeConfig.gap,
        },
        style,
      ]}
    >
      <Ionicons
        name={config.icon}
        size={sizeConfig.iconSize}
        color={config.iconColor}
      />
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              color: config.textColor,
              fontSize: sizeConfig.fontSize,
            },
          ]}
        >
          {config.label}
        </Text>
      )}
    </View>
  );
}

// Compact inline badge for displaying next to usernames in posts
export function SubscriptionBadgeInline({ tier }: { tier: SubscriptionTier }) {
  if (!tier || tier === 'free') {
    return null;
  }

  const config = TIER_CONFIG[tier];
  if (!config) {
    return null;
  }

  return (
    <View style={styles.inlineBadge}>
      <Ionicons
        name={config.icon}
        size={12}
        color={config.iconColor}
      />
    </View>
  );
}

// Badge with full tier name for profile display
export function SubscriptionBadgeProfile({ tier }: { tier: SubscriptionTier }) {
  if (!tier || tier === 'free') {
    return null;
  }

  const config = TIER_CONFIG[tier];
  if (!config) {
    return null;
  }

  return (
    <View
      style={[
        styles.profileBadge,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <Ionicons
        name={config.icon}
        size={16}
        color={config.iconColor}
      />
      <Text style={[styles.profileLabel, { color: config.textColor }]}>
        {config.label} Member
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  label: {
    fontWeight: '600',
  },
  inlineBadge: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  profileLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
