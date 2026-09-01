"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function SectorRotationTrendForecastsPage() {
  return (
    <main className="min-h-screen py-14 px-6 text-ivory bg-night">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h1 className="text-4xl text-gold mb-3 font-display font-normal tracking-tight md:text-5xl">Sector Rotation & Trend Forecasts</h1>
        <p className="text-lg text-gray-400 mb-8">
          Identify sector leadership shifts and forecast momentum using advanced AI macro-rotation models.
        </p>

        <div className="bg-surface border border-white/10 rounded-2xl shadow-md p-8 mb-8">
          <p className="text-gray-300">
            This section will include momentum visualizations, predictive sector maps, and macro rotation overlays.
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
