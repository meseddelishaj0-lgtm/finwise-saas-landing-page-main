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
};
