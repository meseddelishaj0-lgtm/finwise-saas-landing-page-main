// app/messages/index.tsx
// Direct Messages - Conversations List
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { FLATLIST_PERFORMANCE_PROPS, ITEM_HEIGHTS } from '@/components/OptimizedListItems';
import { useTheme } from '@/context/ThemeContext';

const DELETE_BUTTON_WIDTH = 80;
const CONVERSATION_ITEM_HEIGHT = 89; // Fixed height for getItemLayout optimization

const API_BASE_URL = 'https://www.wallstreetstocks.ai/api';

// getItemLayout for FlatList optimization
const getConversationLayout = (_data: any, index: number) => ({
  length: CONVERSATION_ITEM_HEIGHT,
  offset: CONVERSATION_ITEM_HEIGHT * index,
  index,
});

interface OtherUser {
  id: number;
  username: string;
  name: string | null;
  profileImage: string | null;
  isVerified: boolean;
}

interface Conversation {
  id: number;
  otherUser: OtherUser;
  lastMessage: {
    content: string;
    createdAt: string;
    isFromMe: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface SearchUser {
  id: number;
  name: string | null;
  email: string;
  username?: string | null;
  profileImage?: string | null;
  _count?: {
    posts: number;
    followers: number;
  };
}

export default function MessagesScreen() {
  const { colors, isDark } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // New message modal state
  const [newMessageModal, setNewMessageModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchUser[]>([]);
  const [startingConversation, setStartingConversation] = useState(false);

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    const storedUserId = await AsyncStorage.getItem('userId');
    setUserId(storedUserId);
    if (storedUserId) {
      fetchConversations(storedUserId);
    } else {
      setLoading(false);
    }
  };

  const fetchConversations = async (uid: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        headers: { 'x-user-id': uid },
      });

      // Check if response is OK
      if (!response.ok) {
        
        return;
      }

      // Check content type to ensure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return;
      }

      const data = await response.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (userId) {
      fetchConversations(userId);
    }
  }, [userId]);

  const fetchSuggestedUsers = async (uid: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/suggested?userId=${uid}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedUsers(data);
      }
    } catch (error) {
      
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Search for users by username or name
      const response = await fetch(
        `${API_BASE_URL}/user/by-username?query=${encodeURIComponent(query)}&userId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        // Handle both single user and array responses
        if (Array.isArray(data)) {
          setSearchResults(data.filter((u: SearchUser) => u.id.toString() !== userId));
        } else if (data.users) {
          setSearchResults(data.users.filter((u: SearchUser) => u.id.toString() !== userId));
        } else if (data.id) {
          // Single user found
          setSearchResults(data.id.toString() !== userId ? [data] : []);
        } else {
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const openNewMessageModal = () => {
    setNewMessageModal(true);
    setSearchQuery('');
    setSearchResults([]);
    if (userId) {
      fetchSuggestedUsers(userId);
    }
  };

  const startConversation = async (recipientId: number) => {
    if (!userId) return;

    // Check if conversation already exists
    const existingConversation = conversations.find(
      conv => conv.otherUser.id === recipientId
    );

    if (existingConversation) {
      setNewMessageModal(false);
      router.push(`/messages/${existingConversation.id}`);
      return;
    }

    // Navigate to a new conversation screen
    setNewMessageModal(false);
    router.push(`/messages/new?recipientId=${recipientId}`);
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const deleteConversation = async (conversationId: number) => {
    if (!userId) return;

    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? All messages will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update
            const deletedConversation = conversations.find(c => c.id === conversationId);
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));

            try {
              const response = await fetch(
                `${API_BASE_URL}/messages?conversationId=${conversationId}`,
                {
                  method: 'DELETE',
                  headers: { 'x-user-id': userId },
                }
              );

              if (!response.ok) {
                // Restore conversation on error
                if (deletedConversation) {
                  setConversations((prev) => [deletedConversation, ...prev]);
                }
                Alert.alert('Error', 'Failed to delete conversation');
              }
            } catch (error) {
              
              if (deletedConversation) {
                setConversations((prev) => [deletedConversation, ...prev]);
              }
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  };

  const getDisplayName = (user: SearchUser): string => {
    if (user.name && !user.name.includes('@')) return user.name;
    if (user.username) return user.username;
    return 'User';
  };

  const getHandle = (user: SearchUser): string => {
    if (user.username) return user.username;
    if (user.name && !user.name.includes('@')) {
      return user.name.toLowerCase().replace(/\s+/g, '');
    }
    return `user${user.id}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    conversationId: number
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-DELETE_BUTTON_WIDTH, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteConversation(conversationId)}
      >
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <Ionicons name="trash-outline" size={24} color="#FFF" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    return (
      <Swipeable
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
        rightThreshold={40}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[styles.conversationItem, { backgroundColor: colors.card }]}
          onPress={() => router.push(`/messages/${item.id}`)}
          onLongPress={() => deleteConversation(item.id)}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {item.otherUser.profileImage ? (
              <Image source={{ uri: item.otherUser.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? colors.surface : '#E5E5EA' }]}>
                <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                  {(item.otherUser.name || item.otherUser.username || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            {item.unreadCount > 0 && <View style={[styles.unreadBadge, { borderColor: colors.card }]} />}
          </View>

          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                  {item.otherUser.name || item.otherUser.username}
                </Text>
                {item.otherUser.isVerified && (
                  <Ionicons name="checkmark-circle" size={14} color="#007AFF" style={{ marginLeft: 4 }} />
                )}
              </View>
              {item.lastMessage && (
                <Text style={[styles.time, { color: colors.textSecondary }]}>{formatTime(item.lastMessage.createdAt)}</Text>
              )}
            </View>
            {item.lastMessage ? (
              <Text
                style={[styles.lastMessage, { color: colors.textSecondary }, item.unreadCount > 0 && { color: colors.text, fontWeight: '500' }]}
                numberOfLines={1}
              >
                {item.lastMessage.isFromMe && 'You: '}
                {item.lastMessage.content || '[Image]'}
              </Text>
            ) : (
              <Text style={[styles.noMessage, { color: colors.textSecondary }]}>Start a conversation</Text>
            )}
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary || colors.textSecondary} />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (!userId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDark ? colors.border : '#E5E5EA' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign in Required</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Please sign in to access messages</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: isDark ? colors.border : '#E5E5EA' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        <TouchableOpacity onPress={openNewMessageModal} style={styles.newMessageButton}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Messages Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Tap the compose button to start a conversation
          </Text>
          <TouchableOpacity style={styles.startMessageButton} onPress={openNewMessageModal}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.startMessageButtonText}>New Message</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id.toString()}
          getItemLayout={getConversationLayout}
          {...FLATLIST_PERFORMANCE_PROPS}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: isDark ? colors.border : '#E5E5EA' }]} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* New Message Modal */}
      <Modal
        visible={newMessageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNewMessageModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? colors.border : '#E5E5EA' }]}>
            <TouchableOpacity onPress={() => setNewMessageModal(false)}>
              <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Message</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by name or username..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {searchLoading ? (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : searchQuery.length > 0 && searchResults.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="person-outline" size={48} color={colors.textTertiary || colors.textSecondary} />
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>No users found</Text>
            </View>
          ) : (
            <FlatList
              data={searchQuery.length > 0 ? searchResults : suggestedUsers}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={
                searchQuery.length === 0 && suggestedUsers.length > 0 ? (
                  <Text style={[styles.sectionHeader, { color: colors.textSecondary, backgroundColor: colors.surface }]}>Suggested</Text>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => startConversation(item.id)}
                >
                  <View style={styles.userAvatarContainer}>
                    {item.profileImage ? (
                      <Image source={{ uri: item.profileImage }} style={styles.userAvatar} />
                    ) : (
                      <View style={[styles.userAvatarPlaceholder, { backgroundColor: isDark ? colors.surface : '#E5E5EA' }]}>
                        <Text style={[styles.userAvatarText, { color: colors.textSecondary }]}>
                          {getDisplayName(item)[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{getDisplayName(item)}</Text>
                    <Text style={[styles.userHandle, { color: colors.textSecondary }]}>@{getHandle(item)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary || colors.textSecondary} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={[styles.userSeparator, { backgroundColor: isDark ? colors.border : '#E5E5EA' }]} />}
              contentContainerStyle={styles.userListContent}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    height: CONVERSATION_ITEM_HEIGHT, // Fixed height for getItemLayout optimization
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#8E8E93',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    maxWidth: '80%',
  },
  time: {
    fontSize: 13,
    color: '#8E8E93',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
  },
  unreadMessage: {
    color: '#000',
    fontWeight: '500',
  },
  noMessage: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 84,
  },
  newMessageButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  startMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    marginTop: 20,
  },
  startMessageButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  searchLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userAvatarContainer: {
    marginRight: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  userInfo: {
    flex: 1,
  },
  userHandle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  userSeparator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 76,
  },
  userListContent: {
    paddingBottom: 20,
  },
});
