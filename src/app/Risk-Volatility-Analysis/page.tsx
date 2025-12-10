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
  Legend,
} from "recharts";
import { RefreshCcw } from "lucide-react";

interface RiskDataPoint {
  date: string;
  volatilityIndex: number;
  valueAtRisk: number;
  drawdown: number;
}

export default function RiskVolatilityAnalysisPage() {
  const [data, setData] = useState<RiskDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/risk-volatility");
      const json = await res.json();
      if (!json.error) setData(json);
      else console.error(json.error);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center py-24 px-6">
      {/* ===== Hero Section ===== */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Risk & Volatility Analysis
        </h1>
        <p className="text-lg text-gray-600">
          Analyze volatility trends, Value-at-Risk (VaR), and drawdowns using
          real-time market data from WallStreetStocks.ai.
        </p>
      </motion.section>

      {/* ===== Refresh Button ===== */}
      <button
        onClick={fetchData}
        disabled={loading}
        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-3 rounded-xl transition-all mb-10"
      >
        <RefreshCcw className="w-5 h-5" />
        {loading ? "Loading..." : "Refresh Data"}
      </button>

      {/* ===== Chart Section ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-8 max-w-5xl w-full mb-16"
      >
        <h3 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          Market Risk Metrics (Last 90 Days)
        </h3>
        {loading || !data.length ? (
          <p className="text-center text-gray-500">Loading data…</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="volatilityIndex"
                stroke="#FACC15"
                strokeWidth={3}
                name="Volatility Index (VIX)"
              />
              <Line
                type="monotone"
                dataKey="valueAtRisk"
                stroke="#2563EB"
                strokeWidth={3}
                name="Value at Risk (VaR %)"
              />
              <Line
                type="monotone"
                dataKey="drawdown"
                stroke="#16A34A"
                strokeWidth={3}
                name="Max Drawdown (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* ===== Info Section ===== */}
      <div className="max-w-4xl text-center mb-12">
        <h2 className="text-2xl font-semibold mb-4">
          Understanding Market Risk
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          <strong>Volatility Index (VIX):</strong> measures market expectation
          of near-term volatility — higher VIX suggests increased uncertainty.{" "}
          <br />
          <strong>Value at Risk (VaR):</strong> estimates the potential daily
          portfolio loss under normal market conditions at a 95% confidence
          level.{" "}
          <br />
          <strong>Drawdown:</strong> represents the peak-to-trough decline in
          portfolio value, capturing the worst-case performance.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Combining these metrics provides a complete view of risk — volatility
          shows potential movement, while drawdown and VaR highlight the
          downside exposure.
        </p>
      </div>

      {/* ===== CTA Section ===== */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Upgrade to Advanced Risk Tools
        </h3>
        <p className="text-gray-600 mb-6">
          Unlock institutional-grade risk simulations and AI-driven stress
          testing with WallStreetStocks Premium.
        </p>
        <a
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Unlock Advanced Analytics
        </a>
      </div>
    </main>
  );
}
