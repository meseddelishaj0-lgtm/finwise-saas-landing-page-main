// services/communityApi.ts
// React Native API client for Next.js backend - Optimized with caching

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ===== CONFIGURATION =====
const API_BASE_URL = 'https://www.wallstreetstocks.ai';

// ===== AUTH TOKEN CACHING (5-minute TTL) =====
let cachedAuthToken: { value: string | null; timestamp: number } | null = null;
const AUTH_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

const getAuthToken = async (): Promise<string | null> => {
  const now = Date.now();

  // Return cached token if still valid
  if (cachedAuthToken && now - cachedAuthToken.timestamp < AUTH_TOKEN_TTL) {
    return cachedAuthToken.value;
  }

  try {
    const token = await AsyncStorage.getItem('authToken');
    cachedAuthToken = { value: token, timestamp: now };
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Invalidate cached token (call on logout)
export const invalidateAuthTokenCache = (): void => {
  cachedAuthToken = null;
};

// ===== REQUEST DEDUPLICATION =====
const pendingRequests = new Map<string, Promise<any>>();

// Generate cache key for request deduplication
const getRequestKey = (endpoint: string, method: string, body?: string): string => {
  return `${method}:${endpoint}:${body || ''}`;
};

export const storeAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('authToken', token);
    // Update cache immediately
    cachedAuthToken = { value: token, timestamp: Date.now() };
  } catch (error) {
    console.error('Error storing auth token:', error);
  }
};

export const clearAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('authToken');
    // Invalidate cache
    invalidateAuthTokenCache();
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
};

// ===== API REQUEST HELPER =====

const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const method = options.method || 'GET';
  const body = options.body as string | undefined;

  // Deduplicate GET requests - reuse in-flight requests
  if (method === 'GET') {
    const requestKey = getRequestKey(endpoint, method, body);
    const pending = pendingRequests.get(requestKey);
    if (pending) {
      console.log(`🔄 Reusing in-flight request: ${endpoint}`);
      return pending;
    }
  }

  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const requestPromise = (async () => {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`🌐 API Request: ${method} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📡 Response Status: ${response.status}`);

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (!responseText || responseText.trim() === '') {
        return { success: true };
      }

      try {
        const data = JSON.parse(responseText);
        return data;
      } catch (parseError) {
        console.error('⚠️ JSON Parse Error:', parseError);
        return { success: true, raw: responseText };
      }
    } catch (error: any) {
      console.error(`💥 API Request Failed: ${endpoint}`, error?.message || error);
      throw error;
    }
  })();

  // Track GET requests for deduplication
  if (method === 'GET') {
    const requestKey = getRequestKey(endpoint, method, body);
    pendingRequests.set(requestKey, requestPromise);

    // Remove from pending after completion
    requestPromise.finally(() => {
      pendingRequests.delete(requestKey);
    });
  }

  return requestPromise;
};

// ===== POSTS API =====

export const fetchPosts = async (forumSlug?: string, currentUserId?: number): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    if (forumSlug) params.append('forum', forumSlug);
    if (currentUserId) params.append('currentUserId', currentUserId.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const result = await apiRequest(`/api/posts${query}`, { method: 'GET' });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
};

// Combined home feed endpoint - fetches posts, notifications count, and unread messages in one call
// Uses Edge Runtime and caching for faster response
export const fetchHomeFeed = async (userId?: number): Promise<{
  posts: any[];
  notificationsCount: number;
  unreadMessagesCount: number;
  cachedAt: string;
}> => {
  try {
    const params = userId ? `?userId=${userId}` : '';
    const result = await apiRequest(`/api/mobile/home-feed${params}`, { method: 'GET' });
    return {
      posts: Array.isArray(result.posts) ? result.posts : [],
      notificationsCount: result.notificationsCount || 0,
      unreadMessagesCount: result.unreadMessagesCount || 0,
      cachedAt: result.cachedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching home feed:', error);
    return {
      posts: [],
      notificationsCount: 0,
      unreadMessagesCount: 0,
      cachedAt: new Date().toISOString(),
    };
  }
};

export const createPost = async (data: {
  title: string;
  content: string;
  forumId: number;
  userId: number;
  ticker?: string;
  mediaUrl?: string;
}): Promise<any> => {
  console.log('🚀 createPost called');
  
  const payload = {
    title: String(data.title || ''),
    content: String(data.content || ''),
    forumId: Number(data.forumId) || 1,
    userId: Number(data.userId),
    ...(data.ticker && { ticker: String(data.ticker) }),
    ...(data.mediaUrl && { mediaUrl: String(data.mediaUrl) }),
  };
  
  console.log('📤 Payload:', JSON.stringify(payload));

  const result = await apiRequest('/api/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  console.log('🎉 Post created successfully');
  return result;
};

export const deletePost = async (postId: string, userId: number): Promise<any> => {
  return apiRequest(`/api/posts/${postId}?userId=${userId}`, {
    method: 'DELETE',
  });
};

export const searchPosts = async (query: string, ticker?: string): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (ticker) params.append('ticker', ticker);
    
    const result = await apiRequest(`/api/posts/search?${params.toString()}`, { 
      method: 'GET' 
    });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error searching posts:', error);
    return [];
  }
};

// ===== COMMENTS API =====

export const fetchComments = async (postId: string): Promise<any[]> => {
  try {
    const result = await apiRequest(`/api/comments?postId=${postId}`, { method: 'GET' });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
};

export const createComment = async (postId: string, content: string, userId: number): Promise<any> => {
  return apiRequest('/api/comments', {
    method: 'POST',
    body: JSON.stringify({ 
      postId: Number(postId), 
      content, 
      userId: Number(userId) 
    }),
  });
};

export const deleteComment = async (commentId: string, userId: number): Promise<any> => {
  return apiRequest(`/api/comments/${commentId}?userId=${userId}`, {
    method: 'DELETE',
  });
};

// ===== LIKES API =====

export const likePost = async (postId: string, userId: number): Promise<{ liked: boolean; likesCount?: number }> => {
  try {
    console.log('👍 Liking post:', postId);
    const result = await apiRequest('/api/likes', {
      method: 'POST',
      body: JSON.stringify({ 
        postId: Number(postId), 
        userId: Number(userId) 
      }),
    });
    
    return {
      liked: result?.liked ?? result?.isLiked ?? true,
      likesCount: result?.likesCount ?? result?.count ?? undefined
    };
  } catch (error) {
    console.error('❌ Error liking post:', error);
    throw error;
  }
};

export const likeComment = async (commentId: string, userId: number): Promise<{ liked: boolean; likesCount?: number }> => {
  try {
    console.log('👍 Liking comment:', commentId);
    const result = await apiRequest('/api/likes', {
      method: 'POST',
      body: JSON.stringify({ 
        commentId: Number(commentId), 
        userId: Number(userId) 
      }),
    });
    
    return {
      liked: result?.liked ?? result?.isLiked ?? true,
      likesCount: result?.likesCount ?? result?.count ?? undefined
    };
  } catch (error) {
    console.error('❌ Error liking comment:', error);
    throw error;
  }
};

// ===== NOTIFICATIONS API =====

export const fetchNotifications = async (userId: number): Promise<any[]> => {
  try {
    if (!userId) return [];
    const result = await apiRequest(`/api/notifications?userId=${userId}`, { method: 'GET' });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const markAllNotificationsRead = async (userId: number): Promise<any> => {
  return apiRequest('/api/notifications/read-all', {
    method: 'POST',
    body: JSON.stringify({ userId: Number(userId) }),
  });
};

// ===== FOLLOWS API =====

export const followUser = async (targetUserId: string, userId: number): Promise<any> => {
  try {
    console.log('👤 Following user:', targetUserId, 'by user:', userId);
    const result = await apiRequest('/api/follows', {
      method: 'POST',
      body: JSON.stringify({
        followerId: Number(userId),      // Current user is the follower
        followingId: Number(targetUserId) // Target user is being followed
      }),
    });
    console.log('👤 Follow result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error following user:', error);
    throw error;
  }
};

export const unfollowUser = async (targetUserId: string, userId: number): Promise<any> => {
  try {
    console.log('👤 Unfollowing user:', targetUserId, 'by user:', userId);
    const result = await apiRequest('/api/follows', {
      method: 'DELETE',
      body: JSON.stringify({
        followerId: Number(userId),
        followingId: Number(targetUserId)
      }),
    });
    console.log('👤 Unfollow result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error unfollowing user:', error);
    throw error;
  }
};

export const getFollowers = async (userId: string): Promise<any[]> => {
  try {
    const result = await apiRequest(`/api/follows/followers/${userId}`, { method: 'GET' });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error getting followers:', error);
    return [];
  }
};

export const getFollowing = async (userId: string): Promise<any[]> => {
  try {
    const result = await apiRequest(`/api/follows/following/${userId}`, { method: 'GET' });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error getting following:', error);
    return [];
  }
};

// ===== AUTH API =====

export const getCurrentUser = async (): Promise<any> => {
  try {
    return await apiRequest('/api/auth/session', { method: 'GET' });
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// ===== IMAGE UPLOAD =====

export const uploadImage = async (uri: string): Promise<{ url: string }> => {
  console.log('📷 Starting image upload...');
  console.log('📍 Image URI:', uri);

  const formData = new FormData();
  const filename = uri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const extension = match ? match[1].toLowerCase() : 'jpg';
  
  const mimeTypes: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };
  const type = mimeTypes[extension] || 'image/jpeg';

  console.log('📦 File info:', { filename, extension, type });

  // Format URI correctly for each platform
  const fileUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;

  formData.append('file', {
    uri: fileUri,
    name: filename,
    type: type,
  } as any);

  const token = await getAuthToken();

  try {
    console.log('🌐 Uploading to:', `${API_BASE_URL}/api/upload`);
    
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    console.log('📡 Upload response status:', response.status);

    const responseText = await response.text();
    console.log('📄 Upload response:', responseText?.substring(0, 200));

    if (!response.ok) {
      let errorMsg = `Upload failed with status ${response.status}`;
      try {
        const errData = JSON.parse(responseText);
        errorMsg = errData.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const result = JSON.parse(responseText);
    console.log('✅ Upload successful, URL:', result.url);
    
    if (!result.url) {
      throw new Error('No URL in upload response');
    }
    
    return { url: result.url };
  } catch (error: any) {
    console.error('❌ Upload error:', error?.message || error);
    throw error;
  }
};

// ===== SENTIMENT API =====

export const voteSentiment = async (userId: number, postId: number, type: 'bullish' | 'bearish'): Promise<any> => {
  return apiRequest('/api/sentiment', {
    method: 'POST',
    body: JSON.stringify({ userId, postId, type }),
  });
};

export const getSentiment = async (postId: number, userId?: number): Promise<any> => {
  let url = `/api/sentiment?postId=${postId}`;
  if (userId) url += `&userId=${userId}`;
  return apiRequest(url);
};

// ===== TRENDING API =====

export const getTrendingTickers = async (timeframe: string = '24h', limit: number = 10): Promise<any> => {
  return apiRequest(`/api/trending?timeframe=${timeframe}&limit=${limit}`);
};

// ===== WATCHLIST API =====

export const getWatchlist = async (userId: number): Promise<any> => {
  return apiRequest(`/api/watchlist?userId=${userId}`);
};

export const addToWatchlist = async (userId: number, ticker: string, notes?: string): Promise<any> => {
  const upperTicker = ticker.toUpperCase().trim();

  // Helper to sync to local storage (used by home page)
  const syncToLocalWatchlist = async () => {
    try {
      const saved = await AsyncStorage.getItem('user_watchlist');
      const localWatchlist: string[] = saved ? JSON.parse(saved) : [];
      if (!localWatchlist.includes(upperTicker)) {
        localWatchlist.push(upperTicker);
        await AsyncStorage.setItem('user_watchlist', JSON.stringify(localWatchlist));
        console.log(`✅ Synced ${upperTicker} to local watchlist`);
      }
    } catch (e) {
      console.warn('Failed to sync to local watchlist:', e);
    }
  };

  try {
    const result = await apiRequest('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ userId, ticker: upperTicker, notes }),
    });

    // Sync to local storage for home page
    await syncToLocalWatchlist();

    return { success: true, ...result };
  } catch (error: any) {
    // If ticker is already in watchlist, treat it as success
    if (error?.message?.toLowerCase().includes('already in watchlist')) {
      console.log(`ℹ️ Ticker ${upperTicker} already in watchlist`);
      // Still sync to local in case it's not there
      await syncToLocalWatchlist();
      return { success: true, alreadyExists: true };
    }
    throw error;
  }
};

export const removeFromWatchlist = async (userId: number, ticker: string): Promise<any> => {
  return apiRequest(`/api/watchlist?userId=${userId}&ticker=${ticker}`, {
    method: 'DELETE',
  });
};

// ===== KARMA API =====

export const getUserKarma = async (userId: number): Promise<any> => {
  return apiRequest(`/api/user/karma?userId=${userId}`);
};

// ===== BLOCK/MUTE API (with local storage fallback) =====

const BLOCKED_USERS_KEY = 'blocked_users';
const MUTED_USERS_KEY = 'muted_users';
const UNBLOCKED_USERS_KEY = 'unblocked_users'; // Track explicitly unblocked users
const UNMUTED_USERS_KEY = 'unmuted_users'; // Track explicitly unmuted users

// Fetch blocked user IDs (tries API first, falls back to local storage)
export const getBlockedUsers = async (userId: number): Promise<number[]> => {
  try {
    // Try API first
    const result = await apiRequest(`/api/user/blocked?userId=${userId}`, { method: 'GET' });
    const blockedIds = Array.isArray(result) ? result.map((u: any) => u.id) : [];
    // Cache locally
    await AsyncStorage.setItem(`${BLOCKED_USERS_KEY}_${userId}`, JSON.stringify(blockedIds));
    return blockedIds;
  } catch {
    // Fallback to local storage
    try {
      const stored = await AsyncStorage.getItem(`${BLOCKED_USERS_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
};

// Fetch muted user IDs (tries API first, falls back to local storage)
export const getMutedUsers = async (userId: number): Promise<number[]> => {
  try {
    // Try API first
    const result = await apiRequest(`/api/user/muted?userId=${userId}`, { method: 'GET' });
    const mutedIds = Array.isArray(result) ? result.map((u: any) => u.id) : [];
    // Cache locally
    await AsyncStorage.setItem(`${MUTED_USERS_KEY}_${userId}`, JSON.stringify(mutedIds));
    return mutedIds;
  } catch {
    // Fallback to local storage
    try {
      const stored = await AsyncStorage.getItem(`${MUTED_USERS_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
};

// Fetch full blocked user details (merges API + local storage for consistency)
export const getBlockedUserDetails = async (userId: number): Promise<any[]> => {
  // First, get locally stored blocked user IDs
  let localIds: number[] = [];
  let unblockedIds: number[] = [];

  try {
    const stored = await AsyncStorage.getItem(`${BLOCKED_USERS_KEY}_${userId}`);
    localIds = stored ? JSON.parse(stored) : [];
    console.log(`📋 Found ${localIds.length} blocked users in local storage`);
  } catch (storageError) {
    console.error('Local storage error:', storageError);
  }

  // Get explicitly unblocked users to exclude them
  try {
    const unblocked = await AsyncStorage.getItem(`${UNBLOCKED_USERS_KEY}_${userId}`);
    unblockedIds = unblocked ? JSON.parse(unblocked) : [];
    console.log(`📋 Found ${unblockedIds.length} explicitly unblocked users`);
  } catch (storageError) {
    console.error('Local storage error:', storageError);
  }

  try {
    // Try to fetch from API
    const result = await apiRequest(`/api/user/blocked?userId=${userId}`, { method: 'GET' });
    const apiUsers = Array.isArray(result) ? result : [];
    const apiIds = apiUsers.map((u: any) => u.id);

    console.log(`📋 Fetched ${apiUsers.length} blocked users from API`);

    // Filter out explicitly unblocked users from API results
    const filteredApiUsers = apiUsers.filter((u: any) => !unblockedIds.includes(u.id));

    // Get local-only users not in API (and not explicitly unblocked)
    const localOnlyIds = localIds.filter(id => !apiIds.includes(id) && !unblockedIds.includes(id));
    const localOnlyUsers = localOnlyIds.map((id: number) => ({
      id,
      name: null,
      email: `User #${id}`,
      profileImage: null,
      blockedAt: new Date().toISOString(),
    }));

    return [...filteredApiUsers, ...localOnlyUsers];
  } catch (error) {
    console.error('Error fetching blocked users from API:', error);

    // Fallback: return locally stored blocked users (excluding unblocked)
    const filteredLocalIds = localIds.filter(id => !unblockedIds.includes(id));
    if (filteredLocalIds.length > 0) {
      return filteredLocalIds.map((id: number) => ({
        id,
        name: null,
        email: `User #${id}`,
        profileImage: null,
        blockedAt: new Date().toISOString(),
      }));
    }
    return [];
  }
};

// Fetch full muted user details (merges API + local storage for consistency)
export const getMutedUserDetails = async (userId: number): Promise<any[]> => {
  // First, get locally stored muted user IDs
  let localIds: number[] = [];
  let unmutedIds: number[] = [];

  try {
    const stored = await AsyncStorage.getItem(`${MUTED_USERS_KEY}_${userId}`);
    localIds = stored ? JSON.parse(stored) : [];
    console.log(`📋 Found ${localIds.length} muted users in local storage`);
  } catch (storageError) {
    console.error('Local storage error:', storageError);
  }

  // Get explicitly unmuted users to exclude them
  try {
    const unmuted = await AsyncStorage.getItem(`${UNMUTED_USERS_KEY}_${userId}`);
    unmutedIds = unmuted ? JSON.parse(unmuted) : [];
    console.log(`📋 Found ${unmutedIds.length} explicitly unmuted users`);
  } catch (storageError) {
    console.error('Local storage error:', storageError);
  }

  try {
    // Try to fetch from API
    const result = await apiRequest(`/api/user/muted?userId=${userId}`, { method: 'GET' });
    const apiUsers = Array.isArray(result) ? result : [];
    const apiIds = apiUsers.map((u: any) => u.id);

    console.log(`📋 Fetched ${apiUsers.length} muted users from API`);

    // Filter out explicitly unmuted users from API results
    const filteredApiUsers = apiUsers.filter((u: any) => !unmutedIds.includes(u.id));

    // Get local-only users not in API (and not explicitly unmuted)
    const localOnlyIds = localIds.filter(id => !apiIds.includes(id) && !unmutedIds.includes(id));
    const localOnlyUsers = localOnlyIds.map((id: number) => ({
      id,
      name: null,
      email: `User #${id}`,
      profileImage: null,
      mutedAt: new Date().toISOString(),
    }));

    return [...filteredApiUsers, ...localOnlyUsers];
  } catch (error) {
    console.error('Error fetching muted users from API:', error);

    // Fallback: return locally stored muted users (excluding unmuted)
    const filteredLocalIds = localIds.filter(id => !unmutedIds.includes(id));
    if (filteredLocalIds.length > 0) {
      return filteredLocalIds.map((id: number) => ({
        id,
        name: null,
        email: `User #${id}`,
        profileImage: null,
        mutedAt: new Date().toISOString(),
      }));
    }
    return [];
  }
};

export const blockUser = async (userId: number, targetUserId: number): Promise<{ success: boolean; blocked: boolean }> => {
  // Helper to remove user from explicitly unblocked list when blocking
  const removeFromUnblockedList = async () => {
    try {
      const stored = await AsyncStorage.getItem(`${UNBLOCKED_USERS_KEY}_${userId}`);
      const unblockedIds: number[] = stored ? JSON.parse(stored) : [];
      const newUnblocked = unblockedIds.filter(id => id !== targetUserId);
      await AsyncStorage.setItem(`${UNBLOCKED_USERS_KEY}_${userId}`, JSON.stringify(newUnblocked));
      console.log(`✅ Removed user ${targetUserId} from unblocked list`);
    } catch (e) {
      console.warn('Failed to remove from unblocked list:', e);
    }
  };

  try {
    // Try API first
    const result = await apiRequest(`/api/community/social/${targetUserId}/block`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    // Backend returns isBlocked, not blocked
    const isBlocked = result?.isBlocked ?? result?.blocked ?? true;

    // Sync to local storage on API success
    try {
      const currentBlocked = await AsyncStorage.getItem(`${BLOCKED_USERS_KEY}_${userId}`);
      let blockedIds: number[] = currentBlocked ? JSON.parse(currentBlocked) : [];

      if (isBlocked && !blockedIds.includes(targetUserId)) {
        blockedIds.push(targetUserId);
      } else if (!isBlocked) {
        blockedIds = blockedIds.filter(id => id !== targetUserId);
      }
      await AsyncStorage.setItem(`${BLOCKED_USERS_KEY}_${userId}`, JSON.stringify(blockedIds));
      console.log(`✅ Block synced to local storage: ${isBlocked ? 'blocked' : 'unblocked'} user ${targetUserId}`);
    } catch (syncError) {
      console.warn('Failed to sync block to local storage:', syncError);
    }

    // Remove from unblocked list so they appear in blocked list again
    if (isBlocked) {
      await removeFromUnblockedList();
    }

    return { success: true, blocked: isBlocked };
  } catch (error) {
    // Fallback to local storage
    console.log('API block failed, using local storage fallback');
    try {
      const stored = await AsyncStorage.getItem(`${BLOCKED_USERS_KEY}_${userId}`);
      const blocked: number[] = stored ? JSON.parse(stored) : [];
      const isBlocked = blocked.includes(targetUserId);

      let newBlocked: number[];
      if (isBlocked) {
        newBlocked = blocked.filter(id => id !== targetUserId);
      } else {
        newBlocked = [...blocked, targetUserId];
      }

      await AsyncStorage.setItem(`${BLOCKED_USERS_KEY}_${userId}`, JSON.stringify(newBlocked));

      // Remove from unblocked list if blocking
      if (!isBlocked) {
        await removeFromUnblockedList();
      }

      return { success: true, blocked: !isBlocked };
    } catch (storageError) {
      console.error('Local storage error:', storageError);
      throw new Error('Failed to block user');
    }
  }
};

export const unblockUser = async (userId: number, targetUserId: number): Promise<{ success: boolean }> => {
  // Helper to add user to explicitly unblocked list
  const addToUnblockedList = async () => {
    try {
      const stored = await AsyncStorage.getItem(`${UNBLOCKED_USERS_KEY}_${userId}`);
      const unblockedIds: number[] = stored ? JSON.parse(stored) : [];
      if (!unblockedIds.includes(targetUserId)) {
        unblockedIds.push(targetUserId);
        await AsyncStorage.setItem(`${UNBLOCKED_USERS_KEY}_${userId}`, JSON.stringify(unblockedIds));
      }
      console.log(`✅ Added user ${targetUserId} to explicitly unblocked list`);
    } catch (e) {
      console.warn('Failed to add to unblocked list:', e);
    }
  };

  try {
    // Use POST to toggle block status (same as blockUser - the API is a toggle)
    const result = await apiRequest(`/api/community/social/${targetUserId}/block`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });

    // Check if user is now unblocked
    const isBlocked = result?.isBlocked ?? result?.blocked ?? false;

    // Sync to local storage on API success
    try {
      const stored = await AsyncStorage.getItem(`${BLOCKED_USERS_KEY}_${userId}`);
      const blockedIds: number[] = stored ? JSON.parse(stored) : [];
      const newBlocked = blockedIds.filter(id => id !== targetUserId);
      await AsyncStorage.setItem(`${BLOCKED_USERS_KEY}_${userId}`, JSON.stringify(newBlocked));
      console.log(`✅ Unblock synced to local storage: removed user ${targetUserId}`);
    } catch (syncError) {
      console.warn('Failed to sync unblock to local storage:', syncError);
    }

    // Add to explicitly unblocked list to prevent re-adding from stale API data
    await addToUnblockedList();

    return { success: true };
  } catch (error) {
    // Fallback to local storage
    console.log('API unblock failed, using local storage fallback');
    try {
      const stored = await AsyncStorage.getItem(`${BLOCKED_USERS_KEY}_${userId}`);
      const blocked: number[] = stored ? JSON.parse(stored) : [];
      const newBlocked = blocked.filter(id => id !== targetUserId);
      await AsyncStorage.setItem(`${BLOCKED_USERS_KEY}_${userId}`, JSON.stringify(newBlocked));

      // Add to explicitly unblocked list
      await addToUnblockedList();

      return { success: true };
    } catch (storageError) {
      console.error('Local storage error:', storageError);
      throw new Error('Failed to unblock user');
    }
  }
};

export const muteUser = async (userId: number, targetUserId: number): Promise<{ success: boolean; muted: boolean }> => {
  // Helper to remove user from explicitly unmuted list when muting
  const removeFromUnmutedList = async () => {
    try {
      const stored = await AsyncStorage.getItem(`${UNMUTED_USERS_KEY}_${userId}`);
      const unmutedIds: number[] = stored ? JSON.parse(stored) : [];
      const newUnmuted = unmutedIds.filter(id => id !== targetUserId);
      await AsyncStorage.setItem(`${UNMUTED_USERS_KEY}_${userId}`, JSON.stringify(newUnmuted));
      console.log(`✅ Removed user ${targetUserId} from unmuted list`);
    } catch (e) {
      console.warn('Failed to remove from unmuted list:', e);
    }
  };

  try {
    // Try API first
    const result = await apiRequest(`/api/community/social/${targetUserId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    // Backend returns isMuted, not muted
    const isMuted = result?.isMuted ?? result?.muted ?? true;

    // Sync to local storage on API success
    try {
      const currentMuted = await AsyncStorage.getItem(`${MUTED_USERS_KEY}_${userId}`);
      let mutedIds: number[] = currentMuted ? JSON.parse(currentMuted) : [];

      if (isMuted && !mutedIds.includes(targetUserId)) {
        mutedIds.push(targetUserId);
      } else if (!isMuted) {
        mutedIds = mutedIds.filter(id => id !== targetUserId);
      }
      await AsyncStorage.setItem(`${MUTED_USERS_KEY}_${userId}`, JSON.stringify(mutedIds));
      console.log(`✅ Mute synced to local storage: ${isMuted ? 'muted' : 'unmuted'} user ${targetUserId}`);
    } catch (syncError) {
      console.warn('Failed to sync mute to local storage:', syncError);
    }

    // Remove from unmuted list so they appear in muted list again
    if (isMuted) {
      await removeFromUnmutedList();
    }

    return { success: true, muted: isMuted };
  } catch (error) {
    // Fallback to local storage
    console.log('API mute failed, using local storage fallback');
    try {
      const stored = await AsyncStorage.getItem(`${MUTED_USERS_KEY}_${userId}`);
      const muted: number[] = stored ? JSON.parse(stored) : [];
      const isMuted = muted.includes(targetUserId);

      let newMuted: number[];
      if (isMuted) {
        newMuted = muted.filter(id => id !== targetUserId);
      } else {
        newMuted = [...muted, targetUserId];
      }

      await AsyncStorage.setItem(`${MUTED_USERS_KEY}_${userId}`, JSON.stringify(newMuted));

      // Remove from unmuted list if muting
      if (!isMuted) {
        await removeFromUnmutedList();
      }

      return { success: true, muted: !isMuted };
    } catch (storageError) {
      console.error('Local storage error:', storageError);
      throw new Error('Failed to mute user');
    }
  }
};

export const unmuteUser = async (userId: number, targetUserId: number): Promise<{ success: boolean }> => {
  // Helper to add user to explicitly unmuted list
  const addToUnmutedList = async () => {
    try {
      const stored = await AsyncStorage.getItem(`${UNMUTED_USERS_KEY}_${userId}`);
      const unmutedIds: number[] = stored ? JSON.parse(stored) : [];
      if (!unmutedIds.includes(targetUserId)) {
        unmutedIds.push(targetUserId);
        await AsyncStorage.setItem(`${UNMUTED_USERS_KEY}_${userId}`, JSON.stringify(unmutedIds));
      }
      console.log(`✅ Added user ${targetUserId} to explicitly unmuted list`);
    } catch (e) {
      console.warn('Failed to add to unmuted list:', e);
    }
  };

  try {
    // Use POST to toggle mute status (same as muteUser - the API is a toggle)
    const result = await apiRequest(`/api/community/social/${targetUserId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });

    // Check if user is now unmuted
    const isMuted = result?.isMuted ?? result?.muted ?? false;

    // Sync to local storage on API success
    try {
      const stored = await AsyncStorage.getItem(`${MUTED_USERS_KEY}_${userId}`);
      const mutedIds: number[] = stored ? JSON.parse(stored) : [];
      const newMuted = mutedIds.filter(id => id !== targetUserId);
      await AsyncStorage.setItem(`${MUTED_USERS_KEY}_${userId}`, JSON.stringify(newMuted));
      console.log(`✅ Unmute synced to local storage: removed user ${targetUserId}`);
    } catch (syncError) {
      console.warn('Failed to sync unmute to local storage:', syncError);
    }

    // Add to explicitly unmuted list to prevent re-adding from stale API data
    await addToUnmutedList();

    return { success: true };
  } catch (error) {
    // Fallback to local storage
    console.log('API unmute failed, using local storage fallback');
    try {
      const stored = await AsyncStorage.getItem(`${MUTED_USERS_KEY}_${userId}`);
      const muted: number[] = stored ? JSON.parse(stored) : [];
      const newMuted = muted.filter(id => id !== targetUserId);
      await AsyncStorage.setItem(`${MUTED_USERS_KEY}_${userId}`, JSON.stringify(newMuted));

      // Add to explicitly unmuted list
      await addToUnmutedList();

      return { success: true };
    } catch (storageError) {
      console.error('Local storage error:', storageError);
      throw new Error('Failed to unmute user');
    }
  }
};

export const reportUser = async (
  userId: number,
  reportedUserId: number,
  reason: string,
  postId?: number,
  commentId?: number
): Promise<{ success: boolean }> => {
  try {
    await apiRequest('/api/community/report', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        reportedUserId,
        reason,
        ...(postId && { postId }),
        ...(commentId && { commentId }),
      }),
    });
    return { success: true };
  } catch (error) {
    // For reports, we always show success to the user (even if backend fails)
    // The report can be logged locally or retried later
    console.log('Report API failed, but acknowledging to user');
    return { success: true };
  }
};

// ===== REPOST API =====

export const repostPost = async (postId: number, userId: number): Promise<any> => {
  try {
    const result = await apiRequest(`/api/posts/${postId}/repost`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return result;
  } catch (error) {
    console.error('Error reposting:', error);
    throw error;
  }
};

// ===== DEFAULT EXPORT =====

export default {
  fetchPosts,
  createPost,
  deletePost,
  searchPosts,
  fetchComments,
  createComment,
  deleteComment,
  likePost,
  likeComment,
  fetchNotifications,
  markAllNotificationsRead,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getCurrentUser,
  uploadImage,
  storeAuthToken,
  clearAuthToken,
  voteSentiment,
  getSentiment,
  getTrendingTickers,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getUserKarma,
  // Block/Mute/Report
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  reportUser,
  getBlockedUsers,
  getMutedUsers,
  getBlockedUserDetails,
  getMutedUserDetails,
  repostPost,
};
