"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Rating {
  symbol: string;
  peRatio: number;
  eps: number;
  roe: number;
  sentiment: string;
}

export default function FundamentalAIRatingsPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const res = await fetch("/api/finnhub/ratings");
        const data = await res.json();
        setRatings(data.slice(0, 5));
      } catch (err) {
        console.error("Error fetching AI ratings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRatings();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-100 to-yellow-50 py-16 px-6 text-gray-900">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-500 via-amber-600 to-yellow-700 bg-clip-text text-transparent">
          Fundamental AI Ratings
        </h1>
        <p className="mt-4 text-lg text-gray-700">AI-generated scores based on profitability, growth, and market sentiment.</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center mt-16 text-amber-600 animate-pulse">Loading ratings...</div>
      ) : (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ratings.map((r, i) => (
            <motion.div key={r.symbol} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 hover:shadow-xl transition">
              <h2 className="text-xl font-bold text-gray-900">{r.symbol}</h2>
              <p className="text-gray-700 mt-2">P/E Ratio: <span className="font-semibold">{r.peRatio}</span></p>
              <p className="text-gray-700">EPS: <span className="font-semibold">{r.eps}</span></p>
              <p className="text-gray-700">ROE: <span className="font-semibold">{r.roe}%</span></p>
              <p className={`mt-2 font-semibold ${r.sentiment === "Bullish" ? "text-green-600" : "text-red-600"}`}>{r.sentiment}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-16 flex justify-center">
        <Link href="/pricing" className="px-6 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 hover:opacity-90 transition-all">
          Back to Gold Plan
        </Link>
      </div>
    </div>
  );
}
