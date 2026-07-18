// app/(tabs)/community.tsx - Optimized with expo-image for caching
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
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
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useUserProfile } from '@/context/UserProfileContext';
import FormattedContent from '@/components/FormattedContent';
import TrendingTickers from '@/components/TrendingTickers';
import { FEATURE_TIERS } from '@/components/PremiumFeatureGate';
import { SubscriptionBadgeInline } from '@/components/SubscriptionBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import { usePremiumFeature } from '@/hooks/usePremiumFeature';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { buildAuthHeaders } from '../../lib/authHeaders';
import FadeSlideIn from '@/components/FadeSlideIn';
import * as Haptics from 'expo-haptics';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Gold gradients from the app design system
const GOLD_GRADIENT_DARK = ['#FFD60A', '#DAA520'] as const;
const GOLD_GRADIENT_LIGHT = ['#B8860B', '#8B6914'] as const;

// Springy press wrapper with haptic feedback (UI only — same onPress behavior)
const ScalePress = ({
  children,
  onPress,
  style,
  activeScale = 0.96,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  activeScale?: number;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 9 }).start();

  return (
    <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// Compact follower counts: 1234 -> "1.2K"
const formatFollowerCount = (n: number): string =>
  n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

// Premium tool cards config (tint = rgb for the tier-colored gradient wash)
const PREMIUM_TOOLS = [
  {
    key: 'ai-analysis',
    icon: 'analytics' as const,
    title: 'AI Analysis',
    desc: 'AI-powered stock insights',
    tier: FEATURE_TIERS.BASIC_ANALYSIS,
    tierLabel: 'Gold',
    color: '#FFD700',
    tint: '255,215,0',
    route: '/premium/ai-analysis',
    alertTitle: 'Gold Feature',
    alertMessage: 'AI Stock Analysis requires a Gold subscription.',
  },
  {
    key: 'research',
    icon: 'document-text' as const,
    title: 'Research',
    desc: 'Pro research reports',
    tier: FEATURE_TIERS.RESEARCH_REPORTS,
    tierLabel: 'Diamond',
    color: '#B9F2FF',
    tint: '185,242,255',
    route: '/premium/research-reports',
    alertTitle: 'Diamond Feature',
    alertMessage: 'Research Reports requires a Diamond subscription.',
  },
  {
    key: 'optimizer',
    icon: 'pie-chart' as const,
    title: 'Optimizer',
    desc: 'Portfolio allocation AI',
    tier: FEATURE_TIERS.PORTFOLIO_OPTIMIZATION,
    tierLabel: 'Diamond',
    color: '#B9F2FF',
    tint: '185,242,255',
    route: '/premium/portfolio-optimizer',
    alertTitle: 'Diamond Feature',
    alertMessage: 'Portfolio Optimization requires a Diamond subscription.',
  },
];

// ===== DIRECT API CALLS =====
const API_BASE = 'https://www.wallstreetstocks.ai';

// Returns the posts array on success, [] for a genuinely empty feed, and null
// when the request FAILS — so the UI can tell "no posts" apart from "couldn't
// load" (and show a retry instead of a misleading empty state).
const fetchPosts = async (forumSlug?: string, currentUserId?: number): Promise<any[] | null> => {
  try {
    const params = new URLSearchParams();
    if (forumSlug) params.append('forum', forumSlug);
    if (currentUserId) params.append('currentUserId', currentUserId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE}/api/posts${query}`);
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
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
  } catch {
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
  } catch {
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
    throw error;
  }
};

const fetchNotifications = async (userId: number): Promise<any[]> => {
  try {
    // Add cache-busting timestamp to always get fresh data
    const timestamp = Date.now();
    const response = await fetch(`${API_BASE}/api/notifications?userId=${userId}&_t=${timestamp}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const markAllNotificationsRead = async (userId: number): Promise<void> => {
  await fetch(`${API_BASE}/api/notifications/read-all`, {
    method: 'POST',
    headers: await buildAuthHeaders(userId, { 'Content-Type': 'application/json' }),
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
  } catch {
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
    headers: await buildAuthHeaders(reporterId, { 'Content-Type': 'application/json' }),
    // Server canonical field names (it also accepts reporterId/reportedId).
    body: JSON.stringify({ userId: reporterId, reportedUserId: reportedId, reason, postId, commentId }),
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
  } catch {
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
  isVerified?: boolean;
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
  const { colors, isDark } = useTheme();
  const navRouter = useRouter();
  const searchParams = useLocalSearchParams<{ openPostId?: string; openUserId?: string }>();
  const { user: authUser, loading: authLoading } = useAuth();
  const { profile: userProfile, getDisplayName: getContextDisplayName } = useUserProfile();
  const { canAccess, withPremiumAccess } = usePremiumFeature();
  const { t } = useLanguage();

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedError, setFeedError] = useState(false);
  const postsLoadedRef = useRef(false);
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

  // Giphy State
  const [giphyModal, setGiphyModal] = useState(false);
  const [giphySearch, setGiphySearch] = useState('');
  const [giphyResults, setGiphyResults] = useState<any[]>([]);
  const [giphyLoading, setGiphyLoading] = useState(false);

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
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hiddenPosts, setHiddenPosts] = useState<number[]>([]);
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

  // Refs mirror these reactive values so the data-loading callbacks below can
  // stay referentially STABLE. Previously getUserId depended on currentUser and
  // loadPosts on hiddenPosts / fetchSuggestedUsers on posts+localFollowChanges,
  // so hiding a post or toggling a follow recreated the callback → re-fired its
  // load effect → a full refetch. The callbacks now read the latest value via
  // these refs instead of via their dependency array.
  const authUserIdRef = useRef<number | string | null>(authUser?.id ?? null);
  const currentUserRef = useRef(currentUser);
  const hiddenPostsRef = useRef(hiddenPosts);
  const postsRef = useRef(posts);
  const localFollowChangesRef = useRef(localFollowChanges);
  useEffect(() => { authUserIdRef.current = authUser?.id ?? null; }, [authUser?.id]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { hiddenPostsRef.current = hiddenPosts; }, [hiddenPosts]);
  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => { localFollowChangesRef.current = localFollowChanges; }, [localFollowChanges]);

  const getUserId = useCallback((): number | null => {
    if (authUserIdRef.current) return Number(authUserIdRef.current);
    if (currentUserRef.current?.id) return Number(currentUserRef.current.id);
    return null;
  }, []);

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

      const users = await fetchSuggestedUsersApi(userId || undefined);
      
      if (users.length > 0) {
        // Map users to SuggestedUser format and merge with local follow changes
        const mappedUsers = users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email || '',
          followers: u._count?.followers,
          isFollowing: u.isFollowing
        }));
        
        // Merge with local follow changes to preserve optimistic updates
        const mergedUsers = mappedUsers.map((user) => {
          const localChange = localFollowChangesRef.current.get(user.id);
          if (localChange !== undefined) {
            return { ...user, isFollowing: localChange };
          }
          return user;
        });
        setSuggestedUsers(mergedUsers);
      } else {
        // Fallback: get active users from posts
        const uniqueUsers = postsRef.current
          .map(p => p.user)
          .filter((user, index, self) =>
            user &&
            user.id !== getUserId() &&
            self.findIndex(u => u?.id === user.id) === index
          )
          .slice(0, 10) as SuggestedUser[];
        setSuggestedUsers(uniqueUsers);
      }
    } catch {
      // Fallback to users from posts
      const uniqueUsers = postsRef.current
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
  }, [getUserId]);

  const handleQuickFollow = async (targetUserId: number) => {
    const userId = getUserId();
    if (!userId) {
      Alert.alert(t('Error'), t('Please log in to follow users'));
      return;
    }

    if (userId === targetUserId) {
      return;
    }

    // Find the user and check current state
    const targetUser = suggestedUsers.find(u => u.id === targetUserId);
    const wasFollowing = targetUser?.isFollowing || false;
    const newFollowState = !wasFollowing;


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
      await followUserApi(userId, targetUserId);

      // Don't update from server response - trust local state (server may return stale data from replica)
      // The local follow change is tracked and will persist across re-fetches
    } catch {
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


    // For own profile, use UserProfileContext data (avoids replica lag)
    if (isOwnProfile && userProfile) {
      setSelectedProfile({
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email || '',
        username: userProfile.username,
        profileImage: userProfile.profileImage,
        bio: userProfile.bio ?? undefined,
        subscriptionTier: userProfile.subscriptionTier,
        isVerified: (userProfile as any).isVerified,
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
      } catch {
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

      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (response.ok) {
        const profileData = await response.json();

        // Use passed-in follow state from optimistic updates (more reliable than Map)
        // This preserves the UI state from suggestedUsers list
        if (passedInFollowState !== undefined && passedInFollowState !== profileData.isFollowing) {
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
    } catch {
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
      Alert.alert(t('Error'), t('Please log in to follow users'));
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
    } catch {
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
    } catch {
    }
  };

  const loadNotifications = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    setNotificationsLoading(true);
    try {
      const notifs = await fetchNotifications(userId);
      setNotifications(notifs || []);
      setUnreadCount((notifs || []).filter((n: Notification) => !n.isRead).length);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [getUserId, fetchNotifications]);

  const loadPosts = useCallback(async () => {
    try {
      // Full-screen spinner only before the first successful load; refreshes
      // keep the current feed visible.
      setLoading(!postsLoadedRef.current);
      const userId = getUserId();
      const fetchedPosts = await fetchPosts(undefined, userId || undefined);
      if (fetchedPosts === null) {
        // Request failed — keep whatever is already on screen and let the empty
        // state (if the list is empty) show a retry instead of "No posts yet".
        setFeedError(true);
      } else {
        setFeedError(false);
        postsLoadedRef.current = true;
        setPosts(fetchedPosts.filter((p: Post) => !hiddenPostsRef.current.includes(p.id)));
      }
    } catch {
      setFeedError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getUserId]);

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
    } catch {
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
    } catch {
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

    // Use the profile from UserProfileContext (already has fresh data)
    // No API call needed - avoids Neon read replica lag issues
    if (userProfile) {
      setModalUserProfile(userProfile);
      // Use getContextDisplayName() which already handles all the edge cases
      const displayName = getContextDisplayName();
      setModalUserName(displayName);
    } else {
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
        Alert.alert(t('Permission Denied'), t('We need camera roll permissions to upload images'));
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
    } catch {
      Alert.alert(t('Error'), t('Failed to pick image'));
    }
  };

  // Giphy API search (using public beta key until production key is approved)
  const GIPHY_API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY || '';

  const searchGiphy = async (query: string) => {
    if (!query.trim()) {
      // Load trending GIFs when no search query
      setGiphyLoading(true);
      try {
        const response = await fetch(
          `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=pg-13`
        );
        const data = await response.json();
        setGiphyResults(data.data || []);
      } catch {
      } finally {
        setGiphyLoading(false);
      }
      return;
    }

    setGiphyLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=pg-13`
      );
      const data = await response.json();
      setGiphyResults(data.data || []);
    } catch {
    } finally {
      setGiphyLoading(false);
    }
  };

  const handleSelectGif = (gif: any) => {
    // Use the fixed height version for better quality
    const gifUrl = gif.images?.fixed_height?.url || gif.images?.original?.url;
    if (gifUrl) {
      setNewPostImage(gifUrl);
      setGiphyModal(false);
      setGiphySearch('');
      setGiphyResults([]);
      // Reopen create post modal with the selected GIF
      setTimeout(() => {
        setCreatePostModal(true);
      }, 300);
    }
  };

  const openGiphyPicker = () => {
    // Close create post modal first to avoid modal conflict
    setCreatePostModal(false);
    setTimeout(() => {
      setGiphyModal(true);
      searchGiphy('');
    }, 300);
  };

  // Create post with image upload
  const handleCreatePost = async () => {
    
    const content = newPostContent.trim();
    if (!content) {
      Alert.alert(t('Error'), t('Please enter some content'));
      return;
    }

    const userId = getUserId();
    
    if (!userId) {
      Alert.alert(t('Error'), t('You must be logged in to post'));
      return;
    }

    setPosting(true);

    try {
      let mediaUrl: string | undefined = undefined;

      // Upload image if selected
      if (newPostImage) {
        setUploadingImage(true);
        try {
          const uploadResult = await uploadImage(newPostImage);
          mediaUrl = uploadResult.url;
        } catch (uploadError: any) {
          Alert.alert(t('Upload Failed'), uploadError?.message || t('Failed to upload image'));
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


      const newPost = await createPost(postData);

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
      Alert.alert(t('Error'), error?.message || t('Failed to create post'));
    } finally {
      setPosting(false);
    }
  };

  // Like handlers
  const handleLikePost = async (postId: number) => {
    const userId = getUserId();
    if (!userId) {
      Alert.alert(t('Error'), t('Please log in to like posts'));
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
    } catch {
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
    } catch {
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
      Alert.alert(t('Error'), t('Please log in to delete posts'));
      return;
    }

    Alert.alert(
      t('Delete Post'),
      t('Are you sure you want to delete this post? This action cannot be undone.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `https://www.wallstreetstocks.ai/api/posts/${postId}`,
                {
                  method: 'DELETE',
                  headers: await buildAuthHeaders(userId, { 'Content-Type': 'application/json' }),
                }
              );

              if (response.ok) {
                // Remove from posts list
                setPosts(prev => prev.filter(p => p.id !== postId));
                // Remove from profile posts if viewing profile
                setProfilePosts(prev => prev.filter(p => p.id !== postId));
                Alert.alert(t('Success'), t('Post deleted successfully'));
              } else {
                const data = await response.json();
                Alert.alert(t('Error'), data.error || t('Failed to delete post'));
              }
            } catch {
              Alert.alert(t('Error'), t('Failed to delete post'));
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
      Alert.alert(t('Error'), t('Please log in to vote'));
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
    } catch {
    }
  };

  // Add ticker to watchlist
  const handleAddToWatchlist = async (ticker: string) => {
    const userId = getUserId();
    if (!userId) {
      Alert.alert(t('Error'), t('Please log in to add to watchlist'));
      return;
    }

    try {
      await addToWatchlist(userId, ticker);
      Alert.alert(t('Success'), `$${ticker} ${t('added to your watchlist!')}`);
    } catch (error: any) {
      if (error?.message?.includes('already')) {
        Alert.alert(t('Info'), `$${ticker} ${t('is already in your watchlist')}`);
      } else {
        Alert.alert(t('Error'), t('Failed to add to watchlist'));
      }
    }
  };

  // Handle ticker press - open stock page or add to watchlist
  const handleTickerPress = (ticker: string) => {
    Alert.alert(
      `$${ticker}`,
      t('What would you like to do?'),
      [
        { text: t('View Stock'), onPress: () => navRouter.push(`/symbol/${ticker.toUpperCase()}` as any) },
        { text: t('Add to Watchlist'), onPress: () => handleAddToWatchlist(ticker) },
        { text: t('Search Posts'), onPress: () => {
          setSearchQuery(`$${ticker}`);
          setSearchModal(true);
          handleSearch(`$${ticker}`);
        }},
        { text: t('Cancel'), style: 'cancel' },
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
        Alert.alert(t('User not found'), `@${username} ${t("doesn't exist")}`);
      }
    } catch {
    }
  };

  // Comment handler
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    const userId = getUserId();
    if (!userId) {
      Alert.alert(t('Error'), t('Please log in to comment'));
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
      Alert.alert(t('Error'), error?.message || t('Failed to add comment'));
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
    } catch {
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
    } catch {
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
      } catch {
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
      Alert.alert(t('Error'), t('Please log in to follow users'));
      setPostOptionsModal(false);
      return;
    }

    if (userId === targetUserId) {
      Alert.alert(t('Error'), t("You can't follow yourself"));
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
        Alert.alert(t('Success'), `${t('You are now following')} ${getDisplayName(selectedPostForOptions.user)}`);
      } else {
        throw new Error('Failed to follow user');
      }
    } catch {
      Alert.alert(t('Error'), t('Failed to follow user. Please try again.'));
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
      Alert.alert(t('Error'), t('Please log in to block users'));
      setPostOptionsModal(false);
      return;
    }

    Alert.alert(
      t('Block User'),
      `${t('Are you sure you want to block')} ${targetUserName}? ${t("You won't see their posts or comments anymore.")}`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Block'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await blockUser(userId, targetUserId);
              if (result.success) {
                // Remove blocked user's posts from the feed
                setPosts(prev => prev.filter(p => p.user?.id !== targetUserId));
                Alert.alert(t('Blocked'), `${targetUserName} ${t('has been blocked')}`);
              }
            } catch {
              Alert.alert(t('Error'), t('Failed to block user. Please try again.'));
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
      Alert.alert(t('Error'), t('Please log in to mute users'));
      setPostOptionsModal(false);
      return;
    }

    try {
      const result = await muteUser(userId, targetUserId);
      if (result.success) {
        Alert.alert(t('Muted'), `${targetUserName} ${t("has been muted. You won't receive notifications from them.")}`);
      }
    } catch {
      Alert.alert(t('Error'), t('Failed to mute user. Please try again.'));
    } finally {
      setPostOptionsModal(false);
    }
  };

  const handleReportUser = () => {
    if (!selectedPostForOptions?.user) return;
    
    const targetUserName = getDisplayName(selectedPostForOptions.user);
    
    setPostOptionsModal(false);
    
    Alert.alert(
      t('Report User'),
      `${t('Why are you reporting')} ${targetUserName}?`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Spam'),
          onPress: () => submitReport('spam'),
        },
        {
          text: t('Harassment'),
          onPress: () => submitReport('harassment'),
        },
        {
          text: t('Misinformation'),
          onPress: () => submitReport('misinformation'),
        },
        {
          text: t('Other'),
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
      Alert.alert(t('Error'), t('Please log in to report users'));
      return;
    }

    try {
      await reportUser(userId, targetUserId, reason, postId);
      Alert.alert(t('Report Submitted'), t('Thank you for your report. We will review it shortly.'));
    } catch {
      Alert.alert(t('Report Submitted'), t('Thank you for your report. We will review it shortly.'));
    }
  };

  // Share Post from Options Modal
  const handleShareFromOptions = async () => {
    if (!selectedPostForOptions) return;

    const postUrl = `https://www.wallstreetstocks.ai/community/post/${selectedPostForOptions.id}`;
    const shareContent = selectedPostForOptions.content.substring(0, 100) + (selectedPostForOptions.content.length > 100 ? '...' : '');

    try {
      await Share.share({
        message: `${shareContent}\n\n${t('Check out this post on WallStreetStocks:')} ${postUrl}`,
        url: postUrl,
      });
    } catch {
    }
    setPostOptionsModal(false);
  };

  // Copy Link
  const handleCopyLink = async () => {
    if (!selectedPostForOptions) return;

    const postUrl = `https://www.wallstreetstocks.ai/community/post/${selectedPostForOptions.id}`;

    try {
      await Clipboard.setStringAsync(postUrl);
      Alert.alert(t('Copied!'), t('Post link copied to clipboard'));
    } catch {
      Alert.alert(t('Error'), t('Failed to copy link'));
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
      t('Post Hidden'),
      t("You won't see this post anymore"),
      [
        { text: t('OK'), style: 'default' },
        {
          text: t('Undo'),
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
      Alert.alert(t('Error'), t('Please log in to block users'));
      setCommentOptionsModal(false);
      return;
    }

    Alert.alert(
      t('Block User'),
      `${t('Are you sure you want to block')} ${targetUserName}? ${t("You won't see their posts or comments anymore.")}`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Block'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await blockUser(userId, targetUserId);
              if (result.success) {
                // Remove blocked user's comments
                setComments(prev => prev.filter(c => c.user?.id !== targetUserId));
                // Remove blocked user's posts from the feed
                setPosts(prev => prev.filter(p => p.user?.id !== targetUserId));
                Alert.alert(t('Blocked'), `${targetUserName} ${t('has been blocked')}`);
              }
            } catch {
              Alert.alert(t('Error'), t('Failed to block user. Please try again.'));
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
      Alert.alert(t('Error'), t('Please log in to mute users'));
      setCommentOptionsModal(false);
      return;
    }

    try {
      const result = await muteUser(userId, targetUserId);
      if (result.success) {
        Alert.alert(t('Muted'), `${targetUserName} ${t("has been muted. You won't receive notifications from them.")}`);
      }
    } catch {
      Alert.alert(t('Error'), t('Failed to mute user. Please try again.'));
    } finally {
      setCommentOptionsModal(false);
    }
  };

  const handleReportCommentUser = () => {
    if (!selectedCommentForOptions?.user) return;

    const targetUserName = getDisplayName(selectedCommentForOptions.user);

    setCommentOptionsModal(false);

    Alert.alert(
      t('Report Comment'),
      `${t('Why are you reporting this comment by')} ${targetUserName}?`,
      [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Spam'), onPress: () => submitCommentReport('spam') },
        { text: t('Harassment'), onPress: () => submitCommentReport('harassment') },
        { text: t('Misinformation'), onPress: () => submitCommentReport('misinformation') },
        { text: t('Other'), onPress: () => submitCommentReport('other') },
      ]
    );
  };

  const submitCommentReport = async (reason: string) => {
    if (!selectedCommentForOptions?.user) return;

    const userId = getUserId();
    const targetUserId = selectedCommentForOptions.user.id;
    const commentId = selectedCommentForOptions.id;

    if (!userId) {
      Alert.alert(t('Error'), t('Please log in to report'));
      return;
    }

    try {
      await reportUser(userId, targetUserId, reason, undefined, commentId);
      Alert.alert(t('Report Submitted'), t('Thank you for your report. We will review it shortly.'));
    } catch {
      Alert.alert(t('Report Submitted'), t('Thank you for your report. We will review it shortly.'));
    }
  };

  // Profile Moderation Actions
  const handleBlockFromProfile = async () => {
    if (!selectedProfile) return;

    const userId = getUserId();
    const targetUserId = selectedProfile.id;
    const targetUserName = getDisplayName(selectedProfile);

    if (!userId) {
      Alert.alert(t('Error'), t('Please log in to block users'));
      return;
    }

    Alert.alert(
      t('Block User'),
      `${t('Are you sure you want to block')} ${targetUserName}?`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Block'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await blockUser(userId, targetUserId);
              if (result.success) {
                setPosts(prev => prev.filter(p => p.user?.id !== targetUserId));
                setProfileModal(false);
                Alert.alert(t('Blocked'), `${targetUserName} ${t('has been blocked')}`);
              }
            } catch {
              Alert.alert(t('Error'), t('Failed to block user. Please try again.'));
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
      Alert.alert(t('Error'), t('Please log in to mute users'));
      return;
    }

    try {
      const result = await muteUser(userId, targetUserId);
      if (result.success) {
        Alert.alert(t('Muted'), `${targetUserName} ${t('has been muted.')}`);
      }
    } catch {
      Alert.alert(t('Error'), t('Failed to mute user. Please try again.'));
    }
  };

  const handleReportFromProfile = () => {
    if (!selectedProfile) return;

    const targetUserName = getDisplayName(selectedProfile);

    Alert.alert(
      t('Report User'),
      `${t('Why are you reporting')} ${targetUserName}?`,
      [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Spam'), onPress: () => submitProfileReport('spam') },
        { text: t('Harassment'), onPress: () => submitProfileReport('harassment') },
        { text: t('Impersonation'), onPress: () => submitProfileReport('impersonation') },
        { text: t('Other'), onPress: () => submitProfileReport('other') },
      ]
    );
  };

  const submitProfileReport = async (reason: string) => {
    if (!selectedProfile) return;

    const userId = getUserId();

    if (!userId) {
      Alert.alert(t('Error'), t('Please log in to report'));
      return;
    }

    try {
      await reportUser(userId, selectedProfile.id, reason);
      Alert.alert(t('Report Submitted'), t('Thank you for your report. We will review it shortly.'));
    } catch {
      Alert.alert(t('Report Submitted'), t('Thank you for your report. We will review it shortly.'));
    }
  };

  const handleMarkNotificationsRead = async () => {
    const userId = getUserId();
    if (!userId) return;
    
    try {
      await markAllNotificationsRead(userId);
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch {
    }
  };

  // Effects - Use combined endpoint for faster initial load
  // NOTE: Do NOT call fetchUserProfile here - UserProfileContext handles profile loading
  // Calling it here would overwrite local updates with stale API data
  useEffect(() => {
    // Wait for auth to hydrate (persisted, so ~instant) before the first load,
    // so the feed is fetched once with the correct identity — no anonymous
    // flash of blocked users' posts / missing like-status, and no double fetch.
    if (authLoading) return;
    fetchCurrentUserData();
    loadPosts(); // Direct API call to /api/posts
    loadNotifications(); // Separate call for notifications
  }, [authLoading, loadPosts, loadNotifications]);

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

  // Refresh notifications when community tab is focused
  useFocusEffect(
    useCallback(() => {
      const userId = getUserId();
      if (userId) {
        loadNotifications();
      }
    }, [getUserId, loadNotifications])
  );

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
              image: postData.imageUrl || postData.image,
              createdAt: postData.createdAt,
              _count: {
                likes: postData._count?.likes || postData.likes || 0,
                comments: postData._count?.comments || postData.commentCount || 0,
              },
              isLiked: postData.isLiked || false,
              user: postData.user || { id: postData.userId, name: null, username: null, profileImage: null, email: '' },
              userId: postData.userId,
            };
            handleOpenComments(post);
          }
        } catch {
        }
        // Clear the param
        navRouter.setParams({ openPostId: undefined } as any);
      }

      // Handle opening a specific user profile
      if (searchParams.openUserId) {
        const userId = parseInt(searchParams.openUserId, 10);

        try {
          const response = await fetch(`https://www.wallstreetstocks.ai/api/user/${userId}`);
          if (response.ok) {
            const userData = await response.json();
            handleOpenProfile(userData);
          }
        } catch {
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#B8860B" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading community...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDark ? 'transparent' : colors.borderLight }]}>
        <FadeSlideIn distance={10}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Community</Text>
        </FadeSlideIn>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={() => setSearchModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Search')}
          >
            <Ionicons name="search" size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={() => {
              loadNotifications(); // Fetch full notification list when opening modal
              setNotificationsModal(true);
              handleMarkNotificationsRead();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* My Profile Button */}
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={() => {
              const userId = getUserId();
              if (userId) {
                handleOpenProfile({ id: userId, name: null, email: '' });
              } else {
                Alert.alert(t('Not Logged In'), t('Please log in to view your profile'));
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={t('Profile')}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.text} />
          </TouchableOpacity>

        </View>
      </View>

      {/* Posts List (virtualized so off-screen posts don't render) */}
      <FlatList
        style={[styles.scrollView, { backgroundColor: colors.background }]}
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
            tintColor={colors.primary}
          />
        }
        data={posts}
        keyExtractor={(post) => String(post.id)}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListFooterComponent={<View style={{ height: 100 }} />}
        ListHeaderComponent={
          <>
        {/* Trending Tickers Section */}
        <TrendingTickers onTickerPress={handleTickerPress} />

        {/* Suggested Accounts Section */}
        {visibleSuggestedUsers.length > 0 && (
          <View style={[styles.suggestedSection, { backgroundColor: colors.background }]}>
            <View style={styles.suggestedHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionTitleIcon, { backgroundColor: isDark ? 'rgba(255,214,10,0.14)' : 'rgba(184,134,11,0.12)' }]}>
                  <Ionicons name="person-add" size={13} color={isDark ? '#FFD60A' : '#B8860B'} />
                </View>
                <Text style={[styles.suggestedTitle, { color: colors.text }]}>Accounts to Follow</Text>
              </View>
              <TouchableOpacity
                style={[styles.sectionActionPill, { backgroundColor: colors.surface }]}
                onPress={() => setDismissedUsers([])}
              >
                <Ionicons name="refresh" size={13} color={isDark ? '#FFD60A' : '#B8860B'} />
                <Text style={[styles.sectionActionText, { color: isDark ? '#FFD60A' : '#B8860B' }]}>Refresh</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedList}
            >
              {visibleSuggestedUsers.map((user, idx) => (
                <FadeSlideIn key={user.id} delay={Math.min(idx, 6) * 60} distance={10}>
                <View style={[styles.suggestedCard, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E5EA' }]}>
                  {/* Dismiss Button */}
                  <TouchableOpacity
                    style={[styles.dismissButton, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E5EA" }]}
                    onPress={() => handleDismissSuggested(user.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('Dismiss')}
                  >
                    <Ionicons name="close" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenProfile(user)}
                    style={[styles.suggestedAvatarRing, { borderColor: isDark ? 'rgba(255,214,10,0.45)' : 'rgba(184,134,11,0.35)' }]}
                  >
                    <Avatar user={user} size={56} />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleOpenProfile(user)}>
                    <Text style={[styles.suggestedName, { color: colors.text }]} numberOfLines={1}>
                      {getUserDisplayName(user)}
                    </Text>
                  </TouchableOpacity>

                  <Text style={[styles.suggestedHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                    @{getUserHandle(user)}
                  </Text>

                  {user._count?.followers !== undefined && (
                    <View style={styles.suggestedFollowersRow}>
                      <Ionicons name="people" size={11} color={colors.textTertiary} />
                      <Text style={[styles.suggestedFollowers, { color: colors.textSecondary }]}>
                        {formatFollowerCount(user._count.followers)} followers
                      </Text>
                    </View>
                  )}

                  {user.isFollowing ? (
                    <ScalePress
                      style={[styles.suggestedFollowBtn, styles.suggestedFollowingBtn, {
                        backgroundColor: 'transparent',
                        borderColor: isDark ? 'rgba(255,214,10,0.5)' : '#B8860B',
                      }]}
                      activeScale={0.93}
                      onPress={() => handleQuickFollow(user.id)}
                    >
                      <Text style={[styles.suggestedFollowText, { color: isDark ? '#FFD60A' : '#B8860B' }]}>
                        Following
                      </Text>
                    </ScalePress>
                  ) : (
                    <ScalePress activeScale={0.93} onPress={() => handleQuickFollow(user.id)}>
                      <ExpoLinearGradient
                        colors={(isDark ? GOLD_GRADIENT_DARK : GOLD_GRADIENT_LIGHT) as unknown as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.suggestedFollowBtn}
                      >
                        <Text style={[styles.suggestedFollowText, { color: isDark ? '#000' : '#FFF' }]}>
                          Follow
                        </Text>
                      </ExpoLinearGradient>
                    </ScalePress>
                  )}
                </View>
                </FadeSlideIn>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Suggested Loading State */}
        {suggestedLoading && visibleSuggestedUsers.length === 0 && (
          <View style={[styles.suggestedLoadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="small" color="#B8860B" />
          </View>
        )}

        {/* Premium Tools Section */}
        <View style={[styles.premiumSection, { backgroundColor: colors.background }]}>
          <View style={styles.premiumHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionTitleIcon, { backgroundColor: isDark ? 'rgba(255,214,10,0.14)' : 'rgba(184,134,11,0.12)' }]}>
                <Ionicons name="diamond" size={13} color={isDark ? '#FFD60A' : '#B8860B'} />
              </View>
              <Text style={[styles.premiumTitle, { color: colors.text }]}>Premium Tools</Text>
            </View>
            <TouchableOpacity
              style={[styles.sectionActionPill, { backgroundColor: colors.surface }]}
              onPress={() => navRouter.push('/(modals)/paywall' as any)}
            >
              <Ionicons name="sparkles" size={13} color={isDark ? '#FFD60A' : '#B8860B'} />
              <Text style={[styles.sectionActionText, { color: isDark ? '#FFD60A' : '#B8860B' }]}>See Plans</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.premiumList}
          >
            {PREMIUM_TOOLS.map((tool, idx) => {
              const unlocked = canAccess(tool.tier);
              return (
                <FadeSlideIn key={tool.key} delay={Math.min(idx, 6) * 60} distance={10}>
                  <ScalePress
                    style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E5EA' }]}
                    activeScale={0.95}
                    onPress={() => {
                      withPremiumAccess(
                        tool.tier,
                        () => navRouter.push(tool.route as any),
                        { alertTitle: tool.alertTitle, alertMessage: tool.alertMessage }
                      );
                    }}
                  >
                    <ExpoLinearGradient
                      colors={[`rgba(${tool.tint},${isDark ? 0.16 : 0.25})`, `rgba(${tool.tint},0.02)`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.8, y: 1 }}
                      style={styles.premiumCardGradient}
                    >
                      <View style={[styles.premiumIconContainer, { backgroundColor: tool.color }]}>
                        <Ionicons name={tool.icon} size={22} color="#1a1a1a" />
                      </View>
                      <Text style={[styles.premiumCardTitle, { color: colors.text }]}>{tool.title}</Text>
                      <Text style={[styles.premiumCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {tool.desc}
                      </Text>
                      {unlocked ? (
                        <View style={[styles.premiumStatusChip, { backgroundColor: 'rgba(0,200,83,0.14)' }]}>
                          <Ionicons name="checkmark-circle" size={11} color="#00C853" />
                          <Text style={[styles.premiumStatusText, { color: '#00C853' }]}>Unlocked</Text>
                        </View>
                      ) : (
                        <View style={[styles.premiumStatusChip, { backgroundColor: `rgba(${tool.tint},${isDark ? 0.22 : 0.45})` }]}>
                          <Ionicons name="lock-closed" size={10} color={colors.text} />
                          <Text style={[styles.premiumStatusText, { color: colors.text }]}>{tool.tierLabel}</Text>
                        </View>
                      )}
                    </ExpoLinearGradient>
                  </ScalePress>
                </FadeSlideIn>
              );
            })}
          </ScrollView>
        </View>
          </>
        }
        renderItem={({ item: post }) => (
          <View style={[styles.postCard, { backgroundColor: isDark ? colors.surface : colors.card, borderColor: isDark ? colors.borderLight : colors.border }]}>
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
                  <Text style={[styles.username, { color: colors.text }]}>
                    {getUserDisplayName(post.user)}
                  </Text>
                  <VerifiedBadge verified={(post.user as any)?.isVerified} />
                  <SubscriptionBadgeInline tier={post.user?.subscriptionTier as any} />
                  <Text style={[styles.userHandle, { color: colors.textSecondary }]}>@{getUserHandle(post.user)}</Text>
                  {post.ticker && (
                    <View style={styles.tickerBadge}>
                      <Text style={styles.tickerText}>${post.ticker}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.postMeta}>
                  <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{formatTimeAgo(post.createdAt)}</Text>
                  {post.forum && (
                    <>
                      <Text style={[styles.metaDot, { color: colors.textTertiary }]}>•</Text>
                      <Text style={[styles.forumText, { color: colors.textSecondary }]}>{post.forum.title}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
              
              {/* Three Dot Menu */}
              <TouchableOpacity
                style={styles.postOptionsButton}
                onPress={() => handleOpenPostOptions(post)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={t('More options')}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Post Title */}
            {post.title && post.title !== post.content && (
              <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
            )}

            {/* Post Content */}
            <FormattedContent 
              content={post.content}
              onTickerPress={handleTickerPress}
              onMentionPress={handleMentionPress}
              style={[styles.postContent, { color: colors.text }]}
            />

            {/* Ticker Pills */}
            {post.tickers && post.tickers.length > 0 && (
              <View style={styles.tickerPillsContainer}>
                {post.tickers.map((ticker) => (
                  <TouchableOpacity
                    key={ticker}
                    style={[styles.tickerPill, { backgroundColor: isDark ? "rgba(184, 134, 11,0.15)" : "#F6EEDA" }]}
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
              <View style={[styles.sentimentContainer, { borderTopColor: colors.borderLight }]}>
                <TouchableOpacity
                  style={[
                    styles.sentimentButton,
                    post.sentiment.userVote === 'bullish' && styles.sentimentButtonBullishActive
                  ]}
                  onPress={() => handleVoteSentiment(post.id, 'bullish')}
                  accessibilityRole="button"
                  accessibilityLabel={t('Bullish')}
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
                  accessibilityRole="button"
                  accessibilityLabel={t('Bearish')}
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
            <View style={[styles.postActions, { borderTopColor: isDark ? "transparent" : "#E5E5EA" }]}>
              <TouchableOpacity
                style={[styles.actionButton]}
                onPress={() => handleLikePost(post.id)}
                accessibilityRole="button"
                accessibilityLabel={t('Like')}
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
                style={[styles.actionButton]}
                onPress={() => handleOpenComments(post)}
                accessibilityRole="button"
                accessibilityLabel={t('Comments')}
              >
                <Ionicons name="chatbubble-outline" size={20} color={colors.textTertiary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post._count?.comments || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton]}
                onPress={() => handleSharePost(post)}
                accessibilityRole="button"
                accessibilityLabel={t('Share')}
              >
                <Ionicons name="share-outline" size={22} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Delete button - only show for own posts */}
              {post.userId === getUserId() && (
                <TouchableOpacity
                  style={[styles.actionButton]}
                  onPress={() => handleDeletePost(post.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('Delete')}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? null : feedError ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>{t("Couldn't load posts")}</Text>
              <Text style={styles.emptySubtitle}>{t('Check your connection and try again.')}</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => loadPosts()}
              >
                <Text style={styles.emptyButtonText}>{t('Retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>{t('No posts yet')}</Text>
              <Text style={styles.emptySubtitle}>{t('Be the first to share something!')}</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={openCreatePostModal}
              >
                <Text style={styles.emptyButtonText}>{t('Create Post')}</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openCreatePostModal}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('Create Post')}
      >
        <Ionicons name="add" size={32} color={colors.text} />
      </TouchableOpacity>

      {/* PROFILE MODAL */}
      <Modal
        visible={profileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProfileModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]} key={`profile-${selectedProfile?.id}-${selectedProfile?.username}`}>
          <View style={[styles.profileHeader, { backgroundColor: colors.background, borderBottomColor: isDark ? "transparent" : "#E5E5EA" }]}>
            <TouchableOpacity
              onPress={() => setProfileModal(false)}
              style={styles.profileCloseButton}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.profileHeaderTitle, { color: colors.text }]}>{t('Profile')}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={[styles.profileContent, { backgroundColor: colors.card }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Show loading state while fetching fresh profile data */}
            {!selectedProfile && profileLoading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                <ActivityIndicator size="large" color="#B8860B" />
                <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>{t('Loading profile...')}</Text>
              </View>
            ) : (
            <>
            {/* Profile Info Section */}
            <View style={[styles.profileInfoSection, { backgroundColor: colors.background }]}>
              <View style={styles.profileAvatarContainer}>
                <Avatar user={selectedProfile} size={100} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {getUserDisplayName(selectedProfile)}
                </Text>
                <VerifiedBadge verified={(selectedProfile as any)?.isVerified} size={16} />
                <SubscriptionBadgeInline tier={selectedProfile?.subscriptionTier as any} />
                {profileLoading && (
                  <ActivityIndicator size="small" color="#B8860B" style={{ marginLeft: 8 }} />
                )}
              </View>

              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>@{getUserHandle(selectedProfile)}</Text>

              {selectedProfile?.bio && (
                <Text style={[styles.profileBio, { color: colors.textSecondary }]}>{selectedProfile.bio}</Text>
              )}

              {selectedProfile?.createdAt && (
                <View style={styles.profileJoinDate}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                  <Text style={[styles.profileJoinDateText, { color: colors.textSecondary }]}>
                    {t('Joined')} {formatJoinDate(selectedProfile.createdAt)}
                  </Text>
                </View>
              )}

              {/* Stats */}
              <View style={[styles.profileStats, { backgroundColor: colors.surface }]}>
                <View style={styles.profileStat}>
                  <Text style={[styles.profileStatNumber, { color: colors.text }]}>
                    {selectedProfile?._count?.posts || profilePosts.length || 0}
                  </Text>
                  <Text style={[styles.profileStatLabel, { color: colors.textSecondary }]}>{t('Posts')}</Text>
                </View>
                <View style={[styles.profileStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.profileStat}>
                  <Text style={[styles.profileStatNumber, { color: colors.text }]}>
                    {selectedProfile?._count?.followers || 0}
                  </Text>
                  <Text style={[styles.profileStatLabel, { color: colors.textSecondary }]}>{t('Followers')}</Text>
                </View>
                <View style={[styles.profileStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.profileStat}>
                  <Text style={[styles.profileStatNumber, { color: colors.text }]}>
                    {selectedProfile?._count?.following || 0}
                  </Text>
                  <Text style={[styles.profileStatLabel, { color: colors.textSecondary }]}>{t('Following')}</Text>
                </View>
              </View>

              {/* Follow & Message Buttons - Show for other users */}
              {selectedProfile?.id !== getUserId() && (
                <View style={styles.profileActionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      selectedProfile?.isFollowing && [styles.followingButton, { backgroundColor: isDark ? 'transparent' : '#FFF' }],
                    ]}
                    onPress={handleFollowUser}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color={selectedProfile?.isFollowing ? "#B8860B" : "#FFF"} />
                    ) : (
                      <>
                        <Ionicons
                          name={selectedProfile?.isFollowing ? "checkmark" : "person-add-outline"}
                          size={18}
                          color={selectedProfile?.isFollowing ? "#B8860B" : "#FFF"}
                        />
                        <Text style={[
                          styles.followButtonText,
                          selectedProfile?.isFollowing && styles.followingButtonText
                        ]}>
                          {selectedProfile?.isFollowing ? t('Following') : t('Follow')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Message Button */}
                  <TouchableOpacity
                    style={[styles.messageButton, { backgroundColor: isDark ? "transparent" : "#FFF" }]}
                    onPress={() => {
                      if (selectedProfile?.id) {
                        setProfileModal(false);
                        navRouter.push(`/messages/new?recipientId=${selectedProfile.id}`);
                      }
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#B8860B" />
                    <Text style={[styles.messageButtonText, { color: colors.primary }]}>Message</Text>
                  </TouchableOpacity>

                  {/* More Options Button */}
                  <TouchableOpacity
                    style={[styles.profileMoreButton, { backgroundColor: colors.surface }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('More options')}
                    onPress={() => {
                      Alert.alert(
                        getDisplayName(selectedProfile),
                        t('Choose an action'),
                        [
                          { text: t('Cancel'), style: 'cancel' },
                          {
                            text: t('Mute'),
                            onPress: handleMuteFromProfile,
                          },
                          {
                            text: t('Block'),
                            style: 'destructive',
                            onPress: handleBlockFromProfile,
                          },
                          {
                            text: t('Report'),
                            style: 'destructive',
                            onPress: handleReportFromProfile,
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={22} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Edit Profile Button - Show for own profile */}
              {selectedProfile?.id === getUserId() && (
                <TouchableOpacity
                  style={[styles.editProfileButton, { backgroundColor: isDark ? "transparent" : "#FFF" }]}
                  onPress={() => {
                    setProfileModal(false);
                    navRouter.push('/profile/edit-profile');
                  }}
                >
                  <Ionicons name="create-outline" size={18} color="#B8860B" />
                  <Text style={[styles.editProfileButtonText, { color: colors.primary }]}>Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* User's Posts */}
            <View style={[styles.profilePostsSection, { backgroundColor: colors.background }]}>
              <Text style={[styles.profilePostsTitle, { color: colors.text }]}>Posts</Text>
              
              {profileLoading ? (
                <ActivityIndicator size="large" color="#B8860B" style={{ marginTop: 40 }} />
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
                      <Text style={[styles.profilePostTitle, { color: colors.text }]}>{post.title}</Text>
                    )}
                    <Text style={[styles.profilePostContent, { color: colors.textSecondary }]} numberOfLines={3}>
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
                      <Text style={[styles.profilePostTime, { color: colors.textSecondary }]}>{formatTimeAgo(post.createdAt)}</Text>
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
                          <Ionicons name="chatbubble-outline" size={16} color={colors.textTertiary} />
                          <Text style={[styles.profilePostStatText, { color: colors.textSecondary }]}>{post._count?.comments || 0}</Text>
                        </View>
                        {/* Delete button - only show for own posts */}
                        {post.userId === getUserId() && (
                          <TouchableOpacity
                            style={styles.profilePostStat}
                            onPress={() => handleDeletePost(post.id)}
                            accessibilityRole="button"
                            accessibilityLabel={t('Delete')}
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
                  <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.noProfilePostsText, { color: colors.textSecondary }]}>No posts yet</Text>
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
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.background, borderBottomColor: isDark ? "transparent" : "#E5E5EA" }]}>
            <TouchableOpacity onPress={() => setCreatePostModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Post</Text>
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
              <Text style={[styles.createPostUsername, { color: colors.text }]}>
                {modalUserName}
              </Text>
            </View>

            {/* Title Input */}
            <TextInput
              style={[styles.titleInput, { color: colors.text }]}
              placeholder={t('Title (optional)')}
              placeholderTextColor={colors.textTertiary}
              value={newPostTitle}
              onChangeText={setNewPostTitle}
              maxLength={100}
            />

            {/* Content Input */}
            <TextInput
              style={[styles.contentInput, { color: colors.text }]}
              placeholder={t("What's happening in the markets?")}
              placeholderTextColor={colors.textTertiary}
              multiline
              value={newPostContent}
              onChangeText={setNewPostContent}
            />

            {/* Ticker Input */}
            <View style={styles.tickerInputContainer}>
              <Ionicons name="pricetag-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={styles.tickerInput}
                placeholder={t('Add ticker (e.g., AAPL)')}
                placeholderTextColor={colors.textTertiary}
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
                  accessibilityRole="button"
                  accessibilityLabel={t('Remove image')}
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

            <View style={styles.mediaButtonsRow}>
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={pickImage}
                accessibilityRole="button"
                accessibilityLabel={t('Add image')}
              >
                <Ionicons name="image-outline" size={24} color="#B8860B" />
                <Text style={styles.addImageText}>{t('Image')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={openGiphyPicker}
                accessibilityRole="button"
                accessibilityLabel={t('Add GIF')}
              >
                <Text style={styles.gifButtonText}>GIF</Text>
              </TouchableOpacity>
            </View>
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
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.searchHeader, { backgroundColor: colors.background, borderBottomColor: isDark ? "transparent" : "#E5E5EA" }]}>
            <TouchableOpacity
              onPress={() => setSearchModal(false)}
              accessibilityRole="button"
              accessibilityLabel={t('Back')}
            >
              <Ionicons name="arrow-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('Search posts, tickers...')}
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel={t('Clear search')}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={styles.searchResults}>
            {searchLoading ? (
              <ActivityIndicator size="large" color="#B8860B" style={{ marginTop: 40 }} />
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
                    <Text style={[styles.searchResultUsername, { color: colors.text }]}>
                      {getUserDisplayName(post.user)}
                    </Text>
                    <Text style={[styles.searchResultText, { color: colors.textSecondary }]} numberOfLines={2}>{post.content}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : searchQuery.length > 0 ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
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
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.background, borderBottomColor: isDark ? "transparent" : "#E5E5EA" }]}>
            <TouchableOpacity
              onPress={() => setNotificationsModal(false)}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Notifications</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.notificationsList}>
            {notificationsLoading ? (
              <View style={styles.emptyNotifications}>
                <ActivityIndicator size="large" color="#B8860B" />
                <Text style={[styles.emptyTitle, { marginTop: 12 }]}>Loading...</Text>
              </View>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.notificationItem, !notif.isRead && styles.notificationUnread]}
                  onPress={() => handleNotificationTap(notif)}
                  activeOpacity={0.7}
                >
                  <Avatar user={notif.fromUser} size={44} />
                  <View style={styles.notificationContent}>
                    <Text style={[styles.notificationText, { color: colors.text }]}>
                      <Text style={styles.notificationUsername}>
                        {getDisplayName(notif.fromUser)}
                      </Text>
                      {notif.type === 'like' && ' liked your post'}
                      {notif.type === 'comment' && ' commented on your post'}
                      {notif.type === 'follow' && ' started following you'}
                      {notif.type === 'mention' && ' mentioned you'}
                    </Text>
                    <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>{formatTimeAgo(notif.createdAt)}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-outline" size={48} color={colors.textTertiary} />
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
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.background, borderBottomColor: isDark ? "transparent" : "#E5E5EA" }]}>
            <TouchableOpacity
              onPress={() => setCommentsModal(false)}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Comments</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.commentsList} keyboardShouldPersistTaps="handled">
            {selectedPost && (
              <View style={[styles.originalPost, { borderBottomColor: colors.borderLight }]}>
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
                    <Text style={[styles.username, { color: colors.text }]}>
                      {getUserDisplayName(selectedPost.user)}
                    </Text>
                    <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{formatTimeAgo(selectedPost.createdAt)}</Text>
                  </TouchableOpacity>
                </View>
                {selectedPost.title && <Text style={[styles.postTitle, { color: colors.text }]}>{selectedPost.title}</Text>}
                <Text style={[styles.postContent, { color: colors.text }]}>{selectedPost.content}</Text>
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
                  <View style={[styles.postInsights, { borderTopColor: colors.border }]}>
                    <View style={styles.insightItem}>
                      <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                        {postInsights.totalViews} {postInsights.totalViews === 1 ? 'view' : 'views'}
                      </Text>
                    </View>
                    {postInsights.uniqueViewers > 0 && (
                      <View style={styles.insightItem}>
                        <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                          {postInsights.uniqueViewers} {postInsights.uniqueViewers === 1 ? 'viewer' : 'viewers'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {commentsLoading ? (
              <ActivityIndicator size="large" color="#B8860B" style={{ marginTop: 20 }} />
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
                    <View style={[styles.commentBubble, { backgroundColor: colors.surface }]}>
                      <TouchableOpacity
                        onPress={() => {
                          setCommentsModal(false);
                          setTimeout(() => handleOpenProfile(comment.user!), 300);
                        }}
                        activeOpacity={0.7}
                        style={styles.commentUserRow}
                      >
                        <Text style={[styles.commentUsername, { color: colors.text }]}>
                          {getUserDisplayName(comment.user!)}
                        </Text>
                        <VerifiedBadge verified={(comment.user as any)?.isVerified} size={12} />
                        <SubscriptionBadgeInline tier={comment.user?.subscriptionTier as any} />
                        <Text style={[styles.commentHandle, { color: colors.textTertiary }]}>@{getUserHandle(comment.user!)}</Text>
                      </TouchableOpacity>
                      <Text style={[styles.commentText, { color: colors.text }]}>{comment.content}</Text>
                    </View>
                    <View style={styles.commentMeta}>
                      <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{formatTimeAgo(comment.createdAt)}</Text>
                      <TouchableOpacity
                        style={styles.commentLikeButton}
                        onPress={() => handleLikeComment(comment.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t('Like')}
                      >
                        <Ionicons
                          name={comment.isLiked ? "heart" : "heart-outline"}
                          size={14}
                          color={comment.isLiked ? "#FF3B30" : "#8E8E93"}
                        />
                        <Text style={[styles.commentLikeCount, { color: colors.textSecondary }]}>{comment._count?.likes ?? 0}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.commentOptionsButton}
                        onPress={() => handleOpenCommentOptions(comment)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel={t('More options')}
                      >
                        <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noComments}>
                <Text style={[styles.noCommentsText, { color: colors.textTertiary }]}>No comments yet. Be the first!</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.commentInputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <Avatar user={authUser as User | null | undefined} size={36} />
            <View style={[styles.commentInputWrapper, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.commentInput, { color: colors.text }]}
                placeholder={t('Add a comment...')}
                placeholderTextColor={colors.textTertiary}
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
              accessibilityRole="button"
              accessibilityLabel={t('Send')}
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
          <View style={[styles.optionsModalContainer, { backgroundColor: colors.card }]}>
            {/* User Info Header */}
            {selectedPostForOptions?.user && (
              <View style={[styles.optionsUserHeader, { borderBottomColor: colors.borderLight }]}>
                <Avatar user={selectedPostForOptions.user} size={40} />
                <View style={styles.optionsUserInfo}>
                  <Text style={[styles.optionsUserName, { color: colors.text }]}>
                    {getUserDisplayName(selectedPostForOptions.user)}
                  </Text>
                  <Text style={[styles.optionsUserHandle, { color: colors.textTertiary }]}>
                    @{getUserHandle(selectedPostForOptions.user)}
                  </Text>
                </View>
              </View>
            )}

            {/* Options List */}
            <View style={styles.optionsList}>
              {/* Share Option */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: colors.borderLight }]}
                onPress={handleShareFromOptions}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#F6EEDA' }]}>
                  <Ionicons name="share-outline" size={20} color="#B8860B" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Share Post</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Copy Link Option */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: colors.borderLight }]}
                onPress={handleCopyLink}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#E8EAF6' }]}>
                  <Ionicons name="link-outline" size={20} color="#5C6BC0" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Copy Link</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Not Interested Option */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: colors.borderLight }]}
                onPress={handleNotInterested}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#F5F5F5' }]}>
                  <Ionicons name="eye-off-outline" size={20} color="#757575" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Not Interested</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Divider */}
              <View style={[styles.optionsDivider, { backgroundColor: colors.borderLight }]} />

              {/* Follow Option */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: colors.borderLight }]}
                onPress={handleFollowFromOptions}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="person-add-outline" size={20} color="#4CAF50" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Follow @{selectedPostForOptions?.user ? getUserHandle(selectedPostForOptions.user) : ''}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Mute Option */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: colors.borderLight }]}
                onPress={handleMuteUser}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="volume-mute-outline" size={20} color="#FF9800" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Mute @{selectedPostForOptions?.user ? getUserHandle(selectedPostForOptions.user) : ''}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Block Option */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: colors.borderLight }]}
                onPress={handleBlockUser}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="ban-outline" size={20} color="#F44336" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Block @{selectedPostForOptions?.user ? getUserHandle(selectedPostForOptions.user) : ''}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
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
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity 
              style={[styles.optionsCancelButton, { backgroundColor: colors.surface }]}
              onPress={() => setPostOptionsModal(false)}
            >
              <Text style={[styles.optionsCancelText, { color: colors.primary }]}>Cancel</Text>
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
          <View style={[styles.optionsModalContainer, { backgroundColor: colors.card }]}>
            {/* User Info Header */}
            {selectedCommentForOptions?.user && (
              <View style={[styles.optionsUserHeader, { borderBottomColor: colors.borderLight }]}>
                <Avatar user={selectedCommentForOptions.user} size={40} />
                <View style={styles.optionsUserInfo}>
                  <Text style={[styles.optionsUserName, { color: colors.text }]}>
                    {getUserDisplayName(selectedCommentForOptions.user)}
                  </Text>
                  <Text style={[styles.optionsUserHandle, { color: colors.textTertiary }]}>
                    @{getUserHandle(selectedCommentForOptions.user)}
                  </Text>
                </View>
              </View>
            )}

            {/* Options List */}
            <View style={styles.optionsList}>
              {/* Mute Option */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: colors.borderLight }]}
                onPress={handleMuteCommentUser}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="volume-mute-outline" size={20} color="#FF9800" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Mute @{selectedCommentForOptions?.user ? getUserHandle(selectedCommentForOptions.user) : ''}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Block Option */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: colors.borderLight }]}
                onPress={handleBlockCommentUser}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="ban-outline" size={20} color="#F44336" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Block @{selectedCommentForOptions?.user ? getUserHandle(selectedCommentForOptions.user) : ''}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
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
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.optionsCancelButton, { backgroundColor: colors.surface }]}
              onPress={() => setCommentOptionsModal(false)}
            >
              <Text style={[styles.optionsCancelText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* GIPHY PICKER MODAL */}
      <Modal
        visible={giphyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setGiphyModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.giphyHeader}>
            <TouchableOpacity
              onPress={() => setGiphyModal(false)}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.giphyTitle}>Choose a GIF</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.giphySearchContainer}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.giphySearchInput}
              placeholder={t('Search GIFs...')}
              placeholderTextColor={colors.textTertiary}
              value={giphySearch}
              onChangeText={(text) => {
                setGiphySearch(text);
                searchGiphy(text);
              }}
              autoCorrect={false}
            />
            {giphySearch.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('Clear search')}
                onPress={() => {
                setGiphySearch('');
                searchGiphy('');
              }}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {giphyLoading ? (
            <ActivityIndicator size="large" color="#B8860B" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.giphyGrid}>
              {giphyResults.map((gif) => (
                <TouchableOpacity
                  key={gif.id}
                  style={styles.giphyItem}
                  onPress={() => handleSelectGif(gif)}
                >
                  <Image
                    source={{ uri: gif.images?.fixed_height_small?.url || gif.images?.preview_gif?.url }}
                    style={styles.giphyImage}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.giphyAttribution}>
            <Text style={styles.giphyAttributionText}>Powered by GIPHY</Text>
          </View>
        </View>
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
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
            >
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageViewerActionButton}
              accessibilityRole="button"
              accessibilityLabel={t('Share')}
              onPress={async () => {
                if (selectedImage) {
                  try {
                    await Share.share({
                      url: selectedImage,
                      message: t('Check out this image from WallStreetStocks'),
                    });
                  } catch {
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
    backgroundColor: '#B8860B',
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
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.3,
  },
  premiumList: {
    paddingHorizontal: 12,
    gap: 10,
    paddingVertical: 4,
  },
  premiumCard: {
    width: 150,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumCardGradient: {
    padding: 14,
    alignItems: 'center',
  },
  premiumStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 10,
  },
  premiumStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  premiumIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  premiumCardDesc: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 15,
  },
  suggestedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  suggestedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 15,
    color: '#B8860B',
    fontWeight: '500',
  },
  suggestedList: {
    paddingHorizontal: 12,
    gap: 10,
    paddingVertical: 4,
  },
  suggestedCard: {
    width: 150,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
  suggestedAvatarRing: {
    marginTop: 6,
    marginBottom: 4,
    padding: 3,
    borderWidth: 1.5,
    borderRadius: 34,
  },
  suggestedName: {
    fontSize: 14,
    fontWeight: '700',
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
  suggestedFollowersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  suggestedFollowers: {
    fontSize: 11,
    color: '#8E8E93',
  },
  suggestedFollowBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 18,
    marginTop: 12,
    minWidth: 104,
    alignItems: 'center',
  },
  suggestedFollowingBtn: {
    borderWidth: 1.5,
  },
  suggestedFollowText: {
    fontSize: 13,
    fontWeight: '700',
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
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
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
    backgroundColor: '#B8860B',
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
    backgroundColor: '#B8860B',
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
    bottom: 90,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
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
    color: '#B8860B',
  },
  postButton: {
    backgroundColor: '#B8860B',
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
    backgroundColor: '#B8860B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    minWidth: 140,
  },
  followingButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#B8860B',
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  followingButtonText: {
    color: '#B8860B',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#B8860B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B8860B',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#B8860B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    minWidth: 140,
  },
  editProfileButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B8860B',
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
    backgroundColor: '#B8860B',
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
    ...StyleSheet.absoluteFill,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B8860B',
    borderStyle: 'dashed',
    gap: 8,
  },
  addImageText: {
    fontSize: 16,
    color: '#B8860B',
    fontWeight: '600',
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  gifButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B8860B',
  },

  // Giphy Picker
  giphyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  giphyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  giphySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  giphySearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  giphyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  giphyItem: {
    width: (SCREEN_WIDTH - 40) / 2,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  giphyImage: {
    width: '100%',
    height: '100%',
  },
  giphyAttribution: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  giphyAttributionText: {
    fontSize: 12,
    color: '#8E8E93',
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
    backgroundColor: '#B8860B',
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
    color: '#B8860B',
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
    ...StyleSheet.absoluteFill,
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
    backgroundColor: '#F6EEDA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tickerPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B8860B',
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
