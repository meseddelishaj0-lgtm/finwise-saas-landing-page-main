"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export default function ROICalculatorPage() {
  const [gain, setGain] = useState("");
  const [cost, setCost] = useState("");
  const [roi, setRoi] = useState<number | null>(null);

  const calculateROI = () => {
    const g = parseFloat(gain);
    const c = parseFloat(cost);
    if (isNaN(g) || isNaN(c) || c === 0) {
      setRoi(null);
      return;
    }
    const result = ((g - c) / c) * 100;
    setRoi(result);
  };

  const resetForm = () => {
    setGain("");
    setCost("");
    setRoi(null);
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center pt-36 md:pt-44 pb-16 px-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          ROI Calculator
        </h1>
        <p className="text-lg text-gray-600">
          Calculate your Return on Investment (ROI) instantly to measure the profitability of your business or project.
        </p>
      </motion.section>

      {/* Calculator Card */}
      <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-8">
        <label className="block text-gray-800 font-semibold mb-2">
          Total Gain / Return ($)
        </label>
        <input
          type="number"
          value={gain}
          onChange={(e) => setGain(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="e.g. 12000"
        />

        <label className="block text-gray-800 font-semibold mb-2">
          Total Cost / Investment ($)
        </label>
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="e.g. 10000"
        />

        <div className="flex gap-3">
          <button
            onClick={calculateROI}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 rounded-xl transition-all"
          >
            Calculate
          </button>
          <button
            onClick={resetForm}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-xl transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Result Display */}
      {roi !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full mt-10 bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center"
        >
          <h2 className="text-xl font-bold mb-2 text-gray-800">Your ROI</h2>
          <p className="text-3xl font-extrabold text-yellow-500">
            {roi.toFixed(2)}%
          </p>
          <p className="text-gray-600 mt-2">
            {roi >= 0
              ? "Positive ROI indicates a profitable investment."
              : "Negative ROI indicates a loss on investment."}
          </p>
        </motion.div>
      )}
    </main>
  );
}
