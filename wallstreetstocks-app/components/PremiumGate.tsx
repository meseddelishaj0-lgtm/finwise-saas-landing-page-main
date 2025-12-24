import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSubscription } from '../context/SubscriptionContext';

interface PremiumGateProps {
  children: ReactNode;
  requiredTier?: number;
  fallback?: ReactNode;
  showUpgradeButton?: boolean;
  blurContent?: boolean;
  featureName?: string;
}

/**
 * Component that gates content behind premium subscription
 * Shows children if user has access, otherwise shows fallback or upgrade prompt
 */
export function PremiumGate({
  children,
  requiredTier = 1,
  fallback,
  showUpgradeButton = true,
  blurContent = false,
  featureName = 'This feature',
}: PremiumGateProps) {
  const { isPremium, activeSubscription } = useSubscription();
  
  // Check if user has access based on tier
  const hasAccess = (() => {
    if (!isPremium || !activeSubscription) return false;

    // Match product IDs by checking if they contain the tier name
    const sub = activeSubscription.toLowerCase();
    let userTier = 0;
    if (sub.includes('diamond')) userTier = 3;
    else if (sub.includes('platinum')) userTier = 2;
    else if (sub.includes('gold')) userTier = 1;

    return userTier >= requiredTier;
  })();

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const tierName = getTierName(requiredTier);

  return (
    <View style={styles.container}>
      {blurContent && (
        <View style={styles.blurredContent}>
          {children}
          <View style={styles.blurOverlay} />
        </View>
      )}
      
      <View style={styles.lockedContainer}>
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={32} color="#FFD700" />
        </View>
        
        <Text style={styles.title}>{tierName} Feature</Text>
        <Text style={styles.description}>
          {featureName} requires a {tierName} subscription or higher.
        </Text>
        
        {showUpgradeButton && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/(modals)/paywall' as any)}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Simple lock icon button that opens paywall when pressed
 */
export function PremiumLockButton({ 
  requiredTier = 1,
  size = 20,
  color = '#FFD700',
}: {
  requiredTier?: number;
  size?: number;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={() => router.push('/(modals)/paywall' as any)}
      style={styles.lockButton}
    >
      <Ionicons name="lock-closed" size={size} color={color} />
    </TouchableOpacity>
  );
}

/**
 * Badge showing premium status or upgrade prompt
 */
export function PremiumBadge({ 
  showIfPremium = true,
  showUpgradeIfFree = true,
}: {
  showIfPremium?: boolean;
  showUpgradeIfFree?: boolean;
}) {
  const { isPremium, activeSubscription } = useSubscription();

  if (isPremium && showIfPremium) {
    const tierName = getTierNameFromProduct(activeSubscription);
    const tierColor = getTierColor(activeSubscription);
    
    return (
      <View style={[styles.badge, { backgroundColor: tierColor }]}>
        <Text style={styles.badgeText}>{tierName}</Text>
      </View>
    );
  }

  if (!isPremium && showUpgradeIfFree) {
    return (
      <TouchableOpacity
        style={[styles.badge, styles.upgradeBadge]}
        onPress={() => router.push('/(modals)/paywall' as any)}
      >
        <Text style={styles.upgradeBadgeText}>Upgrade</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

function getTierName(tier: number): string {
  switch (tier) {
    case 1: return 'Gold';
    case 2: return 'Platinum';
    case 3: return 'Diamond';
    default: return 'Premium';
  }
}

function getTierNameFromProduct(productId: string | null): string {
  if (!productId) return 'Premium';
  const id = productId.toLowerCase();
  if (id.includes('gold')) return 'Gold';
  if (id.includes('platinum')) return 'Platinum';
  if (id.includes('diamond')) return 'Diamond';
  return 'Premium';
}

function getTierColor(productId: string | null): string {
  if (!productId) return '#666';
  const id = productId.toLowerCase();
  if (id.includes('gold')) return '#FFD700';
  if (id.includes('platinum')) return '#E5E4E2';
  if (id.includes('diamond')) return '#B9F2FF';
  return '#666';
}

const SUBSCRIPTION_TIERS = {
  GOLD: 1,
  PLATINUM: 2,
  DIAMOND: 3,
} as const;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  blurredContent: {
    position: 'relative',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  lockedContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    margin: 16,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lockButton: {
    padding: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  upgradeBadge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  upgradeBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
});

export { SUBSCRIPTION_TIERS };
