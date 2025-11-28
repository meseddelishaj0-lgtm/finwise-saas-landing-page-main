"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";

interface Commodity {
  name: string;
  symbol: string;
  price: string;
  change: string;
  changesPercentage: string;
  summary?: string;
}

export default function CommoditiesPage() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCommodities = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/commodities");
      const data = await res.json();
      if (Array.isArray(data)) setCommodities(data);
      else console.error("Invalid data:", data);
    } catch (err) {
      console.error("Fetch commodities error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommodities();
  }, []);

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center py-24 px-6">
      {/* Header Section */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          AI-Powered Commodities Overview
        </h1>
        <p className="text-lg text-gray-600">
          Live market data and AI commentary across gold, oil, natural gas, and agricultural commodities.
        </p>
      </motion.section>

      {/* Refresh Button */}
      <button
        onClick={fetchCommodities}
        disabled={loading}
        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-3 rounded-xl transition-all mb-8"
      >
        <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Refreshing..." : "Refresh Data"}
      </button>

      {/* Commodity Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
        {commodities.length > 0 ? (
          commodities.map((c, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-md"
            >
              <h3 className="text-2xl font-semibold mb-2 text-gray-800">
                {c.name}
              </h3>
              <p className="text-sm text-gray-500 mb-2">{c.symbol}</p>

              <div className="flex justify-between items-center mb-2">
                <p className="text-lg font-bold">${c.price}</p>
                <p
                  className={`font-semibold ${
                    parseFloat(c.changesPercentage) >= 0
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {parseFloat(c.changesPercentage) >= 0 ? "+" : ""}
                  {c.changesPercentage}%
                </p>
              </div>

              <p className="text-gray-700 text-sm italic border-t pt-3">
                {c.summary || "AI summary loading..."}
              </p>
            </motion.div>
          ))
        ) : (
          <p className="text-center text-gray-500 italic">
            Loading commodities data...
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="text-center mt-16">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Unlock Advanced Commodity Analytics
        </h3>
        <p className="text-gray-600 mb-6">
          Gain access to real-time sentiment models, forecasts, and volatility indicators across global commodities.
        </p>
        <a
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Upgrade to Premium
        </a>
      </div>
    </main>
  );
}
