// context/UserProfileContext.tsx
// Global user profile context - like StockTwits/Reddit, stores user's display name and username
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';

const API_BASE_URL = 'https://www.wallstreetstocks.ai';

export interface UserProfileData {
  id: number;
  name: string | null;
  email: string;
  username: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  subscriptionTier: string | null;
  createdAt: string;
  _count?: {
    posts: number;
    followers: number;
    following: number;
    likes: number;
  };
}

interface UserProfileContextType {
  profile: UserProfileData | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfileData>) => void;
  getDisplayName: () => string;
  getUsername: () => string;
  getHandle: () => string;
  getAvatar: () => string | null;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    console.log('🔵 UserProfileContext: authUser =', authUser, 'authLoading =', authLoading);

    if (authLoading) {
      console.log('🔵 UserProfileContext: Auth still loading, waiting...');
      return;
    }

    if (!authUser?.id) {
      console.log('🔵 UserProfileContext: No authUser.id, skipping fetch');
      setProfile(null);
      return;
    }

    console.log('🔵 UserProfileContext: Fetching profile for userId:', authUser.id);
    setLoading(true);
    setError(null);

    try {
      // Use the /api/user/:id endpoint which returns fresh data
      // The /api/user/profile endpoint was returning stale/cached data
      const timestamp = Date.now();
      const url = `${API_BASE_URL}/api/user/${authUser.id}?_t=${timestamp}`;
      console.log('🔵 UserProfileContext: Fetching from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔵 UserProfileContext: API returned:', data.name, '@' + data.username);
        console.log('🔵 UserProfileContext: Auth has:', authUser.name, '@' + authUser.username);

        // IMPORTANT: Use Auth context data as source of truth for profile fields
        // Auth context is persisted locally and has the freshest data after profile updates
        // API may return stale data due to Neon read replica lag
        const mergedProfile = {
          ...data,
          // Override with Auth data if available (Auth is the source of truth)
          name: authUser.name || data.name,
          username: authUser.username || data.username,
          bio: authUser.bio || data.bio,
          location: (authUser as any).location || data.location,
          website: (authUser as any).website || data.website,
          profileImage: authUser.profileImage || data.profileImage,
          bannerImage: (authUser as any).bannerImage || data.bannerImage,
        };

        console.log('🔵 UserProfileContext: Using merged profile:', mergedProfile.name, '@' + mergedProfile.username);
        setProfile(mergedProfile);
      } else {
        console.error('🔴 UserProfileContext: Failed to fetch profile:', response.status);
        // Fallback to Auth data if API fails
        if (authUser) {
          setProfile({
            id: Number(authUser.id),
            name: authUser.name || null,
            email: authUser.email,
            username: authUser.username || null,
            bio: authUser.bio || null,
            location: (authUser as any).location || null,
            website: (authUser as any).website || null,
            profileImage: authUser.profileImage || null,
            bannerImage: (authUser as any).bannerImage || null,
            subscriptionTier: null,
            createdAt: '',
          });
        }
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('🔴 UserProfileContext: Error fetching profile:', err);
      // Fallback to Auth data on network error
      if (authUser) {
        setProfile({
          id: Number(authUser.id),
          name: authUser.name || null,
          email: authUser.email,
          username: authUser.username || null,
          bio: authUser.bio || null,
          location: (authUser as any).location || null,
          website: (authUser as any).website || null,
          profileImage: authUser.profileImage || null,
          bannerImage: (authUser as any).bannerImage || null,
          subscriptionTier: null,
          createdAt: '',
        });
      }
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [authUser?.id, authUser?.name, authUser?.username, authUser?.bio, authUser?.profileImage, (authUser as any)?.location, (authUser as any)?.website, (authUser as any)?.bannerImage, authLoading]);

  // Fetch profile when auth changes or auth finishes loading
  // Auth data is merged into profile as source of truth (avoids Neon replica lag)
  useEffect(() => {
    if (!authLoading && authUser?.id) {
      fetchProfile();
    } else if (!authLoading && !authUser?.id) {
      setProfile(null);
    }
  }, [authLoading, fetchProfile]);

  // Helper to check if a string looks like an auto-generated/email name
  const isAutoGeneratedName = useCallback((name: string | null, email?: string): boolean => {
    if (!name) return true;
    const emailPrefix = email?.split('@')[0] || '';
    if (name === emailPrefix) return true;
    if (name.includes('@')) return true;
    if (/^\d+$/.test(name)) return true;

    // Check if it looks like Apple relay ID (random alphanumeric with very few vowels)
    // Real names have multiple vowels - Apple IDs like "6vc4gd4xx5" have few/none
    // BUT: Only apply this check to ALL LOWERCASE names (auto-generated IDs are lowercase)
    // Names with proper capitalization (like "Johnyyyyy") are user-set, so trust them
    if (/^[a-z0-9]{8,}$/.test(name)) { // Note: removed 'i' flag - only match lowercase
      const vowelCount = (name.match(/[aeiou]/g) || []).length;
      const vowelRatio = vowelCount / name.length;
      // If less than 20% vowels AND all lowercase, likely auto-generated
      if (vowelRatio < 0.2) return true;
    }
    return false;
  }, []);

  // Get display name - Priority: name > username > "Trader"
  // Never show: email, email prefix, or auto-generated Apple IDs
  const getDisplayName = useCallback((): string => {
    if (!profile) return 'User';

    // Priority 1: Custom name (user's display name like "Sedi")
    if (profile.name && !isAutoGeneratedName(profile.name, profile.email)) {
      return profile.name;
    }

    // Priority 2: Username as fallback (like "sedidelishaj")
    if (profile.username && !isAutoGeneratedName(profile.username, profile.email)) {
      return profile.username;
    }

    // Priority 3: Username even if generated (better than nothing)
    if (profile.username) return profile.username;

    // Last resort - generic name
    return 'Trader';
  }, [profile, isAutoGeneratedName]);

  // Get username (the @handle)
  const getUsername = useCallback((): string => {
    if (!profile) return 'user';

    // Use username if available and not auto-generated
    if (profile.username && !isAutoGeneratedName(profile.username, profile.email)) {
      return profile.username;
    }

    // Use custom name as handle if available
    if (profile.name && !isAutoGeneratedName(profile.name, profile.email)) {
      return profile.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
    }

    // Generate friendly handle from user ID
    return `trader${profile.id}`;
  }, [profile, isAutoGeneratedName]);

  // Get @handle format
  const getHandle = useCallback((): string => {
    return '@' + getUsername();
  }, [getUsername]);

  // Get avatar URL
  const getAvatar = useCallback((): string | null => {
    return profile?.profileImage || null;
  }, [profile]);

  // Update profile directly without re-fetching (to avoid read replica lag)
  const updateProfile = useCallback((data: Partial<UserProfileData>) => {
    console.log('🔵 UserProfileContext: Updating profile directly:', data);
    setProfile(prev => prev ? { ...prev, ...data } : null);
  }, []);

  const value: UserProfileContextType = {
    profile,
    loading,
    error,
    refreshProfile: fetchProfile,
    updateProfile,
    getDisplayName,
    getUsername,
    getHandle,
    getAvatar,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}

// Helper to check if name looks auto-generated (for standalone use)
function isAutoGenerated(name: string | null | undefined, email?: string): boolean {
  if (!name) return true;
  const emailPrefix = email?.split('@')[0] || '';
  if (name === emailPrefix) return true;
  if (name.includes('@')) return true;
  if (/^\d+$/.test(name)) return true;

  // Check if it looks like Apple relay ID (random alphanumeric with very few vowels)
  // Real names have multiple vowels - Apple IDs like "6vc4gd4xx5" have few/none
  // BUT: Only apply this check to ALL LOWERCASE names (auto-generated IDs are lowercase)
  // Names with proper capitalization (like "Johnyyyyy") are user-set, so trust them
  if (/^[a-z0-9]{8,}$/.test(name)) { // Note: removed 'i' flag - only match lowercase
    const vowelCount = (name.match(/[aeiou]/g) || []).length;
    const vowelRatio = vowelCount / name.length;
    // If less than 20% vowels AND all lowercase, likely auto-generated
    if (vowelRatio < 0.2) return true;
  }
  return false;
}

// Helper function for components that receive a user object (for other users, not current user)
export function getUserDisplayName(user: { name?: string | null; username?: string | null; email?: string; id?: number } | null | undefined): string {
  if (!user) return 'Anonymous';

  // Priority 1: Custom name (user's display name like "Sedi")
  if (user.name && !isAutoGenerated(user.name, user.email)) {
    return user.name;
  }

  // Priority 2: Username as fallback (like "sedidelishaj")
  if (user.username && !isAutoGenerated(user.username, user.email)) {
    return user.username;
  }

  // Priority 3: Username even if generated
  if (user.username) return user.username;

  // Never show email - use generic
  return 'Trader';
}

export function getUserHandle(user: { username?: string | null; name?: string | null; email?: string; id?: number } | null | undefined): string {
  if (!user) return 'user';

  // Use username if available and not auto-generated
  if (user.username && !isAutoGenerated(user.username, user.email)) {
    return user.username;
  }

  // Use custom name as handle if available
  if (user.name && !isAutoGenerated(user.name, user.email)) {
    return user.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
  }

  // Generate friendly handle from user ID
  if (user.id) return `trader${user.id}`;
  return 'user';
}
