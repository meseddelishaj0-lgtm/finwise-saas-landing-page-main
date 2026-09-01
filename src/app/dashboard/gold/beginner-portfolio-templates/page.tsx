"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Portfolio {
  name: string;
  holdings: { symbol: string; weight: number }[];
}

export default function BeginnerPortfolioTemplatesPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/finnhub/portfolios");
        const data = await res.json();
        setPortfolios(data);
      } catch (error) {
        console.error("Error loading templates:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  return (
    <div className="min-h-screen py-16 px-6 text-ivory bg-night">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center">
        <h1 className="text-4xl md:text-5xl text-gold font-display font-normal tracking-tight">
          Beginner Portfolio Templates
        </h1>
        <p className="mt-4 text-lg text-gray-300">Pre-built, diversified portfolios designed for new investors — built with AI and real market data.</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center mt-16 text-gold animate-pulse">Loading portfolios...</div>
      ) : (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {portfolios.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-surface rounded-2xl p-6 shadow-lg border border-gold/20 hover:shadow-xl transition">
              <h2 className="text-2xl font-bold text-ivory">{p.name}</h2>
              <ul className="mt-4 space-y-1 text-gray-300">
                {p.holdings.map((h) => (
                  <li key={h.symbol} className="flex justify-between">
                    <span>{h.symbol}</span>
                    <span className="text-gold font-medium">{h.weight}%</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-16 flex justify-center">
        <Link href="/plans" className="px-6 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 hover:opacity-90 transition-all">
          Back to Gold Plan
        </Link>
      </div>
    </div>
  );
}
