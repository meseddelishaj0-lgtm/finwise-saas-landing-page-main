'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart as LucideLineChart,
  CandlestickChart,
  BriefcaseBusiness,
  BarChart3,
  Database,
  Shield,
  Cpu,
  TrendingUp,
} from 'lucide-react';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ==================== SAMPLE DATA ====================
// Equities
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

// Derivatives
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

// Bonds
const bondsData1 = [
  { term: '1Y', yield: 3.5 },
  { term: '5Y', yield: 3.8 },
  { term: '10Y', yield: 4.0 },
  { term: '30Y', yield: 4.2 },
];
const bondsData2 = [
  { name: 'Aaa', risk: 0.5 },
  { name: 'Aa', risk: 0.8 },
  { name: 'A', risk: 1.1 },
  { name: 'Baa', risk: 1.5 },
];
const bondsData3 = [
  { name: 'US', spread: 0.8 },
  { name: 'EU', spread: 1.0 },
  { name: 'Asia', spread: 1.3 },
  { name: 'LATAM', spread: 2.0 },
];

// Alternatives
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

// AI & Data
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

// Portfolio
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

// ==================== TABS ====================
const categories = [
  { id: 'equities', label: 'Equities', icon: BarChart3 },
  { id: 'derivatives', label: 'Derivatives', icon: CandlestickChart },
  { id: 'bonds', label: 'Bonds', icon: LucideLineChart },
  { id: 'alternatives', label: 'Alternatives', icon: Database },
  { id: 'ai', label: 'AI & Data', icon: Cpu },
  { id: 'portfolio', label: 'Portfolio Tools', icon: Shield },
];

// ==================== FEATURES ====================
const featuresData: Record<
  string,
  { title: string; description: string; icon: React.ElementType; chart?: React.ReactNode }[]
> = {
  equities: [
    {
      title: 'Equity Research & Valuation',
      description: 'AI-driven DCF and comparable models with analyst consensus comparison.',
      icon: BarChart3,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={equitiesData1}>
            <Line type="monotone" dataKey="value" stroke="#FACC15" strokeWidth={3} dot={false} />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'M&A Tracker',
      description: 'Live updates on mergers, acquisitions, and corporate buyouts with AI synergy scoring.',
      icon: BriefcaseBusiness,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={equitiesData2}>
            <Bar dataKey="deals" fill="#FACC15" radius={[8, 8, 0, 0]} />
            <XAxis dataKey="name" />
            <Tooltip />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Global Market Data',
      description: 'Real-time prices, earnings, and macro indicators from major global exchanges.',
      icon: TrendingUp,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={equitiesData3}>
            <Line type="monotone" dataKey="index" stroke="#FACC15" strokeWidth={3} dot={false} />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
  ],

  derivatives: [
    {
      title: 'Options Flow Analysis',
      description: 'Track unusual activity and implied volatility shifts in real-time.',
      icon: CandlestickChart,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={derivativesData1}>
            <Area type="monotone" dataKey="vol" stroke="#FACC15" fill="#FEF08A" />
            <Tooltip />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'AI Greeks Estimator',
      description: 'Predictive models for Delta, Vega, and Theta based on historical volatility data.',
      icon: Cpu,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={derivativesData2}>
            <Bar dataKey="value" fill="#FACC15" radius={[8, 8, 0, 0]} />
            <XAxis dataKey="greek" />
            <Tooltip />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Strategy Simulator',
      description: 'Test covered calls, spreads, and straddles with backtesting features.',
      icon: Shield,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={derivativesData3}>
            <Line type="monotone" dataKey="perf" stroke="#FACC15" strokeWidth={3} dot={false} />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
  ],

  bonds: [
    {
      title: 'Bond Screener',
      description: 'Find government, municipal, and corporate bonds by yield, rating, and duration.',
      icon: LucideLineChart,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={bondsData1}>
            <Line type="monotone" dataKey="yield" stroke="#FACC15" strokeWidth={3} />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Yield Curve Visualizer',
      description: 'Interactive yield curve with macroeconomic overlay and forecast tracking.',
      icon: TrendingUp,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={bondsData2}>
            <Area type="monotone" dataKey="risk" stroke="#FACC15" fill="#FEF08A" />
            <Tooltip />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Credit Risk Insights',
      description: 'AI-based credit scoring using Moody’s, S&P, and Fitch data.',
      icon: Shield,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={bondsData3}>
            <Bar dataKey="spread" fill="#FACC15" radius={[8, 8, 0, 0]} />
            <XAxis dataKey="name" />
            <Tooltip />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
  ],

  alternatives: [
    {
      title: 'Crypto & Digital Assets',
      description: 'AI sentiment and volatility metrics for Bitcoin, Ethereum, and altcoins.',
      icon: Database,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={altData1}>
            <Line type="monotone" dataKey="value" stroke="#FACC15" strokeWidth={3} />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Private Equity Growth',
      description: 'AI projections for private equity and venture capital performance.',
      icon: BriefcaseBusiness,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={altData2}>
            <Bar dataKey="growth" fill="#FACC15" radius={[8, 8, 0, 0]} />
            <XAxis dataKey="name" />
            <Tooltip />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Alternative Asset Returns',
      description: 'Compare real estate, commodities, and crypto returns using AI metrics.',
      icon: BarChart3,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={altData3}>
            <Line type="monotone" dataKey="perf" stroke="#FACC15" strokeWidth={3} />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
  ],

  ai: [
    {
      title: 'AI Forecast Engine',
      description: 'Predicts short- and long-term market trends using NLP and ML models.',
      icon: Cpu,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={aiData1}>
            <Line type="monotone" dataKey="pred" stroke="#FACC15" strokeWidth={3} />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Sentiment Analysis',
      description: 'Extracts investor tone from earnings calls, SEC filings, and social media.',
      icon: LucideLineChart,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={aiData2}>
            <Bar dataKey="sentiment" fill="#FACC15" radius={[8, 8, 0, 0]} />
            <XAxis dataKey="topic" />
            <Tooltip />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Macro Data Integration',
      description: 'Combines real-time economic indicators with asset pricing models.',
      icon: Database,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={aiData3}>
            <Area type="monotone" dataKey="gdp" stroke="#FACC15" fill="#FEF08A" />
            <Tooltip />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ],

  portfolio: [
    {
      title: 'Portfolio Tracker',
      description: 'Track all holdings — stocks, bonds, crypto, and alternatives — in one place.',
      icon: Shield,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={portData1}>
            <Line type="monotone" dataKey="ret" stroke="#FACC15" strokeWidth={3} />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'AI Rebalancing',
      description: 'Recommends optimal weights based on Sharpe ratio and volatility models.',
      icon: Cpu,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={portData2}>
            <Bar dataKey="weight" fill="#FACC15" radius={[8, 8, 0, 0]} />
            <XAxis dataKey="asset" />
            <Tooltip />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: 'Risk vs Reward',
      description: 'Visualize the efficient frontier for your portfolio using AI risk metrics.',
      icon: BarChart3,
      chart: (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={portData3}>
            <Line type="monotone" dataKey="reward" stroke="#FACC15" strokeWidth={3} />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
  ],
};

// ==================== COMPONENT ====================
const Features: React.FC = () => {
  const [activeTab, setActiveTab] = useState('equities');

  return (
    <section id="features" className="py-24 bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-center mb-10"
        >
          ⚙️ WallStreetStocks.ai Features
        </motion.h2>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === cat.id
                  ? 'bg-yellow-400 text-black shadow-md'
                  : 'bg-gray-100 hover:bg-yellow-100 text-gray-700'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Animated Features */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            {featuresData[activeTab].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="p-6 bg-gray-50 rounded-2xl shadow-md hover:shadow-lg hover:bg-yellow-50 transition-all duration-300"
              >
                <feature.icon className="w-10 h-10 text-yellow-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-700 text-sm mb-4">{feature.description}</p>
                {feature.chart && <div className="h-28">{feature.chart}</div>}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Features;
