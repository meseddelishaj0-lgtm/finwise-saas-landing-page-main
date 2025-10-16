'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CandlestickChart, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { day: 'Mon', volume: 1200 },
  { day: 'Tue', volume: 1800 },
  { day: 'Wed', volume: 2200 },
  { day: 'Thu', volume: 1500 },
  { day: 'Fri', volume: 2500 },
];

export default function OptionsFlowAnalysisPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          📈 Options Flow Analysis
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Monitor unusual options activity and track real-time shifts in open interest, implied volatility, and institutional sentiment.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <CandlestickChart className="text-yellow-500" /> Daily Volume Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <XAxis dataKey="day" />
              <Tooltip />
              <Area type="monotone" dataKey="volume" stroke="#FACC15" fill="#FEF08A" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-10">
          <Link
            href="/features"
            className="inline-block bg-yellow-400 text-black font-semibold px-6 py-3 rounded-full hover:bg-yellow-500 transition-all"
          >
            ← Back to Features
          </Link>
        </div>
      </div>
    </section>
  );
}
