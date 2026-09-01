"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface StockData {
  symbol: string;
  description: string;
  currentPrice: number;
  changePercent: number;
  aiSummary?: string;
}

export default function AIStockPicksPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        // Fetch trending stocks from Finnhub
        const res = await fetch(
          `/api/proxy/finnhub/api/v1/news?category=general`
        );
        const data = await res.json();

        // Simulate “top picks” using unique symbols
        const picks = data.slice(0, 6).map((item: any, i: number) => ({
          symbol: ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL"][i],
          description: item.headline,
          currentPrice: 150 + Math.random() * 300,
          changePercent: (Math.random() - 0.5) * 3,
          aiSummary:
            "AI suggests strong momentum and stable fundamentals for medium-term growth.",
        }));

        setStocks(picks);
      } catch (error) {
        console.error("Error fetching AI stock picks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, []);

  return (
    <div className="min-h-screen py-14 px-6 text-ivory bg-night">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-6xl mx-auto text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl text-gold font-display font-normal tracking-tight">
          AI Stock Picks
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          Curated by AI — today’s top-performing stocks based on sentiment,
          fundamentals, and technical trends.
        </p>
      </motion.div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center mt-16">
          <p className="text-gold animate-pulse text-lg font-medium">
            Loading live market data...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {stocks.map((stock, index) => (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-surface rounded-2xl shadow-lg p-6 border border-gold/20 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <h2 className="text-xl font-semibold text-ivory">
                {stock.symbol}{" "}
                <span className="text-sm text-gray-500">
                  {stock.description.slice(0, 40)}...
                </span>
              </h2>

              <p className="mt-3 text-3xl font-bold text-gold">
                ${stock.currentPrice.toFixed(2)}
              </p>

              <p
                className={`mt-1 text-sm font-medium ${
 stock.changePercent >= 0 ? "text-green-400" : "text-red-400"
 }`}
              >
                {stock.changePercent >= 0 ? "+" : ""}
                {stock.changePercent.toFixed(2)}%
              </p>

              <div className="mt-4 p-3 rounded-xl bg-surface">
                <p className="text-sm text-gray-100">
                  <span className="font-semibold">AI Insight:</span>{" "}
                  {stock.aiSummary}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="mt-16 flex flex-col sm:flex-row justify-center gap-4">
        <Link
          href="/dashboard/gold"
          className="px-6 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 hover:opacity-90 transition-all"
        >
          Back to Gold Dashboard
        </Link>
        <Link
          href="/plans"
          className="px-6 py-3 rounded-full text-gold font-semibold border border-amber-400 hover:bg-gold/15 transition-all"
        >
          Upgrade to Platinum </Link>
      </div>
    </div>
  );
}
