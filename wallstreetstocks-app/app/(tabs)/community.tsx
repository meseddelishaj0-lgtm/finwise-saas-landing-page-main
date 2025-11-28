// app/(tabs)/community.tsx - ENHANCED WITH FUNCTIONAL HEADER
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import {
  fetchPosts,
  createPost,
  searchPosts,
  fetchComments,
  createComment,
  likePost,
  likeComment,
  fetchNotifications,
  markAllNotificationsRead,
  fetchTrendingTickers,
  uploadImage,
  getCurrentUser,
} from '@/services/communityApi';

// Types
interface User {
  id: number;
  name: string | null;
  email: string;
  image?: string | null;
}

interface Post {
  id: number;
  title?: string;
  content: string;
  image?: string;
  ticker?: string;
  createdAt: string;
  user: User;
  forum?: {
    id: number;
    title: string;
    slug: string;
  };
  _count?: {
    comments: number;
    likes: number;
  };
  isLiked?: boolean;
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

interface TrendingTicker {
  symbol: string;
  mentions: number;
}

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'mention';
  fromUser: User;
  post?: { id: number; title: string };
  read: boolean;
  createdAt: string;
}

export default function CommunityPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modals
  const [createPostModal, setCreatePostModal] = useState(false);
  const [commentsModal, setCommentsModal] = useState(false);
  const [notificationsModal, setNotificationsModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  
  // Create Post State
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTicker, setNewPostTicker] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Comment State
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Trending Tickers
  const [trendingTickers, setTrendingTickers] = useState<TrendingTicker[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Current User (from API)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Get the userId helper
  const getUserId = (): number | null => {
    if (authUser?.id) return Number(authUser.id);
    if (currentUser?.id) return Number(currentUser.id);
    return null;
  };

  // Fetch Current User
  const fetchCurrentUserData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // Fetch Trending Tickers
  const loadTrendingTickers = async () => {
    try {
      const tickers = await fetchTrendingTickers();
      setTrendingTickers(tickers);
    } catch (error) {
      console.error('Error fetching trending tickers:', error);
    }
  };

  // Fetch Notifications
  const loadNotifications = async () => {
    const userId = getUserId();
    if (!userId) return;
    
    try {
      const notifs = await fetchNotifications(userId);
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: Notification) => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch Posts
  const loadPosts = async () => {
    try {
      setLoading(true);
      const fetchedPosts = await fetchPosts();
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Search Posts
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    
    try {
      const ticker = query.startsWith('$') ? query.substring(1) : undefined;
      const results = await searchPosts(query, ticker);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch Comments
  const loadComments = async (postId: number) => {
    try {
      const fetchedComments = await fetchComments(postId.toString());
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  // Create Post
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to post');
      return;
    }

    setPosting(true);

    try {
      let imageUrl = newPostImage;

      if (newPostImage && !newPostImage.startsWith('http')) {
        const uploadResult = await uploadImage(newPostImage);
        imageUrl = uploadResult.url;
      }

      const newPost = await createPost({
        title: newPostContent.substring(0, 100),
        content: newPostContent,
        forumId: '1',
        userId: userId,
        ticker: newPostTicker.trim() || undefined,
        image: imageUrl || undefined,
      });

      setPosts(prev => [newPost, ...prev]);
      
      setNewPostContent('');
      setNewPostTicker('');
      setNewPostImage(null);
      setCreatePostModal(false);

      Alert.alert('Success', 'Post created successfully!');
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  // Pick Image
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewPostImage(result.assets[0].uri);
    }
  };

  // Like Post
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
                ...post._count!,
                likes: newLikedState 
                  ? (post._count?.likes || 0) + 1 
                  : Math.max(0, (post._count?.likes || 0) - 1)
              }
            }
          : post
      )
    );

    try {
      const result = await likePost(postId.toString(), userId);
      
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                isLiked: result.liked !== undefined ? result.liked : newLikedState,
                _count: {
                  ...post._count!,
                  likes: result.likesCount !== undefined 
                    ? result.likesCount 
                    : post._count?.likes || 0
                }
              }
            : post
        )
      );
    } catch (error: any) {
      console.error('Error liking post:', error);
      
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                isLiked: currentPost.isLiked,
                _count: {
                  ...post._count!,
                  likes: currentPost._count?.likes || 0
                }
              }
            : post
        )
      );
      
      Alert.alert('Error', error.message || 'Failed to like post');
    }
  };

  // Like Comment
  const handleLikeComment = async (commentId: number) => {
    const userId = getUserId();
    if (!userId) {
      Alert.alert('Error', 'Please log in to like comments');
      return;
    }

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
                likes: newLikedState 
                  ? (comment._count?.likes || 0) + 1 
                  : Math.max(0, (comment._count?.likes || 0) - 1)
              }
            }
          : comment
      )
    );

    try {
      const result = await likeComment(commentId.toString(), userId);
      
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: result.liked !== undefined ? result.liked : newLikedState,
                _count: {
                  likes: result.likesCount !== undefined 
                    ? result.likesCount 
                    : comment._count?.likes || 0
                }
              }
            : comment
        )
      );
    } catch (error: any) {
      console.error('Error liking comment:', error);
      
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: currentComment.isLiked,
                _count: {
                  likes: currentComment._count?.likes || 0
                }
              }
            : comment
        )
      );
      
      Alert.alert('Error', error.message || 'Failed to like comment');
    }
  };

  // Add Comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    const userId = getUserId();
    if (!userId) {
      Alert.alert('Error', 'Please log in to comment');
      return;
    }

    setCommenting(true);

    try {
      const comment = await createComment(selectedPost.id.toString(), newComment, userId);
      
      setComments(prev => [...prev, comment]);
      
      setPosts(prev =>
        prev.map(post =>
          post.id === selectedPost.id
            ? { ...post, _count: { ...post._count!, comments: (post._count?.comments || 0) + 1 } }
            : post
        )
      );

      setNewComment('');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  // Open Comments
  const handleOpenComments = (post: Post) => {
    setSelectedPost(post);
    loadComments(post.id);
    setCommentsModal(true);
  };

  // Mark Notifications as Read
  const handleMarkNotificationsRead = async () => {
    const userId = getUserId();
    if (!userId) return;
    
    try {
      await markAllNotificationsRead(userId);
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  // Time ago formatter
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Get avatar URL
  const getAvatarUrl = (user: User | null | undefined): string => {
    if (!user) {
      return 'https://ui-avatars.com/api/?name=User&background=007AFF&color=fff';
    }
    if (user.image) return user.image;
    const name = user.name || user.email;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=007AFF&color=fff`;
  };

  // Get display user
  const getDisplayUser = (): User | null => {
    if (authUser) {
      return {
        id: Number(authUser.id),
        name: null,
        email: authUser.email || '',
        image: null,
      };
    }
    return currentUser;
  };

  useEffect(() => {
    fetchCurrentUserData();
    loadPosts();
    loadTrendingTickers();
  }, []);

  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      loadNotifications();
    }
  }, [authUser?.id, currentUser?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadPosts();
      const userId = getUserId();
      if (userId) {
        loadNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [authUser?.id, currentUser?.id]);

  useEffect(() => {
    if (searchQuery) {
      const debounce = setTimeout(() => {
        handleSearch(searchQuery);
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading community...</Text>
      </View>
    );
  }

  const displayUser = getDisplayUser();

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
            <Ionicons name="search-outline" size={26} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              setNotificationsModal(true);
              handleMarkNotificationsRead();
            }}
          >
            <Ionicons name="notifications-outline" size={28} color="#000" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setCreatePostModal(true)}
          >
            <Ionicons name="create-outline" size={26} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Trending Tickers */}
      {trendingTickers.length > 0 && (
        <View style={styles.trendingSection}>
          <Text style={styles.trendingTitle}>🔥 Trending Now</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.trendingScroll}
          >
            {trendingTickers.map((ticker) => (
              <TouchableOpacity
                key={ticker.symbol}
                style={styles.trendingCard}
                onPress={() => {
                  setSearchQuery(`$${ticker.symbol}`);
                  setSearchModal(true);
                }}
              >
                <Text style={styles.trendingSymbol}>${ticker.symbol}</Text>
                <Text style={styles.trendingMentions}>{ticker.mentions} mentions</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Posts List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.postsContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadPosts();
            loadTrendingTickers();
            loadNotifications();
          }} />
        }
      >
        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image 
                source={{ uri: getAvatarUrl(post.user) }} 
                style={styles.avatar} 
              />
              <View style={styles.postHeaderInfo}>
                <Text style={styles.username}>{post.user?.name || post.user?.email || 'Anonymous'}</Text>
                <Text style={styles.timestamp}>{formatTimeAgo(post.createdAt)}</Text>
              </View>
              {post.ticker && (
                <TouchableOpacity 
                  style={styles.tickerBadge}
                  onPress={() => {
                    setSearchQuery(`$${post.ticker}`);
                    setSearchModal(true);
                  }}
                >
                  <Text style={styles.tickerText}>${post.ticker}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.postContent}>{post.content}</Text>

            {post.image && (
              <Image source={{ uri: post.image }} style={styles.postImage} />
            )}

            <View style={styles.postFooter}>
              <TouchableOpacity
                style={styles.footerButton}
                onPress={() => handleLikePost(post.id)}
              >
                <Ionicons
                  name={post.isLiked ? "heart" : "heart-outline"}
                  size={24}
                  color={post.isLiked ? "#FF3B30" : "#666"}
                />
                <Text style={[styles.footerText, post.isLiked && styles.footerTextActive]}>
                  {post._count?.likes || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footerButton}
                onPress={() => handleOpenComments(post)}
              >
                <Ionicons name="chatbubble-outline" size={22} color="#666" />
                <Text style={styles.footerText}>{post._count?.comments || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerButton}>
                <Ionicons name="share-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {posts.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share something!</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setCreatePostModal(true)}
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
        onPress={() => setCreatePostModal(true)}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* CREATE POST MODAL */}
      <Modal
        visible={createPostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setCreatePostModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.createPostModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCreatePostModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity
                onPress={handleCreatePost}
                disabled={posting || !newPostContent.trim()}
              >
                <Text style={[
                  styles.modalPost,
                  (!newPostContent.trim() || posting) && styles.modalPostDisabled
                ]}>
                  {posting ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.createPostContent}>
              <View style={styles.createPostUser}>
                <Image 
                  source={{ uri: getAvatarUrl(displayUser) }} 
                  style={styles.createAvatar} 
                />
                <Text style={styles.createUsername}>
                  {displayUser?.name || displayUser?.email || 'You'}
                </Text>
              </View>

              <TextInput
                style={styles.createPostInput}
                placeholder="What's on your mind?"
                placeholderTextColor="#999"
                multiline
                value={newPostContent}
                onChangeText={setNewPostContent}
                autoFocus
              />

              <TextInput
                style={styles.tickerInput}
                placeholder="Add ticker (optional) e.g. AAPL"
                placeholderTextColor="#999"
                value={newPostTicker}
                onChangeText={setNewPostTicker}
                autoCapitalize="characters"
              />

              {newPostImage && (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: newPostImage }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImage}
                    onPress={() => setNewPostImage(null)}
                  >
                    <Ionicons name="close-circle" size={32} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Ionicons name="image-outline" size={24} color="#007AFF" />
                <Text style={styles.imageButtonText}>Add Image</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* SEARCH MODAL */}
      <Modal
        visible={searchModal}
        animationType="slide"
        transparent
        onRequestClose={() => setSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModal}>
            <View style={styles.searchHeader}>
              <TouchableOpacity onPress={() => setSearchModal(false)}>
                <Ionicons name="arrow-back" size={28} color="#000" />
              </TouchableOpacity>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by ticker or keywords..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                autoCapitalize="characters"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={26} color="#999" />
                </TouchableOpacity>
              )}
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
                    <View style={styles.searchResultHeader}>
                      <Image source={{ uri: getAvatarUrl(post.user) }} style={styles.searchResultAvatar} />
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultUsername}>{post.user?.name || post.user?.email || 'Anonymous'}</Text>
                        <Text style={styles.searchResultTime}>{formatTimeAgo(post.createdAt)}</Text>
                      </View>
                      {post.ticker && (
                        <View style={styles.searchResultTickerBadge}>
                          <Text style={styles.searchResultTickerText}>${post.ticker}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.searchResultContent} numberOfLines={3}>
                      {post.content}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : searchQuery.length > 0 ? (
                <View style={styles.emptySearch}>
                  <Ionicons name="search-outline" size={80} color="#E0E0E0" />
                  <Text style={styles.emptySearchText}>No posts found</Text>
                </View>
              ) : (
                <View style={styles.searchSuggestions}>
                  <Text style={styles.suggestionsTitle}>Trending Tickers</Text>
                  {trendingTickers.slice(0, 5).map((ticker) => (
                    <TouchableOpacity
                      key={ticker.symbol}
                      style={styles.suggestionItem}
                      onPress={() => setSearchQuery(`$${ticker.symbol}`)}
                    >
                      <Ionicons name="trending-up" size={22} color="#007AFF" />
                      <Text style={styles.suggestionText}>${ticker.symbol}</Text>
                      <Text style={styles.suggestionMentions}>{ticker.mentions} mentions</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NOTIFICATIONS MODAL */}
      <Modal
        visible={notificationsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationsModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setNotificationsModal(false)}>
                <Ionicons name="close" size={30} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Notifications</Text>
              <View style={{ width: 30 }} />
            </View>

            <ScrollView style={styles.notificationsList}>
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <TouchableOpacity 
                    key={notif.id} 
                    style={[
                      styles.notificationItem,
                      !notif.read && styles.notificationUnread
                    ]}
                  >
                    <Image source={{ uri: getAvatarUrl(notif.fromUser) }} style={styles.notificationAvatar} />
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationText}>
                        <Text style={styles.notificationUsername}>{notif.fromUser?.name || notif.fromUser?.email || 'Someone'}</Text>
                        {notif.type === 'like' && ' liked your post'}
                        {notif.type === 'comment' && ' commented on your post'}
                        {notif.type === 'follow' && ' started following you'}
                        {notif.type === 'mention' && ' mentioned you'}
                      </Text>
                      <Text style={styles.notificationTime}>{formatTimeAgo(notif.createdAt)}</Text>
                    </View>
                    <Ionicons 
                      name={
                        notif.type === 'like' ? 'heart' :
                        notif.type === 'comment' ? 'chatbubble' :
                        notif.type === 'follow' ? 'person-add' : 'at'
                      } 
                      size={22} 
                      color={notif.type === 'like' ? '#FF3B30' : '#007AFF'} 
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyNotifications}>
                  <Ionicons name="notifications-outline" size={80} color="#E0E0E0" />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* COMMENTS MODAL */}
      <Modal
        visible={commentsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.commentsModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCommentsModal(false)}>
                <Ionicons name="close" size={30} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Comments</Text>
              <View style={{ width: 30 }} />
            </View>

            <ScrollView style={styles.commentsList}>
              {selectedPost && (
                <View style={styles.originalPost}>
                  <View style={styles.postHeader}>
                    <Image source={{ uri: getAvatarUrl(selectedPost.user) }} style={styles.avatar} />
                    <View style={styles.postHeaderInfo}>
                      <Text style={styles.username}>{selectedPost.user?.name || selectedPost.user?.email || 'Anonymous'}</Text>
                      <Text style={styles.timestamp}>{formatTimeAgo(selectedPost.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.postContent}>{selectedPost.content}</Text>
                </View>
              )}

              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Image source={{ uri: getAvatarUrl(comment.user) }} style={styles.commentAvatar} />
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUsername}>{comment.user?.name || comment.user?.email || 'Anonymous'}</Text>
                      <Text style={styles.commentTimestamp}>{formatTimeAgo(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    <TouchableOpacity
                      style={styles.commentLike}
                      onPress={() => handleLikeComment(comment.id)}
                    >
                      <Ionicons
                        name={comment.isLiked ? "heart" : "heart-outline"}
                        size={16}
                        color={comment.isLiked ? "#FF3B30" : "#666"}
                      />
                      <Text style={[styles.commentLikeText, comment.isLiked && styles.footerTextActive]}>
                        {comment._count?.likes || 0}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {comments.length === 0 && (
                <View style={styles.emptyComments}>
                  <Ionicons name="chatbubbles-outline" size={60} color="#E0E0E0" />
                  <Text style={styles.emptyCommentsText}>No comments yet</Text>
                </View>
              )}
            </ScrollView>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.addCommentContainer}
            >
              <Image 
                source={{ uri: getAvatarUrl(displayUser) }} 
                style={styles.commentInputAvatar} 
              />
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleAddComment}
                disabled={commenting || !newComment.trim()}
              >
                {commenting ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons
                    name="send"
                    size={24}
                    color={newComment.trim() ? "#007AFF" : "#ccc"}
                  />
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F9' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666', fontWeight: '500' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#000' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerButton: { position: 'relative', padding: 4 },
  createButton: { padding: 4 },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#FF3B30', borderRadius: 12, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  trendingSection: { backgroundColor: '#FFF', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  trendingTitle: { fontSize: 17, fontWeight: '700', color: '#000', paddingHorizontal: 20, marginBottom: 12 },
  trendingScroll: { paddingLeft: 20 },
  trendingCard: { backgroundColor: '#F5F5F7', borderRadius: 16, padding: 14, marginRight: 12, minWidth: 130 },
  trendingSymbol: { fontSize: 17, fontWeight: '700', color: '#007AFF', marginBottom: 6 },
  trendingMentions: { fontSize: 13, color: '#666', fontWeight: '500' },
  scrollView: { flex: 1 },
  postsContainer: { paddingTop: 8, paddingBottom: 20 },
  postCard: { backgroundColor: '#FFF', marginBottom: 8, padding: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#E0E0E0' },
  postHeaderInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 2 },
  timestamp: { fontSize: 13, color: '#999', fontWeight: '500' },
  tickerBadge: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  tickerText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  postContent: { fontSize: 16, lineHeight: 24, color: '#000', marginBottom: 12 },
  postImage: { width: '100%', height: 250, borderRadius: 16, marginBottom: 12, backgroundColor: '#F0F0F0' },
  postFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  footerButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  footerText: { fontSize: 15, color: '#666', marginLeft: 8, fontWeight: '600' },
  footerTextActive: { color: '#FF3B30' },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 20, color: '#333', marginTop: 20, fontWeight: '700' },
  emptySubtext: { fontSize: 15, color: '#999', marginTop: 8, textAlign: 'center' },
  emptyButton: { backgroundColor: '#007AFF', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24, marginTop: 24 },
  emptyButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  createPostModal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalCancel: { fontSize: 17, color: '#666', fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  modalPost: { fontSize: 17, color: '#007AFF', fontWeight: '700' },
  modalPostDisabled: { opacity: 0.4 },
  createPostContent: { padding: 20 },
  createPostUser: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  createAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E0E0E0' },
  createUsername: { fontSize: 16, fontWeight: '600', color: '#000' },
  createPostInput: { fontSize: 17, color: '#000', minHeight: 140, textAlignVertical: 'top', marginBottom: 16 },
  tickerInput: { backgroundColor: '#F5F5F7', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, fontSize: 16, marginBottom: 16 },
  imagePreview: { position: 'relative', marginBottom: 16 },
  previewImage: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#F0F0F0' },
  removeImage: { position: 'absolute', top: 12, right: 12, backgroundColor: '#FFF', borderRadius: 20 },
  imageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, borderWidth: 2, borderColor: '#007AFF', borderStyle: 'dashed' },
  imageButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600', marginLeft: 8 },
  searchModal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '95%' },
  searchHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 12 },
  searchInput: { flex: 1, backgroundColor: '#F5F5F7', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 20, fontSize: 17 },
  searchResults: { flex: 1 },
  searchResultItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  searchResultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchResultAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#E0E0E0' },
  searchResultInfo: { flex: 1 },
  searchResultUsername: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 2 },
  searchResultTime: { fontSize: 13, color: '#999' },
  searchResultTickerBadge: { backgroundColor: '#007AFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  searchResultTickerText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  searchResultContent: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 12 },
  emptySearch: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptySearchText: { fontSize: 18, color: '#333', marginTop: 20, fontWeight: '600', textAlign: 'center' },
  searchSuggestions: { padding: 20 },
  suggestionsTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 16 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F9F9F9', borderRadius: 16, marginBottom: 12 },
  suggestionText: { fontSize: 17, fontWeight: '600', color: '#007AFF', marginLeft: 12, flex: 1 },
  suggestionMentions: { fontSize: 14, color: '#666', fontWeight: '500' },
  notificationsModal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  notificationsList: { flex: 1 },
  notificationItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  notificationUnread: { backgroundColor: '#F0F8FF' },
  notificationAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#E0E0E0' },
  notificationContent: { flex: 1 },
  notificationText: { fontSize: 15, color: '#000', marginBottom: 4, lineHeight: 20 },
  notificationUsername: { fontWeight: '700' },
  notificationTime: { fontSize: 13, color: '#999' },
  emptyNotifications: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  commentsModal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  commentsList: { flex: 1, padding: 16 },
  originalPost: { paddingBottom: 16, marginBottom: 16, borderBottomWidth: 2, borderBottomColor: '#F0F0F0' },
  commentItem: { flexDirection: 'row', marginBottom: 20 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#E0E0E0' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  commentUsername: { fontSize: 15, fontWeight: '600', color: '#000', marginRight: 8 },
  commentTimestamp: { fontSize: 13, color: '#999' },
  commentText: { fontSize: 15, lineHeight: 22, color: '#333', marginBottom: 8 },
  commentLike: { flexDirection: 'row', alignItems: 'center' },
  commentLikeText: { fontSize: 13, color: '#666', marginLeft: 6, fontWeight: '600' },
  emptyComments: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyCommentsText: { fontSize: 17, color: '#333', marginTop: 16, fontWeight: '600' },
  addCommentContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FFF' },
  commentInputAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: '#E0E0E0' },
  commentInput: { flex: 1, backgroundColor: '#F5F5F7', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, fontSize: 16, maxHeight: 100 },
  sendButton: { marginLeft: 12, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
});
