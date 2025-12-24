import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform, Linking } from 'react-native';

// RevenueCat API Keys - Replace with your actual keys from RevenueCat dashboard
const API_KEYS = {
  ios: 'appl_MvQMNxVSRjqfwMomGYDrIxbwXZi', // Your iOS API key from RevenueCat
  android: 'goog_lWSKWOLpSxxBMiVzPcprDWcWpnf', // Your Android API key (if needed later)
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
  console.log('🔍 Active entitlements:', Object.keys(activeEntitlements));

  // Check Diamond first (highest tier)
  if (activeEntitlements[ENTITLEMENT_IDS.DIAMOND]) {
    console.log('✅ Found Diamond entitlement');
    return ENTITLEMENT_IDS.DIAMOND;
  }
  // Then Platinum
  if (activeEntitlements[ENTITLEMENT_IDS.PLATINUM]) {
    console.log('✅ Found Platinum entitlement');
    return ENTITLEMENT_IDS.PLATINUM;
  }
  // Then Gold
  if (activeEntitlements[ENTITLEMENT_IDS.GOLD]) {
    console.log('✅ Found Gold entitlement');
    return ENTITLEMENT_IDS.GOLD;
  }

  console.log('❌ No matching entitlement found');
  return null;
};

// Product IDs - Match your App Store Connect products
export const PRODUCT_IDS = {
  GOLD_MONTHLY: 'wallstreetstocks.gold.monthly',
  PLATINUM_MONTHLY: 'wallstreetstocks.platinum.monthly',
  DIAMOND_MONTHLY: 'wallstreetstocks.diamond.monthly',
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

    console.log('RevenueCat initialized successfully');
  } catch (error) {
    // Don't throw - let app continue without RevenueCat
    console.warn('RevenueCat initialization failed (non-blocking):', error);
  }
}

/**
 * Identify user with RevenueCat (call after login)
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.logIn(userId);
    console.log('User identified with RevenueCat:', userId);
    return customerInfo.customerInfo;
  } catch (error) {
    console.error('Failed to identify user:', error);
    throw error;
  }
}

/**
 * Log out user from RevenueCat (call after logout)
 */
export async function logOutUser(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.logOut();
    console.log('User logged out from RevenueCat');
    return customerInfo;
  } catch (error) {
    console.error('Failed to log out user:', error);
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
    console.error('Failed to get customer info:', error);
    throw error;
  }
}

/**
 * Check if user has active premium subscription
 */
export async function checkPremiumStatus(): Promise<{
  isPremium: boolean;
  activeSubscription: string | null;
  expirationDate: string | null;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const activeEntitlementId = getActiveEntitlement(customerInfo.entitlements.active);
    const entitlement = activeEntitlementId ? customerInfo.entitlements.active[activeEntitlementId] : null;

    if (entitlement) {
      console.log('📱 Active entitlement ID:', activeEntitlementId);
      console.log('📱 Product identifier:', entitlement.productIdentifier);
      console.log('📱 Tier level:', getSubscriptionTier(entitlement.productIdentifier));
      return {
        isPremium: true,
        activeSubscription: entitlement.productIdentifier,
        expirationDate: entitlement.expirationDate,
      };
    }

    return {
      isPremium: false,
      activeSubscription: null,
      expirationDate: null,
    };
  } catch (error) {
    console.error('Failed to check premium status:', error);
    return {
      isPremium: false,
      activeSubscription: null,
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
    
    console.warn('No offerings available');
    return [];
  } catch (error) {
    // Don't throw - return empty array so app continues
    console.warn('Failed to get offerings (non-blocking):', error);
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
    
    console.error('Purchase failed:', error);
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
    console.error('Restore failed:', error);
    return {
      success: false,
      customerInfo: null,
      error: error.message || 'Restore failed',
    };
  }
}

/**
 * Get subscription tier level for a product
 * Returns: 0 = free, 1 = gold, 2 = platinum, 3 = diamond
 */
export function getSubscriptionTier(productId: string): number {
  // First check exact match
  const exactMatch = SUBSCRIPTION_TIERS[productId as keyof typeof SUBSCRIPTION_TIERS];
  if (exactMatch) return exactMatch;

  // Fall back to pattern matching for various product ID formats
  const lowerProductId = productId.toLowerCase();

  if (lowerProductId.includes('diamond') || lowerProductId === '$rc_annual') {
    return 3;
  }
  if (lowerProductId.includes('platinum') || lowerProductId === '$rc_six_month') {
    return 2;
  }
  if (lowerProductId.includes('gold') || lowerProductId === '$rc_monthly') {
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
    console.error('Failed to open subscription management:', error);
    return false;
  }
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
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const activeEntitlementId = getActiveEntitlement(customerInfo.entitlements.active);
    const entitlement = activeEntitlementId ? customerInfo.entitlements.active[activeEntitlementId] : null;

    if (entitlement) {
      const productId = entitlement.productIdentifier;
      let tierName = 'Premium';

      if (productId.toLowerCase().includes('gold')) tierName = 'Gold';
      else if (productId.toLowerCase().includes('platinum')) tierName = 'Platinum';
      else if (productId.toLowerCase().includes('diamond')) tierName = 'Diamond';

      // Check if subscription will renew
      const willRenew = !entitlement.willRenew ? false : entitlement.willRenew;

      // Get management URL from RevenueCat
      const managementUrl = customerInfo.managementURL || null;

      return {
        isActive: true,
        productId,
        tierName,
        expirationDate: entitlement.expirationDate,
        willRenew,
        isCanceled: !willRenew,
        managementUrl,
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
    };
  } catch (error) {
    console.error('Failed to get subscription details:', error);
    return {
      isActive: false,
      productId: null,
      tierName: null,
      expirationDate: null,
      willRenew: false,
      isCanceled: false,
      managementUrl: null,
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
