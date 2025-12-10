'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, LineChart } from 'lucide-react';
import { LineChart as ReLineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { day: 'Mon', value: 0.4 },
  { day: 'Tue', value: 0.8 },
  { day: 'Wed', value: 0.5 },
  { day: 'Thu', value: 1.0 },
  { day: 'Fri', value: 1.4 },
];

export default function PortfolioTrackerPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          📈 Portfolio Tracker
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Track all your investments — equities, bonds, crypto, and alternatives — in one unified dashboard powered by real-time AI analytics.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <LineChart className="text-yellow-500" /> Weekly Portfolio Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ReLineChart data={data}>
              <XAxis dataKey="day" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#FACC15" strokeWidth={3} />
            </ReLineChart>
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
