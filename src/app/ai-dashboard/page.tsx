"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Brain,
  TrendingUp,
  DollarSign,
  BarChart3,
  Search,
  Sparkles,
  ArrowRight,
  CalendarDays,
  LineChart as ChartIcon,
  Lightbulb,
} from "lucide-react";

const data = [
  { name: "Mon", value: 310 },
  { name: "Tue", value: 420 },
  { name: "Wed", value: 390 },
  { name: "Thu", value: 480 },
  { name: "Fri", value: 520 },
];

export default function AIDashboardPage() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    setError("");
    setStock(null);

    try {
      const res = await fetch(`/api/stock?symbol=${symbol}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setStock(json);
      }
    } catch (e) {
      setError("Error fetching stock data.");
    }
    setLoading(false);
  };

  return (
    <section className="min-h-screen bg-night text-ivory px-6 md:px-32 pt-10 md:pt-12 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl mb-4 font-display font-normal tracking-tight">
            AI Investment Dashboard
          </h1>
          <p className="text-lg text-gray-400">
            Smart financial insights, AI stock forecasts, and personalized
            investment analytics — all in one place.
          </p>
        </motion.div>

        {/* AI Insights Overview (Top 3 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: <Brain className="text-gold w-7 h-7" />,
              title: "AI-Powered Analysis",
              desc: "Leverage AI models to evaluate company fundamentals, sentiment, and valuation in seconds.",
              href: "/ai-dashboard/ai-powered-analysis",
              color: "yellow",
            },
            {
              icon: <TrendingUp className="text-green-500 w-7 h-7" />,
              title: "Market Trends",
              desc: "Track real-time performance metrics and identify potential outperformers using our smart algorithms.",
              href: "/ai-dashboard/market-trends",
              color: "green",
            },
            {
              icon: <BarChart3 className="text-gold w-7 h-7" />,
              title: "Portfolio Insights",
              desc: "Monitor your portfolio health, risk exposure, and diversification levels with instant AI summaries.",
              href: "/ai-dashboard/portfolio-insights",
              color: "blue",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              className="bg-surface rounded-2xl shadow-md border border-white/10 p-6 text-center"
            >
              <div className="flex justify-center mb-4">{item.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-400 mb-6">{item.desc}</p>
              <Link
                href={item.href}
                className={`inline-flex items-center gap-2 font-semibold px-5 py-2 rounded-lg transition
 ${
 item.color === "yellow"
 ? "bg-yellow-400 text-black hover:bg-gold"
 : item.color === "green"
 ? "bg-yellow-400 text-black hover:bg-gold-deep"
 : "bg-gold text-night hover:bg-gold"
 }`}
              >
                Explore <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Chart Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-surface rounded-3xl shadow-md p-10 mb-20"
        >
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="text-gold w-6 h-6" />
            <h2 className="text-2xl font-semibold">
              Market Performance Overview
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#FACC15"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Stock Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-gold/15 rounded-3xl p-10 shadow-inner text-center mb-20"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4 flex justify-center items-center gap-2">
            <Search className="text-gold w-6 h-6" /> AI Stock Research
          </h2>
          <p className="text-gray-300 mb-6">
            Enter a stock ticker (e.g., <b>AAPL</b>, <b>TSLA</b>, <b>NVDA</b>)
            and let the AI generate insights, valuation models, and forecasts
            instantly.
          </p>

          <div className="flex flex-col md:flex-row justify-center items-center gap-3">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              type="text"
              placeholder="Search stock symbol..."
              className="w-full md:w-1/2 p-3 rounded-full border border-white/10 shadow-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none text-center"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-yellow-400 hover:bg-gold text-black font-semibold px-6 py-3 rounded-full shadow disabled:opacity-60"
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          {error && <p className="text-red-400 mt-4">{error}</p>}

          {stock && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-10 bg-surface rounded-2xl shadow-md p-8 max-w-2xl mx-auto text-left"
            >
              <h3 className="text-xl font-semibold mb-4">
                {stock.symbol} — Live Market Data
              </h3>
              <p><strong>Current Price:</strong> ${stock.current}</p>
              <p><strong>Open:</strong> ${stock.open} | <strong>High:</strong> ${stock.high} | <strong>Low:</strong> ${stock.low}</p>
              <p><strong>Previous Close:</strong> ${stock.prevClose}</p>
              <p className={`font-semibold mt-2 ${stock.change > 0 ? "text-green-400" : "text-red-400"}`}>
                {stock.change > 0 ? "▲" : "▼"} {stock.change} ({stock.percentChange}%)
              </p>

              {/* AI Summary */}
              {stock.metrics && (
                <div className="mt-6 bg-gold/10 border border-gold/20 rounded-xl p-4">
                  <h4 className="text-lg font-semibold text-gold-soft mb-2">
                    AI Summary
                  </h4>
                  <p className="text-gray-100">
                    {(() => {
                      const pe = stock.metrics.peBasicExclExtraTTM;
                      const roe = stock.metrics.roeTTM;
                      const rev = stock.metrics.revenueGrowthTTMYoy;
                      let summary = "";

                      if (pe && pe < 15) summary += "Stock appears undervalued with a low P/E ratio. ";
                      else if (pe && pe > 30) summary += "Stock trades at a premium valuation. ";
                      else summary += "Valuation looks moderate. ";

                      if (roe && roe > 15) summary += "Strong profitability based on high ROE. ";
                      else summary += "Average profitability trend. ";

                      if (rev && rev > 5) summary += "Revenue growth remains positive and stable. ";
                      else summary += "Revenue growth is relatively flat. ";

                      return (
                        summary +
                        "Overall outlook: " +
                        (roe > 15 && rev > 5 ? "bullish momentum." : "neutral performance.")
                      );
                    })()}
                  </p>
                </div>
              )}

              {/* Company Profile */}
              {stock.profile && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-2">Company Profile</h4>
                  <p><strong>Name:</strong> {stock.profile.name}</p>
                  <p><strong>Exchange:</strong> {stock.profile.exchange}</p>
                  <p><strong>Industry:</strong> {stock.profile.finnhubIndustry}</p>
                  <p><strong>Country:</strong> {stock.profile.country}</p>
                  <p><strong>Market Cap:</strong> ${stock.profile.marketCapitalization}B</p>
                </div>
              )}

              {/* Financial Metrics */}
              {stock.metrics && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-2">Key Financial Metrics</h4>
                  <p><strong>P/E Ratio:</strong> {stock.metrics.peBasicExclExtraTTM}</p>
                  <p><strong>ROE:</strong> {stock.metrics.roeTTM}%</p>
                  <p><strong>Debt/Equity:</strong> {stock.metrics.debtEquityQuarterly}</p>
                  <p><strong>Revenue Growth:</strong> {stock.metrics.revenueGrowthTTMYoy}%</p>
                </div>
              )}

              {/* Latest News */}
              {stock.news && stock.news.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-2">Recent News</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                    {stock.news.slice(0, 3).map((n: any, i: number) => (
                      <li key={i}>
                        <a href={n.url} target="_blank" className="text-gold hover:underline">
                          {n.headline}
                        </a>{" "}
                        <span className="text-gray-500">({n.source})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Forecast Cards (Keep all as is) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: <ChartIcon className="text-gold w-7 h-7" />,
              title: "Short-Term Forecast",
              desc: "AI predicts moderate bullish movement with strong tech sector momentum.",
              href: "/ai-dashboard/forecast",
              color: "blue",
            },
            {
              icon: <CalendarDays className="text-green-500 w-7 h-7" />,
              title: "Long-Term Outlook",
              desc: "Steady growth expected in renewable energy and healthcare sectors.",
              href: "/ai-dashboard/outlook",
              color: "green",
            },
            {
              icon: <Lightbulb className="text-purple-500 w-7 h-7" />,
              title: "Smart Portfolio Tips",
              desc: "Rebalance quarterly to reduce volatility and maximize compounding gains.",
              href: "/ai-dashboard/portfolio",
              color: "purple",
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              className="bg-surface rounded-2xl border border-white/10 shadow-md p-6 text-center"
            >
              <div className="flex justify-center mb-4">{card.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
              <p className="text-gray-400 mb-6">{card.desc}</p>
              <Link
                href={card.href}
                className={`inline-flex items-center gap-2 font-semibold px-5 py-2 rounded-lg transition
 ${
 card.color === "blue"
 ? "bg-gold text-night hover:bg-gold"
 : card.color === "green"
 ? "bg-yellow-400 text-black hover:bg-gold-deep"
 : "bg-purple-500 text-night hover:bg-purple-600"
 }`}
              >
                Explore <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center bg-gold/15 rounded-3xl p-10 shadow-inner">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 flex justify-center items-center gap-2">
            <Sparkles className="text-gold w-6 h-6" /> Unlock Full AI Analytics
          </h2>
          <p className="text-gray-300 mb-8">
            Upgrade to premium for unlimited forecasts, portfolio integration, and market data alerts.
          </p>
          <a
            href="/plans"
            className="bg-gold hover:bg-gold-deep text-black font-semibold px-8 py-3 rounded-full shadow"
          >
            View Plans
          </a>
        </div>
      </div>
    </section>
  );
}
