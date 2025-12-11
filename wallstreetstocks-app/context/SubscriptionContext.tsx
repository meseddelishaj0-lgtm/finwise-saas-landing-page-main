import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { CustomerInfo, PurchasesPackage, PurchasesOfferings } from 'react-native-purchases';
import {
  initializeRevenueCat,
  identifyUser,
  logOutUser,
  checkPremiumStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
  ENTITLEMENT_ID,
  PRODUCT_IDS,
  getSubscriptionTier,
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
}

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
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

// Helper function to determine tier from product ID
const getTierFromProductId = (productId: string | null): string | null => {
  if (!productId) return null;
  
  if (productId.includes('gold') || productId === '$rc_monthly') {
    return 'gold';
  } else if (productId.includes('platinum') || productId === '$rc_six_month') {
    return 'platinum';
  } else if (productId.includes('diamond') || productId === '$rc_annual') {
    return 'diamond';
  }
  
  return null;
};

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [state, setState] = useState<SubscriptionState>(initialState);

  // Initialize RevenueCat
  const initialize = useCallback(async (userId?: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await initializeRevenueCat(userId);
      
      // Get initial subscription status and offerings in parallel
      const [status, packages] = await Promise.all([
        checkPremiumStatus(),
        getOfferings(),
      ]);
      
      const currentTier = getTierFromProductId(status.activeSubscription);
      
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
      console.error('Failed to initialize subscription:', error);
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        error: error.message || 'Failed to initialize',
      }));
    }
  }, []);

  // Identify user (call after login)
  const handleIdentifyUser = useCallback(async (userId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const customerInfo = await identifyUser(userId);
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const activeSubscription = entitlement?.productIdentifier || null;
      const currentTier = getTierFromProductId(activeSubscription);
      
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
      console.error('Failed to identify user:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to identify user',
      }));
    }
  }, []);

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
      console.error('Failed to log out:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to log out',
      }));
    }
  }, []);

  // Refresh subscription status
  const refreshStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const status = await checkPremiumStatus();
      const currentTier = getTierFromProductId(status.activeSubscription);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPremium: status.isPremium,
        activeSubscription: status.activeSubscription,
        currentTier,
        expirationDate: status.expirationDate,
      }));
    } catch (error: any) {
      console.error('Failed to refresh status:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to refresh status',
      }));
    }
  }, []);

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
      console.error('Failed to load offerings:', error);
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
        const entitlement = result.customerInfo.entitlements.active[ENTITLEMENT_ID];
        const activeSubscription = entitlement?.productIdentifier || null;
        const currentTier = getTierFromProductId(activeSubscription);
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          customerInfo: result.customerInfo,
          isPremium: !!entitlement,
          activeSubscription,
          currentTier,
          expirationDate: entitlement?.expirationDate || null,
        }));
        
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
      console.error('Purchase error:', error);
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
        const entitlement = result.customerInfo.entitlements.active[ENTITLEMENT_ID];
        const activeSubscription = entitlement?.productIdentifier || null;
        const currentTier = getTierFromProductId(activeSubscription);
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          customerInfo: result.customerInfo,
          isPremium: !!entitlement,
          activeSubscription,
          currentTier,
          expirationDate: entitlement?.expirationDate || null,
        }));
        
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
      console.error('Restore error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Restore failed',
      }));
      
      return false;
    }
  }, []);

  // Check if user has access to a feature based on tier
  const hasFeatureAccess = useCallback((requiredTier: number): boolean => {
    if (!state.isPremium || !state.activeSubscription) {
      return false;
    }
    
    const userTier = getSubscriptionTier(state.activeSubscription);
    return userTier >= requiredTier;
  }, [state.isPremium, state.activeSubscription]);

  // Get current subscription tier
  const getActiveSubscriptionTier = useCallback((): number => {
    if (!state.activeSubscription) {
      return 0;
    }
    return getSubscriptionTier(state.activeSubscription);
  }, [state.activeSubscription]);

  // Helper getters for specific packages
  const goldPackage = state.packages.find(p => 
    p.identifier === '$rc_monthly' || p.identifier === 'gold_monthly'
  );
  const platinumPackage = state.packages.find(p => 
    p.identifier === '$rc_six_month' || p.identifier === 'platinum_monthly'
  );
  const diamondPackage = state.packages.find(p => 
    p.identifier === '$rc_annual' || p.identifier === 'diamond_monthly'
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

// Custom hook to use subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  
  return context;
}

// Export product IDs for convenience
export { PRODUCT_IDS, ENTITLEMENT_ID };
