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
      const url = `${API_BASE_URL}/api/user/profile?userId=${authUser.id}`;
      console.log('🔵 UserProfileContext: Fetching from:', url);
      
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log('🔵 UserProfileContext: Profile loaded:', data.name, '@' + data.username);
        setProfile(data);
      } else {
        console.error('🔴 UserProfileContext: Failed to fetch profile:', response.status);
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('🔴 UserProfileContext: Error fetching profile:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [authUser?.id, authLoading]);

  // Fetch profile when auth user changes or auth finishes loading
  useEffect(() => {
    if (!authLoading && authUser?.id) {
      fetchProfile();
    } else if (!authLoading && !authUser?.id) {
      setProfile(null);
    }
  }, [authUser?.id, authLoading, fetchProfile]);

  // Get display name (like StockTwits - custom name > username > never email)
  const getDisplayName = useCallback((): string => {
    if (!profile) return 'User';

    // If user has set a custom name (not the email prefix), show it
    if (profile.name) {
      const emailPrefix = profile.email?.split('@')[0] || '';
      if (profile.name !== emailPrefix && !profile.name.includes('@')) {
        return profile.name;
      }
    }

    // Fall back to username
    if (profile.username) return profile.username;

    // Never show email - use generic
    return 'User';
  }, [profile]);

  // Get username (the @handle)
  const getUsername = useCallback((): string => {
    if (!profile) return 'user';
    if (profile.username) return profile.username;
    // Generate from user id if no username
    if (profile.id) return `user${profile.id}`;
    return 'user';
  }, [profile]);

  // Get @handle format
  const getHandle = useCallback((): string => {
    return '@' + getUsername();
  }, [getUsername]);

  // Get avatar URL
  const getAvatar = useCallback((): string | null => {
    return profile?.profileImage || null;
  }, [profile]);

  const value: UserProfileContextType = {
    profile,
    loading,
    error,
    refreshProfile: fetchProfile,
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

// Helper function for components that receive a user object (for other users, not current user)
export function getUserDisplayName(user: { name?: string | null; username?: string | null; email?: string; id?: number } | null | undefined): string {
  if (!user) return 'Anonymous';

  // If user has a custom name (not email prefix), show it
  if (user.name) {
    const emailPrefix = user.email?.split('@')[0] || '';
    if (user.name !== emailPrefix && !user.name.includes('@')) {
      return user.name;
    }
  }

  // Fall back to username
  if (user.username) return user.username;

  // Never show email
  return 'User';
}

export function getUserHandle(user: { username?: string | null; id?: number } | null | undefined): string {
  if (!user) return 'user';
  if (user.username) return user.username;
  if (user.id) return `user${user.id}`;
  return 'user';
}
