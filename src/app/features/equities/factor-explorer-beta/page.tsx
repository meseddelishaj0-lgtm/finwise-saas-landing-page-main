'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cpu, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { factor: 'Momentum', score: 85 },
  { factor: 'Value', score: 73 },
  { factor: 'Quality', score: 90 },
  { factor: 'Volatility', score: 65 },
];

export default function FactorExplorerPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          ⚡ Factor Explorer (Beta)
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Discover performance factors such as Momentum, Value, Quality, and Volatility —
          visualized through our AI-driven quant models.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center justify-center gap-2">
            <Cpu className="text-yellow-500" /> Factor Strength (AI Quant Score)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <XAxis dataKey="factor" />
              <Tooltip />
              <Area type="monotone" dataKey="score" stroke="#FACC15" fill="#FEF08A" />
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
