"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, BarChart3, Brain, ArrowLeft } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";

export default function LongTermOutlookPage() {
  const growthData = [
    { year: "2024", gdp: 2.3, productivity: 1.8 },
    { year: "2025", gdp: 2.7, productivity: 2.0 },
    { year: "2026", gdp: 3.0, productivity: 2.3 },
    { year: "2027", gdp: 3.2, productivity: 2.5 },
    { year: "2028", gdp: 3.4, productivity: 2.8 },
  ];

  const sectorOutlook = [
    { sector: "AI & Robotics", confidence: 92 },
    { sector: "Clean Energy", confidence: 89 },
    { sector: "Healthcare Innovation", confidence: 85 },
    { sector: "Cybersecurity", confidence: 82 },
    { sector: "Infrastructure", confidence: 80 },
    { sector: "Financial Tech", confidence: 78 },
  ];

  return (
    <section className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-green-600 mb-3">
            📅 Long-Term Outlook
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Our AI long-term models anticipate steady economic expansion,
            supported by sustained innovation, infrastructure investment,
            and productivity growth across key industries. These projections are
            refreshed monthly using macroeconomic and sectoral data.
          </p>
        </div>

        {/* Core Investment Themes */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Core Investment Themes
          </h2>
          <ul className="list-disc ml-6 text-gray-700 space-y-2">
            <li>Renewable energy adoption accelerating through 2030.</li>
            <li>Healthcare innovation driving global longevity trends.</li>
            <li>AI and automation increasing productivity and margins.</li>
            <li>Emerging markets benefiting from digital transformation.</li>
            <li>Cybersecurity becoming a critical infrastructure layer.</li>
          </ul>
        </div>

        {/* AI Forecast Insight */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 mb-12 shadow">
          <h3 className="text-2xl font-bold text-green-700 mb-3 flex items-center gap-2">
            <Brain className="w-6 h-6" /> AI Forecast Insight
          </h3>
          <p className="text-gray-700 mb-3">
            Based on macroeconomic indicators and sectoral performance data, the
            AI models forecast consistent growth in technology-driven industries
            over the next five years. Global GDP is expected to stabilize around
            3% annually, with innovation-led sectors outpacing traditional
            industries by a significant margin.
          </p>
          <p className="text-gray-700">
            Inflation pressures are projected to remain moderate, while
            productivity gains from automation continue to reduce long-term
            labor costs across manufacturing and logistics.
          </p>
        </div>

        {/* GDP & Productivity Chart */}
        <div className="bg-gray-50 p-8 rounded-2xl shadow mb-12">
          <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> Global Growth Projection
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="colorGDP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="gdp"
                stroke="#16a34a"
                fillOpacity={1}
                fill="url(#colorGDP)"
              />
              <Area
                type="monotone"
                dataKey="productivity"
                stroke="#3b82f6"
                fillOpacity={0.5}
                fill="#3b82f6"
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-500 mt-3 text-center">
            AI models forecast average annual GDP growth of ~3% with rising
            productivity through automation.
          </p>
        </div>

        {/* Sector Outlook Chart */}
        <div className="bg-gray-50 p-8 rounded-2xl shadow mb-12">
          <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Sector Confidence Outlook
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sectorOutlook}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sector" />
              <YAxis domain={[70, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="confidence"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-500 mt-3 text-center">
            Clean energy, healthcare, and AI lead global investment confidence
            heading into 2030.
          </p>
        </div>

        {/* Summary & Recommendations */}
        <div className="bg-white border rounded-2xl shadow p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Key Takeaways
          </h3>
          <ul className="list-disc ml-6 text-gray-700 space-y-2">
            <li>
              Long-term investors should maintain overweight positions in
              renewable energy, automation, and AI innovation sectors.
            </li>
            <li>
              Geographic diversification remains essential — Asia and emerging
              markets are poised for growth.
            </li>
            <li>
              Watch inflation and interest rate cycles closely — capital
              allocation may shift toward defensive sectors in 2027–2028.
            </li>
            <li>
              Healthcare and biotech will remain resilient amid demographic
              shifts and aging populations.
            </li>
          </ul>
        </div>

        {/* Back Button */}
        <div className="text-center mt-12">
          <Link
            href="/ai-dashboard"
            className="inline-flex items-center gap-2 bg-yellow-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-yellow-500 transition"
          >
            <ArrowLeft className="w-5 h-5" /> Back to AI Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
