'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bell, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { time: '9 AM', alerts: 2 },
  { time: '10 AM', alerts: 4 },
  { time: '11 AM', alerts: 6 },
  { time: '12 PM', alerts: 8 },
  { time: '1 PM', alerts: 5 },
];

export default function SmartAlertsPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          🔔 Smart Alerts
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Receive real-time AI alerts when your portfolio hits volatility thresholds, price targets, or
          sentiment shifts. Stay ahead of the market 24/7.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <Activity className="text-yellow-500" /> Alert Frequency Tracker
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <XAxis dataKey="time" />
              <Tooltip />
              <Area type="monotone" dataKey="alerts" stroke="#FACC15" fill="#FEF08A" />
            </AreaChart>
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
