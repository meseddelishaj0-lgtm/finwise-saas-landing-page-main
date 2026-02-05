import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform, Linking } from 'react-native';

// RevenueCat API Keys - loaded from environment variables
const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '',
};

// Entitlement IDs - Must match RevenueCat Dashboard
export const ENTITLEMENT_IDS = {
  GOLD: 'gold_access',
  PLATINUM: 'platinum_access',
  DIAMOND: 'diamond_access',
} as const;

// Helper to get any active entitlement (checks highest tier first)
export const getActiveEntitlement = (activeEntitlements: Record<string, any>): string | null => {
  // Log all active entitlements for debugging
  const entitlementKeys = Object.keys(activeEntitlements);

  // Check exact matches first
  if (activeEntitlements[ENTITLEMENT_IDS.DIAMOND]) {
    return ENTITLEMENT_IDS.DIAMOND;
  }
  if (activeEntitlements[ENTITLEMENT_IDS.PLATINUM]) {
    return ENTITLEMENT_IDS.PLATINUM;
  }
  if (activeEntitlements[ENTITLEMENT_IDS.GOLD]) {
    return ENTITLEMENT_IDS.GOLD;
  }

  // Fallback: Check for partial matches (in case entitlement IDs are different)
  // Check highest tier first
  for (const key of entitlementKeys) {
    const keyLower = key.toLowerCase();
    if (keyLower.includes('diamond')) {
      return key;
    }
  }
  for (const key of entitlementKeys) {
    const keyLower = key.toLowerCase();
    if (keyLower.includes('platinum')) {
      return key;
    }
  }
  for (const key of entitlementKeys) {
    const keyLower = key.toLowerCase();
    if (keyLower.includes('gold')) {
      return key;
    }
  }

  // If we still have entitlements but couldn't match them, return the first one
  // This handles cases where RevenueCat uses completely different naming
  if (entitlementKeys.length > 0) {
    return entitlementKeys[0];
  }

  return null;
};

// Product IDs - Match your App Store Connect products
export const PRODUCT_IDS = {
  GOLD_MONTHLY: 'wallstreetstocks.gold.monthly',
  GOLD_YEARLY: 'wallstreetstocks.gold.yearly',
  PLATINUM_MONTHLY: 'wallstreetstocks.platinum.monthly',
  PLATINUM_YEARLY: 'wallstreetstocks.platinum.yearly',
  DIAMOND_MONTHLY: 'wallstreetstocks.diamond.monthly',
  DIAMOND_YEARLY: 'wallstreetstocks.diamond.yearly',
  LIFETIME: 'wallstreetstocks_lifetime',
} as const;

// Subscription tier levels (for comparison)
export const SUBSCRIPTION_TIERS = {
  [PRODUCT_IDS.GOLD_MONTHLY]: 1,
  [PRODUCT_IDS.PLATINUM_MONTHLY]: 2,
  [PRODUCT_IDS.DIAMOND_MONTHLY]: 3,
} as const;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts (in _layout.tsx)
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  try {
    // Set log level (DEBUG for development, ERROR for production to reduce noise)
    Purchases.setLogLevel(LOG_LEVEL.ERROR);

    // Configure with platform-specific API key
    const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
    
    if (userId) {
      // If user is logged in, identify them
      await Purchases.configure({ apiKey, appUserID: userId });
    } else {
      // Anonymous user - RevenueCat will generate an ID
      await Purchases.configure({ apiKey });
    }

  } catch (error) {
    // Don't throw - let app continue without RevenueCat
  }
}

/**
 * Identify user with RevenueCat (call after login)
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.logIn(userId);
    return customerInfo.customerInfo;
  } catch (error) {
    throw error;
  }
}

/**
 * Log out user from RevenueCat (call after logout)
 */
export async function logOutUser(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.logOut();
    return customerInfo;
  } catch (error) {
    throw error;
  }
}

/**
 * Get current customer info (subscription status)
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if user has active premium subscription
 */
export async function checkPremiumStatus(): Promise<{
  isPremium: boolean;
  activeSubscription: string | null;
  activeEntitlementId: string | null;
  expirationDate: string | null;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const activeEntitlementId = getActiveEntitlement(customerInfo.entitlements.active);
    const entitlement = activeEntitlementId ? customerInfo.entitlements.active[activeEntitlementId] : null;

    if (entitlement) {
      return {
        isPremium: true,
        activeSubscription: entitlement.productIdentifier,
        activeEntitlementId,
        expirationDate: entitlement.expirationDate,
      };
    }

    return {
      isPremium: false,
      activeSubscription: null,
      activeEntitlementId: null,
      expirationDate: null,
    };
  } catch (error) {
    return {
      isPremium: false,
      activeSubscription: null,
      activeEntitlementId: null,
      expirationDate: null,
    };
  }
}

/**
 * Get available subscription packages (offerings)
 */
export async function getOfferings(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      return offerings.current.availablePackages;
    }
    
    return [];
  } catch (error) {
    // Don't throw - return empty array so app continues
    return [];
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  customerInfo: CustomerInfo | null;
  error?: string;
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    // Check if any entitlement is now active
    const isPremium = !!getActiveEntitlement(customerInfo.entitlements.active);
    
    return {
      success: isPremium,
      customerInfo,
    };
  } catch (error: any) {
    // Handle user cancellation
    if (error.userCancelled) {
      return {
        success: false,
        customerInfo: null,
        error: 'Purchase cancelled',
      };
    }
    
    return {
      success: false,
      customerInfo: null,
      error: error.message || 'Purchase failed',
    };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo: CustomerInfo | null;
  error?: string;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = !!getActiveEntitlement(customerInfo.entitlements.active);

    return {
      success: isPremium,
      customerInfo,
    };
  } catch (error: any) {
    return {
      success: false,
      customerInfo: null,
      error: error.message || 'Restore failed',
    };
  }
}

/**
 * Get subscription tier level for a product or entitlement ID
 * Returns: 0 = free, 1 = gold, 2 = platinum, 3 = diamond/lifetime
 */
export function getSubscriptionTier(productIdOrEntitlementId: string): number {
  // First check exact match for product IDs
  const exactMatch = SUBSCRIPTION_TIERS[productIdOrEntitlementId as keyof typeof SUBSCRIPTION_TIERS];
  if (exactMatch) return exactMatch;

  // Fall back to pattern matching for various product ID and entitlement ID formats
  const lowerId = productIdOrEntitlementId.toLowerCase();

  // Check for lifetime (tier 3 - same as diamond)
  if (lowerId.includes('lifetime')) {
    return 3;
  }
  // Check for diamond (tier 3)
  if (lowerId.includes('diamond') || lowerId === '$rc_annual' || lowerId === 'diamond_access') {
    return 3;
  }
  // Check for platinum (tier 2)
  if (lowerId.includes('platinum') || lowerId === '$rc_six_month' || lowerId === 'platinum_access') {
    return 2;
  }
  // Check for gold (tier 1)
  if (lowerId.includes('gold') || lowerId === '$rc_monthly' || lowerId === 'gold_access') {
    return 1;
  }

  return 0;
}

/**
 * Check if user has at least a certain subscription tier
 */
export async function hasMinimumTier(minimumTier: number): Promise<boolean> {
  const { isPremium, activeSubscription } = await checkPremiumStatus();

  if (!isPremium || !activeSubscription) {
    return false;
  }

  const userTier = getSubscriptionTier(activeSubscription);
  return userTier >= minimumTier;
}

/**
 * Open the device's subscription management page
 * iOS: Opens App Store subscription settings
 * Android: Opens Google Play subscription settings
 */
export async function openSubscriptionManagement(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      // Opens App Store subscription management
      const url = 'https://apps.apple.com/account/subscriptions';
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    } else if (Platform.OS === 'android') {
      // Opens Google Play subscription management for this app
      const url = 'https://play.google.com/store/account/subscriptions';
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Get tier name from entitlement ID (primary) or product ID (fallback)
 */
function getTierNameFromEntitlementOrProduct(entitlementId: string | null, productId: string | null): string {
  // First check entitlement ID (most reliable)
  if (entitlementId) {
    const entitlementLower = entitlementId.toLowerCase();
    if (entitlementLower.includes('diamond')) return 'Diamond';
    if (entitlementLower.includes('platinum')) return 'Platinum';
    if (entitlementLower.includes('gold')) return 'Gold';
  }

  // Fallback to product ID
  if (productId) {
    const productLower = productId.toLowerCase();
    if (productLower.includes('lifetime')) return 'Lifetime';
    if (productLower.includes('diamond') || productId === '$rc_annual') return 'Diamond';
    if (productLower.includes('platinum') || productId === '$rc_six_month') return 'Platinum';
    if (productLower.includes('gold') || productId === '$rc_monthly') return 'Gold';
  }

  return 'Premium';
}

/**
 * Check if a product is a lifetime purchase
 */
export function isLifetimePurchase(productId: string | null): boolean {
  if (!productId) return false;
  return productId.toLowerCase().includes('lifetime');
}

/**
 * Get detailed subscription information
 */
export async function getSubscriptionDetails(): Promise<{
  isActive: boolean;
  productId: string | null;
  tierName: string | null;
  expirationDate: string | null;
  willRenew: boolean;
  isCanceled: boolean;
  managementUrl: string | null;
  isLifetime: boolean;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const activeEntitlementId = getActiveEntitlement(customerInfo.entitlements.active);
    const entitlement = activeEntitlementId ? customerInfo.entitlements.active[activeEntitlementId] : null;

    if (entitlement) {
      const productId = entitlement.productIdentifier;
      // Check if this is a lifetime purchase
      const isLifetime = isLifetimePurchase(productId);
      // Use entitlement ID as primary source for tier detection
      const tierName = getTierNameFromEntitlementOrProduct(activeEntitlementId, productId);


      // Check if subscription will renew (lifetime never renews but is always active)
      const willRenew = isLifetime ? false : (!entitlement.willRenew ? false : entitlement.willRenew);

      // Get management URL from RevenueCat
      const managementUrl = customerInfo.managementURL || null;

      return {
        isActive: true,
        productId,
        tierName,
        expirationDate: isLifetime ? null : entitlement.expirationDate,
        willRenew,
        isCanceled: isLifetime ? false : !willRenew,
        managementUrl,
        isLifetime,
      };
    }

    return {
      isActive: false,
      productId: null,
      tierName: null,
      expirationDate: null,
      willRenew: false,
      isCanceled: false,
      managementUrl: null,
      isLifetime: false,
    };
  } catch (error) {
    return {
      isActive: false,
      productId: null,
      tierName: null,
      expirationDate: null,
      willRenew: false,
      isCanceled: false,
      managementUrl: null,
      isLifetime: false,
    };
  }
}

/**
 * Format expiration date to readable string
 */
export function formatExpirationDate(dateString: string | null): string {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}
