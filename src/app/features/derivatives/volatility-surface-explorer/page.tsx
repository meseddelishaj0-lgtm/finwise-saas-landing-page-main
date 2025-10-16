'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { expiry: '1M', iv: 20 },
  { expiry: '3M', iv: 25 },
  { expiry: '6M', iv: 28 },
  { expiry: '1Y', iv: 32 },
];

export default function VolatilitySurfaceExplorerPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          🌪️ Volatility Surface Explorer
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Visualize implied volatility surfaces across maturities and strike prices. Analyze skew, term structure, and volatility clustering.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <TrendingUp className="text-yellow-500" /> Implied Volatility by Expiry
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <XAxis dataKey="expiry" />
              <Tooltip />
              <Area type="monotone" dataKey="iv" stroke="#FACC15" fill="#FEF08A" />
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
