import { SubscriptionTier } from '../lib/revenuecat';

export interface TierFeature {
  name: string;
  included: boolean;
}

export interface TierInfo {
  id: SubscriptionTier;
  name: string;
  description: string;
  color: string;
  gradientColors: [string, string];
  monthlyPrice: string;
  features: TierFeature[];
  popular?: boolean;
}

export const SUBSCRIPTION_TIERS: TierInfo[] = [
  {
    id: 'gold',
    name: 'Gold',
    description: 'Essential tools for smart investing',
    color: '#FFD700',
    gradientColors: ['#FFD700', '#FFA500'],
    monthlyPrice: '$9.99',
    features: [
      { name: 'Real-time stock quotes', included: true },
      { name: 'Basic watchlists', included: true },
      { name: 'Daily market summaries', included: true },
      { name: 'Price alerts (up to 10)', included: true },
      { name: 'Community access', included: true },
      { name: 'AI stock analysis', included: false },
      { name: 'Advanced charts', included: false },
      { name: 'Portfolio analytics', included: false },
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    description: 'Advanced insights for serious investors',
    color: '#E5E4E2',
    gradientColors: ['#E5E4E2', '#A9A9A9'],
    monthlyPrice: '$19.99',
    popular: true,
    features: [
      { name: 'Everything in Gold', included: true },
      { name: 'AI stock analysis', included: true },
      { name: 'Advanced interactive charts', included: true },
      { name: 'Unlimited price alerts', included: true },
      { name: 'Portfolio analytics', included: true },
      { name: 'Earnings calendar', included: true },
      { name: 'Sentiment analysis', included: true },
      { name: 'Priority support', included: false },
    ],
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Ultimate toolkit for professional traders',
    color: '#B9F2FF',
    gradientColors: ['#B9F2FF', '#00CED1'],
    monthlyPrice: '$29.99',
    features: [
      { name: 'Everything in Platinum', included: true },
      { name: 'AI price predictions', included: true },
      { name: 'Insider trading data', included: true },
      { name: 'Institutional holdings', included: true },
      { name: 'Custom screeners', included: true },
      { name: 'API access', included: true },
      { name: 'Priority support', included: true },
      { name: 'Early feature access', included: true },
    ],
  },
];

// Feature access map - which tier is required for each feature
export const FEATURE_ACCESS: Record<string, SubscriptionTier> = {
  // Free features
  'basic_quotes': 'free',
  'limited_watchlist': 'free',
  
  // Gold features
  'realtime_quotes': 'gold',
  'basic_watchlists': 'gold',
  'daily_summaries': 'gold',
  'price_alerts_basic': 'gold',
  'community_access': 'gold',
  
  // Platinum features
  'ai_analysis': 'platinum',
  'advanced_charts': 'platinum',
  'unlimited_alerts': 'platinum',
  'portfolio_analytics': 'platinum',
  'earnings_calendar': 'platinum',
  'sentiment_analysis': 'platinum',
  
  // Diamond features
  'ai_predictions': 'diamond',
  'insider_trading': 'diamond',
  'institutional_holdings': 'diamond',
  'custom_screeners': 'diamond',
  'api_access': 'diamond',
  'priority_support': 'diamond',
};

// Get tier info by ID
export const getTierInfo = (tierId: SubscriptionTier): TierInfo | undefined => {
  return SUBSCRIPTION_TIERS.find(tier => tier.id === tierId);
};

// Get required tier for a feature
export const getRequiredTier = (feature: string): SubscriptionTier => {
  return FEATURE_ACCESS[feature] || 'free';
};
