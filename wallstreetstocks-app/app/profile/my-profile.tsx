// app/profile/my-profile.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MyProfile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');

  const [profile, setProfile] = useState({
    name: 'John Doe',
    username: 'johndoe',
    bio: 'Building the future 🚀 | Investor | AI Enthusiast',
    location: 'San Francisco, CA',
    website: 'johndoe.com',
    avatar: null as string | null,
    followers: 1240,
    following: 320,
    posts: 892,
  });

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('personalInfo');
      if (saved) {
        const data = JSON.parse(saved);
        setProfile(prev => ({
          ...prev,
          name: data.name || prev.name,
          username: data.username || prev.username,
          avatar: data.avatar || prev.avatar,
        }));
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Edit Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/profile/personal-info' as any)}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Cover Photo */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80' }}
          style={styles.coverPhoto}
        >
          <View style={styles.coverOverlay} />
        </ImageBackground>

        {/* Avatar + Basic Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.username}>@{profile.username}</Text>

            <Text style={styles.bio}>{profile.bio}</Text>

            {profile.location && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={18} color="#666" />
                <Text style={styles.metaText}>{profile.location}</Text>
              </View>
            )}

            {profile.website && (
              <View style={styles.metaRow}>
                <Ionicons name="link-outline" size={18} color="#1D9BF0" />
                <Text style={styles.websiteText}>{profile.website}</Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.stat}>
                <Text style={styles.statNumber}>{profile.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stat}>
                <Text style={styles.statNumber}>{profile.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{profile.posts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Premium Badge */}
        <View style={styles.premiumBadge}>
          <Ionicons name="diamond" size={20} color="#1D9BF0" />
          <Text style={styles.premiumText}>Premium Member</Text>
        </View>

        {/* Clickable Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabContainer, activeTab === 'posts' && styles.activeTabContainer]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tab, activeTab === 'posts' && styles.activeTab]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabContainer, activeTab === 'replies' && styles.activeTabContainer]}
            onPress={() => setActiveTab('replies')}
          >
            <Text style={[styles.tab, activeTab === 'replies' && styles.activeTab]}>Replies</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabContainer, activeTab === 'media' && styles.activeTabContainer]}
            onPress={() => setActiveTab('media')}
          >
            <Text style={[styles.tab, activeTab === 'media' && styles.activeTab]}>Media</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabContainer, activeTab === 'likes' && styles.activeTabContainer]}
            onPress={() => setActiveTab('likes')}
          >
            <Text style={[styles.tab, activeTab === 'likes' && styles.activeTab]}>Likes</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'posts' && (
            <View style={styles.post}>
              <Text style={styles.postText}>
                Just deployed the new AI dashboard 🔥 Real-time market predictions are looking sharp today 📈
              </Text>
              <Text style={styles.postDate}>2h ago</Text>
            </View>
          )}
          {activeTab === 'replies' && (
            <Text style={styles.emptyText}>No replies yet</Text>
          )}
          {activeTab === 'media' && (
            <Text style={styles.emptyText}>No media posts yet</Text>
          )}
          {activeTab === 'likes' && (
            <Text style={styles.emptyText}>No liked posts yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: { fontWeight: '600' },
  coverPhoto: { height: 200, width: '100%' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  profileSection: { marginTop: -60 },
  avatarContainer: { alignSelf: 'flex-start', marginLeft: 20 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarEmoji: { fontSize: 60 },
  infoContainer: { padding: 20 },
  name: { fontSize: 24, fontWeight: 'bold' },
  username: { fontSize: 16, color: '#666', marginBottom: 12 },
  bio: { fontSize: 16, lineHeight: 22, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  metaText: { marginLeft: 6, color: '#666', fontSize: 15 },
  websiteText: { marginLeft: 6, color: '#1D9BF0', fontSize: 15 },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 30 },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: '#666' },
  premiumBadge: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: -20,
    marginBottom: 20,
  },
  premiumText: { marginLeft: 8, color: '#1D9BF0', fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  activeTabContainer: {
    borderBottomWidth: 3,
    borderBottomColor: '#1D9BF0',
  },
  tab: {
    fontSize: 16,
    color: '#666',
  },
  activeTab: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D9BF0',
  },
  tabContent: { padding: 20 },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  post: { paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  postText: { fontSize: 16, lineHeight: 24 },
  postDate: { fontSize: 14, color: '#999', marginTop: 8 },
});
