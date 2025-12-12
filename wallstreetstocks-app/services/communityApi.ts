// services/communityApi.ts
// React Native API client for Next.js backend

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ===== CONFIGURATION =====
const API_BASE_URL = 'https://www.wallstreetstocks.ai';

// ===== AUTH TOKEN MANAGEMENT =====

const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const storeAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error storing auth token:', error);
  }
};

export const clearAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
};

// ===== API REQUEST HELPER =====

const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

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
  return apiRequest('/api/follows', {
    method: 'POST',
    body: JSON.stringify({ 
      targetUserId: Number(targetUserId), 
      userId: Number(userId) 
    }),
  });
};

export const unfollowUser = async (targetUserId: string, userId: number): Promise<any> => {
  return apiRequest(`/api/follows/${targetUserId}?userId=${userId}`, {
    method: 'DELETE',
  });
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
  return apiRequest('/api/watchlist', {
    method: 'POST',
    body: JSON.stringify({ userId, ticker, notes }),
  });
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
  try {
    // Always fetch fresh from API
    const result = await apiRequest(`/api/user/blocked?userId=${userId}`, { method: 'GET' });
    const apiUsers = Array.isArray(result) ? result : [];

    // Also sync local storage with API results
    const blockedIds = apiUsers.map((u: any) => u.id);
    await AsyncStorage.setItem(`${BLOCKED_USERS_KEY}_${userId}`, JSON.stringify(blockedIds));

    console.log(`📋 Fetched ${apiUsers.length} blocked users from API`);
    return apiUsers;
  } catch (error) {
    console.error('Error fetching blocked users from API:', error);

    // Fallback: try to get locally stored blocked user IDs
    // Note: We only have IDs locally, not full user details
    try {
      const stored = await AsyncStorage.getItem(`${BLOCKED_USERS_KEY}_${userId}`);
      const localIds = stored ? JSON.parse(stored) : [];
      if (localIds.length > 0) {
        console.log(`📋 Found ${localIds.length} blocked users in local storage`);
        // Return minimal user objects for local-only blocks
        return localIds.map((id: number) => ({
          id,
          name: null,
          email: `User #${id}`,
          profileImage: null,
          blockedAt: new Date().toISOString(),
        }));
      }
    } catch (storageError) {
      console.error('Local storage error:', storageError);
    }
    return [];
  }
};

// Fetch full muted user details (merges API + local storage for consistency)
export const getMutedUserDetails = async (userId: number): Promise<any[]> => {
  try {
    // Always fetch fresh from API
    const result = await apiRequest(`/api/user/muted?userId=${userId}`, { method: 'GET' });
    const apiUsers = Array.isArray(result) ? result : [];

    // Also sync local storage with API results
    const mutedIds = apiUsers.map((u: any) => u.id);
    await AsyncStorage.setItem(`${MUTED_USERS_KEY}_${userId}`, JSON.stringify(mutedIds));

    console.log(`📋 Fetched ${apiUsers.length} muted users from API`);
    return apiUsers;
  } catch (error) {
    console.error('Error fetching muted users from API:', error);

    // Fallback: try to get locally stored muted user IDs
    try {
      const stored = await AsyncStorage.getItem(`${MUTED_USERS_KEY}_${userId}`);
      const localIds = stored ? JSON.parse(stored) : [];
      if (localIds.length > 0) {
        console.log(`📋 Found ${localIds.length} muted users in local storage`);
        return localIds.map((id: number) => ({
          id,
          name: null,
          email: `User #${id}`,
          profileImage: null,
          mutedAt: new Date().toISOString(),
        }));
      }
    } catch (storageError) {
      console.error('Local storage error:', storageError);
    }
    return [];
  }
};

export const blockUser = async (userId: number, targetUserId: number): Promise<{ success: boolean; blocked: boolean }> => {
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
      return { success: true, blocked: !isBlocked };
    } catch (storageError) {
      console.error('Local storage error:', storageError);
      throw new Error('Failed to block user');
    }
  }
};

export const unblockUser = async (userId: number, targetUserId: number): Promise<{ success: boolean }> => {
  try {
    // Try API first - use DELETE method for explicit unblock
    await apiRequest(`/api/community/social/${targetUserId}/block?userId=${userId}`, {
      method: 'DELETE',
    });

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

    return { success: true };
  } catch (error) {
    // Fallback to local storage
    console.log('API unblock failed, using local storage fallback');
    try {
      const stored = await AsyncStorage.getItem(`${BLOCKED_USERS_KEY}_${userId}`);
      const blocked: number[] = stored ? JSON.parse(stored) : [];
      const newBlocked = blocked.filter(id => id !== targetUserId);
      await AsyncStorage.setItem(`${BLOCKED_USERS_KEY}_${userId}`, JSON.stringify(newBlocked));
      return { success: true };
    } catch (storageError) {
      console.error('Local storage error:', storageError);
      throw new Error('Failed to unblock user');
    }
  }
};

export const muteUser = async (userId: number, targetUserId: number): Promise<{ success: boolean; muted: boolean }> => {
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
      return { success: true, muted: !isMuted };
    } catch (storageError) {
      console.error('Local storage error:', storageError);
      throw new Error('Failed to mute user');
    }
  }
};

export const unmuteUser = async (userId: number, targetUserId: number): Promise<{ success: boolean }> => {
  try {
    // Try API first - use DELETE method for explicit unmute
    await apiRequest(`/api/community/social/${targetUserId}/mute?userId=${userId}`, {
      method: 'DELETE',
    });

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

    return { success: true };
  } catch (error) {
    // Fallback to local storage
    console.log('API unmute failed, using local storage fallback');
    try {
      const stored = await AsyncStorage.getItem(`${MUTED_USERS_KEY}_${userId}`);
      const muted: number[] = stored ? JSON.parse(stored) : [];
      const newMuted = muted.filter(id => id !== targetUserId);
      await AsyncStorage.setItem(`${MUTED_USERS_KEY}_${userId}`, JSON.stringify(newMuted));
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
};
