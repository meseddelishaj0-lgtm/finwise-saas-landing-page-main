// app/post/[id].tsx - Post detail page for notifications
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserDisplayName, getUserHandle } from '@/context/UserProfileContext';

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';

interface User {
  id: number;
  name: string | null;
  username: string | null;
  email?: string;
  profileImage: string | null;
  subscriptionTier?: string;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: User;
}

interface Post {
  id: number;
  title?: string;
  content: string;
  ticker?: string;
  imageUrl?: string;
  createdAt: string;
  userId: number;
  user: User;
  likes: number;
  commentCount: number;
  isLiked?: boolean;
  comments?: Comment[];
}

// Avatar component
function Avatar({ user, size = 40 }: { user: User | null | undefined; size?: number }) {
  if (user?.profileImage) {
    return (
      <Image
        source={{ uri: user.profileImage }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  const initial = getUserDisplayName(user)?.[0]?.toUpperCase() || '?';
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const colorIndex = (user?.id || 0) % colors.length;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors[colorIndex],
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#FFF', fontSize: size * 0.4, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
}

export default function PostDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const loadUserId = async () => {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) setCurrentUserId(parseInt(userId, 10));
    };
    loadUserId();
  }, []);

  const fetchPost = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('userId');

      // Fetch post
      const postRes = await fetch(`${API_BASE_URL}/posts/${id}?userId=${userId || ''}`);
      if (postRes.ok) {
        const postData = await postRes.json();
        setPost(postData);
      } else {
        console.error('Failed to fetch post:', postRes.status);
        Alert.alert('Error', 'Post not found');
        router.back();
        return;
      }

      // Fetch comments
      const commentsRes = await fetch(`${API_BASE_URL}/posts/${id}/comments`);
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(Array.isArray(commentsData) ? commentsData : []);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleLike = async () => {
    if (!post || !currentUserId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, userId: currentUserId }),
      });

      if (res.ok) {
        setPost(prev =>
          prev
            ? {
                ...prev,
                isLiked: !prev.isLiked,
                likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
              }
            : null
        );
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !post || !currentUserId) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim(), userId: currentUserId }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [newComment, ...prev]);
        setCommentText('');
        setPost(prev => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : null));
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Post */}
          <View style={styles.post}>
            {/* Author */}
            <View style={styles.postHeader}>
              <Avatar user={post.user} size={44} />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{getUserDisplayName(post.user)}</Text>
                <Text style={styles.authorHandle}>@{getUserHandle(post.user)}</Text>
              </View>
              <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>
            </View>

            {/* Content */}
            {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
            <Text style={styles.postContent}>{post.content}</Text>

            {/* Ticker */}
            {post.ticker && (
              <TouchableOpacity
                style={styles.tickerBadge}
                onPress={() => router.push(`/symbol/${post.ticker}/chart` as any)}
              >
                <Text style={styles.tickerText}>${post.ticker}</Text>
              </TouchableOpacity>
            )}

            {/* Image */}
            {post.imageUrl && (
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} contentFit="cover" />
            )}

            {/* Actions */}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Ionicons
                  name={post.isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={post.isLiked ? '#FF3B30' : '#666'}
                />
                <Text style={[styles.actionText, post.isLiked && { color: '#FF3B30' }]}>
                  {post.likes}
                </Text>
              </TouchableOpacity>
              <View style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={20} color="#666" />
                <Text style={styles.actionText}>{post.commentCount}</Text>
              </View>
            </View>
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
            {comments.map(comment => (
              <View key={comment.id} style={styles.comment}>
                <Avatar user={comment.user} size={36} />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{getUserDisplayName(comment.user)}</Text>
                    <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              </View>
            ))}
            {comments.length === 0 && (
              <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor="#999"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
            onPress={handleComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  post: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F0F0F0',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  authorHandle: {
    fontSize: 14,
    color: '#666',
  },
  postTime: {
    fontSize: 13,
    color: '#999',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  tickerBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  tickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  commentsSection: {
    padding: 16,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  comment: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noComments: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
