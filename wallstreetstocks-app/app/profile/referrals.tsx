// app/profile/referrals.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

export default function Referrals() {
  const router = useRouter();
  const [referralCode] = useState('JOHN2025');
  const [copied, setCopied] = useState(false);

  const referralStats = {
    totalReferrals: 12,
    pendingReferrals: 3,
    earnedRewards: 24,
    nextReward: 3,
  };

  const referralHistory = [
    { name: 'Alex M.', date: 'Nov 20, 2025', status: 'completed', reward: '1 month free' },
    { name: 'Sarah K.', date: 'Nov 15, 2025', status: 'completed', reward: '1 month free' },
    { name: 'Mike R.', date: 'Nov 10, 2025', status: 'pending', reward: 'Pending' },
    { name: 'Emma L.', date: 'Nov 5, 2025', status: 'completed', reward: '1 month free' },
    { name: 'James W.', date: 'Oct 28, 2025', status: 'pending', reward: 'Pending' },
  ];

  const rewards = [
    { referrals: 1, reward: '1 Week Premium', icon: 'star', unlocked: true },
    { referrals: 3, reward: '1 Month Premium', icon: 'diamond', unlocked: true },
    { referrals: 5, reward: '3 Months Premium', icon: 'trophy', unlocked: true },
    { referrals: 10, reward: '6 Months Premium', icon: 'medal', unlocked: true },
    { referrals: 25, reward: '1 Year Premium', icon: 'ribbon', unlocked: false },
    { referrals: 50, reward: 'Lifetime Premium', icon: 'crown', unlocked: false },
  ];

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

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on WallStreetStocks - the best app for stock research and market insights! Use my referral code ${referralCode} to get 1 week of Premium free. Download now: https://wallstreetstocks.app/invite/${referralCode}`,
        title: 'Join WallStreetStocks',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Referrals</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="gift" size={40} color="#007AFF" />
          </View>
          <Text style={styles.heroTitle}>Give Premium, Get Premium</Text>
          <Text style={styles.heroSubtitle}>
            Share WallStreetStocks with friends and both of you get rewarded with free Premium access!
          </Text>
        </View>

        {/* Referral Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{referralCode}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color="#007AFF" />
              <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.shareLinkContainer}>
            <Text style={styles.shareLinkLabel}>Or share your link:</Text>
            <Text style={styles.shareLink}>wallstreetstocks.app/invite/{referralCode}</Text>
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
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{referralStats.totalReferrals}</Text>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{referralStats.pendingReferrals}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>{referralStats.earnedRewards}</Text>
              <Text style={styles.statLabel}>Weeks Earned</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#007AFF' }]}>{referralStats.nextReward}</Text>
              <Text style={styles.statLabel}>Until Next Tier</Text>
            </View>
          </View>
        </View>

        {/* Rewards Tiers */}
        <View style={styles.rewardsSection}>
          <Text style={styles.sectionTitle}>Reward Tiers</Text>
          <View style={styles.rewardsList}>
            {rewards.map((tier, index) => (
              <View 
                key={index} 
                style={[
                  styles.rewardItem, 
                  tier.unlocked && styles.rewardUnlocked,
                  !tier.unlocked && styles.rewardLocked
                ]}
              >
                <View style={[
                  styles.rewardIcon, 
                  { backgroundColor: tier.unlocked ? '#007AFF15' : '#f0f0f0' }
                ]}>
                  <Ionicons 
                    name={tier.icon as any} 
                    size={24} 
                    color={tier.unlocked ? '#007AFF' : '#ccc'} 
                  />
                </View>
                <View style={styles.rewardContent}>
                  <Text style={[styles.rewardTitle, !tier.unlocked && styles.rewardTitleLocked]}>
                    {tier.reward}
                  </Text>
                  <Text style={styles.rewardRequirement}>
                    {tier.referrals} referral{tier.referrals > 1 ? 's' : ''}
                  </Text>
                </View>
                {tier.unlocked ? (
                  <View style={styles.unlockedBadge}>
                    <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                  </View>
                ) : (
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={18} color="#ccc" />
                  </View>
                )}
              </View>
            ))}
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
                  You both receive 1 week of Premium free!
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Referral History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Referrals</Text>
          {referralHistory.map((referral, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyAvatar}>
                <Text style={styles.historyAvatarText}>
                  {referral.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyName}>{referral.name}</Text>
                <Text style={styles.historyDate}>{referral.date}</Text>
              </View>
              <View style={styles.historyStatus}>
                <View style={[
                  styles.statusBadge,
                  referral.status === 'completed' ? styles.statusCompleted : styles.statusPending
                ]}>
                  <Text style={[
                    styles.statusText,
                    referral.status === 'completed' ? styles.statusTextCompleted : styles.statusTextPending
                  ]}>
                    {referral.status === 'completed' ? 'Completed' : 'Pending'}
                  </Text>
                </View>
                <Text style={styles.historyReward}>{referral.reward}</Text>
              </View>
            </View>
          ))}
          
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Referrals</Text>
            <Ionicons name="chevron-forward" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Referral Program Terms</Text>
          <Text style={styles.termsText}>
            • Rewards are credited after referred user completes sign-up{'\n'}
            • Premium rewards are applied to your next billing cycle{'\n'}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
    color: '#666',
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
    marginBottom: 16,
    color: '#000',
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
    marginBottom: 4,
  },
  statusCompleted: {
    backgroundColor: '#34C75920',
  },
  statusPending: {
    backgroundColor: '#FF950020',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: '#34C759',
  },
  statusTextPending: {
    color: '#FF9500',
  },
  historyReward: {
    fontSize: 13,
    color: '#666',
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
});
