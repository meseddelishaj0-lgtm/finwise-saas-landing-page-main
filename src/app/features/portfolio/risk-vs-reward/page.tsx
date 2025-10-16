'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { risk: 1, reward: 2 },
  { risk: 2, reward: 2.8 },
  { risk: 3, reward: 3.2 },
  { risk: 4, reward: 3.6 },
  { risk: 5, reward: 4.1 },
];

export default function RiskVsRewardPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          ⚖️ Risk vs Reward
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Visualize your efficient frontier. AI-driven models help you understand portfolio risk and reward trade-offs with dynamic rebalancing simulations.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <TrendingUp className="text-yellow-500" /> Efficient Frontier Chart
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <XAxis dataKey="risk" />
              <Tooltip />
              <Line type="monotone" dataKey="reward" stroke="#FACC15" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-10">
          <Link href="/features" className="inline-block bg-yellow-400 text-black font-semibold px-6 py-3 rounded-full hover:bg-yellow-500 transition-all">
            ← Back to Features
          </Link>
        </div>
      </div>
    </section>
  );
}
