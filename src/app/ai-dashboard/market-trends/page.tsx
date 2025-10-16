"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";

// --- Mock Data for Charts ---
const sectorData = [
  { sector: "Technology", performance: 4.2 },
  { sector: "Energy", performance: 2.1 },
  { sector: "Finance", performance: 1.5 },
  { sector: "Consumer Disc.", performance: 3.9 },
  { sector: "Healthcare", performance: 1.8 },
  { sector: "Utilities", performance: -0.7 },
  { sector: "Real Estate", performance: -1.8 },
];

const sentimentData = [
  { name: "Bearish", value: 20, fill: "#EF4444" },
  { name: "Neutral", value: 40, fill: "#FACC15" },
  { name: "Bullish", value: 70, fill: "#22C55E" },
];

const MarketTrendsPage = () => {
  return (
    <section className="min-h-screen bg-gray-50 text-gray-900 px-6 md:px-32 pt-24 md:pt-32 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">📈 Market Trends</h1>
          <p className="text-lg text-gray-600">
            Track real-time market performance, monitor sector momentum, and analyze AI-powered sentiment insights.
          </p>
        </motion.div>

        {/* Live TradingView Widget */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-white p-6 rounded-2xl shadow-md mb-10"
        >
          <h2 className="text-2xl font-semibold mb-4">📊 Live Market Overview</h2>
          <div className="rounded-xl overflow-hidden">
            <iframe
              src="https://s.tradingview.com/widgetembed/?symbol=AAPL&interval=D&hidesidetoolbar=1&theme=light"
              width="100%"
              height="480"
              allowTransparency={true}
              frameBorder="0"
              className="rounded-xl"
            ></iframe>
          </div>
        </motion.div>

        {/* Sector Performance Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-white p-8 rounded-2xl shadow-md mb-10"
        >
          <h2 className="text-2xl font-semibold mb-6">🏦 Sector Performance (30 Days)</h2>
          <p className="text-gray-700 mb-4">
            Visualize sector-level returns to identify market leadership and lagging industries.
          </p>

          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="sector" tick={{ fill: "#374151" }} />
                <YAxis tick={{ fill: "#374151" }} />
                <Tooltip />
                <Bar dataKey="performance" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-blue-50 mt-4 p-4 rounded-xl">
            <p className="font-semibold text-gray-800">💡 AI Insight:</p>
            <p className="text-gray-700">
              Technology and Consumer Discretionary sectors are showing strong momentum — potential early indicators of market rotation into growth.
            </p>
          </div>
        </motion.div>

        {/* AI Sentiment Gauge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-white p-8 rounded-2xl shadow-md mb-10"
        >
          <h2 className="text-2xl font-semibold mb-6">🧠 AI Market Sentiment</h2>
          <p className="text-gray-700 mb-4">
            AI models analyze social sentiment, volatility, and market breadth to calculate the current sentiment index.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-around">
            <div className="w-full md:w-1/2 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="20%"
                  outerRadius="90%"
                  barSize={25}
                  data={sentimentData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                  background
                
                  dataKey="value"
/>

                  <Legend
                    iconSize={10}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                  />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 md:mt-0 text-center md:text-left md:w-1/2">
              <p className="text-lg font-semibold text-gray-800 mb-2">
                Current AI Sentiment: <span className="text-green-600">Bullish</span>
              </p>
              <p className="text-gray-700 leading-relaxed">
                Machine learning algorithms detect a positive bias in institutional flow and earnings momentum.
                Sentiment is expected to stay above neutral through the next month.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Macro Overview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-2xl shadow-md mb-10"
        >
          <h2 className="text-2xl font-semibold mb-4">🌎 Macro Outlook</h2>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed">
            <li><strong>GDP Growth:</strong> 2.1% annualized — steady expansion.</li>
            <li><strong>Inflation:</strong> Cooling to 2.8% YoY, supporting soft-landing optimism.</li>
            <li><strong>Earnings Trend:</strong> 68% of S&P 500 companies beat Q3 estimates.</li>
            <li><strong>Interest Rates:</strong> Fed expected to pause until mid-2026.</li>
          </ul>
          <p className="mt-4 text-gray-800 font-medium">
            ✅ AI Recommends: Gradual reallocation into industrials and cyclical assets for balanced growth exposure.
          </p>
        </motion.div>

        {/* Back Button */}
        <div className="text-center mt-10">
          <Link
            href="/ai-dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow transition"
          >
            ← Back to AI Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MarketTrendsPage;
