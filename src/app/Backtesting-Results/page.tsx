"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";
import { RefreshCcw } from "lucide-react";

interface BacktestResult {
  date: string;
  strategyReturn: number;
  benchmarkReturn: number;
}

export default function BacktestingResultsPage() {
  const [data, setData] = useState<BacktestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/backtesting");
      const json = await res.json();
      if (!json.error) {
        setData(json);
      } else {
        console.error("Backtesting data error:", json.error);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Derive summary metrics (with division by zero protection)
  const totalStrategyReturn = data.length && data[0].strategyReturn !== 0
    ? ((data[data.length - 1].strategyReturn / data[0].strategyReturn) - 1) * 100
    : 0;
  const totalBenchmarkReturn = data.length && data[0].benchmarkReturn !== 0
    ? ((data[data.length - 1].benchmarkReturn / data[0].benchmarkReturn) - 1) * 100
    : 0;

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
          Backtesting Results
        </h1>
        <p className="text-lg text-gray-600">
          A transparent breakdown of how our strategy has performed versus the benchmark.
        </p>
      </motion.section>

      {/* Summary Metrics */}
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl w-full mb-12">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Strategy Total Return</h3>
          <p className="text-3xl font-bold text-yellow-500">{totalStrategyReturn.toFixed(2)}%</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Benchmark (S&P 500) Total Return</h3>
          <p className="text-3xl font-bold text-yellow-500">{totalBenchmarkReturn.toFixed(2)}%</p>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchData}
        disabled={loading}
        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-3 rounded-xl transition-all mb-10"
      >
        <RefreshCcw className="w-5 h-5" />
        {loading ? "Refreshing…" : "Refresh Data"}
      </button>

      {/* Chart Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-8 max-w-5xl w-full mb-16"
      >
        <h3 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          Strategy vs Benchmark (Last Year)
        </h3>
        {loading || !data.length ? (
          <p className="text-center text-gray-500">Loading data…</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="strategyReturn"
                stroke="#FACC15"
                name="Strategy Return"
                strokeWidth={3}
              />
              <Line
                type="monotone"
                dataKey="benchmarkReturn"
                stroke="#1E293B"
                name="Benchmark Return"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Info Section */}
      <div className="max-w-4xl text-center mb-12">
        <h2 className="text-2xl font-semibold mb-4">How to Interpret These Results</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          We plot our strategy’s equity curve alongside the benchmark to provide full transparency. The total return values above reflect performance over the full period shown.  
        </p>
        <p className="text-gray-600 leading-relaxed">
          Note: Past performance is not a guarantee of future results. Strategy may differ in live trading and actual results will vary.
        </p>
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Want Full Backtesting Reports?
        </h3>
        <p className="text-gray-600 mb-6">
          Access full monthly reports, strategy breakdowns and historic performance when you join WallStreetStocks Premium.
        </p>
        <a
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Get Premium Access
        </a>
      </div>
    </main>
  );
}

