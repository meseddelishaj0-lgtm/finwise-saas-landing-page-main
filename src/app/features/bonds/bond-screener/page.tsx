'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LucideLineChart } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { bond: '1Y', yield: 3.5 },
  { bond: '5Y', yield: 3.9 },
  { bond: '10Y', yield: 4.1 },
  { bond: '30Y', yield: 4.3 },
];

export default function BondScreenerPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          💰 Bond Screener
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Screen government, municipal, and corporate bonds by yield, duration, and credit rating — powered by AI-driven filters.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <LucideLineChart className="text-yellow-500" /> Yield by Maturity
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <XAxis dataKey="bond" />
              <Tooltip />
              <Line type="monotone" dataKey="yield" stroke="#FACC15" strokeWidth={3} />
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
