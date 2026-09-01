"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function RealTimeAIDashboardsPage() {
  return (
    <main className="min-h-screen py-14 px-6 text-ivory bg-night">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h1 className="text-4xl text-gold mb-3 font-display font-normal tracking-tight md:text-5xl">Real-Time AI Dashboards</h1>
        <p className="text-lg text-gray-400 mb-8">
          Monitor live market trends across equities, sectors, and macro signals with dynamic AI-driven dashboards.
        </p>

        <div className="bg-surface border border-white/10 rounded-2xl shadow-md p-8 mb-8">
          <p className="text-gray-300">
            This page will host your live dashboards — including stock heatmaps, volatility signals, and macro data integrations.
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
