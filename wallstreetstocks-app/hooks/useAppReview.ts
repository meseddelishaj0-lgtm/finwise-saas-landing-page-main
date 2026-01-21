import { useCallback, useEffect, useRef } from 'react';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

const REVIEW_STORAGE_KEY = '@app_review_data';

interface ReviewData {
  appOpens: number;
  lastPromptDate: string | null;
  hasRated: boolean;
  firstOpenDate: string;
  meaningfulActions: number; // tracks stocks viewed, watchlist adds, etc.
}

const DEFAULT_REVIEW_DATA: ReviewData = {
  appOpens: 0,
  lastPromptDate: null,
  hasRated: false,
  firstOpenDate: new Date().toISOString(),
  meaningfulActions: 0,
};

// Configuration - adjust these to control when prompt appears
const CONFIG = {
  MIN_APP_OPENS: 5,           // Minimum app opens before prompting
  MIN_DAYS_INSTALLED: 3,      // Minimum days since first open
  MIN_ACTIONS: 10,            // Minimum meaningful actions (view stock, add to watchlist)
  DAYS_BETWEEN_PROMPTS: 60,   // Don't prompt again for 60 days if dismissed
};

/**
 * Hook to manage app review prompts
 * Shows native review dialog after user has engaged with the app
 */
export function useAppReview() {
  const reviewDataRef = useRef<ReviewData | null>(null);
  const hasCheckedThisSession = useRef(false);

  // Load review data from storage
  const loadReviewData = useCallback(async (): Promise<ReviewData> => {
    try {
      const stored = await AsyncStorage.getItem(REVIEW_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.log('Error loading review data:', error);
    }
    return { ...DEFAULT_REVIEW_DATA, firstOpenDate: new Date().toISOString() };
  }, []);

  // Save review data to storage
  const saveReviewData = useCallback(async (data: ReviewData) => {
    try {
      await AsyncStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(data));
      reviewDataRef.current = data;
    } catch (error) {
      console.log('Error saving review data:', error);
    }
  }, []);

  // Check if we should show the review prompt
  const shouldShowReviewPrompt = useCallback((data: ReviewData): boolean => {
    // Already rated? Don't show again
    if (data.hasRated) return false;

    // Check minimum app opens
    if (data.appOpens < CONFIG.MIN_APP_OPENS) return false;

    // Check minimum meaningful actions
    if (data.meaningfulActions < CONFIG.MIN_ACTIONS) return false;

    // Check minimum days installed
    const firstOpen = new Date(data.firstOpenDate);
    const daysSinceInstall = (Date.now() - firstOpen.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceInstall < CONFIG.MIN_DAYS_INSTALLED) return false;

    // Check if we prompted recently
    if (data.lastPromptDate) {
      const lastPrompt = new Date(data.lastPromptDate);
      const daysSincePrompt = (Date.now() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePrompt < CONFIG.DAYS_BETWEEN_PROMPTS) return false;
    }

    return true;
  }, []);

  // Request review from user
  const requestReview = useCallback(async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) {
        console.log('Store review not available on this device');
        return false;
      }

      // Update last prompt date before showing
      if (reviewDataRef.current) {
        const updatedData = {
          ...reviewDataRef.current,
          lastPromptDate: new Date().toISOString(),
        };
        await saveReviewData(updatedData);
      }

      // Show the native review dialog
      await StoreReview.requestReview();
      
      // Mark as rated (we can't know if they actually rated, but we assume they did)
      // This prevents showing the prompt too frequently
      if (reviewDataRef.current) {
        const updatedData = {
          ...reviewDataRef.current,
          hasRated: true,
        };
        await saveReviewData(updatedData);
      }

      return true;
    } catch (error) {
      console.log('Error requesting review:', error);
      return false;
    }
  }, [saveReviewData]);

  // Track a meaningful action (call this when user does something valuable)
  const trackAction = useCallback(async () => {
    const data = reviewDataRef.current || await loadReviewData();
    const updatedData = {
      ...data,
      meaningfulActions: data.meaningfulActions + 1,
    };
    await saveReviewData(updatedData);
  }, [loadReviewData, saveReviewData]);

  // Check and potentially show review prompt
  const checkAndPromptReview = useCallback(async () => {
    if (hasCheckedThisSession.current) return;
    hasCheckedThisSession.current = true;

    const data = reviewDataRef.current || await loadReviewData();
    
    if (shouldShowReviewPrompt(data)) {
      // Small delay to not interrupt user immediately
      setTimeout(() => {
        requestReview();
      }, 2000);
    }
  }, [loadReviewData, shouldShowReviewPrompt, requestReview]);

  // Initialize on mount - increment app opens
  useEffect(() => {
    const init = async () => {
      const data = await loadReviewData();
      const updatedData = {
        ...data,
        appOpens: data.appOpens + 1,
      };
      await saveReviewData(updatedData);
    };
    init();
  }, [loadReviewData, saveReviewData]);

  // Check for review when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Reset session check when app becomes active again
        hasCheckedThisSession.current = false;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  return {
    trackAction,           // Call when user does something meaningful
    checkAndPromptReview,  // Call after a positive experience
    requestReview,         // Force show review (for settings/manual trigger)
  };
}

/**
 * Track meaningful actions throughout the app:
 * - Viewing a stock detail page
 * - Adding to watchlist
 * - Viewing portfolio
 * - Using AI tools
 * - Completing a trade (if applicable)
 */
