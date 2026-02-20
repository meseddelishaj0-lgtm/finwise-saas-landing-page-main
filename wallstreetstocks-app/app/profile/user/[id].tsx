// app/profile/user/[id].tsx - View another user's profile
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserDisplayName, getUserHandle } from '@/context/UserProfileContext';
import { useTheme } from '@/context/ThemeContext';

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';

interface User {
  id: number;
  name: string | null;
  username: string | null;
  email?: string;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  profileImage: string | null;
  bannerImage?: string | null;
  subscriptionTier?: string;
  _count?: {
    posts: number;
    followers: number;
    following: number;
  };
  isFollowing?: boolean;
}

interface Post {
  id: number;
  title?: string;
  content: string;
  ticker?: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
  commentCount: number;
}

// Avatar component
function Avatar({ user, size = 80 }: { user: User | null | undefined; size?: number }) {
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

export default function UserProfile() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const loadUserId = async () => {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) setCurrentUserId(parseInt(userId, 10));
    };
    loadUserId();
  }, []);

  const fetchUser = useCallback(async () => {
    if (!id) return;

    try {
      const userId = await AsyncStorage.getItem('userId');

      // Fetch user profile
      const userRes = await fetch(
        `${API_BASE_URL}/user/${id}?currentUserId=${userId || ''}&t=${Date.now()}`
      );
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      }

      // Fetch user's posts
      const postsRes = await fetch(`${API_BASE_URL}/posts?userId=${id}`);
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(Array.isArray(postsData) ? postsData : []);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUser();
  }, [fetchUser]);

  const handleFollow = async () => {
    if (!user || !currentUserId || followLoading) return;

    try {
      setFollowLoading(true);
      const res = await fetch(`${API_BASE_URL}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: currentUserId, followingId: user.id }),
      });

      if (res.ok) {
        setUser(prev =>
          prev
            ? {
                ...prev,
                isFollowing: !prev.isFollowing,
                _count: prev._count
                  ? {
                      ...prev._count,
                      followers: prev.isFollowing
                        ? prev._count.followers - 1
                        : prev._count.followers + 1,
                    }
                  : prev._count,
              }
            : null
        );
      }
    } catch (error) {
      
    } finally {
      setFollowLoading(false);
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

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={[styles.postItem, { borderBottomColor: isDark ? colors.border : '#F0F0F0' }]}
      onPress={() => router.push(`/post/${item.id}` as any)}
    >
      {item.title && <Text style={[styles.postTitle, { color: colors.text }]}>{item.title}</Text>}
      <Text style={[styles.postContent, { color: colors.textSecondary }]} numberOfLines={3}>
        {item.content}
      </Text>
      {item.ticker && (
        <View style={[styles.tickerBadge, { backgroundColor: isDark ? '#1A3A1A' : '#E8F5E9' }]}>
          <Text style={[styles.tickerText, { color: isDark ? '#4CAF50' : '#2E7D32' }]}>${item.ticker}</Text>
        </View>
      )}
      <View style={styles.postMeta}>
        <Text style={[styles.postTime, { color: colors.textTertiary }]}>{formatTimeAgo(item.createdAt)}</Text>
        <View style={styles.postStats}>
          <Ionicons name="heart-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.likes}</Text>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 12 }} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.commentCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: isDark ? colors.border : '#E5E5E5' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: isDark ? colors.border : '#E5E5E5' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUserId === user.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : '#E5E5E5' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {/* Banner */}
            {user.bannerImage ? (
              <Image source={{ uri: user.bannerImage }} style={styles.banner} />
            ) : (
              <View style={[styles.banner, { backgroundColor: isDark ? colors.surface : '#E0E0E0' }]} />
            )}

            {/* Profile Info */}
            <View style={[styles.profileSection, { borderBottomColor: isDark ? colors.border : '#E5E5E5' }]}>
              <View style={[styles.avatarContainer, { borderColor: colors.background }]}>
                <Avatar user={user} size={80} />
              </View>

              {!isOwnProfile && (
                <TouchableOpacity
                  style={[styles.followButton, user.isFollowing && [styles.followingButton, { backgroundColor: colors.background, borderColor: '#007AFF' }]]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={user.isFollowing ? '#007AFF' : '#FFF'} />
                  ) : (
                    <Text
                      style={[styles.followButtonText, user.isFollowing && styles.followingButtonText]}
                    >
                      {user.isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <Text style={[styles.userName, { color: colors.text }]}>{getUserDisplayName(user)}</Text>
              <Text style={[styles.userHandle, { color: colors.textSecondary }]}>@{getUserHandle(user)}</Text>

              {user.bio && <Text style={[styles.bio, { color: colors.text }]}>{user.bio}</Text>}

              {user.location && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>{user.location}</Text>
                </View>
              )}

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>{user._count?.posts || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>{user._count?.followers || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>{user._count?.following || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
                </View>
              </View>
            </View>

            {/* Posts Header */}
            <View style={[styles.postsHeader, { borderBottomColor: isDark ? colors.border : '#E5E5E5' }]}>
              <Text style={[styles.postsTitle, { color: colors.text }]}>Posts</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.noPosts}>
            <Text style={[styles.noPostsText, { color: colors.textTertiary }]}>No posts yet</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
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
  banner: {
    width: '100%',
    height: 120,
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  avatarContainer: {
    marginTop: -40,
    marginBottom: 12,
    borderWidth: 4,
    borderColor: '#FFF',
    borderRadius: 44,
    alignSelf: 'flex-start',
  },
  followButton: {
    position: 'absolute',
    right: 16,
    top: 12,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  followButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  followingButtonText: {
    color: '#007AFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  userHandle: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
  },
  bio: {
    fontSize: 15,
    color: '#333',
    marginTop: 12,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  stat: {
    marginRight: 24,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  postsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  postsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  postItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  tickerBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  tickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  postTime: {
    fontSize: 13,
    color: '#999',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  noPosts: {
    padding: 40,
    alignItems: 'center',
  },
  noPostsText: {
    fontSize: 15,
    color: '#999',
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
