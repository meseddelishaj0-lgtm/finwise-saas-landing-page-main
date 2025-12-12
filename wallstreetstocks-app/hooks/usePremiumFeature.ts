import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useSubscription } from '../context/SubscriptionContext';

// Feature tier requirements
// 1 = Gold, 2 = Platinum, 3 = Diamond
export const FEATURE_TIERS = {
  // Gold features (tier 1) - 5 stock picks
  AD_FREE: 1,
  BASIC_ANALYSIS: 1,
  WATCHLIST_20: 1,
  DAILY_SUMMARY: 1,
  STOCK_PICKS_GOLD: 1,  // 5 stock picks

  // Platinum features (tier 2) - 8 stock picks
  ADVANCED_ANALYSIS: 2,
  AI_INSIGHTS: 2,
  UNLIMITED_WATCHLISTS: 2,
  REALTIME_ALERTS: 2,
  PRIORITY_SUPPORT: 2,
  STOCK_PICKS_PLATINUM: 2,  // 8 stock picks

  // Diamond features (tier 3) - 15 stock picks
  RESEARCH_REPORTS: 3,
  PORTFOLIO_OPTIMIZATION: 3,
  CUSTOM_SCREENERS: 3,
  API_ACCESS: 3,
  ACCOUNT_MANAGER: 3,
  STOCK_PICKS_DIAMOND: 3,  // 15 stock picks
} as const;

/**
 * Hook for checking and gating premium features
 */
export function usePremiumFeature() {
  const { isPremium, hasFeatureAccess, getActiveSubscriptionTier } = useSubscription();

  /**
   * Check if user can access a feature
   */
  const canAccess = useCallback((requiredTier: number): boolean => {
    if (requiredTier === 0) return true; // Free feature
    return hasFeatureAccess(requiredTier);
  }, [hasFeatureAccess]);

  /**
   * Execute action if user has access, otherwise show paywall
   */
  const withPremiumAccess = useCallback(
    <T,>(
      requiredTier: number,
      action: () => T | Promise<T>,
      options?: {
        showAlert?: boolean;
        alertTitle?: string;
        alertMessage?: string;
      }
    ): T | Promise<T> | void => {
      if (canAccess(requiredTier)) {
        return action();
      }

      if (options?.showAlert !== false) {
        const tierName = getTierName(requiredTier);
        Alert.alert(
          options?.alertTitle || 'Premium Feature',
          options?.alertMessage || `This feature requires a ${tierName} subscription or higher.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/(modals)/paywall' as any) },
          ]
        );
      } else {
        router.push('/(modals)/paywall' as any);
      }
    },
    [canAccess]
  );

  /**
   * Navigate to paywall if not premium
   */
  const requirePremium = useCallback((requiredTier: number = 1): boolean => {
    if (canAccess(requiredTier)) {
      return true;
    }
    router.push('/(modals)/paywall' as any);
    return false;
  }, [canAccess]);

  /**
   * Get user's current tier name
   */
  const getCurrentTierName = useCallback((): string => {
    const tier = getActiveSubscriptionTier();
    return getTierName(tier);
  }, [getActiveSubscriptionTier]);

  return {
    isPremium,
    canAccess,
    withPremiumAccess,
    requirePremium,
    getCurrentTierName,
    currentTier: getActiveSubscriptionTier(),
    FEATURE_TIERS,
  };
}

/**
 * Get tier name from tier number
 */
function getTierName(tier: number): string {
  switch (tier) {
    case 1:
      return 'Gold';
    case 2:
      return 'Platinum';
    case 3:
      return 'Diamond';
    default:
      return 'Premium';
  }
}

/**
 * Hook for showing upgrade prompts
 */
export function useUpgradePrompt() {
  const { isPremium, activeSubscription } = useSubscription();

  const showUpgradePrompt = useCallback((
    feature: string,
    requiredTier: number
  ) => {
    const tierName = getTierName(requiredTier);
    
    Alert.alert(
      'Upgrade Required',
      `${feature} requires a ${tierName} subscription. Would you like to upgrade?`,
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'View Plans', onPress: () => router.push('/(modals)/paywall' as any) },
      ]
    );
  }, []);

  const showUpgradeFromCurrentTier = useCallback(() => {
    if (!isPremium) {
      router.push('/(modals)/paywall' as any);
      return;
    }

    // Already has a subscription, show upgrade options
    Alert.alert(
      'Upgrade Your Plan',
      'Want to unlock more features? Upgrade to a higher tier.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Plans', onPress: () => router.push('/(modals)/paywall' as any) },
      ]
    );
  }, [isPremium]);

  return {
    showUpgradePrompt,
    showUpgradeFromCurrentTier,
  };
}

export const PRODUCT_IDS = {
  GOLD_MONTHLY: 'gold_monthly',
  GOLD_YEARLY: 'gold_yearly',
  PLATINUM_MONTHLY: 'platinum_monthly',
  PLATINUM_YEARLY: 'platinum_yearly',
  DIAMOND_MONTHLY: 'diamond_monthly',
  DIAMOND_YEARLY: 'diamond_yearly',
} as const;
