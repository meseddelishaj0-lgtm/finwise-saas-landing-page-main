// services/communityApi.ts
// React Native API client for Next.js backend

import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== CONFIGURATION =====
// Update this to your Next.js website URL
const API_BASE_URL = 'https://wallstreetstocks.ai';

// For local development:
// const API_BASE_URL = 'http://localhost:3000';

// ===== AUTH TOKEN MANAGEMENT =====

const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const storeAuthToken = async (token: string) => {
  try {
    await AsyncStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error storing auth token:', error);
  }
};

export const clearAuthToken = async () => {
  try {
    await AsyncStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
};

// ===== API REQUEST HELPER =====

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Request failed' };
      }
      
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    const responseText = await response.text();
    
    // Handle empty responses
    if (!responseText || responseText.trim() === '') {
      console.log('✅ Empty response (success)');
      return { success: true };
    }

    try {
      const data = JSON.parse(responseText);
      console.log('✅ Response data:', data);
      return data;
    } catch (parseError) {
      console.error('⚠️ JSON Parse Error:', parseError);
      return { success: true, data: responseText };
    }
  } catch (error) {
    console.error(`💥 API Request Failed: ${endpoint}`, error);
    throw error;
  }
};

// ===== POSTS API =====
// Connects to: api/posts/route.ts

export const fetchPosts = async (forumSlug?: string) => {
  const query = forumSlug ? `?forum=${forumSlug}` : '';
  return apiRequest(`/api/posts${query}`, { method: 'GET' });
};

export const createPost = async (data: {
  title: string;
  content: string;
  forumId: string;
  userId: number;
  ticker?: string;
  image?: string;
}) => {
  return apiRequest('/api/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const deletePost = async (postId: string, userId: number) => {
  return apiRequest(`/api/posts/${postId}?userId=${userId}`, {
    method: 'DELETE',
  });
};

export const searchPosts = async (query: string, ticker?: string) => {
  const params = new URLSearchParams();
  if (query) params.append('q', query);
  if (ticker) params.append('ticker', ticker);
  
  return apiRequest(`/api/posts/search?${params.toString()}`, { 
    method: 'GET' 
  });
};

// ===== COMMENTS API =====
// Connects to: api/comments/route.ts

export const fetchComments = async (postId: string) => {
  return apiRequest(`/api/comments?postId=${postId}`, { method: 'GET' });
};

export const createComment = async (postId: string, content: string, userId: number) => {
  return apiRequest('/api/comments', {
    method: 'POST',
    body: JSON.stringify({ postId, content, userId }),
  });
};

export const deleteComment = async (commentId: string, userId: number) => {
  return apiRequest(`/api/comments/${commentId}?userId=${userId}`, {
    method: 'DELETE',
  });
};

// ===== LIKES API =====
// Connects to: api/likes/route.ts

export const likePost = async (postId: string, userId: number) => {
  try {
    console.log('👍 Liking post:', postId);
    const result = await apiRequest('/api/likes', {
      method: 'POST',
      body: JSON.stringify({ postId, userId }),
    });
    
    console.log('✅ Like result:', result);
    
    // Normalize response format
    if (result && typeof result === 'object') {
      return {
        liked: result.liked ?? result.isLiked ?? result.success ?? true,
        likesCount: result.likesCount ?? result.count ?? result.likes ?? undefined
      };
    }
    
    return { liked: true };
  } catch (error) {
    console.error('❌ Error liking post:', error);
    throw error;
  }
};

export const likeComment = async (commentId: string, userId: number) => {
  try {
    console.log('👍 Liking comment:', commentId);
    const result = await apiRequest('/api/likes', {
      method: 'POST',
      body: JSON.stringify({ commentId, userId }),
    });
    
    console.log('✅ Like comment result:', result);
    
    // Normalize response format
    if (result && typeof result === 'object') {
      return {
        liked: result.liked ?? result.isLiked ?? result.success ?? true,
        likesCount: result.likesCount ?? result.count ?? result.likes ?? undefined
      };
    }
    
    return { liked: true };
  } catch (error) {
    console.error('❌ Error liking comment:', error);
    throw error;
  }
};

export const toggleLike = async (data: { postId?: string; commentId?: string; userId: number }) => {
  if (data.postId) {
    return await likePost(data.postId, data.userId);
  } else if (data.commentId) {
    return await likeComment(data.commentId, data.userId);
  }
  throw new Error('Either postId or commentId is required');
};

// ===== NOTIFICATIONS API =====
// Connects to: api/notifications/route.ts

export const fetchNotifications = async (userId: number) => {
  try {
    if (!userId) {
      console.warn('fetchNotifications called without userId');
      return [];
    }
    return await apiRequest(`/api/notifications?userId=${userId}`, { method: 'GET' });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const fetchUnreadNotifications = async (userId: number) => {
  try {
    if (!userId) {
      console.warn('fetchUnreadNotifications called without userId');
      return [];
    }
    return await apiRequest(`/api/notifications?userId=${userId}&unread=true`, { method: 'GET' });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
};

export const markNotificationRead = async (notificationId: string, userId: number) => {
  return apiRequest(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
};

export const markAllNotificationsRead = async (userId: number) => {
  return apiRequest('/api/notifications/read-all', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
};

// ===== REACTIONS API =====
// Connects to: api/reactions/route.ts

export const addReaction = async (data: { 
  postId?: string; 
  commentId?: string; 
  type: string;
  userId: number;
}) => {
  return apiRequest('/api/reactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const removeReaction = async (reactionId: string, userId: number) => {
  return apiRequest(`/api/reactions/${reactionId}?userId=${userId}`, {
    method: 'DELETE',
  });
};

// ===== FOLLOWS API =====
// Connects to: api/follows/route.ts

export const followUser = async (targetUserId: string, userId: number) => {
  return apiRequest('/api/follows', {
    method: 'POST',
    body: JSON.stringify({ targetUserId, userId }),
  });
};

export const unfollowUser = async (targetUserId: string, userId: number) => {
  return apiRequest(`/api/follows/${targetUserId}?userId=${userId}`, {
    method: 'DELETE',
  });
};

export const getFollowers = async (userId: string) => {
  try {
    return await apiRequest(`/api/follows/followers/${userId}`, { method: 'GET' });
  } catch (error) {
    console.error('Error getting followers:', error);
    return [];
  }
};

export const getFollowing = async (userId: string) => {
  try {
    return await apiRequest(`/api/follows/following/${userId}`, { method: 'GET' });
  } catch (error) {
    console.error('Error getting following:', error);
    return [];
  }
};

// ===== AUTH & USER API =====
// Connects to: api/auth/* (NextAuth)

export const login = async (email: string, password: string) => {
  // For NextAuth, you might use signIn from next-auth/react
  // This is a placeholder - adjust based on your NextAuth setup
  const response = await apiRequest('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  if (response.token) {
    await storeAuthToken(response.token);
  }
  
  return response;
};

export const register = async (email: string, password: string, name: string) => {
  const response = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  
  if (response.token) {
    await storeAuthToken(response.token);
  }
  
  return response;
};

export const logout = async () => {
  await clearAuthToken();
  try {
    return await apiRequest('/api/auth/signout', { method: 'POST' });
  } catch (error) {
    console.log('Logged out locally');
    return { success: true };
  }
};

export const getCurrentUser = async () => {
  try {
    return await apiRequest('/api/auth/session', { method: 'GET' });
    // Alternative if you have a dedicated endpoint:
    // return await apiRequest('/api/users/me', { method: 'GET' });
  } catch (error) {
    console.error('Error getting current user:', error);
    // Return mock user for development
    return {
      id: 'mock-user-id',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
    };
  }
};

// ===== TRENDING API =====
// Connects to: api/posts/trending-tickers or similar

export const fetchTrendingTickers = async () => {
  try {
    return await apiRequest('/api/posts/trending-tickers', { method: 'GET' });
  } catch (error) {
    console.error('Error fetching trending tickers:', error);
    return [];
  }
};

// ===== IMAGE UPLOAD =====
// Connects to: api/upload/route.ts

export const uploadImage = async (uri: string) => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('image', {
    uri,
    name: filename,
    type,
  } as any);

  const token = await getAuthToken();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        // Don't set Content-Type for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// ===== DEFAULT EXPORT =====

export default {
  // Posts
  fetchPosts,
  createPost,
  deletePost,
  searchPosts,
  
  // Comments
  fetchComments,
  createComment,
  deleteComment,
  
  // Likes
  likePost,
  likeComment,
  toggleLike,
  
  // Notifications
  fetchNotifications,
  fetchUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  
  // Reactions
  addReaction,
  removeReaction,
  
  // Follows
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  
  // Auth
  login,
  register,
  logout,
  getCurrentUser,
  
  // Helpers
  fetchTrendingTickers,
  uploadImage,
  
  // Token management
  storeAuthToken,
  clearAuthToken,
};

