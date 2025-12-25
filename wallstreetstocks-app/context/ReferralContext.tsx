// context/ReferralContext.tsx - Referral Program Management
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const REFERRAL_DATA_KEY = 'referral_data';
const REFERRAL_CODE_KEY = 'referral_code';
const API_URL = 'https://www.wallstreetstocks.ai';

// Reward tiers configuration with subscription tier levels
// Higher referral counts unlock higher subscription tiers
export const REWARD_TIERS = [
  { referrals: 5, reward: '1 Week Gold', days: 7, icon: 'star', tier: 'gold' },
  { referrals: 10, reward: '1 Month Gold', days: 30, icon: 'star', tier: 'gold' },
  { referrals: 15, reward: '2 Months Platinum', days: 60, icon: 'diamond', tier: 'platinum' },
  { referrals: 20, reward: '3 Months Platinum', days: 90, icon: 'diamond', tier: 'platinum' },
  { referrals: 30, reward: '6 Months Diamond', days: 180, icon: 'trophy', tier: 'diamond' },
  { referrals: 50, reward: '1 Year Diamond', days: 365, icon: 'crown', tier: 'diamond' },
];

export interface Referral {
  id: string;
  referredUserId?: string;
  referredName: string;
  referredEmail?: string;
  date: string;
  status: 'pending' | 'completed' | 'expired';
  rewardClaimed: boolean;
}

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalDaysEarned: number;
  daysRemaining: number;
  nextTierReferrals: number;
  currentTierIndex: number;
}

interface ReferralData {
  referralCode: string;
  referrals: Referral[];
  totalDaysEarned: number;
  premiumStartDate: string | null;
  premiumEndDate: string | null;
  usedReferralCode: string | null; // Code the user signed up with
  createdAt: string;
  updatedAt: string;
}

interface ReferralContextType {
  referralCode: string;
  referrals: Referral[];
  stats: ReferralStats;
  loading: boolean;
  initialized: boolean;
  // Computed properties
  isPremiumFromReferrals: boolean;
  premiumEndDate: string | null;
  currentRewardTier: typeof REWARD_TIERS[0] | null;
  nextRewardTier: typeof REWARD_TIERS[0] | null;
  unlockedTiers: typeof REWARD_TIERS;
  lockedTiers: typeof REWARD_TIERS;
  // Actions
  initializeReferral: (userId: string, userName: string) => Promise<void>;
  applyReferralCode: (code: string) => Promise<boolean>;
  addReferral: (referral: Omit<Referral, 'id' | 'date' | 'status' | 'rewardClaimed'>) => Promise<void>;
  completeReferral: (referralId: string) => Promise<void>;
  claimReward: (tierIndex: number) => Promise<boolean>;
  refreshReferrals: () => Promise<void>;
  generateShareMessage: () => string;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

// Generate a unique referral code based on user info
const generateReferralCode = (userId: string, userName: string): string => {
  const cleanName = userName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
  const userIdSuffix = userId.slice(-4).toUpperCase();
  const year = new Date().getFullYear();
  return `${cleanName}${userIdSuffix}${year}`;
};

// Calculate premium days from referrals
const calculatePremiumDays = (completedReferrals: number): number => {
  let totalDays = 0;

  for (const tier of REWARD_TIERS) {
    if (completedReferrals >= tier.referrals) {
      totalDays = tier.days;
    } else {
      break;
    }
  }

  return totalDays;
};

// Get unlocked tiers based on completed referrals
const getUnlockedTiers = (completedReferrals: number) => {
  return REWARD_TIERS.filter(tier => completedReferrals >= tier.referrals);
};

// Get locked tiers
const getLockedTiers = (completedReferrals: number) => {
  return REWARD_TIERS.filter(tier => completedReferrals < tier.referrals);
};

// Get current tier index
const getCurrentTierIndex = (completedReferrals: number): number => {
  let index = -1;
  for (let i = 0; i < REWARD_TIERS.length; i++) {
    if (completedReferrals >= REWARD_TIERS[i].referrals) {
      index = i;
    } else {
      break;
    }
  }
  return index;
};

// Calculate referrals needed for next tier
const getNextTierReferrals = (completedReferrals: number): number => {
  const nextTier = REWARD_TIERS.find(tier => completedReferrals < tier.referrals);
  if (nextTier) {
    return nextTier.referrals - completedReferrals;
  }
  return 0; // All tiers unlocked
};

export function ReferralProvider({ children }: { children: ReactNode }) {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load referral data from storage
  const loadReferralData = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(REFERRAL_DATA_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setReferralData(data);
      }
    } catch (err) {
      console.error('Error loading referral data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save referral data to storage
  const saveReferralData = useCallback(async (data: ReferralData) => {
    try {
      await AsyncStorage.setItem(REFERRAL_DATA_KEY, JSON.stringify({
        ...data,
        updatedAt: new Date().toISOString(),
      }));
      setReferralData(data);
    } catch (err) {
      console.error('Error saving referral data:', err);
    }
  }, []);

  // Initialize referral system for a user
  const initializeReferral = useCallback(async (userId: string, userName: string) => {
    setLoading(true);

    try {
      // Check if already initialized
      const saved = await AsyncStorage.getItem(REFERRAL_DATA_KEY);
      if (saved) {
        const existingData = JSON.parse(saved);
        setReferralData(existingData);
        setInitialized(true);
        setLoading(false);
        return;
      }

      // Generate new referral code
      const code = generateReferralCode(userId, userName);

      // Create initial referral data
      const newData: ReferralData = {
        referralCode: code,
        referrals: [],
        totalDaysEarned: 0,
        premiumStartDate: null,
        premiumEndDate: null,
        usedReferralCode: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveReferralData(newData);

      // Try to sync with backend
      try {
        await fetch(`${API_URL}/api/referrals/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, referralCode: code }),
        });
      } catch (apiErr) {
        console.warn('Backend sync failed (offline mode):', apiErr);
      }

      setInitialized(true);
    } catch (err) {
      console.error('Error initializing referral:', err);
    } finally {
      setLoading(false);
    }
  }, [saveReferralData]);

  // Apply a referral code (when signing up with someone's code)
  const applyReferralCode = useCallback(async (code: string): Promise<boolean> => {
    if (!referralData) {
      Alert.alert('Error', 'Please wait for referral system to initialize');
      return false;
    }

    const upperCode = code.toUpperCase().trim();

    // Can't use own code
    if (upperCode === referralData.referralCode) {
      Alert.alert('Invalid Code', 'You cannot use your own referral code');
      return false;
    }

    // Already used a code
    if (referralData.usedReferralCode) {
      Alert.alert('Already Applied', 'You have already used a referral code');
      return false;
    }

    try {
      // Validate code with backend
      const response = await fetch(`${API_URL}/api/referrals/validate?code=${upperCode}`);
      const result = await response.json();

      if (!response.ok || !result.valid) {
        Alert.alert('Invalid Code', 'This referral code is not valid');
        return false;
      }

      // Apply the code
      const updatedData: ReferralData = {
        ...referralData,
        usedReferralCode: upperCode,
        // Give 1 week premium for using a referral code
        totalDaysEarned: referralData.totalDaysEarned + 7,
        premiumStartDate: referralData.premiumStartDate || new Date().toISOString(),
        premiumEndDate: calculateEndDate(referralData.premiumEndDate, 7),
      };

      await saveReferralData(updatedData);

      // Notify the referrer's backend
      try {
        await fetch(`${API_URL}/api/referrals/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode: upperCode }),
        });
      } catch (apiErr) {
        console.warn('Backend notification failed:', apiErr);
      }

      Alert.alert('Success!', 'Referral code applied! You\'ve earned 1 week of Premium.');
      return true;
    } catch (err) {
      console.error('Error applying referral code:', err);
      Alert.alert('Error', 'Failed to apply referral code. Please try again.');
      return false;
    }
  }, [referralData, saveReferralData]);

  // Add a new referral
  const addReferral = useCallback(async (
    referral: Omit<Referral, 'id' | 'date' | 'status' | 'rewardClaimed'>
  ) => {
    if (!referralData) return;

    const newReferral: Referral = {
      ...referral,
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString(),
      status: 'pending',
      rewardClaimed: false,
    };

    const updatedData: ReferralData = {
      ...referralData,
      referrals: [newReferral, ...referralData.referrals],
    };

    await saveReferralData(updatedData);
  }, [referralData, saveReferralData]);

  // Complete a referral (when referred user signs up and completes requirements)
  const completeReferral = useCallback(async (referralId: string) => {
    if (!referralData) return;

    const updatedReferrals = referralData.referrals.map(ref =>
      ref.id === referralId ? { ...ref, status: 'completed' as const } : ref
    );

    const completedCount = updatedReferrals.filter(r => r.status === 'completed').length;
    const newDaysEarned = calculatePremiumDays(completedCount);
    const additionalDays = newDaysEarned - referralData.totalDaysEarned;

    const updatedData: ReferralData = {
      ...referralData,
      referrals: updatedReferrals,
      totalDaysEarned: newDaysEarned,
      premiumStartDate: referralData.premiumStartDate || (additionalDays > 0 ? new Date().toISOString() : null),
      premiumEndDate: additionalDays > 0
        ? calculateEndDate(referralData.premiumEndDate, additionalDays)
        : referralData.premiumEndDate,
    };

    await saveReferralData(updatedData);

    if (additionalDays > 0) {
      const tier = REWARD_TIERS.find(t => t.days === newDaysEarned);
      Alert.alert(
        'Reward Unlocked!',
        `Congratulations! You've unlocked ${tier?.reward || `${newDaysEarned} days of Premium`}!`
      );
    }
  }, [referralData, saveReferralData]);

  // Claim a reward tier
  const claimReward = useCallback(async (tierIndex: number): Promise<boolean> => {
    if (!referralData) return false;

    const tier = REWARD_TIERS[tierIndex];
    if (!tier) return false;

    const completedCount = referralData.referrals.filter(r => r.status === 'completed').length;

    if (completedCount < tier.referrals) {
      Alert.alert('Not Unlocked', `You need ${tier.referrals} referrals to unlock this reward. You have ${completedCount}.`);
      return false;
    }

    // Premium days are automatically calculated, so just confirm
    Alert.alert('Reward Active!', `${tier.reward} is active on your account!`);
    return true;
  }, [referralData]);

  // Refresh referrals from backend
  const refreshReferrals = useCallback(async () => {
    if (!referralData) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/referrals?code=${referralData.referralCode}`);

      if (response.ok) {
        const backendData = await response.json();

        // Merge backend data with local data
        const mergedReferrals = [...referralData.referrals];

        for (const backendRef of backendData.referrals || []) {
          const existingIndex = mergedReferrals.findIndex(r => r.id === backendRef.id);
          if (existingIndex === -1) {
            mergedReferrals.push(backendRef);
          } else {
            mergedReferrals[existingIndex] = {
              ...mergedReferrals[existingIndex],
              ...backendRef,
            };
          }
        }

        const completedCount = mergedReferrals.filter(r => r.status === 'completed').length;
        const newDaysEarned = calculatePremiumDays(completedCount);

        const updatedData: ReferralData = {
          ...referralData,
          referrals: mergedReferrals,
          totalDaysEarned: newDaysEarned,
        };

        await saveReferralData(updatedData);
      }
    } catch (err) {
      console.warn('Failed to refresh from backend:', err);
    } finally {
      setLoading(false);
    }
  }, [referralData, saveReferralData]);

  // Generate share message
  const generateShareMessage = useCallback((): string => {
    const code = referralData?.referralCode || 'WALLST2025';
    return `Join me on WallStreetStocks - the best app for stock research and market insights! Use my referral code ${code} to get 1 week of Premium free. Download now: https://wallstreetstocks.app/invite/${code}`;
  }, [referralData]);

  // Load data on mount
  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  // Calculate stats
  const completedReferrals = referralData?.referrals.filter(r => r.status === 'completed').length || 0;
  const pendingReferrals = referralData?.referrals.filter(r => r.status === 'pending').length || 0;
  const totalDaysEarned = referralData?.totalDaysEarned || 0;

  // Calculate remaining premium days
  const now = new Date();
  const endDate = referralData?.premiumEndDate ? new Date(referralData.premiumEndDate) : null;
  const daysRemaining = endDate && endDate > now
    ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const stats: ReferralStats = {
    totalReferrals: referralData?.referrals.length || 0,
    completedReferrals,
    pendingReferrals,
    totalDaysEarned,
    daysRemaining,
    nextTierReferrals: getNextTierReferrals(completedReferrals),
    currentTierIndex: getCurrentTierIndex(completedReferrals),
  };

  const currentTierIndex = getCurrentTierIndex(completedReferrals);
  const currentRewardTier = currentTierIndex >= 0 ? REWARD_TIERS[currentTierIndex] : null;
  const nextRewardTier = REWARD_TIERS[currentTierIndex + 1] || null;

  const value: ReferralContextType = {
    referralCode: referralData?.referralCode || '',
    referrals: referralData?.referrals || [],
    stats,
    loading,
    initialized,
    isPremiumFromReferrals: daysRemaining > 0,
    premiumEndDate: referralData?.premiumEndDate || null,
    currentRewardTier,
    nextRewardTier,
    unlockedTiers: getUnlockedTiers(completedReferrals),
    lockedTiers: getLockedTiers(completedReferrals),
    initializeReferral,
    applyReferralCode,
    addReferral,
    completeReferral,
    claimReward,
    refreshReferrals,
    generateShareMessage,
  };

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
}

// Helper function to calculate end date
function calculateEndDate(currentEndDate: string | null, daysToAdd: number): string {
  const baseDate = currentEndDate ? new Date(currentEndDate) : new Date();
  const now = new Date();

  // If current end date is in the past, start from now
  if (baseDate < now) {
    baseDate.setTime(now.getTime());
  }

  baseDate.setDate(baseDate.getDate() + daysToAdd);
  return baseDate.toISOString();
}

export function useReferral() {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return context;
}
