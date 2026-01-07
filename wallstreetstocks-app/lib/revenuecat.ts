// services/revenueCat.ts
import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API Keys - loaded from environment variables
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

// Entitlement IDs - Must match RevenueCat Dashboard
export const ENTITLEMENT_IDS = {
  GOLD: 'gold_access',
  PLATINUM: 'platinum_access',
  DIAMOND: 'diamond_access',
} as const;

// Helper to get any active entitlement
export const getActiveEntitlement = (activeEntitlements: Record<string, any>): string | null => {
  if (activeEntitlements[ENTITLEMENT_IDS.DIAMOND]) return ENTITLEMENT_IDS.DIAMOND;
  if (activeEntitlements[ENTITLEMENT_IDS.PLATINUM]) return ENTITLEMENT_IDS.PLATINUM;
  if (activeEntitlements[ENTITLEMENT_IDS.GOLD]) return ENTITLEMENT_IDS.GOLD;
  return null;
};

// Product IDs - Must match RevenueCat Dashboard
export const PRODUCT_IDS = {
  GOLD_MONTHLY: 'wallstreetstocks.gold.monthly',
  PLATINUM_MONTHLY: 'wallstreetstocks.platinum.monthly',
  DIAMOND_MONTHLY: 'wallstreetstocks.diamond.monthly',
} as const;

// Subscription tier levels
export const TIER_LEVELS = {
  FREE: 0,
  GOLD: 1,
  PLATINUM: 2,
  DIAMOND: 3,
};

export type SubscriptionTier = 'free' | 'gold' | 'platinum' | 'diamond';

// ============================================
// INITIALIZATION
// ============================================

// Initialize RevenueCat - Call once on app start
export const initializeRevenueCat = async (userId?: string): Promise<boolean> => {
  try {
    // Only enable debug logging in development
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

    if (!apiKey) {
      return false;
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId || undefined,
    });

    return true;
  } catch (error) {
    return false;
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

// Identify user (call after login) - REQUIRED by SubscriptionContext
export const identifyUser = async (userId: string): Promise<CustomerInfo> => {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    throw error;
  }
};

// Log out user - REQUIRED by SubscriptionContext
export const logOutUser = async (): Promise<CustomerInfo> => {
  try {
    const customerInfo = await Purchases.logOut();
    return customerInfo;
  } catch (error) {
    throw error;
  }
};

// ============================================
// SUBSCRIPTION STATUS
// ============================================

interface PremiumStatus {
  isPremium: boolean;
  activeSubscription: string | null;
  expirationDate: string | null;
  customerInfo: CustomerInfo | null;
}

// Check premium status - REQUIRED by SubscriptionContext
export const checkPremiumStatus = async (): Promise<PremiumStatus> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const activeEntitlementId = getActiveEntitlement(customerInfo.entitlements.active);
    const entitlement = activeEntitlementId ? customerInfo.entitlements.active[activeEntitlementId] : null;

    return {
      isPremium: !!entitlement,
      activeSubscription: entitlement?.productIdentifier || null,
      expirationDate: entitlement?.expirationDate || null,
      customerInfo,
    };
  } catch (error) {
    throw error;
  }
};

// Get subscription tier from product ID - REQUIRED by SubscriptionContext
export const getSubscriptionTier = (productId: string | null): number => {
  if (!productId) return TIER_LEVELS.FREE;

  const id = productId.toLowerCase();
  if (id.includes('diamond')) return TIER_LEVELS.DIAMOND;
  if (id.includes('platinum')) return TIER_LEVELS.PLATINUM;
  if (id.includes('gold')) return TIER_LEVELS.GOLD;

  return TIER_LEVELS.FREE;
};

// Get tier name from product ID
export const getTierName = (productId: string | null): SubscriptionTier => {
  if (!productId) return 'free';

  const id = productId.toLowerCase();
  if (id.includes('diamond')) return 'diamond';
  if (id.includes('platinum')) return 'platinum';
  if (id.includes('gold')) return 'gold';

  return 'free';
};

// ============================================
// OFFERINGS & PACKAGES
// ============================================

// Get available packages - REQUIRED by SubscriptionContext
export const getOfferings = async (): Promise<PurchasesPackage[]> => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || [];
  } catch (error) {
    throw error;
  }
};

// ============================================
// PURCHASES
// ============================================

interface PurchaseResult {
  success: boolean;
  customerInfo: CustomerInfo | null;
  error: string | null;
}

// Purchase a package - REQUIRED by SubscriptionContext
export const purchasePackage = async (pkg: PurchasesPackage): Promise<PurchaseResult> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    return {
      success: true,
      customerInfo,
      error: null,
    };
  } catch (error: any) {
    if (error.userCancelled) {
      return {
        success: false,
        customerInfo: null,
        error: 'cancelled',
      };
    }

    return {
      success: false,
      customerInfo: null,
      error: error.message || 'Purchase failed',
    };
  }
};

// Restore purchases - REQUIRED by SubscriptionContext
export const restorePurchases = async (): Promise<PurchaseResult> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasEntitlement = !!getActiveEntitlement(customerInfo.entitlements.active);

    return {
      success: hasEntitlement,
      customerInfo,
      error: hasEntitlement ? null : 'No purchases to restore',
    };
  } catch (error: any) {
    return {
      success: false,
      customerInfo: null,
      error: error.message || 'Restore failed',
    };
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get customer info
export const getCustomerInfo = async (): Promise<CustomerInfo> => {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    throw error;
  }
};

// Check if user has access to a specific tier
export const hasAccessToTier = (userTier: number, requiredTier: number): boolean => {
  return userTier >= requiredTier;
};

// Get product display name
export const getProductDisplayName = (productId: string | null): string => {
  if (!productId) return 'Free';

  const id = productId.toLowerCase();
  if (id.includes('diamond')) return 'Diamond';
  if (id.includes('platinum')) return 'Platinum';
  if (id.includes('gold')) return 'Gold';

  return 'Premium';
};
