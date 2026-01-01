// app/profile/personal-info.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/lib/auth";
import { useUserProfile } from "@/context/UserProfileContext";
import { SubscriptionBadgeProfile } from "@/components/SubscriptionBadge";

const API_BASE_URL = "https://www.wallstreetstocks.ai/api";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  profileImage?: string;
  bannerImage?: string;
  subscriptionTier?: string;
  createdAt: string;
  _count?: {
    posts: number;
    followers: number;
    following: number;
    likes: number;
  };
}

interface Post {
  id: number;
  content: string;
  title?: string;
  mediaUrl?: string;
  createdAt: string;
  _count?: {
    likes: number;
    comments: number;
  };
}

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { profile: userProfile, loading: profileLoading, refreshProfile, getDisplayName, getUsername, getHandle } = useUserProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "replies" | "media" | "likes">("posts");
  
  // Local storage fallback
  const [localData, setLocalData] = useState<any>(null);

  const getUserId = (): number | null => {
    if (authUser?.id) return Number(authUser.id);
    return null;
  };

  const fetchUserProfile = async () => {
    try {
      const userId = getUserId();
      
      // Also load local data as fallback
      const savedLocal = await AsyncStorage.getItem("personalInfo");
      if (savedLocal) {
        setLocalData(JSON.parse(savedLocal));
      }

      if (!userId) {
        // Use local data if not logged in
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Refresh profile from context
      await refreshProfile();

      // Fetch user's posts
      const postsRes = await fetch(`${API_BASE_URL}/posts?userId=${userId}`);

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(Array.isArray(postsData) ? postsData : []);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [authUser]);

  // Refresh when screen comes into focus (e.g., after editing profile)
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [authUser])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserProfile();
  }, []);

  const pickBannerImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Save locally
      const saved = await AsyncStorage.getItem("personalInfo");
      const data = saved ? JSON.parse(saved) : {};
      data.bannerImage = result.assets[0].uri;
      await AsyncStorage.setItem("personalInfo", JSON.stringify(data));
      setLocalData({ ...localData, bannerImage: result.assets[0].uri });
    }
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Save locally
      const saved = await AsyncStorage.getItem("personalInfo");
      const data = saved ? JSON.parse(saved) : {};
      data.avatar = result.assets[0].uri;
      await AsyncStorage.setItem("personalInfo", JSON.stringify(data));
      setLocalData({ ...localData, avatar: result.assets[0].uri });
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Use context functions for consistent display
  const displayName = getDisplayName();
  const displayUsername = getUsername();
  const displayHandle = getHandle();
  const displayBio = userProfile?.bio || localData?.bio || "Tap Edit Profile to add a bio";
  const displayLocation = userProfile?.location || localData?.location || "";
  const displayWebsite = userProfile?.website || localData?.website || "";
  const displayAvatar = userProfile?.profileImage || localData?.avatar;
  const displayBanner = userProfile?.bannerImage || localData?.bannerImage;
  const displayFollowing = userProfile?._count?.following ?? 0;
  const displayFollowers = userProfile?._count?.followers ?? 0;
  const displayPosts = userProfile?._count?.posts ?? posts.length ?? 0;
  const displayLikes = userProfile?._count?.likes ?? 0;

  const renderPost = (item: Post) => (
    <TouchableOpacity key={item.id} style={styles.postItem} activeOpacity={0.7}>
      <Text style={styles.postContent}>{item.content}</Text>
      {item.mediaUrl && (
        <Image source={{ uri: item.mediaUrl }} style={styles.postMedia} />
      )}
      <Text style={styles.postTime}>{formatTimeAgo(item.createdAt)}</Text>
    </TouchableOpacity>
  );

  if (loading || profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - Floating over banner */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push("/profile/edit-profile")}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Image */}
        <TouchableOpacity onPress={pickBannerImage} activeOpacity={0.9}>
          {displayBanner ? (
            <Image source={{ uri: displayBanner }} style={styles.bannerImage} />
          ) : (
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
              }}
              style={styles.bannerImage}
            />
          )}
        </TouchableOpacity>

        {/* Profile Image - Overlapping Banner */}
        <View style={styles.profileImageWrapper}>
          <TouchableOpacity onPress={pickProfileImage} activeOpacity={0.9}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileInitials}>{getInitials(displayName)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userHandle}>@{displayUsername}</Text>

          {/* Bio */}
          <Text style={styles.bio}>{displayBio}</Text>

          {/* Location & Website */}
          <View style={styles.metaRow}>
            {displayLocation && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{displayLocation}</Text>
              </View>
            )}
            {displayWebsite && (
              <TouchableOpacity
                style={styles.metaItem}
                onPress={() => {
                  const url = displayWebsite.startsWith("http") 
                    ? displayWebsite 
                    : `https://${displayWebsite}`;
                  Linking.openURL(url);
                }}
              >
                <Ionicons name="link-outline" size={16} color="#007AFF" />
                <Text style={[styles.metaText, styles.linkText]}>
                  {displayWebsite.replace(/^https?:\/\//, "")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(displayPosts)}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(displayFollowers)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(displayFollowing)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(displayLikes)}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </TouchableOpacity>
          </View>

          {/* Subscription Badge */}
          <SubscriptionBadgeProfile tier={userProfile?.subscriptionTier as any} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "posts" && styles.activeTab]}
            onPress={() => setActiveTab("posts")}
          >
            <Text style={[styles.tabText, activeTab === "posts" && styles.activeTabText]}>
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "replies" && styles.activeTab]}
            onPress={() => setActiveTab("replies")}
          >
            <Text style={[styles.tabText, activeTab === "replies" && styles.activeTabText]}>
              Replies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "media" && styles.activeTab]}
            onPress={() => setActiveTab("media")}
          >
            <Text style={[styles.tabText, activeTab === "media" && styles.activeTabText]}>
              Media
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "likes" && styles.activeTab]}
            onPress={() => setActiveTab("likes")}
          >
            <Text style={[styles.tabText, activeTab === "likes" && styles.activeTabText]}>
              Likes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Posts List */}
        <View style={styles.postsContainer}>
          {posts.length > 0 ? (
            posts.map((post) => renderPost(post))
          ) : (
            <View style={styles.emptyPosts}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyPostsTitle}>No posts yet</Text>
              <Text style={styles.emptyPostsSubtitle}>
                Share your thoughts with the community
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  scrollView: {
    flex: 1,
  },
  bannerImage: {
    width: "100%",
    height: 180,
  },
  profileImageWrapper: {
    marginTop: -50,
    marginLeft: 16,
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitials: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  userHandle: {
    fontSize: 15,
    color: "#666",
    marginTop: 2,
  },
  bio: {
    fontSize: 15,
    color: "#000",
    marginTop: 12,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: "#666",
  },
  linkText: {
    color: "#007AFF",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 24,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  postsContainer: {
    paddingBottom: 100,
  },
  postItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  samplePost: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  postContent: {
    fontSize: 15,
    color: "#000",
    lineHeight: 22,
  },
  postMedia: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginTop: 12,
  },
  postTime: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
  },
  emptyPosts: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyPostsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptyPostsSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
});
