"use client";

import { motion } from "framer-motion";

export default function ValuationModelsPage() {
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
          Valuation Models
        </h1>
        <p className="text-lg text-gray-600">
          Explore the three core valuation approaches — Fundamental, Technical & Swing Trade models — to inform strategy and investment decisions.
        </p>
      </motion.section>

      {/* Section: Fundamental Analysis */}
      <section className="max-w-4xl mb-16">
        <h2 className="text-3xl font-semibold mb-4 text-gray-800">Fundamental Valuation</h2>
        <p className="text-gray-700 mb-4">
          Fundamental analysis focuses on the intrinsic value of a company: reviewing financial statements, cash flows, growth prospects and business model. The goal is to identify whether a stock is undervalued or overvalued relative to its true worth.  
          For example, discounted cash-flow (DCF) models, Dividend Discount models and book value methods are commonly used.
        </p>
        <ul className="list-disc list-inside text-gray-700">
          <li>Estimate future free cash flows and discount them to present value</li>
          <li>Use multiples (P/E, P/B) to compare with peer groups</li>
          <li>Assess competitive advantage, management quality and macro trends</li>
        </ul>
      </section>

      {/* Section: Technical Analysis */}
      <section className="max-w-4xl mb-16">
        <h2 className="text-3xl font-semibold mb-4 text-gray-800">Technical Valuation</h2>
        <p className="text-gray-700 mb-4">
          Technical analysis uses price action, chart patterns and indicators to determine when to enter or exit positions. It asks “when” and “how” rather than “what” the value is. 
        </p>
        <ul className="list-disc list-inside text-gray-700">
          <li>Moving averages (50-day, 200-day), trend lines and support/resistance zones</li>
          <li>Indicators such as RSI, MACD, Bollinger Bands that signal momentum or reversals</li>
          <li>Chart patterns (head & shoulders, double bottom, flags) along with volume analysis</li>
        </ul>
      </section>

      {/* Section: Swing Trade Models */}
      <section className="max-w-4xl mb-16">
        <h2 className="text-3xl font-semibold mb-4 text-gray-800">Swing Trade Strategies</h2>
        <p className="text-gray-700 mb-4">
          Swing trading bridges the gap between technical and fundamental analysis: holding positions for days to weeks to capture actionable price movement. It focuses on both setups and timing. :contentReference[oaicite:4]{"{index=4}"}
        </p>
        <ul className="list-disc list-inside text-gray-700">
          <li>Identify stocks with strong fundamentals then use technical indicators for entry/exit</li>
          <li>Use setups based on momentum, trend exhaustion, pull-backs or breakouts</li>
          <li>Define clear exit strategy and risk-management rules (stop loss, profit targets) </li>
        </ul>
      </section>

      {/* CTA Section */}
      <div className="text-center mt-12">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Ready to Apply the Models?
        </h3>
        <p className="text-gray-600 mb-6">
          Join WallStreetStocks.ai for detailed templates, calculators and real-world case studies for each valuation model.
        </p>
        <a
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Get Full Access
        </a>
      </div>
    </main>
  );
}
