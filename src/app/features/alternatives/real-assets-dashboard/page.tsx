'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { sector: 'Commercial', value: 7.2 },
  { sector: 'Residential', value: 8.1 },
  { sector: 'Infrastructure', value: 5.9 },
  { sector: 'Energy', value: 6.4 },
];

export default function RealAssetsDashboardPage() {
  return (
    <section className="min-h-screen bg-night text-ivory py-14 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl mb-4 text-gold font-display font-normal tracking-tight"
        >
          Real Assets Dashboard
        </motion.h1>
        <p className="text-gray-300 text-lg mb-10 max-w-3xl mx-auto">
          Monitor performance and valuations of real assets — including Real Estate, Infrastructure, and Energy — through AI-driven data visualization.
        </p>

        <div className="bg-surface2 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <TrendingUp className="text-gold" /> Sector Performance Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <XAxis dataKey="sector" />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#FACC15" fill="#FEF08A" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-10">
          <Link href="/features" className="inline-block bg-yellow-400 text-black font-semibold px-6 py-3 rounded-full hover:bg-gold transition-all">
            ← Back to Features
          </Link>
        </div>
      </div>
    </section>
  );
}
