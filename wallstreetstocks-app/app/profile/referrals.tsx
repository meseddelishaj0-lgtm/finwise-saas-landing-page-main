// app/profile/referrals.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useReferral, REWARD_TIERS } from '@/context/ReferralContext';
import { useAuth } from '@/lib/auth';

export default function Referrals() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    referralCode,
    referrals,
    stats,
    loading,
    initialized,
    isPremiumFromReferrals,
    premiumEndDate,
    unlockedTiers,
    lockedTiers,
    initializeReferral,
    applyReferralCode,
    refreshReferrals,
    generateShareMessage,
  } = useReferral();

  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [applyCodeModal, setApplyCodeModal] = useState(false);
  const [codeToApply, setCodeToApply] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);

  // Initialize referral when user is available
  useEffect(() => {
    if (user?.id && user?.name && !initialized) {
      initializeReferral(user.id, user.name);
    }
  }, [user?.id, user?.name, initialized]);

  const shareOptions = [
    { icon: 'mail', label: 'Email', color: '#007AFF' },
    { icon: 'chatbubble', label: 'Message', color: '#34C759' },
    { icon: 'logo-twitter', label: 'Twitter', color: '#1DA1F2' },
    { icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366' },
  ];

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(`https://wallstreetstocks.app/invite/${referralCode}`);
    Alert.alert('Copied!', 'Referral link copied to clipboard');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: generateShareMessage(),
        title: 'Join WallStreetStocks',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshReferrals();
    setRefreshing(false);
  };

  const handleApplyCode = async () => {
    if (!codeToApply.trim()) {
      Alert.alert('Error', 'Please enter a referral code');
      return;
    }

    setApplyingCode(true);
    try {
      const success = await applyReferralCode(codeToApply.trim());
      if (success) {
        setApplyCodeModal(false);
        setCodeToApply('');
        // Refresh to get updated data
        await refreshReferrals();
      }
    } catch (error) {
      
    } finally {
      setApplyingCode(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#34C759';
      case 'pending': return '#FF9500';
      case 'expired': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  if (loading && !initialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading referral program...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Referral Program</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="gift" size={40} color="#007AFF" />
          </View>
          <Text style={styles.heroTitle}>Give Premium, Get Premium</Text>
          <Text style={styles.heroSubtitle}>
            Share WallStreetStocks with friends and earn free Premium access!
          </Text>

          {/* Premium Status Badge */}
          {isPremiumFromReferrals && premiumEndDate && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={16} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>
                Premium active until {formatDate(premiumEndDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Referral Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{referralCode || 'Loading...'}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color="#007AFF" />
              <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shareLinkContainer}>
            <Text style={styles.shareLinkLabel}>Or share your link:</Text>
            <TouchableOpacity onPress={handleCopyLink}>
              <Text style={styles.shareLink}>
                wallstreetstocks.app/invite/{referralCode}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share with Friends</Text>
          </TouchableOpacity>

          {/* Quick Share Options */}
          <View style={styles.quickShareContainer}>
            {shareOptions.map((option, index) => (
              <TouchableOpacity key={index} style={styles.quickShareButton} onPress={handleShare}>
                <View style={[styles.quickShareIcon, { backgroundColor: `${option.color}15` }]}>
                  <Ionicons name={option.icon as any} size={22} color={option.color} />
                </View>
                <Text style={styles.quickShareLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalReferrals}</Text>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>{stats.completedReferrals}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#FF9500' }]}>{stats.pendingReferrals}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#007AFF' }]}>{stats.nextTierReferrals}</Text>
              <Text style={styles.statLabel}>Until Next Tier</Text>
            </View>
          </View>

          {/* Progress Bar to Next Tier */}
          {stats.nextTierReferrals > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress to Next Reward</Text>
                <Text style={styles.progressText}>
                  {stats.completedReferrals} / {stats.completedReferrals + stats.nextTierReferrals} referrals
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(stats.completedReferrals / (stats.completedReferrals + stats.nextTierReferrals)) * 100}%`
                    }
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Rewards Tiers */}
        <View style={styles.rewardsSection}>
          <Text style={styles.sectionTitle}>Reward Tiers</Text>
          <Text style={styles.sectionSubtitle}>
            Earn premium access as you refer more friends
          </Text>
          <View style={styles.rewardsList}>
            {REWARD_TIERS.map((tier, index) => {
              const isUnlocked = stats.completedReferrals >= tier.referrals;
              const isNext = !isUnlocked &&
                (index === 0 || stats.completedReferrals >= REWARD_TIERS[index - 1].referrals);

              return (
                <View
                  key={index}
                  style={[
                    styles.rewardItem,
                    isUnlocked && styles.rewardUnlocked,
                    isNext && styles.rewardNext,
                    !isUnlocked && !isNext && styles.rewardLocked
                  ]}
                >
                  <View style={[
                    styles.rewardIcon,
                    { backgroundColor: isUnlocked ? '#007AFF15' : isNext ? '#FF950015' : '#f0f0f0' }
                  ]}>
                    <Ionicons
                      name={tier.icon as any}
                      size={24}
                      color={isUnlocked ? '#007AFF' : isNext ? '#FF9500' : '#ccc'}
                    />
                  </View>
                  <View style={styles.rewardContent}>
                    <Text style={[
                      styles.rewardTitle,
                      !isUnlocked && !isNext && styles.rewardTitleLocked
                    ]}>
                      {tier.reward}
                    </Text>
                    <Text style={styles.rewardRequirement}>
                      {tier.referrals} referral{tier.referrals > 1 ? 's' : ''} • {tier.days} days
                    </Text>
                  </View>
                  {isUnlocked ? (
                    <View style={styles.unlockedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                    </View>
                  ) : isNext ? (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeText}>NEXT</Text>
                    </View>
                  ) : (
                    <View style={styles.lockedBadge}>
                      <Ionicons name="lock-closed" size={18} color="#ccc" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share Your Code</Text>
                <Text style={styles.stepDescription}>
                  Send your unique referral code or link to friends
                </Text>
              </View>
            </View>
            <View style={styles.stepConnector} />

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Friend Signs Up</Text>
                <Text style={styles.stepDescription}>
                  They create an account using your referral code
                </Text>
              </View>
            </View>
            <View style={styles.stepConnector} />

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Both Get Rewarded</Text>
                <Text style={styles.stepDescription}>
                  You earn premium days, they get 1 week free!
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Referral History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Recent Referrals</Text>
            {referrals.length > 0 && (
              <Text style={styles.historyCount}>{referrals.length} total</Text>
            )}
          </View>

          {referrals.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="people-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyHistoryTitle}>No referrals yet</Text>
              <Text style={styles.emptyHistoryText}>
                Share your code with friends to start earning rewards!
              </Text>
              <TouchableOpacity style={styles.emptyHistoryButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color="#007AFF" />
                <Text style={styles.emptyHistoryButtonText}>Share Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {referrals.slice(0, 5).map((referral, index) => (
                <View key={referral.id || index} style={styles.historyItem}>
                  <View style={styles.historyAvatar}>
                    <Text style={styles.historyAvatarText}>
                      {referral.referredName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={styles.historyName}>{referral.referredName}</Text>
                    <Text style={styles.historyDate}>{formatDate(referral.date)}</Text>
                  </View>
                  <View style={styles.historyStatus}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(referral.status)}20` }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(referral.status) }
                      ]}>
                        {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {referrals.length > 5 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All {referrals.length} Referrals</Text>
                  <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Have a Code Section */}
        <View style={styles.haveCodeSection}>
          <Text style={styles.haveCodeTitle}>Have a referral code?</Text>
          <Text style={styles.haveCodeSubtitle}>
            Enter a friend&apos;s code to get 1 week of Premium free
          </Text>
          <TouchableOpacity
            style={styles.enterCodeButton}
            onPress={() => setApplyCodeModal(true)}
          >
            <Ionicons name="ticket-outline" size={20} color="#007AFF" />
            <Text style={styles.enterCodeButtonText}>Enter Referral Code</Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Referral Program Terms</Text>
          <Text style={styles.termsText}>
            • Rewards are credited after referred user completes sign-up{'\n'}
            • Premium rewards stack with each tier you unlock{'\n'}
            • Referred users must be new to WallStreetStocks{'\n'}
            • Self-referrals and fake accounts are prohibited{'\n'}
            • We reserve the right to modify or end this program at any time
          </Text>
          <TouchableOpacity onPress={() => router.push('/profile/terms' as any)}>
            <Text style={styles.termsLink}>View Full Terms →</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Apply Code Modal */}
      <Modal
        visible={applyCodeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setApplyCodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Referral Code</Text>
              <TouchableOpacity onPress={() => setApplyCodeModal(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter a friend&apos;s referral code to get 1 week of Premium free!
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="e.g., JOHN1234"
              placeholderTextColor="#999"
              value={codeToApply}
              onChangeText={(text) => setCodeToApply(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={12}
              editable={!applyingCode}
            />

            <TouchableOpacity
              style={[styles.applyButton, (!codeToApply.trim() || applyingCode) && styles.applyButtonDisabled]}
              onPress={handleApplyCode}
              disabled={!codeToApply.trim() || applyingCode}
            >
              {applyingCode ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.applyButtonText}>Apply Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: { flex: 1 },
  heroSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f0f8ff',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  premiumBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8860B',
  },
  codeCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  codeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 2,
    marginRight: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  copyButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  shareLinkContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  shareLinkLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  shareLink: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickShareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickShareButton: {
    alignItems: 'center',
  },
  quickShareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickShareLabel: {
    fontSize: 12,
    color: '#666',
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#000',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  progressText: {
    fontSize: 13,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  rewardsSection: {
    padding: 20,
  },
  rewardsList: {
    gap: 10,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  rewardUnlocked: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  rewardNext: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FF950030',
  },
  rewardLocked: {
    backgroundColor: '#f9f9f9',
  },
  rewardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  rewardTitleLocked: {
    color: '#999',
  },
  rewardRequirement: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  unlockedBadge: {},
  nextBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  lockedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  howItWorksSection: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  stepsContainer: {
    paddingLeft: 8,
    marginTop: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  stepConnector: {
    width: 2,
    height: 24,
    backgroundColor: '#007AFF30',
    marginLeft: 15,
    marginVertical: 4,
  },
  historySection: {
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyCount: {
    fontSize: 14,
    color: '#666',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
  },
  emptyHistoryTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  emptyHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF15',
    borderRadius: 20,
  },
  emptyHistoryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    gap: 12,
  },
  historyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  historyContent: {
    flex: 1,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  historyDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  historyStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  viewAllText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  haveCodeSection: {
    margin: 20,
    padding: 20,
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    alignItems: 'center',
  },
  haveCodeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  haveCodeSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  enterCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  enterCodeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  termsSection: {
    margin: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  termsText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
    color: '#000',
    marginBottom: 16,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
