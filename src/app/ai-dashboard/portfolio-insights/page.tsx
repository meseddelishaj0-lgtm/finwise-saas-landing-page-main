"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const PortfolioInsightsPage = () => {
  return (
    <section className="min-h-screen bg-gray-50 text-gray-900 px-6 md:px-32 pt-24 md:pt-32 pb-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            📊 Portfolio Insights
          </h1>
          <p className="text-lg text-gray-600">
            Understand your portfolio’s strengths and weaknesses through real-time AI evaluation.  
            Get diversification insights, sector exposure analysis, and personalized AI recommendations.
          </p>
        </motion.div>

        {/* Portfolio Health Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-white rounded-2xl shadow-md p-8 mb-10"
        >
          <h2 className="text-2xl font-semibold mb-4">
            🩺 Portfolio Health Summary
          </h2>
          <ul className="list-disc list-inside text-gray-700 mb-6 leading-relaxed">
            <li><strong>Risk Level:</strong> Moderate</li>
            <li><strong>Diversification:</strong> 78% Optimal</li>
            <li><strong>Volatility:</strong> 12.4% (Below Market Average)</li>
            <li><strong>Expected Annual Return:</strong> 8.2%</li>
            <li><strong>Sharpe Ratio:</strong> 1.12 (Good Risk-Adjusted Performance)</li>
            <li><strong>Sector Exposure:</strong> Tech (45%), Healthcare (20%), Finance (15%), Energy (10%), Others (10%)</li>
          </ul>

          <div className="bg-gray-50 p-5 rounded-xl">
            <p className="font-semibold mb-2 text-gray-800">💡 AI Suggestion:</p>
            <p className="text-gray-700">
              Reduce Tech exposure by <strong>10%</strong> and reallocate to Energy or Consumer Staples to
              improve risk balance. Consider slightly increasing cash reserves due to market volatility.
            </p>
          </div>
        </motion.div>

        {/* Diversification Breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-white rounded-2xl shadow-md p-8 mb-10"
        >
          <h2 className="text-2xl font-semibold mb-4">📈 Diversification Breakdown</h2>
          <p className="text-gray-700 mb-4">
            Your portfolio contains exposure to multiple asset classes and industries, which reduces concentration risk.
          </p>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-700 border-b">
                <th className="pb-2">Asset Class</th>
                <th className="pb-2">Allocation</th>
                <th className="pb-2">AI Evaluation</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b">
                <td className="py-2">Equities</td>
                <td>65%</td>
                <td>Well-balanced, slightly overweight Tech sector</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Bonds</td>
                <td>20%</td>
                <td>Provides stability, could add TIPS for inflation hedge</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Real Estate (REITs)</td>
                <td>8%</td>
                <td>Good diversification but slightly underweight</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Cash & Equivalents</td>
                <td>5%</td>
                <td>Maintain liquidity buffer — 7–10% ideal</td>
              </tr>
              <tr>
                <td className="py-2">Commodities</td>
                <td>2%</td>
                <td>Underexposed — consider gold or energy ETFs</td>
              </tr>
            </tbody>
          </table>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-white rounded-2xl shadow-md p-8 mb-10"
        >
          <h2 className="text-2xl font-semibold mb-4">📊 Performance Metrics</h2>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed">
            <li><strong>1-Year Return:</strong> +9.3%</li>
            <li><strong>3-Year CAGR:</strong> +8.7%</li>
            <li><strong>Max Drawdown:</strong> -12.5%</li>
            <li><strong>Beta vs S&P 500:</strong> 0.85 (Less volatile than market)</li>
            <li><strong>Alpha:</strong> +1.9% (Outperforming market benchmark)</li>
            <li><strong>Correlation to Bonds:</strong> -0.32 (Excellent diversification)</li>
          </ul>
        </motion.div>

        {/* AI Risk Analysis */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="bg-white rounded-2xl shadow-md p-8 mb-10"
        >
          <h2 className="text-2xl font-semibold mb-4">🤖 AI Risk Analysis</h2>
          <p className="text-gray-700 mb-3">
            AI evaluation identifies potential risks in your portfolio composition and market exposure.
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4">
            <li>⚠️ Overweight exposure to Technology could increase drawdown risk during corrections.</li>
            <li>🧩 Underweight in Defensive sectors such as Utilities or Consumer Staples.</li>
            <li>📉 Rising interest rates could pressure growth-heavy holdings.</li>
          </ul>
          <p className="text-gray-800 font-medium">
            ✅ Recommendation: Gradually diversify into low-volatility ETFs and inflation-protected assets.
          </p>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-md mb-10"
        >
          <h2 className="text-2xl font-semibold mb-4">🚀 Next Steps to Improve Your Portfolio</h2>
          <ul className="list-disc list-inside text-gray-700 leading-relaxed">
            <li>Rebalance portfolio quarterly based on AI alerts.</li>
            <li>Increase exposure to undervalued sectors (Energy, Industrials).</li>
            <li>Add fixed-income ETFs to stabilize cash flows.</li>
            <li>Monitor global macro trends and central bank policy changes.</li>
          </ul>
        </motion.div>

        {/* Back Button */}
        <div className="text-center mt-10">
          <Link
            href="/ai-dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow transition"
          >
            ← Back to  AI Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PortfolioInsightsPage;
