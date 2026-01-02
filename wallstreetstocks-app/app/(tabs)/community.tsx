// app/(tabs)/community.tsx - Optimized with expo-image for caching
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/lib/auth';
import { useUserProfile } from '@/context/UserProfileContext';
import FormattedContent from '@/components/FormattedContent';
import TrendingTickers from '@/components/TrendingTickers';
import { PremiumFeatureCard, FEATURE_TIERS } from '@/components/PremiumFeatureGate';
import { SubscriptionBadgeInline } from '@/components/SubscriptionBadge';
import { usePremiumFeature } from '@/hooks/usePremiumFeature';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ===== DIRECT API CALLS =====
const API_BASE = 'https://www.wallstreetstocks.ai';

const fetchPosts = async (forumSlug?: string, currentUserId?: number): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    if (forumSlug) params.append('forum', forumSlug);
    if (currentUserId) params.append('currentUserId', currentUserId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE}/api/posts${query}`);
    if (!response.ok) throw new Error('Failed to fetch posts');
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ fetchPosts error:', error);
    return [];
  }
};

const createPost = async (data: { title: string; content: string; forumId: number; userId: number; mediaUrl?: string }): Promise<any> => {
  const response = await fetch(`${API_BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create post');
  }
  return response.json();
};

const searchPosts = async (query: string, ticker?: string): Promise<any[]> => {
  try {
    let url = `${API_BASE}/api/posts/search?q=${encodeURIComponent(query)}`;
    if (ticker) url += `&ticker=${encodeURIComponent(ticker)}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ searchPosts error:', error);
    return [];
  }
};

const fetchComments = async (postId: string | number, userId?: number): Promise<any[]> => {
  try {
    let url = `${API_BASE}/api/comments?postId=${postId}`;
    if (userId) url += `&userId=${userId}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ fetchComments error:', error);
    return [];
  }
};

const createComment = async (postId: string | number, content: string, userId: number): Promise<any> => {
  const response = await fetch(`${API_BASE}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId: Number(postId), content, userId }),
  });
  if (!response.ok) throw new Error('Failed to create comment');
  return response.json();
};

const likePost = async (postId: string, userId: number): Promise<{ liked: boolean; likesCount?: number }> => {
  try {
    const response = await fetch(`${API_BASE}/api/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: Number(postId), userId }),
    });
    if (!response.ok) throw new Error('Failed to like post');
    const result = await response.json();
    return { liked: result?.liked ?? true, likesCount: result?.likesCount };
  } catch (error) {
    console.error('❌ likePost error:', error);
    throw error;
  }
};

const likeComment = async (commentId: string, userId: number): Promise<{ liked: boolean; likesCount?: number }> => {
  try {
    const response = await fetch(`${API_BASE}/api/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: Number(commentId), userId }),
    });
    if (!response.ok) throw new Error('Failed to like comment');
    const result = await response.json();
    return { liked: result?.liked ?? true, likesCount: result?.likesCount };
  } catch (error) {
    console.error('❌ likeComment error:', error);
    throw error;
  }
};

const fetchNotifications = async (userId: number): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/notifications?userId=${userId}`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ fetchNotifications error:', error);
    return [];
  }
};

const markAllNotificationsRead = async (userId: number): Promise<void> => {
  await fetch(`${API_BASE}/api/notifications/read-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
};

const uploadImage = async (imageUri: string): Promise<{ url: string }> => {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  formData.append('file', { uri: imageUri, name: filename, type } as any);

  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload image');
  const result = await response.json();
  return { url: result.url };
};

const getCurrentUser = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/api/auth/session`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    return null;
  }
};

const voteSentiment = async (userId: number, postId: number, type: 'bullish' | 'bearish'): Promise<any> => {
  const response = await fetch(`${API_BASE}/api/sentiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, postId, type }),
  });
  if (!response.ok) throw new Error('Failed to vote');
  return response.json();
};

const addToWatchlist = async (userId: number, ticker: string): Promise<void> => {
  await fetch(`${API_BASE}/api/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ticker }),
  });
};

const blockUser = async (blockerId: number, blockedId: number): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/community/social/${blockedId}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockerId }),
  });
  return { success: response.ok };
};

const muteUser = async (muterId: number, mutedId: number): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/community/social/${mutedId}/mute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ muterId }),
  });
  return { success: response.ok };
};

const reportUser = async (reporterId: number, reportedId: number, reason: string, postId?: number, commentId?: number): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/community/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reporterId, reportedId, reason, postId, commentId }),
  });
  return { success: response.ok };
};

const fetchSuggestedUsersApi = async (userId?: number): Promise<any[]> => {
  try {
    const url = userId
      ? `${API_BASE}/api/user/suggested?userId=${userId}`
      : `${API_BASE}/api/user/suggested`;
    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ fetchSuggestedUsersApi error:', error);
    return [];
  }
};

const followUserApi = async (followerId: number, followingId: number): Promise<{ success: boolean; action: string; isFollowing: boolean }> => {
  try {
    const response = await fetch(`${API_BASE}/api/follows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followerId, followingId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to follow user');
    }
    const result = await response.json();
    return {
      success: true,
      action: result.action || 'followed',
      isFollowing: result.isFollowing ?? true,
    };
  } catch (error) {
    console.error('❌ followUserApi error:', error);
    throw error;
  }
};

// ===== END DIRECT API CALLS =====

// Avatar color palette
const AVATAR_COLORS = [
  '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a',
  '#a8edea', '#ff9a9e', '#ffecd2', '#a18cd1', '#ff8177',
];

// Types
interface User {
  id: number;
  name: string | null;
  email: string;
  username?: string | null;
  image?: string | null;
  profileImage?: string | null;
  subscriptionTier?: string | null;
}

// Helper to check if a string looks like an auto-generated/email name
const isAutoGeneratedName = (name: string, email?: string): boolean => {
  if (!name) return true;
  // Check if name matches email prefix
  const emailPrefix = email?.split('@')[0] || '';
  if (name === emailPrefix) return true;
  // Check if name contains @ (is an email)
  if (name.includes('@')) return true;
  // Check if it's just numbers
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
};

// Helper function to get display name (like StockTwits)
// Priority: 1. Custom name, 2. Username, 3. Generic "Trader"
// Never show: email, email prefix, or auto-generated Apple IDs
const getDisplayName = (user: User | null | undefined): string => {
  if (!user) return 'Anonymous';

  // Priority 1: Custom name (user's display name like "Sedi")
  if (user.name && !isAutoGeneratedName(user.name, user.email)) {
    return user.name;
  }

  // Priority 2: Username as fallback (like "sedidelishaj")
  if (user.username && !isAutoGeneratedName(user.username, user.email)) {
    return user.username;
  }

  // Priority 3: Username even if it looks generated (better than nothing)
  if (user.username) return user.username;

  // Last resort - generic name, never show email-derived values
  return 'Trader';
};

// Helper function to get @handle (like StockTwits)
// Shows: username if set, otherwise generate friendly handle from id
const getHandle = (user: User | null | undefined): string => {
  if (!user) return 'user';

  // Use username if available and not auto-generated
  if (user.username && !isAutoGeneratedName(user.username, user.email)) {
    return user.username;
  }

  // Use custom name as handle if available
  if (user.name && !isAutoGeneratedName(user.name, user.email)) {
    return user.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
  }

  // Generate friendly handle from user ID
  if (user.id) return `trader${user.id}`;
  return 'user';
};

interface UserProfile extends User {
  bio?: string;
  createdAt?: string;
  subscriptionTier?: string | null;
  _count?: {
    posts: number;
    followers: number;
    following: number;
  };
  isFollowing?: boolean;
}

interface SuggestedUser extends User {
  bio?: string;
  _count?: {
    followers: number;
    posts: number;
  };
  isFollowing?: boolean;
}

interface Post {
  id: number;
  title?: string;
  content: string;
  mediaUrl?: string;
  image?: string;
  ticker?: string;
  tickers?: string[];
  createdAt: string;
  user: User & { karma?: number; isVerified?: boolean };
  userId: number;
  forum?: {
    id: number;
    title: string;
    slug: string;
  };
  forumId?: number;
  _count?: {
    comments: number;
    likes: number;
  };
  isLiked?: boolean;
  sentiment?: {
    bullish: number;
    bearish: number;
    total: number;
    userVote: 'bullish' | 'bearish' | null;
  };
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: User;
  _count?: {
    likes: number;
  };
  isLiked?: boolean;
}

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'mention';
  fromUser: User;
  post?: { id: number; title: string };
  isRead: boolean;
  message?: string;
  createdAt: string;
}

export default function CommunityPage() {
  const navRouter = useRouter();
  const searchParams = useLocalSearchParams<{ openPostId?: string; openUserId?: string }>();
  const { user: authUser } = useAuth();
  const { profile: userProfile, getDisplayName: getContextDisplayName } = useUserProfile();
  const { canAccess, withPremiumAccess, isPremium } = usePremiumFeature();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Suggested Users State
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [dismissedUsers, setDismissedUsers] = useState<number[]>([]);
  // Track local follow changes to preserve optimistic updates across re-fetches
  const [localFollowChanges, setLocalFollowChanges] = useState<Map<number, boolean>>(new Map());
  
  // Modals
  const [createPostModal, setCreatePostModal] = useState(false);
  const [commentsModal, setCommentsModal] = useState(false);
  const [notificationsModal, setNotificationsModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [imageViewerModal, setImageViewerModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [postOptionsModal, setPostOptionsModal] = useState(false);
  const [selectedPostForOptions, setSelectedPostForOptions] = useState<Post | null>(null);
  const [commentOptionsModal, setCommentOptionsModal] = useState(false);
  const [selectedCommentForOptions, setSelectedCommentForOptions] = useState<Comment | null>(null);
  const [hiddenPosts, setHiddenPosts] = useState<number[]>([]);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postInsights, setPostInsights] = useState<{ totalViews: number; uniqueViewers: number } | null>(null);
  
  // Profile State
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Create Post State
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTicker, setNewPostTicker] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Comment State
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // userProfile now comes from UserProfileContext

  // Helper functions
  const getAvatarColor = (userId: number): string => {
    return AVATAR_COLORS[userId % AVATAR_COLORS.length];
  };

  const getUserInitials = (user: User | null | undefined): string => {
    if (!user) return '?';
    // Prioritize username or custom name over email
    const displayName = getDisplayName(user);
    const parts = displayName.split(/[\s]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  };

  const getUserId = useCallback((): number | null => {
    if (authUser?.id) return Number(authUser.id);
    if (currentUser?.id) return Number(currentUser.id);
    return null;
  }, [authUser?.id, currentUser?.id]);

  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      
      if (seconds < 60) return 'Just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const formatJoinDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Suggested Users functions
  const fetchSuggestedUsers = useCallback(async () => {
    setSuggestedLoading(true);
    try {
      const userId = getUserId();
      console.log('👥 Fetching suggested users for userId:', userId);

      const users = await fetchSuggestedUsersApi(userId || undefined);
      console.log('👥 Suggested users:', users.map((u: any) => ({
        id: u.id,
        name: u.name,
        followers: u._count?.followers,
        isFollowing: u.isFollowing
      })));

      if (users.length > 0) {
        // Merge with local follow changes to preserve optimistic updates
        const mergedUsers = users.map((user: any) => {
          const localChange = localFollowChanges.get(user.id);
          if (localChange !== undefined) {
            console.log(`👥 Preserving local follow state for user ${user.id}: ${localChange}`);
            return { ...user, isFollowing: localChange };
          }
          return user;
        });
        setSuggestedUsers(mergedUsers);
      } else {
        // Fallback: get active users from posts
        const uniqueUsers = posts
          .map(p => p.user)
          .filter((user, index, self) =>
            user &&
            user.id !== getUserId() &&
            self.findIndex(u => u?.id === user.id) === index
          )
          .slice(0, 10) as SuggestedUser[];
        setSuggestedUsers(uniqueUsers);
      }
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      // Fallback to users from posts
      const uniqueUsers = posts
        .map(p => p.user)
        .filter((user, index, self) =>
          user &&
          user.id !== getUserId() &&
          self.findIndex(u => u?.id === user.id) === index
        )
        .slice(0, 10) as SuggestedUser[];
      setSuggestedUsers(uniqueUsers);
    } finally {
      setSuggestedLoading(false);
    }
  }, [posts, getUserId, localFollowChanges]);

  const handleQuickFollow = async (targetUserId: number) => {
    const userId = getUserId();
    if (!userId) {
      Alert.alert('Error', 'Please log in to follow users');
      return;
    }

    if (userId === targetUserId) {
      return;
    }

    // Find the user and check current state
    const targetUser = suggestedUsers.find(u => u.id === targetUserId);
    const wasFollowing = targetUser?.isFollowing || false;
    const newFollowState = !wasFollowing;

    console.log('👤 Quick follow:', { userId, targetUserId, wasFollowing, newFollowState });

    // Track local change to preserve across re-fetches (prevents Neon replica lag issues)
    setLocalFollowChanges(prev => new Map(prev).set(targetUserId, newFollowState));

    // Optimistic update - toggle the follow state
    setSuggestedUsers(prev =>
      prev.map(user =>
        user.id === targetUserId
          ? {
              ...user,
              isFollowing: newFollowState,
              _count: {
                ...user._count,
                followers: wasFollowing
                  ? Math.max(0, (user._count?.followers || 0) - 1)
                  : (user._count?.followers || 0) + 1,
                posts: user._count?.posts || 0,
              }
            }
          : user
      )
    );

    try {
      const result = await followUserApi(userId, targetUserId);
      console.log('👤 Follow response:', result);

      // Don't update from server response - trust local state (server may return stale data from replica)
      // The local follow change is tracked and will persist across re-fetches
    } catch (error) {
      console.error('❌ Error following user:', error);
      // Revert local change tracking
      setLocalFollowChanges(prev => {
        const newMap = new Map(prev);
        newMap.delete(targetUserId);
        return newMap;
      });
      // Revert UI
      setSuggestedUsers(prev =>
        prev.map(user =>
          user.id === targetUserId
            ? {
                ...user,
                isFollowing: wasFollowing,
                _count: {
                  ...user._count,
                  followers: wasFollowing
                    ? (user._count?.followers || 0) + 1
                    : Math.max(0, (user._count?.followers || 0) - 1),
                  posts: user._count?.posts || 0,
                }
              }
            : user
        )
      );
    }
  };

  const handleDismissSuggested = (userId: number) => {
    setDismissedUsers(prev => [...prev, userId]);
  };

  const getVisibleSuggestedUsers = () => {
    return suggestedUsers.filter(user => !dismissedUsers.includes(user.id));
  };

  const visibleSuggestedUsers = getVisibleSuggestedUsers();

  // Profile functions
  const handleOpenProfile = async (user: User) => {
    if (!user?.id) return;

    const currentUserId = getUserId();
    const isOwnProfile = user.id === currentUserId;

    // Capture the passed-in user's follow state (from optimistic updates in suggestedUsers)
    // This is more reliable than the Map which might have stale closure reference
    const passedInFollowState = (user as any).isFollowing;
    const passedInFollowerCount = (user as any)._count?.followers;

    console.log('🔵 Opening profile for user:', user.id, 'passed data:', user.name, '@' + user.username, 'isOwnProfile:', isOwnProfile, 'passedInFollowState:', passedInFollowState);

    // For own profile, use UserProfileContext data (avoids replica lag)
    if (isOwnProfile && userProfile) {
      console.log('🔵 Using local profile data (own profile):', userProfile.name, '@' + userProfile.username);
      setSelectedProfile({
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email || '',
        username: userProfile.username,
        profileImage: userProfile.profileImage,
        bio: userProfile.bio,
        location: userProfile.location,
        website: userProfile.website,
        bannerImage: userProfile.bannerImage,
        subscriptionTier: userProfile.subscriptionTier,
        _count: userProfile._count || { posts: 0, followers: 0, following: 0 },
      });
      setProfileModal(true);
      setProfileLoading(true);

      // Only fetch posts for own profile
      try {
        const postsResponse = await fetch(
          `https://www.wallstreetstocks.ai/api/posts?userId=${user.id}`
        );
        if (postsResponse.ok) {
          const userPosts = await postsResponse.json();
          setProfilePosts(userPosts || []);
        } else {
          const userPosts = posts.filter(p => p.userId === user.id || p.user?.id === user.id);
          setProfilePosts(userPosts);
        }
      } catch (error) {
        const userPosts = posts.filter(p => p.userId === user.id || p.user?.id === user.id);
        setProfilePosts(userPosts);
      } finally {
        setProfileLoading(false);
      }
      return;
    }

    // For other users, fetch fresh data from API (don't use passed-in data which may be stale)
    setSelectedProfile(null); // Clear any old data
    setProfileModal(true);
    setProfileLoading(true);

    try {
      // Use /api/user/:id endpoint which returns fresh data via raw SQL
      const apiUrl = `https://www.wallstreetstocks.ai/api/user/${user.id}?currentUserId=${currentUserId}&t=${Date.now()}`;
      console.log('🔵 Fetching fresh profile from:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (response.ok) {
        const profileData = await response.json();
        console.log('🔵 Fresh profile data received:', {
          name: profileData.name,
          username: profileData.username,
          id: profileData.id,
          isFollowing: profileData.isFollowing,
          followers: profileData._count?.followers,
        });

        // Use passed-in follow state from optimistic updates (more reliable than Map)
        // This preserves the UI state from suggestedUsers list
        if (passedInFollowState !== undefined && passedInFollowState !== profileData.isFollowing) {
          console.log('🔵 Applying passed-in follow state:', passedInFollowState, 'API had:', profileData.isFollowing);
          const followerDiff = passedInFollowState ? 1 : -1;
          setSelectedProfile({
            ...profileData,
            isFollowing: passedInFollowState,
            _count: {
              ...profileData._count,
              followers: Math.max(0, (profileData._count?.followers || 0) + followerDiff),
            },
          });
        } else if (passedInFollowerCount !== undefined && passedInFollowerCount !== profileData._count?.followers) {
          // Follower count was optimistically updated
          console.log('🔵 Applying passed-in follower count:', passedInFollowerCount, 'API had:', profileData._count?.followers);
          setSelectedProfile({
            ...profileData,
            isFollowing: passedInFollowState ?? profileData.isFollowing,
            _count: {
              ...profileData._count,
              followers: passedInFollowerCount,
            },
          });
        } else {
          setSelectedProfile(profileData);
        }
      } else {
        console.log('🔴 Profile fetch failed with status:', response.status);
        // Fallback to the passed user data only if API fails
        setSelectedProfile({
          ...user,
          _count: { posts: 0, followers: 0, following: 0 },
        });
      }

      // Fetch user's posts
      const postsResponse = await fetch(
        `https://www.wallstreetstocks.ai/api/posts?userId=${user.id}`
      );

      if (postsResponse.ok) {
        const userPosts = await postsResponse.json();
        setProfilePosts(userPosts || []);
      } else {
        // Fallback: filter posts from the current posts list
        const userPosts = posts.filter(p => p.userId === user.id || p.user?.id === user.id);
        setProfilePosts(userPosts);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback: use passed user data
      setSelectedProfile({
        ...user,
        _count: { posts: 0, followers: 0, following: 0 },
      });
      const userPosts = posts.filter(p => p.userId === user.id || p.user?.id === user.id);
      setProfilePosts(userPosts);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleFollowUser = async () => {
    if (!selectedProfile?.id) return;

    const userId = getUserId();
    if (!userId) {
      Alert.alert('Error', 'Please log in to follow users');
      return;
    }

    if (userId === selectedProfile.id) {
      return; // Can't follow yourself
    }

    setFollowLoading(true);
    const wasFollowing = selectedProfile.isFollowing;
    const newFollowState = !wasFollowing;

    // Track local change to preserve across re-fetches (prevents Neon replica lag issues)
    setLocalFollowChanges(prev => new Map(prev).set(selectedProfile.id, newFollowState));

    // Optimistic update
    setSelectedProfile(prev => prev ? {
      ...prev,
      isFollowing: newFollowState,
      _count: {
        ...prev._count!,
        followers: wasFollowing
          ? Math.max(0, (prev._count?.followers || 0) - 1)
          : (prev._count?.followers || 0) + 1,
      }
    } : null);

    // Also update in suggested users if present
    setSuggestedUsers(prev =>
      prev.map(user =>
        user.id === selectedProfile.id
          ? {
              ...user,
              isFollowing: newFollowState,
              _count: {
                ...user._count,
                followers: wasFollowing
                  ? Math.max(0, (user._count?.followers || 0) - 1)
                  : (user._count?.followers || 0) + 1,
                posts: user._count?.posts || 0,
              }
            }
          : user
      )
    );

    try {
      const response = await fetch(
        `https://www.wallstreetstocks.ai/api/follows`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followerId: userId, followingId: selectedProfile.id }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to follow user');
      }
    } catch (error) {
      console.error('Error following user:', error);
      // Revert local change tracking
      setLocalFollowChanges(prev => {
        const newMap = new Map(prev);
        newMap.delete(selectedProfile.id);
        return newMap;
      });
      // Revert on error
      setSelectedProfile(prev => prev ? {
        ...prev,
        isFollowing: wasFollowing,
        _count: {
          ...prev._count!,
          followers: wasFollowing
            ? (prev._count?.followers || 0) + 1
            : Math.max(0, (prev._count?.followers || 0) - 1),
        }
      } : null);

      setSuggestedUsers(prev =>
        prev.map(user =>
          user.id === selectedProfile.id
            ? {
                ...user,
                isFollowing: wasFollowing,
                _count: {
                  ...user._count,
                  followers: wasFollowing 
                    ? (user._count?.followers || 0) + 1
                    : Math.max(0, (user._count?.followers || 0) - 1),
                  posts: user._count?.posts || 0,
                }
              }
            : user
        )
      );
    } finally {
      setFollowLoading(false);
    }
  };

  // Data fetching
  const fetchCurrentUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const loadNotifications = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;
    
    try {
      const notifs = await fetchNotifications(userId);
      setNotifications(notifs || []);
      setUnreadCount((notifs || []).filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  }, [getUserId, fetchNotifications]);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(posts.length === 0);
      const userId = getUserId();
      const fetchedPosts = await fetchPosts(undefined, userId || undefined);
      setPosts(fetchedPosts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [posts.length, getUserId, fetchPosts]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const ticker = query.startsWith('$') ? query.substring(1) : undefined;
      const results = await searchPosts(query, ticker);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadComments = async (postId: number) => {
    setCommentsLoading(true);
    try {
      const fetchedComments = await fetchComments(postId.toString());
      setComments(fetchedComments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // State for create post modal user display
  const [modalUserName, setModalUserName] = useState<string>('You');
  const [modalUserProfile, setModalUserProfile] = useState<any>(null);

  // Open create post modal with profile from context (no API call needed)
  const openCreatePostModal = () => {
    console.log('🟡 Opening create post modal');

    // Use the profile from UserProfileContext (already has fresh data)
    // No API call needed - avoids Neon read replica lag issues
    if (userProfile) {
      console.log('🟡 Using context profile:', userProfile.name, '@' + userProfile.username);
      setModalUserProfile(userProfile);
      // Use getContextDisplayName() which already handles all the edge cases
      const displayName = getContextDisplayName();
      console.log('🟡 Setting modalUserName to:', displayName);
      setModalUserName(displayName);
    } else {
      console.log('🟡 No userProfile in context, using default');
      setModalUserName('You');
    }

    // Show modal
    setCreatePostModal(true);
  };

  // Image picker
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewPostImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Create post with image upload
  const handleCreatePost = async () => {
    console.log('📝 handleCreatePost called');
    
    const content = newPostContent.trim();
    if (!content) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    const userId = getUserId();
    console.log('👤 userId:', userId);
    
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to post');
      return;
    }

    setPosting(true);

    try {
      let mediaUrl: string | undefined = undefined;

      // Upload image if selected
      if (newPostImage) {
        console.log('📷 Uploading image...');
        setUploadingImage(true);
        try {
          const uploadResult = await uploadImage(newPostImage);
          console.log('✅ Image uploaded:', uploadResult.url);
          mediaUrl = uploadResult.url;
        } catch (uploadError: any) {
          console.error('❌ Image upload failed:', uploadError?.message);
          Alert.alert('Upload Failed', uploadError?.message || 'Failed to upload image');
          setPosting(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const postData = {
        title: newPostTitle.trim() || content.substring(0, 100),
        content: content,
        forumId: 1,
        userId: userId,
        ...(newPostTicker.trim() && { ticker: newPostTicker.trim().toUpperCase() }),
        ...(mediaUrl && { mediaUrl: mediaUrl }),
      };

      console.log('📤 Creating post:', JSON.stringify(postData));

      const newPost = await createPost(postData);
      console.log('✅ Post created successfully');

      // Close modal only after successful API call
      setCreatePostModal(false);

      // Reset form
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostTicker('');
      setNewPostImage(null);

      // Update posts list
      if (newPost && newPost.id) {
        setPosts(prevPosts => [newPost, ...prevPosts]);
      }

      // Reload posts
      setTimeout(() => loadPosts(), 1000);

    } catch (error: any) {
      console.error('❌ Error creating post:', error?.message || error);
      Alert.alert('Error', error?.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  // Like handlers
  const handleLikePost = async (postId: number) => {
    const userId = getUserId();
    if (!userId) {
      Alert.alert('Error', 'Please log in to like posts');
      return;
    }

    const currentPost = posts.find(p => p.id === postId);
    if (!currentPost) return;

    const newLikedState = !currentPost.isLiked;

    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? {
              ...post,
              isLiked: newLikedState,
              _count: {
                ...(post._count || { likes: 0, comments: 0 }),
                likes: Math.max(0, (post._count?.likes ?? 0) + (newLikedState ? 1 : -1))
              }
            }
          : post
      )
    );

    // Also update in profile posts if viewing profile
    setProfilePosts(prev =>
      prev.map(post =>
        post.id === postId
          ? {
              ...post,
              isLiked: newLikedState,
              _count: {
                ...(post._count || { likes: 0, comments: 0 }),
                likes: Math.max(0, (post._count?.likes ?? 0) + (newLikedState ? 1 : -1))
              }
            }
          : post
      )
    );

    try {
      await likePost(postId.toString(), userId);
    } catch (error: any) {
      console.error('Error liking post:', error);
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? { ...post, isLiked: currentPost.isLiked, _count: currentPost._count }
            : post
        )
      );
      setProfilePosts(prev =>
        prev.map(post =>
          post.id === postId
            ? { ...post, isLiked: currentPost.isLiked, _count: currentPost._count }
            : post
        )
      );
    }
  };

  const handleLikeComment = async (commentId: number) => {
    const userId = getUserId();
    if (!userId) return;

    const currentComment = comments.find(c => c.id === commentId);
    if (!currentComment) return;

    const newLikedState = !currentComment.isLiked;

    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId
          ? {
              ...comment,
              isLiked: newLikedState,
              _count: {
                ...(comment._count || { likes: 0 }),
                likes: Math.max(0, (comment._count?.likes ?? 0) + (newLikedState ? 1 : -1))
              }
            }
          : comment
      )
    );

    try {
      await likeComment(commentId.toString(), userId);
    } catch (error) {
      console.error('Error liking comment:', error);
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { ...comment, isLiked: currentComment.isLiked, _count: currentComment._count }
            : comment
        )
      );
    }
  };

  // Delete post handler
  const handleDeletePost = async (postId: number) => {
    const userId = getUserId();
    if (!userId) {
      Alert.alert('Error', 'Please log in to delete posts');
      return;
    }

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `https://www.wallstreetstocks.ai/api/posts/${postId}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId.toString(),
                  },
                }
              );

              if (response.ok) {
                // Remove from posts list
                setPosts(prev => prev.filter(p => p.id !== postId));
                // Remove from profile posts if viewing profile
                setProfilePosts(prev => prev.filter(p => p.id !== postId));
                Alert.alert('Success', 'Post deleted successfully');
              } else {
                const data = await response.json();
                Alert.alert('Error', data.error || 'Failed to delete post');
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  // Sentiment voting handler (Bullish/Bearish)
  const handleVoteSentiment = async (postId: number, type: 'bullish' | 'bearish') => {
    const userId = getUserId();
    if (!userId) {
      Alert.alert('Error', 'Please log in to vote');
      return;
    }

    const currentPost = posts.find(p => p.id === postId);
    if (!currentPost) return;

    try {
      const result = await voteSentiment(userId, postId, type);
      
      // Update the post with new sentiment data
      setPosts(prev =>
        prev.map(post => {
          if (post.id !== postId) return post;
          
          const oldVote = post.sentiment?.userVote;
          let newBullish = post.sentiment?.bullish || 0;
          let newBearish = post.sentiment?.bearish || 0;
          
          if (result.action === 'removed') {
            if (oldVote === 'bullish') newBullish--;
            else if (oldVote === 'bearish') newBearish--;
          } else if (result.action === 'changed') {
            if (type === 'bullish') { newBullish++; newBearish--; }
            else { newBearish++; newBullish--; }
          } else if (result.action === 'added') {
            if (type === 'bullish') newBullish++;
            else newBearish++;
          }
          
          return {
            ...post,
            sentiment: {
              bullish: Math.max(0, newBullish),
              bearish: Math.max(0, newBearish),
              total: Math.max(0, newBullish) + Math.max(0, newBearish),
              userVote: result.type,
            },
          };
        })
      );
    } catch (error) {
      console.error('Error voting sentiment:', error);
    }
  };

  // Add ticker to watchlist
  const handleAddToWatchlist = async (ticker: string) => {
    const userId = getUserId();
    if (!userId) {
      Alert.alert('Error', 'Please log in to add to watchlist');
      return;
    }

    try {
      await addToWatchlist(userId, ticker);
      Alert.alert('Success', `$${ticker} added to your watchlist!`);
    } catch (error: any) {
      if (error?.message?.includes('already')) {
        Alert.alert('Info', `$${ticker} is already in your watchlist`);
      } else {
        console.error('Error adding to watchlist:', error);
        Alert.alert('Error', 'Failed to add to watchlist');
      }
    }
  };

  // Handle ticker press - open stock page or add to watchlist
  const handleTickerPress = (ticker: string) => {
    Alert.alert(
      `$${ticker}`,
      'What would you like to do?',
      [
        { text: 'View Stock', onPress: () => router.push(`/symbol/${ticker.toUpperCase()}` as any) },
        { text: 'Add to Watchlist', onPress: () => handleAddToWatchlist(ticker) },
        { text: 'Search Posts', onPress: () => {
          setSearchQuery(`$${ticker}`);
          setSearchModal(true);
          handleSearch(`$${ticker}`);
        }},
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Handle mention press - open user profile
  const handleMentionPress = async (username: string) => {
    try {
      const response = await fetch(
        `https://www.wallstreetstocks.ai/api/user/by-username?username=${encodeURIComponent(username)}`
      );
      if (response.ok) {
        const user = await response.json();
        handleOpenProfile(user);
      } else {
        Alert.alert('User not found', `@${username} doesn't exist`);
      }
    } catch (error) {
      console.error('Error finding user:', error);
    }
  };

  // Comment handler
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    const userId = getUserId();
    if (!userId) {
      Alert.alert('Error', 'Please log in to comment');
      return;
    }

    setCommenting(true);

    try {
      const comment = await createComment(selectedPost.id.toString(), newComment.trim(), userId);
      
      if (comment) {
        setComments(prev => [...prev, comment]);
        setPosts(prev =>
          prev.map(post =>
            post.id === selectedPost.id
              ? { ...post, _count: { ...post._count!, comments: (post._count?.comments || 0) + 1 } }
              : post
          )
        );
      }

      setNewComment('');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', error?.message || 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  // Share handler
  const handleSharePost = async (post: Post) => {
    try {
      await Share.share({
        message: `${post.title || ''}\n\n${post.content}\n\nShared from WallStreetStocks`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Track and fetch post views
  const trackPostView = async (postId: number) => {
    const userId = getUserId();
    try {
      // Record the view
      await fetch(`https://www.wallstreetstocks.ai/api/posts/${postId}/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId && { 'x-user-id': userId.toString() }),
        },
      });

      // Fetch insights
      const response = await fetch(`https://www.wallstreetstocks.ai/api/posts/${postId}/views`);
      if (response.ok) {
        const data = await response.json();
        setPostInsights({
          totalViews: data.totalViews || 0,
          uniqueViewers: data.uniqueViewers || 0,
        });
      }
    } catch (error) {
      console.error('Error tracking post view:', error);
    }
  };

  // Modal handlers
  const handleOpenComments = (post: Post) => {
    setSelectedPost(post);
    setPostInsights(null); // Reset insights
    loadComments(post.id);
    trackPostView(post.id); // Track view and fetch insights
    setCommentsModal(true);
  };

  // Handle notification tap - open post for like/comment, profile for follow
  const handleNotificationTap = async (notif: Notification) => {
    setNotificationsModal(false);

    // For follow notifications, open the user's profile
    if (notif.type === 'follow') {
      if (notif.fromUser) {
        setTimeout(() => handleOpenProfile(notif.fromUser), 300);
      }
      return;
    }

    // For like/comment/mention notifications, open the post
    if ((notif.type === 'like' || notif.type === 'comment' || notif.type === 'mention') && notif.post?.id) {
      // First try to find the post in already loaded posts
      const existingPost = posts.find(p => p.id === notif.post!.id);

      if (existingPost) {
        setTimeout(() => handleOpenComments(existingPost), 300);
        return;
      }

      // If not found, fetch the post from API
      try {
        const response = await fetch(`https://www.wallstreetstocks.ai/api/posts/${notif.post.id}`);
        if (response.ok) {
          const postData = await response.json();
          // Adapt the response to match Post type
          const post: Post = {
            id: postData.id,
            title: postData.title,
            content: postData.content,
            mediaUrl: postData.mediaUrl,
            createdAt: postData.createdAt,
            user: postData.user,
            userId: postData.userId,
            forum: postData.forum,
            forumId: postData.forumId,
            _count: {
              comments: postData._count?.comments || 0,
              likes: postData._count?.likes || 0,
            },
          };
          setTimeout(() => handleOpenComments(post), 300);
        } else {
          // If post not found, fallback to opening profile
          if (notif.fromUser) {
            setTimeout(() => handleOpenProfile(notif.fromUser), 300);
          }
        }
      } catch (error) {
        console.error('Error fetching post for notification:', error);
        // Fallback to opening profile
        if (notif.fromUser) {
          setTimeout(() => handleOpenProfile(notif.fromUser), 300);
        }
      }
      return;
    }

    // Fallback: open the user's profile
    if (notif.fromUser) {
      setTimeout(() => handleOpenProfile(notif.fromUser), 300);
    }
  };

  const handleOpenImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageViewerModal(true);
  };

  const handleOpenPostOptions = (post: Post) => {
    setSelectedPostForOptions(post);
    setPostOptionsModal(true);
  };

  const handleFollowFromOptions = async () => {
    if (!selectedPostForOptions?.user) return;
    
    const userId = getUserId();
    const targetUserId = selectedPostForOptions.user.id;
    
    if (!userId) {
      Alert.alert('Error', 'Please log in to follow users');
      setPostOptionsModal(false);
      return;
    }

    if (userId === targetUserId) {
      Alert.alert('Error', "You can't follow yourself");
      setPostOptionsModal(false);
      return;
    }

    try {
      const response = await fetch(
        `https://www.wallstreetstocks.ai/api/follows`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followerId: userId, followingId: targetUserId }),
        }
      );

      if (response.ok) {
        Alert.alert('Success', `You are now following ${getDisplayName(selectedPostForOptions.user)}`);
      } else {
        throw new Error('Failed to follow user');
      }
    } catch (error) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    } finally {
      setPostOptionsModal(false);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedPostForOptions?.user) return;

    const userId = getUserId();
    const targetUserId = selectedPostForOptions.user.id;
    const targetUserName = getDisplayName(selectedPostForOptions.user);

    if (!userId) {
      Alert.alert('Error', 'Please log in to block users');
      setPostOptionsModal(false);
      return;
    }

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${targetUserName}? You won't see their posts or comments anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await blockUser(userId, targetUserId);
              if (result.success) {
                // Remove blocked user's posts from the feed
                setPosts(prev => prev.filter(p => p.user?.id !== targetUserId));
                Alert.alert('Blocked', `${targetUserName} has been blocked`);
              }
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
    setPostOptionsModal(false);
  };

  const handleMuteUser = async () => {
    if (!selectedPostForOptions?.user) return;

    const userId = getUserId();
    const targetUserId = selectedPostForOptions.user.id;
    const targetUserName = getDisplayName(selectedPostForOptions.user);

    if (!userId) {
      Alert.alert('Error', 'Please log in to mute users');
      setPostOptionsModal(false);
      return;
    }

    try {
      const result = await muteUser(userId, targetUserId);
      if (result.success) {
        Alert.alert('Muted', `${targetUserName} has been muted. You won't receive notifications from them.`);
      }
    } catch (error) {
      console.error('Error muting user:', error);
      Alert.alert('Error', 'Failed to mute user. Please try again.');
    } finally {
      setPostOptionsModal(false);
    }
  };

  const handleReportUser = () => {
    if (!selectedPostForOptions?.user) return;
    
    const targetUserName = getDisplayName(selectedPostForOptions.user);
    
    setPostOptionsModal(false);
    
    Alert.alert(
      'Report User',
      `Why are you reporting ${targetUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Spam',
          onPress: () => submitReport('spam'),
        },
        {
          text: 'Harassment',
          onPress: () => submitReport('harassment'),
        },
        {
          text: 'Misinformation',
          onPress: () => submitReport('misinformation'),
        },
        {
          text: 'Other',
          onPress: () => submitReport('other'),
        },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    if (!selectedPostForOptions?.user) return;

    const userId = getUserId();
    const targetUserId = selectedPostForOptions.user.id;
    const postId = selectedPostForOptions.id;

    if (!userId) {
      Alert.alert('Error', 'Please log in to report users');
      return;
    }

    try {
      await reportUser(userId, targetUserId, reason, postId);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    }
  };

  // Share Post from Options Modal
  const handleShareFromOptions = async () => {
    if (!selectedPostForOptions) return;

    const postUrl = `https://www.wallstreetstocks.ai/community/post/${selectedPostForOptions.id}`;
    const shareContent = selectedPostForOptions.content.substring(0, 100) + (selectedPostForOptions.content.length > 100 ? '...' : '');

    try {
      await Share.share({
        message: `${shareContent}\n\nCheck out this post on WallStreetStocks: ${postUrl}`,
        url: postUrl,
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
    setPostOptionsModal(false);
  };

  // Copy Link
  const handleCopyLink = async () => {
    if (!selectedPostForOptions) return;

    const postUrl = `https://www.wallstreetstocks.ai/community/post/${selectedPostForOptions.id}`;

    try {
      await Clipboard.setStringAsync(postUrl);
      Alert.alert('Copied!', 'Post link copied to clipboard');
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
    setPostOptionsModal(false);
  };

  // Not Interested / Hide Post
  const handleNotInterested = () => {
    if (!selectedPostForOptions) return;

    setHiddenPosts(prev => [...prev, selectedPostForOptions.id]);
    setPosts(prev => prev.filter(p => p.id !== selectedPostForOptions.id));
    setPostOptionsModal(false);

    // Show undo option
    Alert.alert(
      'Post Hidden',
      "You won't see this post anymore",
      [
        { text: 'OK', style: 'default' },
        {
          text: 'Undo',
          onPress: () => {
            setHiddenPosts(prev => prev.filter(id => id !== selectedPostForOptions.id));
            loadPosts(); // Reload posts to bring it back
          },
        },
      ]
    );
  };

  // Comment Options
  const handleOpenCommentOptions = (comment: Comment) => {
    setSelectedCommentForOptions(comment);
    setCommentOptionsModal(true);
  };

  const handleBlockCommentUser = async () => {
    if (!selectedCommentForOptions?.user) return;

    const userId = getUserId();
    const targetUserId = selectedCommentForOptions.user.id;
    const targetUserName = getDisplayName(selectedCommentForOptions.user);

    if (!userId) {
      Alert.alert('Error', 'Please log in to block users');
      setCommentOptionsModal(false);
      return;
    }

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${targetUserName}? You won't see their posts or comments anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await blockUser(userId, targetUserId);
              if (result.success) {
                // Remove blocked user's comments
                setComments(prev => prev.filter(c => c.user?.id !== targetUserId));
                // Remove blocked user's posts from the feed
                setPosts(prev => prev.filter(p => p.user?.id !== targetUserId));
                Alert.alert('Blocked', `${targetUserName} has been blocked`);
              }
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
    setCommentOptionsModal(false);
  };

  const handleMuteCommentUser = async () => {
    if (!selectedCommentForOptions?.user) return;

    const userId = getUserId();
    const targetUserId = selectedCommentForOptions.user.id;
    const targetUserName = getDisplayName(selectedCommentForOptions.user);

    if (!userId) {
      Alert.alert('Error', 'Please log in to mute users');
      setCommentOptionsModal(false);
      return;
    }

    try {
      const result = await muteUser(userId, targetUserId);
      if (result.success) {
        Alert.alert('Muted', `${targetUserName} has been muted. You won't receive notifications from them.`);
      }
    } catch (error) {
      console.error('Error muting user:', error);
      Alert.alert('Error', 'Failed to mute user. Please try again.');
    } finally {
      setCommentOptionsModal(false);
    }
  };

  const handleReportCommentUser = () => {
    if (!selectedCommentForOptions?.user) return;

    const targetUserName = getDisplayName(selectedCommentForOptions.user);

    setCommentOptionsModal(false);

    Alert.alert(
      'Report Comment',
      `Why are you reporting this comment by ${targetUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam', onPress: () => submitCommentReport('spam') },
        { text: 'Harassment', onPress: () => submitCommentReport('harassment') },
        { text: 'Misinformation', onPress: () => submitCommentReport('misinformation') },
        { text: 'Other', onPress: () => submitCommentReport('other') },
      ]
    );
  };

  const submitCommentReport = async (reason: string) => {
    if (!selectedCommentForOptions?.user) return;

    const userId = getUserId();
    const targetUserId = selectedCommentForOptions.user.id;
    const commentId = selectedCommentForOptions.id;

    if (!userId) {
      Alert.alert('Error', 'Please log in to report');
      return;
    }

    try {
      await reportUser(userId, targetUserId, reason, undefined, commentId);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    }
  };

  // Profile Moderation Actions
  const handleBlockFromProfile = async () => {
    if (!selectedProfile) return;

    const userId = getUserId();
    const targetUserId = selectedProfile.id;
    const targetUserName = getDisplayName(selectedProfile);

    if (!userId) {
      Alert.alert('Error', 'Please log in to block users');
      return;
    }

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${targetUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await blockUser(userId, targetUserId);
              if (result.success) {
                setPosts(prev => prev.filter(p => p.user?.id !== targetUserId));
                setProfileModal(false);
                Alert.alert('Blocked', `${targetUserName} has been blocked`);
              }
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleMuteFromProfile = async () => {
    if (!selectedProfile) return;

    const userId = getUserId();
    const targetUserId = selectedProfile.id;
    const targetUserName = getDisplayName(selectedProfile);

    if (!userId) {
      Alert.alert('Error', 'Please log in to mute users');
      return;
    }

    try {
      const result = await muteUser(userId, targetUserId);
      if (result.success) {
        Alert.alert('Muted', `${targetUserName} has been muted.`);
      }
    } catch (error) {
      console.error('Error muting user:', error);
      Alert.alert('Error', 'Failed to mute user. Please try again.');
    }
  };

  const handleReportFromProfile = () => {
    if (!selectedProfile) return;

    const targetUserName = getDisplayName(selectedProfile);

    Alert.alert(
      'Report User',
      `Why are you reporting ${targetUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam', onPress: () => submitProfileReport('spam') },
        { text: 'Harassment', onPress: () => submitProfileReport('harassment') },
        { text: 'Impersonation', onPress: () => submitProfileReport('impersonation') },
        { text: 'Other', onPress: () => submitProfileReport('other') },
      ]
    );
  };

  const submitProfileReport = async (reason: string) => {
    if (!selectedProfile) return;

    const userId = getUserId();

    if (!userId) {
      Alert.alert('Error', 'Please log in to report');
      return;
    }

    try {
      await reportUser(userId, selectedProfile.id, reason);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    }
  };

  const handleMarkNotificationsRead = async () => {
    const userId = getUserId();
    if (!userId) return;
    
    try {
      await markAllNotificationsRead(userId);
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  // Effects - Use combined endpoint for faster initial load
  // NOTE: Do NOT call fetchUserProfile here - UserProfileContext handles profile loading
  // Calling it here would overwrite local updates with stale API data
  useEffect(() => {
    fetchCurrentUserData();
    loadPosts(); // Direct API call to /api/posts
    loadNotifications(); // Separate call for notifications
  }, [loadPosts, loadNotifications]);

  // NOTE: Do NOT refresh profile on tab focus or auth changes!
  // The UserProfileContext already has the correct data from local updates.
  // Fetching from API would overwrite local updates with stale replica data.

  useEffect(() => {
    // Fetch suggested users after posts load
    if (posts.length > 0 || !loading) {
      fetchSuggestedUsers();
    }
  }, [posts.length, loading, fetchSuggestedUsers]);

  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      loadNotifications();
    }
  }, [authUser?.id, currentUser?.id, getUserId, loadNotifications]);

  useEffect(() => {
    if (searchQuery) {
      const debounce = setTimeout(() => handleSearch(searchQuery), 300);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Handle deep links from notifications (openPostId, openUserId)
  useEffect(() => {
    const handleDeepLink = async () => {
      // Handle opening a specific post
      if (searchParams.openPostId) {
        const postId = parseInt(searchParams.openPostId, 10);
        console.log('🔗 Deep link: Opening post', postId);

        // First try to find the post in already loaded posts
        const existingPost = posts.find(p => p.id === postId);
        if (existingPost) {
          handleOpenComments(existingPost);
          // Clear the param to prevent re-opening on re-render
          navRouter.setParams({ openPostId: undefined } as any);
          return;
        }

        // If not found, fetch the post from API
        try {
          const response = await fetch(`https://www.wallstreetstocks.ai/api/posts/${postId}`);
          if (response.ok) {
            const postData = await response.json();
            const post: Post = {
              id: postData.id,
              title: postData.title,
              content: postData.content,
              mediaUrl: postData.mediaUrl,
              ticker: postData.ticker,
              imageUrl: postData.imageUrl,
              createdAt: postData.createdAt,
              likes: postData._count?.likes || postData.likes || 0,
              commentCount: postData._count?.comments || postData.commentCount || 0,
              isLiked: postData.isLiked || false,
              user: postData.user || { id: postData.userId, name: null, username: null, profileImage: null },
              userId: postData.userId,
            };
            handleOpenComments(post);
          }
        } catch (error) {
          console.error('Error fetching post for deep link:', error);
        }
        // Clear the param
        navRouter.setParams({ openPostId: undefined } as any);
      }

      // Handle opening a specific user profile
      if (searchParams.openUserId) {
        const userId = parseInt(searchParams.openUserId, 10);
        console.log('🔗 Deep link: Opening user profile', userId);

        try {
          const response = await fetch(`https://www.wallstreetstocks.ai/api/user/${userId}`);
          if (response.ok) {
            const userData = await response.json();
            handleOpenProfile(userData);
          }
        } catch (error) {
          console.error('Error fetching user for deep link:', error);
        }
        // Clear the param
        navRouter.setParams({ openUserId: undefined } as any);
      }
    };

    // Only run when posts are loaded (to check existing posts first)
    if (!loading && (searchParams.openPostId || searchParams.openUserId)) {
      handleDeepLink();
    }
  }, [searchParams.openPostId, searchParams.openUserId, loading, posts]);

  // Helper function to get display name for any user (use current user profile for self)
  const getUserDisplayName = (user: User | null | undefined): string => {
    // If this is the current user, use their updated profile data
    if (user && userProfile && user.id === userProfile.id) {
      return getContextDisplayName();
    }
    // Otherwise use the user's data
    return getDisplayName(user);
  };

  // Helper function to get handle for any user (use current user profile for self)
  const getUserHandle = (user: User | null | undefined): string => {
    // If this is the current user, use their updated profile data
    if (user && userProfile && user.id === userProfile.id) {
      return userProfile.username ? userProfile.username : `user${userProfile.id}`;
    }
    // Otherwise use the user's data
    return getHandle(user);
  };

  // Avatar Component - optimized with expo-image caching
  // Uses local userProfile data for current user to ensure fresh profile image
  const Avatar = ({ user, size = 44, onPress }: { user: User | null | undefined; size?: number; onPress?: () => void }) => {
    const color = getAvatarColor(user?.id || 0);
    const initials = getUserInitials(user);

    // For the current user, prefer userProfile/authUser data (has fresh profileImage)
    // This fixes the issue where API returns stale/null profileImage after login/logout
    const isCurrentUser = user?.id && (user.id === getUserId());
    const avatarImage = isCurrentUser
      ? (userProfile?.profileImage || authUser?.profileImage || user?.image || user?.profileImage)
      : (user?.image || user?.profileImage);

    const avatarContent = avatarImage ? (
      <Image
        source={{ uri: avatarImage }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E5E5EA' }}
        cachePolicy="memory-disk"
        transition={150}
        contentFit="cover"
      />
    ) : (
      <View style={{ 
        width: size, 
        height: size, 
        borderRadius: size / 2, 
        backgroundColor: color,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {avatarContent}
        </TouchableOpacity>
      );
    }

    return avatarContent;
  };

  // Loading state
  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading community...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setSearchModal(true)}
          >
            <Ionicons name="search" size={24} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              loadNotifications(); // Fetch full notification list when opening modal
              setNotificationsModal(true);
              handleMarkNotificationsRead();
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="#000" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* My Profile Button */}
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              const userId = getUserId();
              if (userId) {
                handleOpenProfile({ id: userId, name: null, email: '' });
              } else {
                Alert.alert('Not Logged In', 'Please log in to view your profile');
              }
            }}
          >
            <Ionicons name="person-circle-outline" size={26} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.composeButton}
            onPress={openCreatePostModal}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Posts List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.postsContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPosts(); // Direct API call to /api/posts
              fetchSuggestedUsers();
            }}
            tintColor="#007AFF"
          />
        }
      >
        {/* Trending Tickers Section */}
        <TrendingTickers onTickerPress={handleTickerPress} />

        {/* Suggested Accounts Section */}
        {visibleSuggestedUsers.length > 0 && (
          <View style={styles.suggestedSection}>
            <View style={styles.suggestedHeader}>
              <Text style={styles.suggestedTitle}>Accounts to Follow</Text>
              <TouchableOpacity onPress={() => setDismissedUsers([])}>
                <Text style={styles.seeAllText}>Refresh</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedList}
            >
              {visibleSuggestedUsers.map((user) => (
                <View key={user.id} style={styles.suggestedCard}>
                  {/* Dismiss Button */}
                  <TouchableOpacity 
                    style={styles.dismissButton}
                    onPress={() => handleDismissSuggested(user.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => handleOpenProfile(user)}
                    style={styles.suggestedAvatarContainer}
                  >
                    <Avatar user={user} size={56} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => handleOpenProfile(user)}>
                    <Text style={styles.suggestedName} numberOfLines={1}>
                      {getUserDisplayName(user)}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.suggestedHandle} numberOfLines={1}>
                    @{getUserHandle(user)}
                  </Text>
                  
                  {user._count?.followers !== undefined && (
                    <Text style={styles.suggestedFollowers}>
                      {user._count.followers} followers
                    </Text>
                  )}
                  
                  <TouchableOpacity 
                    style={[
                      styles.suggestedFollowBtn,
                      user.isFollowing && styles.suggestedFollowingBtn
                    ]}
                    onPress={() => handleQuickFollow(user.id)}
                  >
                    <Text style={[
                      styles.suggestedFollowText,
                      user.isFollowing && styles.suggestedFollowingText
                    ]}>
                      {user.isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Suggested Loading State */}
        {suggestedLoading && visibleSuggestedUsers.length === 0 && (
          <View style={styles.suggestedLoadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}

        {/* Premium Tools Section */}
        <View style={styles.premiumSection}>
          <View style={styles.premiumHeader}>
            <Text style={styles.premiumTitle}>Premium Tools</Text>
            <TouchableOpacity onPress={() => router.push('/(modals)/paywall' as any)}>
              <Text style={styles.seeAllText}>See Plans</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.premiumList}
          >
            {/* Gold Feature - AI Stock Analysis */}
            <TouchableOpacity
              style={[
                styles.premiumCard,
                canAccess(FEATURE_TIERS.BASIC_ANALYSIS) && styles.premiumCardUnlocked,
              ]}
              onPress={() => {
                withPremiumAccess(
                  FEATURE_TIERS.BASIC_ANALYSIS,
                  () => router.push('/premium/ai-analysis' as any),
                  { alertTitle: 'Gold Feature', alertMessage: 'AI Stock Analysis requires a Gold subscription.' }
                );
              }}
            >
              <View style={[styles.premiumIconContainer, { backgroundColor: '#FFD700' }]}>
                <Ionicons name="analytics" size={24} color="#000" />
              </View>
              {!canAccess(FEATURE_TIERS.BASIC_ANALYSIS) && (
                <View style={[styles.premiumBadge, { backgroundColor: '#FFD700' }]}>
                  <Ionicons name="lock-closed" size={10} color="#000" />
                  <Text style={styles.premiumBadgeText}>Gold</Text>
                </View>
              )}
              <Text style={styles.premiumCardTitle}>AI Analysis</Text>
              <Text style={styles.premiumCardDesc}>Get AI-powered stock insights</Text>
            </TouchableOpacity>

            {/* Platinum Feature - Real-time Alerts */}
            <TouchableOpacity
              style={[
                styles.premiumCard,
                canAccess(FEATURE_TIERS.REALTIME_ALERTS) && styles.premiumCardUnlocked,
              ]}
              onPress={() => {
                withPremiumAccess(
                  FEATURE_TIERS.REALTIME_ALERTS,
                  () => router.push('/premium/price-alerts' as any),
                  { alertTitle: 'Platinum Feature', alertMessage: 'Real-time Alerts requires a Platinum subscription.' }
                );
              }}
            >
              <View style={[styles.premiumIconContainer, { backgroundColor: '#E5E4E2' }]}>
                <Ionicons name="notifications" size={24} color="#000" />
              </View>
              {!canAccess(FEATURE_TIERS.REALTIME_ALERTS) && (
                <View style={[styles.premiumBadge, { backgroundColor: '#E5E4E2' }]}>
                  <Ionicons name="lock-closed" size={10} color="#000" />
                  <Text style={styles.premiumBadgeText}>Platinum</Text>
                </View>
              )}
              <Text style={styles.premiumCardTitle}>Price Alerts</Text>
              <Text style={styles.premiumCardDesc}>Real-time notifications</Text>
            </TouchableOpacity>

            {/* Diamond Feature - Research Reports */}
            <TouchableOpacity
              style={[
                styles.premiumCard,
                canAccess(FEATURE_TIERS.RESEARCH_REPORTS) && styles.premiumCardUnlocked,
              ]}
              onPress={() => {
                withPremiumAccess(
                  FEATURE_TIERS.RESEARCH_REPORTS,
                  () => router.push('/premium/research-reports' as any),
                  { alertTitle: 'Diamond Feature', alertMessage: 'Research Reports requires a Diamond subscription.' }
                );
              }}
            >
              <View style={[styles.premiumIconContainer, { backgroundColor: '#B9F2FF' }]}>
                <Ionicons name="document-text" size={24} color="#000" />
              </View>
              {!canAccess(FEATURE_TIERS.RESEARCH_REPORTS) && (
                <View style={[styles.premiumBadge, { backgroundColor: '#B9F2FF' }]}>
                  <Ionicons name="lock-closed" size={10} color="#000" />
                  <Text style={styles.premiumBadgeText}>Diamond</Text>
                </View>
              )}
              <Text style={styles.premiumCardTitle}>Research</Text>
              <Text style={styles.premiumCardDesc}>Pro research reports</Text>
            </TouchableOpacity>

            {/* Diamond Feature - Portfolio Optimization */}
            <TouchableOpacity
              style={[
                styles.premiumCard,
                canAccess(FEATURE_TIERS.PORTFOLIO_OPTIMIZATION) && styles.premiumCardUnlocked,
              ]}
              onPress={() => {
                withPremiumAccess(
                  FEATURE_TIERS.PORTFOLIO_OPTIMIZATION,
                  () => router.push('/premium/portfolio-optimizer' as any),
                  { alertTitle: 'Diamond Feature', alertMessage: 'Portfolio Optimization requires a Diamond subscription.' }
                );
              }}
            >
              <View style={[styles.premiumIconContainer, { backgroundColor: '#B9F2FF' }]}>
                <Ionicons name="pie-chart" size={24} color="#000" />
              </View>
              {!canAccess(FEATURE_TIERS.PORTFOLIO_OPTIMIZATION) && (
                <View style={[styles.premiumBadge, { backgroundColor: '#B9F2FF' }]}>
                  <Ionicons name="lock-closed" size={10} color="#000" />
                  <Text style={styles.premiumBadgeText}>Diamond</Text>
                </View>
              )}
              <Text style={styles.premiumCardTitle}>Optimizer</Text>
              <Text style={styles.premiumCardDesc}>Portfolio allocation AI</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <Avatar 
                user={post.user} 
                size={46} 
                onPress={() => handleOpenProfile(post.user)}
              />
              <TouchableOpacity 
                style={styles.postHeaderText}
                onPress={() => handleOpenProfile(post.user)}
                activeOpacity={0.7}
              >
                <View style={styles.userNameRow}>
                  <Text style={styles.username}>
                    {getUserDisplayName(post.user)}
                  </Text>
                  <SubscriptionBadgeInline tier={post.user?.subscriptionTier as any} />
                  <Text style={styles.userHandle}>@{getUserHandle(post.user)}</Text>
                  {post.ticker && (
                    <View style={styles.tickerBadge}>
                      <Text style={styles.tickerText}>${post.ticker}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.postMeta}>
                  <Text style={styles.timestamp}>{formatTimeAgo(post.createdAt)}</Text>
                  {post.forum && (
                    <>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.forumText}>{post.forum.title}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
              
              {/* Three Dot Menu */}
              <TouchableOpacity 
                style={styles.postOptionsButton}
                onPress={() => handleOpenPostOptions(post)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Post Title */}
            {post.title && post.title !== post.content && (
              <Text style={styles.postTitle}>{post.title}</Text>
            )}

            {/* Post Content */}
            <FormattedContent 
              content={post.content}
              onTickerPress={handleTickerPress}
              onMentionPress={handleMentionPress}
              style={styles.postContent}
            />

            {/* Ticker Pills */}
            {post.tickers && post.tickers.length > 0 && (
              <View style={styles.tickerPillsContainer}>
                {post.tickers.map((ticker) => (
                  <TouchableOpacity
                    key={ticker}
                    style={styles.tickerPill}
                    onPress={() => handleTickerPress(ticker)}
                  >
                    <Text style={styles.tickerPillText}>${ticker}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Post Image */}
            {(post.mediaUrl || post.image) && (
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => handleOpenImage(post.mediaUrl || post.image || '')}
              >
                <Image 
                  source={{ uri: post.mediaUrl || post.image }}
                  style={styles.postImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              </TouchableOpacity>
            )}

            {/* Sentiment Voting */}
            {post.sentiment && (
              <View style={styles.sentimentContainer}>
                <TouchableOpacity
                  style={[
                    styles.sentimentButton,
                    post.sentiment.userVote === 'bullish' && styles.sentimentButtonBullishActive
                  ]}
                  onPress={() => handleVoteSentiment(post.id, 'bullish')}
                >
                  <Ionicons 
                    name="trending-up" 
                    size={16} 
                    color={post.sentiment.userVote === 'bullish' ? '#FFF' : '#34C759'} 
                  />
                  <Text style={[
                    styles.sentimentText,
                    post.sentiment.userVote === 'bullish' && styles.sentimentTextActive
                  ]}>
                    {post.sentiment.bullish}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sentimentButton,
                    post.sentiment.userVote === 'bearish' && styles.sentimentButtonBearishActive
                  ]}
                  onPress={() => handleVoteSentiment(post.id, 'bearish')}
                >
                  <Ionicons 
                    name="trending-down" 
                    size={16} 
                    color={post.sentiment.userVote === 'bearish' ? '#FFF' : '#FF3B30'} 
                  />
                  <Text style={[
                    styles.sentimentText,
                    post.sentiment.userVote === 'bearish' && styles.sentimentTextActive
                  ]}>
                    {post.sentiment.bearish}
                  </Text>
                </TouchableOpacity>
                
                {post.sentiment.total > 0 && (
                  <View style={styles.sentimentBar}>
                    <View style={[
                      styles.sentimentBarBullish,
                      { width: `${Math.round((post.sentiment.bullish / post.sentiment.total) * 100)}%` }
                    ]} />
                  </View>
                )}
              </View>
            )}

            {/* Post Actions */}
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLikePost(post.id)}
              >
                <Ionicons
                  name={post.isLiked ? "heart" : "heart-outline"}
                  size={22}
                  color={post.isLiked ? "#FF3B30" : "#8E8E93"}
                />
                <Text style={[styles.actionText, post.isLiked && styles.actionTextActive]}>
                  {post._count?.likes || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleOpenComments(post)}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#8E8E93" />
                <Text style={styles.actionText}>{post._count?.comments || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSharePost(post)}
              >
                <Ionicons name="share-outline" size={22} color="#8E8E93" />
              </TouchableOpacity>

              {/* Delete button - only show for own posts */}
              {post.userId === getUserId() && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeletePost(post.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {posts.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to share something!</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={openCreatePostModal}
            >
              <Text style={styles.emptyButtonText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openCreatePostModal}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* PROFILE MODAL */}
      <Modal
        visible={profileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProfileModal(false)}
      >
        <View style={styles.modalContainer} key={`profile-${selectedProfile?.id}-${selectedProfile?.username}`}>
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              onPress={() => setProfileModal(false)}
              style={styles.profileCloseButton}
            >
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.profileHeaderTitle}>Profile</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.profileContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Show loading state while fetching fresh profile data */}
            {!selectedProfile && profileLoading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>Loading profile...</Text>
              </View>
            ) : (
            <>
            {/* Profile Info Section */}
            <View style={styles.profileInfoSection}>
              <View style={styles.profileAvatarContainer}>
                <Avatar user={selectedProfile} size={100} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={styles.profileName}>
                  {getUserDisplayName(selectedProfile)}
                </Text>
                <SubscriptionBadgeInline tier={selectedProfile?.subscriptionTier as any} />
                {profileLoading && (
                  <ActivityIndicator size="small" color="#007AFF" style={{ marginLeft: 8 }} />
                )}
              </View>

              <Text style={styles.profileEmail}>@{getUserHandle(selectedProfile)}</Text>

              {selectedProfile?.bio && (
                <Text style={styles.profileBio}>{selectedProfile.bio}</Text>
              )}

              {selectedProfile?.createdAt && (
                <View style={styles.profileJoinDate}>
                  <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
                  <Text style={styles.profileJoinDateText}>
                    Joined {formatJoinDate(selectedProfile.createdAt)}
                  </Text>
                </View>
              )}

              {/* Stats */}
              <View style={styles.profileStats}>
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatNumber}>
                    {selectedProfile?._count?.posts || profilePosts.length || 0}
                  </Text>
                  <Text style={styles.profileStatLabel}>Posts</Text>
                </View>
                <View style={styles.profileStatDivider} />
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatNumber}>
                    {selectedProfile?._count?.followers || 0}
                  </Text>
                  <Text style={styles.profileStatLabel}>Followers</Text>
                </View>
                <View style={styles.profileStatDivider} />
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatNumber}>
                    {selectedProfile?._count?.following || 0}
                  </Text>
                  <Text style={styles.profileStatLabel}>Following</Text>
                </View>
              </View>

              {/* Follow & Message Buttons - Show for other users */}
              {selectedProfile?.id !== getUserId() && (
                <View style={styles.profileActionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      selectedProfile?.isFollowing && styles.followingButton,
                    ]}
                    onPress={handleFollowUser}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color={selectedProfile?.isFollowing ? "#007AFF" : "#FFF"} />
                    ) : (
                      <>
                        <Ionicons
                          name={selectedProfile?.isFollowing ? "checkmark" : "person-add-outline"}
                          size={18}
                          color={selectedProfile?.isFollowing ? "#007AFF" : "#FFF"}
                        />
                        <Text style={[
                          styles.followButtonText,
                          selectedProfile?.isFollowing && styles.followingButtonText
                        ]}>
                          {selectedProfile?.isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Message Button */}
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={() => {
                      if (selectedProfile?.id) {
                        setProfileModal(false);
                        router.push(`/messages/new?recipientId=${selectedProfile.id}`);
                      }
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#007AFF" />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>

                  {/* More Options Button */}
                  <TouchableOpacity
                    style={styles.profileMoreButton}
                    onPress={() => {
                      Alert.alert(
                        getDisplayName(selectedProfile),
                        'Choose an action',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Mute',
                            onPress: handleMuteFromProfile,
                          },
                          {
                            text: 'Block',
                            style: 'destructive',
                            onPress: handleBlockFromProfile,
                          },
                          {
                            text: 'Report',
                            style: 'destructive',
                            onPress: handleReportFromProfile,
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={22} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Edit Profile Button - Show for own profile */}
              {selectedProfile?.id === getUserId() && (
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => {
                    setProfileModal(false);
                    router.push('/profile/edit-profile');
                  }}
                >
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
                  <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* User's Posts */}
            <View style={styles.profilePostsSection}>
              <Text style={styles.profilePostsTitle}>Posts</Text>
              
              {profileLoading ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
              ) : profilePosts.length > 0 ? (
                profilePosts.map((post) => (
                  <TouchableOpacity 
                    key={post.id} 
                    style={styles.profilePostCard}
                    onPress={() => {
                      setProfileModal(false);
                      setTimeout(() => handleOpenComments(post), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    {post.ticker && (
                      <View style={styles.profilePostTicker}>
                        <Text style={styles.tickerText}>${post.ticker}</Text>
                      </View>
                    )}
                    {post.title && post.title !== post.content && (
                      <Text style={styles.profilePostTitle}>{post.title}</Text>
                    )}
                    <Text style={styles.profilePostContent} numberOfLines={3}>
                      {post.content}
                    </Text>
                    {(post.mediaUrl || post.image) && (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                          setProfileModal(false);
                          setTimeout(() => handleOpenImage(post.mediaUrl || post.image || ''), 300);
                        }}
                      >
                        <Image 
                          source={{ uri: post.mediaUrl || post.image }}
                          style={styles.profilePostImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={200}
                        />
                      </TouchableOpacity>
                    )}
                    <View style={styles.profilePostMeta}>
                      <Text style={styles.profilePostTime}>{formatTimeAgo(post.createdAt)}</Text>
                      <View style={styles.profilePostStats}>
                        <View style={styles.profilePostStat}>
                          <Ionicons
                            name={post.isLiked ? "heart" : "heart-outline"}
                            size={16}
                            color={post.isLiked ? "#FF3B30" : "#8E8E93"}
                          />
                          <Text style={[
                            styles.profilePostStatText,
                            post.isLiked && { color: '#FF3B30' }
                          ]}>
                            {post._count?.likes || 0}
                          </Text>
                        </View>
                        <View style={styles.profilePostStat}>
                          <Ionicons name="chatbubble-outline" size={16} color="#8E8E93" />
                          <Text style={styles.profilePostStatText}>{post._count?.comments || 0}</Text>
                        </View>
                        {/* Delete button - only show for own posts */}
                        {post.userId === getUserId() && (
                          <TouchableOpacity
                            style={styles.profilePostStat}
                            onPress={() => handleDeletePost(post.id)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noProfilePosts}>
                  <Ionicons name="document-text-outline" size={48} color="#C7C7CC" />
                  <Text style={styles.noProfilePostsText}>No posts yet</Text>
                </View>
              )}
            </View>

            <View style={{ height: 40 }} />
            </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* CREATE POST MODAL */}
      <Modal
        visible={createPostModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreatePostModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCreatePostModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Post</Text>
            <TouchableOpacity
              onPress={handleCreatePost}
              disabled={posting || !newPostContent.trim()}
              style={[
                styles.postButton,
                (!newPostContent.trim() || posting) && styles.postButtonDisabled
              ]}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* User Info */}
            <View style={styles.createPostUser}>
              <Avatar user={modalUserProfile || userProfile || authUser} size={44} />
              <Text style={styles.createPostUsername}>
                {modalUserName}
              </Text>
            </View>

            {/* Title Input */}
            <TextInput
              style={styles.titleInput}
              placeholder="Title (optional)"
              placeholderTextColor="#8E8E93"
              value={newPostTitle}
              onChangeText={setNewPostTitle}
              maxLength={100}
            />

            {/* Content Input */}
            <TextInput
              style={styles.contentInput}
              placeholder="What's happening in the markets?"
              placeholderTextColor="#8E8E93"
              multiline
              value={newPostContent}
              onChangeText={setNewPostContent}
            />

            {/* Ticker Input */}
            <View style={styles.tickerInputContainer}>
              <Ionicons name="pricetag-outline" size={20} color="#8E8E93" />
              <TextInput
                style={styles.tickerInput}
                placeholder="Add ticker (e.g., AAPL)"
                placeholderTextColor="#8E8E93"
                value={newPostTicker}
                onChangeText={(text) => setNewPostTicker(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={10}
              />
            </View>

            {/* Image Preview */}
            {newPostImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: newPostImage }} style={styles.imagePreview} contentFit="cover" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setNewPostImage(null)}
                >
                  <Ionicons name="close-circle" size={28} color="#FF3B30" />
                </TouchableOpacity>
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color="#FFF" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#007AFF" />
              <Text style={styles.addImageText}>Add Image</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* SEARCH MODAL */}
      <Modal
        visible={searchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSearchModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.searchHeader}>
            <TouchableOpacity onPress={() => setSearchModal(false)}>
              <Ionicons name="arrow-back" size={26} color="#000" />
            </TouchableOpacity>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color="#8E8E93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search posts, tickers..."
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={styles.searchResults}>
            {searchLoading ? (
              <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
            ) : searchResults.length > 0 ? (
              searchResults.map((post) => (
                <TouchableOpacity 
                  key={post.id} 
                  style={styles.searchResultItem}
                  onPress={() => {
                    setSearchModal(false);
                    handleOpenComments(post);
                  }}
                >
                  <Avatar 
                    user={post.user} 
                    size={40} 
                    onPress={() => {
                      setSearchModal(false);
                      setTimeout(() => handleOpenProfile(post.user), 300);
                    }}
                  />
                  <View style={styles.searchResultContent}>
                    <Text style={styles.searchResultUsername}>
                      {getUserDisplayName(post.user)}
                    </Text>
                    <Text style={styles.searchResultText} numberOfLines={2}>{post.content}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : searchQuery.length > 0 ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color="#C7C7CC" />
                <Text style={styles.noResultsText}>No results found</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      {/* NOTIFICATIONS MODAL */}
      <Modal
        visible={notificationsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotificationsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setNotificationsModal(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Notifications</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.notificationsList}>
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.notificationItem, !notif.isRead && styles.notificationUnread]}
                  onPress={() => handleNotificationTap(notif)}
                  activeOpacity={0.7}
                >
                  <Avatar user={notif.fromUser} size={44} />
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationText}>
                      <Text style={styles.notificationUsername}>
                        {getDisplayName(notif.fromUser)}
                      </Text>
                      {notif.type === 'like' && ' liked your post'}
                      {notif.type === 'comment' && ' commented on your post'}
                      {notif.type === 'follow' && ' started following you'}
                      {notif.type === 'mention' && ' mentioned you'}
                    </Text>
                    <Text style={styles.notificationTime}>{formatTimeAgo(notif.createdAt)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-outline" size={48} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>No notifications</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* COMMENTS MODAL */}
      <Modal
        visible={commentsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCommentsModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCommentsModal(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Comments</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.commentsList} keyboardShouldPersistTaps="handled">
            {selectedPost && (
              <View style={styles.originalPost}>
                <View style={styles.postHeader}>
                  <Avatar 
                    user={selectedPost.user} 
                    size={40} 
                    onPress={() => {
                      setCommentsModal(false);
                      setTimeout(() => handleOpenProfile(selectedPost.user), 300);
                    }}
                  />
                  <TouchableOpacity 
                    style={styles.postHeaderText}
                    onPress={() => {
                      setCommentsModal(false);
                      setTimeout(() => handleOpenProfile(selectedPost.user), 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.username}>
                      {getUserDisplayName(selectedPost.user)}
                    </Text>
                    <Text style={styles.timestamp}>{formatTimeAgo(selectedPost.createdAt)}</Text>
                  </TouchableOpacity>
                </View>
                {selectedPost.title && <Text style={styles.postTitle}>{selectedPost.title}</Text>}
                <Text style={styles.postContent}>{selectedPost.content}</Text>
                {(selectedPost.mediaUrl || selectedPost.image) && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleOpenImage(selectedPost.mediaUrl || selectedPost.image || '')}
                  >
                    <Image
                      source={{ uri: selectedPost.mediaUrl || selectedPost.image }}
                      style={styles.postImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                  </TouchableOpacity>
                )}

                {/* Post Insights */}
                {postInsights && (
                  <View style={styles.postInsights}>
                    <View style={styles.insightItem}>
                      <Ionicons name="eye-outline" size={16} color="#666" />
                      <Text style={styles.insightText}>
                        {postInsights.totalViews} {postInsights.totalViews === 1 ? 'view' : 'views'}
                      </Text>
                    </View>
                    {postInsights.uniqueViewers > 0 && (
                      <View style={styles.insightItem}>
                        <Ionicons name="people-outline" size={16} color="#666" />
                        <Text style={styles.insightText}>
                          {postInsights.uniqueViewers} {postInsights.uniqueViewers === 1 ? 'viewer' : 'viewers'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {commentsLoading ? (
              <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
            ) : comments.length > 0 ? (
              comments.filter(comment => comment.user).map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Avatar
                    user={comment.user!}
                    size={36}
                    onPress={() => {
                      setCommentsModal(false);
                      setTimeout(() => handleOpenProfile(comment.user!), 300);
                    }}
                  />
                  <View style={styles.commentContent}>
                    <View style={styles.commentBubble}>
                      <TouchableOpacity
                        onPress={() => {
                          setCommentsModal(false);
                          setTimeout(() => handleOpenProfile(comment.user!), 300);
                        }}
                        activeOpacity={0.7}
                        style={styles.commentUserRow}
                      >
                        <Text style={styles.commentUsername}>
                          {getUserDisplayName(comment.user!)}
                        </Text>
                        <SubscriptionBadgeInline tier={comment.user?.subscriptionTier as any} />
                        <Text style={styles.commentHandle}>@{getUserHandle(comment.user!)}</Text>
                      </TouchableOpacity>
                      <Text style={styles.commentText}>{comment.content}</Text>
                    </View>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
                      <TouchableOpacity
                        style={styles.commentLikeButton}
                        onPress={() => handleLikeComment(comment.id)}
                      >
                        <Ionicons
                          name={comment.isLiked ? "heart" : "heart-outline"}
                          size={14}
                          color={comment.isLiked ? "#FF3B30" : "#8E8E93"}
                        />
                        <Text style={styles.commentLikeCount}>{comment._count?.likes ?? 0}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.commentOptionsButton}
                        onPress={() => handleOpenCommentOptions(comment)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={16} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noComments}>
                <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.commentInputContainer}>
            <Avatar user={authUser as User | null | undefined} size={36} />
            <View style={styles.commentInputWrapper}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#8E8E93"
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || commenting) && styles.sendButtonDisabled
              ]}
              onPress={handleAddComment}
              disabled={commenting || !newComment.trim()}
            >
              {commenting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </Modal>

      {/* POST OPTIONS MODAL */}
      <Modal
        visible={postOptionsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPostOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPress={() => setPostOptionsModal(false)}
        >
          <View style={styles.optionsModalContainer}>
            {/* User Info Header */}
            {selectedPostForOptions?.user && (
              <View style={styles.optionsUserHeader}>
                <Avatar user={selectedPostForOptions.user} size={40} />
                <View style={styles.optionsUserInfo}>
                  <Text style={styles.optionsUserName}>
                    {getUserDisplayName(selectedPostForOptions.user)}
                  </Text>
                  <Text style={styles.optionsUserHandle}>
                    @{getUserHandle(selectedPostForOptions.user)}
                  </Text>
                </View>
              </View>
            )}

            {/* Options List */}
            <View style={styles.optionsList}>
              {/* Share Option */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleShareFromOptions}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="share-outline" size={20} color="#2196F3" />
                </View>
                <Text style={styles.optionText}>Share Post</Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              {/* Copy Link Option */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleCopyLink}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#E8EAF6' }]}>
                  <Ionicons name="link-outline" size={20} color="#5C6BC0" />
                </View>
                <Text style={styles.optionText}>Copy Link</Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              {/* Not Interested Option */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleNotInterested}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#F5F5F5' }]}>
                  <Ionicons name="eye-off-outline" size={20} color="#757575" />
                </View>
                <Text style={styles.optionText}>Not Interested</Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.optionsDivider} />

              {/* Follow Option */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleFollowFromOptions}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="person-add-outline" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.optionText}>Follow @{selectedPostForOptions?.user ? getUserHandle(selectedPostForOptions.user) : ''}</Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              {/* Mute Option */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleMuteUser}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="volume-mute-outline" size={20} color="#FF9800" />
                </View>
                <Text style={styles.optionText}>Mute @{selectedPostForOptions?.user ? getUserHandle(selectedPostForOptions.user) : ''}</Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              {/* Block Option */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleBlockUser}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="ban-outline" size={20} color="#F44336" />
                </View>
                <Text style={styles.optionText}>Block @{selectedPostForOptions?.user ? getUserHandle(selectedPostForOptions.user) : ''}</Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              {/* Report Option */}
              <TouchableOpacity
                style={[styles.optionItem, styles.optionItemLast]}
                onPress={handleReportUser}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FCE4EC' }]}>
                  <Ionicons name="flag-outline" size={20} color="#E91E63" />
                </View>
                <Text style={[styles.optionText, { color: '#E91E63' }]}>Report Post</Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.optionsCancelButton}
              onPress={() => setPostOptionsModal(false)}
            >
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* COMMENT OPTIONS MODAL */}
      <Modal
        visible={commentOptionsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCommentOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPress={() => setCommentOptionsModal(false)}
        >
          <View style={styles.optionsModalContainer}>
            {/* User Info Header */}
            {selectedCommentForOptions?.user && (
              <View style={styles.optionsUserHeader}>
                <Avatar user={selectedCommentForOptions.user} size={40} />
                <View style={styles.optionsUserInfo}>
                  <Text style={styles.optionsUserName}>
                    {getUserDisplayName(selectedCommentForOptions.user)}
                  </Text>
                  <Text style={styles.optionsUserHandle}>
                    @{getUserHandle(selectedCommentForOptions.user)}
                  </Text>
                </View>
              </View>
            )}

            {/* Options List */}
            <View style={styles.optionsList}>
              {/* Mute Option */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleMuteCommentUser}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="volume-mute-outline" size={20} color="#FF9800" />
                </View>
                <Text style={styles.optionText}>Mute @{selectedCommentForOptions?.user ? getUserHandle(selectedCommentForOptions.user) : ''}</Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              {/* Block Option */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleBlockCommentUser}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="ban-outline" size={20} color="#F44336" />
                </View>
                <Text style={styles.optionText}>Block @{selectedCommentForOptions?.user ? getUserHandle(selectedCommentForOptions.user) : ''}</Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              {/* Report Option */}
              <TouchableOpacity
                style={[styles.optionItem, styles.optionItemLast]}
                onPress={handleReportCommentUser}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FCE4EC' }]}>
                  <Ionicons name="flag-outline" size={20} color="#E91E63" />
                </View>
                <Text style={[styles.optionText, { color: '#E91E63' }]}>Report Comment</Text>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.optionsCancelButton}
              onPress={() => setCommentOptionsModal(false)}
            >
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* IMAGE VIEWER MODAL */}
      <Modal
        visible={imageViewerModal}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setImageViewerModal(false)}
        statusBarTranslucent
      >
        <View style={styles.imageViewerContainer}>
          {/* Header */}
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity 
              style={styles.imageViewerCloseButton}
              onPress={() => setImageViewerModal(false)}
            >
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.imageViewerActionButton}
              onPress={async () => {
                if (selectedImage) {
                  try {
                    await Share.share({
                      url: selectedImage,
                      message: 'Check out this image from WallStreetStocks',
                    });
                  } catch (error) {
                    console.error('Error sharing image:', error);
                  }
                }
              }}
            >
              <Ionicons name="share-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Image */}
          <View style={styles.imageViewerContent}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullScreenImage}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            )}
          </View>

          {/* Tap to close hint */}
          <TouchableOpacity 
            style={styles.imageViewerOverlay}
            activeOpacity={1}
            onPress={() => setImageViewerModal(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  composeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Suggested Accounts Section
  suggestedSection: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    marginBottom: 8,
  },
  // Premium Section Styles
  premiumSection: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    marginBottom: 8,
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  premiumTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  premiumList: {
    paddingHorizontal: 12,
    gap: 10,
  },
  premiumCard: {
    width: 130,
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  premiumCardUnlocked: {
    borderColor: '#34C759',
    borderWidth: 2,
  },
  premiumIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000',
  },
  premiumCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  premiumCardDesc: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 2,
  },
  suggestedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  suggestedTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  seeAllText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  suggestedList: {
    paddingHorizontal: 12,
    gap: 10,
  },
  suggestedCard: {
    width: 140,
    backgroundColor: '#F9F9FB',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  suggestedAvatarContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  suggestedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 120,
  },
  suggestedHandle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    maxWidth: 120,
  },
  suggestedFollowers: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
  },
  suggestedFollowBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  suggestedFollowingBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  suggestedFollowText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestedFollowingText: {
    color: '#007AFF',
  },
  suggestedLoadingContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 30,
    marginBottom: 8,
    alignItems: 'center',
  },

  // Posts
  scrollView: {
    flex: 1,
  },
  postsContainer: {
    paddingTop: 8,
  },
  postCard: {
    backgroundColor: '#FFF',
    marginBottom: 8,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  userHandle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
  },
  tickerBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tickerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  timestamp: {
    fontSize: 13,
    color: '#8E8E93',
  },
  metaDot: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  forumText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  postTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  postContent: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: '#F2F2F7',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  actionTextActive: {
    color: '#FF3B30',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 8,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  cancelButton: {
    fontSize: 17,
    color: '#007AFF',
  },
  postButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Profile Modal Styles
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  profileCloseButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  profileHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  profileContent: {
    flex: 1,
  },
  profileInfoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 8,
    borderBottomColor: '#F2F2F7',
  },
  profileAvatarContainer: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 12,
  },
  profileBio: {
    fontSize: 15,
    color: '#3C3C43',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  profileJoinDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  profileJoinDateText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  profileStat: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  profileStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  profileStatLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  profileStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E5EA',
  },
  profileActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  profileMoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    minWidth: 140,
  },
  followingButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  followingButtonText: {
    color: '#007AFF',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    minWidth: 140,
  },
  editProfileButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  profilePostsSection: {
    backgroundColor: '#FFF',
    paddingTop: 20,
  },
  profilePostsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  profilePostCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  profilePostTicker: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  profilePostTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  profilePostContent: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 21,
  },
  profilePostImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: '#F2F2F7',
  },
  profilePostMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  profilePostTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  profilePostStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profilePostStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profilePostStatText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  noProfilePosts: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noProfilePostsText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },

  // Create Post
  createPostUser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  createPostUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    paddingVertical: 8,
  },
  contentInput: {
    fontSize: 17,
    color: '#000',
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  tickerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    gap: 10,
  },
  tickerInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  imagePreviewContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#F2F2F7',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFF',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    gap: 8,
  },
  addImageText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },

  // Search
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  searchResultText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 16,
  },

  // Notifications
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  notificationUnread: {
    backgroundColor: '#F0F9FF',
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  notificationUsername: {
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  emptyNotifications: {
    alignItems: 'center',
    paddingVertical: 80,
  },

  // Comments
  commentsList: {
    flex: 1,
  },
  originalPost: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F2F2F7',
  },
  commentItem: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  commentHandle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },
  commentText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 14,
    gap: 16,
  },
  commentTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentLikeCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  commentOptionsButton: {
    padding: 4,
    marginLeft: 8,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noCommentsText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFF',
    gap: 10,
  },
  commentInputWrapper: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentInput: {
    fontSize: 15,
    color: '#000',
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },

  // Post Options Button
  postOptionsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Post Options Modal
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsModalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  optionsUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  optionsUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  optionsUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  
  optionsUserHandle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  optionsList: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  optionsDivider: {
    height: 8,
    backgroundColor: '#F2F2F7',
    marginHorizontal: -20,
    marginVertical: 8,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  optionsCancelButton: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  optionsCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },

  // Image Viewer
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  imageViewerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  imageViewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  
  // Ticker Pills
  tickerPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  tickerPill: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tickerPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  
  // Sentiment Voting
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  sentimentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  sentimentButtonBullishActive: {
    backgroundColor: '#34C759',
  },
  sentimentButtonBearishActive: {
    backgroundColor: '#FF3B30',
  },
  sentimentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  sentimentTextActive: {
    color: '#FFF',
  },
  sentimentBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 8,
  },
  sentimentBarBullish: {
    height: '100%',
    backgroundColor: '#34C759',
  },

  // Post Insights
  postInsights: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});
