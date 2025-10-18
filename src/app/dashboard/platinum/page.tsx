"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function PlatinumDashboard() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-28 py-16 px-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-blue-700 mb-4">
          💎 Platinum Dashboard
        </h1>
        <p className="text-gray-700 text-lg max-w-2xl mx-auto">
          Access all advanced AI-powered tools and dashboards — everything from
          Gold plus real-time data intelligence, custom research requests, and
          exclusive insights built for serious investors.
        </p>
      </div>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* 1. Real-Time AI Dashboards */}
        <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            ⚡ Real-Time AI Dashboards
          </h3>
          <p className="text-gray-600 mb-4">
            Analyze live market trends with our next-gen AI dashboards tracking
            equities, sectors, and macro signals in real time.
          </p>
          <button
            onClick={() => router.push("/features/ai/ai-forecast-engine")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-full"
          >
            Launch Dashboard
          </button>
        </div>

        {/* 2. Advanced Portfolio Tracking */}
        <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            📊 Advanced Portfolio Tracking
          </h3>
          <p className="text-gray-600 mb-4">
            Monitor portfolio performance across assets with dynamic risk
            metrics, allocation heatmaps, and real-time profit tracking.
          </p>
          <button
            onClick={() => router.push("/dashboard/portfolio")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-full"
          >
            Track Portfolio
          </button>
        </div>

        {/* 3. Sector Rotation & Trend Forecasts */}
        <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            📈 Sector Rotation & Trend Forecasts
          </h3>
          <p className="text-gray-600 mb-4">
            Identify sector leadership shifts and predict future momentum with
            AI-driven rotation models and macro forecasting.
          </p>
          <button
            onClick={() => router.push("/features/ai/macro-data-integration")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-full"
          >
            Explore Forecasts
          </button>
        </div>

        {/* 4. Custom Research Requests */}
        <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            🧠 Custom Research Requests
          </h3>
          <p className="text-gray-600 mb-4">
            Submit direct AI-powered research queries — get tailored market
            insights, valuation reports, or company deep dives on demand.
          </p>
          <button
            onClick={() => router.push("/dashboard/research")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-full"
          >
            Request Research
          </button>
        </div>

        {/* 5. Exclusive Weekly Briefings */}
        <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            🗞️ Exclusive Weekly Briefings
          </h3>
          <p className="text-gray-600 mb-4">
            Receive handpicked reports from our AI analysts summarizing
            macroeconomic updates, sector performance, and upcoming catalysts.
          </p>
          <button
            onClick={() => router.push("/dashboard/reports")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-full"
          >
            View Briefings
          </button>
        </div>

        {/* 6. Platinum Market Overview */}
        <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            🌐 Platinum Market Overview
          </h3>
          <p className="text-gray-600 mb-4">
            Access AI-enhanced insights on global indices, sector heatmaps, and
            cross-asset correlations updated daily.
          </p>
          <button
            onClick={() => router.push("/ai-dashboard/market-trends")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-full"
          >
            Open Overview
          </button>
        </div>
      </section>

      {/* TradingView Chart */}
      <div className="max-w-6xl mx-auto mt-16 bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="text-xl font-semibold text-blue-700 mb-4">
          📊 Live Market Snapshot
        </h3>
        <iframe
          src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_01&symbol=SPY&interval=D&hidesidetoolbar=1&theme=light"
          style={{
            width: "100%",
            height: "420px",
            border: "none",
            borderRadius: "10px",
          }}
        ></iframe>
      </div>

      {/* Back to Main Dashboard */}
      <div className="text-center mt-12">
        <button
          onClick={() => router.push("/dashboard")}
          className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-8 rounded-full transition-all"
        >
          ← Back to Main Dashboard
        </button>
      </div>
    </main>
  );
}
