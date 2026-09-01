"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function PlatinumMarketOverviewPage() {
  return (
    <main className="min-h-screen py-14 px-6 text-ivory bg-night">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h1 className="text-4xl text-gold mb-3 font-display font-normal tracking-tight md:text-5xl">Platinum Market Overview</h1>
        <p className="text-lg text-gray-400 mb-8">
          Gain AI-enhanced insights into global indices, cross-asset correlations, and sector heatmaps.
        </p>

        <div className="bg-surface border border-white/10 rounded-2xl shadow-md p-8 mb-8">
          <p className="text-gray-300">
            Live updates on major index trends, bond-equity correlation maps, and volatility metrics will appear here.
          </p>
        </div>

        <Link
          href="/dashboard/platinum"
          className="inline-block mt-4 px-6 py-3 bg-gold text-night rounded-lg font-semibold hover:bg-gold-deep transition"
        >
          ← Back to Platinum Dashboard
        </Link>
      </motion.div>
    </main>
  );
}
