// app/profile/subscription.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Check,
  Crown,
  Gem,
  Award,
  Zap,
  Shield,
  TrendingUp,
  Bell,
  BarChart3,
  Users,
  FileText,
  Cpu,
  Headphones,
} from "lucide-react-native";
import Purchases, { PurchasesPackage, CustomerInfo } from "react-native-purchases";

const { width } = Dimensions.get("window");

// Product IDs matching your RevenueCat setup
const PRODUCT_IDS = {
  GOLD: "gold_monthly",
  PLATINUM: "platinum_monthly",
  DIAMOND: "diamond_monthly",
};

// Entitlement ID - must match RevenueCat
const ENTITLEMENT_ID = "WallStreetStocks Pro";

// Tier configuration
const TIERS = {
  gold: {
    id: PRODUCT_IDS.GOLD,
    name: "Gold",
    icon: Award,
    color: "#FFD700",
    bgColor: "#FFFBEB",
    borderColor: "#FFD700",
    features: [
      { icon: Shield, text: "Ad-free experience" },
      { icon: BarChart3, text: "Basic stock analysis" },
      { icon: TrendingUp, text: "Watchlist (up to 20 stocks)" },
      { icon: FileText, text: "Daily market summary" },
      { icon: Headphones, text: "Email support" },
    ],
  },
  platinum: {
    id: PRODUCT_IDS.PLATINUM,
    name: "Platinum",
    icon: Crown,
    color: "#7C3AED",
    bgColor: "#F5F3FF",
    borderColor: "#7C3AED",
    popular: true,
    features: [
      { icon: Check, text: "Everything in Gold" },
      { icon: BarChart3, text: "Advanced stock analysis" },
      { icon: Cpu, text: "AI-powered insights" },
      { icon: TrendingUp, text: "Unlimited watchlists" },
      { icon: Bell, text: "Real-time price alerts" },
      { icon: Headphones, text: "Priority support" },
    ],
  },
  diamond: {
    id: PRODUCT_IDS.DIAMOND,
    name: "Diamond",
    icon: Gem,
    color: "#06B6D4",
    bgColor: "#ECFEFF",
    borderColor: "#06B6D4",
    features: [
      { icon: Check, text: "Everything in Platinum" },
      { icon: FileText, text: "Exclusive research reports" },
      { icon: BarChart3, text: "Portfolio optimization" },
      { icon: TrendingUp, text: "Custom stock screeners" },
      { icon: Cpu, text: "API access" },
      { icon: Users, text: "Dedicated account manager" },
    ],
  },
};

type TierKey = keyof typeof TIERS;

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedTier, setSelectedTier] = useState<TierKey>("platinum");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<string | null>(null);

  useEffect(() => {
    loadOfferings();
    checkSubscriptionStatus();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      
      // DEBUG LOGGING - Remove after troubleshooting
      console.log("📦 ========== OFFERINGS DEBUG ==========");
      console.log("📦 Current offering ID:", offerings.current?.identifier);
      console.log("📦 Packages count:", offerings.current?.availablePackages?.length || 0);
      console.log("📦 All offering keys:", Object.keys(offerings.all));
      
      if (offerings.current?.availablePackages) {
        offerings.current.availablePackages.forEach((pkg, i) => {
          console.log(`📦 Package ${i}:`, {
            pkgIdentifier: pkg.identifier,
            productId: pkg.product.identifier,
            price: pkg.product.priceString
          });
        });
        setPackages(offerings.current.availablePackages);
      } else {
        console.log("📦 NO PACKAGES FOUND!");
        
        // Try to get all offerings
        Object.entries(offerings.all).forEach(([key, offering]) => {
          console.log(`📦 Offering "${key}":`, offering.availablePackages?.length, "packages");
          offering.availablePackages?.forEach((pkg, i) => {
            console.log(`  - Package ${i}: ${pkg.identifier} (${pkg.product.identifier})`);
          });
        });
      }
      console.log("📦 =====================================");
      
    } catch (error) {
      console.error("❌ Error loading offerings:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      // Check if user has the entitlement
      const entitlement = info.entitlements.active[ENTITLEMENT_ID];
      if (entitlement) {
        setActiveSubscription(entitlement.productIdentifier);
        console.log("✅ Active subscription:", entitlement.productIdentifier);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  // Match packages by product identifier (gold_monthly, platinum_monthly, diamond_monthly)
  const getPackageForTier = (tierId: string): PurchasesPackage | undefined => {
    const tierName = tierId.replace("_monthly", "").toLowerCase();
    
    console.log(`🔍 Looking for tier: ${tierName}, packages available: ${packages.length}`);
    
    const pkg = packages.find((pkg) => {
      const productId = pkg.product.identifier.toLowerCase();
      const matches = productId.includes(tierName);
      console.log(`  - Checking ${productId} for "${tierName}": ${matches}`);
      return matches;
    });
    
    console.log(`🔍 Result for ${tierName}:`, pkg?.product.identifier || "NOT FOUND");
    return pkg;
  };

  const getPrice = (tierId: string): string => {
    const pkg = getPackageForTier(tierId);
    if (pkg) {
      return pkg.product.priceString;
    }
    // Fallback prices
    switch (tierId) {
      case PRODUCT_IDS.GOLD:
        return "$9.99";
      case PRODUCT_IDS.PLATINUM:
        return "$19.99";
      case PRODUCT_IDS.DIAMOND:
        return "$49.99";
      default:
        return "";
    }
  };

  const handlePurchase = async () => {
    const tier = TIERS[selectedTier];
    const pkg = getPackageForTier(tier.id);

    console.log("🛒 Attempting purchase for tier:", tier.name);
    console.log("🛒 Package found:", pkg?.product.identifier);
    console.log("🛒 Total packages available:", packages.length);

    if (!pkg) {
      Alert.alert(
        "Error", 
        "Unable to find subscription package. Your subscriptions may still be under review by Apple.",
        [{ text: "OK" }]
      );
      return;
    }

    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(customerInfo);

      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        const productId = customerInfo.entitlements.active[ENTITLEMENT_ID].productIdentifier;
        setActiveSubscription(productId);
        Alert.alert(
          "Success!",
          `Welcome to ${tier.name}! Your subscription is now active.`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("Purchase error:", error);
        Alert.alert("Purchase Failed", error.message || "Unable to complete purchase. Please try again.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);

      const entitlement = info.entitlements.active[ENTITLEMENT_ID];
      if (entitlement) {
        setActiveSubscription(entitlement.productIdentifier);
        Alert.alert("Success", "Your subscription has been restored!");
      } else {
        Alert.alert("No Subscriptions Found", "We couldn't find any active subscriptions to restore.");
      }
    } catch (error: any) {
      console.error("Restore error:", error);
      Alert.alert("Restore Failed", error.message || "Unable to restore purchases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isSubscribed = (tierId: string): boolean => {
    if (!activeSubscription) return false;
    const tierName = tierId.replace("_monthly", "").toLowerCase();
    return activeSubscription.toLowerCase().includes(tierName);
  };

  const getCurrentTierLevel = (): number => {
    if (!activeSubscription) return 0;
    const sub = activeSubscription.toLowerCase();
    if (sub.includes("diamond")) return 3;
    if (sub.includes("platinum")) return 2;
    if (sub.includes("gold")) return 1;
    return 0;
  };

  const getTierLevel = (tierId: string): number => {
    if (tierId === PRODUCT_IDS.DIAMOND) return 3;
    if (tierId === PRODUCT_IDS.PLATINUM) return 2;
    if (tierId === PRODUCT_IDS.GOLD) return 1;
    return 0;
  };

  const renderTierCard = (tierKey: TierKey) => {
    const tier = TIERS[tierKey];
    const Icon = tier.icon;
    const isSelected = selectedTier === tierKey;
    const isCurrentPlan = isSubscribed(tier.id);
    const currentLevel = getCurrentTierLevel();
    const tierLevel = getTierLevel(tier.id);
    const isDowngrade = activeSubscription && tierLevel < currentLevel;

    return (
      <TouchableOpacity
        key={tierKey}
        style={[
          styles.tierCard,
          isSelected && { borderColor: tier.borderColor, borderWidth: 2 },
          isCurrentPlan && styles.currentPlanCard,
        ]}
        onPress={() => !isCurrentPlan && setSelectedTier(tierKey)}
        activeOpacity={isCurrentPlan ? 1 : 0.7}
        disabled={isCurrentPlan}
      >
        {/* Popular Badge */}
        {"popular" in tier && tier.popular && !isCurrentPlan && (
          <View style={[styles.popularBadge, { backgroundColor: tier.color }]}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}

        {/* Current Plan Badge */}
        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.tierHeader}>
          <View style={[styles.tierIconContainer, { backgroundColor: tier.bgColor }]}>
            <Icon size={28} color={tier.color} />
          </View>
          <View style={styles.tierInfo}>
            <Text style={styles.tierName}>{tier.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{getPrice(tier.id)}</Text>
              <Text style={styles.period}>/month</Text>
            </View>
          </View>
          {isSelected && !isCurrentPlan && (
            <View style={[styles.selectedCheck, { backgroundColor: tier.color }]}>
              <Check size={16} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {tier.features.map((feature, index) => {
            const FeatureIcon = feature.icon;
            return (
              <View key={index} style={styles.featureRow}>
                <FeatureIcon size={16} color={tier.color} />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            );
          })}
        </View>

        {/* Downgrade Warning */}
        {isDowngrade && isSelected && (
          <View style={styles.downgradeWarning}>
            <Text style={styles.downgradeText}>
              This is a downgrade from your current plan
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Zap size={40} color="#007AFF" />
          </View>
          <Text style={styles.heroTitle}>Unlock Premium Features</Text>
          <Text style={styles.heroSubtitle}>
            Get access to advanced analysis tools, AI insights, and exclusive research to supercharge your investing.
          </Text>
        </View>

        {/* Debug Info - Remove after testing */}
        {packages.length === 0 && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              ⚠️ No subscription packages loaded.{"\n"}
              Your products may still be under review by Apple.
            </Text>
          </View>
        )}

        {/* Subscription Status */}
        {activeSubscription && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              You're currently subscribed to{" "}
              <Text style={styles.statusPlan}>
                {activeSubscription.toLowerCase().includes("gold") && "Gold"}
                {activeSubscription.toLowerCase().includes("platinum") && "Platinum"}
                {activeSubscription.toLowerCase().includes("diamond") && "Diamond"}
              </Text>
            </Text>
          </View>
        )}

        {/* Tier Cards */}
        <View style={styles.tiersContainer}>
          {renderTierCard("gold")}
          {renderTierCard("platinum")}
          {renderTierCard("diamond")}
        </View>

        {/* Subscribe Button */}
        {!isSubscribed(TIERS[selectedTier].id) && (
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              { backgroundColor: TIERS[selectedTier].color },
              purchasing && styles.buttonDisabled,
            ]}
            onPress={handlePurchase}
            activeOpacity={0.8}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.subscribeButtonText}>
                  {activeSubscription ? "Change Plan" : "Subscribe"} to {TIERS[selectedTier].name}
                </Text>
                <Text style={styles.subscribePrice}>
                  {getPrice(TIERS[selectedTier].id)}/month
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          activeOpacity={0.7}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          Subscriptions will automatically renew unless canceled within 24 hours before the end of the current period. You can manage your subscription in your App Store settings.
        </Text>

        {/* Links */}
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => router.push("/profile/terms")}>
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>•</Text>
          <TouchableOpacity onPress={() => router.push("/profile/privacy")}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  headerRight: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#8E8E93",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  debugContainer: {
    backgroundColor: "#FFF3CD",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFE69C",
  },
  debugText: {
    fontSize: 14,
    color: "#856404",
    textAlign: "center",
    lineHeight: 20,
  },
  statusContainer: {
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 15,
    color: "#333333",
    textAlign: "center",
  },
  statusPlan: {
    fontWeight: "700",
    color: "#007AFF",
  },
  tiersContainer: {
    gap: 16,
    marginBottom: 24,
  },
  tierCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    position: "relative",
    overflow: "hidden",
  },
  currentPlanCard: {
    backgroundColor: "#F9F9F9",
    borderColor: "#34C759",
    borderWidth: 2,
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  currentBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#34C759",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  tierIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
  },
  period: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: 2,
  },
  selectedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  featuresContainer: {
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: "#333333",
    flex: 1,
  },
  downgradeWarning: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
  },
  downgradeText: {
    fontSize: 12,
    color: "#856404",
    textAlign: "center",
  },
  subscribeButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  subscribePrice: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 20,
  },
  restoreText: {
    fontSize: 15,
    color: "#007AFF",
    fontWeight: "500",
  },
  termsText: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  linksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  linkText: {
    fontSize: 13,
    color: "#007AFF",
  },
  linkDivider: {
    fontSize: 13,
    color: "#8E8E93",
  },
});
