"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Brain,
  BarChart3,
  PieChart,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  Cell,
  PieChart as RePieChart,
} from "recharts";

export default function SmartPortfolioTipsPage() {
  const [riskLevel, setRiskLevel] = useState(50);
  const [rebalance, setRebalance] = useState(false);

  // Simulated portfolio allocation (AI-based)
  const portfolio = [
    { name: "Equities", value: 55 },
    { name: "Fixed Income", value: 25 },
    { name: "Commodities", value: 10 },
    { name: "Cash", value: 10 },
  ];

  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#6b7280"];

  // Simulated growth projection
  const projectionData = [
    { year: "2024", value: 10000 },
    { year: "2025", value: 11400 },
    { year: "2026", value: 13200 },
    { year: "2027", value: 15300 },
    { year: "2028", value: 17900 },
  ];

  // AI suggestions based on risk level
  const getAISuggestion = () => {
    if (riskLevel < 30)
      return "AI suggests a conservative allocation: focus on bonds, dividend stocks, and cash reserves.";
    if (riskLevel < 70)
      return "AI recommends a balanced portfolio: blend of equities, ETFs, and growth sectors with 10–20% cash.";
    return "AI forecasts higher long-term growth: consider overweighting technology, AI, and emerging markets.";
  };

  return (
    <section className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-purple-600 mb-3">
            🧠 Smart Portfolio Tips
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Our AI portfolio engine provides data-driven rebalancing
            recommendations designed to minimize risk and enhance compounding
            returns. Strategies adapt dynamically to market volatility, sector
            rotation, and sentiment data.
          </p>
        </div>

        {/* Core Strategies */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Core Portfolio Strategies
          </h2>
          <ul className="list-disc ml-6 text-gray-700 space-y-2">
            <li>Rebalance quarterly to maintain optimal asset allocation.</li>
            <li>Overweight sectors with improving AI sentiment scores.</li>
            <li>Trim exposure in high-volatility or overextended names.</li>
            <li>Increase defensive positions during macro uncertainty.</li>
            <li>Monitor global diversification to reduce correlation risk.</li>
          </ul>
        </div>

        {/* AI Strategy Summary */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-8 mb-12 shadow">
          <h3 className="text-2xl font-bold text-purple-700 mb-3 flex items-center gap-2">
            <Brain className="w-6 h-6" /> AI Strategy Summary
          </h3>
          <p className="text-gray-700 mb-3">
            The portfolio model emphasizes capital efficiency, balancing growth
            and downside protection. AI forecasts expected annualized returns of{" "}
            <strong>8–12%</strong> under moderate risk scenarios, assuming
            quarterly rebalancing and sector rotation optimization.
          </p>
          <p className="text-gray-700">
            Models dynamically adjust equity exposure using sentiment analysis
            and volatility signals, favoring low-drawdown, high-efficiency
            opportunities in technology, healthcare, and infrastructure.
          </p>
        </div>

        {/* Interactive Risk Slider */}
        <div className="bg-gray-50 rounded-2xl shadow p-8 mb-12">
          <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Adjust Risk Tolerance
          </h3>
          <div className="flex flex-col items-center space-y-4">
            <input
              type="range"
              min="0"
              max="100"
              value={riskLevel}
              onChange={(e) => setRiskLevel(Number(e.target.value))}
              className="w-3/4 accent-purple-600"
            />
            <p className="text-lg font-semibold">
              Risk Level: <span className="text-purple-600">{riskLevel}%</span>
            </p>
            <p className="text-gray-700 text-center max-w-lg">
              {getAISuggestion()}
            </p>
          </div>
        </div>

        {/* Portfolio Allocation Pie */}
        <div className="bg-gray-50 rounded-2xl shadow p-8 mb-12">
          <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center gap-2">
            <PieChart className="w-6 h-6" /> Portfolio Allocation
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={portfolio}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                fill="#8884d8"
                label
              >
                {portfolio.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-500 mt-3 text-center">
            AI-optimized allocation targeting maximum Sharpe ratio and
            consistent compounding.
          </p>
        </div>

        {/* Portfolio Growth Projection */}
        <div className="bg-gray-50 rounded-2xl shadow p-8 mb-12">
          <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> Simulated Portfolio Growth
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#a855f7"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-500 mt-3 text-center">
            Growth simulated based on AI-forecasted asset performance and
            quarterly rebalancing.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <button
            onClick={() => {
              setRebalance(true);
              setTimeout(() => setRebalance(false), 2500);
            }}
            className="flex items-center gap-2 bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-purple-600 transition"
          >
            <RefreshCw
              className={`w-5 h-5 ${rebalance ? "animate-spin" : ""}`}
            />
            {rebalance ? "Rebalancing..." : "Rebalance Portfolio"}
          </button>

          <Link
            href="/ai-dashboard"
            className="flex items-center gap-2 bg-yellow-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-yellow-500 transition"
          >
            <ArrowLeft className="w-5 h-5" /> Back to AI Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
