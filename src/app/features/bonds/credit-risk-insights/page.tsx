'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { rating: 'AAA', spread: 0.7 },
  { rating: 'AA', spread: 0.9 },
  { rating: 'A', spread: 1.1 },
  { rating: 'BBB', spread: 1.5 },
  { rating: 'BB', spread: 2.2 },
];

export default function CreditRiskInsightsPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          🧠 Credit Risk Insights
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Evaluate bond credit quality using AI-enhanced scoring models powered by Moody’s, S&P, and Fitch data analytics.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <Shield className="text-yellow-500" /> Credit Spread by Rating
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="rating" />
              <Tooltip />
              <Bar dataKey="spread" fill="#FACC15" radius={[8, 8, 0, 0]} />
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
