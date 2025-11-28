"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function PortfolioOptimizationToolsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 py-24 px-6 text-gray-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h1 className="text-4xl font-bold text-blue-400 mb-3">⚙️ Portfolio Optimization Tools</h1>
        <p className="text-lg text-gray-300 mb-8">
          Optimize allocation with AI-driven rebalancing, diversification scoring, and Sharpe ratio optimization.
        </p>

        <div className="bg-gray-800/60 border border-blue-900 rounded-2xl shadow-lg p-8 mb-8">
          <p className="text-gray-200">
            This section will include backtesting modules, efficient frontier visualizers, and smart reallocation analytics.
          </p>
        </div>

        <Link
          href="/dashboard/diamond"
          className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          ← Back to Diamond Dashboard
        </Link>
      </motion.div>
    </main>
  );
}
