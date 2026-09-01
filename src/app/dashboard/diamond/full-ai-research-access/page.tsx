"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function FullAIResearchAccessPage() {
  return (
    <main className="min-h-screen py-14 px-6 text-gray-100 bg-night">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h1 className="text-4xl text-gold-soft mb-3 font-display font-normal tracking-tight md:text-5xl">Full AI Research Access</h1>
        <p className="text-lg text-gray-300 mb-8">
          Unlock every AI research tool available — from sentiment models to deep valuation analysis and backtesting dashboards.
        </p>

        <div className="bg-surface2 border border-gold/30 rounded-2xl shadow-lg p-8 mb-8">
          <p className="text-gray-200">
            You’ll soon access advanced valuation engines, sentiment maps, and DCF automation modules — all AI-driven.
          </p>
        </div>

        <Link
          href="/dashboard/diamond"
          className="inline-block mt-4 px-6 py-3 bg-gold text-night rounded-lg font-semibold hover:bg-gold-deep transition"
        >
          ← Back to Diamond Dashboard
        </Link>
      </motion.div>
    </main>
  );
}
