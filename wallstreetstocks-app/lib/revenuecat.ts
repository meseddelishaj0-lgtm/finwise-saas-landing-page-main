// services/revenueCat.ts
import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API Keys - Get from RevenueCat Dashboard → API Keys
const REVENUECAT_API_KEY_IOS = 'appl_PKEwxzRJaSiGjbbpWZNorpXGiWZ';
const REVENUECAT_API_KEY_ANDROID = 'goog_YOUR_ANDROID_KEY';

// Entitlement ID - Must match RevenueCat Dashboard
export const ENTITLEMENT_ID = 'WallStreetStocks Pro';

// Product IDs - Must match RevenueCat Dashboard
export const PRODUCT_IDS = {
  GOLD_MONTHLY: 'gold_monthly',
  PLATINUM_MONTHLY: 'platinum_monthly',
  DIAMOND_MONTHLY: 'diamond_monthly',
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
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
    
    console.log('🔑 Initializing RevenueCat with key:', apiKey.substring(0, 15) + '...');
    
    await Purchases.configure({
      apiKey,
      appUserID: userId || undefined,
    });
    
    console.log('✅ RevenueCat initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize RevenueCat:', error);
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
    console.log('✅ User identified:', userId);
    return customerInfo;
  } catch (error) {
    console.error('Failed to identify user:', error);
    throw error;
  }
};

// Log out user - REQUIRED by SubscriptionContext
export const logOutUser = async (): Promise<CustomerInfo> => {
  try {
    const customerInfo = await Purchases.logOut();
    console.log('✅ User logged out');
    return customerInfo;
  } catch (error) {
    console.error('Failed to log out user:', error);
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
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    return {
      isPremium: !!entitlement,
      activeSubscription: entitlement?.productIdentifier || null,
      expirationDate: entitlement?.expirationDate || null,
      customerInfo,
    };
  } catch (error) {
    console.error('Failed to check premium status:', error);
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
    
    console.log('📦 ========== OFFERINGS DEBUG ==========');
    console.log('📦 Current offering ID:', offerings.current?.identifier);
    console.log('📦 Packages count:', offerings.current?.availablePackages?.length || 0);
    
    if (offerings.current?.availablePackages) {
      offerings.current.availablePackages.forEach((pkg, i) => {
        console.log(`📦 Package ${i}:`, {
          pkgIdentifier: pkg.identifier,
          productId: pkg.product.identifier,
          price: pkg.product.priceString
        });
      });
    }
    console.log('📦 =====================================');
    
    return offerings.current?.availablePackages || [];
  } catch (error) {
    console.error('Failed to get offerings:', error);
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
    
    console.log('✅ Purchase successful');
    return {
      success: true,
      customerInfo,
      error: null,
    };
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('User cancelled purchase');
      return {
        success: false,
        customerInfo: null,
        error: 'cancelled',
      };
    }
    
    console.error('Purchase failed:', error);
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
    const hasEntitlement = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    
    console.log('✅ Restore completed, has entitlement:', hasEntitlement);
    return {
      success: hasEntitlement,
      customerInfo,
      error: hasEntitlement ? null : 'No purchases to restore',
    };
  } catch (error: any) {
    console.error('Restore failed:', error);
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
    console.error('Failed to get customer info:', error);
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
