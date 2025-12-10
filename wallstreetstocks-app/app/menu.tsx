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
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import {
  ChevronRight,
  MessageSquare,
  Mail,
  Star,
  Settings,
  HelpCircle,
  FileText,
  Shield,
  LogOut,
  TrendingUp,
  Users,
  Gift,
  Info,
  User,
} from "lucide-react-native";

type MenuItem = {
  label: string;
  route: string;
  icon?: any;
  color?: string;
};

export default function MenuPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
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

  const menuItems: MenuItem[] = [
    { label: "My Profile", route: "/profile/my-profile", icon: User, color: "#007AFF" },
    { label: "Subscription", route: "/profile/subscription", icon: Gift, color: "#007AFF" },
    { label: "Trending", route: "/profile/trending", icon: TrendingUp },
    { label: "About", route: "/profile/about", icon: Info },
    { label: "House Rules", route: "/profile/house-rules", icon: Users },
    { label: "Referrals", route: "/profile/referrals", icon: Gift },
    { label: "Settings", route: "/profile/settings", icon: Settings },
    { label: "Help", route: "/profile/help", icon: HelpCircle },
    { label: "Terms & Conditions", route: "/profile/terms", icon: FileText },
    { label: "Privacy", route: "/profile/privacy", icon: Shield },
  ];

  const shareItems: MenuItem[] = [
    { label: "Text This App to a Friend", route: "/profile/text-friend", icon: MessageSquare },
    { label: "Email This App to a Friend", route: "/profile/email-friend", icon: Mail },
    { label: "Rate us on the App Store", route: "/profile/rate-us", icon: Star },
  ];

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

  return (
    <View style={styles.container}>
      {/* === HEADER === */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>{"<"}</Text>
        </TouchableOpacity>
        <Image
          source={{ uri: "https://via.placeholder.com/40" }}
          style={styles.logo}
        />
        <View style={styles.userInfo}>
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.username}>{getDisplayName()}</Text>
          )}
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
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* === MAIN MENU === */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  {Icon && <Icon size={22} color={item.color || "#000000"} />}
                  <Text style={[styles.menuLabel, { color: item.color || "#000000" }]}>
                    {item.label}
                  </Text>
                </View>
                <ChevronRight size={20} color="#8E8E93" />
              </TouchableOpacity>
            );
          })}
          
          {/* Sign Out */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <LogOut size={22} color="#FF3B30" />
              <Text style={[styles.menuLabel, { color: "#FF3B30" }]}>
                Sign Out
              </Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* === SHARE SECTION === */}
        <View style={styles.shareContainer}>
          {shareItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.shareItem}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.shareLabel}>{item.label}</Text>
                <Icon size={20} color="#8E8E93" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* === VERSION FOOTER === */}
        <View style={styles.footer}>
          <Text style={styles.version}>App Version 7.13.0 (9613)</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: "#000000",
  },
  logo: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  username: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  menuContainer: {
    marginTop: 16,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuLabel: {
    fontSize: 17,
    fontWeight: "400",
  },
  shareContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  shareItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  shareLabel: {
    fontSize: 17,
    color: "#000000",
  },
  footer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  version: {
    fontSize: 13,
    color: "#8E8E93",
  },
});

