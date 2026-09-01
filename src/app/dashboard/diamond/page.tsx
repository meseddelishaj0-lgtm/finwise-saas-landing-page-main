"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function DiamondDashboard() {
  const router = useRouter();

  return (
    <main className="min-h-screen pt-10 py-16 px-6 text-white bg-night">
      {/* Header */}
      <div className="max-w-6xl mx-auto text-center mb-12">
        <h1 className="text-4xl text-gold-soft mb-4 font-display font-normal tracking-tight md:text-5xl">
          Diamond Dashboard
        </h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Welcome to the Diamond Tier — your all-access level to institutional-grade
          research, predictive analytics, and one-on-one AI-powered insights.
        </p>
      </div>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* 1. Full AI Research Access */}
        <div className="rounded-2xl p-8 shadow-md border border-white/10 transition-all bg-surface">
          <h3 className="text-xl font-semibold text-gold-soft mb-3">
            Full AI Research Access
          </h3>
          <p className="text-gray-300 mb-4">
            Unlock every AI research tool available — from sentiment models to
            deep valuation analysis and backtesting dashboards.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/diamond/full-ai-research-access")
            }
            className="bg-gold hover:bg-gold text-night font-semibold py-2 px-6 rounded-full"
          >
            Open Research
          </button>
        </div>

        {/* 2. Predictive Market Outlooks */}
        <div className="rounded-2xl p-8 shadow-md border border-white/10 transition-all bg-surface">
          <h3 className="text-xl font-semibold text-gold-soft mb-3">
            Predictive Market Outlooks
          </h3>
          <p className="text-gray-300 mb-4">
            Access AI-driven forecasts using macroeconomic, sentiment, and
            technical indicators for global markets.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/diamond/predictive-market-outlooks")
            }
            className="bg-gold hover:bg-gold text-night font-semibold py-2 px-6 rounded-full"
          >
            View Outlooks
          </button>
        </div>

        {/* 3. Institutional-Grade Reports */}
        <div className="rounded-2xl p-8 shadow-md border border-white/10 transition-all bg-surface">
          <h3 className="text-xl font-semibold text-gold-soft mb-3">
            Institutional-Grade Reports
          </h3>
          <p className="text-gray-300 mb-4">
            Get in-depth professional research reports built for institutions —
            covering macro, equity, and alternative asset strategies.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/diamond/institutional-grade-reports")
            }
            className="bg-gold hover:bg-gold text-night font-semibold py-2 px-6 rounded-full"
          >
            Access Reports
          </button>
        </div>

        {/* 4. Portfolio Optimization Tools */}
        <div className="rounded-2xl p-8 shadow-md border border-white/10 transition-all bg-surface">
          <h3 className="text-xl font-semibold text-gold-soft mb-3">
            Portfolio Optimization Tools
          </h3>
          <p className="text-gray-300 mb-4">
            Optimize portfolio allocation with AI-driven rebalancing,
            diversification scoring, and Sharpe ratio optimization models.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/diamond/portfolio-optimization-tools")
            }
            className="bg-gold hover:bg-gold text-night font-semibold py-2 px-6 rounded-full"
          >
            Optimize Portfolio
          </button>
        </div>

        {/* 5. Priority One-on-One Research Access */}
        <div className="rounded-2xl p-8 shadow-md border border-white/10 transition-all bg-surface">
          <h3 className="text-xl font-semibold text-gold-soft mb-3">
            Priority One-on-One Research Access
          </h3>
          <p className="text-gray-300 mb-4">
            Get direct, priority access to AI research analysts for
            personalized portfolio reviews and insight sessions.
          </p>
          <button
            onClick={() =>
              router.push(
                "/dashboard/diamond/priority-one-on-one-research-access"
              )
            }
            className="bg-gold hover:bg-gold text-night font-semibold py-2 px-6 rounded-full"
          >
            Schedule Session
          </button>
        </div>

        {/* 6. Early Access to New AI Models */}
        <div className="rounded-2xl p-8 shadow-md border border-white/10 transition-all bg-surface">
          <h3 className="text-xl font-semibold text-gold-soft mb-3">
            Early Access to New AI Models
          </h3>
          <p className="text-gray-300 mb-4">
            Be the first to test and benefit from new predictive AI models,
            exclusive datasets, and experimental forecasting systems.
          </p>
          <button
            onClick={() =>
              router.push("/dashboard/diamond/early-access-to-new-ai-models")
            }
            className="bg-gold hover:bg-gold text-night font-semibold py-2 px-6 rounded-full"
          >
            Try New Models
          </button>
        </div>
      </section>

      {/* AI Market Snapshot */}
      <div className="max-w-6xl mx-auto mt-16 p-6 rounded-2xl shadow-md border border-white/10 bg-surface">
        <h3 className="text-xl font-semibold text-gold-soft mb-4">
          Diamond AI Global Market Snapshot
        </h3>
        <iframe
          src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_01&symbol=SPX&interval=D&hidesidetoolbar=1&theme=dark"
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
          className="bg-gold hover:bg-gold text-night font-semibold py-3 px-8 rounded-full transition-all"
        >
          ← Back to Main Dashboard
        </button>
      </div>
    </main>
  );
}
