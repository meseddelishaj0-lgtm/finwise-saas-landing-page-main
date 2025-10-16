'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { sector: 'Treasury', liquidity: 95 },
  { sector: 'Corporate', liquidity: 75 },
  { sector: 'Municipal', liquidity: 60 },
  { sector: 'High Yield', liquidity: 45 },
];

export default function LiquidityHeatmapPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          💧 Liquidity Heatmap
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Visualize bond market liquidity across sectors, maturities, and rating classes to identify trading opportunities and risk zones.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <BarChart3 className="text-yellow-500" /> Liquidity Index by Sector
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="sector" />
              <Tooltip />
              <Bar dataKey="liquidity" fill="#FACC15" radius={[8, 8, 0, 0]} />
            </BarChart>
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
