'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { greek: 'Delta', value: 0.82 },
  { greek: 'Gamma', value: 0.19 },
  { greek: 'Vega', value: 0.53 },
  { greek: 'Theta', value: -0.09 },
];

export default function AIGreeksEstimatorPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          🤖 AI Greeks Estimator
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Predict Delta, Gamma, Vega, and Theta values in real-time using deep learning models trained on volatility clusters and pricing data.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <Cpu className="text-yellow-500" /> Predicted Greeks Snapshot
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="greek" />
              <Tooltip />
              <Bar dataKey="value" fill="#FACC15" radius={[8, 8, 0, 0]} />
            </BarChart>
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
