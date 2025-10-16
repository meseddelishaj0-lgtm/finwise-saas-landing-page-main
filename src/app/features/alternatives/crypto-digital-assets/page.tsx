'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Database } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { asset: 'BTC', value: 67000 },
  { asset: 'ETH', value: 3400 },
  { asset: 'SOL', value: 190 },
  { asset: 'XRP', value: 0.55 },
  { asset: 'DOGE', value: 0.12 },
];

export default function CryptoDigitalAssetsPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          🪙 Crypto & Digital Assets
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Explore real-time AI insights for Bitcoin, Ethereum, and alternative coins. Track volatility, sentiment, and correlations with traditional markets.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <Database className="text-yellow-500" /> Current Market Prices
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <XAxis dataKey="asset" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#FACC15" strokeWidth={3} />
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
