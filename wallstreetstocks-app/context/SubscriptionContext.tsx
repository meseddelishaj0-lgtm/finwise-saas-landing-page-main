import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { CustomerInfo, PurchasesPackage, PurchasesOfferings } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeRevenueCat,
  identifyUser,
  logOutUser,
  checkPremiumStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
  ENTITLEMENT_IDS,
  getActiveEntitlement,
  PRODUCT_IDS,
} from '../services/revenueCat';

interface SubscriptionState {
  isInitialized: boolean;
  isLoading: boolean;
  isPremium: boolean;
  activeSubscription: string | null;
  currentTier: string | null;
  expirationDate: string | null;
  packages: PurchasesPackage[];
  offerings: PurchasesOfferings | null;
  customerInfo: CustomerInfo | null;
  error: string | null;
  // Referral premium support
  hasReferralPremium: boolean;
  referralPremiumExpiry: string | null;
}

const API_URL = 'https://www.wallstreetstocks.ai';

export interface SubscriptionContextType extends SubscriptionState {
  initialize: (userId?: string) => Promise<void>;
  identifyUser: (userId: string) => Promise<void>;
  logOut: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  loadOfferings: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  hasFeatureAccess: (requiredTier: number) => boolean;
  getActiveSubscriptionTier: () => number;
  // Helper getters for specific packages
  goldPackage: PurchasesPackage | undefined;
  platinumPackage: PurchasesPackage | undefined;
  diamondPackage: PurchasesPackage | undefined;
}

const initialState: SubscriptionState = {
  isInitialized: false,
  isLoading: false,  // Don't block app on subscription loading
  isPremium: false,
  activeSubscription: null,
  currentTier: null,
  expirationDate: null,
  packages: [],
  offerings: null,
  customerInfo: null,
  error: null,
  hasReferralPremium: false,
  referralPremiumExpiry: null,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

// Helper function to determine tier from entitlement ID (primary) or product ID (fallback)
const getTierFromEntitlementOrProduct = (entitlementId: string | null, productId: string | null): string | null => {
  // First check entitlement ID (most reliable)
  if (entitlementId) {
    const entitlementLower = entitlementId.toLowerCase();
    if (entitlementLower.includes('diamond')) return 'diamond';
    if (entitlementLower.includes('platinum')) return 'platinum';
    if (entitlementLower.includes('gold')) return 'gold';
  }

  // Fallback to product ID
  if (productId) {
    const productLower = productId.toLowerCase();
    if (productLower.includes('diamond') || productId === '$rc_annual') return 'diamond';
    if (productLower.includes('platinum') || productId === '$rc_six_month') return 'platinum';
    if (productLower.includes('gold') || productId === '$rc_monthly') return 'gold';
  }

  return null;
};

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [state, setState] = useState<SubscriptionState>(initialState);

  // Handle subscription changes from RevenueCat listener
  const handleCustomerInfoUpdate = useCallback((customerInfo: CustomerInfo) => {

    // Safe null checks for entitlements
    const activeEntitlements = customerInfo?.entitlements?.active || {};
    const activeEntitlementId = getActiveEntitlement(activeEntitlements);
    const entitlement = activeEntitlementId ? activeEntitlements[activeEntitlementId] : null;
    const activeSubscription = entitlement?.productIdentifier || null;
    const currentTier = getTierFromEntitlementOrProduct(activeEntitlementId, activeSubscription);

    setState(prev => ({
      ...prev,
      customerInfo,
      isPremium: !!entitlement,
      activeSubscription,
      currentTier,
      expirationDate: entitlement?.expirationDate || null,
    }));
  }, []);

  // Sync subscription tier to database using the reliable /api/user/:id endpoint
  const syncSubscriptionToDatabase = useCallback(async (
    userId: string,
    tier: string,
    productId: string | null,
    expirationDate: string | null
  ) => {
    try {
      // Use the /api/user/:id endpoint which is proven to work correctly
      const response = await fetch(`${API_URL}/api/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          subscriptionTier: tier,
        }),
      });
      if (response.ok) {
        const data = await response.json();
      } else {
        const errorText = await response.text();
      }
    } catch (error) {
    }
  }, []);

  // Initialize RevenueCat
  const initialize = useCallback(async (userId?: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await initializeRevenueCat(userId);

      // Set up listener for subscription changes (catches external changes like App Store cancellations)
      try {
        const Purchases = require('react-native-purchases').default;
        Purchases.addCustomerInfoUpdateListener(handleCustomerInfoUpdate);
      } catch (listenerError) {
      }

      // Get initial subscription status and offerings in parallel
      const [status, packages] = await Promise.all([
        checkPremiumStatus(),
        getOfferings(),
      ]);

      // status now includes activeEntitlementId for better tier detection
      const currentTier = getTierFromEntitlementOrProduct(status.activeEntitlementId || null, status.activeSubscription);

      // Auto-sync subscription tier to database on initialization
      // This ensures badges show correctly for existing subscribers
      if (userId && status.isPremium && currentTier && currentTier !== 'free') {
        syncSubscriptionToDatabase(
          userId,
          currentTier,
          status.activeSubscription,
          status.expirationDate
        );
      }

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        isPremium: status.isPremium,
        activeSubscription: status.activeSubscription,
        currentTier,
        expirationDate: status.expirationDate,
        packages,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        error: error.message || 'Failed to initialize',
      }));
    }
  }, [handleCustomerInfoUpdate, syncSubscriptionToDatabase]);

  // Identify user (call after login)
  const handleIdentifyUser = useCallback(async (userId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const customerInfo = await identifyUser(userId);
      const activeEntitlements = customerInfo?.entitlements?.active || {};
      const activeEntitlementId = getActiveEntitlement(activeEntitlements);
      const entitlement = activeEntitlementId ? activeEntitlements[activeEntitlementId] : null;
      const activeSubscription = entitlement?.productIdentifier || null;
      const currentTier = getTierFromEntitlementOrProduct(activeEntitlementId, activeSubscription);

      // Auto-sync subscription tier to database on login
      if (currentTier && currentTier !== 'free' && entitlement) {
        syncSubscriptionToDatabase(
          userId,
          currentTier,
          activeSubscription,
          entitlement.expirationDate || null
        );
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        customerInfo,
        isPremium: !!entitlement,
        activeSubscription,
        currentTier,
        expirationDate: entitlement?.expirationDate || null,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to identify user',
      }));
    }
  }, [syncSubscriptionToDatabase]);

  // Log out user
  const handleLogOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const customerInfo = await logOutUser();
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        customerInfo,
        isPremium: false,
        activeSubscription: null,
        currentTier: null,
        expirationDate: null,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to log out',
      }));
    }
  }, []);

  // Check backend subscription status (includes referral premium)
  const checkBackendSubscription = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/subscription/status`, {
        headers: { 'x-user-id': userId },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          hasReferralPremium: data.referralPremium?.active || false,
          referralPremiumExpiry: data.referralPremium?.expiresAt || null,
          backendTier: data.tier,
          backendExpiry: data.expiresAt,
        };
      }
    } catch (error) {
    }
    return null;
  }, []);

  // Refresh subscription status
  const refreshStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Force sync with RevenueCat to get latest data
      try {
        const Purchases = require('react-native-purchases').default;
        await Purchases.syncPurchases();
      } catch (e) {
      }

      const status = await checkPremiumStatus();
      let currentTier = getTierFromEntitlementOrProduct(status.activeEntitlementId || null, status.activeSubscription);
      let isPremium = status.isPremium;
      let hasReferralPremium = false;
      let referralPremiumExpiry: string | null = null;

      // Get userId from AsyncStorage for backend check
      const userDataStr = await AsyncStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const userId = userData?.id?.toString();

      // Also check backend for referral premium
      if (userId) {
        const backendStatus = await checkBackendSubscription(userId);
        if (backendStatus) {
          hasReferralPremium = backendStatus.hasReferralPremium;
          referralPremiumExpiry = backendStatus.referralPremiumExpiry;

          // If user has referral premium but no RevenueCat subscription, use backend tier
          // Tier is based on referral count: 5-14=Gold, 15-29=Platinum, 30+=Diamond
          if (!isPremium && hasReferralPremium) {
            isPremium = true;
            currentTier = backendStatus.backendTier || 'gold';
          }
        }

        // Auto-sync subscription tier to database if user has premium
        // This ensures badges show correctly in community
        if (isPremium && currentTier && currentTier !== 'free') {
          await syncSubscriptionToDatabase(
            userId,
            currentTier,
            status.activeSubscription,
            status.expirationDate
          );
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isPremium,
        activeSubscription: status.activeSubscription,
        currentTier,
        expirationDate: status.expirationDate,
        hasReferralPremium,
        referralPremiumExpiry,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to refresh status',
      }));
    }
  }, [checkBackendSubscription, syncSubscriptionToDatabase]);

  // Load available offerings/packages
  const loadOfferings = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const packages = await getOfferings();
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        packages,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load offerings',
      }));
    }
  }, []);

  // Purchase a package
  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const result = await purchasePackage(pkg);

      if (result.success && result.customerInfo) {
        const activeEntitlements = result.customerInfo?.entitlements?.active || {};
        const activeEntitlementId = getActiveEntitlement(activeEntitlements);
        const entitlement = activeEntitlementId ? activeEntitlements[activeEntitlementId] : null;
        const activeSubscription = entitlement?.productIdentifier || null;
        const currentTier = getTierFromEntitlementOrProduct(activeEntitlementId, activeSubscription);


        setState(prev => ({
          ...prev,
          isLoading: false,
          customerInfo: result.customerInfo,
          isPremium: !!entitlement,
          activeSubscription,
          currentTier,
          expirationDate: entitlement?.expirationDate || null,
        }));

        // Sync subscription tier to database for badge display
        const userDataStr = await AsyncStorage.getItem('userData');
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const userId = userData?.id?.toString();
        if (userId && currentTier) {
          await syncSubscriptionToDatabase(
            userId,
            currentTier,
            activeSubscription,
            entitlement?.expirationDate || null
          );
        }

        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Purchase failed',
        }));

        return false;
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Purchase failed',
      }));
      
      return false;
    }
  }, []);

  // Restore purchases
  const restore = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await restorePurchases();
      
      if (result.success && result.customerInfo) {
        const activeEntitlements = result.customerInfo?.entitlements?.active || {};
        const activeEntitlementId = getActiveEntitlement(activeEntitlements);
        const entitlement = activeEntitlementId ? activeEntitlements[activeEntitlementId] : null;
        const activeSubscription = entitlement?.productIdentifier || null;
        const currentTier = getTierFromEntitlementOrProduct(activeEntitlementId, activeSubscription);


        setState(prev => ({
          ...prev,
          isLoading: false,
          customerInfo: result.customerInfo,
          isPremium: !!entitlement,
          activeSubscription,
          currentTier,
          expirationDate: entitlement?.expirationDate || null,
        }));

        // Sync subscription tier to database for badge display
        const userDataStr = await AsyncStorage.getItem('userData');
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const userId = userData?.id?.toString();
        if (userId && currentTier) {
          await syncSubscriptionToDatabase(
            userId,
            currentTier,
            activeSubscription,
            entitlement?.expirationDate || null
          );
        }

        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'No purchases to restore',
        }));

        return false;
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Restore failed',
      }));

      return false;
    }
  }, [syncSubscriptionToDatabase]);

  // Helper function to convert tier string to number
  const tierToNumber = (tier: string | null): number => {
    switch (tier) {
      case 'diamond': return 3;
      case 'platinum': return 2;
      case 'gold': return 1;
      default: return 0;
    }
  };

  // Check if user has access to a feature based on tier
  const hasFeatureAccess = useCallback((requiredTier: number): boolean => {
    if (!state.isPremium) {
      return false;
    }

    // Use the already-calculated currentTier which properly detects from entitlement ID first
    const userTier = tierToNumber(state.currentTier);
    return userTier >= requiredTier;
  }, [state.isPremium, state.currentTier]);

  // Get current subscription tier
  const getActiveSubscriptionTier = useCallback((): number => {
    // Use the already-calculated currentTier which properly detects from entitlement ID first
    return tierToNumber(state.currentTier);
  }, [state.currentTier]);

  // Helper getters for specific packages
  const goldPackage = state.packages.find(p =>
    p.identifier === '$rc_monthly' || p.product.identifier.includes('gold')
  );
  const platinumPackage = state.packages.find(p =>
    p.identifier === '$rc_six_month' || p.product.identifier.includes('platinum')
  );
  const diamondPackage = state.packages.find(p =>
    p.identifier === '$rc_annual' || p.product.identifier.includes('diamond')
  );

  const value: SubscriptionContextType = {
    ...state,
    initialize,
    identifyUser: handleIdentifyUser,
    logOut: handleLogOut,
    refreshStatus,
    loadOfferings,
    purchase,
    restore,
    hasFeatureAccess,
    getActiveSubscriptionTier,
    goldPackage,
    platinumPackage,
    diamondPackage,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Default context value for when provider isn't available yet
const defaultContextValue: SubscriptionContextType = {
  isInitialized: false,
  isLoading: false,
  isPremium: false,
  activeSubscription: null,
  currentTier: null,
  expirationDate: null,
  packages: [],
  offerings: null,
  customerInfo: null,
  error: null,
  hasReferralPremium: false,
  referralPremiumExpiry: null,
  initialize: async () => {},
  identifyUser: async () => {},
  logOut: async () => {},
  refreshStatus: async () => {},
  loadOfferings: async () => {},
  purchase: async () => false,
  restore: async () => false,
  hasFeatureAccess: () => false,
  getActiveSubscriptionTier: () => 0,
  goldPackage: undefined,
  platinumPackage: undefined,
  diamondPackage: undefined,
};

// Custom hook to use subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);

  // Return default value instead of throwing - prevents crash during initial render
  if (context === undefined) {
    return defaultContextValue;
  }

  return context;
}

// Export product IDs and entitlement IDs for convenience
export { PRODUCT_IDS, ENTITLEMENT_IDS };
