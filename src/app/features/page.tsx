'use client';

/**
 * app/features/page.tsx
 * ----------------------------------------------------------------------
 * A fully self-contained features landing page with:
 *  - Tabbed categories
 *  - Feature cards (title, description, icon, mini chart)
 *  - "Explore" button for each sub-feature (pretty URLs via slugify)
 *  - Minimal internal components for clean structure
 *
 * You can now create the target pages using the generated URL structure:
 *   /features/<categoryId>/<feature-slug>
 * e.g.
 *   /features/equities/equity-research-valuation
 *   /features/derivatives/ai-greeks-estimator
 *   /features/bonds/credit-risk-insights
 *
 * TailwindCSS is assumed (classes used below). If you don’t use Tailwind,
 * swap classes with your CSS framework.
 * ----------------------------------------------------------------------
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
import {
  LineChart as LucideLineChart,
  
  LineChart,
  BarChart,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Bar,
  Line,
} from 'recharts'; // NOTE: Only recharts charts are from 'recharts'; the icons come from 'lucide-react'.

// The icon imports from lucide-react:
import {
  LineChart as LcIcon,
  BarChart3 as BarIcon,
  Database as DbIcon,
  Cpu as CpuIcon,
  Shield as ShieldIcon,
  BriefcaseBusiness as CaseIcon,
  TrendingUp as TrendIcon,
  CandlestickChart as CandleIcon,
  ArrowRight as ArrowIcon,
  Sparkles as SparklesIcon,
  BookOpenCheck as BookIcon,
  CheckCircle2 as CheckIcon,
} from 'lucide-react';

/* ============================================================================
 * Utility: slugify
 * ----------------------------------------------------------------------------
 * Converts a title into a URL slug compatible string
 * Example: "Equity Research & Valuation" -> "equity-research-valuation"
 * ========================================================================== */
const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

/* ============================================================================
 * Data: Demo datasets for charts
 * You can replace these with live data.
 * ========================================================================== */

// ---- Equities ----
const equitiesData1 = [
  { name: 'Mon', value: 150 },
  { name: 'Tue', value: 180 },
  { name: 'Wed', value: 160 },
  { name: 'Thu', value: 200 },
  { name: 'Fri', value: 230 },
];
const equitiesData2 = [
  { name: 'Tech', deals: 20 },
  { name: 'Energy', deals: 15 },
  { name: 'Finance', deals: 10 },
  { name: 'Healthcare', deals: 8 },
];
const equitiesData3 = [
  { region: 'US', index: 4200 },
  { region: 'Europe', index: 3900 },
  { region: 'Asia', index: 4100 },
  { region: 'Emerging', index: 3700 },
];

// ---- Derivatives ----
const derivativesData1 = [
  { day: 'Mon', vol: 22 },
  { day: 'Tue', vol: 26 },
  { day: 'Wed', vol: 31 },
  { day: 'Thu', vol: 28 },
  { day: 'Fri', vol: 35 },
];
const derivativesData2 = [
  { greek: 'Delta', value: 0.8 },
  { greek: 'Gamma', value: 0.2 },
  { greek: 'Vega', value: 0.5 },
  { greek: 'Theta', value: -0.1 },
];
const derivativesData3 = [
  { strat: 'Call', perf: 4 },
  { strat: 'Put', perf: 3 },
  { strat: 'Spread', perf: 6 },
  { strat: 'Straddle', perf: 5 },
];

// ---- Bonds ----
const bondsData1 = [
  { term: '1Y', yield: 3.5 },
  { term: '5Y', yield: 3.8 },
  { term: '10Y', yield: 4.0 },
  { term: '30Y', yield: 4.2 },
];
const bondsRiskData = [
  { credit: 'Aaa', risk: 0.5 },
  { credit: 'Aa', risk: 0.8 },
  { credit: 'A', risk: 1.1 },
  { credit: 'Baa', risk: 1.5 },
];
const bondsSpreadData = [
  { name: 'US', spread: 0.8 },
  { name: 'EU', spread: 1.0 },
  { name: 'Asia', spread: 1.3 },
  { name: 'LATAM', spread: 2.0 },
];

// ---- Alternatives ----
const altData1 = [
  { asset: 'BTC', value: 67000 },
  { asset: 'ETH', value: 3400 },
  { asset: 'GOLD', value: 2400 },
  { asset: 'OIL', value: 92 },
];
const altData2 = [
  { name: 'Private Equity', growth: 4.5 },
  { name: 'VC', growth: 6.2 },
  { name: 'Hedge Funds', growth: 2.8 },
];
const altData3 = [
  { name: 'Real Estate', perf: 8 },
  { name: 'Commodities', perf: 5 },
  { name: 'Crypto', perf: 12 },
];

// ---- AI & Data ----
const aiData1 = [
  { week: 'W1', pred: 4500 },
  { week: 'W2', pred: 4700 },
  { week: 'W3', pred: 4900 },
  { week: 'W4', pred: 5100 },
];
const aiData2 = [
  { topic: 'Earnings', sentiment: 0.7 },
  { topic: 'Inflation', sentiment: -0.3 },
  { topic: 'Tech', sentiment: 0.8 },
];
const aiData3 = [
  { month: 'Jan', gdp: 2.1 },
  { month: 'Feb', gdp: 2.3 },
  { month: 'Mar', gdp: 2.6 },
  { month: 'Apr', gdp: 2.4 },
];

// ---- Portfolio ----
const portData1 = [
  { day: 'Mon', ret: 0.4 },
  { day: 'Tue', ret: 0.8 },
  { day: 'Wed', ret: 0.5 },
  { day: 'Thu', ret: 1.0 },
  { day: 'Fri', ret: 1.4 },
];
const portData2 = [
  { asset: 'Stocks', weight: 60 },
  { asset: 'Bonds', weight: 25 },
  { asset: 'Crypto', weight: 10 },
  { asset: 'Alt', weight: 5 },
];
const portData3 = [
  { risk: 1, reward: 2 },
  { risk: 2, reward: 2.5 },
  { risk: 3, reward: 3 },
  { risk: 4, reward: 3.2 },
];

/* ============================================================================
 * Category tabs
 * ========================================================================== */
type Category = {
  id: string;
  label: string;
  icon: React.ElementType;
};

const CATEGORIES: Category[] = [
  { id: 'equities', label: 'Equities', icon: BarIcon },
  { id: 'derivatives', label: 'Derivatives', icon: CandleIcon },
  { id: 'bonds', label: 'Bonds', icon: LcIcon },
  { id: 'alternatives', label: 'Alternatives', icon: DbIcon },
  { id: 'ai', label: 'AI & Data', icon: CpuIcon },
  { id: 'portfolio', label: 'Portfolio Tools', icon: ShieldIcon },
];

/* ============================================================================
 * Types for feature definitions
 * ========================================================================== */
type FeatureItem = {
  title: string;
  description: string;
  icon: React.ElementType;
  chart?: React.ReactNode;
  /** Optional: badges that appear above the title for quick hints/tags */
  badges?: string[];
  /** Optional: callouts as small bullet-like extras below description */
  bullets?: string[];
};

/* ============================================================================
 * Feature dataset (by category)
 * Replace / extend as needed. Every item will render a card.
 * ========================================================================== */
const FEATURES: Record<string, FeatureItem[]> = {
  equities: [
    {
      title: 'Equity Research & Valuation',
      description:
        'AI-driven DCF and comparables with analyst consensus for intrinsic value.',
      icon: BarIcon,
      badges: ['DCF', 'Comps', 'Consensus'],
      bullets: ['Cash flows', 'Multiples', 'Risk premium'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={equitiesData1}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line  type="monotone" dataKey="value" stroke="#FACC15" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'M&A Tracker',
      description:
        'Live updates on mergers and acquisitions with synergy scoring and sector breakdowns.',
      icon: CaseIcon,
      badges: ['Synergies', 'Premium', 'Targets'],
      bullets: ['Deal activity', 'Sector maps', 'Premium paid'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={equitiesData2}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="deals" fill="#FACC15" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Global Market Data',
      description:
        'Real-time prices, earnings, and macro indicators across major global exchanges.',
      icon: TrendIcon,
      badges: ['Realtime', 'Earnings', 'Macro'],
      bullets: ['Indices', 'EPS growth', 'Released calendars'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={equitiesData3}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="region" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="index" stroke="#FACC15" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Factor Explorer (Beta)',
      description:
        'Cross-sectional evaluation of style factors (Value, Quality, Momentum, Low Vol, Size).',
      icon: SparklesIcon,
      badges: ['Alpha', 'Factors', 'Backtests'],
      bullets: ['Factor spreads', 'Turnover', 'Exposure heatmaps'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={equitiesData1}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#FACC15" fill="#FEF08A" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ],

  derivatives: [
    {
      title: 'Options Flow Analysis',
      description:
        'Detect unusual options activity, monitor flows, and visualize implied volatility shifts.',
      icon: CandleIcon,
      badges: ['UOA', 'IV', 'Flow'],
      bullets: ['Sweeps', 'Blocks', 'Spreads'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={derivativesData1}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="vol" stroke="#FACC15" fill="#FEF08A" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'AI Greeks Estimator',
      description:
        'Predictive Greeks (Delta, Vega, Theta) using historical vols and structural features.',
      icon: CpuIcon,
      badges: ['Delta', 'Vega', 'Theta'],
      bullets: ['Regimes', 'Smile/Skew', 'Surface'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={derivativesData2}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="greek" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#FACC15" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Strategy Simulator',
      description:
        'Backtest covered calls, spreads, and straddles with scenario testing.',
      icon: ShieldIcon,
      badges: ['Backtest', 'Scenario', 'PnL'],
      bullets: ['Payoff diagrams', 'Greeks drift', 'Hedging'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={derivativesData3}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="strat" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="perf" stroke="#FACC15" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Volatility Surface Explorer',
      description:
        'Visualize skew and term structures. Export ready-to-trade parameter sets.',
      icon: SparklesIcon,
      badges: ['Skew', 'Term', 'Surface'],
      bullets: ['Local vol', 'SABR fit', 'Smile drift'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={derivativesData1}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="vol" stroke="#FACC15" fill="#FEF08A" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ],

  bonds: [
    {
      title: 'Bond Screener',
      description:
        'Screen government, municipal, and corporate bonds by yield, rating, and duration.',
      icon: LcIcon,
      badges: ['Yield', 'Rating', 'Duration'],
      bullets: ['Curves', 'Spread maps', 'Issuers'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={bondsData1}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="term" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="yield" stroke="#FACC15" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Yield Curve Visualizer',
      description:
        'Interactive yield curves with macro overlays and forecast tracking.',
      icon: TrendIcon,
      badges: ['Term', 'Macro', 'Forecast'],
      bullets: ['Slope', 'Butterfly', 'Carry/Roll'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={bondsRiskData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="credit" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="risk" stroke="#FACC15" fill="#FEF08A" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Credit Risk Insights',
      description:
        'AI-based credit scoring blending ratings, spreads, and sentiment for forward risk.',
      icon: ShieldIcon,
      badges: ['Credit', 'Spread', 'AI'],
      bullets: ['Issuer trend', 'Sector model', 'Macro stress'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={bondsSpreadData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="spread" fill="#FACC15" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Liquidity Heatmap',
      description:
        'Identify pockets of liquidity, turnover, and dealer depth across bond universes.',
      icon: SparklesIcon,
      badges: ['Depth', 'Turnover', 'Slippage'],
      bullets: ['Dealer axes', 'TRACE heatmap', 'Ladder export'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={bondsSpreadData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="spread" stroke="#FACC15" fill="#FEF08A" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ],

  alternatives: [
    {
      title: 'Crypto & Digital Assets',
      description:
        'AI sentiment and realized vol metrics for BTC, ETH, and top altcoins.',
      icon: DbIcon,
      badges: ['BTC', 'ETH', 'Alt'],
      bullets: ['Funding rates', 'Open interest', 'Greed/Fear'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={altData1}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="asset" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#FACC15" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Private Markets Growth',
      description:
        'AI projections for PE/VC growth and distributions across vintage years.',
      icon: CaseIcon,
      badges: ['PE', 'VC', 'HFs'],
      bullets: ['TVPI', 'IRR bands', 'Calls/Distributions'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={altData2}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="growth" fill="#FACC15" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Alternative Asset Returns',
      description:
        'Compare real estate, commodities, and crypto returns using common risk metrics.',
      icon: BarIcon,
      badges: ['Real Estate', 'Commodities', 'Crypto'],
      bullets: ['Sharpe', 'Drawdown', 'Correlations'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={altData3}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="perf" stroke="#FACC15" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Real Assets Dashboard',
      description:
        'Macro dashboard across energy, metals, and real asset proxies with AI notes.',
      icon: BookIcon,
      badges: ['Energy', 'Metals', 'Infra'],
      bullets: ['Carry', 'Contango', 'Basis'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={altData3}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="perf" stroke="#FACC15" fill="#FEF08A" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ],

  ai: [
    {
      title: 'AI Forecast Engine',
      description:
        'Short- and long-horizon predictive models using NLP, macro, and cross-asset signals.',
      icon: CpuIcon,
      badges: ['Nowcast', 'Forecast', 'Explainable'],
      bullets: ['Shapley values', 'Feature drift', 'Confidence intervals'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={aiData1}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="pred" stroke="#FACC15" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Sentiment Analysis',
      description:
        'Extract investor tone from earnings calls, filings, and social media streams.',
      icon: LcIcon,
      badges: ['NLP', 'Tone', 'Entity'],
      bullets: ['Call transcript', 'Topic model', 'Abnormal phrases'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={aiData2}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="topic" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sentiment" fill="#FACC15" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Macro Data Integration',
      description:
        'Blend real-time economic indicators with asset pricing and carry/risk models.',
      icon: DbIcon,
      badges: ['Macro', 'Carry', 'Risk'],
      bullets: ['Nowcast cards', 'Surprise indices', 'Heatmaps'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={aiData3}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="gdp" stroke="#FACC15" fill="#FEF08A" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Data Lake / Pipeline',
      description:
        'ELT pipelines with schema registry, validations, and model monitoring.',
      icon: ShieldIcon,
      badges: ['ELT', 'Registry', 'Monitoring'],
      bullets: ['Quality checks', 'Backfills', 'Drift tests'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={aiData1}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="pred" stroke="#FACC15" fill="#FEF08A" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ],

  portfolio: [
    {
      title: 'Portfolio Tracker',
      description:
        'Multi-asset portfolio performance tracking with benchmark comparisons.',
      icon: ShieldIcon,
      badges: ['Perf', 'Attribution', 'Benchmarks'],
      bullets: ['Holdings map', 'Style drift', 'Brinson attribution'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={portData1}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="ret" stroke="#FACC15" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'AI Rebalancing',
      description:
        'Recommend optimal weights using volatility targets, risk parity, and constraints.',
      icon: CpuIcon,
      badges: ['Weights', 'Vol targets', 'Constraints'],
      bullets: ['Risk parity', 'Max drawdown', 'Turnover control'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={portData2}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="asset" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="weight" fill="#FACC15" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Risk vs Reward',
      description:
        'Visualize efficient frontiers and scenario stress with AI risk metrics.',
      icon: BarIcon,
      badges: ['Sharpe', 'Frontier', 'Stress'],
      bullets: ['Regimes', 'Tail risk', 'Hedging'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={portData3}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="risk" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="reward" stroke="#FACC15" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Smart Alerts',
      description:
        'Set rule-based or AI-driven alerts for drift, VaR breaches, and liquidity shocks.',
      icon: CheckIcon,
      badges: ['Alerts', 'VaR', 'Liquidity'],
      bullets: ['Email/SMS', 'Webhook', 'Slack'],
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={portData3}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="risk" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="reward" stroke="#FACC15" fill="#FEF08A" />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ],
};

/* ============================================================================
 * Presentational Components
 * ========================================================================== */

/** Section header with subtle motion */
const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="text-center mb-10"
  >
    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
      ⚙️ {title}
    </h1>
    {subtitle ? (
      <p className="text-gray-600 mt-3 max-w-3xl mx-auto">{subtitle}</p>
    ) : null}
  </motion.div>
);

/** Rounded tab pills for the top category switcher */
const TabPills: React.FC<{
  active: string;
  onChange: (id: string) => void;
}> = ({ active, onChange }) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-12">
      {CATEGORIES.map((cat) => {
        const Active = active === cat.id;
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              Active
                ? 'bg-yellow-400 text-black shadow-md'
                : 'bg-gray-100 hover:bg-yellow-100 text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
};

/** A small badge row that appears above the title */
const BadgeRow: React.FC<{ items?: string[] }> = ({ items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {items.map((b, idx) => (
        <span
          key={idx}
          className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800"
        >
          {b}
        </span>
      ))}
    </div>
  );
};

/** A small check-list under the description */
const BulletList: React.FC<{ items?: string[] }> = ({ items }) => {
  if (!items || items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-sm text-gray-700">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <CheckIcon className="w-4 h-4 text-yellow-500 mt-0.5" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
};

/** Primary CTA used for every card */
const ExploreButton: React.FC<{ href: string }> = ({ href }) => {
  return (
    <Link
      href={href}
      className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500 transition"
    >
      Explore
      <ArrowIcon className="w-4 h-4" />
    </Link>
  );
};

/** Reusable feature card */
const FeatureCard: React.FC<{
  category: string;
  item: FeatureItem;
  index?: number;
}> = ({ category, item, index = 0 }) => {
  const featureSlug = slugify(item.title);
  const featureUrl = `/features/${category}/${featureSlug}`;
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      className="group flex flex-col justify-between rounded-2xl bg-gray-50 p-6 shadow-sm hover:shadow-lg hover:bg-yellow-50 transition"
    >
      <div>
        <Icon className="mb-4 h-10 w-10 text-yellow-500" />
        <BadgeRow items={item.badges} />
        <h3 className="text-xl font-semibold">{item.title}</h3>
        <p className="mt-1 text-sm text-gray-700">{item.description}</p>
        <BulletList items={item.bullets} />
        {item.chart ? <div className="mt-4 h-28">{item.chart}</div> : null}
      </div>

      <div className="pt-2">
        <ExploreButton href={featureUrl} />
      </div>
    </motion.div>
  );
};

/* ============================================================================
 * Page
 * ========================================================================== */

const FeaturesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('equities');

  const items = useMemo(() => FEATURES[activeTab] ?? [], [activeTab]);

  return (
    <section id="features" className="bg-white py-24 text-gray-900">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          title="WallStreetStocks.ai Features"
          subtitle="Explore our AI-powered platform — from equity valuation to derivatives analytics, fixed income tools, alternative assets, data science, and portfolio intelligence."
        />

        <TabPills active={activeTab} onChange={setActiveTab} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((f, i) => (
              <FeatureCard key={f.title} category={activeTab} item={f} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>

       
      </div>
    </section>
  );
};

export default FeaturesPage;

/* ============================================================================
 * Notes:
 * 1) Each Explore button uses a route of the form:
 *       /features/<categoryId>/<feature-slug>
 *    Example for “Equity Research & Valuation”:
 *       /features/equities/equity-research-valuation
 *
 * 2) To scaffold a landing page for a sub-feature, create a file:
 *       app/features/equities/equity-research-valuation/page.tsx
 *    (repeat for other categories/features)
 *
 * 3) If you want a category-level landing (e.g. /features/equities),
 *    add:  app/features/equities/page.tsx
 *
 * 4) This file is intentionally verbose and documented so you have a
 *    single, ready-to-edit module exceeding 500 lines as requested.
 * ========================================================================== */
