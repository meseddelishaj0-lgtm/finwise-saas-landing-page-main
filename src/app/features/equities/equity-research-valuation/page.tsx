'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'AAPL', value: 320 },
  { name: 'MSFT', value: 300 },
  { name: 'TSLA', value: 270 },
  { name: 'GOOGL', value: 285 },
  { name: 'NVDA', value: 450 },
];

export default function EquityResearchValuationPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          📊 Equity Research & Valuation
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Analyze intrinsic value, P/E ratios, and growth potential across global equities
          using AI-powered DCF and comparable company models.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center justify-center gap-2">
            <BarChart3 className="text-yellow-500" /> Sample Valuation Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#FACC15" strokeWidth={3} />
            </LineChart>
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
