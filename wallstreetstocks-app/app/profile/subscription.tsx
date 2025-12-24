// app/profile/subscription.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
  Linking,
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
  Settings,
  Calendar,
  RefreshCw,
  XCircle,
  ArrowUpCircle,
  ExternalLink,
} from "lucide-react-native";
import Purchases, { PurchasesPackage, CustomerInfo } from "react-native-purchases";
import {
  openSubscriptionManagement,
  getSubscriptionDetails,
  formatExpirationDate,
} from "@/services/revenueCat";

// Screen dimensions for responsive layout
const _screenWidth = Dimensions.get("window").width;

// Product IDs matching your RevenueCat setup
const PRODUCT_IDS = {
  GOLD: "wallstreetstocks.gold.monthly",
  PLATINUM: "wallstreetstocks.platinum.monthly",
  DIAMOND: "wallstreetstocks.diamond.monthly",
};

// Entitlement IDs - must match RevenueCat
const ENTITLEMENT_IDS = {
  GOLD: 'gold_access',
  PLATINUM: 'platinum_access',
  DIAMOND: 'diamond_access',
} as const;

// Helper to get any active entitlement
const getActiveEntitlement = (activeEntitlements: Record<string, any>): string | null => {
  if (activeEntitlements[ENTITLEMENT_IDS.DIAMOND]) return ENTITLEMENT_IDS.DIAMOND;
  if (activeEntitlements[ENTITLEMENT_IDS.PLATINUM]) return ENTITLEMENT_IDS.PLATINUM;
  if (activeEntitlements[ENTITLEMENT_IDS.GOLD]) return ENTITLEMENT_IDS.GOLD;
  return null;
};

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
      { icon: TrendingUp, text: "5 Expert Stock Picks" },
      { icon: Shield, text: "Ad-free experience" },
      { icon: BarChart3, text: "Basic watchlists" },
      { icon: Users, text: "Community access" },
      { icon: FileText, text: "Daily market summary" },
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
      { icon: TrendingUp, text: "8 Expert Stock Picks" },
      { icon: BarChart3, text: "Screener Filters & Premium Presets" },
      { icon: Bell, text: "Real-time price alerts" },
      { icon: TrendingUp, text: "Unlimited watchlists" },
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
      { icon: TrendingUp, text: "15 Expert Stock Picks" },
      { icon: Cpu, text: "AI Tools (Analyzer, Compare, Forecast)" },
      { icon: Cpu, text: "AI Financial Assistant" },
      { icon: FileText, text: "Insider Trading Data" },
      { icon: BarChart3, text: "Research Reports & Portfolio Tools" },
    ],
  },
};

type TierKey = keyof typeof TIERS;

interface SubscriptionDetails {
  isActive: boolean;
  productId: string | null;
  tierName: string | null;
  expirationDate: string | null;
  willRenew: boolean;
  isCanceled: boolean;
  managementUrl: string | null;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedTier, setSelectedTier] = useState<TierKey>("platinum");
  const [_customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<string | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [showManageSection, setShowManageSection] = useState(false);

  // Refresh data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      // Force sync with RevenueCat to get latest subscription data
      await Purchases.syncPurchases();
    } catch (e) {
      console.log('Sync purchases error (non-blocking):', e);
    }
    await Promise.all([
      loadOfferings(),
      checkSubscriptionStatus(),
      loadSubscriptionDetails(),
    ]);
    setLoading(false);
  };

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();

      if (offerings.current?.availablePackages) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error("Error loading offerings:", error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      const activeEntitlementId = getActiveEntitlement(info.entitlements.active);
      const entitlement = activeEntitlementId ? info.entitlements.active[activeEntitlementId] : null;
      if (entitlement) {
        setActiveSubscription(entitlement.productIdentifier);
        setShowManageSection(true);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const loadSubscriptionDetails = async () => {
    const details = await getSubscriptionDetails();
    setSubscriptionDetails(details);
  };

  const getPackageForTier = (tierId: string): PurchasesPackage | undefined => {
    const tierName = tierId.replace("_monthly", "").toLowerCase();
    return packages.find((pkg) => {
      const productId = pkg.product.identifier.toLowerCase();
      return productId.includes(tierName);
    });
  };

  const getPrice = (tierId: string): string => {
    const pkg = getPackageForTier(tierId);
    if (pkg) {
      return pkg.product.priceString;
    }
    switch (tierId) {
      case PRODUCT_IDS.GOLD:
        return "$9.99";
      case PRODUCT_IDS.PLATINUM:
        return "$19.99";
      case PRODUCT_IDS.DIAMOND:
        return "$29.99";
      default:
        return "";
    }
  };

  const handlePurchase = async () => {
    const tier = TIERS[selectedTier];
    const pkg = getPackageForTier(tier.id);

    if (!pkg) {
      Alert.alert(
        "Error",
        "Unable to find subscription package. Your subscriptions may still be under review."
      );
      return;
    }

    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(customerInfo);

      const activeEntitlementId = getActiveEntitlement(customerInfo.entitlements.active);
      if (activeEntitlementId) {
        const productId = customerInfo.entitlements.active[activeEntitlementId].productIdentifier;
        setActiveSubscription(productId);
        setShowManageSection(true);
        await loadSubscriptionDetails();

        Alert.alert(
          "Success!",
          `Welcome to ${tier.name}! Your subscription is now active.`,
          [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("Purchase error:", error);
        Alert.alert("Purchase Failed", error.message || "Unable to complete purchase.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleUpgrade = async () => {
    const tier = TIERS[selectedTier];
    const pkg = getPackageForTier(tier.id);

    if (!pkg) {
      Alert.alert("Error", "Unable to find subscription package.");
      return;
    }

    const currentLevel = getCurrentTierLevel();
    const targetLevel = getTierLevel(tier.id);

    if (targetLevel <= currentLevel) {
      // Downgrade - need to go to subscription management
      Alert.alert(
        "Downgrade Plan",
        `To downgrade to ${tier.name}, you need to manage your subscription through the ${Platform.OS === 'ios' ? 'App Store' : 'Play Store'}. Your current plan will continue until the end of the billing period.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Manage Subscription",
            onPress: handleManageSubscription,
          },
        ]
      );
      return;
    }

    // Upgrade
    Alert.alert(
      "Upgrade Plan",
      `Upgrade to ${tier.name} for ${getPrice(tier.id)}/month? You'll be charged the prorated difference for the remaining billing period.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Upgrade",
          onPress: async () => {
            setPurchasing(true);
            try {
              const { customerInfo } = await Purchases.purchasePackage(pkg);
              setCustomerInfo(customerInfo);

              const activeEntitlementId = getActiveEntitlement(customerInfo.entitlements.active);
              if (activeEntitlementId) {
                const productId = customerInfo.entitlements.active[activeEntitlementId].productIdentifier;
                setActiveSubscription(productId);
                await loadSubscriptionDetails();

                Alert.alert(
                  "Upgraded!",
                  `You're now on the ${tier.name} plan. Enjoy your new features!`
                );
              }
            } catch (error: any) {
              if (!error.userCancelled) {
                Alert.alert("Upgrade Failed", error.message || "Unable to upgrade.");
              }
            } finally {
              setPurchasing(false);
            }
          },
        },
      ]
    );
  };

  const handleManageSubscription = async () => {
    const opened = await openSubscriptionManagement();
    if (!opened) {
      // Fallback: try to open management URL from RevenueCat
      if (subscriptionDetails?.managementUrl) {
        await Linking.openURL(subscriptionDetails.managementUrl);
      } else {
        Alert.alert(
          "Manage Subscription",
          Platform.OS === 'ios'
            ? "Go to Settings > Apple ID > Subscriptions to manage your subscription."
            : "Go to Google Play Store > Menu > Subscriptions to manage your subscription."
        );
      }
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancel Subscription",
      "To cancel your subscription, you'll be redirected to your device's subscription settings. Your subscription will remain active until the end of your current billing period.",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Manage Subscription",
          style: "destructive",
          onPress: handleManageSubscription,
        },
      ]
    );
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);

      const activeEntitlementId = getActiveEntitlement(info.entitlements.active);
      const entitlement = activeEntitlementId ? info.entitlements.active[activeEntitlementId] : null;
      if (entitlement) {
        setActiveSubscription(entitlement.productIdentifier);
        setShowManageSection(true);
        await loadSubscriptionDetails();
        Alert.alert("Success", "Your subscription has been restored!");
      } else {
        Alert.alert("No Subscriptions Found", "We couldn't find any active subscriptions.");
      }
    } catch (error: any) {
      Alert.alert("Restore Failed", error.message || "Unable to restore purchases.");
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

  const getCurrentTierKey = (): TierKey | null => {
    if (!activeSubscription) return null;
    const sub = activeSubscription.toLowerCase();
    if (sub.includes("diamond")) return "diamond";
    if (sub.includes("platinum")) return "platinum";
    if (sub.includes("gold")) return "gold";
    return null;
  };

  const renderCurrentSubscriptionCard = () => {
    if (!subscriptionDetails?.isActive) return null;

    const currentTierKey = getCurrentTierKey();
    if (!currentTierKey) return null;

    const tier = TIERS[currentTierKey];
    const Icon = tier.icon;

    return (
      <View style={[styles.currentSubCard, { borderColor: tier.color }]}>
        <View style={styles.currentSubHeader}>
          <View style={[styles.currentSubIcon, { backgroundColor: tier.bgColor }]}>
            <Icon size={24} color={tier.color} />
          </View>
          <View style={styles.currentSubInfo}>
            <Text style={styles.currentSubLabel}>Current Plan</Text>
            <Text style={[styles.currentSubName, { color: tier.color }]}>{tier.name}</Text>
          </View>
          {subscriptionDetails.isCanceled && (
            <View style={styles.canceledBadge}>
              <Text style={styles.canceledBadgeText}>CANCELED</Text>
            </View>
          )}
        </View>

        <View style={styles.currentSubDetails}>
          <View style={styles.detailRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.detailLabel}>
              {subscriptionDetails.isCanceled ? "Expires" : "Renews"} on:
            </Text>
            <Text style={styles.detailValue}>
              {formatExpirationDate(subscriptionDetails.expirationDate)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <RefreshCw size={16} color="#666" />
            <Text style={styles.detailLabel}>Auto-renew:</Text>
            <Text style={[styles.detailValue, { color: subscriptionDetails.willRenew ? '#34C759' : '#FF3B30' }]}>
              {subscriptionDetails.willRenew ? "On" : "Off"}
            </Text>
          </View>
        </View>

        <View style={styles.currentSubActions}>
          <TouchableOpacity
            style={[styles.manageButton, { borderColor: tier.color }]}
            onPress={handleManageSubscription}
          >
            <Settings size={18} color={tier.color} />
            <Text style={[styles.manageButtonText, { color: tier.color }]}>
              Manage Subscription
            </Text>
            <ExternalLink size={16} color={tier.color} />
          </TouchableOpacity>

          {!subscriptionDetails.isCanceled && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSubscription}
            >
              <XCircle size={18} color="#FF3B30" />
              <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderTierCard = (tierKey: TierKey) => {
    const tier = TIERS[tierKey];
    const Icon = tier.icon;
    const isSelected = selectedTier === tierKey;
    const isCurrentPlan = isSubscribed(tier.id);
    const currentLevel = getCurrentTierLevel();
    const tierLevel = getTierLevel(tier.id);
    const isUpgrade = activeSubscription && tierLevel > currentLevel;
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
        {"popular" in tier && tier.popular && !isCurrentPlan && (
          <View style={[styles.popularBadge, { backgroundColor: tier.color }]}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}

        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
          </View>
        )}

        {isUpgrade && isSelected && (
          <View style={[styles.upgradeBadge, { backgroundColor: '#34C759' }]}>
            <ArrowUpCircle size={12} color="#FFF" />
            <Text style={styles.upgradeBadgeText}>UPGRADE</Text>
          </View>
        )}

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
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Subscription Section */}
        {showManageSection && renderCurrentSubscriptionCard()}

        {/* Hero Section - Only show for non-subscribers */}
        {!activeSubscription && (
          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <Zap size={40} color="#007AFF" />
            </View>
            <Text style={styles.heroTitle}>Unlock Premium Features</Text>
            <Text style={styles.heroSubtitle}>
              Get access to advanced analysis tools, AI insights, and exclusive research.
            </Text>
          </View>
        )}

        {/* Change/Upgrade Plan Section */}
        {activeSubscription && (
          <View style={styles.changePlanSection}>
            <Text style={styles.changePlanTitle}>
              {getCurrentTierLevel() < 3 ? "Upgrade Your Plan" : "Change Plan"}
            </Text>
            <Text style={styles.changePlanSubtitle}>
              Select a different plan to upgrade or change your subscription
            </Text>
          </View>
        )}

        {/* Debug Info */}
        {packages.length === 0 && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              ⚠️ No subscription packages loaded.{"\n"}
              Your products may still be under review.
            </Text>
          </View>
        )}

        {/* Tier Cards */}
        <View style={styles.tiersContainer}>
          {renderTierCard("gold")}
          {renderTierCard("platinum")}
          {renderTierCard("diamond")}
        </View>

        {/* Action Button */}
        {!isSubscribed(TIERS[selectedTier].id) && (
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              { backgroundColor: TIERS[selectedTier].color },
              purchasing && styles.buttonDisabled,
            ]}
            onPress={activeSubscription ? handleUpgrade : handlePurchase}
            activeOpacity={0.8}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.subscribeButtonText}>
                  {activeSubscription
                    ? getTierLevel(TIERS[selectedTier].id) > getCurrentTierLevel()
                      ? `Upgrade to ${TIERS[selectedTier].name}`
                      : `Change to ${TIERS[selectedTier].name}`
                    : `Subscribe to ${TIERS[selectedTier].name}`}
                </Text>
                <Text style={styles.subscribePrice}>
                  {getPrice(TIERS[selectedTier].id)}/month
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Restore Purchases */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period. Manage subscriptions in your {Platform.OS === 'ios' ? 'App Store' : 'Play Store'} settings.
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
  // Current Subscription Card
  currentSubCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currentSubHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  currentSubIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  currentSubInfo: {
    flex: 1,
  },
  currentSubLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 2,
  },
  currentSubName: {
    fontSize: 20,
    fontWeight: "700",
  },
  canceledBadge: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  canceledBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  currentSubDetails: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  currentSubActions: {
    gap: 10,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#FF3B30",
    fontWeight: "500",
  },
  // Hero Section
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
  // Change Plan Section
  changePlanSection: {
    marginBottom: 20,
  },
  changePlanTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  changePlanSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  // Debug
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
  // Tiers
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
  upgradeBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomRightRadius: 12,
    gap: 4,
  },
  upgradeBadgeText: {
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
  // Subscribe Button
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
  // Restore
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
  // Terms
  termsText: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  // Links
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
