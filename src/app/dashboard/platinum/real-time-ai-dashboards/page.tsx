"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function RealTimeAIDashboardsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 py-24 px-6 text-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h1 className="text-4xl font-bold text-blue-700 mb-3">⚡ Real-Time AI Dashboards</h1>
        <p className="text-lg text-gray-600 mb-8">
          Monitor live market trends across equities, sectors, and macro signals with dynamic AI-driven dashboards.
        </p>

        <div className="bg-white border border-blue-100 rounded-2xl shadow-md p-8 mb-8">
          <p className="text-gray-700">
            This page will host your live dashboards — including stock heatmaps, volatility signals, and macro data integrations.
          </p>
        </div>

        <Link
          href="/dashboard/platinum"
          className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          ← Back to Platinum Dashboard
        </Link>
      </motion.div>
    </main>
  );
}
