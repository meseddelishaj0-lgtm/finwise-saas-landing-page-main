"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function PlatinumDashboard() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 pt-28 py-16 px-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-blue-700 mb-4">
          💎 Platinum Dashboard
        </h1>
        <p className="text-gray-700 text-lg max-w-2xl mx-auto">
          Unlock the full power of AI investing — access all advanced tools,
          real-time intelligence, and exclusive insights designed for elite investors.
        </p>
      </div>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* 1. Real-Time AI Dashboards */}
        <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            ⚡ Real-Time AI Dashboards
          </h3>
          <p className="text-gray-600 mb-4">
            Analyze live market trends with our next-gen AI dashboards tracking
            equities, sectors, and macro signals in real time.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/platinum/real-time-ai-dashboards")
            }
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full"
          >
            Launch Dashboard
          </button>
        </div>

        {/* 2. Advanced Portfolio Tracking */}
        <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            📊 Advanced Portfolio Tracking
          </h3>
          <p className="text-gray-600 mb-4">
            Monitor portfolio performance with real-time analytics, risk metrics,
            and allocation heatmaps enhanced by AI.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/platinum/advanced-portfolio-tracking")
            }
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full"
          >
            Track Portfolio
          </button>
        </div>

        {/* 3. Sector Rotation & Trend Forecasts */}
        <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            📈 Sector Rotation & Trend Forecasts
          </h3>
          <p className="text-gray-600 mb-4">
            Identify sector leadership shifts and forecast future market momentum
            using AI-driven macro models.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/platinum/sector-rotation-trend-forecasts")
            }
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full"
          >
            Explore Forecasts
          </button>
        </div>

        {/* 4. Custom Research Requests */}
        <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            🧠 Custom Research Requests
          </h3>
          <p className="text-gray-600 mb-4">
            Request AI-generated reports, valuations, and custom insights tailored
            to your specific investment ideas.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/platinum/custom-research-requests")
            }
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full"
          >
            Request Research
          </button>
        </div>

        {/* 5. Exclusive Weekly Briefings */}
        <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            🗞️ Exclusive Weekly Briefings
          </h3>
          <p className="text-gray-600 mb-4">
            Receive curated weekly AI insights summarizing macro trends, sector
            movements, and key market catalysts.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/platinum/exclusive-weekly-briefings")
            }
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full"
          >
            View Briefings
          </button>
        </div>

        {/* 6. Platinum Market Overview */}
        <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all border border-blue-100">
          <h3 className="text-xl font-semibold text-blue-700 mb-3">
            🌐 Platinum Market Overview
          </h3>
          <p className="text-gray-600 mb-4">
            Access AI-enhanced overviews of global indices, sector correlations,
            and daily cross-asset heatmaps.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/platinum/platinum-market-overview")
            }
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full"
          >
            Open Overview
          </button>
        </div>
      </section>

      {/* Market Snapshot */}
      <div className="max-w-6xl mx-auto mt-16 bg-white p-6 rounded-2xl shadow-md border border-blue-100">
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

      {/* Back Button */}
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
