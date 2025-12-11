// app/notifications.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = "https://www.wallstreetstocks.ai/api";

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'reply';
  message: string;
  isRead: boolean;
  createdAt: string;
  fromUser: {
    id: number;
    name: string;
    username: string;
    profileImage?: string;
  };
  post?: {
    id: number;
    content: string;
  };
}

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      } else {
        // Mock data for testing
        setNotifications([
          {
            id: 1,
            type: 'like',
            message: 'liked your post',
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            fromUser: { id: 2, name: 'Sarah Chen', username: 'sarahc', profileImage: undefined },
            post: { id: 1, content: 'Just bought more $NVDA on this dip! 🚀' },
          },
          {
            id: 2,
            type: 'mention',
            message: 'mentioned you in a post',
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            fromUser: { id: 3, name: 'Mike Trading', username: 'miketrader', profileImage: undefined },
            post: { id: 2, content: '@sedi1995 what do you think about $TSLA earnings?' },
          },
          {
            id: 3,
            type: 'follow',
            message: 'started following you',
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            fromUser: { id: 4, name: 'Alex Investor', username: 'alexinv', profileImage: undefined },
          },
          {
            id: 4,
            type: 'comment',
            message: 'commented on your post',
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            fromUser: { id: 5, name: 'Trading Pro', username: 'tradingpro', profileImage: undefined },
            post: { id: 3, content: 'Great analysis! I agree with your $AAPL thesis.' },
          },
          {
            id: 5,
            type: 'reply',
            message: 'replied to your comment',
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            fromUser: { id: 6, name: 'Market Watch', username: 'marketwatch', profileImage: undefined },
            post: { id: 4, content: 'Thanks for the insight!' },
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);

    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'reply':
      case 'mention':
        if (notification.post) {
          router.push(`/community/post/${notification.post.id}` as any);
        }
        break;
      case 'follow':
        router.push(`/profile/my-profile?userId=${notification.fromUser.id}`);
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return { name: 'heart', color: '#FF3B30' };
      case 'comment':
        return { name: 'chatbubble', color: '#007AFF' };
      case 'follow':
        return { name: 'person-add', color: '#34C759' };
      case 'mention':
        return { name: 'at', color: '#5856D6' };
      case 'reply':
        return { name: 'arrow-undo', color: '#FF9500' };
      default:
        return { name: 'notifications', color: '#666' };
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

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
          <Ionicons name={icon.name as any} size={20} color={icon.color} />
        </View>

        {/* Content */}
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            {item.fromUser.profileImage ? (
              <Image source={{ uri: item.fromUser.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {item.fromUser.name[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.textContainer}>
              <Text style={styles.notificationText}>
                <Text style={styles.username}>{item.fromUser.name}</Text>
                {' '}{item.message}
              </Text>
              <Text style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
          </View>

          {/* Post Preview */}
          {item.post && (
            <View style={styles.postPreview}>
              <Text style={styles.postPreviewText} numberOfLines={2}>
                {item.post.content}
              </Text>
            </View>
          )}
        </View>

        {/* Unread Dot */}
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>
            When someone likes, comments, or mentions you, you'll see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  markAllButton: {
    padding: 4,
  },
  markAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  list: {
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  unreadNotification: {
    backgroundColor: '#F0F8FF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  textContainer: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  username: {
    fontWeight: '700',
    color: '#000',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  postPreview: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginLeft: 46,
  },
  postPreviewText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    marginLeft: 8,
    alignSelf: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
