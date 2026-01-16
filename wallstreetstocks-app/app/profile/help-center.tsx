// app/profile/help-center.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENTLY_VIEWED_KEY = 'help_recently_viewed';
const ARTICLE_FEEDBACK_KEY = 'help_article_feedback';

// Comprehensive FAQ Data
interface Article {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

interface Category {
  id: string;
  title: string;
  icon: string;
  description: string;
  articles: Article[];
}

const helpCategories: Category[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'rocket-outline',
    description: 'Learn the basics of using WallStreetStocks',
    articles: [
      {
        id: 'gs-1',
        question: 'How do I create an account?',
        answer: `Creating an account is easy!\n\n1. Download the WallStreetStocks app from the App Store or Google Play\n2. Tap "Sign Up" on the welcome screen\n3. Enter your email address and create a password\n4. Verify your email by clicking the link we send you\n5. Complete your profile by adding your name and username\n\nYou can also sign up using your Google or Apple account for faster registration.\n\nOnce registered, you'll have access to all free features including watchlists, stock quotes, and community discussions.`,
        category: 'getting-started',
        tags: ['account', 'signup', 'register', 'new user'],
      },
      {
        id: 'gs-2',
        question: 'How do I set up my profile?',
        answer: `To set up your profile:\n\n1. Tap the menu icon (☰) in the top right corner\n2. Select "Edit Profile"\n3. Add your profile photo by tapping the camera icon\n4. Enter your display name\n5. Choose a unique username\n6. Add a bio to tell others about yourself\n7. Tap "Save" to update your profile\n\nA complete profile helps you connect with other investors in the community and build your reputation.`,
        category: 'getting-started',
        tags: ['profile', 'setup', 'photo', 'username', 'bio'],
      },
      {
        id: 'gs-3',
        question: 'How do I navigate the app?',
        answer: `WallStreetStocks has 5 main tabs at the bottom:\n\n📊 **Home** - Your dashboard with portfolio overview, watchlist, and market summary\n\n🔍 **Screener** - Filter and discover stocks based on criteria like price, market cap, sector, and more\n\n🤖 **AI Tools** - Access our AI-powered analysis tools and calculators\n\n👥 **Community** - Join discussions, share ideas, and follow other investors\n\n📰 **News** - Stay updated with the latest market news and analysis\n\nTap the menu icon (☰) in the top right for additional options like settings, help, and premium features.`,
        category: 'getting-started',
        tags: ['navigation', 'tabs', 'menu', 'interface'],
      },
      {
        id: 'gs-4',
        question: 'How do I add stocks to my watchlist?',
        answer: `There are several ways to add stocks to your watchlist:\n\n**Method 1: From Search**\n1. Tap the search bar on the Home screen\n2. Type the stock symbol or company name\n3. Tap the stock from results\n4. Tap "Add to Watchlist" button\n\n**Method 2: From Stock Chart**\n1. Open any stock chart\n2. Tap the menu (⋮) icon\n3. Select "Add to Watchlist"\n\n**Method 3: From Community**\n1. When viewing a post mentioning a stock\n2. Tap on the stock ticker\n3. Tap "Add to Watchlist"\n\nYour watchlist syncs across all your devices automatically.`,
        category: 'getting-started',
        tags: ['watchlist', 'add', 'stocks', 'track'],
      },
    ],
  },
  {
    id: 'portfolio',
    title: 'Portfolio & Holdings',
    icon: 'briefcase-outline',
    description: 'Manage your investment portfolio',
    articles: [
      {
        id: 'pf-1',
        question: 'How do I add holdings to my portfolio?',
        answer: `To track your investments:\n\n1. Go to the Home tab\n2. Scroll to "All Holdings" section\n3. Tap the + button\n4. Search for the stock symbol\n5. Enter the number of shares you own\n6. Enter your average cost per share\n7. Tap "Add to Portfolio"\n\nYour portfolio will automatically calculate:\n• Current value\n• Total gain/loss\n• Percentage change\n• Daily performance\n\nNote: This is for tracking purposes only - we don't connect to your actual brokerage accounts.`,
        category: 'portfolio',
        tags: ['portfolio', 'holdings', 'add', 'track', 'shares'],
      },
      {
        id: 'pf-2',
        question: 'How do I edit or remove a holding?',
        answer: `To edit a holding:\n\n1. Go to the Home tab\n2. Find the holding in your portfolio\n3. Tap on the holding\n4. Select "Edit" from the options\n5. Update the shares or average cost\n6. Tap "Save Changes"\n\nTo remove a holding:\n\n1. Tap on the holding\n2. Select "Remove" from the options\n3. Confirm the removal\n\nNote: Removing a holding doesn't affect your actual investments - it only removes it from your tracking in the app.`,
        category: 'portfolio',
        tags: ['edit', 'remove', 'delete', 'holding', 'portfolio'],
      },
      {
        id: 'pf-3',
        question: 'How is my portfolio performance calculated?',
        answer: `Your portfolio performance is calculated as follows:\n\n**Total Value**\nSum of (Current Price × Shares) for all holdings\n\n**Total Cost**\nSum of (Average Cost × Shares) for all holdings\n\n**Total Gain/Loss**\nTotal Value - Total Cost\n\n**Percentage Return**\n((Total Value - Total Cost) / Total Cost) × 100\n\n**Daily Change**\nBased on each stock's daily price movement\n\nAll calculations use real-time market data during trading hours and closing prices after hours.`,
        category: 'portfolio',
        tags: ['performance', 'calculation', 'gain', 'loss', 'return'],
      },
    ],
  },
  {
    id: 'subscription',
    title: 'Premium & Billing',
    icon: 'diamond-outline',
    description: 'Subscription plans and payment info',
    articles: [
      {
        id: 'sub-1',
        question: 'What are the Premium subscription tiers?',
        answer: `WallStreetStocks offers three Premium tiers:\n\n**🥇 Gold - $9.99/month**\n• 5 Expert Stock Picks\n• Ad-free experience\n• Basic watchlists\n• Community access\n• Daily market summary\n\n**💎 Platinum - $19.99/month** ⭐ Most Popular\n• Everything in Gold\n• 8 Expert Stock Picks\n• Screener Filters & Premium Presets\n• Real-time price alerts\n• Unlimited watchlists\n• Priority support\n\n**👑 Diamond - $29.99/month**\n• Everything in Platinum\n• 15 Expert Stock Picks\n• AI Tools (Analyzer, Compare, Forecast)\n• AI Financial Assistant\n• Insider Trading Data\n• Research Reports & Portfolio Tools\n\nAll plans include a 7-day free trial for new subscribers.`,
        category: 'subscription',
        tags: ['premium', 'subscription', 'pricing', 'gold', 'platinum', 'diamond'],
      },
      {
        id: 'sub-2',
        question: 'How do I cancel my subscription?',
        answer: `To cancel your subscription:\n\n**On iOS:**\n1. Open Settings on your iPhone\n2. Tap your name at the top\n3. Tap "Subscriptions"\n4. Find WallStreetStocks\n5. Tap "Cancel Subscription"\n\n**On Android:**\n1. Open Google Play Store\n2. Tap Menu → Subscriptions\n3. Find WallStreetStocks\n4. Tap "Cancel Subscription"\n\n**Important:**\n• You'll keep Premium access until your current billing period ends\n• No refunds for partial months\n• You can resubscribe anytime\n• Your data is preserved if you return`,
        category: 'subscription',
        tags: ['cancel', 'subscription', 'unsubscribe', 'billing'],
      },
      {
        id: 'sub-3',
        question: 'How do I restore my purchase?',
        answer: `If you've previously purchased Premium and it's not showing:\n\n1. Go to Menu → Subscription\n2. Tap "Restore Purchases"\n3. Sign in with your Apple ID or Google account if prompted\n4. Wait for verification (may take a few seconds)\n\nIf restoration doesn't work:\n• Make sure you're signed in with the same account used for purchase\n• Check that your subscription is still active in your device settings\n• Try restarting the app\n• Contact support if issues persist\n\nNote: Purchases are linked to your Apple ID or Google account, not your WallStreetStocks account.`,
        category: 'subscription',
        tags: ['restore', 'purchase', 'premium', 'subscription'],
      },
      {
        id: 'sub-4',
        question: 'How does the referral program work?',
        answer: `Earn free Premium by referring friends!\n\n**How it works:**\n1. Go to Menu → Referral Program\n2. Share your unique referral code\n3. When friends sign up using your code, you both get rewarded\n\n**Reward Tiers:**\n• 5 referrals → 1 Week Premium\n• 10 referrals → 1 Month Premium\n• 15 referrals → 2 Months Premium\n• 20 referrals → 3 Months Premium\n• 30 referrals → 6 Months Premium\n• 50 referrals → 1 Year Premium\n\n**Rules:**\n• Referred users must be new to WallStreetStocks\n• Self-referrals are not allowed\n• Rewards are credited after the referred user completes signup`,
        category: 'subscription',
        tags: ['referral', 'invite', 'free', 'premium', 'reward'],
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Security',
    icon: 'shield-outline',
    description: 'Account settings and security options',
    articles: [
      {
        id: 'acc-1',
        question: 'How do I reset my password?',
        answer: `To reset your password:\n\n**If you're logged out:**\n1. On the login screen, tap "Forgot Password"\n2. Enter your email address\n3. Check your email for the reset code\n4. Enter the code and create a new password\n\n**If you're logged in:**\n1. Go to Menu → Settings\n2. Tap "Change Password"\n3. Enter your current password\n4. Enter and confirm your new password\n5. Tap "Update Password"\n\n**Password Requirements:**\n• At least 8 characters\n• Mix of letters and numbers\n• At least one special character recommended`,
        category: 'account',
        tags: ['password', 'reset', 'forgot', 'change', 'security'],
      },
      {
        id: 'acc-2',
        question: 'How do I change my email address?',
        answer: `To update your email address:\n\n1. Go to Menu → Settings\n2. Tap "Account Settings"\n3. Tap "Change Email"\n4. Enter your new email address\n5. Enter your password to confirm\n6. Check your new email for a verification link\n7. Click the link to confirm the change\n\n**Important:**\n• Your old email will receive a notification about the change\n• You'll need to use the new email to log in\n• Premium subscriptions are linked to your device, not email`,
        category: 'account',
        tags: ['email', 'change', 'update', 'account'],
      },
      {
        id: 'acc-3',
        question: 'How do I delete my account?',
        answer: `We're sorry to see you go. To delete your account:\n\n1. Go to Menu → Settings\n2. Scroll to the bottom\n3. Tap "Delete Account"\n4. Read the information about what will be deleted\n5. Enter your password to confirm\n6. Tap "Permanently Delete Account"\n\n**What gets deleted:**\n• Your profile and username\n• Watchlists and portfolio data\n• Community posts and comments\n• All personal data\n\n**What to know:**\n• This action cannot be undone\n• Active subscriptions should be cancelled first\n• You can create a new account with the same email later`,
        category: 'account',
        tags: ['delete', 'account', 'remove', 'close'],
      },
      {
        id: 'acc-4',
        question: 'How do I manage notifications?',
        answer: `To customize your notifications:\n\n1. Go to Menu → Settings\n2. Tap "Notifications"\n\n**Available notification types:**\n\n📈 **Price Alerts**\nGet notified when stocks hit your target prices\n\n📰 **News Alerts**\nBreaking news about your watchlist stocks\n\n👥 **Community**\nLikes, comments, and mentions\n\n💰 **Portfolio**\nSignificant portfolio changes\n\n🎯 **Stock Picks**\nNew Premium stock recommendations\n\nYou can enable/disable each type individually and choose between push notifications, email, or both.`,
        category: 'account',
        tags: ['notifications', 'alerts', 'settings', 'push'],
      },
    ],
  },
  {
    id: 'community',
    title: 'Community',
    icon: 'people-outline',
    description: 'Social features and community guidelines',
    articles: [
      {
        id: 'com-1',
        question: 'How do I create a post?',
        answer: `To share your thoughts with the community:\n\n1. Go to the Community tab\n2. Tap the + button at the bottom\n3. Write your post (up to 500 characters)\n4. Add stock tickers using $ symbol (e.g., $AAPL)\n5. Optionally add an image\n6. Choose your sentiment (Bullish/Bearish/Neutral)\n7. Tap "Post"\n\n**Tips for good posts:**\n• Include your reasoning, not just predictions\n• Use stock tickers so others can find relevant discussions\n• Be respectful and constructive\n• Avoid pump-and-dump behavior`,
        category: 'community',
        tags: ['post', 'create', 'share', 'community'],
      },
      {
        id: 'com-2',
        question: 'How do I block or mute someone?',
        answer: `If someone is bothering you:\n\n**To Block a User:**\n1. Go to their profile\n2. Tap the menu (⋮) icon\n3. Select "Block User"\n4. Confirm the block\n\nBlocked users:\n• Cannot see your posts or profile\n• Cannot interact with your content\n• Won't appear in your feed\n\n**To Mute a User:**\n1. Go to their profile\n2. Tap the menu (⋮) icon\n3. Select "Mute User"\n\nMuted users:\n• Won't appear in your feed\n• Can still see your content\n• You can unmute anytime\n\nManage blocked/muted users in Menu → Settings → Blocked Users`,
        category: 'community',
        tags: ['block', 'mute', 'user', 'harassment'],
      },
      {
        id: 'com-3',
        question: 'How do I report inappropriate content?',
        answer: `To report content that violates our guidelines:\n\n1. Find the post or comment\n2. Tap the menu (⋮) icon\n3. Select "Report"\n4. Choose a reason:\n   • Spam or scam\n   • Harassment or bullying\n   • Misleading information\n   • Hate speech\n   • Other violation\n5. Add additional details if needed\n6. Tap "Submit Report"\n\nOur team reviews all reports within 24 hours. You'll receive a notification about the outcome.\n\nFor urgent safety concerns, also contact us directly at wallstreetstocks@outlook.com`,
        category: 'community',
        tags: ['report', 'inappropriate', 'violation', 'spam'],
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'build-outline',
    description: 'Fix common issues and problems',
    articles: [
      {
        id: 'ts-1',
        question: 'The app is running slowly or crashing',
        answer: `Try these steps to fix performance issues:\n\n**Quick Fixes:**\n1. Force close and reopen the app\n2. Check your internet connection\n3. Restart your device\n\n**If issues persist:**\n1. Update to the latest app version\n2. Clear app cache:\n   • iOS: Delete and reinstall the app\n   • Android: Settings → Apps → WallStreetStocks → Clear Cache\n3. Free up device storage (need at least 100MB free)\n4. Disable battery optimization for the app\n\n**Still having issues?**\nGo to Menu → Report a Problem and include:\n• Your device model\n• OS version\n• Description of the issue\n• Screenshots if possible`,
        category: 'troubleshooting',
        tags: ['slow', 'crash', 'performance', 'bug'],
      },
      {
        id: 'ts-2',
        question: 'Stock prices are not updating',
        answer: `If prices seem stale or not updating:\n\n**Check these first:**\n1. **Market Hours** - US markets are open 9:30 AM - 4:00 PM ET, Mon-Fri\n2. **Internet Connection** - Pull down to refresh\n3. **App Version** - Update to the latest version\n\n**Data Refresh:**\n• During market hours: Updates every 15 seconds\n• After hours: Shows closing prices\n• Weekends/holidays: Shows last trading day prices\n\n**Force Refresh:**\n1. Pull down on the screen to refresh\n2. Or go to a different tab and return\n\n**Still not working?**\nTry logging out and back in, or reinstalling the app.`,
        category: 'troubleshooting',
        tags: ['prices', 'update', 'refresh', 'data', 'stale'],
      },
      {
        id: 'ts-3',
        question: 'I can\'t log in to my account',
        answer: `Having trouble logging in? Try these steps:\n\n**Forgot Password:**\n1. Tap "Forgot Password" on login screen\n2. Enter your email\n3. Check email (including spam folder)\n4. Use the reset link/code\n\n**Wrong Password:**\n• Passwords are case-sensitive\n• Check Caps Lock\n• Try copying from a password manager\n\n**Account Locked:**\nAfter 5 failed attempts, accounts lock for 15 minutes. Wait and try again.\n\n**Social Login Issues:**\n• Make sure you're using the same method you signed up with\n• Check that your Google/Apple account is active\n\n**Still can't log in?**\nContact wallstreetstocks@outlook.com with your registered email address.`,
        category: 'troubleshooting',
        tags: ['login', 'password', 'access', 'locked'],
      },
      {
        id: 'ts-4',
        question: 'Notifications are not working',
        answer: `To fix notification issues:\n\n**Check App Settings:**\n1. Go to Menu → Settings → Notifications\n2. Make sure desired notifications are enabled\n\n**Check Device Settings:**\n\n**iOS:**\n1. Settings → Notifications → WallStreetStocks\n2. Enable "Allow Notifications"\n3. Enable Sounds, Badges, Banners as desired\n\n**Android:**\n1. Settings → Apps → WallStreetStocks → Notifications\n2. Enable notifications\n3. Make sure "Do Not Disturb" is off\n\n**Additional Steps:**\n• Disable battery optimization for the app\n• Allow background app refresh\n• Make sure you have a stable internet connection\n\nIf still not working, try logging out and back in.`,
        category: 'troubleshooting',
        tags: ['notifications', 'alerts', 'push', 'not working'],
      },
    ],
  },
];

// Flatten all articles for search
const allArticles = helpCategories.flatMap(cat => cat.articles);

export default function HelpCenter() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [articleFeedback, setArticleFeedback] = useState<Record<string, boolean>>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<string | null>(null);

  // Load recently viewed and feedback
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const [recentData, feedbackData] = await Promise.all([
        AsyncStorage.getItem(RECENTLY_VIEWED_KEY),
        AsyncStorage.getItem(ARTICLE_FEEDBACK_KEY),
      ]);

      if (recentData) setRecentlyViewed(JSON.parse(recentData));
      if (feedbackData) setArticleFeedback(JSON.parse(feedbackData));
    } catch (err) {
      
    }
  };

  // Save recently viewed
  const saveRecentlyViewed = async (articleId: string) => {
    try {
      const updated = [articleId, ...recentlyViewed.filter(id => id !== articleId)].slice(0, 5);
      setRecentlyViewed(updated);
      await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
    } catch (err) {
      
    }
  };

  // Save feedback
  const saveFeedback = async (articleId: string, helpful: boolean) => {
    try {
      const updated = { ...articleFeedback, [articleId]: helpful };
      setArticleFeedback(updated);
      setFeedbackSubmitted(articleId);
      await AsyncStorage.setItem(ARTICLE_FEEDBACK_KEY, JSON.stringify(updated));

      // Reset feedback submitted state after 3 seconds
      setTimeout(() => setFeedbackSubmitted(null), 3000);
    } catch (err) {
      
    }
  };

  // Search functionality
  const searchResults = searchQuery.trim()
    ? allArticles.filter(article =>
        article.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Open article
  const openArticle = (article: Article) => {
    setSelectedArticle(article);
    saveRecentlyViewed(article.id);
  };

  // Get recently viewed articles
  const recentArticles = recentlyViewed
    .map(id => allArticles.find(a => a.id === id))
    .filter(Boolean) as Article[];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results */}
        {searchQuery.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </Text>
            {searchResults.length === 0 ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color="#E0E0E0" />
                <Text style={styles.noResultsText}>No articles found</Text>
                <Text style={styles.noResultsSubtext}>Try different keywords or browse categories below</Text>
              </View>
            ) : (
              searchResults.map((article) => (
                <TouchableOpacity
                  key={article.id}
                  style={styles.articleRow}
                  onPress={() => openArticle(article)}
                >
                  <Ionicons name="document-text-outline" size={20} color="#007AFF" />
                  <View style={styles.articleRowContent}>
                    <Text style={styles.articleText}>{article.question}</Text>
                    <Text style={styles.articleCategory}>
                      {helpCategories.find(c => c.id === article.category)?.title}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Recently Viewed */}
        {!searchQuery.trim() && recentArticles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently Viewed</Text>
            {recentArticles.map((article) => (
              <TouchableOpacity
                key={article.id}
                style={styles.articleRow}
                onPress={() => openArticle(article)}
              >
                <Ionicons name="time-outline" size={20} color="#FF9500" />
                <Text style={[styles.articleText, { flex: 1 }]}>{article.question}</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions - Top Row */}
        {!searchQuery.trim() && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/profile/live-chat' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#34C75915' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#34C759" />
              </View>
              <Text style={styles.quickActionTitle}>Live Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/profile/contact' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#007AFF15' }]}>
                <Ionicons name="call-outline" size={24} color="#007AFF" />
              </View>
              <Text style={styles.quickActionTitle}>Call Us</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => Linking.openURL('https://x.com/wallstreet66666')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#00000010' }]}>
                <Text style={styles.xLogo}>𝕏</Text>
              </View>
              <Text style={styles.quickActionTitle}>X</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions - Bottom Row */}
        {!searchQuery.trim() && (
          <View style={[styles.quickActions, { marginTop: 12 }]}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/profile/bug-report' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FF3B3015' }]}>
                <Ionicons name="bug-outline" size={24} color="#FF3B30" />
              </View>
              <Text style={styles.quickActionTitle}>Report a Bug</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/profile/contact' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#AF52DE15' }]}>
                <Ionicons name="mail-outline" size={24} color="#AF52DE" />
              </View>
              <Text style={styles.quickActionTitle}>Email Us</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/profile/community-guidelines' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#FF950015' }]}>
                <Ionicons name="book-outline" size={24} color="#FF9500" />
              </View>
              <Text style={styles.quickActionTitle}>Guidelines</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Categories */}
        {!searchQuery.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Browse by Topic</Text>
            {helpCategories.map((category) => (
              <View key={category.id} style={styles.categoryCard}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category.id)}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <View style={styles.categoryIconContainer}>
                      <Ionicons name={category.icon as any} size={24} color="#007AFF" />
                    </View>
                    <View>
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                      <Text style={styles.categoryDescription}>{category.articles.length} articles</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={expandedCategories.includes(category.id) ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>

                {expandedCategories.includes(category.id) && (
                  <View style={styles.categoryItems}>
                    {category.articles.map((article) => (
                      <TouchableOpacity
                        key={article.id}
                        style={styles.categoryItem}
                        onPress={() => openArticle(article)}
                      >
                        <Text style={styles.categoryItemText}>{article.question}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Immediate Help */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Need immediate help?</Text>
          <Text style={styles.contactSubtitle}>Get in touch with our support team</Text>

          <View style={styles.immediateHelpButtons}>
            <TouchableOpacity
              style={styles.immediateHelpButton}
              onPress={() => router.push('/profile/live-chat' as any)}
            >
              <View style={[styles.immediateHelpIcon, { backgroundColor: '#34C75915' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#34C759" />
              </View>
              <Text style={styles.immediateHelpText}>Live Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.immediateHelpButton}
              onPress={() => router.push('/profile/contact' as any)}
            >
              <View style={[styles.immediateHelpIcon, { backgroundColor: '#007AFF15' }]}>
                <Ionicons name="call-outline" size={20} color="#007AFF" />
              </View>
              <Text style={styles.immediateHelpText}>Call Us</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.immediateHelpButton}
              onPress={() => Linking.openURL('https://x.com/wallstreet66666')}
            >
              <View style={[styles.immediateHelpIcon, { backgroundColor: '#00000010' }]}>
                <Text style={styles.xLogoSmall}>𝕏</Text>
              </View>
              <Text style={styles.immediateHelpText}>X</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Article Detail Modal */}
      <Modal
        visible={selectedArticle !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedArticle(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setSelectedArticle(null)}
              style={styles.modalBackButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Help Article</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedArticle && (
              <>
                <Text style={styles.articleQuestion}>{selectedArticle.question}</Text>

                <View style={styles.articleMeta}>
                  <View style={styles.articleTag}>
                    <Text style={styles.articleTagText}>
                      {helpCategories.find(c => c.id === selectedArticle.category)?.title}
                    </Text>
                  </View>
                </View>

                <Text style={styles.articleAnswer}>{selectedArticle.answer}</Text>

                {/* Feedback Section */}
                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackTitle}>Was this article helpful?</Text>

                  {feedbackSubmitted === selectedArticle.id ? (
                    <View style={styles.feedbackThanks}>
                      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                      <Text style={styles.feedbackThanksText}>Thanks for your feedback!</Text>
                    </View>
                  ) : (
                    <View style={styles.feedbackButtons}>
                      <TouchableOpacity
                        style={[
                          styles.feedbackButton,
                          articleFeedback[selectedArticle.id] === true && styles.feedbackButtonActive
                        ]}
                        onPress={() => saveFeedback(selectedArticle.id, true)}
                      >
                        <Ionicons
                          name="thumbs-up-outline"
                          size={20}
                          color={articleFeedback[selectedArticle.id] === true ? '#34C759' : '#666'}
                        />
                        <Text style={[
                          styles.feedbackButtonText,
                          articleFeedback[selectedArticle.id] === true && { color: '#34C759' }
                        ]}>Yes</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.feedbackButton,
                          articleFeedback[selectedArticle.id] === false && styles.feedbackButtonActive
                        ]}
                        onPress={() => saveFeedback(selectedArticle.id, false)}
                      >
                        <Ionicons
                          name="thumbs-down-outline"
                          size={20}
                          color={articleFeedback[selectedArticle.id] === false ? '#FF3B30' : '#666'}
                        />
                        <Text style={[
                          styles.feedbackButtonText,
                          articleFeedback[selectedArticle.id] === false && { color: '#FF3B30' }
                        ]}>No</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Related Articles */}
                <View style={styles.relatedSection}>
                  <Text style={styles.relatedTitle}>Related Articles</Text>
                  {helpCategories
                    .find(c => c.id === selectedArticle.category)
                    ?.articles.filter(a => a.id !== selectedArticle.id)
                    .slice(0, 3)
                    .map((article) => (
                      <TouchableOpacity
                        key={article.id}
                        style={styles.relatedItem}
                        onPress={() => {
                          setSelectedArticle(article);
                          saveRecentlyViewed(article.id);
                        }}
                      >
                        <Text style={styles.relatedItemText}>{article.question}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                      </TouchableOpacity>
                    ))}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
  },
  content: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    gap: 12,
  },
  articleRowContent: {
    flex: 1,
  },
  articleText: {
    fontSize: 15,
    color: '#333',
  },
  articleCategory: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  categoryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  categoryItems: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  categoryItemText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    paddingRight: 8,
  },
  contactSection: {
    alignItems: 'center',
    padding: 24,
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  immediateHelpButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  immediateHelpButton: {
    alignItems: 'center',
    flex: 1,
  },
  immediateHelpIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  immediateHelpText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  xLogo: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000',
  },
  xLogoSmall: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 56,
  },
  modalBackButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 1,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  articleQuestion: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    lineHeight: 30,
  },
  articleMeta: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  articleTag: {
    backgroundColor: '#007AFF15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  articleTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  articleAnswer: {
    fontSize: 16,
    color: '#333',
    lineHeight: 26,
  },
  feedbackSection: {
    marginTop: 32,
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  feedbackButtonActive: {
    borderColor: '#34C759',
  },
  feedbackButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  feedbackThanks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackThanksText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34C759',
  },
  relatedSection: {
    marginTop: 32,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  relatedItemText: {
    fontSize: 15,
    color: '#007AFF',
    flex: 1,
    paddingRight: 8,
  },
});
