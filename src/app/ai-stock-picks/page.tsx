"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Brain, RefreshCcw, Search } from "lucide-react";

interface StockPick {
  symbol: string;
  name: string;
  sector: string;
  rationale: string;
  sentiment: string;
}

export default function AIStockPicksPage() {
  const [picks, setPicks] = useState<StockPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("growth");
  const [sector, setSector] = useState("");
  const [query, setQuery] = useState("");

  const fetchPicks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ai-stock-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, sector }),
      });
      const { data } = await res.json();
      setPicks(data || []);
    } catch (err) {
      console.error("Error fetching AI picks:", err);
      setPicks([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-yellow-50 pt-28 pb-10 px-6 flex flex-col items-center">
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 flex items-center gap-2"
      >
        <Brain className="text-yellow-400" /> AI-Powered Stock Picks
      </motion.h1>
      <p className="text-gray-600 mb-8 text-center max-w-2xl">
        Discover curated AI-driven stock recommendations for Growth, Value, and
        Momentum strategies — updated in real time.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {["growth", "value", "momentum"].map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              theme === t
                ? "bg-yellow-400 text-black shadow-md"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Sector input */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <input
          type="text"
          placeholder="Optional: Sector (e.g., Technology, Energy)"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="border border-gray-300 rounded-full px-4 py-2 w-full md:w-80 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <button
          onClick={fetchPicks}
          className="bg-yellow-400 text-black px-6 py-2 rounded-full font-semibold hover:bg-yellow-500 shadow-md flex items-center gap-2 transition-all"
        >
          <RefreshCcw size={16} /> Generate Picks
        </button>
      </div>

      {/* Search */}
      {picks.length > 0 && (
        <div className="flex items-center bg-white shadow-sm rounded-full border border-gray-200 px-4 py-2 w-full md:w-96 mb-8">
          <Search className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Filter by company or symbol..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-grow outline-none text-sm text-gray-700"
          />
        </div>
      )}

      {/* Results */}
      <div className="w-full max-w-5xl">
        {loading ? (
          <p className="text-center text-gray-500">Generating AI recommendations...</p>
        ) : picks.length === 0 ? (
          <p className="text-center text-gray-500 italic">
            Click “Generate Picks” to get the latest AI stock insights.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {picks
              .filter(
                (p) =>
                  p.name.toLowerCase().includes(query.toLowerCase()) ||
                  p.symbol.toLowerCase().includes(query.toLowerCase())
              )
              .map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white border border-gray-200 rounded-2xl shadow-md p-5 hover:shadow-lg transition-all"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{p.symbol}</h3>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-semibold ${
                        p.sentiment.toLowerCase() === "bullish"
                          ? "bg-green-100 text-green-700"
                          : p.sentiment.toLowerCase() === "bearish"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {p.sentiment}
                    </span>
                  </div>
                  <p className="text-gray-700 font-semibold mb-1">{p.name}</p>
                  <p className="text-gray-500 text-sm mb-3">Sector: {p.sector}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{p.rationale}</p>
                </motion.div>
              ))}
          </div>
        )}
      </div>
    </main>
  );
}
