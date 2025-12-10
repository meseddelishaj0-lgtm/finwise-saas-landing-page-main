"use client";

import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function Page() {
  // Example demo data – replace with live API later
  const data = [
    { date: "Jan", WSS: 8.4, SP500: 2.1 },
    { date: "Feb", WSS: 9.1, SP500: 3.0 },
    { date: "Mar", WSS: 11.2, SP500: 4.3 },
    { date: "Apr", WSS: 12.8, SP500: 4.7 },
    { date: "May", WSS: 15.3, SP500: 6.2 },
    { date: "Jun", WSS: 18.9, SP500: 7.5 },
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
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
          WallStreetStocks vs S&P 500
        </h1>
        <p className="text-lg text-gray-600">
          See how WallStreetStocks’ AI-driven strategies perform compared to the S&P 500 benchmark.
          Real insights. Real data. Real performance.
        </p>
      </motion.section>

      {/* Metrics Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full mb-14">
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center"
        >
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Total Return (YTD)</h3>
          <p className="text-3xl font-bold text-yellow-500">+18.9%</p>
          <p className="text-gray-500 text-sm">vs S&P 500 +7.5%</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center"
        >
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Sharpe Ratio</h3>
          <p className="text-3xl font-bold text-yellow-500">1.42</p>
          <p className="text-gray-500 text-sm">vs S&P 500 0.82</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center"
        >
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Win Rate</h3>
          <p className="text-3xl font-bold text-yellow-500">73%</p>
          <p className="text-gray-500 text-sm">vs S&P 500 58%</p>
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
          Performance Comparison (YTD)
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 20]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="WSS" stroke="#FACC15" strokeWidth={3} />
            <Line type="monotone" dataKey="SP500" stroke="#1E293B" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-3 text-gray-900">
          Discover AI-Driven Market Research
        </h2>
        <p className="text-gray-600 mb-6">
          Join WallStreetStocks.ai and access institutional-grade analytics that consistently beat
          the benchmark.
        </p>
        <a
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Join the AI Revolution
        </a>
      </div>
    </main>
  );
}
