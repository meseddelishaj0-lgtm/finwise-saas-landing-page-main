import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../context/SubscriptionContext';

// Feature lists for each tier
const TIER_FEATURES: Record<string, string[]> = {
  gold: [
    '5 Expert Stock Picks',
    'Ad-free experience',
    'Basic watchlists',
    'Community access',
    'Daily market summary',
  ],
  platinum: [
    'Everything in Gold',
    '8 Expert Stock Picks',
    'Screener Filters & Premium Presets',
    'Real-time price alerts',
    'Unlimited watchlists',
    'Priority support',
  ],
  diamond: [
    'Everything in Platinum',
    '15 Expert Stock Picks',
    'AI Tools (Analyzer, Compare, Forecast)',
    'AI Financial Assistant',
    'Insider Trading Data',
    'Research Reports & Portfolio Tools',
  ],
};

const TIER_COLORS: Record<string, string> = {
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

const TIER_NAMES: Record<string, string> = {
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
};

const TIER_PRICES: Record<string, string> = {
  gold: '$4.99',
  platinum: '$6.99',
  diamond: '$9.99',
};

// Tier order for display
const TIER_ORDER = ['gold', 'platinum', 'diamond'] as const;
type TierKey = typeof TIER_ORDER[number];

// Universal tier card - works with or without RevenueCat packages
interface TierCardProps {
  tierKey: TierKey;
  isSelected: boolean;
  onSelect: () => void;
  pkg?: PurchasesPackage;
}

function TierCard({ tierKey, isSelected, onSelect, pkg }: TierCardProps) {
  const tierColor = TIER_COLORS[tierKey];
  const tierName = TIER_NAMES[tierKey];
  const tierPrice = pkg?.product.priceString || TIER_PRICES[tierKey];
  const features = TIER_FEATURES[tierKey];
  const isPopular = tierKey === 'platinum';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        isSelected && { borderColor: tierColor },
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {isPopular && (
        <View style={[styles.popularBadge, { backgroundColor: tierColor }]}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
          <Text style={styles.tierBadgeText}>{tierName}</Text>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{tierPrice}</Text>
          <Text style={styles.period}>/month</Text>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={tierColor} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: tierColor }]}>
          <Ionicons name="checkmark" size={20} color="#000" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function PaywallScreen() {
  const {
    packages,
    isLoading,
    isPremium,
    activeSubscription,
    loadOfferings,
    purchase,
    restore,
    refreshStatus,
    error,
  } = useSubscription();

  const [selectedTier, setSelectedTier] = useState<TierKey>('platinum');
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  // Helper to find package for a tier
  const getPackageForTier = (tierKey: TierKey): PurchasesPackage | undefined => {
    return packages.find((pkg) =>
      pkg.product.identifier.toLowerCase().includes(tierKey)
    );
  };

  // Get the selected package (if available)
  const selectedPackage = getPackageForTier(selectedTier);

  // Check if selected tier has a purchasable package
  const canPurchaseSelectedTier = !!selectedPackage;

  const handlePurchase = async () => {
    if (!canPurchaseSelectedTier || !selectedPackage) {
      Alert.alert(
        'Subscription Unavailable',
        `The ${TIER_NAMES[selectedTier]} plan is currently unavailable. Please try again later or contact support.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsPurchasing(true);

    try {
      const success = await purchase(selectedPackage);

      if (success) {
        // Refresh to get the latest subscription status
        await refreshStatus();
        Alert.alert(
          'Success!',
          `Welcome to WallStreetStocks ${TIER_NAMES[selectedTier]}! Your subscription is now active.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (err) {
      // Error is handled in context
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);

    try {
      const success = await restore();

      if (success) {
        // Refresh to get the latest subscription status
        await refreshStatus();
        Alert.alert(
          'Restored!',
          'Your subscription has been restored.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (isPremium) {
    // Determine current tier from activeSubscription
    const getCurrentTier = (): TierKey => {
      const sub = activeSubscription?.toLowerCase() || '';
      if (sub.includes('diamond')) return 'diamond';
      if (sub.includes('platinum')) return 'platinum';
      return 'gold';
    };

    const currentTier = getCurrentTier();
    const currentTierColor = TIER_COLORS[currentTier];
    const currentTierName = TIER_NAMES[currentTier];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Subscription</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.alreadyPremiumContainer}>
          <View style={[styles.currentTierBadge, { backgroundColor: currentTierColor }]}>
            <Text style={styles.currentTierBadgeText}>{currentTierName}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" style={{ marginTop: 20 }} />
          <Text style={styles.alreadyPremiumTitle}>You&apos;re {currentTierName}!</Text>
          <Text style={styles.alreadyPremiumText}>
            You have an active {currentTierName} subscription. Enjoy all your premium features!
          </Text>

          <TouchableOpacity
            style={[styles.manageButton, { borderColor: currentTierColor }]}
            onPress={() => router.push('/profile/subscription')}
          >
            <Ionicons name="settings-outline" size={20} color={currentTierColor} />
            <Text style={[styles.manageButtonText, { color: currentTierColor }]}>
              Manage Subscription
            </Text>
          </TouchableOpacity>

          {currentTier !== 'diamond' && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/profile/subscription')}
            >
              <Ionicons name="arrow-up-circle" size={20} color="#FFD700" />
              <Text style={styles.upgradeButtonText}>
                Upgrade to {currentTier === 'gold' ? 'Platinum or Diamond' : 'Diamond'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.backButton} onPress={handleClose}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading && packages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      ) : (
        <>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Unlock Premium Features</Text>
              <Text style={styles.heroSubtitle}>
                Get access to advanced stock analysis, AI insights, and more.
              </Text>
            </View>

            <View style={styles.cardsContainer}>
              {/* Always show all 3 tiers */}
              {TIER_ORDER.map((tierKey) => (
                <TierCard
                  key={tierKey}
                  tierKey={tierKey}
                  isSelected={selectedTier === tierKey}
                  onSelect={() => setSelectedTier(tierKey)}
                  pkg={getPackageForTier(tierKey)}
                />
              ))}
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {!canPurchaseSelectedTier && (
              <View style={styles.noticeContainer}>
                <Ionicons name="information-circle" size={20} color="#FFD700" />
                <Text style={styles.noticeText}>
                  The {TIER_NAMES[selectedTier]} plan is being finalized. You can view features now and subscribe soon!
                </Text>
              </View>
            )}

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.
              </Text>
              <View style={styles.termsLinks}>
                <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                  <Text style={styles.termsLink}>Terms of Use (EULA)</Text>
                </TouchableOpacity>
                <Text style={styles.termsDivider}>•</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://www.wallstreetstocks.ai/privacy')}>
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                isPurchasing && styles.purchaseButtonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  Subscribe to {TIER_NAMES[selectedTier]} - {selectedPackage?.product.priceString || TIER_PRICES[selectedTier]}/mo
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isPurchasing}
            >
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cardsContainer: {
    gap: 16,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#332700',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  noticeText: {
    flex: 1,
    color: '#FFD700',
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#333',
    position: 'relative',
    overflow: 'hidden',
  },
  cardSelected: {
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  popularText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierBadgeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  period: {
    color: '#888',
    fontSize: 14,
    marginLeft: 4,
  },
  featuresContainer: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  termsContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  termsText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  termsLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  termsLink: {
    color: '#888',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  termsDivider: {
    color: '#666',
    marginHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  purchaseButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  restoreButtonText: {
    color: '#888',
    fontSize: 14,
  },
  alreadyPremiumContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  alreadyPremiumTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  alreadyPremiumText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#333',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentTierBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
  },
  currentTierBadgeText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 30,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  upgradeButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '500',
  },
});
