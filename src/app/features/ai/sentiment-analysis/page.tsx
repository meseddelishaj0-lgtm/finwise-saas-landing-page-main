'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageSquare, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { topic: 'Earnings Calls', sentiment: 0.72 },
  { topic: 'Social Media', sentiment: 0.58 },
  { topic: 'News Headlines', sentiment: 0.64 },
  { topic: 'Analyst Reports', sentiment: 0.69 },
];

export default function SentimentAnalysisPage() {
  return (
    <section className="min-h-screen bg-white text-gray-900 py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4 text-yellow-500"
        >
          🧩 Sentiment Analysis
        </motion.h1>
        <p className="text-gray-700 text-lg mb-10 max-w-3xl mx-auto">
          Extract investor tone and sentiment from financial news, social media, and company filings
          using NLP-powered analytics. Identify shifts in market mood before price action reacts.
        </p>

        <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 flex justify-center items-center gap-2">
            <MessageSquare className="text-yellow-500" /> Sentiment by Source
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="topic" />
              <Tooltip />
              <Bar dataKey="sentiment" fill="#FACC15" radius={[8, 8, 0, 0]} />
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
