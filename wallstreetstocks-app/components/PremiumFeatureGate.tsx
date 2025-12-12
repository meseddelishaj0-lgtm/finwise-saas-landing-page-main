// components/PremiumFeatureGate.tsx
// Reusable component to gate premium features behind subscription tiers
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { usePremiumFeature, FEATURE_TIERS } from '@/hooks/usePremiumFeature';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PremiumFeatureGateProps {
  requiredTier: number;
  featureName: string;
  description?: string;
  children: React.ReactNode;
  style?: any;
  compact?: boolean;
}

const TIER_INFO = {
  1: { name: 'Gold', color: '#FFD700', icon: 'star' as const },
  2: { name: 'Platinum', color: '#E5E4E2', icon: 'diamond' as const },
  3: { name: 'Diamond', color: '#B9F2FF', icon: 'diamond-outline' as const },
};

export function PremiumFeatureGate({
  requiredTier,
  featureName,
  description,
  children,
  style,
  compact = false,
}: PremiumFeatureGateProps) {
  const { canAccess } = usePremiumFeature();

  if (canAccess(requiredTier)) {
    return <>{children}</>;
  }

  const tierInfo = TIER_INFO[requiredTier as keyof typeof TIER_INFO] || TIER_INFO[1];

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, style]}
        onPress={() => router.push('/(modals)/paywall' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.compactContent}>
          <View style={[styles.lockBadge, { backgroundColor: tierInfo.color }]}>
            <Ionicons name="lock-closed" size={12} color="#000" />
          </View>
          <Text style={styles.compactText}>{featureName}</Text>
          <Text style={styles.compactTier}>{tierInfo.name}+</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Blurred preview of locked content */}
      <View style={styles.blurredContent}>
        {children}
        <View style={styles.blurOverlay} />
      </View>

      {/* Lock overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        style={styles.lockOverlay}
      >
        <View style={[styles.tierBadge, { backgroundColor: tierInfo.color }]}>
          <Ionicons name={tierInfo.icon} size={20} color="#000" />
          <Text style={styles.tierBadgeText}>{tierInfo.name}</Text>
        </View>

        <Ionicons name="lock-closed" size={48} color="#fff" style={styles.lockIcon} />

        <Text style={styles.featureName}>{featureName}</Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}

        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: tierInfo.color }]}
          onPress={() => router.push('/(modals)/paywall' as any)}
        >
          <Text style={styles.upgradeButtonText}>Unlock with {tierInfo.name}</Text>
          <Ionicons name="arrow-forward" size={18} color="#000" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// Premium feature card for displaying locked features
interface PremiumFeatureCardProps {
  tier: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export function PremiumFeatureCard({
  tier,
  title,
  description,
  icon,
  onPress,
}: PremiumFeatureCardProps) {
  const { canAccess, withPremiumAccess } = usePremiumFeature();
  const hasAccess = canAccess(tier);
  const tierInfo = TIER_INFO[tier as keyof typeof TIER_INFO] || TIER_INFO[1];

  const handlePress = () => {
    if (hasAccess && onPress) {
      onPress();
    } else {
      router.push('/(modals)/paywall' as any);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.featureCard,
        !hasAccess && styles.featureCardLocked,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.featureCardHeader}>
        <View style={[styles.featureIconContainer, { backgroundColor: hasAccess ? tierInfo.color : '#333' }]}>
          <Ionicons name={icon} size={24} color={hasAccess ? '#000' : '#666'} />
        </View>
        {!hasAccess && (
          <View style={[styles.tierPill, { backgroundColor: tierInfo.color }]}>
            <Ionicons name="lock-closed" size={10} color="#000" />
            <Text style={styles.tierPillText}>{tierInfo.name}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.featureCardTitle, !hasAccess && styles.textLocked]}>
        {title}
      </Text>
      <Text style={[styles.featureCardDescription, !hasAccess && styles.textLocked]}>
        {description}
      </Text>

      {!hasAccess && (
        <View style={styles.unlockPrompt}>
          <Text style={styles.unlockPromptText}>Tap to unlock</Text>
          <Ionicons name="chevron-forward" size={14} color="#007AFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// Horizontal premium features section
interface PremiumFeaturesSectionProps {
  title: string;
  features: Array<{
    tier: number;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
  }>;
}

export function PremiumFeaturesSection({ title, features }: PremiumFeaturesSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.push('/(modals)/paywall' as any)}>
          <Text style={styles.seeAllText}>See Plans</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.featuresGrid}>
        {features.map((feature, index) => (
          <PremiumFeatureCard key={index} {...feature} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  blurredContent: {
    opacity: 0.3,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  tierBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  lockIcon: {
    marginBottom: 12,
  },
  featureName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  // Compact styles
  compactContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  compactTier: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  // Feature card styles
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: (SCREEN_WIDTH - 48) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureCardLocked: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  featureCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  featureCardDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  textLocked: {
    color: '#999',
  },
  unlockPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  unlockPromptText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Section styles
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
});

export { FEATURE_TIERS };
