import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API Keys - Replace with your actual keys from RevenueCat dashboard
const API_KEYS = {
  ios: 'appl_PKEwxzRJaSiGjbbpWZNorpXGiWZ', // Your iOS API key from RevenueCat
  android: 'goog_lWSKWOLpSxxBMiVzPcprDWcWpnf', // Your Android API key (if needed later)
};

// Entitlement ID - This should match what you set up in RevenueCat
export const ENTITLEMENT_ID = 'WallStreetStocks Pro';

// Product IDs - Match your App Store Connect products
export const PRODUCT_IDS = {
  GOLD_MONTHLY: 'gold_monthly',
  PLATINUM_MONTHLY: 'platinum_monthly',
  DIAMOND_MONTHLY: 'diamond_monthly',
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
    // Set log level for debugging (change to WARN or ERROR in production)
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

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
    console.error('Failed to initialize RevenueCat:', error);
    throw error;
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
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    if (entitlement) {
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
    console.error('Failed to get offerings:', error);
    throw error;
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
    
    // Check if the entitlement is now active
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
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
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
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
 */
export function getSubscriptionTier(productId: string): number {
  return SUBSCRIPTION_TIERS[productId as keyof typeof SUBSCRIPTION_TIERS] || 0;
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
