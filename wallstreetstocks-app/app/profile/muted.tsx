// app/profile/muted.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/lib/auth';
import { getMutedUserDetails, unmuteUser } from '@/services/communityApi';

const AVATAR_COLORS = [
  '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a',
  '#a8edea', '#ff9a9e', '#ffecd2', '#a18cd1', '#ff8177',
];

interface MutedUser {
  id: number;
  name: string | null;
  email: string;
  profileImage: string | null;
  mutedAt: string;
}

export default function Muted() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unmuting, setUnmuting] = useState<number | null>(null);

  const getUserId = (): number | null => {
    if (authUser?.id) return Number(authUser.id);
    return null;
  };

  const getAvatarColor = (userId: number): string => {
    return AVATAR_COLORS[userId % AVATAR_COLORS.length];
  };

  const getUserInitials = (user: MutedUser): string => {
    const name = user.name || user.email || '';
    const parts = name.split(/[\s@]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const fetchMutedUsers = async () => {
    const userId = getUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const users = await getMutedUserDetails(userId);
      setMutedUsers(users);
    } catch (error) {
      
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUnmute = async (targetUser: MutedUser) => {
    const userId = getUserId();
    if (!userId) return;

    Alert.alert(
      'Unmute User',
      `Are you sure you want to unmute ${targetUser.name || targetUser.email?.split('@')[0]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmute',
          onPress: async () => {
            setUnmuting(targetUser.id);
            try {
              const result = await unmuteUser(userId, targetUser.id);
              if (result.success) {
                // Remove from local state
                setMutedUsers(prev => prev.filter(u => u.id !== targetUser.id));
                Alert.alert('Unmuted', `${targetUser.name || targetUser.email?.split('@')[0]} has been unmuted`);
              } else {
                throw new Error('Failed to unmute user');
              }
            } catch (error) {
              
              Alert.alert('Error', 'Failed to unmute user. Please try again.');
            } finally {
              setUnmuting(null);
            }
          },
        },
      ]
    );
  };

  // Refresh muted users whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMutedUsers();
    }, [authUser])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMutedUsers();
  };

  const renderMutedUser = ({ item }: { item: MutedUser }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor(item.id) }]}>
            <Text style={styles.avatarText}>{getUserInitials(item)}</Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.name || item.email?.split('@')[0]}</Text>
          <Text style={styles.mutedDate}>Muted {formatDate(item.mutedAt)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.unmuteButton}
        onPress={() => handleUnmute(item)}
        disabled={unmuting === item.id}
      >
        {unmuting === item.id ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Text style={styles.unmuteText}>Unmute</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Muted Accounts</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : mutedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="volume-mute-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Muted Users</Text>
          <Text style={styles.emptySubtitle}>
            When you mute someone, they&apos;ll appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={mutedUsers}
          renderItem={renderMutedUser}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 56,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  title: { 
    fontSize: 18, 
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mutedDate: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  unmuteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    minWidth: 80,
    alignItems: 'center',
  },
  unmuteText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});

