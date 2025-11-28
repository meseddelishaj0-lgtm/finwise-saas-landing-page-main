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
  CartesianGrid,
} from 'recharts';

// ==================== SAMPLE DATA ====================
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

// ==================== CATEGORIES ====================
const categories = [
  { id: 'equities', label: 'Equities', icon: BarChart3 },
  { id: 'derivatives', label: 'Derivatives', icon: CandlestickChart },
  { id: 'bonds', label: 'Bonds', icon: LucideLineChart },
  { id: 'alternatives', label: 'Alternatives', icon: Database },
  { id: 'ai', label: 'AI & Data', icon: Cpu },
  { id: 'portfolio', label: 'Portfolio Tools', icon: Shield },
];

// ==================== DARK CHART THEME ====================
const DarkGrid = () => <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />;
const DarkXAxis = (props: any) => <XAxis {...props} stroke="rgba(255,255,255,0.4)" />;
const DarkYAxis = (props: any) => <YAxis {...props} stroke="rgba(255,255,255,0.4)" />;
const DarkTooltip = (props: any) => (
  <Tooltip
    {...props}
    contentStyle={{
      backgroundColor: '#111',
      border: '1px solid #FACC15',
      borderRadius: '8px',
      color: '#fff',
    }}
    labelStyle={{ color: '#FACC15' }}
  />
);

// ==================== FEATURES DATA ====================
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
            <DarkGrid />
            <DarkXAxis dataKey="name" />
            <DarkYAxis />
            <Line type="monotone" dataKey="value" stroke="#FACC15" strokeWidth={3} dot={false} />
            <DarkTooltip />
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
            <DarkGrid />
            <DarkXAxis dataKey="name" />
            <DarkYAxis />
            <Bar dataKey="deals" fill="#FACC15" radius={[8, 8, 0, 0]} />
            <DarkTooltip />
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
            <DarkGrid />
            <DarkXAxis dataKey="region" />
            <DarkYAxis />
            <Line type="monotone" dataKey="index" stroke="#FACC15" strokeWidth={3} dot={false} />
            <DarkTooltip />
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
    <section
      id="features"
      className="relative w-screen overflow-hidden text-white bg-gradient-to-b from-black via-[#0a0a0a] to-[#1a1a1a]"
      style={{ marginLeft: 'calc(-50vw + 50%)' }}
    >
      {/* Radial gold glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.08)_0%,rgba(0,0,0,1)_80%)] pointer-events-none" />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
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
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Cards */}
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
                className="p-6 bg-gradient-to-b from-[#111] to-[#1a1a1a] rounded-2xl shadow-lg hover:shadow-yellow-500/10 border border-gray-800 transition-all duration-300"
              >
                <feature.icon className="w-10 h-10 text-yellow-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{feature.description}</p>
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
