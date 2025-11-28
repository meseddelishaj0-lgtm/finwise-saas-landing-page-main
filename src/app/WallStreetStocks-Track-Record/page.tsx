"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function Page() {
  // Example track record data (replace with live data later)
  const data = [
    { year: "2019", WSS: 12.4, SP500: 8.9 },
    { year: "2020", WSS: 27.8, SP500: 16.3 },
    { year: "2021", WSS: 35.1, SP500: 26.9 },
    { year: "2022", WSS: -5.4, SP500: -18.1 },
    { year: "2023", WSS: 22.6, SP500: 14.8 },
    { year: "2024", WSS: 31.4, SP500: 18.7 },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center py-24 px-6">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          WallStreetStocks Track Record
        </h1>
        <p className="text-lg text-gray-600">
          Proven performance. Transparent results. Institutional-grade analytics 
          validated by real data.
        </p>
      </motion.section>

      {/* Stats Section */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full mb-14">
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center"
        >
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Annualized Return</h3>
          <p className="text-3xl font-bold text-yellow-500">+22.7%</p>
          <p className="text-gray-500 text-sm">5-Year Average</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center"
        >
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Max Drawdown</h3>
          <p className="text-3xl font-bold text-yellow-500">-7.9%</p>
          <p className="text-gray-500 text-sm">During 2022 Bear Market</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center"
        >
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Win Rate</h3>
          <p className="text-3xl font-bold text-yellow-500">71%</p>
          <p className="text-gray-500 text-sm">Monthly Positive Returns</p>
        </motion.div>
      </div>

      {/* Chart Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-8 max-w-5xl w-full mb-16"
      >
        <h3 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          Performance vs S&P 500 (2019–2024)
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis domain={[-20, 40]} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="WSS"
              stroke="#FACC15"
              strokeWidth={3}
              name="WallStreetStocks"
            />
            <Line
              type="monotone"
              dataKey="SP500"
              stroke="#1E293B"
              strokeWidth={3}
              name="S&P 500"
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* About Section */}
      <div className="max-w-4xl text-center mb-12">
        <h2 className="text-2xl font-semibold mb-4">Our Performance Philosophy</h2>
        <p className="text-gray-600 leading-relaxed">
          WallStreetStocks.ai uses a proprietary blend of AI-driven models,
          macroeconomic signals, and sector momentum to deliver superior 
          risk-adjusted returns. Unlike typical benchmarks, our strategies 
          dynamically adapt to volatility, liquidity shifts, and institutional 
          flows.
        </p>
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Access Full Institutional Reports
        </h3>
        <p className="text-gray-600 mb-6">
          Join WallStreetStocks.ai to access historical data, portfolio breakdowns, 
          and real-time performance analytics.
        </p>
        <a
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          View Full Analytics
        </a>
      </div>
    </main>
  );
}
