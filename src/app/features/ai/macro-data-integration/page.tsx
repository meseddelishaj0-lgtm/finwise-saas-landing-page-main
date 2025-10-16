'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Globe2, LineChart } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', GDP: 2.1, Inflation: 3.4 },
  { month: 'Feb', GDP: 2.3, Inflation: 3.2 },
  { month: 'Mar', GDP: 2.6, Inflation: 3.0 },
  { month: 'Apr', GDP: 2.8, Inflation: 2.9 },
  { month: 'May', GDP: 3.0, Inflation: 2.7 },
];

export default function MacroDataIntegrationPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          🌍 Macro Data Integration
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Integrate live macroeconomic indicators — GDP, inflation, unemployment, and trade data — into
          financial models to power real-time predictive analytics.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <LineChart className="text-yellow-500" /> GDP vs Inflation Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <XAxis dataKey="month" />
              <Tooltip />
              <Area type="monotone" dataKey="GDP" stroke="#FACC15" fill="#FEF08A" />
              <Area type="monotone" dataKey="Inflation" stroke="#A855F7" fill="#E9D5FF" />
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
