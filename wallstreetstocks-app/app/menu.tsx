// app/menu.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import { useSubscription } from "@/context/SubscriptionContext";

type MenuItem = {
  label: string;
  route?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

export default function MenuPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { subscriptionTier } = useSubscription();

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert("Error", "Failed to sign out");
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: "Check out WallStreetStocks - the best app for stock research and community insights! Download it now: https://apps.apple.com/app/wallstreetstocks",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleRateApp = () => {
    // Replace with your actual App Store ID
    const appStoreUrl = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/id123456789?action=write-review'
      : 'https://play.google.com/store/apps/details?id=com.wallstreetstocks.app';
    Linking.openURL(appStoreUrl);
  };

  const getTierBadge = () => {
    switch (subscriptionTier) {
      case 'diamond': return { text: 'Diamond', color: '#B9F2FF' };
      case 'platinum': return { text: 'Platinum', color: '#E5E4E2' };
      case 'gold': return { text: 'Gold', color: '#FFD700' };
      default: return { text: 'Free', color: '#8E8E93' };
    }
  };

  const tierBadge = getTierBadge();

  // Get user initials for avatar
  const getUserInitial = () => {
    if (!user?.name) return "U";
    return user.name.charAt(0).toUpperCase();
  };

  // Get display name
  const getDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return "User";
  };

  const menuSections: MenuSection[] = [
    {
      title: "Account",
      items: [
        {
          label: "My Profile",
          route: "/profile/my-profile",
          icon: "person-circle-outline",
          color: "#007AFF"
        },
        {
          label: "Portfolio",
          route: "/portfolio",
          icon: "pie-chart-outline",
          color: "#34C759",
        },
        {
          label: "Messages",
          route: "/messages",
          icon: "chatbubble-outline",
          color: "#5856D6",
        },
        {
          label: "Subscription",
          route: "/(modals)/paywall",
          icon: "diamond-outline",
          color: "#5856D6",
          badge: tierBadge.text,
          badgeColor: tierBadge.color,
        },
        {
          label: "Notifications",
          route: "/notifications",
          icon: "notifications-outline",
          color: "#FF9500",
        },
        {
          label: "Price Alerts",
          route: "/price-alerts",
          icon: "trending-up",
          color: "#FFD700",
        },
      ],
    },
    {
      title: "Community",
      items: [
        {
          label: "House Rules",
          route: "/profile/house-rules",
          icon: "shield-checkmark-outline",
          color: "#34C759",
        },
        {
          label: "Blocked Users",
          route: "/profile/blocked",
          icon: "ban-outline",
          color: "#FF3B30",
        },
        {
          label: "Muted Users",
          route: "/profile/muted",
          icon: "volume-mute-outline",
          color: "#8E8E93",
        },
      ],
    },
    {
      title: "Invite Friends",
      items: [
        {
          label: "Share App",
          icon: "share-outline",
          color: "#007AFF",
          onPress: handleShare,
        },
        {
          label: "Referral Program",
          route: "/profile/referrals",
          icon: "gift-outline",
          color: "#34C759",
          badge: "Earn $$$",
          badgeColor: "#34C759",
        },
        {
          label: "Rate Us",
          icon: "star-outline",
          color: "#FF9500",
          onPress: handleRateApp,
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          label: "Help Center",
          route: "/profile/help",
          icon: "help-circle-outline",
          color: "#5856D6",
        },
        {
          label: "Contact Us",
          route: "/profile/contact",
          icon: "mail-outline",
          color: "#007AFF",
        },
        {
          label: "Report a Bug",
          route: "/profile/bug-report",
          icon: "bug-outline",
          color: "#FF3B30",
        },
      ],
    },
    {
      title: "Settings & Legal",
      items: [
        {
          label: "Settings",
          route: "/profile/settings",
          icon: "settings-outline",
          color: "#8E8E93",
        },
        {
          label: "Terms of Service",
          route: "/profile/terms",
          icon: "document-text-outline",
          color: "#007AFF",
        },
        {
          label: "Privacy Policy",
          route: "/profile/privacy",
          icon: "lock-closed-outline",
          color: "#34C759",
        },
        {
          label: "About",
          route: "/profile/about",
          icon: "information-circle-outline",
          color: "#5856D6",
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push('/profile/my-profile')}
          activeOpacity={0.7}
        >
          <View style={styles.profileLeft}>
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{getUserInitial()}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              {loading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <>
                  <Text style={styles.profileName}>{getDisplayName()}</Text>
                  <Text style={styles.profileEmail}>{user?.email || 'Not signed in'}</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.profileRight}>
            <View style={[styles.tierBadge, { backgroundColor: tierBadge.color + '30' }]}>
              <Ionicons
                name={subscriptionTier === 'free' ? 'person' : 'diamond'}
                size={14}
                color={subscriptionTier === 'free' ? '#8E8E93' : tierBadge.color === '#FFD700' ? '#B8860B' : '#333'}
              />
              <Text style={[
                styles.tierBadgeText,
                { color: subscriptionTier === 'free' ? '#8E8E93' : tierBadge.color === '#FFD700' ? '#B8860B' : '#333' }
              ]}>
                {tierBadge.text}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </View>
        </TouchableOpacity>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex === section.items.length - 1 && styles.menuItemLast,
                  ]}
                  onPress={() => {
                    if (item.onPress) {
                      item.onPress();
                    } else if (item.route) {
                      router.push(item.route as any);
                    }
                  }}
                  activeOpacity={0.6}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[
                      styles.iconContainer,
                      item.color && { backgroundColor: item.color + '15' }
                    ]}>
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.color || "#8E8E93"}
                      />
                    </View>
                    <Text style={styles.menuLabel}>
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.badge && (
                      <View style={[styles.badge, { backgroundColor: item.badgeColor + '20' }]}>
                        <Text style={[styles.badgeText, { color: item.badgeColor === '#FFD700' ? '#B8860B' : item.badgeColor }]}>
                          {item.badge}
                        </Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={handleSignOut}
              activeOpacity={0.6}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FF3B3015' }]}>
                  <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                </View>
                <Text style={[styles.menuLabel, { color: "#FF3B30" }]}>
                  Sign Out
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>WallStreetStocks</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.copyright}>Made with in New York</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 12,
    backgroundColor: "#F5F5F7",
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Profile Card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: "#8E8E93",
  },
  profileRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 16,
  },
  sectionContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5F5F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  // Footer
  footer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  version: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: "#C7C7CC",
  },
});
